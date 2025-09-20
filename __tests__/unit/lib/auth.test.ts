/**
 * Unit tests for Authentication Library
 * Tests login, logout, session management, and user authentication functions
 */

import {
  login,
  logout,
  getCurrentUser,
  authenticateFromRequest,
  getUserById,
  getUserByEmail,
  canAccessRole,
  cleanupExpiredSessions,
} from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import {
  createMockUser,
  createMockSession,
  createMockRequest,
  mockConsoleError,
} from '../../utils/test-helpers';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/utils/errorHandling', () => ({
  handleComponentError: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('Authentication Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const mockUser = createMockUser();
      const hashedPassword = 'hashed-password-123';
      
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session-id',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });

      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({
        set: jest.fn(),
      });

      // Act
      const result = await login({
        email: mockUser.email,
        password: 'test-password',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email.toLowerCase() },
        select: expect.objectContaining({
          id: true,
          email: true,
          password: true,
        }),
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('test-password', hashedPassword);
      expect(mockPrisma.userSession.create).toHaveBeenCalled();
    });

    it('should fail login with invalid email', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await login({
        email: 'nonexistent@example.com',
        password: 'test-password',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.user).toBeUndefined();
    });

    it('should fail login with invalid password', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password-123',
      });
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await login({
        email: mockUser.email,
        password: 'wrong-password',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password-123');
    });

    it('should fail login when user has no password set', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      // Act
      const result = await login({
        email: mockUser.email,
        password: 'test-password',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password not set for this account. Please contact your administrator.');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await login({
        email: 'test@example.com',
        password: 'test-password',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('An error occurred during login');
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const mockUser = createMockUser({ email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });

      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({ set: jest.fn() });

      // Act
      await login({
        email: 'TEST@EXAMPLE.COM',
        password: 'test-password',
      });

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object),
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear session', async () => {
      // Arrange
      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'test-session-id' }),
        delete: jest.fn(),
      });
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await logout();

      // Assert
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'test-session-id' },
        data: { isActive: false },
      });
      expect(cookiesMock().delete).toHaveBeenCalledWith('astralfield-session');
    });

    it('should handle logout when no session exists', async () => {
      // Arrange
      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
        delete: jest.fn(),
      });

      // Act
      await logout();

      // Assert
      expect(mockPrisma.userSession.updateMany).not.toHaveBeenCalled();
      expect(cookiesMock().delete).toHaveBeenCalledWith('astralfield-session');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from valid session', async () => {
      // Arrange
      const mockUser = createMockUser();
      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'test-session-id' }),
      });

      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session-id',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.userSession.update.mockResolvedValue({} as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await getCurrentUser();

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { lastActivity: expect.any(Date) },
      });
    });

    it('should return null for expired session', async () => {
      // Arrange
      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'test-session-id' }),
      });
      mockPrisma.userSession.findFirst.mockResolvedValue(null);

      // Act
      const result = await getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle simple session token fallback', async () => {
      // Arrange
      const mockUser = createMockUser();
      const cookiesMock = require('next/headers').cookies;
      cookiesMock.mockReturnValue({
        get: jest.fn((name) => {
          if (name === 'astralfield-session') return undefined;
          if (name === 'session') {
            const token = Buffer.from(`${mockUser.email}:${Date.now()}`).toString('base64');
            return { value: token };
          }
          return undefined;
        }),
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await getCurrentUser();

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
    });
  });

  describe('authenticateFromRequest', () => {
    it('should authenticate user from request cookies', async () => {
      // Arrange
      const mockUser = createMockUser();
      const request = createMockRequest('/api/test', {
        cookies: { 'astralfield-session': 'test-session-id' },
      });

      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session-id',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.userSession.update.mockResolvedValue({} as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await authenticateFromRequest(request);

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should authenticate user from Authorization header', async () => {
      // Arrange
      const mockUser = createMockUser();
      const request = createMockRequest('/api/test', {
        headers: { 'Authorization': 'Bearer test-token' },
      });

      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-token',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.userSession.update.mockResolvedValue({} as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await authenticateFromRequest(request);

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await getUserById(mockUser.id);

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null for non-existent user', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await getUserById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await getUserByEmail(mockUser.email);

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email.toLowerCase() },
      });
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const mockUser = createMockUser({ email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await getUserByEmail('TEST@EXAMPLE.COM');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('canAccessRole', () => {
    it('should allow authenticated access for any role', () => {
      expect(canAccessRole('PLAYER', 'authenticated')).toBe(true);
      expect(canAccessRole('COMMISSIONER', 'authenticated')).toBe(true);
      expect(canAccessRole('ADMIN', 'authenticated')).toBe(true);
    });

    it('should restrict admin access to ADMIN role only', () => {
      expect(canAccessRole('ADMIN', 'admin')).toBe(true);
      expect(canAccessRole('COMMISSIONER', 'admin')).toBe(false);
      expect(canAccessRole('PLAYER', 'admin')).toBe(false);
    });

    it('should allow commissioner access to ADMIN and COMMISSIONER roles', () => {
      expect(canAccessRole('ADMIN', 'commissioner')).toBe(true);
      expect(canAccessRole('COMMISSIONER', 'commissioner')).toBe(true);
      expect(canAccessRole('PLAYER', 'commissioner')).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should deactivate expired sessions', async () => {
      // Arrange
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 5 });

      // Act
      await cleanupExpiredSessions();

      // Assert
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { isActive: false },
          ],
        },
        data: { isActive: false },
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      mockPrisma.userSession.updateMany.mockRejectedValue(new Error('Database error'));
      const consoleSpy = mockConsoleError();

      // Act
      await cleanupExpiredSessions();

      // Assert - Should not throw
      expect(consoleSpy).not.toHaveBeenCalled(); // handleComponentError handles the error
    });
  });
});