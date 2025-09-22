import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
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
    
    // Check if user is commissioner
    const isCommissioner = user.email === 'nicholas.damato@test.com';
    
    // Create session token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name,
        isCommissioner
      },
      process.env.NEXTAUTH_SECRET || 'test-secret',
      { expiresIn: '30d' }
    );
    
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isCommissioner,
        teams: user.teams
      },
      token
    });
    
    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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