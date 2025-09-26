import { NextRequest, NextResponse } from 'next/server'
import { rateLimiter } from './rate-limiter'

// Guardian Security: Rate limiting middleware for API routes

export interface RateLimitConfig {
  ruleKey?: string
  skipOnSuccess?: boolean
  customIdentifier?: (req: NextRequest) => string
  onRateLimit?: (req: NextRequest, result: any) => void
}

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(config: RateLimitConfig = {}) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Extract client identifier
      const identifier = config.customIdentifier 
        ? config.customIdentifier(request)
        : getClientIdentifier(request)
      
      // Determine rule key based on path
      const ruleKey = config.ruleKey || getRuleKeyFromPath(request.nextUrl.pathname)
      
      // Gather metadata for risk assessment
      const metadata = {
        userAgent: request.headers.get('user-agent') || 'unknown',
        path: request.nextUrl.pathname,
        method: request.method,
        referer: request.headers.get('referer'),
        country: request.headers.get('cf-ipcountry') || request.headers.get('x-country'), // Cloudflare or custom header
        timestamp: new Date().toISOString()
      }
      
      // Check rate limit
      const result = await rateLimiter.checkRateLimit(identifier, ruleKey, metadata)
      
      if (!result.allowed) {
        // Rate limit exceeded
        if (config.onRateLimit) {
          config.onRateLimit(request, result)
        }
        
        // Log security event
        console.warn('Rate limit exceeded', {
          identifier,
          ruleKey,
          riskScore: result.riskScore,
          retryAfter: result.retryAfter,
          metadata
        })
        
        return new NextResponse(
          JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter,
            riskScore: result.riskScore > 0.8 ? 'HIGH' : result.riskScore > 0.5 ? 'MEDIUM' : 'LOW'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              'Retry-After': (result.retryAfter || 60).toString(),
              'X-Security-Risk': result.riskScore > 0.8 ? 'HIGH' : result.riskScore > 0.5 ? 'MEDIUM' : 'LOW'
            }
          }
        )
      }
      
      // Execute the handler
      const response = await handler(request)
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())
      
      if (result.riskScore > 0.5) {
        response.headers.set('X-Security-Risk', result.riskScore > 0.8 ? 'HIGH' : 'MEDIUM')
      }
      
      return response
      
    } catch (error) {
      console.error('Rate limiting middleware error:', error)
      // Don't block requests if rate limiter fails
      return handler(request)
    }
  }
}

/**
 * Extract client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  let ip = 'unknown'
  
  if (cfConnectingIp) {
    ip = cfConnectingIp
  } else if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else if (realIp) {
    ip = realIp
  } else if (request.ip) {
    ip = request.ip
  }
  
  // For authenticated requests, could use user ID instead of IP
  // This would require extracting from session/token
  
  return ip
}

/**
 * Determine rate limit rule based on request path
 */
function getRuleKeyFromPath(pathname: string): string {
  // Authentication endpoints
  if (pathname.includes('/api/auth/signin') || pathname.includes('/api/auth/callback')) {
    return 'auth:login'
  }
  if (pathname.includes('/api/auth/signup')) {
    return 'auth:signup'
  }
  if (pathname.includes('/api/auth/reset-password')) {
    return 'auth:password-reset'
  }
  if (pathname.includes('/api/auth/quick-login')) {
    return 'auth:quick-login'
  }
  
  // Sensitive API endpoints
  if (pathname.includes('/api/admin') || 
      pathname.includes('/api/users') ||
      pathname.includes('/api/settings')) {
    return 'api:sensitive'
  }
  
  // General API endpoints
  if (pathname.startsWith('/api/')) {
    return 'api:general'
  }
  
  // Global rate limit for everything else
  return 'global'
}

/**
 * Simplified rate limit decorator for API routes
 */
export function rateLimit(ruleKey?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      const middleware = withRateLimit({ ruleKey })
      return middleware(request, async (req) => originalMethod.call(this, req, ...args))
    }
    
    return descriptor
  }
}

/**
 * Emergency block function for immediate threat response
 */
export function emergencyBlock(identifier: string, durationMs: number = 60 * 60 * 1000) {
  rateLimiter.blockIdentifier(identifier, durationMs)
  
  console.error(`EMERGENCY BLOCK ACTIVATED: ${identifier}`, {
    duration: durationMs / 1000,
    timestamp: new Date().toISOString(),
    reason: 'Emergency security response'
  })
}

/**
 * Get current rate limiting metrics
 */
export function getRateLimitMetrics() {
  return rateLimiter.getMetrics()
}

/**
 * Get active rate limit entries for monitoring
 */
export function getActiveRateLimits() {
  return rateLimiter.getActiveEntries()
}