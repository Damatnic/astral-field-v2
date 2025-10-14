/**
 * Quick Login API Route Tests
 * 
 * Tests for /api/auth/quick-login endpoint
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/auth/quick-login/route'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

jest.mock('@/lib/database/prisma')
jest.mock('@/lib/security/rate-limit-middleware')

describe('API Route: /api/auth/quick-login', () => {
  const mockUser = {
    id: 'user-123',
    email: 'nicholas@damato-dynasty.com',
    name: 'Nicholas',
    teamName: 'Test Team',
    role: 'PLAYER'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock rate limit middleware to pass through
    ;(withRateLimit as jest.Mock).mockImplementation(() => {
      return async (req: NextRequest, handler: Function) => handler(req)
    })
  })

  describe('POST /api/auth/quick-login', () => {
    describe('Validation', () => {
      it('should require email', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({})
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('INVALID_INPUT')
      })

      it('should validate email type', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 123 })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('INVALID_INPUT')
      })

      it('should normalize email to lowercase', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'NICHOLAS@DAMATO-DYNASTY.COM' })
        })

        await POST(request)

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'nicholas@damato-dynasty.com' },
          select: expect.any(Object)
        })
      })

      it('should trim email whitespace', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: '  nicholas@damato-dynasty.com  ' })
        })

        await POST(request)

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'nicholas@damato-dynasty.com' },
          select: expect.any(Object)
        })
      })
    })

    describe('Demo Account Validation', () => {
      it('should accept valid demo account', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should reject non-demo account', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid@example.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('INVALID_ACCOUNT')
      })

      it('should accept all demo accounts', async () => {
        const demoEmails = [
          'nicholas@damato-dynasty.com',
          'nick@damato-dynasty.com',
          'jack@damato-dynasty.com',
          'larry@damato-dynasty.com',
          'renee@damato-dynasty.com',
          'jon@damato-dynasty.com',
          'david@damato-dynasty.com',
          'kaity@damato-dynasty.com',
          'cason@damato-dynasty.com',
          'brittany@damato-dynasty.com'
        ]

        for (const email of demoEmails) {
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            ...mockUser,
            email
          })

          const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
            method: 'POST',
            body: JSON.stringify({ email })
          })

          const response = await POST(request)
          expect(response.status).toBe(200)
        }
      })
    })

    describe('Database Validation', () => {
      it('should check if user exists in database', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        await POST(request)

        expect(prisma.user.findUnique).toHaveBeenCalled()
      })

      it('should return 404 if user not in database', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('USER_NOT_FOUND')
      })
    })

    describe('Response Format', () => {
      it('should return success response', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.user).toBeDefined()
        expect(data.sessionToken).toBeDefined()
        expect(data.timestamp).toBeDefined()
      })

      it('should include user information', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.user).toMatchObject({
          id: 'user-123',
          email: 'nicholas@damato-dynasty.com',
          name: 'Nicholas',
          teamName: 'Test Team',
          role: 'PLAYER'
        })
      })

      it('should generate session token', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.sessionToken).toBeDefined()
        expect(typeof data.sessionToken).toBe('string')
        expect(data.sessionToken.length).toBeGreaterThan(0)
      })

      it('should include timestamp', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.timestamp).toBeDefined()
        expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      })
    })

    describe('Security', () => {
      it('should apply rate limiting', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        await POST(request)

        expect(withRateLimit).toHaveBeenCalledWith({ ruleKey: 'auth:quick-login' })
      })

      it('should log security events', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' }),
          headers: {
            'x-forwarded-for': '1.2.3.4'
          }
        })

        await POST(request)

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Quick login attempt')
        )

        consoleSpy.mockRestore()
      })

      it('should extract client IP from headers', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' }),
          headers: {
            'x-forwarded-for': '1.2.3.4, 5.6.7.8'
          }
        })

        await POST(request)

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('1.2.3.4')
        )

        consoleSpy.mockRestore()
      })

      it('should handle missing IP gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        await POST(request)

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('unknown')
        )

        consoleSpy.mockRestore()
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('INTERNAL_ERROR')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
      })

      it('should log errors', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
        ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'nicholas@damato-dynasty.com' })
        })

        await POST(request)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Quick login error:',
          expect.any(Error)
        )

        consoleErrorSpy.mockRestore()
      })
    })

    describe('Timing Attack Prevention', () => {
      it('should delay response for invalid accounts', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/quick-login', {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid@example.com' })
        })

        const start = Date.now()
        await POST(request)
        const duration = Date.now() - start

        // Should take at least 100ms due to timing attack prevention
        expect(duration).toBeGreaterThanOrEqual(90) // Allow some margin
      })
    })
  })

  describe('GET /api/auth/quick-login', () => {
    it('should reject GET requests', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('METHOD_NOT_ALLOWED')
    })

    it('should provide error message', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.message).toBe('Only POST requests allowed')
    })
  })
})
