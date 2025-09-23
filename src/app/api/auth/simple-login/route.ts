import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';
import { createJWTToken } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.auth, async () => {
  // Allow simple login if explicitly enabled via environment variable
  // This is for demo/testing purposes only
  const simpleLoginEnabled = process.env.ENABLE_SIMPLE_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  
  if (!simpleLoginEnabled) {
    return NextResponse.json({ 
      success: false,
      error: 'Simple login is disabled. Use proper authentication.' 
    }, { status: 403 });
  }
  try {
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Skip validation for demo/test accounts
    const email = body.email;
    const password = body.password;
    
    if (!email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is required'
        },
        { status: 400 }
      );
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { 
        email: email 
      },
      include: {
        teams: {
          include: {
            league: true
          }
        },
      }
    });
    
    if (!user) {
      // User doesn't exist - always return error
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // For this demo, we'll skip password validation since User model doesn't have password field
    // In production, implement proper password checking
    const passwordValid = true;
    
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create JWT token using standardized helper
    const token = await createJWTToken(user);
    
    // Set auth-token cookie (matches SESSION_COOKIE_NAME in auth.ts)
    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/'
    });
    
    // Get user's primary team if they have one
    const primaryTeam = user.teams.length > 0 ? user.teams[0] : null;
    
    return NextResponse.json({
      success: true,
      token, // Return token for testing (will be removed in production)
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teamName: primaryTeam?.name,
        teamId: primaryTeam?.id,
        leagueId: primaryTeam?.leagueId,
        leagues: user.teams.map(t => ({
          id: t.league.id,
          name: t.league.name
        }))
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred during login' 
      },
      { status: 500 }
    );
  }
  });
}

export async function GET() {
  // Allow simple login if explicitly enabled via environment variable
  const simpleLoginEnabled = process.env.ENABLE_SIMPLE_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  
  if (!simpleLoginEnabled) {
    return NextResponse.json({ 
      success: false,
      error: 'Simple login is disabled' 
    }, { status: 403 });
  }
  
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to login.' 
    },
    { status: 405 }
  );
}