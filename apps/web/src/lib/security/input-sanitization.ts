// Guardian Security: Advanced Input Sanitization & Validation
// Protects against XSS, SQL injection, command injection, and malicious payloads

import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

export interface SanitizationConfig {
  allowHtml: boolean
  maxLength: number
  allowSpecialChars: boolean
  strictMode: boolean
  customPatterns?: {
    block?: RegExp[]
    allow?: RegExp[]
  }
}

export class GuardianInputSanitizer {
  private static maliciousPatterns = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
    /('|(--|#|\/\*|\*\/|@@|@))/gi,
    /(;.*--|'.*?--)/gi,
    
    // XSS patterns
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>[\s\S]*?<\/embed>/gi,
    
    // Command injection patterns
    /[\$`][\s]*\(/gi,
    /(;|\||&|&&|\n|\r)\s*(rm|cat|ls|ps|kill|sudo|su|chmod|chown)/gi,
    /\$\{[\s\S]*?\}/gi,
    
    // Path traversal
    /\.\.\//gi,
    /\.\.\\\\?/gi,
    
    // File inclusion attacks
    /(php|asp|jsp|py|rb|pl|cgi):\/\//gi,
    /data:[\w\/]*;base64,/gi,
    
    // LDAP injection
    /[\(\)\*\\\x00]/gi,
    
    // NoSQL injection
    /\$where/gi,
    /\$ne/gi,
    /\$regex/gi,
    
    // Server-side template injection
    /\{\{[\s\S]*?\}\}/gi,
    /\{%[\s\S]*?%\}/gi,
    
    // Prototype pollution
    /__proto__/gi,
    /constructor/gi,
    /prototype/gi
  ]

  private static suspiciousCharacters = [
    '\x00', '\x08', '\x0b', '\x0c', '\x0e', '\x0f',
    '\x10', '\x11', '\x12', '\x13', '\x14', '\x15',
    '\x16', '\x17', '\x18', '\x19', '\x1a', '\x1b',
    '\x1c', '\x1d', '\x1e', '\x1f'
  ]

  /**
   * Comprehensive input sanitization
   */
  static sanitizeInput(
    input: any, 
    config: Partial<SanitizationConfig> = {}
  ): string {
    if (typeof input !== 'string') {
      input = String(input)
    }

    const options: SanitizationConfig = {
      allowHtml: false,
      maxLength: 10000,
      allowSpecialChars: true,
      strictMode: false,
      ...config
    }

    // Step 1: Remove null bytes and suspicious characters
    let sanitized = this.removeNullBytes(input)
    
    // Step 2: Detect and block malicious patterns
    if (this.containsMaliciousPattern(sanitized)) {
      throw new Error('MALICIOUS_INPUT_DETECTED')
    }
    
    // Step 3: Length validation
    if (sanitized.length > options.maxLength) {
      throw new Error(`INPUT_TOO_LONG: Maximum length is ${options.maxLength}`)
    }
    
    // Step 4: HTML sanitization
    if (options.allowHtml) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        REMOVE_DATA_ATTR: true,
        REMOVE_UNKNOWN_PROTOCOLS: true
      })
    } else {
      // Strip all HTML
      sanitized = this.stripHtml(sanitized)
    }
    
    // Step 5: Special character filtering
    if (!options.allowSpecialChars) {
      sanitized = this.filterSpecialCharacters(sanitized)
    }
    
    // Step 6: Normalize unicode
    sanitized = this.normalizeUnicode(sanitized)
    
    // Step 7: Strict mode additional filtering
    if (options.strictMode) {
      sanitized = this.applyStrictMode(sanitized)
    }

    return sanitized.trim()
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(
    obj: any, 
    config: Partial<SanitizationConfig> = {}
  ): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string') {
      return this.sanitizeInput(obj, config)
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, config))
    }

    if (typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeInput(key, { ...config, allowHtml: false })
        sanitized[sanitizedKey] = this.sanitizeObject(value, config)
      }
      return sanitized
    }

    return obj
  }

  /**
   * Remove null bytes and control characters
   */
  private static removeNullBytes(input: string): string {
    let cleaned = input
    
    // Remove null bytes
    cleaned = cleaned.replace(/\x00/g, '')
    
    // Remove other suspicious control characters
    this.suspiciousCharacters.forEach(char => {
      cleaned = cleaned.replace(new RegExp(char, 'g'), '')
    })
    
    return cleaned
  }

  /**
   * Check for malicious patterns
   */
  private static containsMaliciousPattern(input: string): boolean {
    return this.maliciousPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Strip HTML tags
   */
  private static stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '')
  }

  /**
   * Filter special characters
   */
  private static filterSpecialCharacters(input: string): string {
    // Allow alphanumeric, spaces, and basic punctuation
    return input.replace(/[^a-zA-Z0-9\s\-_.,!?@#$%^&*()+=[\]{}|\\:";'<>,./?`~]/g, '')
  }

  /**
   * Normalize Unicode characters
   */
  private static normalizeUnicode(input: string): string {
    return input.normalize('NFC')
  }

  /**
   * Apply strict mode filtering
   */
  private static applyStrictMode(input: string): string {
    // Only allow letters, numbers, spaces, and basic punctuation
    return input.replace(/[^a-zA-Z0-9\s\-_.@]/g, '')
  }

  /**
   * Email sanitization
   */
  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeInput(email, {
      allowHtml: false,
      maxLength: 320, // RFC standard
      allowSpecialChars: true,
      strictMode: false
    })

