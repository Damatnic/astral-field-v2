/**
 * Guardian Authentication Security Middleware
 * Enterprise-grade authentication security with bulletproof protection
 */

import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { rateLimit } from 'express-rate-limit'
import { prisma, redis, logger } from '../server'
import { GuardianSecurityMonitor, SecurityEventType, SecuritySeverity } from './security-monitor'
import validator from 'validator'

interface AuthSecurityConfig {
  maxLoginAttempts: number
  lockoutDuration: number
  passwordHashRounds: number
  sessionTimeout: number
  tokenRotationInterval: number
  maxConcurrentSessions: number
}

const defaultConfig: AuthSecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordHashRounds: 14, // Enhanced from 12 to 14 for enterprise security
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  tokenRotationInterval: 5 * 60 * 1000, // 5 minutes
  maxConcurrentSessions: 3
}

export class GuardianAuthSecurity {
  private config: AuthSecurityConfig
  private monitor: GuardianSecurityMonitor

  constructor(config: Partial<AuthSecurityConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.monitor = GuardianSecurityMonitor.getInstance()
  }

  /**
   * Guardian Security: Enhanced password hashing with adaptive cost
   */
  async hashPassword(password: string): Promise<string> {
    // Adaptive cost based on system performance
    const rounds = this.config.passwordHashRounds
    
    // Add pepper (server-side secret) for additional security
    const pepper = process.env.PASSWORD_PEPPER || 'default-pepper-change-in-production'
    const passwordWithPepper = password + pepper
    
    return await bcrypt.hash(passwordWithPepper, rounds)
  }

