import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const error = await request.json();
    
    // In production, you would send this to your error tracking service
    // For now, we'll just log it (in a real app, use Sentry, LogRocket, etc.)
    handleComponentError(error as Error, 'route');
    
    return NextResponse.json({ success: true });
  } catch (err) {
    handleComponentError(err as Error, 'route');
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}