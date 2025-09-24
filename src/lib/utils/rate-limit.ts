import type { NextApiResponse } from 'next';
import { redis } from '@/lib/cache/redis-client';

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Maximum unique tokens per interval
}

interface RateLimitResult {
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

export class RateLimit {
  private interval: number;
  private uniqueTokenPerInterval: number;

  constructor(options: RateLimitOptions) {
    this.interval = options.interval;
    this.uniqueTokenPerInterval = options.uniqueTokenPerInterval;
  }

  async check(
    res: NextApiResponse, 
    limit: number, 
    token: string
  ): Promise<RateLimitResult> {
    try {
      const tokenKey = `rate-limit:${token}`;
      const windowKey = `rate-limit:window:${Math.floor(Date.now() / this.interval)}`;
      
      // Get current request count for this token
      const requests = await redis.incr(tokenKey);
      
      // Set expiration on first request
      if (requests === 1) {
        await redis.expire(tokenKey, Math.ceil(this.interval / 1000));
      }

      // Track unique tokens in this window
      await redis.sadd(windowKey, token);
      await redis.expire(windowKey, Math.ceil(this.interval / 1000));
      
      const uniqueTokens = await redis.scard(windowKey);
      
      // Check if we've exceeded limits
      const success = requests <= limit && uniqueTokens <= this.uniqueTokenPerInterval;
      const reset = Date.now() + this.interval;
      
      const result: RateLimitResult = {
        limit,
        remaining: Math.max(0, limit - requests),
        reset,
        success
      };

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', reset);

      if (!success) {
        res.setHeader('Retry-After', Math.ceil(this.interval / 1000));
        throw new Error('Rate limit exceeded');
      }

      return result;
    } catch (error) {
      // If Redis is unavailable, allow the request but log the error
      if (error instanceof Error && error.message !== 'Rate limit exceeded') {
        console.error('Rate limiting error:', error);
        return {
          limit,
          remaining: limit - 1,
          reset: Date.now() + this.interval,
          success: true
        };
      }
      
      throw error;
    }
  }

  // Alternative check method that returns boolean for simpler usage
  async isAllowed(token: string, limit: number): Promise<boolean> {
    try {
      const tokenKey = `rate-limit:${token}`;
      const requests = await redis.get(tokenKey);
      const currentRequests = parseInt(requests || '0', 10);
      
      return currentRequests < limit;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true; // Allow request if rate limiting fails
    }
  }

  // Get current rate limit status without incrementing
  async getStatus(token: string, limit: number): Promise<RateLimitResult> {
    try {
      const tokenKey = `rate-limit:${token}`;
      const requests = await redis.get(tokenKey);
      const currentRequests = parseInt(requests || '0', 10);
      const ttl = await redis.ttl(tokenKey);
      
      return {
        limit,
        remaining: Math.max(0, limit - currentRequests),
        reset: Date.now() + (ttl * 1000),
        success: currentRequests < limit
      };
    } catch (error) {
      console.error('Rate limit status error:', error);
      return {
        limit,
        remaining: limit,
        reset: Date.now() + this.interval,
        success: true
      };
    }
  }

  // Reset rate limit for a specific token (admin function)
  async reset(token: string): Promise<void> {
    try {
      const tokenKey = `rate-limit:${token}`;
      await redis.del(tokenKey);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }
}

// Factory function for creating rate limiters
export function rateLimit(options: RateLimitOptions): RateLimit {
  return new RateLimit(options);
}

// Common rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints
  LOGIN: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 1000
  }),

  // API endpoints
  API_DEFAULT: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 1000
  }),

  // Feedback submission
  FEEDBACK: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500
  }),

  // Password reset
  PASSWORD_RESET: rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 100
  }),

  // Heavy operations (imports, exports)
  HEAVY_OPERATION: rateLimit({
    interval: 10 * 60 * 1000, // 10 minutes
    uniqueTokenPerInterval: 50
  })
};

// Middleware for automatic rate limiting
export function withRateLimit(
  rateLimiter: RateLimit,
  limit: number,
  getToken: (req: any) => string = (req) => req.ip || 'anonymous'
) {
  return async (req: any, res: NextApiResponse, next?: () => void) => {
    try {
      const token = getToken(req);
      await rateLimiter.check(res, limit, token);
      
      if (next) {
        next();
      }
    } catch (error) {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rateLimiter['interval'] / 1000)
      });
    }
  };
}