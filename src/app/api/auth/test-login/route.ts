import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createJWTToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  // Allow test login if explicitly enabled via environment variable
  const testLoginEnabled = process.env.ENABLE_SIMPLE_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  
  if (!testLoginEnabled) {
    return NextResponse.json({ 
      error: 'Test endpoints are disabled' 
    }, { status: 403 });
  }
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Find user in test league
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teams: {
          include: {
            league: true
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in test league' }, { status: 404 });
    }
    
    // Create JWT token using standardized helper
    const token = await createJWTToken(user);
    
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teams: user.teams
      },
      token
    });
    
    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Allow test login if explicitly enabled via environment variable
  const testLoginEnabled = process.env.ENABLE_SIMPLE_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  
  if (!testLoginEnabled) {
    return NextResponse.json({ 
      error: 'Test endpoints are disabled' 
    }, { status: 403 });
  }
  
  // Return list of test users for quick reference
  const testUsers = [
    { name: "Nicholas D'Amato", email: "nicholas.damato@test.com", role: "Commissioner" },
    { name: "Nick Hartley", email: "nick.hartley@test.com", role: "Team Owner" },
    { name: "Jack McCaigue", email: "jack.mccaigue@test.com", role: "Team Owner" },
    { name: "Larry McCaigue", email: "larry.mccaigue@test.com", role: "Team Owner" },
    { name: "Renee McCaigue", email: "renee.mccaigue@test.com", role: "Team Owner" },
    { name: "Jon Kornbeck", email: "jon.kornbeck@test.com", role: "Team Owner" },
    { name: "David Jarvey", email: "david.jarvey@test.com", role: "Team Owner" },
    { name: "Kaity Lorbecki", email: "kaity.lorbecki@test.com", role: "Team Owner" },
    { name: "Cason Minor", email: "cason.minor@test.com", role: "Team Owner" },
    { name: "Brittany Bergum", email: "brittany.bergum@test.com", role: "Team Owner" }
  ];
  
  return NextResponse.json({ 
    message: 'Test League 2025 Users', 
    users: testUsers,
    password: 'fantasy2025'
  });
}