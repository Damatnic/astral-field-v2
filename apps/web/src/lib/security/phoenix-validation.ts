/**
 * Phoenix Security & Validation System
 * Comprehensive input validation, rate limiting, and security middleware
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Security configuration
interface SecurityConfig {
  enableSQLInjectionProtection: boolean
  enableXSSProtection: boolean
  enableCSRFProtection: boolean
  enableRateLimiting: boolean
  maxRequestSize: number
  allowedOrigins: string[]
  sensitiveFields: string[]
  blockSuspiciousPatterns: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  sanitizedData?: any
  securityFlags: SecurityFlag[]
}

interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityFlag {
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'command_injection' | 'excessive_requests'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: any
}

// Common validation schemas
export const PhoenixSchemas = {
  // User data validation
  userId: z.string().cuid('Invalid user ID format'),
  email: z.string().email('Invalid email format').max(254),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters'),
  password: z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  ),

  // Fantasy football specific
  teamId: z.string().cuid('Invalid team ID format'),
  leagueId: z.string().cuid('Invalid league ID format'),
  playerId: z.string().cuid('Invalid player ID format'),
  week: z.number().int().min(1).max(18),
  season: z.number().int().min(2020).max(2030),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPER_FLEX', 'BENCH', 'IR']),

  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // Search and filtering
  searchQuery: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid search characters'),
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  // Trade proposals
  tradeProposal: z.object({
    proposingTeamId: z.string().cuid(),
    receivingTeamId: z.string().cuid(),
    givingPlayerIds: z.array(z.string().cuid()).min(1).max(10),
    receivingPlayerIds: z.array(z.string().cuid()).min(1).max(10),
    message: z.string().max(500).optional()
  }),

  // Lineup updates
  lineupUpdate: z.object({
    teamId: z.string().cuid(),
    roster: z.array(z.object({
      id: z.string().cuid(),
      position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPER_FLEX', 'BENCH', 'IR']),
      isStarter: z.boolean()
    })).min(1).max(20)
  }),

  // API request metadata
  apiRequest: z.object({
    requestId: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    userAgent: z.string().max(500).optional(),
    ipAddress: z.string().ip().optional()
  })
}

// Suspicious patterns to detect potential attacks
const SUSPICIOUS_PATTERNS = {
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /([\'"]\s*;\s*--)/i,
    /(\bxp_\w+)/i,
    /(\bunion\s+select)/i
  ],
  xss: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[\s\S]*?onerror[\s\S]*?>/gi
  ],
  pathTraversal: [
    /(\.\.[\/\\]){2,}/,
    /(\.\.%2f){2,}/i,
    /(\.\.%5c){2,}/i
  ],
  commandInjection: [
    /(\b(exec|eval|system|shell_exec|passthru)\s*\()/i,
    /(\b(cmd|powershell|bash|sh)\s+)/i,
    /[;&|`${}]/
  ]
}

class PhoenixValidator {
  private static instance: PhoenixValidator
  private securityConfig: SecurityConfig
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>()

  static getInstance(config?: Partial<SecurityConfig>): PhoenixValidator {
    if (!PhoenixValidator.instance) {
      PhoenixValidator.instance = new PhoenixValidator(config)
    }
    return PhoenixValidator.instance
  }

  constructor(config: Partial<SecurityConfig> = {}) {
    this.securityConfig = {
      enableSQLInjectionProtection: true,
      enableXSSProtection: true,
      enableCSRFProtection: true,
      enableRateLimiting: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'https://astralfield.vercel.app'],
      sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
      blockSuspiciousPatterns: true,
      ...config
    }
  }

  // Main validation method
  async validateRequest(
    request: NextRequest,
    schema?: z.ZodSchema,
    options: {
      rateLimitKey?: string
      maxRequests?: number
      windowMs?: number
      skipSecurityCheck?: boolean
    } = {}
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      securityFlags: []
    }

    try {
      // 1. Rate limiting check
      if (this.securityConfig.enableRateLimiting && options.rateLimitKey) {
        const rateLimitResult = this.checkRateLimit(
          options.rateLimitKey,
          options.maxRequests || 100,
          options.windowMs || 60000
        )
        
        if (!rateLimitResult.allowed) {
          result.isValid = false
          result.errors.push({
            field: 'request',
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            severity: 'high'
          })
          result.securityFlags.push({
            type: 'excessive_requests',
            severity: 'high',
            message: 'Rate limit exceeded',
            details: { remaining: rateLimitResult.remaining, resetTime: rateLimitResult.resetTime }
          })
          return result
        }
      }

      // 2. Request size validation
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > this.securityConfig.maxRequestSize) {
        result.isValid = false
        result.errors.push({
          field: 'request',
          message: 'Request size too large',
          code: 'REQUEST_TOO_LARGE',
          severity: 'medium'
        })
        return result
      }

      // 3. Origin validation
      const origin = request.headers.get('origin')
      if (origin && !this.securityConfig.allowedOrigins.includes(origin)) {
        result.securityFlags.push({
          type: 'xss',
          severity: 'medium',
          message: 'Unauthorized origin',
          details: { origin }
        })
      }

      // 4. Parse and validate request body
      let body: any = null
      if (request.body && request.method !== 'GET') {
        try {
          const text = await request.text()
          if (text) {
            body = JSON.parse(text)
            
            // Security scan of request body
            if (!options.skipSecurityCheck) {
              const securityScan = this.scanForThreats(body)
              result.securityFlags.push(...securityScan)
              
              if (securityScan.some(flag => flag.severity === 'critical')) {
                result.isValid = false
                result.errors.push({
                  field: 'request',
                  message: 'Security threat detected',
                  code: 'SECURITY_THREAT',
                  severity: 'critical'
                })
                return result
              }
            }
          }
        } catch (error) {
          result.isValid = false
          result.errors.push({
            field: 'body',
            message: 'Invalid JSON format',
            code: 'INVALID_JSON',
            severity: 'medium'
          })
          return result
        }
      }

      // 5. Schema validation
      if (schema && body) {
        try {
          const validated = schema.parse(body)
          result.sanitizedData = this.sanitizeData(validated)
        } catch (error) {
          result.isValid = false
          if (error instanceof z.ZodError) {
            result.errors = error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              severity: 'medium' as const
            }))
          } else {
            result.errors.push({
              field: 'validation',
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              severity: 'medium'
            })
          }
          return result
        }
      } else if (body) {
        result.sanitizedData = this.sanitizeData(body)
      }

      // 6. Query parameter validation
      const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries())
      if (Object.keys(queryParams).length > 0) {
        const queryScan = this.scanForThreats(queryParams)
        result.securityFlags.push(...queryScan)
      }

      return result

    } catch (error) {
      result.isValid = false
      result.errors.push({
        field: 'system',
        message: 'Validation system error',
        code: 'SYSTEM_ERROR',
        severity: 'critical'
      })
      return result
    }
  }

  // Scan data for security threats
  private scanForThreats(data: any, path: string = ''): SecurityFlag[] {
    const flags: SecurityFlag[] = []

    if (!this.securityConfig.blockSuspiciousPatterns) {
      return flags
    }

    const scanValue = (value: string, fieldPath: string) => {
      // SQL Injection detection
      if (this.securityConfig.enableSQLInjectionProtection) {
        for (const pattern of SUSPICIOUS_PATTERNS.sqlInjection) {
          if (pattern.test(value)) {
            flags.push({
              type: 'sql_injection',
              severity: 'critical',
              message: 'Potential SQL injection detected',
              details: { field: fieldPath, pattern: pattern.source }
            })
          }
        }
      }

      // XSS detection
      if (this.securityConfig.enableXSSProtection) {
        for (const pattern of SUSPICIOUS_PATTERNS.xss) {
          if (pattern.test(value)) {
            flags.push({
              type: 'xss',
              severity: 'high',
              message: 'Potential XSS attack detected',
              details: { field: fieldPath, pattern: pattern.source }
            })
          }
        }
      }

      // Path traversal detection
      for (const pattern of SUSPICIOUS_PATTERNS.pathTraversal) {
        if (pattern.test(value)) {
          flags.push({
            type: 'path_traversal',
            severity: 'high',
            message: 'Potential path traversal detected',
            details: { field: fieldPath, pattern: pattern.source }
          })
        }
      }

      // Command injection detection
      for (const pattern of SUSPICIOUS_PATTERNS.commandInjection) {
        if (pattern.test(value)) {
          flags.push({
            type: 'command_injection',
            severity: 'critical',
            message: 'Potential command injection detected',
            details: { field: fieldPath, pattern: pattern.source }
          })
        }
      }
    }

    const traverse = (obj: any, currentPath: string) => {
      if (typeof obj === 'string') {
        scanValue(obj, currentPath)
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, `${currentPath}[${index}]`)
        })
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          const newPath = currentPath ? `${currentPath}.${key}` : key
          traverse(value, newPath)
        })
      }
    }

    traverse(data, path)
    return flags
  }

  // Sanitize data to prevent XSS and other attacks
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Use DOMPurify for XSS protection
      return DOMPurify.sanitize(data, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      })
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        // Skip sensitive fields from logging
        if (this.securityConfig.sensitiveFields.includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]'
        } else {
          sanitized[key] = this.sanitizeData(value)
        }
      }
      return sanitized
    }

    return data
  }

  // Rate limiting implementation
  private checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const resetTime = windowStart + windowMs

    const current = this.rateLimitMap.get(key)

    if (!current || current.resetTime <= now) {
      this.rateLimitMap.set(key, { count: 1, resetTime })
      return { allowed: true, remaining: maxRequests - 1, resetTime }
    }

    if (current.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime }
    }

    current.count++
    return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime }
  }

  // Get validation statistics
  getValidationStats() {
    return {
      activeRateLimits: this.rateLimitMap.size,
      securityConfig: this.securityConfig,
      suspiciousPatternCounts: {
        sqlInjection: SUSPICIOUS_PATTERNS.sqlInjection.length,
        xss: SUSPICIOUS_PATTERNS.xss.length,
        pathTraversal: SUSPICIOUS_PATTERNS.pathTraversal.length,
        commandInjection: SUSPICIOUS_PATTERNS.commandInjection.length
      }
    }
  }

  // Clean up expired rate limit entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (value.resetTime <= now) {
        this.rateLimitMap.delete(key)
      }
    }
  }
}

// Validation middleware factory
export function createValidationMiddleware(
  schema?: z.ZodSchema,
  options: {
    rateLimitKey?: string
    maxRequests?: number
    windowMs?: number
    skipSecurityCheck?: boolean
  } = {}
) {
  return async (request: NextRequest) => {
    const validator = PhoenixValidator.getInstance()
    return await validator.validateRequest(request, schema, options)
  }
}

// Export singleton instance
export const phoenixValidator = PhoenixValidator.getInstance()

// Export validation utilities
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: []
  })
}

export function validateAndSanitizeSearch(query: string): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = []
  
  // Length check
  if (query.length > 100) {
    errors.push('Search query too long')
  }
  
  // Character validation
  if (!/^[a-zA-Z0-9\s\-_\.]*$/.test(query)) {
    errors.push('Search query contains invalid characters')
  }
  
  // Sanitize
  const sanitized = query
    .replace(/[<>"\']*/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 100) // Limit length
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  }
}

// Export types
export type { ValidationResult, ValidationError, SecurityFlag, SecurityConfig }