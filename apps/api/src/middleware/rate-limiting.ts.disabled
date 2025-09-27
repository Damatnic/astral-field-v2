/**
 * Guardian Rate Limiting & Brute Force Protection
 * Multi-layer defense against automated attacks
 */

import { Request, Response, NextFunction } from 'express'
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { redis, logger } from '../server'
import { GuardianSecurityMonitor, SecurityEventType, SecuritySeverity } from './security-monitor'
import crypto from 'crypto'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: Request) => string
  onLimitReached?: (req: Request, res: Response) => void
}

class GuardianRateLimiter {
  private monitor: GuardianSecurityMonitor

  constructor() {
    this.monitor = GuardianSecurityMonitor.getInstance()
  }

  /**
   * Guardian Security: Create adaptive rate limiter
   */
  createRateLimit(config: RateLimitConfig): RateLimitRequestHandler {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.maxRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      handler: async (req: Request, res: Response) => {
        const key = config.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req)
        
        await this.monitor.logSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          severity: SecuritySeverity.HIGH,
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          path: req.path,
          method: req.method,
          details: {
            rateLimitKey: key,
            windowMs: config.windowMs,
            maxRequests: config.maxRequests
          },
          blocked: true
        })

        if (config.onLimitReached) {
          config.onLimitReached(req, res)
        } else {
          res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests, please try again later',
            retryAfter: Math.ceil(config.windowMs / 1000),
            timestamp: new Date().toISOString()
          })
        }
      }
    })
  }

  /**
   * Guardian Security: Default key generator with enhanced fingerprinting
   */
  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    const acceptLanguage = req.headers['accept-language'] || ''
    const acceptEncoding = req.headers['accept-encoding'] || ''
    
    // Create fingerprint hash
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .digest('hex')
      .substring(0, 16)
    
    return `${ip}:${fingerprint}`
  }

  /**
   * Guardian Security: Adaptive rate limiting based on user behavior
   */
  createAdaptiveRateLimit(baseConfig: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = baseConfig.keyGenerator ? baseConfig.keyGenerator(req) : this.defaultKeyGenerator(req)
      const suspicionKey = `suspicion:${key}`
      
      // Check suspicion level
      const suspicionLevel = parseInt(await redis.get(suspicionKey) || '0')
      
      // Adjust rate limit based on suspicion
      let adjustedMax = baseConfig.maxRequests
      if (suspicionLevel > 5) {
        adjustedMax = Math.floor(baseConfig.maxRequests / 4) // Reduce to 25%
      } else if (suspicionLevel > 3) {
        adjustedMax = Math.floor(baseConfig.maxRequests / 2) // Reduce to 50%
      } else if (suspicionLevel > 1) {
        adjustedMax = Math.floor(baseConfig.maxRequests * 0.75) // Reduce to 75%
      }

      // Apply dynamic rate limit
      const dynamicRateLimit = this.createRateLimit({
        ...baseConfig,
        maxRequests: adjustedMax
      })

      dynamicRateLimit(req, res, next)
    }
  }

  /**
   * Guardian Security: Increase suspicion level for an IP
   */
  async increaseSuspicion(key: string, amount: number = 1): Promise<void> {
    const suspicionKey = `suspicion:${key}`
    const current = parseInt(await redis.get(suspicionKey) || '0')
    const newLevel = current + amount
    
    await redis.setex(suspicionKey, 3600, newLevel.toString()) // 1 hour expiry
    
    if (newLevel >= 10) {
      // Auto-block highly suspicious IPs
      await redis.setex(`blocked:${key}`, 24 * 3600, 'true') // 24 hour block
      
      await this.monitor.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.CRITICAL,
        ip: key.split(':')[0],
        userAgent: 'unknown',
        path: '/rate-limit',
        method: 'AUTO',
        details: {
          suspicionLevel: newLevel,
          action: 'auto-blocked'
        },
        blocked: true
      })
    }
  }
}

const rateLimiter = new GuardianRateLimiter()

/**
 * Guardian Security: Authentication rate limiting
 * Stricter limits for login attempts
 */
export const authRateLimit = rateLimiter.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown'
    const email = req.body?.email || 'unknown'
    return `auth:${ip}:${email.toLowerCase()}`
  },
  onLimitReached: async (req: Request, res: Response) => {
    const ip = req.ip || 'unknown'
    const email = req.body?.email || 'unknown'
    
    // Increase suspicion for repeated auth failures
    await rateLimiter.increaseSuspicion(`${ip}:auth`, 3)
    
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Account temporarily locked. Try again in 15 minutes.',
      retryAfter: 900,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Guardian Security: Registration rate limiting
 * Prevent automated account creation
 */
export const registrationRateLimit = rateLimiter.createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 registrations per hour per IP
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown'
    return `register:${ip}`
  }
})

