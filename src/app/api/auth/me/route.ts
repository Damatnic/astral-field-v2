import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // Check if it's a database session ID (from simple-login API)
    try {
      const dbSession = await prisma.userSession.findFirst({
        where: {
          sessionId: sessionCookie,
          isActive: true,
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        include: {
          user: true
        }
      });

      if (dbSession && dbSession.user) {
        // Update last activity
        await prisma.userSession.update({
          where: { id: dbSession.id },
          data: { lastActivity: new Date() }
        });

        // Return user data from database
        return NextResponse.json({
          success: true,
          user: {
            id: dbSession.user.id,
            email: dbSession.user.email,
            name: dbSession.user.name || dbSession.user.email.split('@')[0],
            role: dbSession.user.role,
            teamName: dbSession.user.teamName,
            avatar: `/api/avatars/${encodeURIComponent(dbSession.user.name || dbSession.user.email.split('@')[0])}`,
            createdAt: dbSession.user.createdAt.toISOString(),
            updatedAt: dbSession.user.updatedAt.toISOString()
          }
        });
      }
    } catch (dbError) {
      console.error('Database session check failed:', dbError);
    }

    // Fallback: try to decode as simple base64 session (email:timestamp)
    try {
      const decoded = Buffer.from(sessionCookie, 'base64').toString();
      const [email] = decoded.split(':');
      
      if (email) {
        // Look up user in database by email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        });

        if (user) {
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role: user.role,
              teamName: user.teamName,
              avatar: `/api/avatars/${encodeURIComponent(user.name || user.email.split('@')[0])}`,
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString()
            }
          });
        }
      }
    } catch (decodeError) {
      // Not a base64 encoded session, continue to error
    }

    // No valid session found
    return NextResponse.json(
      { success: false, error: 'Invalid session' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Auth check error:', error);
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