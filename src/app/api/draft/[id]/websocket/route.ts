import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Draft functionality requires Draft model implementation
    // The current schema doesn't include a Draft model
    // For now, return not implemented error
    return NextResponse.json(
      { 
        error: 'Draft functionality not yet implemented',
        message: 'WebSocket draft connections require Draft model to be added to schema'
      },
      { status: 501 }
    );
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