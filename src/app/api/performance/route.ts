import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json();
    
    // Log performance metrics (in production, send to monitoring service)
    console.log('[Performance Metrics]:', metrics);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Performance metrics recorded' 
    });
  } catch (error) {
    console.error('Error recording performance metrics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record metrics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Performance endpoint active',
    timestamp: new Date().toISOString()
  });
}