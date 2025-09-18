import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { prisma } from './db';

// Types and Interfaces  
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

// Password for all users (in production, use hashed passwords)
const DEFAULT_PASSWORD = 'player123!';

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
    
    // Find user by email in database
    const dbUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    });
    
    if (!dbUser) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Verify password (using default password for now)
    if (password !== DEFAULT_PASSWORD) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Create session
    const session = createSession(dbUser.id);
    
    // Note: lastLoginAt tracking removed since it's not in the schema
    
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt
    });
    
    // Convert to User interface
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt
    };
    
    return {
      success: true,
      user
    };
  } catch (error) {
    handleComponentError(error as Error, 'auth');
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
    handleComponentError(error as Error, 'auth');
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionId) return null;
    
    const session = getSession(sessionId);
    if (!session) return null;
    
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    
    if (!dbUser) return null;
    
    // Convert to User interface
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt
    };
    
    return user;
  } catch (error) {
    handleComponentError(error as Error, 'auth');
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
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId }
        });
        
        if (dbUser) {
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || dbUser.email,
            role: dbUser.role,
            avatar: dbUser.avatar || undefined,
            createdAt: dbUser.createdAt
                };
          return user;
        }
      }
    }
    
    // Try to get Bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = getSession(token);
      if (session) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId }
        });
        
        if (dbUser) {
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || dbUser.email,
            role: dbUser.role,
            avatar: dbUser.avatar || undefined,
            createdAt: dbUser.createdAt
                };
          return user;
        }
      }
    }
    
    return null;
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return null;
  }
}

// User Management Functions
export async function getUserById(id: string): Promise<User | null> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!dbUser) return null;
    
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt
    };
    
    return user;
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!dbUser) return null;
    
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt
    };
    
    return user;
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const dbUsers = await prisma.user.findMany();
    
    return dbUsers.map(dbUser => ({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt
    }));
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return [];
  }
}

export async function getUsersByRole(role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER'): Promise<User[]> {
  try {
    const dbUsers = await prisma.user.findMany({
      where: { role }
    });
    
    return dbUsers.map(dbUser => ({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || dbUser.email,
      role: dbUser.role,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt
    }));
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return [];
  }
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

export function canAccessRole(userRole: 'ADMIN' | 'COMMISSIONER' | 'PLAYER', requiredRole: 'admin' | 'commissioner' | 'authenticated'): boolean {
  if (requiredRole === 'authenticated') {
    return true; // Any authenticated user can access
  }
  
  if (requiredRole === 'admin') {
    return userRole === 'ADMIN';
  }
  
  if (requiredRole === 'commissioner') {
    return userRole === 'ADMIN' || userRole === 'COMMISSIONER';
  }
  
  return false;
}