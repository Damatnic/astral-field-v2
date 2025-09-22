/**
 * Production Authentication System for D'Amato Dynasty League
 * Secure authentication for the 10 league members
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { logError } from '@/lib/error-handling';

const prisma = new PrismaClient();

// JWT Secret - use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'damato-dynasty-2024-secret-key';
const JWT_EXPIRES_IN = '7d';

// Session configuration
const SESSION_CONFIG = {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  teamName: string;
  avatar: string;
  role: UserRole;
  isCommissioner: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

/**
 * Production user setup for D'Amato Dynasty League
 * Credentials are loaded from environment variables for security
 */
const getProductionUsers = () => {
  const users = process.env.PRODUCTION_USERS;
  if (!users) {
    throw new Error('PRODUCTION_USERS environment variable not set');
  }
  
  try {
    return JSON.parse(users);
  } catch (error) {
    throw new Error('Invalid PRODUCTION_USERS format in environment variable');
  }
};

const PRODUCTION_USERS = getProductionUsers();

export class ProductionAuthService {
  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string): Promise<AuthSession> {
    // Normalize email
    email = email.toLowerCase().trim();
    
    // Check if this is a production user
    const productionUser = PRODUCTION_USERS.find(u => u.email === email);
    
    if (!productionUser) {
      throw new Error('Invalid credentials');
    }
    
    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      // First-time login - create user
      const hashedPassword = await bcrypt.hash(productionUser.tempPassword, 10);
      
      user = await prisma.user.create({
        data: {
          email: productionUser.email,
          name: productionUser.name,
          teamName: productionUser.teamName,
          role: productionUser.role,
          avatar: productionUser.avatar,
          profileId: email
        }
      });
      
      // Send password reset email for security
      await this.sendPasswordResetEmail(email);
    }
    
    // Verify password using bcrypt for security
    let isValid = false;
    
    if (user.hashedPassword) {
      // Use hashed password if available
      isValid = await bcrypt.compare(password, user.hashedPassword);
    } else if (productionUser.tempPassword) {
      // Temporary password verification (deprecated)
      isValid = password === productionUser.tempPassword;
      
      // Hash the password for future use
      if (isValid) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { hashedPassword }
        });
      }
    }
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    // Create session
    const session: AuthSession = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        teamName: user.teamName || '',
        avatar: user.avatar || '🏈',
        role: user.role,
        isCommissioner: user.role === UserRole.COMMISSIONER
      },
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    
    // Store session
    await this.createSession(user.id, token);
    
    return session;
  }
  
  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name || '',
        teamName: user.teamName || '',
        avatar: user.avatar || '🏈',
        role: user.role,
        isCommissioner: user.role === UserRole.COMMISSIONER
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Generate JWT token
   */
  private generateToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN
      }
    );
  }
  
  /**
   * Create user session
   */
  private async createSession(userId: string, token: string) {
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await prisma.userSession.create({
      data: {
        userId,
        sessionId,
        expiresAt,
        isActive: true
      }
    });
    
    return sessionId;
  }
  
  /**
   * Send password reset email (placeholder)
   */
  private async sendPasswordResetEmail(email: string) {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    logError('Password reset email needed', {
      operation: 'send-password-reset',
      metadata: { email, message: 'Email service integration required for production' }
    });
  }
  
  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Deactivate all user sessions
      await prisma.userSession.updateMany({
        where: {
          userId: decoded.userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
    } catch (error) {
      // Silent fail - token might be expired
    }
  }
  
  /**
   * Check if user is commissioner
   */
  async isCommissioner(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role === UserRole.COMMISSIONER;
  }
  
  /**
   * Get user's team in league
   */
  async getUserTeam(userId: string, leagueId: string) {
    return await prisma.team.findFirst({
      where: {
        ownerId: userId,
        leagueId
      },
      include: {
        roster: {
          include: {
            player: true
          }
        }
      }
    });
  }
}

// Export singleton instance
export const authService = new ProductionAuthService();

// Middleware helper
export async function requireAuth(request: Request | NextRequest): Promise<AuthUser> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  
  const token = authHeader.substring(7);
  const user = await authService.verifyToken(token);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

// Commissioner-only middleware
export async function requireCommissioner(request: Request | NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request);
  
  if (!user.isCommissioner) {
    throw new Error('Commissioner access required');
  }
  
  return user;
}