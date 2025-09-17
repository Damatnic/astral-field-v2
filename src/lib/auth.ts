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
  // Admins
  {
    id: 'admin-001',
    email: 'alex.johnson@astralfield.com',
    name: 'Alex Johnson',
    role: 'admin',
    avatar: '/avatars/alex-johnson.jpg',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-12-15')
  },
  {
    id: 'admin-002',
    email: 'sarah.chen@astralfield.com',
    name: 'Sarah Chen',
    role: 'admin',
    avatar: '/avatars/sarah-chen.jpg',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-12-14')
  },
  // Commissioners
  {
    id: 'comm-001',
    email: 'mike.wilson@league.com',
    name: 'Mike Wilson',
    role: 'commissioner',
    avatar: '/avatars/mike-wilson.jpg',
    createdAt: new Date('2024-02-15'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'comm-002',
    email: 'emily.davis@league.com',
    name: 'Emily Davis',
    role: 'commissioner',
    avatar: '/avatars/emily-davis.jpg',
    createdAt: new Date('2024-02-20'),
    lastLoginAt: new Date('2024-12-15')
  },
  // Players
  {
    id: 'player-001',
    email: 'chris.brown@players.com',
    name: 'Chris Brown',
    role: 'player',
    avatar: '/avatars/chris-brown.jpg',
    createdAt: new Date('2024-03-01'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-002',
    email: 'jessica.miller@players.com',
    name: 'Jessica Miller',
    role: 'player',
    avatar: '/avatars/jessica-miller.jpg',
    createdAt: new Date('2024-03-05'),
    lastLoginAt: new Date('2024-12-15')
  },
  {
    id: 'player-003',
    email: 'david.lee@players.com',
    name: 'David Lee',
    role: 'player',
    avatar: '/avatars/david-lee.jpg',
    createdAt: new Date('2024-03-10'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-004',
    email: 'amanda.white@players.com',
    name: 'Amanda White',
    role: 'player',
    avatar: '/avatars/amanda-white.jpg',
    createdAt: new Date('2024-03-15'),
    lastLoginAt: new Date('2024-12-14')
  },
  {
    id: 'player-005',
    email: 'ryan.taylor@players.com',
    name: 'Ryan Taylor',
    role: 'player',
    avatar: '/avatars/ryan-taylor.jpg',
    createdAt: new Date('2024-03-20'),
    lastLoginAt: new Date('2024-12-16')
  },
  {
    id: 'player-006',
    email: 'nicole.garcia@players.com',
    name: 'Nicole Garcia',
    role: 'player',
    avatar: '/avatars/nicole-garcia.jpg',
    createdAt: new Date('2024-03-25'),
    lastLoginAt: new Date('2024-12-15')
  }
];

// Password database (in production, use hashed passwords)
const USER_PASSWORDS: Record<string, string> = {
  'alex.johnson@astralfield.com': 'admin123!',
  'sarah.chen@astralfield.com': 'admin123!',
  'mike.wilson@league.com': 'comm123!',
  'emily.davis@league.com': 'comm123!',
  'chris.brown@players.com': 'player123!',
  'jessica.miller@players.com': 'player123!',
  'david.lee@players.com': 'player123!',
  'amanda.white@players.com': 'player123!',
  'ryan.taylor@players.com': 'player123!',
  'nicole.garcia@players.com': 'player123!'
};

// In-memory session storage (in production, use Redis or database)
const SESSIONS = new Map<string, AuthSession>();

// Constants
const SESSION_COOKIE_NAME = 'astral-session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Utility Functions
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password: string): string {
  // In production, use bcrypt or similar
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input: string): string {
  return input.trim().toLowerCase();
}

// Authentication Functions
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { email, password } = credentials;

    // Input validation
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    const sanitizedEmail = sanitizeInput(email);

    // Find user
    const user = USERS.find(u => u.email.toLowerCase() === sanitizedEmail);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password (in production, use bcrypt.compare)
    const storedPassword = USER_PASSWORDS[user.email];
    if (!storedPassword || password !== storedPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    user.lastLoginAt = new Date();

    return { success: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  const session: AuthSession = {
    userId,
    sessionId,
    expiresAt,
    createdAt: new Date()
  };

  SESSIONS.set(sessionId, session);
  return sessionId;
}

export async function getSessionFromCookie(): Promise<AuthSession | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = SESSIONS.get(sessionCookie.value);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      SESSIONS.delete(sessionCookie.value);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return null;
    }

    const user = USERS.find(u => u.id === session.userId);
    return user || null;
  } catch (error) {
    console.error('Current user retrieval error:', error);
    return null;
  }
}

export async function destroySession(sessionId?: string): Promise<void> {
  try {
    if (sessionId) {
      SESSIONS.delete(sessionId);
      return;
    }

    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (sessionCookie?.value) {
      SESSIONS.delete(sessionCookie.value);
    }
  } catch (error) {
    console.error('Session destruction error:', error);
  }
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/'
  };
}

// Helper function to get user by ID
export function getUserById(userId: string): User | null {
  return USERS.find(u => u.id === userId) || null;
}

// Helper function to check user permissions
export function hasPermission(user: User, requiredRole: User['role'][]): boolean {
  return requiredRole.includes(user.role);
}

// Role hierarchy helper
export function canAccessRole(userRole: User['role'], requiredRole: User['role']): boolean {
  const roleHierarchy = {
    admin: 3,
    commissioner: 2,
    player: 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Session validation for middleware
export async function validateSessionFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return null;
    }

    const session = SESSIONS.get(sessionCookie.value);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        SESSIONS.delete(sessionCookie.value);
      }
      return null;
    }

    const user = USERS.find(u => u.id === session.userId);
    return user || null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Helper function for API routes that need authentication
export async function authenticateFromRequest(request: NextRequest): Promise<User | null> {
  return validateSessionFromRequest(request);
}

// Clean expired sessions (call periodically)
export function cleanExpiredSessions(): void {
  const now = new Date();
  const entries = Array.from(SESSIONS.entries());
  for (const [sessionId, session] of entries) {
    if (session.expiresAt < now) {
      SESSIONS.delete(sessionId);
    }
  }
}

// Initialize cleanup interval
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(cleanExpiredSessions, 60 * 60 * 1000); // Clean every hour
}