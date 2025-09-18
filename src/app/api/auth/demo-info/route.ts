import { NextResponse } from 'next/server';
import { getDemoCredentials } from '@/lib/auth-simple';

export async function GET() {
  try {
    const demoInfo = getDemoCredentials();
    
    return NextResponse.json({
      success: true,
      message: 'Demo credentials for testing',
      credentials: {
        password: demoInfo.password,
        users: demoInfo.users
      }
    });
  } catch (error) {
    console.error('Demo info API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get demo info' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}