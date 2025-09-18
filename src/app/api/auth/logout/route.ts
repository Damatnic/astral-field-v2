import { NextRequest, NextResponse } from 'next/server';
// Use simplified auth when database is not available
import { logout as logoutSimple } from '@/lib/auth-simple';
import { logout as logoutFull } from '@/lib/auth';

const useSimpleAuth = process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL;
const logout = useSimpleAuth ? logoutSimple : logoutFull;

export async function POST(_request: NextRequest) {
  try {
    // Use our auth.ts logout function
    await logout();

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