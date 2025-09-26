/**
 * Guardian Enhanced Authentication Routes
 * Enterprise-grade authentication with bulletproof security
 */

import { Router } from 'express'
import { z } from 'zod'
import { validateRequest } from '../middleware/validation'
import { createValidationMiddleware } from '../middleware/security-validation'
import { securityMonitoringMiddleware } from '../middleware/security-monitor'
import GuardianAuthSecurity, { authRateLimit } from '../middleware/auth-security'
import { prisma, redis, logger } from '../server'
import crypto from 'crypto'

const router = Router()
const authSecurity = new GuardianAuthSecurity()

// Apply security middleware to all auth routes
router.use(securityMonitoringMiddleware())
router.use(createValidationMiddleware())

// Enhanced schemas with security validation
const secureEmailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long')
  .transform(email => email.toLowerCase().trim())
  .refine(email => {
    const validation = authSecurity.validateEmail(email)
    if (!validation.isValid) {
      throw new Error(`Email validation failed: ${validation.errors.join(', ')}`)
    }
    return true
  })

const securePasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine(password => {
    const validation = authSecurity.validatePassword(password)
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`)
    }
    return true
  })

const enhancedCreateUserSchema = z.object({
  email: secureEmailSchema,
  password: securePasswordSchema,
  firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name'),
  lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters in username'),
  avatar: z.string().url().optional()
})

const enhancedLoginSchema = z.object({
  email: secureEmailSchema,
  password: z.string().min(1, 'Password required')
})

const enhancedChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: securePasswordSchema,
  confirmPassword: z.string().min(1)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

/**
 * Guardian Security: Enhanced user registration with comprehensive security
 */
router.post('/register', 
  authRateLimit,
  validateRequest(enhancedCreateUserSchema), 
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, username, avatar } = req.validated
      const clientIP = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
      const userAgent = req.headers['user-agent'] || 'unknown'

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })

      if (existingUser) {
        // Log potential account enumeration attempt
        await req.securityMonitor?.logSecurityEvent({
          type: 'ACCOUNT_ENUMERATION' as any,
          severity: 'MEDIUM' as any,
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method,
          details: { 
            attemptedEmail: email, 
            existingField: existingUser.email === email ? 'email' : 'username' 
          },
          blocked: false
        })

        return res.status(409).json({
          error: 'User already exists',
          field: existingUser.email === email ? 'email' : 'username',
          timestamp: new Date().toISOString()
        })
      }

      // Hash password with enhanced security
      const hashedPassword = await authSecurity.hashPassword(password)

      // Create user with security metadata
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          username,
          avatar,
          role: 'USER',
          isActive: true,
          emailVerified: false,
          loginAttempts: 0,
          // Security fields
          registrationIP: clientIP,
          registrationUserAgent: userAgent,
          passwordChangedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
          role: true,
          createdAt: true
        }
      })

      // Create secure session
      const sessionId = await authSecurity.createSecureSession(user.id, clientIP, userAgent)
      
      // Generate secure token
      const token = authSecurity.generateSecureToken(user.id, user.email, user.role, sessionId)

      // Log successful registration
      logger.info('Guardian: User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
        ip: clientIP,
        userAgent
      })

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token,
        expiresIn: 30 * 60 * 1000, // 30 minutes
        security: {
          sessionId,
          tokenType: 'Bearer',
          requiresEmailVerification: true
        }
      })

    } catch (error) {
      logger.error('Guardian: Registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      res.status(500).json({
        error: 'Registration failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      })
    }
  }
)

/**
 * Guardian Security: Enhanced user login with comprehensive protection
 */
router.post('/login', 
  authRateLimit,
  validateRequest(enhancedLoginSchema), 
  async (req, res) => {
    try {
      const { email, password } = req.validated
      const clientIP = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
      const userAgent = req.headers['user-agent'] || 'unknown'

      // Check account lockout status
      const lockoutStatus = await authSecurity.checkAccountLockout(email)
      if (lockoutStatus.isLocked) {
        await req.securityMonitor?.logSecurityEvent({
          type: 'BRUTE_FORCE_ATTEMPT' as any,
          severity: 'HIGH' as any,
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method,
          details: { 
            email, 
            attempts: lockoutStatus.attempts,
            lockedUntil: lockoutStatus.lockedUntil 
          },
          blocked: true
        })

        return res.status(423).json({
          error: 'Account temporarily locked',
          message: 'Too many failed login attempts',
          lockedUntil: lockoutStatus.lockedUntil,
          retryAfter: Math.ceil((lockoutStatus.lockedUntil!.getTime() - Date.now()) / 1000),
          timestamp: new Date().toISOString()
        })
      }

      // Find user with security fields
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
          role: true,
          isActive: true,
          emailVerified: true,
          loginAttempts: true,
          lockedUntil: true,
          lastLoginAt: true
        }
      })

      if (!user) {
        // Record failed attempt with timing attack protection
        await authSecurity.recordFailedAttempt(email, clientIP, userAgent)
        
        // Consistent timing to prevent user enumeration
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50))
        
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          timestamp: new Date().toISOString()
        })
      }

      // Check if account is active
      if (!user.isActive) {
        await req.securityMonitor?.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY' as any,
          severity: 'MEDIUM' as any,
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method,
          userId: user.id,
          details: { reason: 'Inactive account login attempt' },
          blocked: true
        })

        return res.status(403).json({
          error: 'Account deactivated',
          message: 'Please contact support',
          timestamp: new Date().toISOString()
        })
      }

      // Verify password with enhanced security
      const isValidPassword = await authSecurity.verifyPassword(password, user.password)

      if (!isValidPassword) {
        await authSecurity.recordFailedAttempt(email, clientIP, userAgent)
        
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          timestamp: new Date().toISOString()
        })
      }

      // Reset login attempts on successful login
      await authSecurity.resetLoginAttempts(user.id)

      // Create secure session
      const sessionId = await authSecurity.createSecureSession(user.id, clientIP, userAgent)
      
      // Generate secure token
      const token = authSecurity.generateSecureToken(user.id, user.email, user.role, sessionId)

      // Prepare user response (exclude sensitive data)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt
      }

      // Log successful login
      logger.info('Guardian: User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: clientIP,
        userAgent,
        sessionId
      })

      res.json({
        message: 'Login successful',
        user: userResponse,
        token,
        expiresIn: 30 * 60 * 1000, // 30 minutes
        security: {
          sessionId,
          tokenType: 'Bearer',
          requiresEmailVerification: !user.emailVerified,
          lastLoginAt: user.lastLoginAt
        }
      })

    } catch (error) {
      logger.error('Guardian: Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      res.status(500).json({
        error: 'Login failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      })
    }
  }
)

/**
 * Guardian Security: Enhanced logout with session cleanup
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const clientIP = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ 
        message: 'Logged out',
        timestamp: new Date().toISOString()
      })
    }

    const token = authHeader.substring(7)
    
    try {
      const payload = await authSecurity.verifyToken(token)
      
      // Invalidate session
      await authSecurity.invalidateSession(payload.userId, payload.sessionId)
      
      // Blacklist token
      await redis.setex(`blacklist:${token}`, 30 * 60, 'true') // 30 minutes
      
      logger.info('Guardian: User logged out successfully', {
        userId: payload.userId,
        sessionId: payload.sessionId,
        ip: clientIP
      })
    } catch (error) {
      // Token might be invalid, but still proceed with logout
      logger.warn('Guardian: Logout with invalid token', {
        ip: clientIP,
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    res.json({ 
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Guardian: Logout error', error)
    res.json({ 
      message: 'Logged out',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Guardian Security: Enhanced password change with verification
 */
router.post('/change-password', 
  authRateLimit,
  validateRequest(enhancedChangePasswordSchema), 
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.validated
      const clientIP = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
      const userAgent = req.headers['user-agent'] || 'unknown'
      
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Missing authorization header',
          timestamp: new Date().toISOString()
        })
      }

      const token = authHeader.substring(7)
      const payload = await authSecurity.verifyToken(token)

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          password: true
        }
      })

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          timestamp: new Date().toISOString()
        })
      }

      // Verify current password
      const isValidPassword = await authSecurity.verifyPassword(currentPassword, user.password)
      if (!isValidPassword) {
        await req.securityMonitor?.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY' as any,
          severity: 'MEDIUM' as any,
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method,
          userId: user.id,
          details: { reason: 'Invalid current password for password change' },
          blocked: false
        })

        return res.status(400).json({
          error: 'Current password is incorrect',
          timestamp: new Date().toISOString()
        })
      }

      // Hash new password
      const hashedNewPassword = await authSecurity.hashPassword(newPassword)

      // Update password and security metadata
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedNewPassword,
          passwordChangedAt: new Date(),
          loginAttempts: 0, // Reset any failed attempts
          lockedUntil: null
        }
      })

      // Invalidate all existing sessions except current one
      await authSecurity.invalidateSession(user.id)
      
      // Blacklist all existing tokens
      const sessions = await redis.keys(`session:${user.id}:*`)
      const blacklistPromises = sessions
        .filter(session => !session.includes(payload.sessionId))
        .map(session => {
          const sessionId = session.split(':')[2]
          return redis.setex(`blacklist_session:${sessionId}`, 30 * 60, 'true')
        })
      
      await Promise.all(blacklistPromises)

      logger.info('Guardian: Password changed successfully', {
        userId: user.id,
        email: user.email,
        ip: clientIP,
        userAgent
      })

      res.json({
        message: 'Password changed successfully',
        security: {
          allOtherSessionsInvalidated: true,
          requiresReauthentication: false
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Guardian: Password change failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      res.status(500).json({
        error: 'Password change failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      })
    }
  }
)

/**
 * Guardian Security: Enhanced token verification with comprehensive checks
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const clientIP = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        timestamp: new Date().toISOString()
      })
    }

    const token = authHeader.substring(7)
    const payload = await authSecurity.verifyToken(token)

    // Get current user data with security info
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        passwordChangedAt: true
      }
    })

    if (!user || !user.isActive) {
      await req.securityMonitor?.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY' as any,
        severity: 'MEDIUM' as any,
        ip: clientIP,
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        userId: payload.userId,
        details: { reason: 'Token verification for inactive/non-existent user' },
        blocked: true
      })

      return res.status(401).json({
        error: 'User not found or inactive',
        timestamp: new Date().toISOString()
      })
    }

    // Check if password was changed after token was issued
    const tokenIssuedAt = new Date(payload.iat * 1000)
    if (user.passwordChangedAt && user.passwordChangedAt > tokenIssuedAt) {
      return res.status(401).json({
        error: 'Token expired due to password change',
        message: 'Please login again',
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      valid: true,
      user,
      token: {
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
        sessionId: payload.sessionId
      },
      security: {
        ipAddress: clientIP,
        requiresEmailVerification: !user.emailVerified
      }
    })

  } catch (error) {
    logger.error('Guardian: Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip
    })
    
    res.status(401).json({
      error: 'Token verification failed',
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Guardian Security: Security status endpoint
 */
router.get('/security-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      })
    }

    const token = authHeader.substring(7)
    const payload = await authSecurity.verifyToken(token)

    // Get user's active sessions
    const sessionKeys = await redis.keys(`session:${payload.userId}:*`)
    const sessions = []
    
    for (const key of sessionKeys) {
      const sessionData = await redis.get(key)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        sessions.push({
          sessionId: session.sessionId,
          ip: session.ip,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          isCurrent: session.sessionId === payload.sessionId
        })
      }
    }

    res.json({
      security: {
        activeSessions: sessions,
        totalSessions: sessions.length,
        maxAllowedSessions: 3,
        currentSessionId: payload.sessionId
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    res.status(401).json({
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    })
  }
})

export { router as enhancedAuthRoutes }
export default router
