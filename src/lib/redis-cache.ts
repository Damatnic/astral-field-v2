/**
 * Enhanced Redis Caching Layer for Astral Field Fantasy Football Platform
 * Provides distributed caching with intelligent invalidation and performance monitoring
 */

import Redis from 'ioredis';
import { CACHE_DURATIONS, CACHE_TAGS } from './cache';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
  };
  fallback: {
    enabled: boolean;
    maxMemoryEntries: number;
  };
  compression: {
    enabled: boolean;
    threshold: number; // bytes
  };
  monitoring: {
    enabled: boolean;
    logSlowQueries: boolean;
    slowQueryThreshold: number; // ms
  };
}

class EnhancedRedisCache {
  private redis: Redis | null = null;
  private memoryFallback = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private isConnected = false;
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalOperations: 0,
    totalTime: 0,
  };

  constructor(config: CacheConfig) {
    this.config = config;
    this.initRedis();
    
    // Cleanup memory fallback every 5 minutes
    setInterval(() => this.cleanupMemoryFallback(), 5 * 60 * 1000);
    
    // Reset metrics every hour for fresh tracking
    setInterval(() => this.resetMetrics(), 60 * 60 * 1000);
  }

  private async initRedis() {
    try {
      // Skip Redis initialization during build time
      if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL && !process.env.REDIS_PASSWORD) {
        console.log('⚠️ Redis not configured for build environment, using fallback cache only');
        this.isConnected = false;
        return;
      }

      const { retryDelayOnFailover, ...redisConfig } = this.config.redis;
      this.redis = new Redis({
        ...redisConfig,
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest || 3,
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err);
        this.isConnected = false;
        this.metrics.errors++;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  private generateKey(key: string, tags: string[] = []): string {
    const prefix = this.config.redis.keyPrefix || 'astral:';
    const tagString = tags.length > 0 ? `:${tags.join(':')}:` : ':';
    return `${prefix}${tagString}${key}`;
  }

  private async compress(data: string): Promise<string> {
    if (!this.config.compression.enabled || data.length < this.config.compression.threshold) {
      return data;
    }
    
    try {
      const { gzip } = await import('zlib');
      const { promisify } = await import('util');
      const gzipAsync = promisify(gzip);
      const compressed = await gzipAsync(Buffer.from(data));
      return `gzip:${compressed.toString('base64')}`;
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  private async decompress(data: string): Promise<string> {
    if (!data.startsWith('gzip:')) {
      return data;
    }
    
    try {
      const { gunzip } = await import('zlib');
      const { promisify } = await import('util');
      const gunzipAsync = promisify(gunzip);
      const compressed = Buffer.from(data.slice(5), 'base64');
      const decompressed = await gunzipAsync(compressed);
      return decompressed.toString();
    } catch (error) {
      console.warn('Decompression failed:', error);
      throw error;
    }
  }

  private logSlowQuery(operation: string, key: string, duration: number) {
    if (this.config.monitoring.logSlowQueries && duration > this.config.monitoring.slowQueryThreshold) {
      console.warn(`🐌 Slow Redis ${operation}: ${key} (${duration}ms)`);
    }
  }

  async get<T>(key: string, tags: string[] = []): Promise<T | null> {
    const start = Date.now();
    this.metrics.totalOperations++;
    
    try {
      const fullKey = this.generateKey(key, tags);
      let result: T | null = null;

      // Try Redis first
      if (this.isConnected && this.redis) {
        try {
          const redisData = await this.redis.get(fullKey);
          if (redisData) {
            const decompressed = await this.decompress(redisData);
            const entry: CacheEntry<T> = JSON.parse(decompressed);
            
            // Check if entry is still valid
            if (Date.now() - entry.timestamp < entry.ttl) {
              result = entry.data;
              this.metrics.hits++;
            } else {
              // Expired, remove from Redis
              await this.redis.del(fullKey);
            }
          }
        } catch (redisError) {
          console.warn('Redis get error, falling back to memory:', redisError);
          this.metrics.errors++;
        }
      }

      // Fallback to memory cache
      if (result === null && this.config.fallback.enabled) {
        const memEntry = this.memoryFallback.get(fullKey);
        if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
          result = memEntry.data;
          this.metrics.hits++;
        } else if (memEntry) {
          this.memoryFallback.delete(fullKey);
        }
      }

      if (result === null) {
        this.metrics.misses++;
      }

      const duration = Date.now() - start;
      this.metrics.totalTime += duration;
      this.logSlowQuery('GET', key, duration);

      return result;
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.errors++;
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl: number = CACHE_DURATIONS.DYNAMIC, tags: string[] = []): Promise<void> {
    const start = Date.now();
    this.metrics.totalOperations++;
    
    try {
      const fullKey = this.generateKey(key, tags);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl * 1000, // Convert to milliseconds
        version: '1.0',
      };

      const serialized = JSON.stringify(entry);
      const compressed = await this.compress(serialized);

      // Set in Redis
      if (this.isConnected && this.redis) {
        try {
          await this.redis.setex(fullKey, ttl, compressed);
          
          // Set tag associations for invalidation
          if (tags.length > 0) {
            const tagKeys = tags.map(tag => `tag:${tag}`);
            await Promise.all(
              tagKeys.map(tagKey => this.redis!.sadd(tagKey, fullKey))
            );
            // Set expiration for tag keys (longer than data TTL)
            await Promise.all(
              tagKeys.map(tagKey => this.redis!.expire(tagKey, ttl * 2))
            );
          }
        } catch (redisError) {
          console.warn('Redis set error, falling back to memory:', redisError);
          this.metrics.errors++;
        }
      }

      // Set in memory fallback
      if (this.config.fallback.enabled) {
        this.memoryFallback.set(fullKey, entry);
        
        // Cleanup if memory cache is too large
        if (this.memoryFallback.size > this.config.fallback.maxMemoryEntries) {
          this.cleanupMemoryFallback();
        }
      }

      const duration = Date.now() - start;
      this.metrics.totalTime += duration;
      this.logSlowQuery('SET', key, duration);
    } catch (error) {
      console.error('Cache set error:', error);
      this.metrics.errors++;
    }
  }

  async delete(key: string, tags: string[] = []): Promise<void> {
    const start = Date.now();
    this.metrics.totalOperations++;
    
    try {
      const fullKey = this.generateKey(key, tags);

      // Delete from Redis
      if (this.isConnected && this.redis) {
        try {
          await this.redis.del(fullKey);
        } catch (redisError) {
          console.warn('Redis delete error:', redisError);
          this.metrics.errors++;
        }
      }

      // Delete from memory
      this.memoryFallback.delete(fullKey);

      const duration = Date.now() - start;
      this.metrics.totalTime += duration;
      this.logSlowQuery('DEL', key, duration);
    } catch (error) {
      console.error('Cache delete error:', error);
      this.metrics.errors++;
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const start = Date.now();
    this.metrics.totalOperations++;
    
    try {
      if (this.isConnected && this.redis) {
        try {
          const tagKey = `tag:${tag}`;
          const keys = await this.redis.smembers(tagKey);
          
          if (keys.length > 0) {
            // Delete all keys associated with this tag
            await this.redis.del(...keys);
            // Clean up the tag key itself
            await this.redis.del(tagKey);
            
            console.log(`🗑️ Invalidated ${keys.length} cache entries for tag: ${tag}`);
          }
        } catch (redisError) {
          console.warn('Redis invalidate error:', redisError);
          this.metrics.errors++;
        }
      }

      // Invalidate memory cache by tag
      const keysToDelete: string[] = [];
      for (const [key] of this.memoryFallback) {
        if (key.includes(`:${tag}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.memoryFallback.delete(key));

      const duration = Date.now() - start;
      this.metrics.totalTime += duration;
      this.logSlowQuery('INVALIDATE', tag, duration);
    } catch (error) {
      console.error('Cache invalidate error:', error);
      this.metrics.errors++;
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = CACHE_DURATIONS.DYNAMIC,
    tags: string[] = []
  ): Promise<T> {
    const cached = await this.get<T>(key, tags);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetchFunction();
    await this.set(key, freshData, ttl, tags);
    return freshData;
  }

  private cleanupMemoryFallback(): void {
    if (!this.config.fallback.enabled) return;
    
    const now = Date.now();
    let removed = 0;
    
    // Remove expired entries
    for (const [key, entry] of this.memoryFallback) {
      if (now - entry.timestamp >= entry.ttl) {
        this.memoryFallback.delete(key);
        removed++;
      }
    }
    
    // If still too many entries, remove oldest
    if (this.memoryFallback.size > this.config.fallback.maxMemoryEntries) {
      const entries = Array.from(this.memoryFallback.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = this.memoryFallback.size - this.config.fallback.maxMemoryEntries;
      for (let i = 0; i < toRemove; i++) {
        this.memoryFallback.delete(entries[i][0]);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} memory cache entries`);
    }
  }

  async warmUp(warmupData: Array<{ key: string; data: any; ttl?: number; tags?: string[] }>): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    const promises = warmupData.map(({ key, data, ttl, tags }) =>
      this.set(key, data, ttl, tags)
    );
    
    await Promise.allSettled(promises);
    console.log(`✅ Cache warmed with ${warmupData.length} entries`);
  }

  getMetrics() {
    const hitRate = this.metrics.totalOperations > 0 
      ? this.metrics.hits / this.metrics.totalOperations 
      : 0;
    
    const avgTime = this.metrics.totalOperations > 0 
      ? this.metrics.totalTime / this.metrics.totalOperations 
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      averageTime: Math.round(avgTime * 100) / 100,
      isConnected: this.isConnected,
      memoryEntries: this.memoryFallback.size,
    };
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalOperations: 0,
      totalTime: 0,
    };
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryFallback.clear();
  }
}

// Default configuration
const defaultConfig: CacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'astral:v1:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
  fallback: {
    enabled: true,
    maxMemoryEntries: 1000,
  },
  compression: {
    enabled: true,
    threshold: 1024, // 1KB
  },
  monitoring: {
    enabled: true,
    logSlowQueries: true,
    slowQueryThreshold: 100, // 100ms
  },
};

// Singleton instance
export const redisCache = new EnhancedRedisCache(defaultConfig);

// Cache key generators for fantasy football specific data
export const fantasyKeys = {
  players: (filters: string) => `players:${filters}`,
  player: (id: string) => `player:${id}`,
  playerStats: (id: string, week: number, season: number) => `player:${id}:stats:${season}:${week}`,
  playerProjections: (id: string, week: number, season: number) => `player:${id}:proj:${season}:${week}`,
  teams: (leagueId: string) => `teams:${leagueId}`,
  team: (teamId: string) => `team:${teamId}`,
  roster: (teamId: string) => `roster:${teamId}`,
  lineup: (teamId: string, week: number) => `lineup:${teamId}:${week}`,
  matchups: (leagueId: string, week: number, season: number) => `matchups:${leagueId}:${season}:${week}`,
  standings: (leagueId: string, season: number) => `standings:${leagueId}:${season}`,
  leagueInfo: (leagueId: string) => `league:${leagueId}:info`,
  analytics: (leagueId: string, type: string, period: string) => `analytics:${leagueId}:${type}:${period}`,
  trades: (leagueId: string) => `trades:${leagueId}`,
  waivers: (leagueId: string, week: number) => `waivers:${leagueId}:${week}`,
  notifications: (userId: string) => `notifications:${userId}`,
  user: (userId: string) => `user:${userId}`,
  liveScores: (leagueId: string, week: number) => `live:scores:${leagueId}:${week}`,
  nflState: () => 'nfl:state',
  nflSchedule: (week: number, season: number) => `nfl:schedule:${season}:${week}`,
};

// Convenience functions for common operations
export const cacheOperations = {
  // Invalidate all player-related cache
  async invalidatePlayerData(playerId?: string) {
    if (playerId) {
      await redisCache.invalidateByTag(`player:${playerId}`);
    } else {
      await redisCache.invalidateByTag(CACHE_TAGS.PLAYERS);
    }
  },

  // Invalidate all matchup data for a league/week
  async invalidateMatchups(leagueId: string, week?: number) {
    if (week) {
      await redisCache.invalidateByTag(`matchups:${leagueId}:${week}`);
    } else {
      await redisCache.invalidateByTag(CACHE_TAGS.MATCHUPS);
    }
  },

  // Invalidate all roster data
  async invalidateRosterData(teamId?: string) {
    if (teamId) {
      await redisCache.invalidateByTag(`roster:${teamId}`);
    } else {
      await redisCache.invalidateByTag(CACHE_TAGS.ROSTER);
    }
  },

  // Invalidate league-wide data
  async invalidateLeagueData(leagueId: string) {
    await Promise.all([
      redisCache.invalidateByTag(`league:${leagueId}`),
      redisCache.invalidateByTag(CACHE_TAGS.TEAMS),
      redisCache.invalidateByTag(CACHE_TAGS.MATCHUPS),
    ]);
  },
};

export default redisCache;