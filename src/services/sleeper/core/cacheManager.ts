// Cache Manager for Sleeper API Data
// Provides intelligent caching with memory and optional Redis support

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxMemoryItems: number;
  useRedis: boolean;
  redisUrl?: string;
}

export class SleeperCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private redis: any = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxMemoryItems: 1000,
      useRedis: false,
      ...config,
    };

    // Initialize Redis if configured
    if (this.config.useRedis && this.config.redisUrl) {
      this.initRedis();
    }

    // Clean up expired memory cache entries every minute
    setInterval(() => this.cleanupMemoryCache(), 60 * 1000);
  }

  private async initRedis() {
    try {
      const Redis = await import('ioredis');
      if (this.config.redisUrl) {
        this.redis = new Redis.default(this.config.redisUrl);
        console.log('[CacheManager] Redis connected');
      } else {
        throw new Error('Redis URL not configured');
      }
    } catch (error: any) {
      console.warn('[CacheManager] Redis connection failed, using memory cache only:', error.message);
      this.config.useRedis = false;
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redis) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const parsed = JSON.parse(redisData);
          if (this.isValid(parsed)) {
            console.log(`[CacheManager] Redis hit: ${key}`);
            return parsed.data;
          } else {
            // Expired, remove from Redis
            await this.redis.del(key);
          }
        }
      }

      // Try memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        console.log(`[CacheManager] Memory hit: ${key}`);
        return memoryEntry.data;
      } else if (memoryEntry) {
        // Expired, remove from memory
        this.memoryCache.delete(key);
      }

      console.log(`[CacheManager] Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error(`[CacheManager] Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTTL,
    };

    try {
      // Set in Redis if available
      if (this.redis) {
        await this.redis.setex(key, Math.ceil(actualTTL / 1000), JSON.stringify(entry));
        console.log(`[CacheManager] Redis set: ${key} (TTL: ${actualTTL}ms)`);
      }

      // Set in memory cache
      this.memoryCache.set(key, entry);
      console.log(`[CacheManager] Memory set: ${key} (TTL: ${actualTTL}ms)`);

      // Cleanup memory cache if too large
      if (this.memoryCache.size > this.config.maxMemoryItems) {
        this.cleanupMemoryCache();
      }
    } catch (error) {
      console.error(`[CacheManager] Error setting ${key}:`, error);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
      console.log(`[CacheManager] Deleted: ${key}`);
    } catch (error) {
      console.error(`[CacheManager] Error deleting ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushall();
      }
      this.memoryCache.clear();
      console.log('[CacheManager] Cache cleared');
    } catch (error) {
      console.error('[CacheManager] Error clearing cache:', error);
    }
  }

  /**
   * Get or set pattern - if not in cache, execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    console.log(`[CacheManager] Fetching fresh data for: ${key}`);
    const freshData = await fetchFunction();
    await this.set(key, freshData, ttl);
    return freshData;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[CacheManager] Cleaned up ${removed} expired memory entries`);
    }

    // If still too large, remove oldest entries
    if (this.memoryCache.size > this.config.maxMemoryItems) {
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = this.memoryCache.size - this.config.maxMemoryItems;
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }

      console.log(`[CacheManager] Removed ${toRemove} oldest entries to free memory`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      maxMemoryItems: this.config.maxMemoryItems,
      redisConnected: !!this.redis,
      config: this.config,
    };
  }

  /**
   * Predefined cache keys for common data
   */
  static readonly CACHE_KEYS = {
    NFL_STATE: 'sleeper:nfl:state',
    ALL_PLAYERS: 'sleeper:players:all',
    FANTASY_PLAYERS: 'sleeper:players:fantasy',
    TRENDING_ADDS: 'sleeper:trending:adds',
    TRENDING_DROPS: 'sleeper:trending:drops',
    LEAGUE_INFO: (leagueId: string) => `sleeper:league:${leagueId}:info`,
    LEAGUE_ROSTERS: (leagueId: string) => `sleeper:league:${leagueId}:rosters`,
    LEAGUE_USERS: (leagueId: string) => `sleeper:league:${leagueId}:users`,
    MATCHUPS: (leagueId: string, week: number) => `sleeper:league:${leagueId}:matchups:${week}`,
    PLAYER_STATS: (playerId: string, week: number) => `sleeper:player:${playerId}:stats:${week}`,
  };

  /**
   * Predefined TTL values for different data types
   */
  static readonly TTL = {
    NFL_STATE: 5 * 60 * 1000, // 5 minutes
    PLAYERS_ALL: 24 * 60 * 60 * 1000, // 24 hours (updates daily)
    PLAYERS_FANTASY: 24 * 60 * 60 * 1000, // 24 hours
    TRENDING: 30 * 60 * 1000, // 30 minutes
    LEAGUE_INFO: 60 * 60 * 1000, // 1 hour
    ROSTERS: 10 * 60 * 1000, // 10 minutes
    MATCHUPS_LIVE: 1 * 60 * 1000, // 1 minute during games
    MATCHUPS_FINAL: 60 * 60 * 1000, // 1 hour after games
    PLAYER_STATS: 5 * 60 * 1000, // 5 minutes
  };
}

// Singleton instance with environment-based configuration
const cacheConfig = {
  useRedis: !!process.env.REDIS_URL,
  redisUrl: process.env.REDIS_URL,
  defaultTTL: SleeperCacheManager.TTL.NFL_STATE,
};

export const sleeperCache = new SleeperCacheManager(cacheConfig);

export default SleeperCacheManager;