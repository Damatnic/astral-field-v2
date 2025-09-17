import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/db';

// This would typically be a WebSocket endpoint, but for API route we'll use SSE
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const draftId = params.id;
  
  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', draftId })}\n\n`)
      );

      // Poll for draft updates every 2 seconds
      const interval = setInterval(async () => {
        try {
          const draft = await prisma.draft.findUnique({
            where: { id: draftId },
            include: {
              picks: {
                include: {
                  team: true,
                  player: true
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
                }
              })}\n\n`)
            );
          }

          if (draft?.status === 'COMPLETED') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'draft_complete' })}\n\n`)
            );
            clearInterval(interval);
            controller.close();
          }
        } catch (error) {
          console.error('SSE error:', error);
        }
      }, 2000);

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
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