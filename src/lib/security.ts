/**
 * Enterprise Security Suite for AstralField
 * Comprehensive security controls including CORS, XSS protection, input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * CORS Configuration
 */
interface CorsOptions {
  origin?: string | string[] | boolean | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://astralfield.vercel.app', 'https://www.astralfield.com']
    : true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key',
    'X-Client-Version',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
};

/**
 * Apply CORS headers to response
 */
export function applyCors(
  request: NextRequest,
  response: NextResponse,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): NextResponse {
  const origin = request.headers.get('origin');
  const method = request.method;

  // Handle preflight OPTIONS request
  if (method === 'OPTIONS') {
    const headers = new Headers();
    
    // Set allowed origins
    if (options.origin) {
      if (typeof options.origin === 'boolean' && options.origin) {
        headers.set('Access-Control-Allow-Origin', '*');
      } else if (typeof options.origin === 'string') {
        headers.set('Access-Control-Allow-Origin', options.origin);
      } else if (Array.isArray(options.origin)) {
        if (origin && options.origin.includes(origin)) {
          headers.set('Access-Control-Allow-Origin', origin);
        }
      } else if (typeof options.origin === 'function') {
        if (origin && options.origin(origin)) {
          headers.set('Access-Control-Allow-Origin', origin);
        }
      }
    }

    // Set allowed methods
    if (options.methods) {
      headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
    }

    // Set allowed headers
    if (options.allowedHeaders) {
      headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
    }

    // Set credentials
    if (options.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Set max age
    if (options.maxAge) {
      headers.set('Access-Control-Max-Age', options.maxAge.toString());
    }

    return new NextResponse(null, {
      status: options.optionsSuccessStatus || 200,
      headers,
    });
  }

  // Apply CORS headers to regular requests
  const headers = new Headers(response.headers);

  if (options.origin) {
    if (typeof options.origin === 'boolean' && options.origin) {
      headers.set('Access-Control-Allow-Origin', '*');
    } else if (typeof options.origin === 'string') {
      headers.set('Access-Control-Allow-Origin', options.origin);
    } else if (Array.isArray(options.origin)) {
      if (origin && options.origin.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
      }
    } else if (typeof options.origin === 'function') {
      if (origin && options.origin(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
      }
    }
  }

  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Security Headers Configuration
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);

  // XSS Protection
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Type Options
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Frame Options
  headers.set('X-Frame-Options', 'DENY');
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.app https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https: wss: ws:",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  
  headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Permissions Policy
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
  ];
  headers.set('Permissions-Policy', permissionsPolicy.join(', '));

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Input Sanitization
 */
export class InputSanitizer {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onmouseout\s*=/gi,
    /onkeydown\s*=/gi,
    /onkeyup\s*=/gi,
    /onfocus\s*=/gi,
    /onblur\s*=/gi,
  ];

  private static readonly SQL_PATTERNS = [
    /('|\'|;|--;|\/\*|\*\/|union\s+(select|all)|insert\s+(into|or)|update\s+set|delete\s+from|drop\s+(table|database|column))/gi,
    /(select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|drop\s+(table|database))/gi,
    /(exec\s+(sp_|xp_)|sp_executesql|xp_cmdshell)/gi,
  ];

  /**
   * Sanitize input against XSS attacks
   */
  static sanitizeXSS(input: string): string {
    if (typeof input !== 'string') return input;
    
    let sanitized = input;
    
    // Remove dangerous HTML tags and attributes
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Encode remaining HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    return sanitized;
  }

  /**
   * Sanitize input against SQL injection
   */
  static sanitizeSQL(input: string): string {
    if (typeof input !== 'string') return input;
    
    let sanitized = input;
    
    // Remove dangerous SQL patterns
    this.SQL_PATTERNS.forEach(pattern => {
      if (pattern.test(sanitized)) {
        logger.warn('Potential SQL injection attempt detected', 'SecurityValidator', { input });
        sanitized = sanitized.replace(pattern, '');
      }
    });
    
    return sanitized;
  }

  /**
   * Comprehensive input sanitization
   */
  static sanitize(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeSQL(this.sanitizeXSS(input));
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitize(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for common attack patterns
   */
  static detectAttackPatterns(input: string): string[] {
    const attacks: string[] = [];
    
    // XSS detection
    if (this.XSS_PATTERNS.some(pattern => pattern.test(input))) {
      attacks.push('XSS');
    }
    
    // SQL injection detection
    if (this.SQL_PATTERNS.some(pattern => pattern.test(input))) {
      attacks.push('SQL_INJECTION');
    }
    
    // Path traversal detection
    if (/\.\.[\/\\]/.test(input)) {
      attacks.push('PATH_TRAVERSAL');
    }
    
    // Command injection detection
    if (/[;&|`]/.test(input) || /\$\(/.test(input)) {
      attacks.push('COMMAND_INJECTION');
    }
    
    return attacks;
  }
}

/**
 * Request validation middleware
 */
export function validateRequest(request: NextRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const url = new URL(request.url);
  
  // Check for suspicious patterns in URL
  const urlAttacks = InputSanitizer.detectAttackPatterns(url.pathname + url.search);
  if (urlAttacks.length > 0) {
    errors.push(`Suspicious URL patterns: ${urlAttacks.join(', ')}`);
  }
  
  // Validate user agent
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.length > 1000) {
    errors.push('User agent too long');
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-originating-ip',
  ];
  
  suspiciousHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      const attacks = InputSanitizer.detectAttackPatterns(value);
      if (attacks.length > 0) {
        errors.push(`Suspicious ${header} header: ${attacks.join(', ')}`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * JWT Token Security
 */
export class TokenSecurity {
  private static readonly BLACKLISTED_TOKENS = new Set<string>();
  
  /**
   * Add token to blacklist
   */
  static blacklistToken(token: string): void {
    this.BLACKLISTED_TOKENS.add(token);
  }
  
  /**
   * Check if token is blacklisted
   */
  static isTokenBlacklisted(token: string): boolean {
    return this.BLACKLISTED_TOKENS.has(token);
  }
  
  /**
   * Extract bearer token from authorization header
   */
  static extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
  
  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    // JWT tokens should have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }
}

/**
 * Password Security
 */
export class PasswordSecurity {
  private static readonly MIN_LENGTH = 8;
  private static readonly COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
  ]);
  
  /**
   * Validate password strength
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters`);
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain numbers');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
    }
    
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Generate secure password
   */
  static generatePassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }
}

/**
 * Session Security
 */
export class SessionSecurity {
  private static readonly ACTIVE_SESSIONS = new Map<string, {
    userId: string;
    lastActivity: number;
    ipAddress: string;
    userAgent: string;
  }>();
  
  /**
   * Track active session
   */
  static trackSession(sessionId: string, userId: string, ipAddress: string, userAgent: string): void {
    this.ACTIVE_SESSIONS.set(sessionId, {
      userId,
      lastActivity: Date.now(),
      ipAddress,
      userAgent,
    });
  }
  
  /**
   * Update session activity
   */
  static updateSessionActivity(sessionId: string): void {
    const session = this.ACTIVE_SESSIONS.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }
  
  /**
   * Invalidate session
   */
  static invalidateSession(sessionId: string): void {
    this.ACTIVE_SESSIONS.delete(sessionId);
  }
  
  /**
   * Check if session is valid
   */
  static isSessionValid(sessionId: string, maxAge: number = 24 * 60 * 60 * 1000): boolean {
    const session = this.ACTIVE_SESSIONS.get(sessionId);
    if (!session) return false;
    
    return Date.now() - session.lastActivity < maxAge;
  }
  
  /**
   * Get active sessions for user
   */
  static getUserSessions(userId: string): string[] {
    const sessions: string[] = [];
    
    for (const [sessionId, session] of this.ACTIVE_SESSIONS.entries()) {
      if (session.userId === userId) {
        sessions.push(sessionId);
      }
    }
    
    return sessions;
  }
  
  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.ACTIVE_SESSIONS.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.ACTIVE_SESSIONS.delete(sessionId);
      }
    }
  }
}

// Periodically clean up expired sessions
if (typeof global !== 'undefined') {
  setInterval(() => {
    SessionSecurity.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // Clean every hour
}

export default {
  applyCors,
  applySecurityHeaders,
  InputSanitizer,
  validateRequest,
  TokenSecurity,
  PasswordSecurity,
  SessionSecurity,
};