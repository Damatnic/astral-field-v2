import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import * as crypto from 'crypto';

// Types and Interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'commissioner' | 'player';
  avatar?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AuthSession {
  userId: string;
  sessionId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Predefined Users Database
const USERS: User[] = [
  // Admin & Commissioner (Nicholas D'Amato)
  {
    id: 'admin-1',
    email: 'nicholas.damato@astralfield.com',
    name: "Nicholas D'Amato",
    role: 'admin',
    avatar: '/api/avatars/nicholas-damato.jpg',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-12-15')
  },
  {
    id: 'commissioner-1',
    email: 'nicholas@astralfield.com',
    name: "Nicholas D'Amato",
    role: 'commissioner',
    avatar: '/api/avatars/nicholas-damato.jpg',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-12-14')
  },
  // Players
  {
    id: 'player-1',
    email: 'nick.hartley@astralfield.com',
    name: 'Nick Hartley',
    role: 'player',
    avatar: '/api/avatars/nick-hartley.jpg',
    createdAt: new Date('2024-02-15'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-2',
    email: 'jack.mccaigue@astralfield.com',
    name: 'Jack McCaigue',
    role: 'player',
    avatar: '/api/avatars/jack-mccaigue.jpg',
    createdAt: new Date('2024-02-20'),
    lastLoginAt: new Date('2024-12-15')
  },
  {
    id: 'player-3',
    email: 'larry.mccaigue@astralfield.com',
    name: 'Larry McCaigue',
    role: 'player',
    avatar: '/api/avatars/larry-mccaigue.jpg',
    createdAt: new Date('2024-03-01'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-4',
    email: 'renee.mccaigue@astralfield.com',
    name: 'Renee McCaigue',
    role: 'player',
    avatar: '/api/avatars/renee-mccaigue.jpg',
    createdAt: new Date('2024-03-15'),
    lastLoginAt: new Date('2024-12-14')
  },
  {
    id: 'player-5',
    email: 'jon.kornbeck@astralfield.com',
    name: 'Jon Kornbeck',
    role: 'player',
    avatar: '/api/avatars/jon-kornbeck.jpg',
    createdAt: new Date('2024-03-20'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-6',
    email: 'david.jarvey@astralfield.com',
    name: 'David Jarvey',
    role: 'player',
    avatar: '/api/avatars/david-jarvey.jpg',
    createdAt: new Date('2024-03-25'),
    lastLoginAt: new Date('2024-12-15')
  },
  {
    id: 'player-7',
    email: 'kaity.lorbecki@astralfield.com',
    name: 'Kaity Lorbecki',
    role: 'player',
    avatar: '/api/avatars/kaity-lorbecki.jpg',
    createdAt: new Date('2024-03-10'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-8',
    email: 'cason.minor@astralfield.com',
    name: 'Cason Minor',
    role: 'player',
    avatar: '/api/avatars/cason-minor.jpg',
    createdAt: new Date('2024-03-05'),
    lastLoginAt: new Date('2024-12-15')
  },
  {
    id: 'player-9',
    email: 'brittany.bergum@astralfield.com',
    name: 'Brittany Bergum',
    role: 'player',
    avatar: '/api/avatars/brittany-bergum.jpg',
    createdAt: new Date('2024-03-12'),
    lastLoginAt: new Date('2024-12-15')
  }
];

// Password database (in production, use hashed passwords)
const USER_PASSWORDS: Record<string, string> = {
  'nicholas.damato@astralfield.com': 'admin123!',
  'nicholas@astralfield.com': 'comm123!',
  'nick.hartley@astralfield.com': 'player123!',
  'jack.mccaigue@astralfield.com': 'player123!',
  'larry.mccaigue@astralfield.com': 'player123!',
  'renee.mccaigue@astralfield.com': 'player123!',
  'jon.kornbeck@astralfield.com': 'player123!',
  'david.jarvey@astralfield.com': 'player123!',
  'kaity.lorbecki@astralfield.com': 'player123!',
  'cason.minor@astralfield.com': 'player123!',
  'brittany.bergum@astralfield.com': 'player123!'
};

// In-memory session storage (in production, use Redis or database)
const SESSIONS = new Map<string, AuthSession>();

// Constants
const SESSION_COOKIE_NAME = 'astralfield-session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Session Management
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

function createSession(userId: string): AuthSession {
  const sessionId = generateSessionId();
  const session: AuthSession = {
    userId,
    sessionId,
    expiresAt: new Date(Date.now() + SESSION_DURATION),
    createdAt: new Date()
  };
  
  SESSIONS.set(sessionId, session);
  return session;
}

function getSession(sessionId: string): AuthSession | null {
  const session = SESSIONS.get(sessionId);
  
  if (!session) return null;
  
  // Check if session is expired
  if (session.expiresAt < new Date()) {
    SESSIONS.delete(sessionId);
    return null;
  }
  
  return session;
}

function deleteSession(sessionId: string): void {
  SESSIONS.delete(sessionId);
}

// Authentication Functions
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { email, password } = credentials;
    
    // Find user by email
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Verify password
    const storedPassword = USER_PASSWORDS[user.email];
    if (!storedPassword || storedPassword !== password) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Create session
    const session = createSession(user.id);
    
    // Update last login
    user.lastLoginAt = new Date();
    
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt
    });
    
    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An error occurred during login'
    };
  }
}

export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (sessionId) {
      deleteSession(sessionId);
    }
    
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionId) return null;
    
    const session = getSession(sessionId);
    if (!session) return null;
    
    const user = USERS.find(u => u.id === session.userId);
    return user || null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function authenticateFromRequest(request: NextRequest): Promise<User | null> {
  try {
    // Try to get session from cookie
    const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (sessionId) {
      const session = getSession(sessionId);
      if (session) {
        const user = USERS.find(u => u.id === session.userId);
        return user || null;
      }
    }
    
    // Try to get Bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = getSession(token);
      if (session) {
        const user = USERS.find(u => u.id === session.userId);
        return user || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Authenticate from request error:', error);
    return null;
  }
}

// User Management Functions
export function getUserById(id: string): User | null {
  return USERS.find(u => u.id === id) || null;
}

export function getUserByEmail(email: string): User | null {
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getAllUsers(): User[] {
  return [...USERS];
}

export function getUsersByRole(role: 'admin' | 'commissioner' | 'player'): User[] {
  return USERS.filter(u => u.role === role);
}

// Session Cleanup (run periodically in production)
export function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [sessionId, session] of SESSIONS.entries()) {
    if (session.expiresAt < now) {
      SESSIONS.delete(sessionId);
    }
  }
}

// Additional exports for middleware
export async function validateSessionFromRequest(request: NextRequest): Promise<User | null> {
  return await authenticateFromRequest(request);
}

export function canAccessRole(userRole: 'admin' | 'commissioner' | 'player', requiredRole: 'admin' | 'commissioner' | 'authenticated'): boolean {
  if (requiredRole === 'authenticated') {
    return true; // Any authenticated user can access
  }
  
  if (requiredRole === 'admin') {
    return userRole === 'admin';
  }
  
  if (requiredRole === 'commissioner') {
    return userRole === 'admin' || userRole === 'commissioner';
  }
  
  return false;
}