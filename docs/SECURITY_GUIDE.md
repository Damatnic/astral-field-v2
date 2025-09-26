# AstralField v3.0 - Security Best Practices Guide

## Overview

This comprehensive security guide outlines the security measures, best practices, and protocols implemented in AstralField v3.0 to protect user data, prevent unauthorized access, and maintain system integrity.

## Security Architecture

### Defense in Depth Strategy

AstralField implements a multi-layered security approach:

```
┌─────────────────────────────────────────┐
│             User Layer                  │
│   • MFA • Session Management           │
├─────────────────────────────────────────┤
│           Application Layer             │
│   • Input Validation • CSRF Protection │
├─────────────────────────────────────────┤
│             API Layer                   │
│   • Rate Limiting • JWT Validation     │
├─────────────────────────────────────────┤
│           Database Layer                │
│   • Encryption • Access Controls       │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│   • WAF • DDoS Protection • SSL/TLS    │
└─────────────────────────────────────────┘
```

### Security Principles

1. **Zero Trust Architecture**: Never trust, always verify
2. **Principle of Least Privilege**: Minimal necessary access
3. **Security by Design**: Built-in security from the ground up
4. **Data Minimization**: Collect and store only necessary data
5. **Transparency**: Clear security policies and practices

## Authentication Security

### JWT Token Security

```typescript
// Secure JWT implementation
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!
  private readonly TOKEN_EXPIRY = '7d'
  private readonly REFRESH_TOKEN_EXPIRY = '30d'

  generateTokens(userId: string, email: string, role: string) {
    // Access token with short expiry
    const accessToken = jwt.sign(
      { userId, email, role, type: 'access' },
      this.JWT_SECRET,
      { 
        expiresIn: this.TOKEN_EXPIRY,
        issuer: 'astralfield.com',
        audience: 'astralfield-users',
        subject: userId
      }
    )

    // Refresh token with longer expiry
    const refreshToken = jwt.sign(
      { userId, type: 'refresh', jti: crypto.randomUUID() },
      this.JWT_SECRET,
      { 
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        issuer: 'astralfield.com',
        audience: 'astralfield-users',
        subject: userId
      }
    )

    return { accessToken, refreshToken }
  }

  verifyToken(token: string, tokenType: 'access' | 'refresh' = 'access') {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'astralfield.com',
        audience: 'astralfield-users'
      }) as any

      if (decoded.type !== tokenType) {
        throw new Error('Invalid token type')
      }

      return decoded
    } catch (error) {
      throw new Error('Invalid token')
    }
  }
}
```

### Password Security

```typescript
import bcrypt from 'bcryptjs'
import zxcvbn from 'zxcvbn'

export class PasswordService {
  private readonly SALT_ROUNDS = 12
  private readonly MIN_PASSWORD_STRENGTH = 3

  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    const strength = zxcvbn(password)
    if (strength.score < this.MIN_PASSWORD_STRENGTH) {
      throw new Error('Password is too weak. ' + strength.feedback.suggestions.join(' '))
    }

    // Hash with salt
    return await bcrypt.hash(password, this.SALT_ROUNDS)
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  validatePasswordRequirements(password: string): string[] {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for common patterns
    const commonPatterns = ['123456', 'password', 'qwerty', 'abc123']
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      errors.push('Password contains common patterns and is too predictable')
    }

    return errors
  }
}
```

### Session Management

