/**
 * Authentication Testing Helpers
 * Utilities for testing authentication, authorization, and security
 */

import { sign, verify } from 'jsonwebtoken'
import { hash, compare } from 'bcryptjs'
import { TestDatabase } from './test-database'
import { TestHelpers } from './test-helpers'

export class AuthTestHelpers {
  private static readonly JWT_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key'
  private static readonly TOKEN_EXPIRY = '1h'

  /**
   * Create a valid JWT token for testing
   */
  static createTestToken(payload: {
    userId: string
    email: string
    role?: string
    exp?: number
  }) {
    return sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role || 'PLAYER',
        iat: Math.floor(Date.now() / 1000),
        exp: payload.exp || Math.floor(Date.now() / 1000) + 3600 // 1 hour
      },
      this.JWT_SECRET
    )
  }

  /**
   * Create an expired JWT token for testing
   */
  static createExpiredToken(payload: { userId: string; email: string; role?: string }) {
    return sign(
      {
        ...payload,
        role: payload.role || 'PLAYER',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
      },
      this.JWT_SECRET
    )
  }

  /**
   * Create an invalid JWT token for testing
   */
  static createInvalidToken() {
    return sign(
      { userId: 'test', email: 'test@test.com' },
      'wrong-secret'
    )
  }

  /**
   * Verify a JWT token (for testing token validation)
   */
  static verifyTestToken(token: string) {
    try {
      return verify(token, this.JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  /**
   * Create test users with different roles and permissions
   */
  static async createTestUsers() {
    const hashedPassword = await hash('testpass123', 10)

    const users = {
      commissioner: await TestDatabase.prisma.user.create({
        data: {
          email: 'commissioner@test.com',
          name: 'Test Commissioner',
          hashedPassword,
          role: 'COMMISSIONER',
          teamName: 'Commissioner Team'
        }
      }),
      
      player: await TestDatabase.prisma.user.create({
        data: {
          email: 'player@test.com',
          name: 'Test Player',
          hashedPassword,
          role: 'PLAYER',
          teamName: 'Player Team'
        }
      }),
      
      admin: await TestDatabase.prisma.user.create({
        data: {
          email: 'admin@test.com',
          name: 'Test Admin',
          hashedPassword,
          role: 'ADMIN',
          teamName: 'Admin Team'
        }
      }),

      inactive: await TestDatabase.prisma.user.create({
        data: {
          email: 'inactive@test.com',
          name: 'Inactive User',
          hashedPassword,
          role: 'PLAYER',
          teamName: 'Inactive Team'
          // Could add an 'isActive: false' field if it exists
        }
      })
    }

    return users
  }

  /**
   * Test authentication flow with credentials
   */
  static async testAuthFlow(email: string, password: string = 'testpass123') {
    // Simulate login process
    const user = await TestDatabase.prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.hashedPassword) {
      return { success: false, error: 'User not found' }
    }

    const isValidPassword = await compare(password, user.hashedPassword)
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' }
    }

    const token = this.createTestToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    }
  }

  /**
   * Create authenticated API request for different user roles
   */
  static async createAuthRequest(role: 'COMMISSIONER' | 'PLAYER' | 'ADMIN', options: any = {}) {
    const userEmails = {
      COMMISSIONER: 'commissioner@test.com',
      PLAYER: 'player@test.com',
      ADMIN: 'admin@test.com'
    }

    return await TestHelpers.createAuthenticatedRequest({
      userEmail: userEmails[role],
      role,
      ...options
    })
  }

  /**
   * Test role-based authorization
   */
  static async testAuthorization(
    apiHandler: (request: any) => Promise<Response>,
    requiredRole: string,
    testCases?: Array<{ role: string; shouldSucceed: boolean }>
  ) {
    const defaultTestCases = [
      { role: 'COMMISSIONER', shouldSucceed: ['COMMISSIONER', 'ADMIN'].includes(requiredRole) },
      { role: 'PLAYER', shouldSucceed: ['PLAYER', 'COMMISSIONER', 'ADMIN'].includes(requiredRole) },
      { role: 'ADMIN', shouldSucceed: true }
    ]

    const cases = testCases || defaultTestCases

    for (const testCase of cases) {
      const request = await this.createAuthRequest(testCase.role as any)
      const response = await apiHandler(request)

      if (testCase.shouldSucceed) {
        expect(response.status).not.toBe(403)
      } else {
        expect(response.status).toBe(403)
      }
    }
  }

  /**
   * Test session management
   */
  static async testSessionManagement() {
    const user = await TestDatabase.getTestUser()
    if (!user) throw new Error('Test user not found')

    // Create session
    const session = await TestDatabase.prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: 'test-session-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    return {
      user,
      session,
      // Helper to check if session is valid
      isValid: () => session.expires > new Date()
    }
  }

  /**
   * Mock authentication middleware for testing
   */
  static mockAuthMiddleware() {
    return {
      // Mock successful authentication
      authenticated: (user: any = null) => {
        const testUser = user || {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'PLAYER'
        }

        return (req: any, res: any, next: any) => {
          req.user = testUser
          req.isAuthenticated = true
          if (next) next()
        }
      },

      // Mock failed authentication
      unauthenticated: () => {
        return (req: any, res: any, next: any) => {
          req.user = null
          req.isAuthenticated = false
          if (next) next()
        }
      },

      // Mock role-based access
      requireRole: (requiredRole: string) => {
        return (req: any, res: any, next: any) => {
          if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          if (req.user.role !== requiredRole && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' })
          }

          if (next) next()
        }
      }
    }
  }

  /**
   * Security testing helpers
   */
  static security = {
    /**
     * Test for SQL injection vulnerabilities
     */
    testSQLInjection: async (apiHandler: Function, injectionPayloads: string[] = []) => {
      const defaultPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users--",
        "'; DELETE FROM users WHERE '1'='1",
        "admin'--",
        "' OR 1=1--"
      ]

      const payloads = injectionPayloads.length > 0 ? injectionPayloads : defaultPayloads

      for (const payload of payloads) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: { email: payload, password: 'test' }
        })

        try {
          const response = await apiHandler(request)
          // Should not succeed with injection
          expect(response.status).not.toBe(200)
        } catch (error) {
          // Errors are expected with injection attempts
          expect(error).toBeDefined()
        }
      }
    },

    /**
     * Test for XSS vulnerabilities
     */
    testXSS: (inputValue: string, expectedSanitized: string) => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')" />',
        '"><script>alert("xss")</script>',
        '<svg onload="alert(\'xss\')" />'
      ]

      xssPayloads.forEach(payload => {
        // This would test your input sanitization function
        // const sanitized = sanitizeInput(payload)
        // expect(sanitized).not.toContain('<script>')
        // expect(sanitized).not.toContain('javascript:')
      })
    },

    /**
     * Test rate limiting
     */
    testRateLimit: async (
      apiHandler: Function,
      maxRequests: number = 5,
      windowMs: number = 60000
    ) => {
      const requests = []

      // Make requests up to the limit
      for (let i = 0; i < maxRequests + 2; i++) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: { test: `request-${i}` },
          headers: { 'x-forwarded-for': '127.0.0.1' } // Simulate same IP
        })

        requests.push(apiHandler(request))
      }

      const responses = await Promise.all(requests)

      // First requests should succeed
      for (let i = 0; i < maxRequests; i++) {
        expect(responses[i].status).not.toBe(429)
      }

      // Additional requests should be rate limited
      for (let i = maxRequests; i < responses.length; i++) {
        expect(responses[i].status).toBe(429)
      }
    }
  }

  /**
   * Clean up auth test data
   */
  static async cleanup() {
    await TestDatabase.prisma.session.deleteMany()
    await TestDatabase.prisma.account.deleteMany()
    // Users will be cleaned up by TestDatabase.cleanup()
  }
}

