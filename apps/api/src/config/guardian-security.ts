/**
 * Guardian Security Configuration
 * Enterprise-grade security configuration for Astral Field
 */

import helmet from 'helmet'
import { CorsOptions } from 'cors'
import { Application } from 'express'
import { securityMonitoringMiddleware } from '../middleware/security-monitor'
import { createValidationMiddleware } from '../middleware/security-validation'
import GuardianAuthSecurity, { createAuthMiddleware } from '../middleware/auth-security'
import { 
  apiRateLimit, 
  authRateLimit, 
  registrationRateLimit,
  ipBlockingMiddleware,
  geolocationProtection
} from '../middleware/rate-limiting'
import { 
  csrfMiddleware, 
  secureHeadersMiddleware,
  secureCookieConfig
} from '../middleware/csrf-protection'

interface SecurityConfig {
  enableCSRF: boolean
  enableRateLimiting: boolean
  enableInputValidation: boolean
  enableSecurityHeaders: boolean
  enableGeoBlocking: boolean
  blockedCountries: string[]
  corsOrigins: string[]
  trustProxy: boolean
  sessionSecurity: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    maxAge: number
  }
}

const defaultSecurityConfig: SecurityConfig = {
  enableCSRF: true,
  enableRateLimiting: true,
  enableInputValidation: true,
  enableSecurityHeaders: true,
  enableGeoBlocking: false, // Disable by default, enable if needed
  blockedCountries: [], // Add country codes if needed: ['CN', 'RU', 'KP']
  corsOrigins: [
    process.env.WEB_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://astral-field.com', // Production domain
    'https://www.astral-field.com'
  ],
  trustProxy: process.env.NODE_ENV === 'production',
  sessionSecurity: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}

