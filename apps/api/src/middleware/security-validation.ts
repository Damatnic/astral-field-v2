/**
 * Guardian Security: Advanced Input Validation & Sanitization
 * Comprehensive protection against injection attacks and malicious input
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'
import crypto from 'crypto'

// Guardian Security: SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\w*)((\')|(\\x27)|(\\x2D)|(\\x23))+/i,
  /((\\x3D)|(=))[^\\n]*((\\x27)|(\\x3D)|(')|(\\x23)|(#))/i,
  /\\w*((\\x27)|(\\'))((\\x6F)|(o))((\\x72)|(r))/i,
  /(exec|execute|drop|create|alter|union|select|insert|delete|update|grant|revoke)/i,
  /(\s|^)(or|and)\s+[\w\'"=\s]*[\'"][\w\s]*[\'"](\s|$)/i,
  /1\s*=\s*1/i,
  /1\s*or\s*1/i,
  /\'\s*or\s*\'/i,
  /\"\s*or\s*\"/i
]

// Guardian Security: XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /@import/gi,
  /vbscript:/gi,
  /data:text\/html/gi
]

// Guardian Security: Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
  /%252e%252e%252f/gi,
  /\.\.\%c0\%af/gi,
  /\.\.\%c1\%9c/gi
]

// Guardian Security: Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|nslookup|dig|wget|curl)\b/gi,
  /[<>]/g,
  /\|\s*\w+/g,
  /&\s*\w+/g,
  /;\s*\w+/g
]

interface SecurityValidationConfig {
  enableSQLInjectionProtection: boolean
  enableXSSProtection: boolean
  enablePathTraversalProtection: boolean
  enableCommandInjectionProtection: boolean
  maxStringLength: number
  maxArrayLength: number
  maxObjectDepth: number
  allowedFileTypes: string[]
}

const defaultConfig: SecurityValidationConfig = {
  enableSQLInjectionProtection: true,
  enableXSSProtection: true,
  enablePathTraversalProtection: true,
  enableCommandInjectionProtection: true,
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
}

export class GuardianValidator {
  private config: SecurityValidationConfig

  constructor(config: Partial<SecurityValidationConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Guardian Security: Detect SQL injection attempts
   */
  detectSQLInjection(input: string): boolean {
    if (!this.config.enableSQLInjectionProtection) return false
    
    const decodedInput = this.decodeInput(input)
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(decodedInput))
  }

  /**
   * Guardian Security: Detect XSS attempts
   */
  detectXSS(input: string): boolean {
    if (!this.config.enableXSSProtection) return false
    
    const decodedInput = this.decodeInput(input)
    return XSS_PATTERNS.some(pattern => pattern.test(decodedInput))
  }

  /**
   * Guardian Security: Detect path traversal attempts
   */
  detectPathTraversal(input: string): boolean {
    if (!this.config.enablePathTraversalProtection) return false
    
    const decodedInput = this.decodeInput(input)
    return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(decodedInput))
  }

  /**
   * Guardian Security: Detect command injection attempts
   */
  detectCommandInjection(input: string): boolean {
    if (!this.config.enableCommandInjectionProtection) return false
    
    const decodedInput = this.decodeInput(input)
    return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(decodedInput))
  }

  /**
   * Guardian Security: Decode various encoding schemes
   */
  private decodeInput(input: string): string {
    try {
      // URL decode
      let decoded = decodeURIComponent(input)
      // HTML decode
      decoded = decoded.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      // Base64 decode (if it looks like base64)
      if (/^[A-Za-z0-9+/]+=*$/.test(decoded) && decoded.length % 4 === 0) {
        try {
          decoded = Buffer.from(decoded, 'base64').toString('utf-8')
        } catch {
          // Not valid base64, continue with original
        }
      }
      return decoded.toLowerCase()
    } catch {
      return input.toLowerCase()
    }
  }

  /**
   * Guardian Security: Comprehensive input sanitization
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input)
    } else if (Array.isArray(input)) {
      return this.sanitizeArray(input)
    } else if (typeof input === 'object' && input !== null) {
      return this.sanitizeObject(input)
    }
    return input
  }

  /**
   * Guardian Security: String sanitization
   */
  private sanitizeString(input: string): string {
    // Length check
    if (input.length > this.config.maxStringLength) {
      throw new Error(`String too long: ${input.length} > ${this.config.maxStringLength}`)
    }

    // Security checks
    if (this.detectSQLInjection(input)) {
      throw new Error('SQL injection attempt detected')
    }
    if (this.detectXSS(input)) {
      throw new Error('XSS attempt detected')
    }
    if (this.detectPathTraversal(input)) {
      throw new Error('Path traversal attempt detected')
    }
    if (this.detectCommandInjection(input)) {
      throw new Error('Command injection attempt detected')
    }

    // Sanitize with DOMPurify
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })

    // Additional cleaning
    return sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }

  /**
   * Guardian Security: Array sanitization
   */
  private sanitizeArray(input: any[]): any[] {
    if (input.length > this.config.maxArrayLength) {
      throw new Error(`Array too long: ${input.length} > ${this.config.maxArrayLength}`)
    }

    return input.map(item => this.sanitizeInput(item))
  }

  /**
   * Guardian Security: Object sanitization
   */
  private sanitizeObject(input: any, depth = 0): any {
    if (depth > this.config.maxObjectDepth) {
      throw new Error(`Object too deep: ${depth} > ${this.config.maxObjectDepth}`)
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = this.sanitizeString(key)
      sanitized[sanitizedKey] = this.sanitizeInput(value)
    }
    return sanitized
  }

  /**
   * Guardian Security: Email validation
   */
  validateEmail(email: string): boolean {
    return validator.isEmail(email) && 
           email.length <= 254 && 
           !this.detectSQLInjection(email) && 
           !this.detectXSS(email)
  }

  /**
   * Guardian Security: Password validation
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
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

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters')
    }

    if (/123|abc|qwe|password/i.test(password)) {
      errors.push('Password cannot contain common patterns')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Guardian Security: File validation
   */
  validateFile(filename: string, mimetype: string, size: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // File extension check
    const extension = filename.split('.').pop()?.toLowerCase()
    if (!extension || !this.config.allowedFileTypes.includes(extension)) {
      errors.push(`File type not allowed: ${extension}`)
    }

    // Filename sanitization
    if (this.detectPathTraversal(filename)) {
      errors.push('Invalid filename')
    }

    // Size check (10MB limit)
    if (size > 10 * 1024 * 1024) {
      errors.push('File too large')
    }

    // MIME type validation
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedMimeTypes.includes(mimetype)) {
      errors.push(`MIME type not allowed: ${mimetype}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Guardian Security: Request validation middleware
 */
export function createValidationMiddleware(config?: Partial<SecurityValidationConfig>) {
  const validator = new GuardianValidator(config)

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize request body
      if (req.body) {
        req.body = validator.sanitizeInput(req.body)
      }

      // Validate and sanitize query parameters
      if (req.query) {
        req.query = validator.sanitizeInput(req.query)
      }

      // Validate and sanitize route parameters
      if (req.params) {
        req.params = validator.sanitizeInput(req.params)
      }

      // Log security events
      const securityLog = {
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      }

      // Add security metadata to request
      req.security = {
        validator,
        log: securityLog,
        sessionId: crypto.randomUUID()
      }

      next()
    } catch (error) {
      res.status(400).json({
        error: 'Invalid input detected',
        message: error instanceof Error ? error.message : 'Security validation failed',
        timestamp: new Date().toISOString()
      })
    }
  }
}

/**
 * Guardian Security: Schema validation with security checks
 */
export function createSecureSchema<T extends z.ZodRawShape>(shape: T) {
  const validator = new GuardianValidator()

  // Create enhanced schema with security validation
  const enhancedShape: any = {}
  
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodString) {
      enhancedShape[key] = schema.refine(
        (val) => !validator.detectSQLInjection(val) && 
                 !validator.detectXSS(val) && 
                 !validator.detectPathTraversal(val) &&
                 !validator.detectCommandInjection(val),
        { message: 'Security validation failed' }
      )
    } else {
      enhancedShape[key] = schema
    }
  }

  return z.object(enhancedShape)
}

export default GuardianValidator