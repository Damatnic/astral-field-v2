// Simplified authentication for production deployment
// This version works without database dependencies

import { cookies } from 'next/headers';
import * as crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER';
  avatar?: string;
  createdAt: Date;
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

// Demo users for production
const DEMO_USERS: Record<string, User> = {
  'admin@astralfield.com': {
    id: 'admin-001',
    email: 'admin@astralfield.com',
    name: 'Admin User',
    role: 'ADMIN',
    avatar: '/api/avatars/admin',
    createdAt: new Date('2024-01-01'),
  },
  'commissioner@astralfield.com': {
    id: 'comm-001',
    email: 'commissioner@astralfield.com',
    name: 'Commissioner',
    role: 'COMMISSIONER',
    avatar: '/api/avatars/commissioner',
    createdAt: new Date('2024-01-01'),
  },
  'player1@astralfield.com': {
    id: 'player-001',
    email: 'player1@astralfield.com',
    name: 'Player One',
    role: 'PLAYER',
    avatar: '/api/avatars/player1',
    createdAt: new Date('2024-01-01'),
  },
  'demo@astralfield.com': {
    id: 'demo-001',
    email: 'demo@astralfield.com',
    name: 'Demo User',
    role: 'PLAYER',
    avatar: '/api/avatars/demo',
    createdAt: new Date('2024-01-01'),
  },
};

// Demo password
const DEMO_PASSWORD = 'demo123';

// In-memory session storage
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
    
    // Find user in demo users
    const user = DEMO_USERS[email.toLowerCase()];
    
    if (!user) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Verify password
    if (password !== DEMO_PASSWORD) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Create session
    const session = createSession(user.id);
    
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
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
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
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
    
    // Find user by ID
    const user = Object.values(DEMO_USERS).find(u => u.id === session.userId);
    
    return user || null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

// Get demo credentials for display
export function getDemoCredentials() {
  return {
    emails: Object.keys(DEMO_USERS),
    password: DEMO_PASSWORD,
    users: Object.values(DEMO_USERS).map(u => ({
      email: u.email,
      name: u.name,
      role: u.role
    }))
  };
}