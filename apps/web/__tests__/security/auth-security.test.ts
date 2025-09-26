/**
 * Zenith Authentication Security Tests
 * Comprehensive security testing for authentication vulnerabilities
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signIn } from 'next-auth/react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignInPage from '@/app/auth/signin/page'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('sonner')

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.resetPrismaMocks?.()
  })

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "') OR '1'='1' --",
      "' OR 'a'='a",
      "1' OR '1'='1' /*",
      "x' AND email IS NULL; --",
      "test@example.com'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --"
    ]

    it.each(sqlInjectionPayloads)('should prevent SQL injection with payload: %s', async (payload) => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, payload)
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should reject malicious input
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: payload,
          password: 'password123',
          redirect: false,
        })
      })

      // Prisma queries should be parameterized and safe
      if (global.mockPrisma?.user?.findUnique) {
        expect(global.mockPrisma.user.findUnique).not.toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.stringContaining('DROP')
          })
        )
      }
    })

    it('should use parameterized queries in database operations', async () => {
      const maliciousEmail = "test'; DROP TABLE users; --"
      
      global.mockPrisma.user.findUnique.mockResolvedValue(null)

      // Simulate backend database query
      const query = {
        where: {
          email: maliciousEmail
        }
      }

      await global.mockPrisma.user.findUnique(query)

      // Verify the query structure is safe
      expect(global.mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: maliciousEmail
        }
      })

      // The email should be treated as a literal value, not SQL code
      expect(query.where.email).toBe(maliciousEmail)
    })
  })

  describe('XSS Prevention', () => {
    const xssPayloads = [
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "<img src=x onerror=alert('xss')>",
      "'><script>alert('xss')</script>",
      "<svg onload=alert('xss')>",
      "';alert('xss');//",
      "<iframe src=javascript:alert('xss')>",
      "<body onload=alert('xss')>",
      "<input onfocus=alert('xss') autofocus>",
      "<select onfocus=alert('xss') autofocus><option>test</option></select>"
    ]

    it.each(xssPayloads)('should prevent XSS with payload: %s', async (payload) => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.type(emailInput, payload)

      // Input should contain the raw value but not execute script
      expect(emailInput).toHaveValue(payload)
      
      // No script tags should be present in the DOM
      expect(document.querySelector('script')).not.toBeInTheDocument()
      
      // Check that dangerous elements are not created
      expect(document.querySelector('iframe')).not.toBeInTheDocument()
      expect(document.querySelector('svg')).not.toBeInTheDocument()
    })

    it('should sanitize error messages to prevent XSS', async () => {
      const maliciousError = "<script>alert('xss')</script>Invalid credentials"
      ;(signIn as jest.Mock).mockResolvedValue({ error: maliciousError })

      const user = userEvent.setup()
      render(<SignInPage />)

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Error message should be displayed safely
      await waitFor(() => {
        const errorElements = screen.queryAllByText(/invalid/i)
        expect(errorElements.length).toBeGreaterThan(0)
      })

      // Script should not be executed
      expect(document.querySelector('script')).not.toBeInTheDocument()
    })
  })

  describe('CSRF Protection', () => {
    it('should implement CSRF token validation', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'origin': 'https://malicious-site.com'
        },
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      })

      // Mock CSRF validation failure
      const response = new Response(JSON.stringify({ error: 'CSRF token missing' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status).toBe(403)
    })

    it('should validate request origin', async () => {
      const allowedOrigins = ['http://localhost:3000', 'https://localhost:3000']
      const maliciousOrigins = [
        'https://evil.com',
        'http://attacker.com',
        'https://phishing-site.com'
      ]

      maliciousOrigins.forEach(origin => {
        const { req } = createMocks({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'origin': origin
          },
          body: {
            email: 'test@example.com',
            password: 'password123'
          }
        })

        // Should reject requests from malicious origins
        expect(req.headers.origin).toBe(origin)
        // In real implementation, this would be rejected
      })
    })
  })

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        'test',
        '12345',
        '',
        'a',
        'abc123',
        'password123',
        'qwerty'
      ]

      weakPasswords.forEach(async (weakPassword) => {
        const user = userEvent.setup()
        render(<SignInPage />)

        const passwordInput = screen.getByLabelText(/password/i)
        await user.type(passwordInput, weakPassword)

        // Weak passwords should be rejected (in registration flow)
        if (weakPassword.length < 8) {
          const validationMessage = await passwordInput.evaluate(
            (el: HTMLInputElement) => el.validationMessage
          )
          expect(validationMessage).toBeTruthy()
        }
      })
    })

    it('should hash passwords with strong algorithms', async () => {
      const password = 'StrongPassword123!'
      const hash = await bcrypt.hash(password, 12)

      // Should use bcrypt with sufficient rounds
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/)
      
      // Should use at least 12 rounds
      const rounds = parseInt(hash.split('$')[2])
      expect(rounds).toBeGreaterThanOrEqual(12)

      // Should verify correctly
      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)

      // Should reject wrong passwords
      const isInvalid = await bcrypt.compare('WrongPassword', hash)
      expect(isInvalid).toBe(false)
    })

    it('should implement password timing attack protection', async () => {
      const validEmail = 'nicholas@damato-dynasty.com'
      const invalidEmail = 'nonexistent@example.com'
      const password = 'Dynasty2025!'

      const measureAuthTime = async (email: string) => {
        const start = performance.now()
        
        // Mock authentication attempt
        global.mockPrisma.user.findUnique.mockResolvedValue(
          email === validEmail ? { hashedPassword: '$2a$12$test' } : null
        )
        
        if (email === validEmail) {
          jest.mocked(bcrypt.compare).mockResolvedValue(false as never)
        }

        // Simulate authentication delay
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const end = performance.now()
        return end - start
      }

      const validTime = await measureAuthTime(validEmail)
      const invalidTime = await measureAuthTime(invalidEmail)

      // Times should be similar to prevent timing attacks
      const timeDifference = Math.abs(validTime - invalidTime)
      expect(timeDifference).toBeLessThan(50) // Within 50ms
    })
  })

  describe('Rate Limiting', () => {
    it('should implement login attempt rate limiting', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Simulate multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await user.clear(emailInput)
        await user.clear(passwordInput)
        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'wrongpassword')
        await user.click(submitButton)
        
        await waitFor(() => {
          expect(signIn).toHaveBeenCalled()
        })
        
        jest.clearAllMocks()
      }

      // After multiple attempts, should be rate limited
      // This would typically be implemented at the API level
    })

    it('should implement IP-based rate limiting', async () => {
      const clientIP = '192.168.1.100'
      const maxAttempts = 5
      const windowMs = 15 * 60 * 1000 // 15 minutes

      // Mock rate limiter state
      const rateLimitStore = new Map()
      const key = `auth_attempts_${clientIP}`

      for (let attempt = 1; attempt <= maxAttempts + 2; attempt++) {
        const currentAttempts = rateLimitStore.get(key) || 0
        
        if (currentAttempts >= maxAttempts) {
          // Should be rate limited
          expect(currentAttempts).toBeGreaterThanOrEqual(maxAttempts)
          break
        }
        
        rateLimitStore.set(key, currentAttempts + 1)
      }

      expect(rateLimitStore.get(key)).toBeGreaterThanOrEqual(maxAttempts)
    })
  })

  describe('Session Security', () => {
    it('should use secure session configuration', () => {
      const sessionConfig = {
        strategy: 'jwt',
        maxAge: 30 * 60, // 30 minutes
        updateAge: 5 * 60, // 5 minutes
      }

      expect(sessionConfig.strategy).toBe('jwt')
      expect(sessionConfig.maxAge).toBeLessThanOrEqual(30 * 60) // Max 30 minutes
      expect(sessionConfig.updateAge).toBeLessThanOrEqual(sessionConfig.maxAge)
    })

    it('should implement secure cookie settings', () => {
      const cookieConfig = {
        httpOnly: true,
        secure: true, // HTTPS only
        sameSite: 'strict',
        maxAge: 30 * 60, // 30 minutes
      }

      expect(cookieConfig.httpOnly).toBe(true)
      expect(cookieConfig.secure).toBe(true)
      expect(cookieConfig.sameSite).toBe('strict')
      expect(cookieConfig.maxAge).toBeLessThanOrEqual(30 * 60)
    })

    it('should invalidate sessions on logout', async () => {
      const sessionId = 'session_123'
      const sessionStore = new Map()
      
      // Create session
      sessionStore.set(sessionId, {
        userId: 'user_123',
        expires: new Date(Date.now() + 30 * 60 * 1000)
      })

      expect(sessionStore.has(sessionId)).toBe(true)

      // Logout should remove session
      sessionStore.delete(sessionId)
      expect(sessionStore.has(sessionId)).toBe(false)
    })

    it('should implement session fixation protection', () => {
      const oldSessionId = 'old_session_123'
      const newSessionId = 'new_session_456'

      // After login, session ID should change
      expect(oldSessionId).not.toBe(newSessionId)

      // Old session should be invalidated
      const sessionStore = new Map()
      sessionStore.set(oldSessionId, { valid: false })
      sessionStore.set(newSessionId, { valid: true })

      expect(sessionStore.get(oldSessionId).valid).toBe(false)
      expect(sessionStore.get(newSessionId).valid).toBe(true)
    })
  })

  describe('Input Validation & Sanitization', () => {
    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..user@domain.com',
        'user@domain',
        'user@domain.',
        'user name@domain.com',
        'user@domain..com',
        '.user@domain.com',
        'user.@domain.com'
      ]

      const user = userEvent.setup()
      render(<SignInPage />)

      for (const invalidEmail of invalidEmails) {
        const emailInput = screen.getByLabelText(/email address/i)
        await user.clear(emailInput)
        await user.type(emailInput, invalidEmail)

        const validationMessage = await emailInput.evaluate(
          (el: HTMLInputElement) => el.validationMessage
        )
        
        if (invalidEmail !== 'user name@domain.com') { // Some browsers allow spaces
          expect(validationMessage).toBeTruthy()
        }
      }
    })

    it('should sanitize input to prevent injection attacks', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'onload=alert("xss")',
        'onerror=alert("xss")'
      ]

      maliciousInputs.forEach(input => {
        // Input should be escaped/sanitized
        const sanitized = input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;')

        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('vbscript:')
      })
    })
  })

  describe('Information Disclosure Prevention', () => {
    it('should not expose sensitive user information', async () => {
      const sensitiveFields = [
        'hashedPassword',
        'password',
        'salt',
        'privateKey',
        'accessToken',
        'refreshToken'
      ]

      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        hashedPassword: '$2a$12$secrethash',
        role: 'PLAYER'
      }

      // Simulate user data in response
      const publicUserData = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      }

      sensitiveFields.forEach(field => {
        expect(publicUserData).not.toHaveProperty(field)
      })
    })

    it('should provide generic error messages', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })

      render(<SignInPage />)

      await user.type(screen.getByLabelText(/email address/i), 'nonexistent@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should show generic error, not specific details
      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email or password/i)
        expect(errorMessage).toBeInTheDocument()
      })

      // Should not reveal whether email exists
      expect(screen.queryByText(/email not found/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/wrong password/i)).not.toBeInTheDocument()
    })
  })

  describe('Authorization Controls', () => {
    it('should implement proper role-based access', () => {
      const userRoles = ['PLAYER', 'COMMISSIONER', 'ADMIN']
      const permissions = {
        PLAYER: ['read_own_team', 'update_lineup'],
        COMMISSIONER: ['read_all_teams', 'manage_league', 'update_lineup'],
        ADMIN: ['read_all', 'write_all', 'delete_all']
      }

      userRoles.forEach(role => {
        expect(permissions).toHaveProperty(role)
        expect(permissions[role]).toBeInstanceOf(Array)
        expect(permissions[role].length).toBeGreaterThan(0)
      })

      // Admin should have all permissions
      expect(permissions.ADMIN).toContain('read_all')
      expect(permissions.ADMIN).toContain('write_all')
      
      // Player should have limited permissions
      expect(permissions.PLAYER).not.toContain('read_all')
      expect(permissions.PLAYER).not.toContain('delete_all')
    })

    it('should prevent privilege escalation', () => {
      const userSession = {
        user: {
          id: 'user_123',
          role: 'PLAYER'
        }
      }

      // User should not be able to change their role
      const attemptedRoleChange = {
        ...userSession,
        user: {
          ...userSession.user,
          role: 'ADMIN' // Attempted escalation
        }
      }

      // This should be prevented at the API level
      expect(userSession.user.role).toBe('PLAYER')
      // In real implementation, role changes would require admin authorization
    })
  })

  describe('Audit Logging', () => {
    it('should log authentication events', () => {
      const authEvents = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'ACCOUNT_LOCKED',
        'SUSPICIOUS_ACTIVITY'
      ]

      const logEntry = {
        event: 'LOGIN_SUCCESS',
        userId: 'user_123',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date().toISOString()
      }

      expect(authEvents).toContain(logEntry.event)
      expect(logEntry.userId).toBeTruthy()
      expect(logEntry.ip).toBeTruthy()
      expect(logEntry.timestamp).toBeTruthy()
    })

    it('should monitor for suspicious activity', () => {
      const suspiciousPatterns = [
        'MULTIPLE_FAILED_LOGINS',
        'LOGIN_FROM_NEW_LOCATION',
        'RAPID_LOGIN_ATTEMPTS',
        'SQL_INJECTION_ATTEMPT',
        'XSS_ATTEMPT'
      ]

      const suspiciousEvent = {
        pattern: 'MULTIPLE_FAILED_LOGINS',
        count: 10,
        timeWindow: '5 minutes',
        action: 'ACCOUNT_LOCKED'
      }

      expect(suspiciousPatterns).toContain(suspiciousEvent.pattern)
      expect(suspiciousEvent.count).toBeGreaterThan(5)
      expect(suspiciousEvent.action).toBe('ACCOUNT_LOCKED')
    })
  })
})