// Simplified authentication for production deployment
// This version works without database dependencies

import { cookies } from 'next/headers';
import * as crypto from 'crypto';
import { handleComponentError } from '@/utils/errorHandling';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER';
  teamId?: number;
  teamName?: string;
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

// Demo users for production - Full league roster
const DEMO_USERS: Record<string, User> = {
  'admin@astralfield.com': {
    id: 'admin-001',
    email: 'admin@astralfield.com',
    name: 'Admin User',
    role: 'ADMIN',
    avatar: '/api/avatars/admin',
    createdAt: new Date('2024-01-01'),
  },
  'dan@astralfield.com': {
    id: 'user-010',
    email: 'dan@astralfield.com',
    name: 'Dan D\'Amato',
    role: 'COMMISSIONER',
    teamId: 10,
    teamName: 'D\'Amato Dynasty',
    avatar: '/api/avatars/dan',
    createdAt: new Date('2024-01-01'),
  },
  'nick@astralfield.com': {
    id: 'user-001',
    email: 'nick@astralfield.com',
    name: 'Nick Hartley',
    role: 'PLAYER',
    teamId: 1,
    teamName: 'Hartley Heroes',
    avatar: '/api/avatars/nick',
    createdAt: new Date('2024-01-01'),
  },
  'jack@astralfield.com': {
    id: 'user-002',
    email: 'jack@astralfield.com',
    name: 'Jack McCaigue',
    role: 'PLAYER',
    teamId: 2,
    teamName: 'McCaigue Mayhem',
    avatar: '/api/avatars/jack',
    createdAt: new Date('2024-01-01'),
  },
  'larry@astralfield.com': {
    id: 'user-003',
    email: 'larry@astralfield.com',
    name: 'Larry McCaigue',
    role: 'PLAYER',
    teamId: 3,
    teamName: 'Larry\'s Legends',
    avatar: '/api/avatars/larry',
    createdAt: new Date('2024-01-01'),
  },
  'renee@astralfield.com': {
    id: 'user-004',
    email: 'renee@astralfield.com',
    name: 'Renee McCaigue',
    role: 'PLAYER',
    teamId: 4,
    teamName: 'Renee\'s Reign',
    avatar: '/api/avatars/renee',
    createdAt: new Date('2024-01-01'),
  },
  'jon@astralfield.com': {
    id: 'user-005',
    email: 'jon@astralfield.com',
    name: 'Jon Kornbeck',
    role: 'PLAYER',
    teamId: 5,
    teamName: 'Kornbeck Crushers',
    avatar: '/api/avatars/jon',
    createdAt: new Date('2024-01-01'),
  },
  'david@astralfield.com': {
    id: 'user-006',
    email: 'david@astralfield.com',
    name: 'David Jarvey',
    role: 'PLAYER',
    teamId: 6,
    teamName: 'Jarvey\'s Juggernauts',
    avatar: '/api/avatars/david',
    createdAt: new Date('2024-01-01'),
  },
  'kaity@astralfield.com': {
    id: 'user-007',
    email: 'kaity@astralfield.com',
    name: 'Kaity Lorbecki',
    role: 'PLAYER',
    teamId: 7,
    teamName: 'Lorbecki Lions',
    avatar: '/api/avatars/kaity',
    createdAt: new Date('2024-01-01'),
  },
  'cason@astralfield.com': {
    id: 'user-008',
    email: 'cason@astralfield.com',
    name: 'Cason Minor',
    role: 'PLAYER',
    teamId: 8,
    teamName: 'Minor Miracles',
    avatar: '/api/avatars/cason',
    createdAt: new Date('2024-01-01'),
  },
  'brittany@astralfield.com': {
    id: 'user-009',
    email: 'brittany@astralfield.com',
    name: 'Brittany Bergum',
    role: 'PLAYER',
    teamId: 9,
    teamName: 'Bergum Blitz',
    avatar: '/api/avatars/brittany',
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

// Demo passwords
const DEMO_PASSWORDS: Record<string, string> = {
  'admin@astralfield.com': 'admin123',
  'dan@astralfield.com': 'Astral2025!',
  'nick@astralfield.com': 'Astral2025!',
  'jack@astralfield.com': 'Astral2025!',
  'larry@astralfield.com': 'Astral2025!',
  'renee@astralfield.com': 'Astral2025!',
  'jon@astralfield.com': 'Astral2025!',
  'david@astralfield.com': 'Astral2025!',
  'kaity@astralfield.com': 'Astral2025!',
  'cason@astralfield.com': 'Astral2025!',
  'brittany@astralfield.com': 'Astral2025!',
  'demo@astralfield.com': 'demo123',
};

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
    const validPassword = DEMO_PASSWORDS[email.toLowerCase()];
    if (!validPassword || password !== validPassword) {
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
    handleComponentError(error as Error, 'auth-simple');
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
    handleComponentError(error as Error, 'auth-simple');
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
    handleComponentError(error as Error, 'auth-simple');
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
    users: Object.values(DEMO_USERS).map(u => ({
      email: u.email,
      password: DEMO_PASSWORDS[u.email],
      name: u.name,
      role: u.role,
      teamName: u.teamName
    }))
  };
}