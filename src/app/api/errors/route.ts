import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/utils/errorHandling';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Log errors (in production, send to error tracking service like Sentry)
    handleComponentError(errorData as Error, 'route');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Error recorded' 
    });
  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Failed to record error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Error endpoint active',
    timestamp: new Date().toISOString()
  });
}