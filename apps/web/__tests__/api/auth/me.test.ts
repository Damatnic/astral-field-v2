/**
 * Auth Me API Route Tests
 * 
 * Tests for /api/auth/me endpoint
 * Demonstrates API route testing best practices
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/me/route'
import { auth } from '@/lib/auth'

// Mock auth
jest.mock('@/lib/auth')

describe('API Route: /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/auth/me', () => {
    it('should return user data when authenticated', async () => {
      // Mock authenticated session
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          role: 'user',
          teamName: 'Test Team'
        },
        expires: new Date(Date.now() + 86400000).toISOString()
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('user')
      expect(data.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        role: 'user',
        teamName: 'Test Team'
      })
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({
        user: null,
        error: 'Not authenticated'
      })
    })

    it('should return 401 when session has no user', async () => {
      ;(auth as jest.Mock).mockResolvedValue({ user: null })

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({
        user: null,
        error: 'Not authenticated'
      })
    })

    it('should return 500 on server error', async () => {
      ;(auth as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error',
        user: null
      })
    })

    it('should include all user fields', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          role: 'admin',
          teamName: 'Admin Team'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(data.user).toHaveProperty('id')
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('name')
      expect(data.user).toHaveProperty('image')
      expect(data.user).toHaveProperty('role')
      expect(data.user).toHaveProperty('teamName')
    })

    it('should handle user with minimal data', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: null,
          image: null,
          role: undefined,
          teamName: undefined
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe('user-123')
      expect(data.user.email).toBe('test@example.com')
    })

    it('should handle different user roles', async () => {
      const roles = ['user', 'admin', 'moderator', 'commissioner']

      for (const role of roles) {
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role
          }
        }

        ;(auth as jest.Mock).mockResolvedValue(mockSession)

        const request = new NextRequest('http://localhost:3000/api/auth/me')
        const response = await GET(request)
        const data = await response.json()

        expect(data.user.role).toBe(role)
      }
    })

    it('should not expose sensitive data', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          password: 'should-not-be-exposed',
          sessionToken: 'should-not-be-exposed'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(data.user).not.toHaveProperty('password')
      expect(data.user).not.toHaveProperty('sessionToken')
    })

    it('should return JSON content type', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle concurrent requests', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const requests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost:3000/api/auth/me')
      )

      const responses = await Promise.all(requests.map(req => GET(req)))

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should handle auth timeout', async () => {
      ;(auth as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle malformed session data', async () => {
      ;(auth as jest.Mock).mockResolvedValue({
        user: 'not-an-object' // Invalid user data
      })

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      
      // Should handle gracefully
      await expect(GET(request)).resolves.toBeDefined()
    })
  })

  describe('Response Format', () => {
    it('should return consistent error format', async () => {
      ;(auth as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })

    it('should return consistent success format', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('user')
      expect(data.user).toBeInstanceOf(Object)
      expect(data).not.toHaveProperty('error')
    })
  })

  describe('Security', () => {
    it('should not leak error details to client', async () => {
      ;(auth as jest.Mock).mockRejectedValue(
        new Error('Database password: secret123')
      )

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(data.error).toBe('Internal server error')
      expect(data.error).not.toContain('password')
      expect(data.error).not.toContain('secret')
    })

    it('should handle SQL injection attempts', async () => {
      const mockSession = {
        user: {
          id: "'; DROP TABLE users; --",
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      // Should return the data as-is (auth handles sanitization)
      expect(response.status).toBe(200)
      expect(data.user.id).toBe("'; DROP TABLE users; --")
    })

    it('should handle XSS attempts in user data', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: '<script>alert("xss")</script>'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      // Should return the data (client handles sanitization)
      expect(response.status).toBe(200)
      expect(data.user.name).toBe('<script>alert("xss")</script>')
    })
  })

  describe('Performance', () => {
    it('should respond quickly', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const start = Date.now()
      const request = new NextRequest('http://localhost:3000/api/auth/me')
      await GET(request)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it('should handle rapid successive requests', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const requests = Array.from({ length: 100 }, () =>
        new NextRequest('http://localhost:3000/api/auth/me')
      )

      const start = Date.now()
      await Promise.all(requests.map(req => GET(req)))
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000) // Should handle 100 requests in 5 seconds
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined session', async () => {
      ;(auth as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle empty user object', async () => {
      ;(auth as jest.Mock).mockResolvedValue({ user: {} })

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      // Should still return 200 with empty user data
      expect(response.status).toBe(200)
      expect(data.user).toEqual({
        id: undefined,
        email: undefined,
        name: undefined,
        image: undefined,
        role: undefined,
        teamName: undefined
      })
    })

    it('should handle very long user data', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'a'.repeat(10000), // Very long name
          role: 'user'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle special characters in user data', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test+special@example.com',
          name: "O'Brien-Smith (Test) [User]",
          role: 'user'
        }
      }

      ;(auth as jest.Mock).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/auth/me')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.email).toBe('test+special@example.com')
      expect(data.user.name).toBe("O'Brien-Smith (Test) [User]")
    })
  })
})
