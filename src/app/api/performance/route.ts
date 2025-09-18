import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json();
    
    // Log performance metrics (in production, send to monitoring service)
    return NextResponse.json({ 
      success: true, 
      message: 'Performance metrics recorded' 
    });
  } catch (error) {
    handleComponentError(error as Error, 'route');
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