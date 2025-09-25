import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for session cookies from various auth methods
    const sessionCookie = request.cookies.get('session')?.value ||
                         request.cookies.get('auth-token')?.value ||
                         request.cookies.get('astralfield-session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // First, try to verify as JWT token (from test-login API)
    try {
      const decoded = jwt.verify(sessionCookie, process.env.NEXTAUTH_SECRET || 'test-secret') as any;
      
      if (decoded && decoded.userId) {
        // Look up user in database by ID from JWT
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (user) {
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name || user.email.split('@')[0],
              avatar: `/api/avatars/${encodeURIComponent(user.name || user.email.split('@')[0])}`,
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString()
            }
          });
        }
      }
    } catch (jwtError) {
      // Not a valid JWT token, continue to other auth methods
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
          data: { updatedAt: new Date() }
        });

        // Return user data from database
        return NextResponse.json({
          success: true,
          user: {
            id: dbSession.user.id,
            email: dbSession.user.email,
            name: dbSession.user.name || dbSession.user.email.split('@')[0],
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