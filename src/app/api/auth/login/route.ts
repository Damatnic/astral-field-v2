import { NextRequest, NextResponse } from 'next/server';
// Use simplified auth when database is not available
import { login as loginSimple } from '@/lib/auth-simple';
import { handleComponentError } from '@/lib/error-handling';
import { login as loginFull } from '@/lib/auth';

const useSimpleAuth = process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL;
const login = useSimpleAuth ? loginSimple : loginFull;

console.log('[AUTH DEBUG] Auth system selection:', {
  NODE_ENV: process.env.NODE_ENV,
  HAS_DATABASE_URL: !!process.env.DATABASE_URL,
  useSimpleAuth,
  authSystem: useSimpleAuth ? 'SIMPLE' : 'FULL'
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body with better error handling
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch (parseError) {
      handleComponentError(parseError as Error, 'route');
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }
    
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user using our auth.ts login function
    const authResult = await login({ email, password });

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        role: authResult.user.role,
        avatar: authResult.user.avatar,
        createdAt: authResult.user.createdAt
      }
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
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