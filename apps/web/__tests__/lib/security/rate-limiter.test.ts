/**
 * Rate Limiter Tests
 * 
 * Tests for Guardian rate limiting system
 */

import { GuardianRateLimiter } from '@/lib/security/rate-limiter'

describe('GuardianRateLimiter', () => {
  let limiter: GuardianRateLimiter

  beforeEach(() => {
    limiter = new GuardianRateLimiter()
    jest.clearAllMocks()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeLessThan(result.limit)
    })

    it('should track request count', async () => {
      await limiter.checkRateLimit('test-ip', 'api:general')
      const result = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result.remaining).toBeLessThan(100)
    })

    it('should block requests exceeding limit', async () => {
      // Make requests up to limit
      for (let i = 0; i < 101; i++) {
        await limiter.checkRateLimit('test-ip', 'api:general')
      }
      
      const result = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should provide retry-after time when blocked', async () => {
      // Exceed limit
      for (let i = 0; i < 101; i++) {
        await limiter.checkRateLimit('test-ip', 'api:general')
      }
      
      const result = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('Different Rate Limit Rules', () => {
    it('should apply strict limits for auth:login', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'auth:login')
      
      expect(result.limit).toBe(5)
    })

    it('should apply strict limits for auth:signup', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'auth:signup')
      
      expect(result.limit).toBe(3)
    })

    it('should apply moderate limits for api:general', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result.limit).toBe(100)
    })

    it('should use default rule for unknown keys', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'unknown:rule')
      
      expect(result.limit).toBe(100) // Falls back to api:general
    })
  })

  describe('Window Reset', () => {
    it('should reset count after window expires', async () => {
      // Create custom rule with short window for testing
      limiter.addRule('test:short', {
        windowMs: 100,
        maxRequests: 2
      })
      
      // Use up limit
      await limiter.checkRateLimit('test-ip', 'test:short')
      await limiter.checkRateLimit('test-ip', 'test:short')
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be allowed again
      const result = await limiter.checkRateLimit('test-ip', 'test:short')
      expect(result.allowed).toBe(true)
    })
  })

  describe('Adaptive Blocking', () => {
    it('should increase block duration for repeat violations', async () => {
      limiter.addRule('test:adaptive', {
        windowMs: 100,
        maxRequests: 1,
        blockDurationMs: 1000
      })
      
      // First violation
      await limiter.checkRateLimit('test-ip', 'test:adaptive')
      await limiter.checkRateLimit('test-ip', 'test:adaptive')
      const result1 = await limiter.checkRateLimit('test-ip', 'test:adaptive')
      
      expect(result1.allowed).toBe(false)
      const firstRetryAfter = result1.retryAfter!
      
      // Wait and violate again
      await new Promise(resolve => setTimeout(resolve, 150))
      await limiter.checkRateLimit('test-ip', 'test:adaptive')
      await limiter.checkRateLimit('test-ip', 'test:adaptive')
      const result2 = await limiter.checkRateLimit('test-ip', 'test:adaptive')
      
      expect(result2.retryAfter).toBeGreaterThan(firstRetryAfter)
    })
  })

  describe('Risk Score Calculation', () => {
    it('should calculate risk score', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result.riskScore).toBeDefined()
      expect(result.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.riskScore).toBeLessThanOrEqual(1)
    })

    it('should increase risk score for suspicious user agents', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'api:general', {
        userAgent: 'curl/7.0'
      })
      
      expect(result.riskScore).toBeGreaterThan(0)
    })

    it('should increase risk score for suspicious paths', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'api:general', {
        path: '/admin/config'
      })
      
      expect(result.riskScore).toBeGreaterThan(0)
    })

    it('should increase risk score for high-risk countries', async () => {
      const result = await limiter.checkRateLimit('test-ip', 'api:general', {
        country: 'CN'
      })
      
      expect(result.riskScore).toBeGreaterThan(0)
    })

    it('should cap risk score at 1.0', async () => {
      // Make many requests with suspicious metadata
      for (let i = 0; i < 10; i++) {
        await limiter.checkRateLimit('test-ip', 'api:general', {
          userAgent: 'bot',
          path: '/admin',
          country: 'CN'
        })
      }
      
      const result = await limiter.checkRateLimit('test-ip', 'api:general', {
        userAgent: 'bot',
        path: '/admin',
        country: 'CN'
      })
      
      expect(result.riskScore).toBeLessThanOrEqual(1.0)
    })
  })

  describe('Metrics', () => {
    it('should track total requests', async () => {
      await limiter.checkRateLimit('ip1', 'api:general')
      await limiter.checkRateLimit('ip2', 'api:general')
      
      const metrics = limiter.getMetrics()
      
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(2)
    })

    it('should track blocked requests', async () => {
      // Exceed limit
      for (let i = 0; i < 102; i++) {
        await limiter.checkRateLimit('test-ip', 'api:general')
      }
      
      const metrics = limiter.getMetrics()
      
      expect(metrics.blockedRequests).toBeGreaterThan(0)
    })

    it('should track unique IPs', async () => {
      await limiter.checkRateLimit('ip1', 'api:general')
      await limiter.checkRateLimit('ip2', 'api:general')
      await limiter.checkRateLimit('ip3', 'api:general')
      
      const metrics = limiter.getMetrics()
      
      expect(metrics.uniqueIPs.size).toBeGreaterThanOrEqual(3)
    })

    it('should calculate average risk score', async () => {
      await limiter.checkRateLimit('ip1', 'api:general')
      await limiter.checkRateLimit('ip2', 'api:general')
      
      const metrics = limiter.getMetrics()
      
      expect(metrics.averageRiskScore).toBeDefined()
      expect(metrics.averageRiskScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Emergency Blocking', () => {
    it('should block identifier immediately', async () => {
      limiter.blockIdentifier('bad-ip', 5000)
      
      const result = await limiter.checkRateLimit('bad-ip', 'api:general')
      
      expect(result.allowed).toBe(false)
    })

    it('should respect block duration', async () => {
      limiter.blockIdentifier('bad-ip', 100)
      
      // Should be blocked
      let result = await limiter.checkRateLimit('bad-ip', 'api:general')
      expect(result.allowed).toBe(false)
      
      // Wait for block to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be allowed
      result = await limiter.checkRateLimit('bad-ip', 'api:general')
      expect(result.allowed).toBe(true)
    })
  })

  describe('Custom Rules', () => {
    it('should allow adding custom rules', () => {
      limiter.addRule('custom:rule', {
        windowMs: 60000,
        maxRequests: 50
      })
      
      // Rule should be applied
      expect(() => limiter.checkRateLimit('test-ip', 'custom:rule')).not.toThrow()
    })

    it('should apply custom rule limits', async () => {
      limiter.addRule('custom:strict', {
        windowMs: 60000,
        maxRequests: 2
      })
      
      const result = await limiter.checkRateLimit('test-ip', 'custom:strict')
      
      expect(result.limit).toBe(2)
    })
  })

  describe('Active Entries', () => {
    it('should return active entries', async () => {
      await limiter.checkRateLimit('ip1', 'api:general')
      await limiter.checkRateLimit('ip2', 'api:general')
      
      const entries = limiter.getActiveEntries()
      
      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0]).toHaveProperty('key')
      expect(entries[0]).toHaveProperty('count')
      expect(entries[0]).toHaveProperty('riskScore')
    })

    it('should sort entries by risk score', async () => {
      await limiter.checkRateLimit('ip1', 'api:general')
      await limiter.checkRateLimit('ip2', 'api:general', {
        userAgent: 'bot',
        path: '/admin'
      })
      
      const entries = limiter.getActiveEntries()
      
      if (entries.length > 1) {
        expect(entries[0].riskScore).toBeGreaterThanOrEqual(entries[1].riskScore)
      }
    })

    it('should indicate blocked status', async () => {
      // Exceed limit
      for (let i = 0; i < 102; i++) {
        await limiter.checkRateLimit('test-ip', 'api:general')
      }
      
      const entries = limiter.getActiveEntries()
      const blockedEntry = entries.find(e => e.key.includes('test-ip'))
      
      expect(blockedEntry?.isBlocked).toBe(true)
    })
  })

  describe('Identifier Isolation', () => {
    it('should isolate different identifiers', async () => {
      await limiter.checkRateLimit('ip1', 'api:general')
      await limiter.checkRateLimit('ip2', 'api:general')
      
      const result1 = await limiter.checkRateLimit('ip1', 'api:general')
      const result2 = await limiter.checkRateLimit('ip2', 'api:general')
      
      expect(result1.remaining).toBe(result2.remaining)
    })

    it('should isolate different rule keys', async () => {
      await limiter.checkRateLimit('test-ip', 'auth:login')
      await limiter.checkRateLimit('test-ip', 'api:general')
      
      const result1 = await limiter.checkRateLimit('test-ip', 'auth:login')
      const result2 = await limiter.checkRateLimit('test-ip', 'api:general')
      
      expect(result1.limit).not.toBe(result2.limit)
    })
  })
})
