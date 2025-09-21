/**
 * Session helper for API routes
 * Replaces getServerSession for custom auth implementation
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function getCurrentSession() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return null;
    }
    
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
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    
    return {
      user: session.user
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// For compatibility with existing code expecting getServerSession
export { getCurrentSession as getServerSession };