```typescript
import Redis from 'ioredis'

export class SessionService {
  private redis: Redis
  private readonly SESSION_EXPIRY = 24 * 60 * 60 // 24 hours in seconds
  private readonly MAX_SESSIONS_PER_USER = 5

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!)
  }

  async createSession(userId: string, deviceInfo: DeviceInfo): Promise<string> {
    const sessionId = crypto.randomUUID()
    const sessionData = {
      userId,
      deviceInfo,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    }

    // Store session
    await this.redis.setex(
      `session:${sessionId}`, 
      this.SESSION_EXPIRY, 
      JSON.stringify(sessionData)
    )

    // Add to user's active sessions
    await this.redis.sadd(`user_sessions:${userId}`, sessionId)

    // Enforce session limit
    await this.enforceSessionLimit(userId)

    return sessionId
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    const sessionData = await this.redis.get(`session:${sessionId}`)
    if (!sessionData) return null

    const session = JSON.parse(sessionData)
    
    // Update last activity
    session.lastActivity = new Date().toISOString()
    await this.redis.setex(
      `session:${sessionId}`,
      this.SESSION_EXPIRY,
      JSON.stringify(session)
    )

    return session
  }

  async revokeSession(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`)
    if (sessionData) {
      const session = JSON.parse(sessionData)
      await this.redis.srem(`user_sessions:${session.userId}`, sessionId)
    }
    
    await this.redis.del(`session:${sessionId}`)
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`)
    
    if (sessionIds.length > 0) {
      const pipeline = this.redis.pipeline()
      sessionIds.forEach(sessionId => {
        pipeline.del(`session:${sessionId}`)
      })
      await pipeline.exec()
    }
    
    await this.redis.del(`user_sessions:${userId}`)
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`)
    
    if (sessionIds.length > this.MAX_SESSIONS_PER_USER) {
      // Remove oldest sessions
      const sessionsToRemove = sessionIds.length - this.MAX_SESSIONS_PER_USER
      for (let i = 0; i < sessionsToRemove; i++) {
        await this.revokeSession(sessionIds[i])
      }
    }
  }
}
```

### Multi-Factor Authentication

```typescript
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export class MFAService {
  async generateSecret(userId: string, email: string): Promise<MFASetup> {
    const secret = speakeasy.generateSecret({
      name: `AstralField (${email})`,
      issuer: 'AstralField',
      length: 32
    })

    // Store temporary secret (expires in 10 minutes)
    await redis.setex(
      `mfa_setup:${userId}`,
      600,
      JSON.stringify({ secret: secret.base32, verified: false })
    )

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: this.generateBackupCodes()
    }
  }

  async verifySetup(userId: string, token: string): Promise<boolean> {
    const setupData = await redis.get(`mfa_setup:${userId}`)
    if (!setupData) throw new Error('MFA setup not found or expired')

    const { secret } = JSON.parse(setupData)
    
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps variance
    })

    if (verified) {
      // Store the secret permanently
      await prisma.users.update({
        where: { id: userId },
        data: { 
          mfaSecret: secret,
          mfaEnabled: true
        }
      })

      // Clear temporary setup
      await redis.del(`mfa_setup:${userId}`)
    }

    return verified
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true }
    })

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return false
    }

    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2
    })
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )
  }
}
```

## Input Validation and Sanitization

### Zod Schema Validation

```typescript
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// User input schemas
export const userRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .transform(val => val.toLowerCase().trim()),
    
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(val), 
      'Password must contain uppercase, lowercase, number, and special character'),
      
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .transform(val => DOMPurify.sanitize(val.trim())),
    
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .transform(val => DOMPurify.sanitize(val.trim())),
    
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .transform(val => val.toLowerCase().trim())
})

// League creation schema
export const leagueCreationSchema = z.object({
  name: z.string()
    .min(1, 'League name is required')
    .max(100, 'League name must not exceed 100 characters')
    .transform(val => DOMPurify.sanitize(val.trim())),
    
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .transform(val => val ? DOMPurify.sanitize(val.trim()) : undefined),
    
  settings: z.object({
    teamCount: z.number().int().min(4).max(20),
    playoffTeams: z.number().int().min(2).max(8),
    scoringType: z.enum(['standard', 'ppr', 'half_ppr']),
    rosterLocks: z.enum(['gameTime', 'sunday', 'never']),
    waiverType: z.enum(['FAAB', 'rolling', 'reverse_standings'])
  })
})

// Chat message schema
export const chatMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must not exceed 1000 characters')
    .transform(val => DOMPurify.sanitize(val.trim())),
    
  type: z.enum(['TEXT', 'TRADE', 'TRASH_TALK', 'ANNOUNCEMENT']).default('TEXT'),
  
  replyToId: z.string().uuid().optional(),
  
  metadata: z.record(z.any()).optional()
})
```

### Input Sanitization Middleware

```typescript
import validator from 'validator'

export class InputSanitizer {
  static sanitizeText(input: string): string {
    if (!input) return ''
    
    // Remove potentially dangerous characters
    let sanitized = input.replace(/[<>\"']/g, '')
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    // Use DOMPurify for additional safety
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    })
    
    return sanitized
  }

  static sanitizeEmail(email: string): string {
    if (!email) return ''
    
    const sanitized = email.toLowerCase().trim()
    
    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email format')
    }
    
    return sanitized
  }

  static sanitizeURL(url: string): string {
    if (!url) return ''
    
    if (!validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new Error('Invalid URL format')
    }
    
    return url
  }

  static sanitizeFileName(filename: string): string {
    if (!filename) return ''
    
    // Remove dangerous characters
    return filename.replace(/[^a-zA-Z0-9._-]/g, '').trim()
  }
}

