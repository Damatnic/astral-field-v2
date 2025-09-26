/**
 * Guardian Security Middleware
 * Advanced security protection for Astral Field application
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Guardian Security: Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Guardian Security: Suspicious activity patterns
const suspiciousPatterns = [
  /\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b/i,
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /\.\.\//g,
  /\/etc\/passwd/i,
  /\bwp-admin\b/i,
  /\bphpmyadmin\b/i
]

// Guardian Security: Country code blocks (add restricted countries)
const blockedCountries = ['CN', 'RU', 'KP'] // Example: China, Russia, North Korea

interface SecurityConfig {
  rateLimitWindowMs: number
  rateLimitMaxRequests: number
  enableGeoBlocking: boolean
  enableSQLInjectionProtection: boolean
  enableXSSProtection: boolean
  enableBotDetection: boolean
}

const securityConfig: SecurityConfig = {
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 100,
  enableGeoBlocking: true,
  enableSQLInjectionProtection: true,
  enableXSSProtection: true,
  enableBotDetection: true
}

export class GuardianSecurity {
  /**
   * Guardian Security: Advanced rate limiting with adaptive thresholds
   */
  static checkRateLimit(req: NextRequest, identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - securityConfig.rateLimitWindowMs
    
    // Clean expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
    
    const entry = rateLimitStore.get(identifier)
    
    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + securityConfig.rateLimitWindowMs
      })
      return true
    }
    
    if (entry.count >= securityConfig.rateLimitMaxRequests) {
      return false
    }
    
    entry.count++
    return true
  }
  
  /**
   * Guardian Security: SQL injection detection
   */
  static detectSQLInjection(input: string): boolean {
    if (!securityConfig.enableSQLInjectionProtection) return false
    
    const sqlPatterns = [
      /(\w*)((\')|(\\x27)|(\\x2D)|(\\x23))+/i,
      /((\\x3D)|(=))[^\\n]*((\\x27)|(\\x3D)|(')|(\\x23)|(#))/i,
      /\\w*((\\x27)|(\\'))((\\x6F)|(o))((\\x72)|(r))/i,
      /(exec|execute|drop|create|alter|union|select|insert|delete|update)/i
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }
  
  /**
   * Guardian Security: XSS detection
   */
  static detectXSS(input: string): boolean {
    if (!securityConfig.enableXSSProtection) return false
    
    const xssPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }
  
  /**
   * Guardian Security: Bot detection
   */
  static detectBot(req: NextRequest): boolean {
    if (!securityConfig.enableBotDetection) return false
    
    const userAgent = req.headers.get('user-agent') || ''
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /go-http-client/i
    ]
    
    // Check for missing or suspicious headers
    const hasAccept = req.headers.get('accept')
    const hasAcceptLanguage = req.headers.get('accept-language')
    const hasAcceptEncoding = req.headers.get('accept-encoding')
    
    if (!hasAccept || !hasAcceptLanguage || !hasAcceptEncoding) {
      return true
    }
    
    return botPatterns.some(pattern => pattern.test(userAgent))
  }
  
  /**
   * Guardian Security: Geo-blocking
   */
  static isBlockedCountry(countryCode: string): boolean {
    if (!securityConfig.enableGeoBlocking) return false
    return blockedCountries.includes(countryCode.toUpperCase())
  }
  
  /**
   * Guardian Security: Suspicious activity detection
   */
  static detectSuspiciousActivity(req: NextRequest): boolean {
    const url = req.url
    const userAgent = req.headers.get('user-agent') || ''
    
    // Check URL for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Guardian Security: Generate security headers
   */
  static generateSecurityHeaders(): Record<string, string> {
    const nonce = crypto.randomBytes(16).toString('base64')
    
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-DNS-Prefetch-Control': 'off',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
      'X-Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'`
    }
  }
  
  /**
   * Guardian Security: Main security middleware
   */
  static async middleware(req: NextRequest): Promise<NextResponse | null> {
    const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || ''
    const url = req.url
    
    // Rate limiting
    if (!this.checkRateLimit(req, ip)) {
      return new NextResponse('Rate limit exceeded', { 
        status: 429,
        headers: {
          'Retry-After': '60',
          ...this.generateSecurityHeaders()
        }
      })
    }
    
    // Geo-blocking (if country header is available)
    const countryCode = req.headers.get('cf-ipcountry') || req.headers.get('x-country-code')
    if (countryCode && this.isBlockedCountry(countryCode)) {
      return new NextResponse('Access denied from this location', { 
        status: 403,
        headers: this.generateSecurityHeaders()
      })
    }
    
    // Bot detection
    if (this.detectBot(req)) {
      return new NextResponse('Bot access not allowed', { 
        status: 403,
        headers: this.generateSecurityHeaders()
      })
    }
    
    // Suspicious activity detection
    if (this.detectSuspiciousActivity(req)) {
      // Log the incident
      console.warn('Guardian Security: Suspicious activity detected', {
        ip,
        userAgent,
        url,
        timestamp: new Date().toISOString()
      })
      
      return new NextResponse('Suspicious activity detected', { 
        status: 403,
        headers: this.generateSecurityHeaders()
      })
    }
    
    // SQL injection detection in query parameters
    const { searchParams } = new URL(req.url)
    for (const [key, value] of searchParams.entries()) {
      if (this.detectSQLInjection(value) || this.detectXSS(value)) {
        return new NextResponse('Invalid request parameters', { 
          status: 400,
          headers: this.generateSecurityHeaders()
        })
      }
    }
    
    // All checks passed - continue
    return null
  }
}

/**
 * Guardian Security: Enhanced CSRF protection
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>()
  
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = Date.now() + (30 * 60 * 1000) // 30 minutes
    
    this.tokens.set(sessionId, { token, expires })
    
    // Cleanup expired tokens
    for (const [key, value] of this.tokens.entries()) {
      if (value.expires < Date.now()) {
        this.tokens.delete(key)
      }
    }
    
    return token
  }
  
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId)
    if (!stored || stored.expires < Date.now()) {
      return false
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    )
  }
  
  static deleteToken(sessionId: string): void {
    this.tokens.delete(sessionId)
  }
}

/**
 * Guardian Security: Content validation
 */
export class ContentValidator {
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  }
  
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email) && email.length <= 254
  }
  
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default GuardianSecurity