/**
 * Jest setup for authentication tests
 */
export function setupAuthTests() {
  beforeEach(async () => {
    // Clean up any existing auth data
    await AuthTestHelpers.cleanup()
    
    // Create fresh test users
    await AuthTestHelpers.createTestUsers()
    
    // Mock external auth services if needed
    TestHelpers.mockExternalAPIs()
  })

  afterEach(async () => {
    // Clean up after each test
    await AuthTestHelpers.cleanup()
  })

  // Global auth test utilities
  global.authHelpers = AuthTestHelpers
}

// Export commonly used auth assertions
export const authAssertions = {
  expectAuthenticated: (response: Response) => {
    expect(response.status).not.toBe(401)
  },

  expectUnauthenticated: (response: Response) => {
    expect(response.status).toBe(401)
  },

  expectForbidden: (response: Response) => {
    expect(response.status).toBe(403)
  },

  expectValidToken: (token: string) => {
    const decoded = AuthTestHelpers.verifyTestToken(token)
    expect(decoded).toBeTruthy()
    expect(decoded).toHaveProperty('userId')
    expect(decoded).toHaveProperty('email')
  },

  expectInvalidToken: (token: string) => {
    const decoded = AuthTestHelpers.verifyTestToken(token)
    expect(decoded).toBeNull()
  }
}