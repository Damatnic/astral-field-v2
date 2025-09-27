/**
 * Guardian CSRF Protection & Secure Cookie Management
 * Enterprise-grade protection against cross-site attacks
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { redis, logger } from '../server'
import { GuardianSecurityMonitor, SecurityEventType, SecuritySeverity } from './security-monitor'

interface CSRFConfig {
  tokenLength: number
  cookieName: string
  headerName: string
  sessionTimeout: number
  sameSitePolicy: 'strict' | 'lax' | 'none'
  secureCookies: boolean
  doubleSubmitCookie: boolean
}

const defaultCSRFConfig: CSRFConfig = {
  tokenLength: 32,
  cookieName: '__Host-csrf-token',
  headerName: 'X-CSRF-Token',
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  sameSitePolicy: 'strict',
  secureCookies: process.env.NODE_ENV === 'production',
  doubleSubmitCookie: true
}

export class GuardianCSRFProtection {
  private config: CSRFConfig
  private monitor: GuardianSecurityMonitor

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...defaultCSRFConfig, ...config }
    this.monitor = GuardianSecurityMonitor.getInstance()
  }

  /**
   * Guardian Security: Generate cryptographically secure CSRF token
   */
  generateCSRFToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString('hex')
  }

  /**
   * Guardian Security: Generate secure session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Guardian Security: Create CSRF token with session binding
   */
  async createCSRFToken(sessionId: string, userId?: string): Promise<string> {
    const token = this.generateCSRFToken()
    const tokenData = {
      token,
      sessionId,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout).toISOString()
    }

    // Store token in Redis with expiration
    const key = `csrf:${token}`
    await redis.setex(key, Math.floor(this.config.sessionTimeout / 1000), JSON.stringify(tokenData))

    return token
  }

  /**
   * Guardian Security: Validate CSRF token
   */
  async validateCSRFToken(token: string, sessionId: string, userId?: string): Promise<boolean> {
    try {
      const key = `csrf:${token}`
      const tokenDataStr = await redis.get(key)
      
      if (!tokenDataStr) {
        return false
      }

      const tokenData = JSON.parse(tokenDataStr)
      
      // Validate session binding
      if (tokenData.sessionId !== sessionId) {
        return false
      }

      // Validate user binding if provided
      if (userId && tokenData.userId !== userId) {
        return false
      }

      // Check expiration
      if (new Date() > new Date(tokenData.expiresAt)) {
        await redis.del(key) // Clean up expired token
        return false
      }

      return true
    } catch (error) {
      logger.error('CSRF token validation error', error)
      return false
    }
  }

  /**
   * Guardian Security: Set secure cookies with enhanced protection
   */
  setSecureCookie(res: Response, name: string, value: string, options: any = {}) {
    const cookieOptions = {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: this.config.sameSitePolicy,
      maxAge: this.config.sessionTimeout,
      path: '/',
      // Prevent cookie tossing attacks
      domain: process.env.COOKIE_DOMAIN || undefined,
      ...options
    }

    // Use __Host- prefix for maximum security in production
    const cookieName = this.config.secureCookies && !name.startsWith('__Host-') ? 
      `__Host-${name}` : name

    res.cookie(cookieName, value, cookieOptions)
  }

  /**
   * Guardian Security: CSRF protection middleware
   */
  createCSRFMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const method = req.method.toUpperCase()
      const ip = req.ip || 'unknown'
      const userAgent = req.headers['user-agent'] || 'unknown'

      // Skip CSRF for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next()
      }

      // Skip CSRF for API endpoints with proper authentication
      if (req.path.startsWith('/api/') && req.headers.authorization) {
        return next()
      }

      try {
        // Get CSRF token from header or body
        const tokenFromHeader = req.headers[this.config.headerName.toLowerCase()] as string
        const tokenFromBody = req.body?._csrf
        const csrfToken = tokenFromHeader || tokenFromBody

        if (!csrfToken) {
          await this.monitor.logSecurityEvent({
            type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: SecuritySeverity.MEDIUM,
            ip,
            userAgent,
            path: req.path,
            method: req.method,
            details: { reason: 'Missing CSRF token' },
            blocked: true
          })

          return res.status(403).json({
            error: 'CSRF token required',
            message: 'Missing CSRF protection token',
            timestamp: new Date().toISOString()
          })
        }

        // Get session ID from cookie or auth token
        let sessionId: string | undefined
        let userId: string | undefined

        if (req.cookies?.sessionId) {
          sessionId = req.cookies.sessionId
        }

        if ((req as any).user) {
          userId = (req as any).user.id
          sessionId = (req as any).user.sessionId
        }

        if (!sessionId) {
          await this.monitor.logSecurityEvent({
            type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: SecuritySeverity.MEDIUM,
            ip,
            userAgent,
            path: req.path,
            method: req.method,
            details: { reason: 'CSRF validation without session' },
            blocked: true
          })

          return res.status(403).json({
            error: 'Invalid session',
            message: 'Session required for CSRF validation',
            timestamp: new Date().toISOString()
          })
        }

        // Validate CSRF token
        const isValidToken = await this.validateCSRFToken(csrfToken, sessionId, userId)
        
        if (!isValidToken) {
          await this.monitor.logSecurityEvent({
            type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: SecuritySeverity.HIGH,
            ip,
            userAgent,
            path: req.path,
            method: req.method,
            userId,
            details: { 
              reason: 'Invalid CSRF token',
              token: csrfToken.substring(0, 8) + '...' // Log partial token
            },
            blocked: true
          })

          return res.status(403).json({
            error: 'CSRF validation failed',
            message: 'Invalid or expired CSRF token',
            timestamp: new Date().toISOString()
          })
        }

        next()
      } catch (error) {
        logger.error('CSRF middleware error', error)
        res.status(500).json({
          error: 'CSRF validation error',
          message: 'Internal security error',
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  /**
   * Guardian Security: CSRF token endpoint
   */
  createCSRFTokenEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        let sessionId = req.cookies?.sessionId
        let userId: string | undefined

        // Generate session ID if none exists
        if (!sessionId) {
          sessionId = this.generateSessionId()
          this.setSecureCookie(res, 'sessionId', sessionId)
        }

        // Get user ID if authenticated
        if ((req as any).user) {
          userId = (req as any).user.id
        }

        // Generate CSRF token
        const csrfToken = await this.createCSRFToken(sessionId, userId)

        // Set CSRF token in cookie (double submit cookie pattern)
        if (this.config.doubleSubmitCookie) {
          this.setSecureCookie(res, this.config.cookieName, csrfToken)
        }

        res.json({
          csrfToken,
          sessionId,
          expiresIn: this.config.sessionTimeout,
          headerName: this.config.headerName,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        logger.error('CSRF token generation error', error)
        res.status(500).json({
          error: 'Failed to generate CSRF token',
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  /**
   * Guardian Security: Secure headers middleware
   */
  createSecureHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Security headers
      const securityHeaders = {
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        
        // XSS protection
        'X-XSS-Protection': '1; mode=block',
        
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        
        // Content Security Policy
        'Content-Security-Policy': this.buildCSP(),
        
        // HSTS (only in production with HTTPS)
        ...(this.config.secureCookies && {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        }),
        
        // Permissions policy
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        
        // Cross-Origin policies
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin'
      }

      // Apply security headers
      Object.entries(securityHeaders).forEach(([header, value]) => {
        res.setHeader(header, value)
      })

      next()
    }
  }

  /**
   * Guardian Security: Build Content Security Policy
   */
  private buildCSP(): string {
    const policies = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // Adjust based on your needs
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'child-src': ["'none'"],
      'worker-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': []
    }

    return Object.entries(policies)
      .map(([directive, sources]) => 
        sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
      )
      .join('; ')
  }
}

// Create default instance
const csrfProtection = new GuardianCSRFProtection()

/**
 * Guardian Security: Default CSRF middleware
 */
export const csrfMiddleware = csrfProtection.createCSRFMiddleware()

/**
 * Guardian Security: CSRF token route
 */
export const csrfTokenRoute = csrfProtection.createCSRFTokenEndpoint()

/**
 * Guardian Security: Secure headers middleware
 */
export const secureHeadersMiddleware = csrfProtection.createSecureHeadersMiddleware()

/**
 * Guardian Security: Cookie configuration for sessions
 */
export const secureCookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 60 * 1000, // 30 minutes
  path: '/'
}

export default csrfProtection
