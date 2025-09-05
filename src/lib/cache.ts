import { NextResponse } from 'next/server'

// In-memory cache for server-side data
const serverCache = new Map<string, { data: any; expiry: number }>()

// Cache durations in seconds
export const CacheDurations = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes  
  LONG: 1800,       // 30 minutes
  EXTENDED: 3600,   // 1 hour
  DAY: 86400,       // 24 hours
} as const

interface CacheOptions {
  ttl?: number
  tags?: string[]
  revalidate?: boolean
}

export class MemoryCache {
  // Get cached data
  static get<T>(key: string): T | null {
    const cached = serverCache.get(key)
    
    if (!cached) {
      return null
    }
    
    // Check if expired
    if (Date.now() > cached.expiry) {
      serverCache.delete(key)
      return null
    }
    
    return cached.data as T
  }

  // Set cache data
  static set<T>(key: string, data: T, ttlSeconds: number = CacheDurations.MEDIUM): void {
    const expiry = Date.now() + (ttlSeconds * 1000)
    serverCache.set(key, { data, expiry })
  }

  // Delete cache entry
  static delete(key: string): void {
    serverCache.delete(key)
  }

  // Clear all cache
  static clear(): void {
    serverCache.clear()
  }

  // Get cache stats
  static getStats() {
    return {
      size: serverCache.size,
      keys: Array.from(serverCache.keys())
    }
  }
}

// Cache wrapper for API responses
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  return async (): Promise<T> => {
    const { ttl = CacheDurations.MEDIUM, revalidate = false } = options
    
    // Force revalidation bypasses cache
    if (!revalidate) {
      const cached = MemoryCache.get<T>(key)
      if (cached !== null) {
        return cached
      }
    }
    
    // Fetch fresh data
    const data = await fetcher()
    MemoryCache.set(key, data, ttl)
    
    return data
  }
}

// Create cached NextResponse with appropriate headers
export function createCachedResponse(
  data: any,
  ttlSeconds: number = CacheDurations.SHORT,
  options: {
    status?: number
    headers?: Record<string, string>
    staleWhileRevalidate?: number
  } = {}
): NextResponse {
  const {
    status = 200,
    headers = {},
    staleWhileRevalidate = ttlSeconds * 2
  } = options

  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, s-maxage=${ttlSeconds}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${ttlSeconds}`,
      ...headers,
    },
  })
}

// Database query cache wrapper
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttlSeconds: number = CacheDurations.MEDIUM
): Promise<T> {
  const cached = MemoryCache.get<T>(cacheKey)
  
  if (cached !== null) {
    return cached
  }
  
  const result = await queryFn()
  MemoryCache.set(cacheKey, result, ttlSeconds)
  
  return result
}

// Invalidate cache by pattern
export function invalidateByPattern(pattern: string): number {
  let deleted = 0
  const regex = new RegExp(pattern)
  
  for (const key of serverCache.keys()) {
    if (regex.test(key)) {
      serverCache.delete(key)
      deleted++
    }
  }
  
  return deleted
}

// Cache warming - pre-populate cache with commonly accessed data
export class CacheWarmer {
  private static readonly warmupKeys = [
    'health-check',
    'user-count',
    'app-info'
  ]
  
  static async warmup() {
    console.log('🔥 Starting cache warmup...')
    let warmed = 0
    
    for (const key of this.warmupKeys) {
      try {
        // This would be replaced with actual data fetching logic
        await this.warmKey(key)
        warmed++
      } catch (error) {
        console.warn(`Failed to warm cache key: ${key}`, error)
      }
    }
    
    console.log(`🔥 Cache warmup complete: ${warmed}/${this.warmupKeys.length} keys`)
  }
  
  private static async warmKey(key: string) {
    // Implement specific cache warming logic here
    switch (key) {
      case 'health-check':
        // Pre-cache health check data
        break
      case 'user-count':
        // Pre-cache user statistics
        break
      case 'app-info':
        // Pre-cache application info
        break
    }
  }
}

// Background cache cleanup
if (typeof globalThis !== 'undefined') {
  // Run cleanup every 30 minutes in production
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      const before = serverCache.size
      const now = Date.now()
      
      // Remove expired entries
      for (const [key, value] of serverCache.entries()) {
        if (now > value.expiry) {
          serverCache.delete(key)
        }
      }
      
      const after = serverCache.size
      if (before !== after) {
        console.log(`🧹 Cache cleanup: ${before - after} expired entries removed`)
      }
    }, 30 * 60 * 1000) // 30 minutes
  }
}