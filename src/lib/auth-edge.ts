// Edge-compatible authentication functions
// This file replaces bcrypt with simple password comparison for Vercel deployment

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  userId: string;
  sessionId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Constants
const SESSION_COOKIE_NAME = 'astralfield-session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Temporary in-memory session storage (replace with database in production)
const sessions = new Map<string, AuthSession>();

// Session Management
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<AuthSession> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  const session: AuthSession = {
    userId,
    sessionId,
    expiresAt,
    createdAt: new Date()
  };
  
  sessions.set(sessionId, session);
  return session;
}

export async function getSession(sessionId: string): Promise<AuthSession | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  sessions.delete(sessionId);
}

// Simple user validation (replace with database lookup)
export async function validateUser(email: string, password: string): Promise<User | null> {
  // Hardcoded users for deployment testing
  const users: Record<string, { password: string; user: User }> = {
    'damato@example.com': {
      password: 'player123!',
      user: {
        id: '1',
        email: 'damato@example.com',
        name: 'Damato',
        role: 'COMMISSIONER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    'admin@astralfield.com': {
      password: 'admin123!',
      user: {
        id: '2',
        email: 'admin@astralfield.com',
        name: 'Admin',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  };
  
  const userData = users[email.toLowerCase()];
  if (!userData || userData.password !== password) {
    return null;
  }
  
  return userData.user;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionId) return null;
    
    const session = await getSession(sessionId);
    if (!session) return null;
    
    // For now, return a hardcoded user based on session
    // In production, fetch from database
    if (session.userId === '1') {
      return {
        id: '1',
        email: 'damato@example.com',
        name: 'Damato',
        role: 'COMMISSIONER',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Simplified role checking
export function canAccessRole(userRole: string, requiredRole: string): boolean {
  if (requiredRole === 'authenticated') return true;
  if (requiredRole === 'admin') return userRole === 'ADMIN';
  if (requiredRole === 'commissioner') return userRole === 'ADMIN' || userRole === 'COMMISSIONER';
  return false;
}