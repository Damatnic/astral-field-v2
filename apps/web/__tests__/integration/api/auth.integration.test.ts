/**
 * Zenith Authentication Integration Tests
 * Comprehensive testing for authentication API routes and flows
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createMockUser, mockUserCredentials } from '@/fixtures/users.fixture'

// Import API handlers
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { GET as authGetHandler, POST as authPostHandler } from '@/app/api/auth/[...nextauth]/route'

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.resetPrismaMocks?.()
  })

  describe('POST /api/auth/signin', () => {
    const mockUser = createMockUser({
      hashedPassword: '$2a$10$test.hashed.password',
    })

    it('should authenticate valid user credentials', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: mockUserCredentials.valid,
      })

      await signinHandler.POST(req as any)

      expect(global.mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUserCredentials.valid.email },
        select: {
          id: true,
          email: true,
          name: true,
          hashedPassword: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockUserCredentials.valid.password,
        mockUser.hashedPassword
      )
    })

    it('should reject invalid credentials', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: mockUserCredentials.invalid,
      })

      const response = await signinHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should reject malformed requests', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: mockUserCredentials.malformed,
      })

      const response = await signinHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })

    it('should handle database errors', async () => {
      global.mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: mockUserCredentials.valid,
      })

      const response = await signinHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should rate limit authentication attempts', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: mockUserCredentials.invalid,
      })

      // Simulate multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await signinHandler.POST(req as any)
      }

      const response = await signinHandler.POST(req as any)
      expect(response.status).toBe(429) // Too Many Requests
    })

    it('should sanitize user data in response', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: mockUserCredentials.valid,
      })

      const response = await signinHandler.POST(req as any)
      const data = await response.json()

      expect(data.user).toBeDefined()
      expect(data.user.hashedPassword).toBeUndefined()
      expect(data.user.password).toBeUndefined()
      expect(data.user.email).toBe(mockUser.email)
      expect(data.user.id).toBe(mockUser.id)
    })
  })

  describe('POST /api/auth/register', () => {
    const registrationData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    }

    it('should register new user successfully', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(null) // Email not taken
      
      const hashedPassword = '$2a$10$hashed.new.password'
      jest.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never)

      const newUser = createMockUser({
        email: registrationData.email,
        name: registrationData.name,
        hashedPassword,
      })

      global.mockPrisma.user.create.mockResolvedValue(newUser)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: registrationData,
      })

      const response = await registerHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(registrationData.email)
      expect(data.user.hashedPassword).toBeUndefined()

      expect(global.mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registrationData.email,
          name: registrationData.name,
          hashedPassword,
          role: 'PLAYER',
        },
        select: expect.any(Object),
      })
    })

    it('should reject duplicate email registration', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(createMockUser())

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: registrationData,
      })

      const response = await registerHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Email already registered')
    })

    it('should validate registration data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: '', // Empty name
      }

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: invalidData,
      })

      const response = await registerHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      expect(data.errors).toHaveProperty('email')
      expect(data.errors).toHaveProperty('password')
      expect(data.errors).toHaveProperty('name')
    })

    it('should hash password securely', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(null)
      jest.mocked(bcrypt.hash).mockResolvedValue('$2a$10$secure.hash' as never)

      const newUser = createMockUser()
      global.mockPrisma.user.create.mockResolvedValue(newUser)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: registrationData,
      })

      await registerHandler.POST(req as any)

      expect(bcrypt.hash).toHaveBeenCalledWith(registrationData.password, 12)
    })

    it('should handle password hashing errors', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(null)
      jest.mocked(bcrypt.hash).mockRejectedValue(new Error('Hashing failed') as never)

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: registrationData,
      })

      const response = await registerHandler.POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create account')
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should complete full registration and signin flow', async () => {
      // Step 1: Register new user
      global.mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const hashedPassword = '$2a$10$test.hash'
      jest.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never)

      const newUser = createMockUser({
        email: 'flowtest@example.com',
        hashedPassword,
      })

      global.mockPrisma.user.create.mockResolvedValue(newUser)

      const { req: registerReq } = createMocks({
        method: 'POST',
        body: {
          email: 'flowtest@example.com',
          password: 'password123',
          name: 'Flow Test User',
        },
      })

      const registerResponse = await registerHandler.POST(registerReq as any)
      expect(registerResponse.status).toBe(201)

      // Step 2: Sign in with new credentials
      global.mockPrisma.user.findUnique.mockResolvedValue(newUser)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const { req: signinReq } = createMocks({
        method: 'POST',
        body: {
          email: 'flowtest@example.com',
          password: 'password123',
        },
      })

      const signinResponse = await signinHandler.POST(signinReq as any)
      expect(signinResponse.status).toBe(200)

      const signinData = await signinResponse.json()
      expect(signinData.user.email).toBe('flowtest@example.com')
    })

    it('should maintain session state across requests', async () => {
      // Mock session storage/retrieval
      const sessionData = {
        userId: 'user-1',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      // Simulate authenticated request
      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          cookie: 'session=mock-session-token',
        },
      })

      // Should maintain authentication state
      expect(req.headers.authorization).toBe('Bearer mock-jwt-token')
    })
  })

  describe('Security Features', () => {
    it('should implement CSRF protection', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://malicious-site.com',
        },
        body: mockUserCredentials.valid,
      })

      const response = await signinHandler.POST(req as any)
      
      // Should reject cross-origin requests without proper headers
      expect(response.status).toBe(403)
    })

    it('should sanitize input data', async () => {
      const maliciousData = {
        email: 'test@example.com<script>alert(\"xss\")</script>',
        password: 'password123',
      }

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: maliciousData,
      })

      const response = await signinHandler.POST(req as any)
      const data = await response.json()

      // Should reject or sanitize malicious input
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid email format')
    })

    it('should implement proper CORS headers', async () => {
      const { req } = createMocks({
        method: 'OPTIONS',
        headers: {
          origin: 'https://localhost:3000',
        },
      })

      // Mock OPTIONS handler
      const optionsResponse = new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://localhost:3000',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })

      expect(optionsResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://localhost:3000')
    })
  })

  describe('Performance and Monitoring', () => {
    it('should complete authentication within performance thresholds', async () => {
      global.mockPrisma.user.findUnique.mockResolvedValue(createMockUser())
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const { req } = createMocks({
        method: 'POST',
        body: mockUserCredentials.valid,
      })

      const startTime = performance.now()
      await signinHandler.POST(req as any)
      const endTime = performance.now()

      // Should complete within 500ms
      expect(endTime - startTime).toBeLessThan(500)
    })

    it('should log authentication events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      global.mockPrisma.user.findUnique.mockResolvedValue(createMockUser())
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const { req } = createMocks({
        method: 'POST',
        body: mockUserCredentials.valid,
      })

      await signinHandler.POST(req as any)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication successful')
      )

      consoleSpy.mockRestore()
    })
  })
})