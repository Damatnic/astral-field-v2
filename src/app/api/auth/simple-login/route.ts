import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';
import { handleComponentError } from '@/lib/error-handling';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Define user interface with proper types
interface UserRecord {
  password: string;
  name: string;
  role: UserRole;
}

interface UsersDatabase {
  [email: string]: UserRecord;
}

// Your real users with passwords - properly typed
const USERS_DB: UsersDatabase = {
  'nicholas.damato@astralfield.com': { password: 'admin123!', name: "Nicholas D'Amato", role: UserRole.ADMIN },
  'nicholas@astralfield.com': { password: 'comm123!', name: "Nicholas D'Amato", role: UserRole.COMMISSIONER },
  'nick.hartley@astralfield.com': { password: 'player123!', name: 'Nick Hartley', role: UserRole.PLAYER },
  'jack.mccaigue@astralfield.com': { password: 'player123!', name: 'Jack McCaigue', role: UserRole.PLAYER },
  'larry.mccaigue@astralfield.com': { password: 'player123!', name: 'Larry McCaigue', role: UserRole.PLAYER },
  'renee.mccaigue@astralfield.com': { password: 'player123!', name: 'Renee McCaigue', role: UserRole.PLAYER },
  'jon.kornbeck@astralfield.com': { password: 'player123!', name: 'Jon Kornbeck', role: UserRole.PLAYER },
  'david.jarvey@astralfield.com': { password: 'player123!', name: 'David Jarvey', role: UserRole.PLAYER },
  'kaity.lorbecki@astralfield.com': { password: 'player123!', name: 'Kaity Lorbecki', role: UserRole.PLAYER },
  'cason.minor@astralfield.com': { password: 'player123!', name: 'Cason Minor', role: UserRole.PLAYER },
  'brittany.bergum@astralfield.com': { password: 'player123!', name: 'Brittany Bergum', role: UserRole.PLAYER }
};

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
    
    // Check credentials with proper type safety
    const normalizedEmail = email.toLowerCase() as string;
    const user = USERS_DB[normalizedEmail];
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
    handleComponentError(error as Error, 'route');
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