export class GuardianSecurityManager {
  private config: SecurityConfig
  private authSecurity: GuardianAuthSecurity

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config }
    this.authSecurity = new GuardianAuthSecurity()
  }

  /**
   * Guardian Security: Configure CORS with security best practices
   */
  getCorsConfig(): CorsOptions {
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true)
        
        if (this.config.corsOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS policy'))
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-Requested-With'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      maxAge: 86400 // 24 hours
    }
  }

  /**
   * Guardian Security: Configure Helmet with comprehensive security headers
   */
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Only if absolutely necessary
            'https://cdn.jsdelivr.net', // For any CDN scripts
            'https://unpkg.com'
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // For styled-components/emotion
            'https://fonts.googleapis.com'
          ],
          imgSrc: [
            "'self'",
            'data:',
            'https:',
            'https://images.unsplash.com', // For avatars
            'https://via.placeholder.com' // For placeholders
          ],
          connectSrc: [
            "'self'",
            process.env.API_URL || 'http://localhost:3001',
            'wss://localhost:3001', // WebSocket connections
            'https://api.astral-field.com'
          ],
          fontSrc: [
            "'self'",
            'https://fonts.gstatic.com'
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          childSrc: ["'none'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"]
        },
        reportOnly: process.env.NODE_ENV === 'development'
      },
      crossOriginEmbedderPolicy: false, // Disable if causing issues
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    })
  }

  /**
   * Guardian Security: Apply all security middleware to Express app
   */
  applySecurityMiddleware(app: Application): void {
    // Trust proxy if in production (for proper IP detection)
    if (this.config.trustProxy) {
      app.set('trust proxy', 1)
    }

    // Security monitoring (should be first)
    app.use(securityMonitoringMiddleware())

    // IP blocking (early security check)
    app.use(ipBlockingMiddleware())

    // Geolocation blocking if enabled
    if (this.config.enableGeoBlocking && this.config.blockedCountries.length > 0) {
      app.use(geolocationProtection(this.config.blockedCountries))
    }

    // Security headers
    if (this.config.enableSecurityHeaders) {
      app.use(this.getHelmetConfig())
      app.use(secureHeadersMiddleware)
    }

    // Input validation and sanitization
    if (this.config.enableInputValidation) {
      app.use(createValidationMiddleware())
    }

    // Rate limiting
    if (this.config.enableRateLimiting) {
      // Apply different rate limits to different routes
      app.use('/api/auth/login', authRateLimit)
      app.use('/api/auth/register', registrationRateLimit)
      app.use('/api/', apiRateLimit)
    }

    // CSRF protection (for web forms, not API with proper auth)
    if (this.config.enableCSRF) {
      // Only apply CSRF to non-API routes or specific endpoints
      app.use((req, res, next) => {
        if (req.path.startsWith('/api/auth/csrf-token') || 
            req.path.startsWith('/web/')) {
          return csrfMiddleware(req, res, next)
        }
        next()
      })
    }
  }

  /**
   * Guardian Security: Create protected route middleware
   */
  createProtectedRoute() {
    return createAuthMiddleware()
  }

  /**
   * Guardian Security: Get session configuration
   */
  getSessionConfig() {
    return {
      ...this.config.sessionSecurity,
      name: process.env.NODE_ENV === 'production' ? 
        '__Secure-session' : 'session',
      secret: process.env.SESSION_SECRET || 'change-this-in-production',
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset expiry on each request
      cookie: {
        ...this.config.sessionSecurity,
        domain: process.env.COOKIE_DOMAIN || undefined
      }
    }
  }

  /**
   * Guardian Security: Generate security report
   */
  getSecurityStatus() {
    return {
      guardian: {
        version: '1.0.0',
        status: 'ACTIVE',
        protections: {
          csrfProtection: this.config.enableCSRF,
          rateLimiting: this.config.enableRateLimiting,
          inputValidation: this.config.enableInputValidation,
          securityHeaders: this.config.enableSecurityHeaders,
          geoBlocking: this.config.enableGeoBlocking,
          ipBlocking: true,
          bruteForcePrevention: true,
          sessionSecurity: true,
          passwordHashing: 'bcrypt-14-rounds',
          tokenSecurity: 'JWT-HS256-enhanced',
          sqlInjectionPrevention: true,
          xssProtection: true,
          pathTraversalPrevention: true
        },
        configuration: {
          trustProxy: this.config.trustProxy,
          corsOrigins: this.config.corsOrigins.length,
          blockedCountries: this.config.blockedCountries.length,
          sessionTimeout: this.config.sessionSecurity.maxAge,
          environment: process.env.NODE_ENV
        }
      },
      timestamp: new Date().toISOString()
    }
  }
}

// Create default security manager instance
const guardianSecurity = new GuardianSecurityManager()

/**
 * Guardian Security: Environment-specific configurations
 */
export const securityConfigs = {
  development: new GuardianSecurityManager({
    enableCSRF: false, // Disable CSRF in development for easier testing
    enableGeoBlocking: false,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    trustProxy: false
  }),
  
  production: new GuardianSecurityManager({
    enableCSRF: true,
    enableGeoBlocking: false, // Enable if needed
    corsOrigins: [
      'https://astral-field.com',
      'https://www.astral-field.com',
      process.env.WEB_URL || 'https://astral-field.com'
    ],
    trustProxy: true,
    blockedCountries: [] // Add if geo-blocking needed
  }),
  
  test: new GuardianSecurityManager({
    enableCSRF: false,
    enableRateLimiting: false, // Disable rate limiting in tests
    enableGeoBlocking: false,
    corsOrigins: ['http://localhost:3000'],
    trustProxy: false
  })
}

/**
 * Guardian Security: Get configuration for current environment
 */
export function getGuardianSecurity(): GuardianSecurityManager {
  const env = process.env.NODE_ENV || 'development'
  return securityConfigs[env as keyof typeof securityConfigs] || securityConfigs.development
}

export { defaultSecurityConfig, secureCookieConfig }
export default guardianSecurity