// Validation middleware
export function validateRequest(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source]
      const validated = schema.parse(data)
      
      // Store validated data
      ;(req as any).validated = validated
      
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }
      
      next(error)
    }
  }
}
```

## SQL Injection Prevention

### Prisma ORM Security

```typescript
// Prisma automatically prevents SQL injection through parameterized queries
export class PlayerService {
  // Safe: Prisma handles parameterization
  async searchPlayers(searchTerm: string, position?: string) {
    return await prisma.players.findMany({
      where: {
        AND: [
          {
            name: {
              contains: searchTerm, // Automatically parameterized
              mode: 'insensitive'
            }
          },
          position ? { position } : {},
          { status: 'active' }
        ]
      },
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true
      },
      orderBy: { rank: 'asc' },
      take: 50
    })
  }

  // Safe: Using Prisma's raw query with parameters
  async getPlayerStats(playerId: string, season: string) {
    return await prisma.$queryRaw`
      SELECT 
        week,
        fantasy_points,
        stats
      FROM player_stats 
      WHERE player_id = ${playerId} 
        AND season = ${season}
      ORDER BY week DESC
      LIMIT 17
    `
  }

  // NEVER DO THIS - vulnerable to SQL injection
  async unsafeSearch(searchTerm: string) {
    // DON'T: String concatenation in raw queries
    return await prisma.$queryRawUnsafe(`
      SELECT * FROM players WHERE name LIKE '%${searchTerm}%'
    `)
  }
}
```

### Additional Database Security

```typescript
// Database connection security
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  errorFormat: 'pretty',
})

// Connection pool configuration
process.env.DATABASE_POOL_SIZE = "10"
process.env.DATABASE_POOL_TIMEOUT = "5000"

// Database access logging
prisma.$use(async (params, next) => {
  const start = Date.now()
  
  const result = await next(params)
  
  const duration = Date.now() - start
  
  // Log database operations
  logger.info('Database operation', {
    model: params.model,
    action: params.action,
    duration: `${duration}ms`
  })
  
  return result
})
```

## Cross-Site Scripting (XSS) Prevention

### Frontend XSS Protection

```typescript
// React automatically escapes content, but additional measures:

// Safe HTML rendering with DOMPurify
import DOMPurify from 'dompurify'

export function SafeHTML({ content }: { content: string }) {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  })

  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: sanitizedContent 
      }} 
    />
  )
}

// Content Security Policy
export const cspHeader = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}
```

### Backend XSS Protection

```typescript
import helmet from 'helmet'

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// Additional XSS protection
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})
```

## Cross-Site Request Forgery (CSRF) Protection

### CSRF Token Implementation

```typescript
import csrf from 'csurf'
import cookieParser from 'cookie-parser'

// CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
})

app.use(cookieParser())

// Apply CSRF protection to state-changing operations
app.use('/api/leagues', csrfProtection)
app.use('/api/teams', csrfProtection)
app.use('/api/trades', csrfProtection)

// Provide CSRF token to frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// Frontend CSRF token usage
export async function makeAPIRequest(url: string, options: RequestInit = {}) {
  // Get CSRF token
  const csrfResponse = await fetch('/api/csrf-token')
  const { csrfToken } = await csrfResponse.json()

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
  })
}
```

### SameSite Cookie Protection

```typescript
// Secure cookie configuration
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.NODE_ENV === 'production' ? '.astralfield.com' : undefined
}

// Session cookie
app.use(session({
  secret: process.env.SESSION_SECRET!,
  name: 'astralfield_session',
  cookie: cookieConfig,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redis })
}))
```

## Rate Limiting and DDoS Protection

### Advanced Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

// Redis store for rate limiting
const redisStore = new RedisStore({
  client: redis,
  prefix: 'rl:'
})

// Different rate limits for different endpoints
const authLimiter = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and user ID if available
    return req.user?.id || req.ip
  }
})

const apiLimiter = rateLimit({
  store: redisStore,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'API rate limit exceeded',
    retryAfter: '1 minute'
  },
  keyGenerator: (req) => req.user?.id || req.ip
})

const draftLimiter = rateLimit({
  store: redisStore,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for draft operations
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => {
    // Skip rate limiting for draft admins
    return req.user?.role === 'COMMISSIONER'
  }
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/', apiLimiter)
app.use('/api/draft/', draftLimiter)
```

### Advanced DDoS Protection

