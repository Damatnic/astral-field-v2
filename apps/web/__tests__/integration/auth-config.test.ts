/**
 * Zenith Authentication Integration Tests
 * Comprehensive testing for NextAuth.js configuration and session management
 */

import { NextAuthConfig } from 'next-auth'
import { authConfig } from '@/lib/auth-config'
import { JWT } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  }
}

// Mock bcrypt module
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

// Mock Prisma import
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

describe('NextAuth Configuration Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication Configuration', () => {
    it('should have correct provider configuration', () => {
      expect(authConfig.providers).toHaveLength(1)
      expect(authConfig.providers[0].name).toBe('credentials')
      expect(authConfig.providers[0].type).toBe('credentials')
    })

    it('should have secure session configuration', () => {
      expect(authConfig.session?.strategy).toBe('jwt')
      expect(authConfig.session?.maxAge).toBe(30 * 60) // 30 minutes
      expect(authConfig.session?.updateAge).toBe(5 * 60) // 5 minutes
    })

    it('should have secure JWT configuration', () => {
      expect(authConfig.jwt?.maxAge).toBe(30 * 60) // 30 minutes
    })

    it('should have secure cookie configuration', () => {
      expect(authConfig.useSecureCookies).toBe(process.env.NODE_ENV === 'production')
      expect(authConfig.cookies?.sessionToken?.options?.httpOnly).toBe(true)
      expect(authConfig.cookies?.sessionToken?.options?.sameSite).toBe('strict')
      expect(authConfig.cookies?.csrfToken?.options?.httpOnly).toBe(true)
    })

    it('should have correct page redirects', () => {
      expect(authConfig.pages?.signIn).toBe('/auth/signin')
      expect(authConfig.pages?.error).toBe('/auth/error')
    })
  })

  describe('Credentials Provider Authentication', () => {
    const mockCredentials = {
      email: 'nicholas@damato-dynasty.com',
      password: 'Dynasty2025!'
    }

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('192.168.1.1')
      }
    }

    it('should authenticate valid credentials successfully', async () => {
      // Mock database response
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'nicholas@damato-dynasty.com',
        name: 'Nicholas D\'Amato',
        image: null,
        role: 'Commissioner',
        teamName: 'D\'Amato Dynasty',
        hashedPassword: '$2a$12$hash123',
        updatedAt: new Date()
      })

      // Mock password verification
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      // Mock last login update
      mockPrisma.user.update.mockResolvedValue({})

      const credentialsProvider = authConfig.providers[0] as any
      const result = await credentialsProvider.authorize(mockCredentials, mockRequest)

      expect(result).toEqual({
        id: 'user_123',
        email: 'nicholas@damato-dynasty.com',
        name: 'Nicholas D\'Amato',
        image: null,
        role: 'Commissioner',
        teamName: 'D\'Amato Dynasty'
      })

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nicholas@damato-dynasty.com' },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          teamName: true,
          hashedPassword: true,
          updatedAt: true
        }
      })

      expect(bcrypt.compare).toHaveBeenCalledWith('Dynasty2025!', '$2a$12$hash123')
    })

    it('should reject invalid credentials', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const credentialsProvider = authConfig.providers[0] as any
      
      await expect(
        credentialsProvider.authorize(mockCredentials, mockRequest)
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should reject incorrect password', async () => {
      // Mock user found but wrong password
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'nicholas@damato-dynasty.com',
        hashedPassword: '$2a$12$hash123'
      })

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const credentialsProvider = authConfig.providers[0] as any
      
      await expect(
        credentialsProvider.authorize(mockCredentials, mockRequest)
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should handle missing credentials', async () => {
      const credentialsProvider = authConfig.providers[0] as any
      
      await expect(
        credentialsProvider.authorize({}, mockRequest)
      ).rejects.toThrow('INVALID_CREDENTIALS')

      await expect(
        credentialsProvider.authorize({ email: 'test@example.com' }, mockRequest)
      ).rejects.toThrow('INVALID_CREDENTIALS')

      await expect(
        credentialsProvider.authorize({ password: 'password' }, mockRequest)
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should normalize email to lowercase', async () => {
      const upperCaseCredentials = {
        email: 'NICHOLAS@DAMATO-DYNASTY.COM',
        password: 'Dynasty2025!'
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'nicholas@damato-dynasty.com',
        hashedPassword: '$2a$12$hash123'
      })

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const credentialsProvider = authConfig.providers[0] as any
      await credentialsProvider.authorize(upperCaseCredentials, mockRequest)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nicholas@damato-dynasty.com' },
        select: expect.any(Object)
      })
    })

    it('should implement timing attack protection', async () => {
      const startTime = Date.now()
      
      // Mock user not found (should add delay)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const credentialsProvider = authConfig.providers[0] as any
      
      try {
        await credentialsProvider.authorize(mockCredentials, mockRequest)
      } catch (error) {
        // Expected to throw
      }

      const endTime = Date.now()
      const elapsed = endTime - startTime

      // Should add delay for timing attack protection
      expect(elapsed).toBeGreaterThanOrEqual(100)
    })

    it('should update last login time asynchronously', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'nicholas@damato-dynasty.com',
        hashedPassword: '$2a$12$hash123'
      })

      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const credentialsProvider = authConfig.providers[0] as any
      await credentialsProvider.authorize(mockCredentials, mockRequest)

      // Give async operation time to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { updatedAt: expect.any(Date) }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const credentialsProvider = authConfig.providers[0] as any
      
      await expect(
        credentialsProvider.authorize(mockCredentials, mockRequest)
      ).rejects.toThrow('AUTHENTICATION_FAILED')
    })

    it('should handle password verification errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        hashedPassword: '$2a$12$hash123'
      })

      ;(bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'))

      const credentialsProvider = authConfig.providers[0] as any
      
      await expect(
        credentialsProvider.authorize(mockCredentials, mockRequest)
      ).rejects.toThrow()
    })
  })

  describe('JWT Callback Configuration', () => {
    const mockUser = {
      id: 'user_123',
      email: 'nicholas@damato-dynasty.com',
      name: 'Nicholas D\'Amato',
      role: 'Commissioner',
      teamName: 'D\'Amato Dynasty'
    }

    it('should create JWT token with user data on login', async () => {
      const token = {}
      const jwtCallback = authConfig.callbacks?.jwt!

      const result = await jwtCallback({
        token,
        user: mockUser,
        trigger: undefined,
        session: undefined
      })

      expect(result.id).toBe('user_123')
      expect(result.role).toBe('Commissioner')
      expect(result.teamName).toBe('D\'Amato Dynasty')
      expect(result.sessionId).toBeDefined()
      expect(result.iat).toBeDefined()
    })

    it('should handle session updates', async () => {
      const existingToken = {
        id: 'user_123',
        role: 'Player',
        iat: Math.floor(Date.now() / 1000)
      }

      const sessionUpdate = {
        role: 'Commissioner'
      }

      const jwtCallback = authConfig.callbacks?.jwt!

      const result = await jwtCallback({
        token: existingToken,
        user: undefined,
        trigger: 'update',
        session: sessionUpdate
      })

      expect(result.role).toBe('Commissioner')
      expect(result.id).toBe('user_123')
    })

    it('should reject expired tokens', async () => {
      const expiredToken = {
        id: 'user_123',
        iat: Math.floor(Date.now() / 1000) - (31 * 60) // 31 minutes ago
      }

      const jwtCallback = authConfig.callbacks?.jwt!

      await expect(
        jwtCallback({
          token: expiredToken,
          user: undefined,
          trigger: undefined,
          session: undefined
        })
      ).rejects.toThrow('TOKEN_EXPIRED')
    })

    it('should allow valid tokens within expiry time', async () => {
      const validToken = {
        id: 'user_123',
        iat: Math.floor(Date.now() / 1000) - (15 * 60) // 15 minutes ago
      }

      const jwtCallback = authConfig.callbacks?.jwt!

      const result = await jwtCallback({
        token: validToken,
        user: undefined,
        trigger: undefined,
        session: undefined
      })

      expect(result.id).toBe('user_123')
    })
  })

  describe('Session Callback Configuration', () => {
    it('should create session from JWT token', async () => {
      const mockSession = {
        user: {
          email: 'nicholas@damato-dynasty.com',
          name: 'Nicholas D\'Amato'
        },
        expires: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }

      const mockToken = {
        id: 'user_123',
        role: 'Commissioner',
        teamName: 'D\'Amato Dynasty',
        sub: 'user_123'
      }

      const sessionCallback = authConfig.callbacks?.session!

      const result = await sessionCallback({
        session: mockSession,
        token: mockToken
      })

      expect(result.user.id).toBe('user_123')
      expect(result.user.role).toBe('Commissioner')
      expect(result.user.teamName).toBe('D\'Amato Dynasty')
    })

    it('should handle missing token gracefully', async () => {
      const mockSession = {
        user: {},
        expires: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }

      const sessionCallback = authConfig.callbacks?.session!

      const result = await sessionCallback({
        session: mockSession,
        token: { sub: 'fallback_id' }
      })

      expect(result.user.id).toBe('fallback_id')
    })
  })

  describe('SignIn Callback Configuration', () => {
    it('should allow credentials sign-in', async () => {
      const signInCallback = authConfig.callbacks?.signIn!

      const result = await signInCallback({
        user: { id: 'user_123' },
        account: { provider: 'credentials' },
        profile: undefined,
        email: undefined,
        credentials: undefined
      })

      expect(result).toBe(true)
    })

    it('should verify Google email verification', async () => {
      const signInCallback = authConfig.callbacks?.signIn!

      // Should reject unverified Google email
      await expect(
        signInCallback({
          user: { id: 'user_123' },
          account: { provider: 'google' },
          profile: { email_verified: false },
          email: undefined,
          credentials: undefined
        })
      ).rejects.toThrow('EMAIL_NOT_VERIFIED')

      // Should allow verified Google email
      const result = await signInCallback({
        user: { id: 'user_123' },
        account: { provider: 'google' },
        profile: { email_verified: true },
        email: undefined,
        credentials: undefined
      })

      expect(result).toBe(true)
    })
  })

  describe('Security Configuration', () => {
    it('should have secure cookie settings for production', () => {
      process.env.NODE_ENV = 'production'
      
      expect(authConfig.useSecureCookies).toBe(true)
      expect(authConfig.cookies?.sessionToken?.name).toBe('__Secure-next-auth.session-token')
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(true)
    })

    it('should have development cookie settings for non-production', () => {
      process.env.NODE_ENV = 'development'
      
      expect(authConfig.useSecureCookies).toBe(false)
      expect(authConfig.cookies?.sessionToken?.name).toBe('next-auth.session-token')
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(false)
    })

    it('should disable debug in all environments', () => {
      expect(authConfig.debug).toBe(false)
    })

    it('should trust host', () => {
      expect(authConfig.trustHost).toBe(true)
    })
  })

  describe('Event Logging', () => {
    it('should log successful sign-ins', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const signInEvent = authConfig.events?.signIn!

      await signInEvent({
        user: { id: 'user_123' },
        account: { provider: 'credentials' },
        profile: undefined,
        isNewUser: false
      })

      expect(consoleSpy).toHaveBeenCalledWith('User signed in:', 'user_123', 'credentials')
      
      consoleSpy.mockRestore()
    })

    it('should log sign-outs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const signOutEvent = authConfig.events?.signOut!

      await signOutEvent({ session: null, token: null })

      expect(consoleSpy).toHaveBeenCalledWith('User signed out')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance Optimizations', () => {
    it('should have optimized JWT settings', () => {
      expect(authConfig.jwt?.maxAge).toBe(30 * 60) // Short expiry for security
    })

    it('should have optimized session settings', () => {
      expect(authConfig.session?.maxAge).toBe(30 * 60) // Short session
      expect(authConfig.session?.updateAge).toBe(5 * 60) // Frequent updates
    })

    it('should use minimal token payload', async () => {
      const token = {}
      const user = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'Player',
        teamName: 'Test Team',
        // These should not be included in JWT
        hashedPassword: 'secret',
        personalData: 'sensitive'
      }

      const jwtCallback = authConfig.callbacks?.jwt!

      const result = await jwtCallback({
        token,
        user,
        trigger: undefined,
        session: undefined
      })

      // Should only include necessary fields
      expect(result.id).toBe('user_123')
      expect(result.role).toBe('Player')
      expect(result.teamName).toBe('Test Team')
      
      // Should not include sensitive data
      expect(result.hashedPassword).toBeUndefined()
      expect(result.personalData).toBeUndefined()
      expect(result.email).toBeUndefined() // Email not needed in JWT
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed tokens gracefully', async () => {
      const malformedToken = {
        // Missing required fields
        someField: 'value'
      }

      const jwtCallback = authConfig.callbacks?.jwt!

      const result = await jwtCallback({
        token: malformedToken,
        user: undefined,
        trigger: undefined,
        session: undefined
      })

      // Should handle gracefully and add required fields
      expect(result.iat).toBeDefined()
    })

    it('should handle session creation errors', async () => {
      const sessionCallback = authConfig.callbacks?.session!

      const result = await sessionCallback({
        session: {
          user: {},
          expires: new Date().toISOString()
        },
        token: null as any
      })

      // Should create minimal session even with null token
      expect(result.user).toBeDefined()
    })
  })
})