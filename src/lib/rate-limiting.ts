import { NextRequest } from 'next/server';

// Rate limiting configuration interface
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

// Rate limit store interface
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lastRequest: number;
  };
}

// In-memory rate limit store (use Redis in production for multi-instance deployments)
const rateLimitStore: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

// Default rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  default: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  },
  
  // Authentication endpoints (stricter)
  auth: {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
  },
  
  // Public data endpoints (more lenient)
  public: {
    maxRequests: 200,
    windowMs: 900000, // 15 minutes
  },
  
  // Admin endpoints (moderate)
  admin: {
    maxRequests: 50,
    windowMs: 900000, // 15 minutes
  },
  
  // Health check endpoints (very lenient)
  health: {
    maxRequests: 1000,
    windowMs: 900000, // 15 minutes
  },
  
  // Write operations (stricter)
  write: {
    maxRequests: 30,
    windowMs: 900000, // 15 minutes
  },
  
  // Upload endpoints (very strict)
  upload: {
    maxRequests: 10,
    windowMs: 3600000, // 1 hour
  },
};

// Default key generator - uses IP address
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return `rate_limit:${ip}`;
}

// Main rate limiting function
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.default
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(request);
  
  // Get or create rate limit entry
  let entry = rateLimitStore[key];
  
  if (!entry || entry.resetTime <= now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      lastRequest: now,
    };
  }
  
  // Increment request count
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore[key] = entry;
  
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const retryAfter = allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000);
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    retryAfter,
  };
}

// Rate limit middleware function
export function createRateLimitMiddleware(
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.default
) {
  return function(request: NextRequest) {
    const result = checkRateLimit(request, config);
    
    const headers = new Headers({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });
    
    if (!result.allowed && result.retryAfter) {
      headers.set('Retry-After', result.retryAfter.toString());
    }
    
    return {
      allowed: result.allowed,
      headers,
      retryAfter: result.retryAfter,
    };
  };
}

// Enhanced rate limiting with different strategies
export class RateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  // Check if request is allowed
  check(request: NextRequest): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    headers: Record<string, string>;
  } {
    const result = checkRateLimit(request, this.config);
    
    const headers = {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-Policy': `${this.config.maxRequests};w=${Math.floor(this.config.windowMs / 1000)}`,
    };
    
    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }
    
    return {
      ...result,
      headers,
    };
  }
  
  // Get current status without incrementing
  status(request: NextRequest): {
    remaining: number;
    resetTime: number;
    isLimited: boolean;
  } {
    const keyGenerator = this.config.keyGenerator || defaultKeyGenerator;
    const key = keyGenerator(request);
    const now = Date.now();
    
    const entry = rateLimitStore[key];
    
    if (!entry || entry.resetTime <= now) {
      return {
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        isLimited: false,
      };
    }
    
    return {
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      isLimited: entry.count >= this.config.maxRequests,
    };
  }
  
  // Reset rate limit for a specific key
  reset(request: NextRequest): void {
    const keyGenerator = this.config.keyGenerator || defaultKeyGenerator;
    const key = keyGenerator(request);
    delete rateLimitStore[key];
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  default: new RateLimiter(RATE_LIMIT_CONFIGS.default),
  auth: new RateLimiter(RATE_LIMIT_CONFIGS.auth),
  public: new RateLimiter(RATE_LIMIT_CONFIGS.public),
  admin: new RateLimiter(RATE_LIMIT_CONFIGS.admin),
  health: new RateLimiter(RATE_LIMIT_CONFIGS.health),
  write: new RateLimiter(RATE_LIMIT_CONFIGS.write),
  upload: new RateLimiter(RATE_LIMIT_CONFIGS.upload),
};

// Advanced rate limiting with user-based keys
export function createUserRateLimiter(userId: string, config: RateLimitConfig) {
  return new RateLimiter({
    ...config,
    keyGenerator: () => `rate_limit:user:${userId}`,
  });
}

// Advanced rate limiting with endpoint-based keys
export function createEndpointRateLimiter(endpoint: string, config: RateLimitConfig) {
  return new RateLimiter({
    ...config,
    keyGenerator: (request) => {
      const ip = defaultKeyGenerator(request).replace('rate_limit:', '');
      return `rate_limit:endpoint:${endpoint}:${ip}`;
    },
  });
}

// Get rate limit statistics
export function getRateLimitStats(): {
  totalKeys: number;
  activeKeys: number;
  topAbusers: Array<{ key: string; count: number; resetTime: number }>;
} {
  const now = Date.now();
  const activeEntries = Object.entries(rateLimitStore)
    .filter(([_, entry]) => entry.resetTime > now);
  
  const topAbusers = activeEntries
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([key, entry]) => ({
      key: key.replace('rate_limit:', ''),
      count: entry.count,
      resetTime: entry.resetTime,
    }));
  
  return {
    totalKeys: Object.keys(rateLimitStore).length,
    activeKeys: activeEntries.length,
    topAbusers,
  };
}

// Export types
export type { RateLimitConfig, RateLimitStore };