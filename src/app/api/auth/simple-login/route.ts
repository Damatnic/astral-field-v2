import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { nanoid } from 'nanoid';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase() 
      },
      include: {
        teams: {
          include: {
            league: true
          }
        },
        leagues: {
          include: {
            league: true
          }
        }
      }
    });
    
    if (!user) {
      // User doesn't exist - for development, create a new user
      // In production, this should return an error
      if (process.env.NODE_ENV === 'development') {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            name: email.split('@')[0],
            role: UserRole.PLAYER,
            teamName: `${email.split('@')[0]}'s Team`
          }
        });
        
        // Create session
        const sessionId = nanoid();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        await prisma.userSession.create({
          data: {
            userId: newUser.id,
            sessionId,
            expiresAt,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
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
        
        return NextResponse.json({
          success: true,
          sessionId, // Return session ID for testing
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            teamName: newUser.teamName
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }
    
    // Check password
    if (!user.password) {
      return NextResponse.json(
        { success: false, error: 'Password not set for this account' },
        { status: 401 }
      );
    }
    
    const passwordValid = await bcrypt.compare(password, user.password);
    
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
        expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
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
        role: user.role,
        teamName: user.teamName || primaryTeam?.name,
        teamId: primaryTeam?.id,
        leagueId: primaryTeam?.leagueId,
        leagues: user.leagues.map(lm => ({
          id: lm.league.id,
          name: lm.league.name,
          role: lm.role
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