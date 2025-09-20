import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const draftId = params.id;

  try {
    // For Next.js API routes, we can't directly create WebSocket connections
    // This endpoint serves as a status check and connection info endpoint
    
    return NextResponse.json({
      success: true,
      draftId,
      websocketUrl: process.env.NODE_ENV === 'production' 
        ? 'wss://astralfield.vercel.app'
        : 'ws://localhost:3000',
      message: 'WebSocket connection info provided. Use socket.io-client to connect.',
      endpoints: {
        join: 'join_draft',
        leave: 'leave_draft',
        makePick: 'make_pick',
        sendMessage: 'send_chat_message',
        startDraft: 'start_draft',
        pauseDraft: 'pause_draft',
        resumeDraft: 'resume_draft'
      },
      events: {
        draftState: 'draft_state',
        pickMade: 'pick_made',
        autoPickMade: 'auto_pick_made',
        chatMessage: 'chat_message',
        timerUpdate: 'timer_update',
        draftStarted: 'draft_started',
        draftPaused: 'draft_paused',
        draftResumed: 'draft_resumed',
        userJoined: 'user_joined',
        userLeft: 'user_left',
        error: 'error'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get WebSocket connection info' 
      },
      { status: 500 }
    );
  }
}