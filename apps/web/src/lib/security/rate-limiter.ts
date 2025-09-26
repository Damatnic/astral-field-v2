// Guardian Security: Enterprise-Grade Rate Limiting System
// Implements adaptive throttling, DDoS protection, and intrusion detection

interface RateLimitRule {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  blockDurationMs?: number // How long to block after limit exceeded
  skipSuccessful?: boolean // Whether to skip counting successful requests
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blockUntil?: number
  violations: number
  firstSeen: number
  lastSeen: number
}

interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  suspiciousActivity: number
  uniqueIPs: Set<string>
  riskScore: number
}

export class GuardianRateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private metrics: SecurityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousActivity: 0,
    uniqueIPs: new Set(),
    riskScore: 0
  }
  
  // Guardian Security: Predefined rate limit rules for different endpoints
  private rules: Record<string, RateLimitRule> = {
    // Authentication endpoints - strict limits
    'auth:login': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
    'auth:signup': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      blockDurationMs: 60 * 60 * 1000, // 1 hour block
    },
    'auth:password-reset': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 2,
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hour block
    },
    'auth:quick-login': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10,
      blockDurationMs: 10 * 60 * 1000, // 10 minute block
    },
    
    // API endpoints - moderate limits
    'api:general': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      blockDurationMs: 5 * 60 * 1000, // 5 minute block
    },
    'api:sensitive': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      blockDurationMs: 10 * 60 * 1000, // 10 minute block
    },
    
    // Global rate limit - DDoS protection
    'global': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000,
      blockDurationMs: 60 * 1000, // 1 minute block
    }
  }

  constructor() {
    // Guardian Security: Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    identifier: string, 
    ruleKey: string = 'api:general',
    metadata?: Record<string, any>
  ): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
    retryAfter?: number
    riskScore: number
  }> {
    const now = Date.now()
    const rule = this.rules[ruleKey] || this.rules['api:general']
    const key = `${ruleKey}:${identifier}`
    
    this.metrics.totalRequests++
    this.metrics.uniqueIPs.add(identifier)
    
    let entry = this.store.get(key)
    
    // Initialize entry if not exists
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + rule.windowMs,
        violations: 0,
        firstSeen: now,
        lastSeen: now
      }
      this.store.set(key, entry)
    }
    
    entry.lastSeen = now
    
    // Check if currently blocked
    if (entry.blockUntil && now < entry.blockUntil) {
      this.metrics.blockedRequests++
      return {
        allowed: false,
        limit: rule.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
        riskScore: this.calculateRiskScore(entry, metadata)
      }
    }
    
    // Reset window if expired
    if (now >= entry.resetTime) {
      entry.count = 0
      entry.resetTime = now + rule.windowMs
      entry.blockUntil = undefined
    }
    
    entry.count++
    
    // Check if limit exceeded
    if (entry.count > rule.maxRequests) {
      entry.violations++
      
      // Adaptive blocking duration based on violation history
      const blockDuration = this.calculateBlockDuration(rule, entry)
      entry.blockUntil = now + blockDuration
      
      this.metrics.blockedRequests++
      this.metrics.suspiciousActivity++
      
      // Log security event
      console.warn(`Rate limit exceeded for ${identifier} on ${ruleKey}`, {
        count: entry.count,
        limit: rule.maxRequests,
        violations: entry.violations,
        blockDuration: blockDuration / 1000,
        metadata
      })
      
      return {
        allowed: false,
        limit: rule.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil(blockDuration / 1000),
        riskScore: this.calculateRiskScore(entry, metadata)
      }
    }
    
    const remaining = Math.max(0, rule.maxRequests - entry.count)
    const riskScore = this.calculateRiskScore(entry, metadata)
    
    // Log high-risk activity
    if (riskScore > 0.8) {
      console.warn(`High-risk activity detected for ${identifier}`, {
        riskScore,
        count: entry.count,
        violations: entry.violations,
        metadata
      })
    }
    
    return {
      allowed: true,
      limit: rule.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      riskScore
    }
  }

  /**
   * Calculate adaptive block duration based on violation history
   */
  private calculateBlockDuration(rule: RateLimitRule, entry: RateLimitEntry): number {
    const baseDuration = rule.blockDurationMs || rule.windowMs
    
    // Exponential backoff for repeat offenders
    const multiplier = Math.min(Math.pow(2, entry.violations - 1), 16) // Cap at 16x
    
    return baseDuration * multiplier
  }

  /**
   * Calculate risk score based on behavior patterns
   */
  private calculateRiskScore(entry: RateLimitEntry, metadata?: Record<string, any>): number {
    let score = 0
    
    // High request frequency
    const requestRate = entry.count / Math.max(1, (entry.lastSeen - entry.firstSeen) / 1000)
    if (requestRate > 10) score += 0.3 // More than 10 requests per second
    else if (requestRate > 5) score += 0.2
    else if (requestRate > 2) score += 0.1
    
    // Violation history
    if (entry.violations > 5) score += 0.4
    else if (entry.violations > 2) score += 0.2
    else if (entry.violations > 0) score += 0.1
    
    // Pattern analysis from metadata
    if (metadata) {
      // Suspicious user agents
      if (metadata.userAgent && this.isSuspiciousUserAgent(metadata.userAgent)) {
        score += 0.3
      }
      
      // Suspicious patterns in requests
      if (metadata.path && this.isSuspiciousPath(metadata.path)) {
        score += 0.2
      }
      
      // Geographic anomalies (if location data available)
      if (metadata.country && this.isHighRiskCountry(metadata.country)) {
        score += 0.1
      }
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Check for suspicious user agents
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i,
      /scanner/i, /exploit/i, /hack/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  /**
   * Check for suspicious request paths
   */
  private isSuspiciousPath(path: string): boolean {
    const suspiciousPaths = [
      '/admin', '/wp-admin', '/.env', '/config',
      '/phpMyAdmin', '/phpmyadmin', '/mysql',
      '/shell', '/cmd', '/exec', '/upload',
      '/../', '/..\\', '/etc/', '/proc/'
    ]
    
    return suspiciousPaths.some(suspiciousPath => 
      path.toLowerCase().includes(suspiciousPath.toLowerCase())
    )
  }

  /**
   * Check for high-risk countries (basic implementation)
   */
  private isHighRiskCountry(country: string): boolean {
    // This is a simplified example - in production, use threat intelligence feeds
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR']
    return highRiskCountries.includes(country.toUpperCase())
  }

  /**
   * Get current security metrics
   */
  getMetrics(): SecurityMetrics & {
    averageRiskScore: number
    totalActiveConnections: number
  } {
    const activeEntries = Array.from(this.store.values())
    const totalRiskScore = activeEntries.reduce((sum, entry) => 
      sum + this.calculateRiskScore(entry), 0)
    
    return {
      ...this.metrics,
      averageRiskScore: activeEntries.length > 0 ? totalRiskScore / activeEntries.length : 0,
      totalActiveConnections: this.store.size
    }
  }

  /**
   * Block IP immediately (emergency use)
   */
  blockIdentifier(identifier: string, durationMs: number = 60 * 60 * 1000): void {
    const now = Date.now()
    const key = `emergency:${identifier}`
    
    this.store.set(key, {
      count: 999,
      resetTime: now + durationMs,
      blockUntil: now + durationMs,
      violations: 999,
      firstSeen: now,
      lastSeen: now
    })
    
    console.warn(`Emergency block activated for ${identifier}`, {
      duration: durationMs / 1000,
      reason: 'Manual block'
    })
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, entry] of this.store.entries()) {
      // Remove entries that are expired and not blocked
      if (now >= entry.resetTime && (!entry.blockUntil || now >= entry.blockUntil)) {
        this.store.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired rate limit entries`)
    }
  }

  /**
   * Add custom rate limit rule
   */
  addRule(key: string, rule: RateLimitRule): void {
    this.rules[key] = rule
  }

  /**
   * Get all active rate limit entries (for monitoring)
   */
  getActiveEntries(): Array<{
    key: string
    count: number
    remaining: number
    resetTime: number
    isBlocked: boolean
    violations: number
    riskScore: number
  }> {
    const now = Date.now()
    const entries: any[] = []
    
    for (const [key, entry] of this.store.entries()) {
      const [ruleKey] = key.split(':')
      const rule = this.rules[ruleKey] || this.rules['api:general']
      const remaining = Math.max(0, rule.maxRequests - entry.count)
      const isBlocked = !!(entry.blockUntil && now < entry.blockUntil)
      const riskScore = this.calculateRiskScore(entry)
      
      entries.push({
        key,
        count: entry.count,
        remaining,
        resetTime: entry.resetTime,
        isBlocked,
        violations: entry.violations,
        riskScore
      })
    }
    
    return entries.sort((a, b) => b.riskScore - a.riskScore)
  }
}

// Guardian Security: Global rate limiter instance
export const rateLimiter = new GuardianRateLimiter()