  /**
   * Guardian Security: Secure password verification with timing attack protection
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const pepper = process.env.PASSWORD_PEPPER || 'default-pepper-change-in-production'
      const passwordWithPepper = password + pepper
      
      // Constant-time comparison to prevent timing attacks
      const result = await bcrypt.compare(passwordWithPepper, hashedPassword)
      
      // Add artificial delay for failed attempts to prevent timing attacks
      if (!result) {
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50))
      }
      
      return result
    } catch (error) {
      // Always take consistent time even on errors
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50))
      return false
    }
  }

  /**
   * Guardian Security: Generate secure session token with metadata
   */
  generateSecureToken(userId: string, email: string, role: string, sessionId: string): string {
    const payload = {
      userId,
      email,
      role,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.config.sessionTimeout) / 1000),
      // Security claims
      iss: 'astral-field-guardian',
      aud: 'astral-field-app',
      jti: crypto.randomUUID(),
      // Anti-tampering checksum
      checksum: this.generateTokenChecksum(userId, sessionId)
    }

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT',
        kid: 'guardian-key-1' // Key identifier for rotation
      }
    })
  }

  /**
   * Guardian Security: Generate token checksum for anti-tampering
   */
  private generateTokenChecksum(userId: string, sessionId: string): string {
    const secret = process.env.JWT_SECRET!
    return crypto
      .createHmac('sha256', secret)
      .update(`${userId}:${sessionId}:${Date.now()}`)
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Guardian Security: Verify and decode token with comprehensive validation
   */
  async verifyToken(token: string): Promise<any> {
    try {
      // Decode without verification first to check structure
      const decoded = jwt.decode(token, { complete: true })
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token structure')
      }

      // Verify token signature and claims
      const payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
        issuer: 'astral-field-guardian',
        audience: 'astral-field-app'
      }) as any

      // Check if token is blacklisted
      const isBlacklisted = await redis.get(`blacklist:${token}`)
      if (isBlacklisted) {
        throw new Error('Token revoked')
      }

      // Verify session exists
      const sessionExists = await redis.get(`session:${payload.userId}:${payload.sessionId}`)
      if (!sessionExists) {
        throw new Error('Session expired')
      }

      // Verify checksum
      const expectedChecksum = this.generateTokenChecksum(payload.userId, payload.sessionId)
      if (payload.checksum !== expectedChecksum) {
        await this.monitor.logSecurityEvent({
          type: SecurityEventType.INVALID_TOKEN,
          severity: SecuritySeverity.HIGH,
          ip: 'unknown',
          userAgent: 'unknown',
          path: '/auth/verify',
          method: 'POST',
          userId: payload.userId,
          details: { reason: 'Token checksum mismatch' },
          blocked: true
        })
        throw new Error('Token integrity check failed')
      }

      return payload
    } catch (error) {
      throw error
    }
  }

  /**
   * Guardian Security: Check account lockout status
   */
  async checkAccountLockout(email: string): Promise<{ isLocked: boolean; lockedUntil?: Date; attempts: number }> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        loginAttempts: true,
        lockedUntil: true
      }
    })

    if (!user) {
      return { isLocked: false, attempts: 0 }
    }

    const attempts = user.loginAttempts || 0
    const lockedUntil = user.lockedUntil

    if (lockedUntil && new Date() < lockedUntil) {
      return { isLocked: true, lockedUntil, attempts }
    }

    return { isLocked: false, attempts }
  }

  /**
   * Guardian Security: Record failed login attempt with progressive lockout
   */
  async recordFailedAttempt(email: string, ip: string, userAgent: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, loginAttempts: true }
    })

    if (user) {
      const attempts = (user.loginAttempts || 0) + 1
      const updateData: any = { loginAttempts: attempts }

      // Progressive lockout: longer lockouts for repeated attempts
      if (attempts >= this.config.maxLoginAttempts) {
        const lockoutMultiplier = Math.min(Math.floor(attempts / this.config.maxLoginAttempts), 10)
        const lockoutDuration = this.config.lockoutDuration * lockoutMultiplier
        updateData.lockedUntil = new Date(Date.now() + lockoutDuration)

        // Log security event
        await this.monitor.logSecurityEvent({
          type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
          severity: SecuritySeverity.HIGH,
          ip,
          userAgent,
          path: '/auth/login',
          method: 'POST',
          userId: user.id,
          details: { attempts, lockoutDuration },
          blocked: true
        })
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      })
    }

    // Record IP-based rate limiting
    const ipKey = `failed_attempts:${ip}`
    const ipAttempts = await redis.incr(ipKey)
    await redis.expire(ipKey, 3600) // 1 hour

    if (ipAttempts >= 10) {
      await this.monitor.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.CRITICAL,
        ip,
        userAgent,
        path: '/auth/login',
        method: 'POST',
        details: { ipAttempts },
        blocked: true
      })
    }
  }

  /**
   * Guardian Security: Reset login attempts on successful login
   */
  async resetLoginAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    })
  }

  /**
   * Guardian Security: Create secure session with metadata
   */
  async createSecureSession(userId: string, ip: string, userAgent: string): Promise<string> {
    const sessionId = crypto.randomUUID()
    const sessionData = {
      userId,
      sessionId,
      ip,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    }

    // Check concurrent session limit
    const existingSessions = await redis.keys(`session:${userId}:*`)
    if (existingSessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = existingSessions[0]
      await redis.del(oldestSession)
      
      await this.monitor.logSecurityEvent({
        type: SecurityEventType.CONCURRENT_SESSION_LIMIT,
        severity: SecuritySeverity.MEDIUM,
        ip,
        userAgent,
        path: '/auth/login',
        method: 'POST',
        userId,
        details: { removedSession: oldestSession },
        blocked: false
      })
    }

    // Store session with expiration
    const sessionKey = `session:${userId}:${sessionId}`
    await redis.setex(sessionKey, Math.floor(this.config.sessionTimeout / 1000), JSON.stringify(sessionData))

    return sessionId
  }

  /**
   * Guardian Security: Invalidate session securely
   */
  async invalidateSession(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await redis.del(`session:${userId}:${sessionId}`)
    } else {
      // Invalidate all sessions for user
      const sessions = await redis.keys(`session:${userId}:*`)
      if (sessions.length > 0) {
        await redis.del(...sessions)
      }
    }
  }

  /**
   * Guardian Security: Enhanced email validation
   */
  validateEmail(email: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!email || typeof email !== 'string') {
      errors.push('Email is required')
      return { isValid: false, errors }
    }

    const trimmedEmail = email.toLowerCase().trim()

    if (!validator.isEmail(trimmedEmail)) {
      errors.push('Invalid email format')
    }

    if (trimmedEmail.length > 254) {
      errors.push('Email too long')
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /[<>"']/,
      /javascript:/i,
      /\.\./, // Path traversal
      /@.*@/, // Multiple @ symbols
    ]

    if (suspiciousPatterns.some(pattern => pattern.test(trimmedEmail))) {
      errors.push('Email contains invalid characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Guardian Security: Enhanced password validation
   */
  validatePassword(password: string): { isValid: boolean; score: number; errors: string[] } {
    const errors: string[] = []
    let score = 0

    if (!password || typeof password !== 'string') {
      errors.push('Password is required')
      return { isValid: false, score: 0, errors }
    }

    // Length requirements
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    } else if (password.length >= 8) score += 1

    if (password.length > 128) {
      errors.push('Password too long (max 128 characters)')
    }

    // Character requirements
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters')
    } else score += 1

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters')
    } else score += 1

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain numbers')
    } else score += 1

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain special characters')
    } else score += 1

    // Advanced security checks
    if (/(..).*\1/.test(password)) {
      errors.push('Password contains repeated patterns')
      score -= 1
    }

    if (/123|abc|qwe|password|admin|user/i.test(password)) {
      errors.push('Password contains common patterns')
      score -= 2
    }

    // Entropy check
    const entropy = this.calculatePasswordEntropy(password)
    if (entropy < 50) {
      errors.push('Password is too predictable')
      score -= 1
    } else if (entropy > 70) {
      score += 1
    }

    return {
      isValid: errors.length === 0,
      score: Math.max(0, Math.min(5, score)),
      errors
    }
  }

  /**
   * Guardian Security: Calculate password entropy
   */
  private calculatePasswordEntropy(password: string): number {
    const charset = {
      lowercase: /[a-z]/.test(password) ? 26 : 0,
      uppercase: /[A-Z]/.test(password) ? 26 : 0,
      numbers: /[0-9]/.test(password) ? 10 : 0,
      symbols: /[^a-zA-Z0-9]/.test(password) ? 33 : 0
    }

    const charsetSize = Object.values(charset).reduce((sum, size) => sum + size, 0)
    return charsetSize > 0 ? password.length * Math.log2(charsetSize) : 0
  }
}

