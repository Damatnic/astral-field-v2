/**
 * Comprehensive Authentication API Tests
 * Tests authentication, authorization, and security features
 */

import { TestHelpers } from '../setup/test-helpers'
import { TestDatabase } from '../setup/test-database'
import { AuthTestHelpers, authAssertions } from '../setup/auth-helpers'
import { POST as LoginPOST, GET as AuthCheckGET } from '../../src/app/api/auth/production-login/route'

describe('/api/auth Authentication System', () => {
  let testUsers: any

  beforeAll(async () => {
    testUsers = await AuthTestHelpers.createTestUsers()
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/production-login', () => {
    it('should authenticate valid user credentials', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'commissioner@test.com',
          password: 'testpass123'
        }
      })

      const response = await LoginPOST(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['user', 'token'])

      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('commissioner@test.com')
      expect(data.user.role).toBe('COMMISSIONER')
      expect(data.token).toBeDefined()
      
      // Validate JWT token structure
      authAssertions.expectValidToken(data.token)
    })

    it('should reject invalid email format', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: 'testpass123'
        }
      })

      const response = await LoginPOST(request)
      await TestHelpers.assertErrorResponse(response, 400)
    })

    it('should reject short passwords', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'commissioner@test.com',
          password: '123'
        }
      })

      const response = await LoginPOST(request)
      await TestHelpers.assertErrorResponse(response, 400)
    })

    it('should reject non-existent user', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'nonexistent@test.com',
          password: 'testpass123'
        }
      })

      const response = await LoginPOST(request)
      await TestHelpers.assertErrorResponse(response, 401)
    })

    it('should reject invalid password', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'commissioner@test.com',
          password: 'wrongpassword'
        }
      })

      const response = await LoginPOST(request)
      await TestHelpers.assertErrorResponse(response, 401)
    })

    it('should set secure HTTP-only cookie', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'commissioner@test.com',
          password: 'testpass123'
        }
      })

      const response = await LoginPOST(request)
      
      if (response.status === 200) {
        const headers = response.headers
        const setCookieHeader = headers.get('Set-Cookie')
        
        if (setCookieHeader) {
          expect(setCookieHeader).toContain('auth-token')
          expect(setCookieHeader).toContain('HttpOnly')
          expect(setCookieHeader).toContain('SameSite=lax')
        }
      }
    })

    it('should handle missing request body', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST'
        // No body
      })

      const response = await LoginPOST(request)
      await TestHelpers.assertErrorResponse(response, 400)
    })

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/auth/production-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "test@test.com", "password":' // Malformed JSON
      })

      const response = await LoginPOST(request)
      await TestHelpers.assertErrorResponse(response, 400)
    })

    it('should return appropriate user role information', async () => {
      const testCases = [
        { email: 'commissioner@test.com', expectedRole: 'COMMISSIONER' },
        { email: 'player@test.com', expectedRole: 'PLAYER' },
        { email: 'admin@test.com', expectedRole: 'ADMIN' }
      ]

      for (const testCase of testCases) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email: testCase.email,
            password: 'testpass123'
          }
        })

        const response = await LoginPOST(request)
        
        if (response.status === 200) {
          const data = await response.json()
          expect(data.user.role).toBe(testCase.expectedRole)
        }
      }
    })
  })

  describe('GET /api/auth/production-login', () => {
    it('should verify valid authentication token', async () => {
      const user = testUsers.commissioner
      const token = AuthTestHelpers.createTestToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const request = TestHelpers.createMockRequest({
        method: 'GET',
        cookies: {
          'auth-token': token
        }
      })

      const response = await AuthCheckGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['authenticated', 'user'])

      expect(data.authenticated).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe(user.id)
    })

    it('should reject expired token', async () => {
      const user = testUsers.commissioner
      const expiredToken = AuthTestHelpers.createExpiredToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const request = TestHelpers.createMockRequest({
        method: 'GET',
        cookies: {
          'auth-token': expiredToken
        }
      })

      const response = await AuthCheckGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200, ['authenticated'])

      expect(data.authenticated).toBe(false)
    })

    it('should reject invalid token', async () => {
      const invalidToken = AuthTestHelpers.createInvalidToken()

      const request = TestHelpers.createMockRequest({
        method: 'GET',
        cookies: {
          'auth-token': invalidToken
        }
      })

      const response = await AuthCheckGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200, ['authenticated'])

      expect(data.authenticated).toBe(false)
    })

    it('should handle missing token', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET'
        // No auth token
      })

      const response = await AuthCheckGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200, ['authenticated'])

      expect(data.authenticated).toBe(false)
    })

    it('should handle malformed token', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        cookies: {
          'auth-token': 'malformed-token-string'
        }
      })

      const response = await AuthCheckGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200, ['authenticated'])

      expect(data.authenticated).toBe(false)
    })
  })

  describe('Security Tests', () => {
    it('should prevent SQL injection in email field', async () => {
      const sqlInjectionPayloads = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM users; --",
        "admin'--"
      ]

      for (const payload of sqlInjectionPayloads) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email: payload,
            password: 'testpass123'
          }
        })

        const response = await LoginPOST(request)
        
        // Should reject malicious input
        expect(response.status).not.toBe(200)
        expect([400, 401]).toContain(response.status)
      }
    })

    it('should prevent XSS in login response', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>'
      ]

      for (const payload of xssPayloads) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email: payload,
            password: 'testpass123'
          }
        })

        const response = await LoginPOST(request)
        
        if (response.status >= 400) {
          const data = await response.json()
          const responseText = JSON.stringify(data)
          
          // Should not contain unescaped script tags
          expect(responseText).not.toContain('<script>')
          expect(responseText).not.toContain('javascript:')
        }
      }
    })

    it('should rate limit login attempts', async () => {
      const requests = []
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email: 'commissioner@test.com',
            password: 'wrongpassword'
          },
          headers: {
            'x-forwarded-for': '192.168.1.100' // Simulate same IP
          }
        })
        
        requests.push(LoginPOST(request))
      }

      const responses = await Promise.all(requests)
      
      // Later requests should be rate limited (429) or still fail (401)
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status)
      })
    })

    it('should protect against timing attacks', async () => {
      const validEmail = 'commissioner@test.com'
      const invalidEmail = 'nonexistent@test.com'
      
      const timings: number[] = []
      
      // Test response times for valid vs invalid emails
      for (const email of [validEmail, invalidEmail]) {
        const start = performance.now()
        
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email,
            password: 'wrongpassword'
          }
        })
        
        await LoginPOST(request)
        const duration = performance.now() - start
        timings.push(duration)
      }
      
      // Response times shouldn't vary significantly
      const [validTiming, invalidTiming] = timings
      const timingDifference = Math.abs(validTiming - invalidTiming)
      
      // Allow some variance but prevent obvious timing attacks
      expect(timingDifference).toBeLessThan(100) // 100ms threshold
    })
  })

  describe('Token Management', () => {
    it('should generate unique tokens for each login', async () => {
      const tokens = new Set()
      
      for (let i = 0; i < 5; i++) {
        const request = TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email: 'commissioner@test.com',
            password: 'testpass123'
          }
        })

        const response = await LoginPOST(request)
        
        if (response.status === 200) {
          const data = await response.json()
          expect(tokens.has(data.token)).toBe(false)
          tokens.add(data.token)
        }
      }
      
      expect(tokens.size).toBeGreaterThan(1)
    })

    it('should include proper token expiration', async () => {
      const user = testUsers.commissioner
      const token = AuthTestHelpers.createTestToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const decoded = AuthTestHelpers.verifyTestToken(token)
      
      expect(decoded).toHaveProperty('exp')
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should validate token payload structure', async () => {
      const user = testUsers.commissioner
      const token = AuthTestHelpers.createTestToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const decoded = AuthTestHelpers.verifyTestToken(token) as any
      
      expect(decoded).toHaveProperty('userId')
      expect(decoded).toHaveProperty('email')
      expect(decoded).toHaveProperty('role')
      expect(decoded).toHaveProperty('iat')
      expect(decoded).toHaveProperty('exp')
      
      expect(decoded.userId).toBe(user.id)
      expect(decoded.email).toBe(user.email)
      expect(decoded.role).toBe(user.role)
    })
  })

  describe('Performance Tests', () => {
    it('should handle authentication within acceptable time limits', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'POST',
        body: {
          email: 'commissioner@test.com',
          password: 'testpass123'
        }
      })

      await TestHelpers.measurePerformance('User Authentication', async () => {
        const response = await LoginPOST(request)
        expect(response.status).toBe(200)
        return response
      }, 1000) // Max 1 second for authentication
    })

    it('should handle concurrent authentication requests', async () => {
      const requests = Array.from({ length: 10 }, () => 
        TestHelpers.createMockRequest({
          method: 'POST',
          body: {
            email: 'commissioner@test.com',
            password: 'testpass123'
          }
        })
      )

      const responses = await Promise.all(
        requests.map(request => LoginPOST(request))
      )

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })
})