```typescript
// Request size limiting
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Additional validation for large payloads
    if (buf.length > 10 * 1024 * 1024) { // 10MB
      throw new Error('Payload too large')
    }
  }
}))

// Slow loris protection
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    req.destroy()
  }, 30000) // 30 second timeout

  res.on('finish', () => clearTimeout(timeout))
  res.on('close', () => clearTimeout(timeout))
  
  next()
})

// IP-based protection
const suspiciousIPs = new Set<string>()

app.use((req, res, next) => {
  const clientIP = req.ip
  
  if (suspiciousIPs.has(clientIP)) {
    return res.status(429).json({
      error: 'IP temporarily blocked due to suspicious activity'
    })
  }
  
  next()
})
```

## Data Encryption and Protection

### Data at Rest Encryption

```typescript
import crypto from 'crypto'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(this.algorithm, this.key)
    cipher.setAAD(Buffer.from('astralfield', 'utf8'))
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipher(this.algorithm, this.key)
    decipher.setAAD(Buffer.from('astralfield', 'utf8'))
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}

// Encrypt sensitive data before storing
export class UserService {
  private encryption = new EncryptionService()

  async createUser(userData: CreateUserData) {
    const user = await prisma.users.create({
      data: {
        ...userData,
        // Encrypt sensitive fields
        email: this.encryption.encrypt(userData.email),
        phone: userData.phone ? this.encryption.encrypt(userData.phone) : null,
        // Password is hashed, not encrypted
        hashedPassword: await bcrypt.hash(userData.password, 12)
      }
    })

    return user
  }
}
```

### Data in Transit Protection

```typescript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    return res.redirect(301, `https://${req.get('Host')}${req.url}`)
  }
  next()
})

// TLS configuration for custom deployments
import https from 'https'
import fs from 'fs'

if (process.env.NODE_ENV === 'production' && process.env.SSL_CERT_PATH) {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH!),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true,
    secureProtocol: 'TLSv1_2_method'
  }

  https.createServer(options, app).listen(443, () => {
    console.log('HTTPS Server running on port 443')
  })
}
```

## Security Monitoring and Logging

### Security Event Logging

```typescript
import pino from 'pino'

const securityLogger = pino({
  level: 'info',
  base: { service: 'astralfield-security' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
})

export class SecurityMonitor {
  static logSecurityEvent(event: SecurityEvent) {
    securityLogger.warn('Security event detected', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: new Date().toISOString()
    })

    // Alert on critical events
    if (event.severity === 'critical') {
      this.sendSecurityAlert(event)
    }
  }

  static async sendSecurityAlert(event: SecurityEvent) {
    // Send to monitoring service (Slack, PagerDuty, etc.)
    try {
      await fetch(process.env.SECURITY_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Security Event: ${event.type}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'User ID', value: event.userId || 'Anonymous', short: true },
              { title: 'IP Address', value: event.ipAddress, short: true },
              { title: 'Details', value: event.details, short: false }
            ]
          }]
        })
      })
    } catch (error) {
      securityLogger.error('Failed to send security alert', { error: error.message })
    }
  }
}

// Security middleware
app.use((req, res, next) => {
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
  ]

  const url = req.url.toLowerCase()
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url))

  if (isSuspicious) {
    SecurityMonitor.logSecurityEvent({
      type: 'suspicious_request',
      severity: 'medium',
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: `Suspicious URL pattern: ${req.url}`
    })
  }

  next()
})
```

### Failed Authentication Monitoring

```typescript
// Track failed login attempts
class AuthMonitor {
  private failedAttempts = new Map<string, FailedAttempt[]>()
  private readonly MAX_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

  async recordFailedAttempt(identifier: string, ipAddress: string) {
    const key = `${identifier}:${ipAddress}`
    const attempts = this.failedAttempts.get(key) || []
    
    attempts.push({
      timestamp: Date.now(),
      ipAddress
    })

    // Keep only recent attempts (last hour)
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp < 60 * 60 * 1000
    )

    this.failedAttempts.set(key, recentAttempts)

    // Check if account should be locked
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      await this.lockAccount(identifier)
      
