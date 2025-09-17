/**
 * Production Login API Route
 * Authenticates D'Amato Dynasty League members
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/production-auth';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { email, password } = LoginSchema.parse(body);
    
    // Authenticate user
    const session = await authService.authenticate(email, password);
    
    // Set secure cookie
    const response = NextResponse.json({
      success: true,
      user: session.user,
      token: session.token
    });
    
    // Set HTTP-only cookie for additional security
    response.cookies.set('auth-token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if user is authenticated
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }
  
  const user = await authService.verifyToken(token);
  
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }
  
  return NextResponse.json({
    authenticated: true,
    user
  });
}