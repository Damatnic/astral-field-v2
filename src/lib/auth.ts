import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UserRole } from '@/types/fantasy';
import { handleComponentError } from '@/utils/errorHandling';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from './db';
// Helper function to convert user role string to our role type  
function convertUserRole(prismaRole: string): 'ADMIN' | 'COMMISSIONER' | 'PLAYER' {
  switch (prismaRole) {
    case 'ADMIN':
      return 'ADMIN';
    case 'COMMISSIONER':
      return 'COMMISSIONER';
    case 'PLAYER':
      return 'PLAYER';
    default:
      return 'PLAYER';
  }
}



// Types and Interfaces  
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER';
  avatar?: string;
  onboardingCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
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

// No default passwords - all users must have hashed passwords in database

// Database-based session storage for production

// Constants
const SESSION_COOKIE_NAME = 'auth-token';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// JWT Helper Functions
export async function createJWTToken(user: { id: string; email: string; name?: string | null; role: string }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=');
  
  return await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name || user.email,
    role: user.role
  })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('30d')
  .sign(secret);
}

// Session Management
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<AuthSession> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  // Store session in database
  await prisma.userSession.create({
    data: {
      userId,
      sessionId,
      expiresAt,
      isActive: true
    }
  });
  
  const session: AuthSession = {
    userId,
    sessionId,
    expiresAt,
    createdAt: new Date()
  };
  
  return session;
}

async function getSession(sessionId: string): Promise<AuthSession | null> {
  try {
    const dbSession = await prisma.userSession.findFirst({
      where: {
        sessionId,
        isActive: true,
        expiresAt: {
          gt: new Date() // Not expired
        }
      }
    });
    
    if (!dbSession) return null;
    
    // Update last activity
    await prisma.userSession.update({
      where: { id: dbSession.id },
      data: { lastActivity: new Date() }
    });
    
    return {
      userId: dbSession.userId,
      sessionId: dbSession.sessionId,
      expiresAt: dbSession.expiresAt,
      createdAt: dbSession.createdAt
    };
  } catch (error) {
    return null;
  }
}

async function deleteSession(sessionId: string): Promise<void> {
  try {
    await prisma.userSession.updateMany({
      where: { sessionId },
      data: { isActive: false }
    });
  } catch (error) {
    // Ignore errors in session deletion
  }
}

// Authentication Functions
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { email, password } = credentials;
    
    // Find user by email in database
    const dbUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        hashedPassword: true
      }
    });
    
    if (!dbUser) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Verify password using bcrypt
    if (!dbUser.hashedPassword) {
      return { 
        success: false, 
        error: 'Password not set for this account. Please contact your administrator.' 
      };
    }
    
    // Use bcrypt to verify hashed password
    const isValidPassword = await bcrypt.compare(password, dbUser.hashedPassword);
    if (!isValidPassword) {
      return { 
        success: false, 
        error: 'Invalid email or password' 
      };
    }
    
    // Create session
    const session = await createSession(dbUser.id);
    
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
      role: convertUserRole(dbUser.role),
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
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
      await deleteSession(sessionId);
    }
    
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    handleComponentError(error as Error, 'auth');
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    
    // Try main auth session first
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId }
        });
        
        if (dbUser) {
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || dbUser.email,
            role: convertUserRole(dbUser.role),
            avatar: dbUser.avatar || undefined,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt
          };
          return user;
        }
      }
    }
    
    // Try simple login session
    const simpleSessionToken = cookieStore.get('session')?.value;
    if (simpleSessionToken) {
      try {
        // Decode simple session token format: base64(email:timestamp)
        const decoded = Buffer.from(simpleSessionToken, 'base64').toString();
        const [email] = decoded.split(':');
        
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          });
          
          if (dbUser) {
            const user: User = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name || dbUser.email,
              role: convertUserRole(dbUser.role),
              avatar: dbUser.avatar || undefined,
              createdAt: dbUser.createdAt,
              updatedAt: dbUser.updatedAt
            };
            return user;
          }
        }
      } catch (simpleSessionError) {
        // Invalid simple session format
      }
    }
    
    return null;
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return null;
  }
}

export async function authenticateFromRequest(request: NextRequest): Promise<User | null> {
  try {
    // Try to get session from auth token cookie (prioritize auth-token)
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value ||
                          request.cookies.get('session')?.value ||
                          request.cookies.get('astralfield-session')?.value;
    
    if (sessionCookie) {
      // First, try to verify as JWT token using jose (Edge Runtime compatible)
      try {
        const jwtSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || '4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=');
        const { payload } = await jwtVerify(sessionCookie, jwtSecret);
        if (payload && payload.userId) {
          // For Edge Runtime compatibility, use JWT payload directly without database call
          const user: User = {
            id: payload.userId as string,
            email: payload.email as string,
            name: (payload.name as string) || (payload.email as string),
            role: convertUserRole(payload.role as string),
            avatar: (payload.avatar as string) || undefined,
            createdAt: new Date((payload.iat as number) * 1000),
            updatedAt: new Date((payload.iat as number) * 1000)
          };
          return user;
        }
      } catch (jwtError) {
        // Not a valid JWT token, continue to other auth methods
      }
      
      // Try as database session ID
      const session = await getSession(sessionCookie);
      if (session) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId }
        });
        
        if (dbUser) {
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || dbUser.email,
            role: convertUserRole(dbUser.role),
            avatar: dbUser.avatar || undefined,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt
          };
          return user;
        }
      }
    }
    
    // Try to get simple login session cookie
    const simpleSessionToken = request.cookies.get('session')?.value;
    if (simpleSessionToken) {
      try {
        // Decode simple session token format: base64(email:timestamp)
        const decoded = Buffer.from(simpleSessionToken, 'base64').toString();
        const [email] = decoded.split(':');
        
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          });
          
          if (dbUser) {
            const user: User = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name || dbUser.email,
              role: convertUserRole(dbUser.role),
              avatar: dbUser.avatar || undefined,
              createdAt: dbUser.createdAt,
              updatedAt: dbUser.updatedAt
            };
            return user;
          }
        }
      } catch (simpleSessionError) {
        // Invalid simple session format, continue to Bearer token check
      }
    }
    
    // Try to get Bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // First try as regular session token
      const session = await getSession(token);
      if (session) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId }
        });
        
        if (dbUser) {
          const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || dbUser.email,
            role: convertUserRole(dbUser.role),
            avatar: dbUser.avatar || undefined,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt
          };
          return user;
        }
      }
      
      // If not a regular session, try as simple login token
      try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [email] = decoded.split(':');
        
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          });
          
          if (dbUser) {
            const user: User = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name || dbUser.email,
              role: convertUserRole(dbUser.role),
              avatar: dbUser.avatar || undefined,
              createdAt: dbUser.createdAt,
              updatedAt: dbUser.updatedAt
            };
            return user;
          }
        }
      } catch (bearerTokenError) {
        // Invalid bearer token format
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
      role: convertUserRole(dbUser.role),
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
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
      role: convertUserRole(dbUser.role),
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
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
      role: convertUserRole(dbUser.role),
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
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
      role: convertUserRole(dbUser.role),
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
    }));
  } catch (error) {
    handleComponentError(error as Error, 'auth');
    return [];
  }
}

// Session Cleanup (run periodically in production)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await prisma.userSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      },
      data: { isActive: false }
    });
  } catch (error) {
    handleComponentError(error as Error, 'session-cleanup');
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
