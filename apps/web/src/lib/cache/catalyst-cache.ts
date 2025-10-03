/**
 * Catalyst Multi-Layer Cache System
 * Provides lightning-fast data access with L1 (memory), L2 (Redis), L3 (CDN) caching
 */

interface CacheOptions {
  ttl?: number // Time to live in seconds
  revalidate?: boolean // Enable stale-while-revalidate
  tags?: string[] // Cache tags for selective invalidation
  priority?: 'low' | 'normal' | 'high' // Cache priority
  compress?: boolean // Enable compression for large data
  namespace?: string // Cache namespace for organization
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
  private l1Cache = new Map<string, { 
    data: any; 
    expiry: number; 
    tags: string[];
    compressed: boolean;
    size: number;
    lastAccessed: number;
  }>()
  private metrics: CacheMetrics = {
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    misses: 0,
    totalRequests: 0,
    avgResponseTime: 0
  }
  private responseTimes: number[] = []
  private compressionThreshold = 10000 // Compress data larger than 10KB

  constructor(
    private maxL1Size = 2000, // Increased for league data
    private defaultTTL = 300 // 5 minutes
  ) {
    // Set up periodic cleanup for L1 cache
    setInterval(() => this.cleanupL1Cache(), 30000) // Every 30 seconds for more aggressive cleanup
    // Set up memory pressure monitoring
    setInterval(() => this.monitorMemoryPressure(), 60000) // Every minute
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
      if (process.env.NODE_ENV === 'development') {

        console.error('Cache error:', error);

      }
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
      if (process.env.NODE_ENV === 'development') {

        console.error('Cache set error:', error);

      }
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
      if (process.env.NODE_ENV === 'development') {

        console.error('Cache delete error:', error);

      }
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
      if (process.env.NODE_ENV === 'development') {

        console.error('Cache invalidation error:', error);

      }
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

    const now = Date.now()
    if (now > entry.expiry) {
      this.l1Cache.delete(key)
      return null
    }

    // Update last accessed time for LRU
    entry.lastAccessed = now
    this.l1Cache.set(key, entry)

    // Decompress if needed
    if (entry.compressed) {
      try {
        return this.decompressData(entry.data)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Decompression failed:', error);

        }
        this.l1Cache.delete(key)
        return null
      }
    }

    return entry.data
  }

  private setInL1<T>(key: string, value: T, options: CacheOptions): void {
    const serialized = JSON.stringify(value)
    const dataSize = new Blob([serialized]).size
    
    // Enforce cache size limit with LRU eviction
    while (this.l1Cache.size >= this.maxL1Size) {
      this.evictLRU()
    }

    // Compress large data
    const shouldCompress = options.compress !== false && dataSize > this.compressionThreshold
    let finalData = value
    
    if (shouldCompress && typeof window !== 'undefined' && 'CompressionStream' in window) {
      try {
        // Use browser compression for large data
        finalData = this.compressData(serialized)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('Compression failed, storing uncompressed:', error);

        }
      }
    }

    const ttl = (options.ttl || this.defaultTTL) * 1000
    const now = Date.now()
    
    this.l1Cache.set(key, {
      data: finalData,
      expiry: now + ttl,
      tags: options.tags || [],
      compressed: shouldCompress,
      size: dataSize,
      lastAccessed: now
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
        if (process.env.NODE_ENV === 'development') {

          console.error('L2 cache read error:', error);

        }
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
        if (process.env.NODE_ENV === 'development') {

          console.error('L2 cache write error:', error);

        }
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
        if (process.env.NODE_ENV === 'development') {

          console.error('L2 tag invalidation error:', error);

        }
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

  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()
    
    for (const [key, value] of this.l1Cache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.l1Cache.delete(oldestKey)
    }
  }

  private monitorMemoryPressure(): void {
    // Simple memory pressure detection
    if (this.l1Cache.size > this.maxL1Size * 0.9) {
      // If cache is 90% full, evict low-priority items
      const toEvict: string[] = []
      
      for (const [key, value] of this.l1Cache.entries()) {
        if (value.tags.includes('low-priority')) {
          toEvict.push(key)
        }
      }
      
      toEvict.forEach(key => this.l1Cache.delete(key))
    }
  }

  private compressData(data: string): any {
    // Simple compression simulation (in real implementation, use CompressionStream)
    return { compressed: true, data: data }
  }

  private decompressData(compressed: any): any {
    // Simple decompression simulation
    if (compressed.compressed) {
      return JSON.parse(compressed.data)
    }
    return compressed
  }

  private recordResponseTime(time: number): void {
    this.responseTimes.push(time)
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift() // Keep only last 100 measurements
    }
    this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
  }
}

// League-specific cache configurations
export const CacheConfigurations = {
  LEAGUE_DATA: {
    ttl: 300, // 5 minutes for league standings
    tags: ['league', 'standings'],
    priority: 'high' as const,
    compress: true
  },
  PLAYER_STATS: {
    ttl: 600, // 10 minutes for player stats
    tags: ['players', 'stats'],
    priority: 'normal' as const,
    compress: true
  },
  ROSTER_DATA: {
    ttl: 120, // 2 minutes for roster data
    tags: ['roster', 'teams'],
    priority: 'high' as const
  },
  MATCHUP_DATA: {
    ttl: 180, // 3 minutes for matchups
    tags: ['matchups', 'scores'],
    priority: 'high' as const
  },
  NEWS_DATA: {
    ttl: 900, // 15 minutes for news
    tags: ['news'],
    priority: 'low' as const
  }
} as const

// Enhanced cache wrapper for league operations
export class LeagueDataCache extends CatalystCache {
  async getLeagueStandings(leagueId: string, week: number) {
    const key = `league:${leagueId}:standings:week:${week}`
    return this.get(key, CacheConfigurations.LEAGUE_DATA)
  }

  async setLeagueStandings(leagueId: string, week: number, data: any) {
    const key = `league:${leagueId}:standings:week:${week}`
    return this.set(key, data, CacheConfigurations.LEAGUE_DATA)
  }

  async getPlayerStats(playerIds: string[], weeks: number[]) {
    const key = `players:${playerIds.slice(0,5).join(',')}:weeks:${weeks.join(',')}`
    return this.get(key, CacheConfigurations.PLAYER_STATS)
  }

  async setPlayerStats(playerIds: string[], weeks: number[], data: any) {
    const key = `players:${playerIds.slice(0,5).join(',')}:weeks:${weeks.join(',')}`
    return this.set(key, data, CacheConfigurations.PLAYER_STATS)
  }

  async getRosterData(teamId: string) {
    const key = `roster:${teamId}`
    return this.get(key, CacheConfigurations.ROSTER_DATA)
  }

  async setRosterData(teamId: string, data: any) {
    const key = `roster:${teamId}`
    return this.set(key, data, CacheConfigurations.ROSTER_DATA)
  }

  async invalidateLeague(leagueId: string) {
    // Invalidate all league-related data
    await this.invalidateByTags(['league', 'standings', 'matchups'])
  }

  async invalidatePlayer(playerId: string) {
    // Clear specific player data
    for (const [key] of this.l1Cache.entries()) {
      if (key.includes(`player:${playerId}`) || key.includes(`:${playerId}:`)) {
        this.l1Cache.delete(key)
      }
    }
  }
}

// Export singleton instances
export const catalystCache = new CatalystCache()
export const leagueCache = new LeagueDataCache()

// Export class for custom instances
export { CatalystCache }

// Export types
export type { CacheOptions, CacheMetrics }