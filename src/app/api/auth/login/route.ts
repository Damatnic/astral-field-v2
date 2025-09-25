import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError, logError } from '@/lib/error-handling';
import { login as loginFull } from '@/lib/auth';
import { createSession } from '@/lib/auth';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Always use full auth system since we have real users in production database
const useSimpleAuth = false; // Disabled - we have real users in production
const login = loginFull; // Always use full auth with database

logError('Auth system selection', {
  operation: 'auth-login-setup',
  metadata: {
    NODE_ENV: process.env.NODE_ENV,
    HAS_DATABASE_URL: !!process.env.DATABASE_URL,
    useSimpleAuth,
    authSystem: 'FULL'
  }
});

async function loginHandler(request: NextRequest) {
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

    // Create session for the authenticated user
    const session = await createSession(authResult.user.id);
    
    // Create response with success data
    const response = NextResponse.json({
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

    // Set session cookie
    response.cookies.set('astralfield-session', session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return response;

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the login endpoint
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.auth,
    () => loginHandler(request)
  );
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