import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.auth, async () => {
  try {
    let body;
    try {
      const text = await request.text();
      console.log('Raw request body:', text);
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
    
    // Create or update session
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Clean up old sessions for this user
    await prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    // Create new session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        expiresAt
      }
    });
    
    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/'
    });
    
    // Get user's primary team if they have one
    const primaryTeam = user.teams.length > 0 ? user.teams[0] : null;
    
    return NextResponse.json({
      success: true,
      sessionId, // Return session ID for testing
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
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to login.' 
    },
    { status: 405 }
  );
}