/**
 * Session helper for API routes
 * Supports both JWT tokens and database sessions
 */

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

function convertUserRole(prismaRole: string): 'ADMIN' | 'COMMISSIONER' | 'PLAYER' {
  switch (prismaRole) {
    case 'ADMIN':
      return 'ADMIN';
    case 'COMMISSIONER':
      return 'COMMISSIONER';
    case 'PLAYER':
      return 'PLAYER';
    default:
      return 'PLAYER';
  }
}

export async function getCurrentSession() {
  try {
    const cookieStore = cookies();
    
    // Check for JWT auth token (auth-token cookie)
    const authToken = cookieStore.get('auth-token')?.value;
    if (authToken) {
      try {
        const jwtSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=');
        const { payload } = await jwtVerify(authToken, jwtSecret);
        
        if (payload && payload.userId) {
          // For JWT tokens, we have user data in the payload
          const user = {
            id: payload.userId as string,
            email: payload.email as string,
            name: (payload.name as string) || (payload.email as string),
            role: convertUserRole(payload.role as string),
          };
          
          return { user };
        }
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError);
        // Continue to try other auth methods
      }
    }
    
    // Check for database session (session cookie)
    const sessionId = cookieStore.get('session')?.value;
    if (sessionId) {
      const session = await prisma.userSession.findUnique({
        where: { sessionId },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
      
      if (session && session.expiresAt > new Date()) {
        return {
          user: {
            ...session.user,
            role: convertUserRole(session.user.role)
          }
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// For compatibility with existing code expecting getServerSession
export { getCurrentSession as getServerSession };