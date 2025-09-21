import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/draft - Get drafts for current league
export async function GET(request: NextRequest) {
  try {
    // Draft functionality requires Draft model implementation
    // The current schema doesn't include a Draft model
    // For now, return not implemented error
    return NextResponse.json(
      { 
        error: 'Draft functionality not yet implemented',
        message: 'Draft endpoints require Draft model to be added to schema'
      },
      { status: 501 }
    );
    
  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}