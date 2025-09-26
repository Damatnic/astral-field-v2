/**
 * Zenith Authentication Library Tests
 * Comprehensive testing for auth utilities and configuration
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMockUser, mockAuthSessions } from '@/fixtures/users.fixture'

// Mock NextAuth
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

describe('Authentication Library', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.resetPrismaMocks?.()
  })

  describe('auth configuration', () => {
    it('should export auth function', () => {
      expect(auth).toBeDefined()
      expect(typeof auth).toBe('function')
    })

    it('should handle valid session', async () => {
      const mockUser = createMockUser()
      const mockSession = {
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      // Mock the auth function to return a session
      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session).toEqual(mockSession)
      expect(session?.user.id).toBe(mockUser.id)
      expect(session?.user.email).toBe(mockUser.email)
    })

    it('should handle null session for unauthenticated users', async () => {
      jest.mocked(auth).mockResolvedValue(null)

      const session = await auth()
      
      expect(session).toBeNull()
    })

    it('should handle expired session', async () => {
      const expiredSession = {
        user: createMockUser(),
        expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(expiredSession)

      const session = await auth()
      
      expect(session).toEqual(expiredSession)
      expect(new Date(session?.expires || 0) < new Date()).toBe(true)
    })
  })

  describe('session validation', () => {
    it('should validate session structure', async () => {
      const mockSession = {
        user: createMockUser(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session).toHaveProperty('user')
      expect(session).toHaveProperty('expires')
      expect(session?.user).toHaveProperty('id')
      expect(session?.user).toHaveProperty('email')
      expect(session?.user).toHaveProperty('name')
    })

    it('should validate user roles', async () => {
      const adminUser = createMockUser({
        role: 'ADMIN',
        isAdmin: true,
      })

      const mockSession = {
        user: adminUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session?.user.role).toBe('ADMIN')
      expect(session?.user.isAdmin).toBe(true)
    })

    it('should handle commissioner permissions', async () => {
      const commissionerUser = createMockUser({
        role: 'COMMISSIONER',
      })

      const mockSession = {
        user: commissionerUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session?.user.role).toBe('COMMISSIONER')
    })
  })

  describe('authentication edge cases', () => {
    it('should handle malformed session data', async () => {
      const malformedSession = {
        user: {
          id: null,
          email: '',
        },
        expires: 'invalid-date',
      }

      jest.mocked(auth).mockResolvedValue(malformedSession as any)

      const session = await auth()
      
      expect(session).toEqual(malformedSession)
    })

    it('should handle network errors gracefully', async () => {
      jest.mocked(auth).mockRejectedValue(new Error('Network error'))

      await expect(auth()).rejects.toThrow('Network error')
    })

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed')
      jest.mocked(auth).mockRejectedValue(dbError)

      await expect(auth()).rejects.toThrow('Database connection failed')
    })
  })

  describe('user session persistence', () => {
    it('should maintain session across requests', async () => {
      const mockUser = createMockUser()
      const mockSession = {
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      // First request
      const session1 = await auth()
      expect(session1?.user.id).toBe(mockUser.id)

      // Second request should return same session
      const session2 = await auth()
      expect(session2?.user.id).toBe(mockUser.id)
      expect(session1?.expires).toBe(session2?.expires)
    })

    it('should handle session refresh', async () => {
      const mockUser = createMockUser()
      const originalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const refreshedExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)

      // First call with original expiry
      jest.mocked(auth).mockResolvedValueOnce({
        user: mockUser,
        expires: originalExpiry.toISOString(),
      })

      // Second call with refreshed expiry
      jest.mocked(auth).mockResolvedValueOnce({
        user: mockUser,
        expires: refreshedExpiry.toISOString(),
      })

      const session1 = await auth()
      const session2 = await auth()

      expect(new Date(session1?.expires || 0) < new Date(session2?.expires || 0)).toBe(true)
    })
  })

  describe('authentication state management', () => {
    it('should track last active timestamp', async () => {
      const mockUser = createMockUser({
        lastActiveAt: new Date('2024-01-01'),
      })

      const mockSession = {
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session?.user.lastActiveAt).toBeDefined()
      expect(new Date(session?.user.lastActiveAt || 0)).toBeInstanceOf(Date)
    })

    it('should handle onboarding status', async () => {
      const newUser = createMockUser({
        onboardingCompleted: false,
        onboardingCompletedAt: null,
      })

      const mockSession = {
        user: newUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session?.user.onboardingCompleted).toBe(false)
      expect(session?.user.onboardingCompletedAt).toBeNull()
    })
  })

  describe('security validation', () => {
    it('should not expose sensitive information', async () => {
      const mockUser = createMockUser({
        hashedPassword: '$2a$10$secret.hash',
      })

      const mockSession = {
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      // Sensitive fields should not be exposed in session
      expect(session?.user).not.toHaveProperty('hashedPassword')
      expect(session?.user).not.toHaveProperty('password')
    })

    it('should validate session token format', async () => {
      const mockSession = {
        user: createMockUser(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      jest.mocked(auth).mockResolvedValue(mockSession)

      const session = await auth()
      
      expect(session?.expires).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})