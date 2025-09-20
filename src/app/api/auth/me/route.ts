import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for session cookie from simple-login
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Decode the simple session token (email:timestamp in base64)
    try {
      const decoded = Buffer.from(sessionCookie, 'base64').toString();
      const [email] = decoded.split(':');
      
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Invalid session' },
          { status: 401 }
        );
      }

      // Return user data based on email (simplified for simple auth)
      return NextResponse.json({
        success: true,
        user: {
          id: email.replace('@', '-').replace('.', '-'),
          email: email,
          name: email.split('@')[0],
          role: email.includes('admin') ? 'ADMIN' : 
                email.includes('commissioner') ? 'COMMISSIONER' : 'PLAYER',
          avatar: `/api/avatars/${encodeURIComponent(email.split('@')[0])}`,
          createdAt: new Date().toISOString()
        }
      });
    } catch (decodeError) {
      return NextResponse.json(
        { success: false, error: 'Invalid session format' },
        { status: 401 }
      );
    }

  } catch (error) {
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}