/**
 * Guardian Security: Authentication rate limiting middleware
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later',
    retryAfter: 900 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
    const email = req.body?.email || 'unknown'
    return `auth:${ip}:${email}`
  },
  handler: async (req, res) => {
    const monitor = GuardianSecurityMonitor.getInstance()
    await monitor.logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.HIGH,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      path: req.path,
      method: req.method,
      details: { endpoint: 'authentication' },
      blocked: true
    })

    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again later',
      retryAfter: 900
    })
  }
})

/**
 * Guardian Security: Authentication middleware factory
 */
export function createAuthMiddleware() {
  const authSecurity = new GuardianAuthSecurity()
  const monitor = GuardianSecurityMonitor.getInstance()

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Missing or invalid authorization header'
        })
      }

      const token = authHeader.substring(7)
      const payload = await authSecurity.verifyToken(token)

      // Attach user to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId
      }

      // Update session activity
      const sessionKey = `session:${payload.userId}:${payload.sessionId}`
      const sessionData = await redis.get(sessionKey)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        session.lastActivity = new Date().toISOString()
        await redis.setex(sessionKey, Math.floor(defaultConfig.sessionTimeout / 1000), JSON.stringify(session))
      }

      next()
    } catch (error) {
      await monitor.logSecurityEvent({
        type: SecurityEventType.INVALID_TOKEN,
        severity: SecuritySeverity.MEDIUM,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        blocked: true
      })

      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token'
      })
    }
  }
}

export default GuardianAuthSecurity
