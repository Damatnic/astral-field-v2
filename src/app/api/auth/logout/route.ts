import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/auth/logout - Logout user
export async function POST(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.api, async () => {
  try {
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (sessionId) {
      // Delete session from database
      await prisma.userSession.delete({
        where: { sessionId }
      }).catch(() => {
        // Session might not exist, that's okay
      });
    }
    
    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    response.cookies.delete('session');
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
  });
}