import { NextRequest, NextResponse } from 'next/server';
// Use simplified auth when database is not available
import { getCurrentUser as getCurrentUserSimple } from '@/lib/auth-simple';
import { handleComponentError } from '@/lib/error-handling';
import { getCurrentUser as getCurrentUserFull } from '@/lib/auth';

const useSimpleAuth = process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL;
const getCurrentUser = useSimpleAuth ? getCurrentUserSimple : getCurrentUserFull;

// console.log('[AUTH DEBUG] /me endpoint - Auth system selection:', {
//   NODE_ENV: process.env.NODE_ENV,
//   HAS_DATABASE_URL: !!process.env.DATABASE_URL,
//   useSimpleAuth,
//   authSystem: useSimpleAuth ? 'SIMPLE' : 'FULL'
// });

export async function GET() {
  try {
    // Get current user from session
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    // handleComponentError(error as Error, 'route');
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