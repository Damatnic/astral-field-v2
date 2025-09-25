/**
 * Enterprise Rate Limiting System for AstralField API Protection
 * Provides multiple rate limiting strategies and comprehensive attack prevention
 */

import { redis } from './redis/client';
import { logger } from './logger';
import { RateLimitError } from './error-handling';

// Rate limit configuration interface
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests in the window
  keyGenerator?: (req: Request) => string; // Custom key generator
  message?: string;      // Custom error message
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
  store?: 'memory' | 'redis';       // Storage backend
}

// In-memory rate limit storage for fallback
class MemoryStore {
  private requests = new Map<string, Array<number>>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this key
    const existing = this.requests.get(key) || [];
    
    // Filter out requests outside the current window
    const validRequests = existing.filter(time => time > windowStart);
    
    // Add current request
    validRequests.push(now);
    
    // Update the store
    this.requests.set(key, validRequests);
    
    return {
      count: validRequests.length,
      resetTime: now + windowMs
    };
  }

  async reset(key: string): Promise<void> {
    this.requests.delete(key);
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > now - 3600000); // Keep last hour
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Redis-based rate limit storage
class RedisStore {
  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rate_limit:${key}`;
    
    try {
      // Use Redis sorted set for time-based tracking
      // Remove old entries
      await redis.del(`${redisKey}:temp`);
      
      // Get current count by counting entries in the time window
      const currentRequests = await redis.get<number>(`${redisKey}:count`) || 0;
      const lastWindowReset = await redis.get<number>(`${redisKey}:window`) || 0;
      
      // If we're in a new window, reset
      if (now - lastWindowReset >= windowMs) {
        await redis.set(`${redisKey}:count`, 1, Math.ceil(windowMs / 1000));
        await redis.set(`${redisKey}:window`, now, Math.ceil(windowMs / 1000));
        return { count: 1, resetTime: now + windowMs };
      }
      
      // Increment counter
      const newCount = currentRequests + 1;
      await redis.set(`${redisKey}:count`, newCount, Math.ceil(windowMs / 1000));
      
      return { 
        count: newCount, 
        resetTime: lastWindowReset + windowMs 
      };
      
    } catch (error) {
      logger.warn('Redis rate limiting failed, falling back to memory', { error });
      // Fallback to memory store
      return memoryStore.increment(key, windowMs);
    }
  }

  async reset(key: string): Promise<void> {
    const redisKey = `rate_limit:${key}`;
    await redis.del(`${redisKey}:count`);
    await redis.del(`${redisKey}:window`);
  }
}

// Shared instances
const memoryStore = new MemoryStore();
const redisStore = new RedisStore();

// Cleanup memory store periodically
if (typeof global !== 'undefined') {
  setInterval(() => {
    memoryStore.cleanup();
  }, 300000); // Clean every 5 minutes
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private store: MemoryStore | RedisStore;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      message: config.message || 'Too many requests',
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      store: config.store || 'redis',
    };

    this.store = this.config.store === 'redis' ? redisStore : memoryStore;
  }

  private defaultKeyGenerator(req: Request): string {
    // Extract IP from various headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Check if request should be rate limited
   */
  async check(req: Request, identifier?: string): Promise<{ 
    allowed: boolean; 
    count: number; 
    remaining: number; 
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = identifier || this.config.keyGenerator(req);
    
    try {
      const result = await this.store.increment(key, this.config.windowMs);
      
      const allowed = result.count <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - result.count);
      const retryAfter = allowed ? undefined : Math.ceil((result.resetTime - Date.now()) / 1000);

      // Log rate limit violations
      if (!allowed) {
        logger.warn({
          key,
          count: result.count,
          maxRequests: this.config.maxRequests,
          windowMs: this.config.windowMs,
          userAgent: req.headers.get('user-agent'),
          url: req.url,
        }, 'Rate limit exceeded');
      }

      return {
        allowed,
        count: result.count,
        remaining,
        resetTime: result.resetTime,
        retryAfter,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error, key });
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        count: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(req: Request, identifier?: string): Promise<void> {
    const key = identifier || this.config.keyGenerator(req);
    await this.store.reset(key);
  }
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  AUTH: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts',
  }),

  // General API limits
  API: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),

  // Stricter limits for expensive operations
  HEAVY: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),

  // File upload limits
  UPLOAD: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  }),

  // Registration/signup limits
  REGISTRATION: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  }),

  // Password reset limits
  PASSWORD_RESET: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  }),

  // Search/query limits
  SEARCH: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),
} as const;

/**
 * Rate limiting middleware for API routes
 */
export function rateLimitMiddleware(limiter: RateLimiter) {
  return async (req: Request): Promise<void> => {
    const result = await limiter.check(req);
    
    if (!result.allowed) {
      throw new RateLimitError(
        'Rate limit exceeded',
        {
          count: result.count,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
        }
      );
    }
  };
}

/**
 * User-specific rate limiting (requires authentication)
 */
export function createUserRateLimiter(config: RateLimitConfig) {
  return new RateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      // Try to extract user ID from headers or JWT token
      const authHeader = req.headers.get('authorization');
      const userId = extractUserIdFromAuth(authHeader);
      return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
    },
  });
}

/**
 * Advanced bot protection
 */
export class BotProtection {
  private suspiciousIps = new Map<string, number>();
  private blockedIps = new Set<string>();

  constructor(
    private suspiciousThreshold = 10,
    private blockThreshold = 50,
    private blockDuration = 24 * 60 * 60 * 1000 // 24 hours
  ) {}

  async checkRequest(req: Request): Promise<{ allowed: boolean; reason?: string }> {
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Check if IP is blocked
    if (this.blockedIps.has(ip)) {
      return { allowed: false, reason: 'IP blocked' };
    }

    // Bot detection heuristics
    const botScore = this.calculateBotScore(req, userAgent);
    
    if (botScore > this.blockThreshold) {
      this.blockIp(ip);
      logger.warn({
        ip,
        userAgent,
        botScore,
        url: req.url,
      }, 'IP blocked for bot-like behavior');
      return { allowed: false, reason: 'Automated traffic detected' };
    }

    if (botScore > this.suspiciousThreshold) {
      this.flagSuspiciousIp(ip);
      logger.warn({
        ip,
        userAgent,
        botScore,
        url: req.url,
      }, 'Suspicious bot-like behavior detected');
    }

    return { allowed: true };
  }

  private calculateBotScore(req: Request, userAgent: string): number {
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
    const ip = getClientIp(req);
    const suspiciousCount = this.suspiciousIps.get(ip) || 0;
    score += Math.min(suspiciousCount * 2, 30);

    return score;
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

/**
 * Utility functions
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
}

function extractUserIdFromAuth(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  try {
    // This would need to be implemented based on your auth system
    // For JWT tokens, you'd decode the token and extract the user ID
    const token = authHeader.replace('Bearer ', '');
    // TODO: Implement JWT decoding to extract user ID
    return null;
  } catch {
    return null;
  }
}

/**
 * Rate limit response headers
 */
export function addRateLimitHeaders(
  response: Response,
  result: { count: number; remaining: number; resetTime: number; retryAfter?: number }
): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Limit', String(result.count + result.remaining));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  
  if (result.retryAfter) {
    headers.set('Retry-After', String(result.retryAfter));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default RateLimiter;