    // Additional email-specific validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitized)) {
      throw new Error('INVALID_EMAIL_FORMAT')
    }

    return sanitized.toLowerCase()
  }

  /**
   * Password sanitization (minimal to preserve strength)
   */
  static sanitizePassword(password: string): string {
    // Only remove null bytes and control characters
    // Don't strip other characters as they're important for password strength
    return this.removeNullBytes(password)
  }

  /**
   * URL sanitization
   */
  static sanitizeUrl(url: string): string {
    const sanitized = this.sanitizeInput(url, {
      allowHtml: false,
      maxLength: 2048,
      allowSpecialChars: true,
      strictMode: false
    })

    // Additional URL validation
    try {
      new URL(sanitized)
      return sanitized
    } catch {
      throw new Error('INVALID_URL_FORMAT')
    }
  }

  /**
   * SQL query parameter sanitization
   */
  static sanitizeSqlParameter(param: any): string {
    const sanitized = this.sanitizeInput(param, {
      allowHtml: false,
      maxLength: 1000,
      allowSpecialChars: false,
      strictMode: true
    })

    // Additional SQL-specific checks
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
      /('|(--|#|\/\*|\*\/|@@|@))/gi,
      /(;.*--|'.*?--)/gi
    ]

    if (sqlInjectionPatterns.some(pattern => pattern.test(sanitized))) {
      throw new Error('SQL_INJECTION_ATTEMPT_DETECTED')
    }

    return sanitized
  }

  /**
   * Filename sanitization
   */
  static sanitizeFilename(filename: string): string {
    let sanitized = this.sanitizeInput(filename, {
      allowHtml: false,
      maxLength: 255,
      allowSpecialChars: false,
      strictMode: false
    })

    // Remove path traversal attempts
    sanitized = sanitized.replace(/\.\./g, '')
    sanitized = sanitized.replace(/[\/\\]/g, '')
    
    // Remove dangerous characters for filenames
    sanitized = sanitized.replace(/[<>:"|?*]/g, '')
    
    return sanitized
  }

  /**
   * JSON string sanitization
   */
  static sanitizeJsonString(jsonStr: string): string {
    const sanitized = this.sanitizeInput(jsonStr, {
      allowHtml: false,
      maxLength: 50000,
      allowSpecialChars: true,
      strictMode: false
    })

    try {
      // Validate JSON structure
      JSON.parse(sanitized)
      return sanitized
    } catch {
      throw new Error('INVALID_JSON_FORMAT')
    }
  }

  /**
   * Search query sanitization
   */
  static sanitizeSearchQuery(query: string): string {
    return this.sanitizeInput(query, {
      allowHtml: false,
      maxLength: 500,
      allowSpecialChars: true,
      strictMode: false
    })
  }

  /**
   * Rich text content sanitization
   */
  static sanitizeRichText(content: string): string {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote',
        'a', 'img'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target'],
      ALLOW_DATA_ATTR: false,
      REMOVE_UNKNOWN_PROTOCOLS: true,
      USE_PROFILES: { html: true }
    })
  }

  /**
   * Generate security report for input
   */
  static generateSecurityReport(input: string): {
    isClean: boolean
    threats: string[]
    recommendations: string[]
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  } {
    const threats: string[] = []
    const recommendations: string[] = []
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

    // Check for malicious patterns
    this.maliciousPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        const patternTypes = [
          'SQL Injection', 'XSS', 'Command Injection', 'Path Traversal',
          'File Inclusion', 'LDAP Injection', 'NoSQL Injection',
          'Template Injection', 'Prototype Pollution'
        ]
        threats.push(patternTypes[Math.floor(index / 3)] || 'Unknown Threat')
        riskLevel = 'CRITICAL'
      }
    })

    // Check for suspicious characters
    if (this.suspiciousCharacters.some(char => input.includes(char))) {
      threats.push('Null bytes or control characters')
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM'
    }

    // Check length
    if (input.length > 10000) {
      threats.push('Unusually long input')
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM'
    }

    // Generate recommendations
    if (threats.length === 0) {
      recommendations.push('Input appears clean')
    } else {
      recommendations.push('Apply input sanitization')
      recommendations.push('Use parameterized queries for database operations')
      recommendations.push('Validate input on both client and server side')
      if (riskLevel === 'CRITICAL') {
        recommendations.push('IMMEDIATE ACTION REQUIRED: Block this input')
      }
    }

    return {
      isClean: threats.length === 0,
      threats,
      recommendations,
      riskLevel
    }
  }
}

// Validation schemas for common inputs
export const secureValidationSchemas = {
  email: z.string()
    .max(320)
    .email('Invalid email format')
    .transform(val => GuardianInputSanitizer.sanitizeEmail(val)),
    
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .transform(val => GuardianInputSanitizer.sanitizePassword(val)),
    
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .transform(val => GuardianInputSanitizer.sanitizeInput(val, { 
      allowHtml: false, 
      allowSpecialChars: false,
      strictMode: true 
    })),
    
  teamName: z.string()
    .max(50, 'Team name too long')
    .transform(val => GuardianInputSanitizer.sanitizeInput(val, { 
      allowHtml: false, 
      allowSpecialChars: false 
    })),
    
  searchQuery: z.string()
    .max(500, 'Search query too long')
    .transform(val => GuardianInputSanitizer.sanitizeSearchQuery(val)),
    
  url: z.string()
    .max(2048, 'URL too long')
    .transform(val => GuardianInputSanitizer.sanitizeUrl(val)),
    
  filename: z.string()
    .max(255, 'Filename too long')
    .transform(val => GuardianInputSanitizer.sanitizeFilename(val)),
    
  jsonString: z.string()
    .max(50000, 'JSON too large')
    .transform(val => GuardianInputSanitizer.sanitizeJsonString(val)),
    
  richText: z.string()
    .max(100000, 'Content too large')
    .transform(val => GuardianInputSanitizer.sanitizeRichText(val))
}

export { GuardianInputSanitizer as InputSanitizer }