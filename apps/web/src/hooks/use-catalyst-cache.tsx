/**
 * React Hook for Catalyst Cache Integration
 * Provides automatic cache management with React state synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { catalystCache, CacheOptions } from '@/lib/cache/catalyst-cache'

interface UseCacheOptions extends CacheOptions {
  enabled?: boolean
  staleWhileRevalidate?: boolean
  refetchOnWindowFocus?: boolean
  refetchInterval?: number
}

interface UseCacheResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => Promise<void>
  setData: (data: T) => void
}

/**
 * Hook for cached data fetching with automatic invalidation and revalidation
 */
export function useCatalystCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
): UseCacheResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const fetcherRef = useRef(fetcher)
  const optionsRef = useRef(options)
  
  // Update refs when props change
  fetcherRef.current = fetcher
  optionsRef.current = options

  const fetchData = useCallback(async (force = false) => {
    if (!optionsRef.current.enabled && optionsRef.current.enabled !== undefined) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      let cachedData = null
      if (!force) {
        cachedData = await catalystCache.get<T>(key, optionsRef.current)
      }

      if (cachedData !== null) {
        setData(cachedData)
        setIsLoading(false)

        // If stale-while-revalidate is enabled, fetch fresh data in background
        if (optionsRef.current.staleWhileRevalidate) {
          try {
            const freshData = await fetcherRef.current()
            await catalystCache.set(key, freshData, optionsRef.current)
            setData(freshData)
          } catch (backgroundError) {
            // Silently fail for background revalidation
            console.warn('Background revalidation failed:', backgroundError)
          }
        }
      } else {
        // Cache miss - fetch fresh data
        const freshData = await fetcherRef.current()
        await catalystCache.set(key, freshData, optionsRef.current)
        setData(freshData)
        setIsLoading(false)
      }
    } catch (err) {
      setError(err as Error)
      setIsLoading(false)
    }
  }, [key])

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  const invalidate = useCallback(async () => {
    await catalystCache.delete(key)
    await fetchData(true)
  }, [key, fetchData])

  const setDataManually = useCallback((newData: T) => {
    setData(newData)
    catalystCache.set(key, newData, optionsRef.current)
  }, [key])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch interval
  useEffect(() => {
    if (optionsRef.current.refetchInterval && optionsRef.current.refetchInterval > 0) {
      const interval = setInterval(() => {
        if (!isLoading) {
          fetchData()
        }
      }, optionsRef.current.refetchInterval)

      return () => clearInterval(interval)
    }
  }, [fetchData, isLoading])

  // Refetch on window focus
  useEffect(() => {
    if (optionsRef.current.refetchOnWindowFocus) {
      const handleFocus = () => {
        if (!isLoading) {
          fetchData()
        }
      }

      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }
  }, [fetchData, isLoading])

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
    setData: setDataManually
  }
}

/**
 * Hook for cache metrics monitoring
 */
export function useCacheMetrics() {
  const [metrics, setMetrics] = useState(catalystCache.getMetrics())

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(catalystCache.getMetrics())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  return metrics
}

/**
 * Hook for cache operations without automatic fetching
 */
export function useCache() {
  const get = useCallback(async (key: string, options?: CacheOptions) => {
    return catalystCache.get(key, options)
  }, [])

  const set = useCallback(async (key: string, value: any, options?: CacheOptions) => {
    return catalystCache.set(key, value, options)
  }, [])

  const del = useCallback(async (key: string): Promise<void> => {
    return catalystCache.delete(key)
  }, [])

  const invalidateByTags = useCallback(async (tags: string[]): Promise<void> => {
    return catalystCache.invalidateByTags(tags)
  }, [])

  const clear = useCallback(async (): Promise<void> => {
    return catalystCache.clear()
  }, [])

  const getMetrics = useCallback(() => {
    return catalystCache.getMetrics()
  }, [])

  return {
    get,
    set,
    delete: del,
    invalidateByTags,
    clear,
    getMetrics
  }
}

/**
 * Provider component for cache context (optional)
 */
import React, { createContext, useContext, ReactNode } from 'react'

interface CacheContextValue {
  cache: typeof catalystCache
  metrics: ReturnType<typeof useCacheMetrics>
}

const CacheContext = createContext<CacheContextValue | null>(null)

export function CacheProvider({ children }: { children: ReactNode }) {
  const metrics = useCacheMetrics()

  const value: CacheContextValue = {
    cache: catalystCache,
    metrics
  }

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  )
}

export function useCacheContext() {
  const context = useContext(CacheContext)
  if (!context) {
    throw new Error('useCacheContext must be used within a CacheProvider')
  }
  return context
}