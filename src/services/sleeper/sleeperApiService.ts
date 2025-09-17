/**
 * Sleeper API Service - Primary data source for NFL and fantasy data
 * Documentation: https://docs.sleeper.app/
 * 
 * Features:
 * - Type-safe API interactions with Zod validation
 * - Intelligent rate limiting (1000 requests/minute)
 * - Redis caching for performance optimization
 * - Comprehensive error handling with retry logic
 * - Real-time data fetching for live scoring
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import {
  NFLState,
  NFLStateSchema,
  SleeperPlayer,
  SleeperPlayerSchema,
  PlayerStats,
  PlayerStatsSchema,
  SleeperLeague,
  SleeperLeagueSchema,
  SleeperRoster,
  SleeperRosterSchema,
  SleeperUser,
  SleeperUserSchema,
  TrendingPlayers,
  TrendingPlayersSchema,
  SleeperMatchup,
  SleeperMatchupSchema,
  SleeperTransaction,
  SleeperTransactionSchema,
  DEFAULT_SLEEPER_CONFIG,
  SleeperConfig
} from '@/types/sleeper';

// Redis import with fallback
let Redis: any;
try {
  Redis = require('ioredis');
} catch (error) {
  console.warn('Redis not available, using memory cache fallback');
}

export class SleeperApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'SleeperApiError';
  }
}

export class SleeperApiService {
  private client: AxiosInstance;
  private redis?: any;
  private requestCount: number = 0;
  private resetTime: number = Date.now() + 60000;
  private config: SleeperConfig;
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: Partial<SleeperConfig> = {}) {
    this.config = { ...DEFAULT_SLEEPER_CONFIG, ...config };
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'AstralField/1.0 (damato-dynasty-league)',
        'Accept': 'application/json'
      }
    });

    // Initialize Redis if available
    if (Redis && process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
        console.log('✅ Redis cache initialized for Sleeper API');
      } catch (error) {
        console.warn('⚠️ Redis connection failed, using memory cache:', error);
      }
    }

    this.setupInterceptors();
    this.startCacheCleanup();
  }

  /**
   * Setup request/response interceptors for rate limiting and error handling
   */
  private setupInterceptors() {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          console.log('⏳ Rate limited by Sleeper API, waiting before retry...');
          await this.waitForRateLimit();
          return this.client.request(error.config);
        }
        
        throw new SleeperApiError(
          error.message || 'Unknown API error',
          error.response?.status,
          error.config?.url,
          error
        );
      }
    );
  }

  /**
   * Enforce rate limiting (1000 requests per minute)
   */
  private async enforceRateLimit() {
    const now = Date.now();
    
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + this.config.rateLimit.windowMs;
    }

    if (this.requestCount >= this.config.rateLimit.maxRequests) {
      const waitTime = this.resetTime - now;
      console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + this.config.rateLimit.windowMs;
    }

    this.requestCount++;
  }

  /**
   * Wait for rate limit to reset
   */
  private async waitForRateLimit() {
    const waitTime = this.resetTime - Date.now();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Generic cached request method with type validation
   */
  private async cachedRequest<T>(
    endpoint: string, 
    cacheKey: string, 
    ttl: number,
    validator: z.ZodSchema<T>
  ): Promise<T> {
    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try {
        return validator.parse(cached);
      } catch (error) {
        console.warn(`❌ Cache validation failed for ${cacheKey}:`, error);
        await this.deleteFromCache(cacheKey);
      }
    }

    // Make API request with retry logic
    const response = await this.withRetry(() => this.client.get(endpoint));
    const validated = validator.parse(response.data);

    // Cache the result
    await this.setToCache(cacheKey, validated, ttl);

    return validated;
  }

  /**
   * Get current NFL state (season, week, etc.)
   */
  async getNFLState(): Promise<NFLState> {
    return this.cachedRequest(
      '/state/nfl',
      'sleeper:nfl:state',
      this.config.cache.stateTtl,
      NFLStateSchema
    );
  }

  /**
   * Get all NFL players
   */
  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    return this.cachedRequest(
      '/players/nfl',
      'sleeper:players:all',
      this.config.cache.playersTtl,
      z.record(SleeperPlayerSchema)
    );
  }

  /**
   * Get trending players (add/drop)
   */
  async getTrendingPlayers(
    type: 'add' | 'drop' = 'add',
    lookback_hours: number = 24,
    limit: number = 25
  ): Promise<TrendingPlayers[]> {
    const endpoint = `/players/nfl/trending/${type}`;
    const params = new URLSearchParams({
      lookback_hours: lookback_hours.toString(),
      limit: limit.toString()
    });

    return this.cachedRequest(
      `${endpoint}?${params}`,
      `sleeper:trending:${type}:${lookback_hours}:${limit}`,
      this.config.cache.trendingTtl,
      z.array(TrendingPlayersSchema)
    );
  }

  /**
   * Get player stats for a specific week/season
   */
  async getPlayerStats(
    season: string,
    week?: number
  ): Promise<Record<string, PlayerStats>> {
    const endpoint = week 
      ? `/stats/nfl/regular/${season}/${week}`
      : `/stats/nfl/regular/${season}`;
    
    const cacheKey = week
      ? `sleeper:stats:${season}:${week}`
      : `sleeper:stats:${season}:season`;

    return this.cachedRequest(
      endpoint,
      cacheKey,
      this.config.cache.statsTtl,
      z.record(PlayerStatsSchema)
    );
  }

  /**
   * Get projections for players
   */
  async getPlayerProjections(
    season: string,
    week: number
  ): Promise<Record<string, PlayerStats>> {
    const endpoint = `/projections/nfl/regular/${season}/${week}`;
    
    return this.cachedRequest(
      endpoint,
      `sleeper:projections:${season}:${week}`,
      this.config.cache.statsTtl,
      z.record(PlayerStatsSchema)
    );
  }

  /**
   * Get specific league information
   */
  async getLeague(leagueId: string): Promise<SleeperLeague> {
    return this.cachedRequest(
      `/league/${leagueId}`,
      `sleeper:league:${leagueId}`,
      this.config.cache.defaultTtl,
      SleeperLeagueSchema
    );
  }

  /**
   * Get league rosters
   */
  async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    return this.cachedRequest(
      `/league/${leagueId}/rosters`,
      `sleeper:rosters:${leagueId}`,
      this.config.cache.defaultTtl,
      z.array(SleeperRosterSchema)
    );
  }

  /**
   * Get league users
   */
  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    return this.cachedRequest(
      `/league/${leagueId}/users`,
      `sleeper:users:${leagueId}`,
      this.config.cache.defaultTtl,
      z.array(SleeperUserSchema)
    );
  }

  /**
   * Get league matchups for a specific week
   */
  async getLeagueMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    return this.cachedRequest(
      `/league/${leagueId}/matchups/${week}`,
      `sleeper:matchups:${leagueId}:${week}`,
      this.config.cache.defaultTtl,
      z.array(SleeperMatchupSchema)
    );
  }

  /**
   * Get league transactions
   */
  async getLeagueTransactions(
    leagueId: string, 
    round: number = 1
  ): Promise<SleeperTransaction[]> {
    return this.cachedRequest(
      `/league/${leagueId}/transactions/${round}`,
      `sleeper:transactions:${leagueId}:${round}`,
      this.config.cache.defaultTtl,
      z.array(SleeperTransactionSchema)
    );
  }

  /**
   * Get user leagues for a specific season
   */
  async getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
    return this.cachedRequest(
      `/user/${userId}/leagues/nfl/${season}`,
      `sleeper:user:leagues:${userId}:${season}`,
      this.config.cache.defaultTtl,
      z.array(SleeperLeagueSchema)
    );
  }

  /**
   * Get user information
   */
  async getUser(userId: string): Promise<SleeperUser> {
    return this.cachedRequest(
      `/user/${userId}`,
      `sleeper:user:${userId}`,
      this.config.cache.defaultTtl,
      SleeperUserSchema
    );
  }

  /**
   * Cache management methods
   */
  private async getFromCache(key: string): Promise<any> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        console.warn(`Redis get error for key ${key}:`, error);
      }
    }

    // Memory cache fallback
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expires > Date.now()) {
      return memCached.data;
    }

    return null;
  }

  private async setToCache(key: string, data: any, ttl: number): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        return;
      } catch (error) {
        console.warn(`Redis set error for key ${key}:`, error);
      }
    }

    // Memory cache fallback
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000)
    });
  }

  private async deleteFromCache(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (error) {
        console.warn(`Redis delete error for key ${key}:`, error);
      }
    }

    // Memory cache fallback
    this.memoryCache.delete(key);
  }

  /**
   * Clean up expired memory cache entries
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (value.expires <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retry.maxRetries) {
          throw new SleeperApiError(
            `Operation failed after ${this.config.retry.maxRetries + 1} attempts: ${lastError.message}`,
            undefined,
            undefined,
            lastError
          );
        }
        
        const delay = Math.min(
          this.config.retry.baseDelay * Math.pow(this.config.retry.exponentialBase, attempt),
          this.config.retry.maxDelay
        );
        
        console.log(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Health check for Sleeper API
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    
    try {
      await this.getNFLState();
      return {
        healthy: true,
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get API usage statistics
   */
  getUsageStats(): {
    requestCount: number;
    resetTime: number;
    remainingRequests: number;
    cacheSize: number;
  } {
    return {
      requestCount: this.requestCount,
      resetTime: this.resetTime,
      remainingRequests: Math.max(0, this.config.rateLimit.maxRequests - this.requestCount),
      cacheSize: this.memoryCache.size
    };
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys('sleeper:*');
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } catch (error) {
        console.warn('Redis cache clear error:', error);
      }
    }

    this.memoryCache.clear();
    console.log('✅ Sleeper API cache cleared');
  }
}

// Export singleton instance
export const sleeperApiService = new SleeperApiService();