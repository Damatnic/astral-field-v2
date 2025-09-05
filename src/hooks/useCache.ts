'use client'

import { useCallback, useEffect, useState } from 'react'

// Client-side cache using localStorage with TTL
interface CacheEntry<T> {
  data: T
  expiry: number
  timestamp: number
}

class ClientCache {
  private static readonly PREFIX = 'astral_cache_'
  
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key)
      if (!item) return null
      
      const entry: CacheEntry<T> = JSON.parse(item)
      
      // Check if expired
      if (Date.now() > entry.expiry) {
        this.delete(key)
        return null
      }
      
      return entry.data
    } catch {
      return null
    }
  }
  
  static set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiry: Date.now() + (ttlSeconds * 1000),
        timestamp: Date.now()
      }
      
      localStorage.setItem(this.PREFIX + key, JSON.stringify(entry))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }
  
  static delete(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key)
    } catch (error) {
      console.warn('Failed to delete cache entry:', error)
    }
  }
  
  static clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }
  
  static getStats() {
    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith(this.PREFIX))
      
      return {
        entries: cacheKeys.length,
        keys: cacheKeys.map(key => key.replace(this.PREFIX, ''))
      }
    } catch {
      return { entries: 0, keys: [] }
    }
  }
}

// React hook for cached data fetching
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    enabled?: boolean
    refetchOnMount?: boolean
    refetchOnWindowFocus?: boolean
  } = {}
) {
  const {
    ttl = 300, // 5 minutes default
    enabled = true,
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  
  const fetchData = useCallback(async (bypassCache = false) => {
    if (!enabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Check cache first unless bypassing
      if (!bypassCache) {
        const cached = ClientCache.get<T>(key)
        if (cached !== null) {
          setData(cached)
          setLoading(false)
          return cached
        }
      }
      
      // Fetch fresh data
      const result = await fetcher()
      
      // Cache the result
      ClientCache.set(key, result, ttl)
      
      setData(result)
      setLastFetch(Date.now())
      setLoading(false)
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setLoading(false)
      throw error
    }
  }, [key, fetcher, ttl, enabled])
  
  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData(refetchOnMount)
    }
  }, [enabled, fetchData, refetchOnMount])
  
  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return
    
    const handleFocus = () => {
      // Only refetch if data is older than 1 minute
      if (Date.now() - lastFetch > 60000) {
        fetchData()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, fetchData, lastFetch])
  
  const refetch = useCallback(() => fetchData(true), [fetchData])
  const invalidate = useCallback(() => ClientCache.delete(key), [key])
  
  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    lastFetch: new Date(lastFetch)
  }
}

// Hook for API data with automatic caching
export function useApiCache<T>(
  endpoint: string,
  options: {
    ttl?: number
    enabled?: boolean
    method?: 'GET' | 'POST'
    body?: any
  } = {}
) {
  const {
    ttl = 300,
    enabled = true,
    method = 'GET',
    body
  } = options
  
  const fetcher = useCallback(async (): Promise<T> => {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }, [endpoint, method, body])
  
  return useCache(
    `api_${endpoint}_${method}_${body ? JSON.stringify(body) : ''}`,
    fetcher,
    { ttl, enabled, refetchOnWindowFocus: true }
  )
}

// Global cache management
export const CacheManager = {
  clear: ClientCache.clear,
  delete: ClientCache.delete,
  stats: ClientCache.getStats,
  
  // Preload common data
  preload: async (entries: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>) => {
    const results = await Promise.allSettled(
      entries.map(async ({ key, fetcher, ttl = 300 }) => {
        try {
          const data = await fetcher()
          ClientCache.set(key, data, ttl)
          return { key, success: true }
        } catch (error) {
          console.warn(`Failed to preload cache entry: ${key}`, error)
          return { key, success: false, error }
        }
      })
    )
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    console.log(`🚀 Cache preload complete: ${successful}/${entries.length} entries`)
    
    return results
  }
}