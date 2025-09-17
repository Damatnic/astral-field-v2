import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSessionCookieOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sessionCookieName = getSessionCookieOptions().name;
    const sessionCookie = cookieStore.get(sessionCookieName);

    // Destroy session if it exists
    if (sessionCookie?.value) {
      await destroySession(sessionCookie.value);
    }

    // Clear session cookie
    cookieStore.delete(sessionCookieName);

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}