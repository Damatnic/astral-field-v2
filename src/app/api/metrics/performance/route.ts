import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();
    
    // In production, you would send this to your analytics service
    // For now, we'll just log it (in a real app, use a service like DataDog, New Relic, etc.)
    console.log('[Performance Metric]', metric);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging performance metric:', error);
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
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