/**
 * Guardian Security: Password reset rate limiting
 * Prevent password reset abuse
 */
export const passwordResetRateLimit = rateLimiter.createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 reset requests per hour
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown'
    const email = req.body?.email || 'unknown'
    return `reset:${ip}:${email.toLowerCase()}`
  }
})

/**
 * Guardian Security: API rate limiting
 * General API protection
 */
export const apiRateLimit = rateLimiter.createAdaptiveRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  skipSuccessfulRequests: false
})

/**
 * Guardian Security: Admin API rate limiting
 * Stricter limits for administrative functions
 */
export const adminRateLimit = rateLimiter.createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 admin requests per hour
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous'
    const ip = req.ip || 'unknown'
    return `admin:${userId}:${ip}`
  }
})

/**
 * Guardian Security: Brute force protection middleware
 * Advanced protection against automated attacks
 */
export function createBruteForceProtection(options: {
  maxAttempts: number
  blockDuration: number
  trackBy: 'ip' | 'email' | 'user' | 'combined'
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const monitor = GuardianSecurityMonitor.getInstance()
    let trackingKey: string

    switch (options.trackBy) {
      case 'ip':
        trackingKey = req.ip || 'unknown'
        break
      case 'email':
        trackingKey = req.body?.email || 'unknown'
        break
      case 'user':
        trackingKey = (req as any).user?.id || 'anonymous'
        break
      case 'combined':
        const ip = req.ip || 'unknown'
        const email = req.body?.email || 'unknown'
        trackingKey = `${ip}:${email}`
        break
      default:
        trackingKey = req.ip || 'unknown'
    }

    const key = `brute_force:${options.trackBy}:${trackingKey}`
    const blockKey = `blocked:${key}`

    // Check if already blocked
    const isBlocked = await redis.get(blockKey)
    if (isBlocked) {
      await monitor.logSecurityEvent({
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: {
          trackingKey,
          reason: 'Blocked IP attempted access'
        },
        blocked: true
      })

      return res.status(429).json({
        error: 'Access temporarily blocked',
        message: 'Too many failed attempts. Try again later.',
        retryAfter: options.blockDuration / 1000,
        timestamp: new Date().toISOString()
      })
    }

    // Check attempt count
    const attempts = await redis.incr(key)
    await redis.expire(key, options.blockDuration / 1000)

    if (attempts >= options.maxAttempts) {
      // Block the key
      await redis.setex(blockKey, options.blockDuration / 1000, 'true')
      
      await monitor.logSecurityEvent({
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: {
          trackingKey,
          attempts,
          maxAttempts: options.maxAttempts,
          blockDuration: options.blockDuration
        },
        blocked: true
      })

      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Access blocked due to repeated failures',
        retryAfter: options.blockDuration / 1000,
        timestamp: new Date().toISOString()
      })
    }

    // Add attempt count to request for logging
    (req as any).attemptCount = attempts
    
    next()
  }
}

/**
 * Guardian Security: IP-based blocking middleware
 * Check if IP is in security blacklist
 */
export function ipBlockingMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const monitor = GuardianSecurityMonitor.getInstance()
    const ip = req.ip || 'unknown'
    
    // Check if IP is blocked
    const isBlocked = await monitor.isIPBlocked(ip)
    if (isBlocked) {
      await monitor.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: { reason: 'Blocked IP attempted access' },
        blocked: true
      })

      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been blocked due to suspicious activity',
        timestamp: new Date().toISOString()
      })
    }

    next()
  }
}

/**
 * Guardian Security: Geolocation-based protection
 * Block requests from high-risk countries (optional)
 */
export function geolocationProtection(blockedCountries: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (blockedCountries.length === 0) {
      return next()
    }

    const monitor = GuardianSecurityMonitor.getInstance()
    const country = req.headers['cf-ipcountry'] as string || // Cloudflare
                   req.headers['x-country-code'] as string || // Other proxies
                   'unknown'

    if (blockedCountries.includes(country.toUpperCase())) {
      await monitor.logSecurityEvent({
        type: SecurityEventType.GEO_ANOMALY,
        severity: SecuritySeverity.MEDIUM,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: { 
          country,
          blockedCountries 
        },
        blocked: true
      })

      return res.status(403).json({
        error: 'Geographic restriction',
        message: 'Access not allowed from your location',
        timestamp: new Date().toISOString()
      })
    }

    next()
  }
}

export { GuardianRateLimiter }
export default rateLimiter
