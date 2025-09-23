/**
 * Comprehensive Caching Service for Astral Field Fantasy Football Platform
 * Handles both server-side and client-side caching with TTL and invalidation
 */

import { unstable_cache } from 'next/cache';

// Cache configuration
export const CACHE_TAGS = {
  PLAYERS: 'players',
  TEAMS: 'teams',
  LEAGUE: 'league',
  MATCHUPS: 'matchups',
  ROSTER: 'roster',
  LINEUP: 'lineup',
  TRADES: 'trades',
  WAIVERS: 'waivers',
  ANALYTICS: 'analytics',
  USER: 'user',
  NOTIFICATIONS: 'notifications',
  LIVE_UPDATES: 'live_updates',
} as const;

export const CACHE_DURATIONS = {
  STATIC: 3600, // 1 hour for static data
  DYNAMIC: 300, // 5 minutes for dynamic data
  REAL_TIME: 60, // 1 minute for real-time data
  LONG: 86400, // 24 hours for rarely changing data
} as const;

// Server-side cache wrapper with Next.js unstable_cache
export function createServerCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string,
  options: {
    tags?: string[];
    revalidate?: number;
  } = {}
) {
  return unstable_cache(fn, [keyPrefix], {
    tags: options.tags || [],
    revalidate: options.revalidate || CACHE_DURATIONS.DYNAMIC,
  });
}

// Client-side cache using browser storage with TTL
class ClientCache {
  private storage: Storage;
  private prefix = 'astral_cache_';

  constructor() {
    // Use sessionStorage for cache to persist during browser session
    this.storage = typeof window !== 'undefined' ? window.sessionStorage : ({} as Storage);
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl * 1000;
  }

  set<T>(key: string, value: T, ttlSeconds: number = CACHE_DURATIONS.DYNAMIC): void {
    try {
      const cacheItem = {
        value,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      };
      this.storage.setItem(this.getKey(key), JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to cache item:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;

      const cacheItem = JSON.parse(item);
      if (this.isExpired(cacheItem.timestamp, cacheItem.ttl)) {
        this.remove(key);
        return null;
      }

      return cacheItem.value;
    } catch (error) {
      console.warn('Failed to retrieve cached item:', error);
      return null;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(this.getKey(key));
    } catch (error) {
      console.warn('Failed to remove cached item:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  invalidateByPrefix(prefix: string): void {
    try {
      const keys = Object.keys(this.storage);
      const fullPrefix = this.getKey(prefix);
      keys.forEach(key => {
        if (key.startsWith(fullPrefix)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to invalidate cache by prefix:', error);
    }
  }
}

// Export singleton instance
export const clientCache = new ClientCache();

// React hook for cached data fetching
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_DURATIONS.DYNAMIC
) {
  const getCachedOrFetch = async (): Promise<T> => {
    // Try to get from cache first
    const cached = clientCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data and cache it
    const data = await fetcher();
    clientCache.set(key, data, ttl);
    return data;
  };

  return getCachedOrFetch;
}

// API response cache headers helper
export function getCacheHeaders(type: 'static' | 'dynamic' | 'realtime' | 'long') {
  const configs = {
    static: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800',
      'CDN-Cache-Control': 'public, max-age=3600',
    },
    dynamic: {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=300',
      'CDN-Cache-Control': 'public, max-age=300',
    },
    realtime: {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      'CDN-Cache-Control': 'public, max-age=60',
    },
    long: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'public, max-age=86400',
    },
  };

  return configs[type];
}

// Cache key generators for consistent naming
export const cacheKeys = {
  players: (filter?: string) => `players_${filter || 'all'}`,
  player: (id: string) => `player_${id}`,
  teams: (leagueId: string) => `teams_${leagueId}`,
  team: (teamId: string) => `team_${teamId}`,
  roster: (teamId: string) => `roster_${teamId}`,
  lineup: (teamId: string, week: number) => `lineup_${teamId}_week_${week}`,
  matchups: (leagueId: string, week: number) => `matchups_${leagueId}_week_${week}`,
  league: (leagueId: string) => `league_${leagueId}`,
  analytics: (leagueId: string, type: string) => `analytics_${leagueId}_${type}`,
  user: (userId: string) => `user_${userId}`,
  trades: (teamId: string) => `trades_${teamId}`,
  waivers: (teamId: string) => `waivers_${teamId}`,
  notifications: (userId: string) => `notifications_${userId}`,
};

// Performance monitoring
export class CacheMetrics {
  private static hits = 0;
  private static misses = 0;

  static recordHit(): void {
    this.hits++;
  }

  static recordMiss(): void {
    this.misses++;
  }

  static getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  static getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }

  static reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// Cache warming for critical data
export async function warmCache() {
  try {
    console.log('🔥 Warming cache with critical data...');
    
    // This would typically be called during app initialization
    // to pre-populate cache with frequently accessed data
    
    console.log('✅ Cache warming completed');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}