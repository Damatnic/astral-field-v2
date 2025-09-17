import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Your real users with passwords
const USERS_DB = {
  'nicholas.damato@astralfield.com': { password: 'admin123!', name: "Nicholas D'Amato", role: 'admin' },
  'nicholas@astralfield.com': { password: 'comm123!', name: "Nicholas D'Amato", role: 'commissioner' },
  'nick.hartley@astralfield.com': { password: 'player123!', name: 'Nick Hartley', role: 'player' },
  'jack.mccaigue@astralfield.com': { password: 'player123!', name: 'Jack McCaigue', role: 'player' },
  'larry.mccaigue@astralfield.com': { password: 'player123!', name: 'Larry McCaigue', role: 'player' },
  'renee.mccaigue@astralfield.com': { password: 'player123!', name: 'Renee McCaigue', role: 'player' },
  'jon.kornbeck@astralfield.com': { password: 'player123!', name: 'Jon Kornbeck', role: 'player' },
  'david.jarvey@astralfield.com': { password: 'player123!', name: 'David Jarvey', role: 'player' },
  'kaity.lorbecki@astralfield.com': { password: 'player123!', name: 'Kaity Lorbecki', role: 'player' },
  'cason.minor@astralfield.com': { password: 'player123!', name: 'Cason Minor', role: 'player' },
  'brittany.bergum@astralfield.com': { password: 'player123!', name: 'Brittany Bergum', role: 'player' }
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Check credentials
    const user = USERS_DB[email?.toLowerCase()];
    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create simple session token
    const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    return NextResponse.json({
      success: true,
      user: {
        email,
        name: user.name,
        role: user.role
      },
      token: sessionToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple login endpoint ready',
    method: 'POST',
    body: '{ email, password }'
  });
}