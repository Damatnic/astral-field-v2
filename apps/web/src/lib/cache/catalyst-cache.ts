/**
 * Catalyst Multi-Layer Cache System
 * Provides lightning-fast data access with L1 (memory), L2 (Redis), L3 (CDN) caching
 */

interface CacheOptions {
  ttl?: number // Time to live in seconds
  revalidate?: boolean // Enable stale-while-revalidate
  tags?: string[] // Cache tags for selective invalidation
  priority?: 'low' | 'normal' | 'high' // Cache priority
}

interface CacheMetrics {
  l1Hits: number
  l2Hits: number
  l3Hits: number
  misses: number
  totalRequests: number
  avgResponseTime: number
}

class CatalystCache {
  private l1Cache = new Map<string, { data: any; expiry: number; tags: string[] }>()
  private metrics: CacheMetrics = {
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    misses: 0,
    totalRequests: 0,
    avgResponseTime: 0
  }
  private responseTimes: number[] = []

  constructor(
    private maxL1Size = 1000,
    private defaultTTL = 300 // 5 minutes
  ) {
    // Set up periodic cleanup for L1 cache
    setInterval(() => this.cleanupL1Cache(), 60000) // Every minute
  }

  /**
   * Get value from cache with multi-layer fallback
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = performance.now()
    this.metrics.totalRequests++

    try {
      // L1: Memory cache (fastest)
      const l1Value = this.getFromL1<T>(key)
      if (l1Value !== null) {
        this.metrics.l1Hits++
        this.recordResponseTime(performance.now() - startTime)
        return l1Value
      }

      // L2: Redis cache (if available)
      const l2Value = await this.getFromL2<T>(key)
      if (l2Value !== null) {
        this.metrics.l2Hits++
        // Warm L1 cache
        this.setInL1(key, l2Value, options)
        this.recordResponseTime(performance.now() - startTime)
        return l2Value
      }

      // L3: CDN/External cache (if available)
      const l3Value = await this.getFromL3<T>(key)
      if (l3Value !== null) {
        this.metrics.l3Hits++
        // Warm upper layers
        await this.setInL2(key, l3Value, options)
        this.setInL1(key, l3Value, options)
        this.recordResponseTime(performance.now() - startTime)
        return l3Value
      }

      // Cache miss
      this.metrics.misses++
      this.recordResponseTime(performance.now() - startTime)
      return null
    } catch (error) {
      console.error('Cache error:', error)
      this.metrics.misses++
      return null
    }
  }

  /**
   * Set value in all cache layers
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      // Set in all layers
      this.setInL1(key, value, options)
      await this.setInL2(key, value, options)
      await this.setInL3(key, value, options)
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    try {
      this.l1Cache.delete(key)
      await this.deleteFromL2(key)
      await this.deleteFromL3(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      // L1 invalidation
      for (const [key, value] of this.l1Cache.entries()) {
        if (value.tags.some(tag => tags.includes(tag))) {
          this.l1Cache.delete(key)
        }
      }

      // L2 and L3 invalidation would require external cache support
      await this.invalidateL2ByTags(tags)
      await this.invalidateL3ByTags(tags)
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics & { hitRate: number } {
    const hitRate = this.metrics.totalRequests > 0 
      ? ((this.metrics.l1Hits + this.metrics.l2Hits + this.metrics.l3Hits) / this.metrics.totalRequests) * 100
      : 0

    return {
      ...this.metrics,
      hitRate
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear()
    await this.clearL2()
    await this.clearL3()
  }

  // L1 Cache Methods (Memory)
  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.l1Cache.delete(key)
      return null
    }

    return entry.data
  }

  private setInL1<T>(key: string, value: T, options: CacheOptions): void {
    // Enforce cache size limit
    if (this.l1Cache.size >= this.maxL1Size) {
      // Remove oldest entries (simple LRU)
      const firstKey = this.l1Cache.keys().next().value
      if (firstKey) this.l1Cache.delete(firstKey)
    }

    const ttl = (options.ttl || this.defaultTTL) * 1000 // Convert to milliseconds
    this.l1Cache.set(key, {
      data: value,
      expiry: Date.now() + ttl,
      tags: options.tags || []
    })
  }

  // L2 Cache Methods (Redis/External)
  private async getFromL2<T>(key: string): Promise<T | null> {
    if (typeof window !== 'undefined') {
      // Browser environment - use localStorage as L2
      try {
        const stored = localStorage.getItem(`cache_${key}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Date.now() < parsed.expiry) {
            return parsed.data
          } else {
            localStorage.removeItem(`cache_${key}`)
          }
        }
      } catch (error) {
        console.error('L2 cache read error:', error)
      }
    }
    // Server environment would use Redis here
    return null
  }

  private async setInL2<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    if (typeof window !== 'undefined') {
      // Browser environment - use localStorage as L2
      try {
        const ttl = (options.ttl || this.defaultTTL) * 1000
        const cacheEntry = {
          data: value,
          expiry: Date.now() + ttl,
          tags: options.tags || []
        }
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry))
      } catch (error) {
        console.error('L2 cache write error:', error)
      }
    }
    // Server environment would use Redis here
  }

  private async deleteFromL2(key: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache_${key}`)
    }
  }

  private async invalidateL2ByTags(tags: string[]): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('cache_')) {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (parsed.tags?.some((tag: string) => tags.includes(tag))) {
                localStorage.removeItem(key)
              }
            }
          }
        }
      } catch (error) {
        console.error('L2 tag invalidation error:', error)
      }
    }
  }

  private async clearL2(): Promise<void> {
    if (typeof window !== 'undefined') {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache_')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
  }

  // L3 Cache Methods (CDN/HTTP Cache)
  private async getFromL3<T>(key: string): Promise<T | null> {
    // L3 would typically be handled by HTTP caching headers
    // This is a placeholder for CDN integration
    return null
  }

  private async setInL3<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    // L3 cache would be handled by CDN/HTTP caching
    // This is a placeholder for CDN integration
  }

  private async deleteFromL3(key: string): Promise<void> {
    // Placeholder for CDN cache invalidation
  }

  private async invalidateL3ByTags(tags: string[]): Promise<void> {
    // Placeholder for CDN tag-based invalidation
  }

  private async clearL3(): Promise<void> {
    // Placeholder for CDN cache clearing
  }

  // Utility Methods
  private cleanupL1Cache(): void {
    const now = Date.now()
    for (const [key, value] of this.l1Cache.entries()) {
      if (now > value.expiry) {
        this.l1Cache.delete(key)
      }
    }
  }

  private recordResponseTime(time: number): void {
    this.responseTimes.push(time)
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift() // Keep only last 100 measurements
    }
    this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
  }
}

// Export singleton instance
export const catalystCache = new CatalystCache()

// Export class for custom instances
export { CatalystCache }

// Export types
export type { CacheOptions, CacheMetrics }