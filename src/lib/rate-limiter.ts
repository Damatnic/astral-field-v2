import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (record.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Include user agent for additional uniqueness
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    return `${ip}:${userAgent}`;
  }

  async checkLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const identifier = this.getClientIdentifier(request);
    const now = Date.now();
    
    let record = this.requests.get(identifier);
    
    if (!record || record.resetTime < now) {
      // Create new record
      record = {
        count: 1,
        resetTime: now + config.windowMs
      };
      this.requests.set(identifier, record);
      return { allowed: true };
    }
    
    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { 
        allowed: false, 
        retryAfter 
      };
    }
    
    // Increment count
    record.count++;
    return { allowed: true };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

// Middleware function for rate limiting
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const limiter = getRateLimiter();
  const { allowed, retryAfter } = await limiter.checkLimit(request, config);
  
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: config.message || 'Too many requests. Please try again later.',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + (retryAfter || 0) * 1000)
        }
      }
    );
  }
  
  return handler();
}

// Bot protection functionality
class BotProtection {
  private suspiciousIps = new Map<string, number>();
  private blockedIps = new Set<string>();

  constructor(
    private suspiciousThreshold = 10,
    private blockThreshold = 50,
    private blockDuration = 24 * 60 * 60 * 1000 // 24 hours
  ) {}

  async checkRequest(req: NextRequest): Promise<{ allowed: boolean; reason?: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Check if IP is blocked
    if (this.blockedIps.has(ip)) {
      return { allowed: false, reason: 'IP blocked' };
    }

    // Bot detection heuristics
    const botScore = this.calculateBotScore(req, userAgent);
    
    if (botScore > this.blockThreshold) {
      this.blockIp(ip);
      return { allowed: false, reason: 'Automated traffic detected' };
    }

    if (botScore > this.suspiciousThreshold) {
      this.flagSuspiciousIp(ip);
    }

    return { allowed: true };
  }

  private calculateBotScore(req: NextRequest, userAgent: string): number {
    let score = 0;

    // No user agent
    if (!userAgent) score += 20;

    // Common bot user agents
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /axios/i,
    ];
    
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      score += 15;
    }

    // Suspicious headers
    const referer = req.headers.get('referer');
    if (!referer) score += 5;

    const acceptLanguage = req.headers.get('accept-language');
    if (!acceptLanguage) score += 5;

    // High frequency from same IP
    const ip = this.getClientIp(req);
    const suspiciousCount = this.suspiciousIps.get(ip) || 0;
    score += Math.min(suspiciousCount * 2, 30);

    return score;
  }

  private getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  }

  private flagSuspiciousIp(ip: string): void {
    const current = this.suspiciousIps.get(ip) || 0;
    this.suspiciousIps.set(ip, current + 1);
  }

  private blockIp(ip: string): void {
    this.blockedIps.add(ip);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIps.delete(ip);
      this.suspiciousIps.delete(ip);
    }, this.blockDuration);
  }

  unblockIp(ip: string): void {
    this.blockedIps.delete(ip);
    this.suspiciousIps.delete(ip);
  }

  getBlockedIps(): string[] {
    return Array.from(this.blockedIps);
  }
}

// Global bot protection instance
export const botProtection = new BotProtection();

// Preset configurations
export const RATE_LIMIT_CONFIGS = {
  // Strict limit for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  
  // Moderate limit for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'API rate limit exceeded. Please slow down your requests.'
  },
  
  // Lenient limit for read-only endpoints
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests. Please try again shortly.'
  },
  
  // Very strict limit for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
    message: 'Too many password reset attempts. Please try again later.'
  }
};