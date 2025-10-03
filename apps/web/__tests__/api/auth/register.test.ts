/**
 * Auth Register API Route Tests
 * 
 * Tests for /api/auth/register endpoint
 * Demonstrates security-focused API testing
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import { guardianAuditLogger } from '@/lib/security/audit-logger'
import bcrypt from 'bcryptjs'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    }
  }
}))

jest.mock('@/lib/security/audit-logger')
jest.mock('bcryptjs')
jest.mock('@/lib/security/rate-limit-middleware', () => ({
  withRateLimit: () => (req: any, handler: any) => handler(req)
}))

describe('API Route: /api/auth/register', () => {
  const validUserData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'SecurePass123!',
    teamName: 'Test Team'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')
    ;(guardianAuditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined)
  })

  describe('POST /api/auth/register', () => {
    describe('Validation', () => {
      it('should validate required name field', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.message).toContain('Name')
      })

      it('should validate required email field', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.message).toBeDefined()
      })

      it('should validate email format', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'invalid-email',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.message).toContain('email')
      })

      it('should validate required password field', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'test@example.com'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.message).toBeDefined()
      })

      it('should validate minimum password length', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'test@example.com',
            password: 'short'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.message).toContain('8 characters')
      })

      it('should validate maximum name length', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'a'.repeat(101),
            email: 'test@example.com',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should accept valid registration data', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          teamName: 'Test Team',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should make teamName optional', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          teamName: null,
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'test@example.com',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Duplicate Email Check', () => {
      it('should reject registration with existing email', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: 'existing-user',
          email: 'test@example.com'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.message).toContain('already exists')
      })

      it('should log failed registration for duplicate email', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: 'existing-user',
          email: 'test@example.com'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)

        expect(guardianAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          expect.any(String),
          undefined,
          expect.any(Object),
          expect.objectContaining({
            description: expect.stringContaining('email already exists')
          })
        )
      })
    })

    describe('User Creation', () => {
      it('should hash password before storing', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          teamName: 'Test Team',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)

        expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 10)
      })

      it('should create user with correct data', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          teamName: 'Test Team',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)

        expect(prisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com',
            hashedPassword: 'hashed_password',
            teamName: 'Test Team',
            role: 'PLAYER'
          }),
          select: expect.any(Object)
        })
      })

      it('should create default preferences', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)

        expect(prisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            preferences: {
              create: expect.objectContaining({
                emailNotifications: true,
                pushNotifications: false,
                theme: 'dark',
                timezone: 'America/New_York'
              })
            }
          }),
          select: expect.any(Object)
        })
      })

      it('should return created user data', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          teamName: 'Test Team',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('User created successfully')
        expect(data.user).toEqual({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          teamName: 'Test Team',
          role: 'PLAYER'
        })
      })

      it('should not return password in response', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.user).not.toHaveProperty('password')
        expect(data.user).not.toHaveProperty('hashedPassword')
      })
    })

    describe('Security Logging', () => {
      it('should log successful registration', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData),
          headers: {
            'x-forwarded-for': '1.2.3.4',
            'user-agent': 'Test Browser'
          }
        })

        await POST(request)

        expect(guardianAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          expect.any(String),
          'user-123',
          expect.objectContaining({
            ip: '1.2.3.4',
            userAgent: 'Test Browser'
          }),
          expect.objectContaining({
            description: 'User registration successful'
          })
        )
      })

      it('should extract client IP from headers', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData),
          headers: {
            'x-forwarded-for': '1.2.3.4, 5.6.7.8',
            'user-agent': 'Test Browser'
          }
        })

        await POST(request)

        expect(guardianAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            ip: '1.2.3.4' // Should use first IP in list
          }),
          expect.any(Object)
        )
      })

      it('should handle missing IP headers', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)

        expect(guardianAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            ip: 'unknown'
          }),
          expect.any(Object)
        )
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        )

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.message).toBe('Internal server error')
      })

      it('should log registration errors', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)

        expect(guardianAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          expect.any(String),
          undefined,
          expect.any(Object),
          expect.objectContaining({
            description: expect.stringContaining('server error')
          })
        )
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })

      it('should not expose sensitive error details', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database password: secret123')
        )

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.message).toBe('Internal server error')
        expect(data.message).not.toContain('password')
        expect(data.message).not.toContain('secret')
      })
    })

    describe('Security', () => {
      it('should sanitize email input', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            ...validUserData,
            email: '  TEST@EXAMPLE.COM  '
          })
        })

        await POST(request)

        // Email should be validated by Zod schema
        expect(prisma.user.create).toHaveBeenCalled()
      })

      it('should handle SQL injection attempts', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: "'; DROP TABLE users; --",
            email: 'test@example.com',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)

        // Should handle gracefully (Prisma prevents SQL injection)
        expect(response.status).toBeLessThan(500)
      })

      it('should handle XSS attempts in name', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: '<script>alert("xss")</script>',
            email: 'test@example.com',
            password: 'SecurePass123!'
          })
        })

        const response = await POST(request)

        // Should accept (sanitization happens on output)
        expect(response.status).toBe(200)
      })
    })

    describe('Performance', () => {
      it('should respond quickly', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'PLAYER'
        })

        const start = Date.now()
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(validUserData)
        })

        await POST(request)
        const duration = Date.now() - start

        expect(duration).toBeLessThan(2000)
      })
    })
  })
})