      SecurityMonitor.logSecurityEvent({
        type: 'account_lockout',
        severity: 'high',
        userId: identifier,
        ipAddress,
        details: `Account locked after ${this.MAX_ATTEMPTS} failed attempts`
      })
    }
  }

  async lockAccount(userId: string) {
    await prisma.users.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + this.LOCKOUT_DURATION),
        loginAttempts: this.MAX_ATTEMPTS
      }
    })
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { lockedUntil: true }
    })

    return user?.lockedUntil ? new Date() < user.lockedUntil : false
  }
}
```

## Security Testing and Auditing

### Automated Security Testing

```typescript
// Security test suite
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = ['123456', 'password', 'qwerty']
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'Test',
            lastName: 'User'
          })
        
        expect(response.status).toBe(400)
        expect(response.body.error).toContain('Password')
      }
    })

    it('should prevent brute force attacks', async () => {
      const attempts = []
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        )
      }
      
      const responses = await Promise.all(attempts)
      
      // Last attempt should be rate limited
      expect(responses[5].status).toBe(429)
    })
  })

  describe('Input Validation', () => {
    it('should sanitize XSS attempts', async () => {
      const xssPayload = '<script>alert("xss")</script>'
      
      const response = await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: xssPayload,
          settings: { teamCount: 10 }
        })
      
      expect(response.status).toBe(400)
    })

    it('should prevent SQL injection in search', async () => {
      const sqlInjection = "'; DROP TABLE users; --"
      
      const response = await request(app)
        .get('/api/players')
        .query({ search: sqlInjection })
        .set('Authorization', `Bearer ${validToken}`)
      
      expect(response.status).toBe(200)
      // Should not return error about dropped table
    })
  })
})
```

### Security Headers Testing

```bash
#!/bin/bash
# security-headers-test.sh

echo "Testing security headers..."

DOMAIN="https://your-domain.com"

# Check Content Security Policy
echo "Checking CSP..."
curl -I "$DOMAIN" | grep -i "content-security-policy"

# Check HSTS
echo "Checking HSTS..."
curl -I "$DOMAIN" | grep -i "strict-transport-security"

# Check X-Frame-Options
echo "Checking X-Frame-Options..."
curl -I "$DOMAIN" | grep -i "x-frame-options"

# Check X-Content-Type-Options
echo "Checking X-Content-Type-Options..."
curl -I "$DOMAIN" | grep -i "x-content-type-options"

# Check X-XSS-Protection
echo "Checking X-XSS-Protection..."
curl -I "$DOMAIN" | grep -i "x-xss-protection"
```

## Security Checklist

### Pre-Deployment Security Checklist

```checklist
Authentication & Authorization:
- [ ] Strong password requirements enforced
- [ ] Multi-factor authentication implemented
- [ ] JWT tokens properly secured with strong secrets
- [ ] Session management with secure cookies
- [ ] Account lockout after failed attempts
- [ ] Proper role-based access control

Input Validation:
- [ ] All user inputs validated with Zod schemas
- [ ] SQL injection prevention with Prisma ORM
- [ ] XSS prevention with input sanitization
- [ ] File upload validation and restrictions
- [ ] Rate limiting on all endpoints
- [ ] CSRF protection implemented

Data Protection:
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced in production
- [ ] Secure headers configured (CSP, HSTS, etc.)
- [ ] Database access properly secured
- [ ] Secrets management implemented
- [ ] Data backup and recovery procedures

Infrastructure Security:
- [ ] Web Application Firewall configured
- [ ] DDoS protection enabled
- [ ] Security monitoring and alerting
- [ ] Regular security audits scheduled
- [ ] Incident response plan documented
- [ ] Compliance requirements met

Development Security:
- [ ] Security linting in CI/CD pipeline
- [ ] Dependency vulnerability scanning
- [ ] Code review process includes security checks
- [ ] Security testing automated
- [ ] Secrets not committed to repository
- [ ] Security documentation up to date
```

### Production Security Monitoring

```typescript
// Security dashboard metrics
export class SecurityDashboard {
  async getSecurityMetrics() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const [
      failedLogins,
      blockedIPs,
      suspiciousRequests,
      rateLimitHits
    ] = await Promise.all([
      this.getFailedLoginCount(last24Hours),
      this.getBlockedIPCount(last24Hours),
      this.getSuspiciousRequestCount(last24Hours),
      this.getRateLimitHitCount(last24Hours)
    ])

    return {
      failedLogins,
      blockedIPs,
      suspiciousRequests,
      rateLimitHits,
      securityScore: this.calculateSecurityScore({
        failedLogins,
        blockedIPs,
        suspiciousRequests,
        rateLimitHits
      })
    }
  }

  private calculateSecurityScore(metrics: SecurityMetrics): number {
    let score = 100
    
    // Deduct points for security incidents
    score -= Math.min(metrics.failedLogins * 0.1, 20)
    score -= Math.min(metrics.suspiciousRequests * 0.5, 30)
    score -= Math.min(metrics.blockedIPs * 2, 25)
    
    return Math.max(score, 0)
  }
}
```

---

*This security guide provides comprehensive protection strategies for AstralField v3.0, ensuring user data protection, system integrity, and compliance with security best practices.*