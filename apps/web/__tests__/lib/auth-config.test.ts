/**
 * Auth Configuration Tests
 * 
 * Tests for NextAuth configuration and authentication logic
 */

import { authConfig } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { guardianSessionManager } from '@/lib/security/session-manager'
import { guardianAuditLogger } from '@/lib/security/audit-logger'
import { guardianAccountProtection } from '@/lib/security/account-protection'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('bcryptjs')
jest.mock('@/lib/security/session-manager')
jest.mock('@/lib/security/audit-logger')
jest.mock('@/lib/security/account-protection')

describe('Auth Configuration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    role: 'PLAYER',
    teamName: 'Test Team',
    hashedPassword: 'hashed_password_123',
    updatedAt: new Date()
  }

  const mockRequest = {
    headers: {
      get: jest.fn((key: string) => {
        const headers: Record<string, string> = {
          'x-forwarded-for': '1.2.3.4',
          'user-agent': 'Test Browser',
          'cf-ipcountry': 'US'
        }
        return headers[key]
      })
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AUTH_SECRET = 'test-secret-key-that-is-at-least-32-characters-long'
    process.env.NODE_ENV = 'test'
    
    ;(guardianAccountProtection.isAccountLocked as jest.Mock).mockResolvedValue({
      isLocked: false
    })
    ;(guardianSessionManager.createSession as jest.Mock).mockResolvedValue({
      sessionId: 'session-123',
      expiresAt: Date.now() + 86400000,
      security: {
        riskScore: 0.1,
        anomalies: [],
        isDeviceKnown: true,
        isLocationKnown: true,
        requiresMFA: false
      }
    })
    ;(guardianAccountProtection.recordSuccessfulAttempt as jest.Mock).mockResolvedValue({
      riskScore: 0.1,
      anomalies: [],
      challengeRequired: false
    })
    ;(guardianAuditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined)
  })

  describe('Configuration Structure', () => {
    it('should have required configuration properties', () => {
      expect(authConfig).toHaveProperty('secret')
      expect(authConfig).toHaveProperty('providers')
      expect(authConfig).toHaveProperty('session')
      expect(authConfig).toHaveProperty('jwt')
      expect(authConfig).toHaveProperty('callbacks')
      expect(authConfig).toHaveProperty('pages')
    })

    it('should configure JWT session strategy', () => {
      expect(authConfig.session.strategy).toBe('jwt')
    })

    it('should have signin page configured', () => {
      expect(authConfig.pages.signIn).toBe('/auth/signin')
    })

    it('should have error page configured', () => {
      expect(authConfig.pages.error).toBe('/auth/error')
    })
  })

  describe('Credentials Provider', () => {
    let credentialsProvider: any

    beforeEach(() => {
      credentialsProvider = authConfig.providers[0]
    })

    it('should have credentials provider', () => {
      expect(credentialsProvider).toBeDefined()
      expect(credentialsProvider.name).toBe('credentials')
    })

    describe('Authorization', () => {
      it('should reject missing email', async () => {
        await expect(
          credentialsProvider.authorize(
            { password: 'password123' },
            mockRequest
          )
        ).rejects.toThrow('INVALID_CREDENTIALS')
      })

      it('should reject missing password', async () => {
        await expect(
          credentialsProvider.authorize(
            { email: 'test@example.com' },
            mockRequest
          )
        ).rejects.toThrow('INVALID_CREDENTIALS')
      })

      it('should reject non-existent user', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

        await expect(
          credentialsProvider.authorize(
            { email: 'test@example.com', password: 'password123' },
            mockRequest
          )
        ).rejects.toThrow('INVALID_CREDENTIALS')
      })

      it('should reject user without hashed password', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
          ...mockUser,
          hashedPassword: null
        })

        await expect(
          credentialsProvider.authorize(
            { email: 'test@example.com', password: 'password123' },
            mockRequest
          )
        ).rejects.toThrow('INVALID_CREDENTIALS')
      })

      it('should reject locked account', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(guardianAccountProtection.isAccountLocked as jest.Mock).mockResolvedValue({
          isLocked: true,
          remainingTime: 300
        })

        await expect(
          credentialsProvider.authorize(
            { email: 'test@example.com', password: 'password123' },
            mockRequest
          )
        ).rejects.toThrow('ACCOUNT_LOCKED')
      })

      it('should reject invalid password', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
        ;(guardianAccountProtection.recordFailedAttempt as jest.Mock).mockResolvedValue({
          shouldLock: false
        })

        await expect(
          credentialsProvider.authorize(
            { email: 'test@example.com', password: 'wrong_password' },
            mockRequest
          )
        ).rejects.toThrow('INVALID_CREDENTIALS')
      })

      it('should lock account after failed attempts', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
        ;(guardianAccountProtection.recordFailedAttempt as jest.Mock).mockResolvedValue({
          shouldLock: true,
          lockoutDuration: 900
        })

        await expect(
          credentialsProvider.authorize(
            { email: 'test@example.com', password: 'wrong_password' },
            mockRequest
          )
        ).rejects.toThrow('ACCOUNT_LOCKED')
      })

      it('should authenticate valid credentials', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
        ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

        const result = await credentialsProvider.authorize(
          { email: 'test@example.com', password: 'correct_password' },
          mockRequest
        )

        expect(result).toMatchObject({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'PLAYER'
        })
      })

      it('should normalize email to lowercase', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

        await credentialsProvider.authorize(
          { email: 'TEST@EXAMPLE.COM', password: 'password123' },
          mockRequest
        )

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
          select: expect.any(Object)
        })
      })

      it('should create session on successful auth', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

        await credentialsProvider.authorize(
          { email: 'test@example.com', password: 'password123' },
          mockRequest
        )

        expect(guardianSessionManager.createSession).toHaveBeenCalled()
      })

      it('should log security events', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

        await credentialsProvider.authorize(
          { email: 'test@example.com', password: 'password123' },
          mockRequest
        )

        expect(guardianAuditLogger.logSecurityEvent).toHaveBeenCalled()
      })
    })
  })

  describe('JWT Callback', () => {
    it('should add user data to token on signin', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        role: 'PLAYER',
        teamName: 'Test Team',
        sessionId: 'session-123',
        securityRisk: 0.2
      }

      const result = await authConfig.callbacks.jwt({
        token,
        user,
        trigger: undefined as any,
        session: undefined
      })

      expect(result).toMatchObject({
        id: 'user-123',
        role: 'PLAYER',
        teamName: 'Test Team',
        sessionId: 'session-123'
      })
    })

    it('should update token on update trigger', async () => {
      const token = { id: 'user-123' }
      const session = { name: 'Updated Name' }

      const result = await authConfig.callbacks.jwt({
        token,
        user: undefined,
        trigger: 'update',
        session
      })

      expect(result).toMatchObject({
        id: 'user-123',
        name: 'Updated Name'
      })
    })

    it('should refresh expired token within grace period', async () => {
      const oldTime = Math.floor(Date.now() / 1000) - 90000 // 25 hours ago
      const token = { id: 'user-123', iat: oldTime }

      const result = await authConfig.callbacks.jwt({
        token,
        user: undefined,
        trigger: undefined as any,
        session: undefined
      })

      expect(result).not.toBeNull()
      expect((result as any).iat).toBeGreaterThan(oldTime)
    })
  })

  describe('Session Callback', () => {
    it('should add user data to session', async () => {
      const session = { user: {} }
      const token = {
        id: 'user-123',
        role: 'PLAYER',
        teamName: 'Test Team',
        sessionId: 'session-123',
        securityRisk: 0.1
      }

      const result = await authConfig.callbacks.session({ session, token })

      expect((result.user as any).id).toBe('user-123')
      expect((result.user as any).role).toBe('PLAYER')
      expect((result.user as any).sessionId).toBe('session-123')
    })
  })

  describe('SignIn Callback', () => {
    it('should allow signin by default', async () => {
      const result = await authConfig.callbacks.signIn({
        user: mockUser as any,
        account: null,
        profile: undefined,
        email: undefined,
        credentials: undefined
      })

      expect(result).toBe(true)
    })

    it('should reject unverified Google accounts', async () => {
      await expect(
        authConfig.callbacks.signIn({
          user: mockUser as any,
          account: { provider: 'google' } as any,
          profile: { email_verified: false },
          email: undefined,
          credentials: undefined
        })
      ).rejects.toThrow('EMAIL_NOT_VERIFIED')
    })
  })

  describe('Cookie Configuration', () => {
    it('should use secure cookies in production', () => {
      process.env.NODE_ENV = 'production'
      expect(authConfig.useSecureCookies).toBe(true)
    })

    it('should have httpOnly cookies', () => {
      expect(authConfig.cookies.sessionToken.options.httpOnly).toBe(true)
      expect(authConfig.cookies.csrfToken.options.httpOnly).toBe(true)
    })

    it('should use sameSite lax', () => {
      expect(authConfig.cookies.sessionToken.options.sameSite).toBe('lax')
    })
  })
})
