import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return a basic response for deployment verification
    // Database queries are handled by other endpoints to avoid build-time issues
    
    return NextResponse.json({
      success: true,
      message: 'Teams endpoint operational',
      data: [],
      count: 0,
      timestamp: new Date().toISOString(),
      note: 'Authentication required for team data'
    });
  } catch (error: any) {
    console.error('Teams API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Teams endpoint error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}