import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Enhanced Server-Sent Events for real-time draft updates
// This provides WebSocket-like functionality using SSE
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const draftId = params.id;
  
  try {
    // Verify draft exists first
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      select: { id: true, status: true }
    });

    if (!draft) {
      return new Response(
        JSON.stringify({ error: 'Draft not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to verify draft' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | null = null;
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'connected', 
            draftId,
            timestamp: new Date().toISOString()
          })}\n\n`)
        );

        // Poll for draft updates every 2 seconds
        interval = setInterval(async () => {
          try {
            const draft = await prisma.draft.findUnique({
              where: { id: draftId },
              include: {
                picks: {
                  include: {
                    team: { select: { name: true } },
                    player: { select: { name: true, position: true } }
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            });

            if (draft && draft.picks.length > 0) {
              const latestPick = draft.picks[0];
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'pick_made',
                  pick: {
                    round: latestPick.round,
                    pick: latestPick.pick,
                    team: latestPick.team.name,
                    player: latestPick.player.name,
                    position: latestPick.player.position
                  },
                  timestamp: new Date().toISOString()
                })}\n\n`)
              );
            }

            // Send heartbeat to keep connection alive
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              })}\n\n`)
            );

            if (draft?.status === 'COMPLETED') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'draft_complete',
                  timestamp: new Date().toISOString()
                })}\n\n`)
              );
              if (interval) clearInterval(interval);
              controller.close();
              return;
            }
          } catch (error) {
            console.error('Error during draft polling:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Polling error occurred',
                timestamp: new Date().toISOString()
              })}\n\n`)
            );
          }
        }, 2000);

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          if (interval) clearInterval(interval);
          try {
            controller.close();
          } catch (e) {
            // Stream might already be closed
          }
        });
      } catch (error) {
        console.error('Error in draft live stream:', error);
        controller.error(error);
      }
    },
    
    cancel() {
      if (interval) clearInterval(interval);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}