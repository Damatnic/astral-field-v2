/**
 * Phoenix API Optimization Utilities
 * High-performance API utilities for sub-50ms response times
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { phoenixPool } from '@/lib/database/phoenix-pool'
import { phoenixMonitor } from '@/lib/database/phoenix-monitoring'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { z } from 'zod'

interface PhoenixAPIConfig {
  requireAuth?: boolean
  rateLimitKey?: string
  rateLimitMax?: number
  rateLimitWindow?: number
  cacheStrategy?: 'none' | 'short' | 'medium' | 'long' | 'custom'
  cacheTTL?: number
  validateRequest?: z.ZodSchema
  validateResponse?: z.ZodSchema
  timeout?: number
  retries?: number
}

interface APIMetrics {
  requestId: string
  method: string
  path: string
  startTime: number
  endTime?: number
  duration?: number
  cacheHit: boolean
  authenticated: boolean
  rateLimited: boolean
  error?: string
  statusCode: number
}

interface RateLimitState {
  count: number
  windowStart: number
}

class PhoenixAPIOptimizer {
  private static instance: PhoenixAPIOptimizer
  private requestMetrics = new Map<string, APIMetrics>()
  private rateLimitMap = new Map<string, RateLimitState>()
  private readonly defaultCacheTTLs = {
    short: 60,     // 1 minute
    medium: 300,   // 5 minutes
    long: 1800     // 30 minutes
  }

  static getInstance(): PhoenixAPIOptimizer {
    if (!PhoenixAPIOptimizer.instance) {
      PhoenixAPIOptimizer.instance = new PhoenixAPIOptimizer()
    }
    return PhoenixAPIOptimizer.instance
  }

  // Main API wrapper with all optimizations
  async handleRequest<T>(
    request: NextRequest,
    handler: (req: NextRequest, context: APIContext) => Promise<T>,
    config: PhoenixAPIConfig = {}
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId()
    const startTime = performance.now()
    
    const metrics: APIMetrics = {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      startTime,
      cacheHit: false,
      authenticated: false,
      rateLimited: false,
      statusCode: 200
    }

    try {
      // 1. Rate limiting check
      if (config.rateLimitKey && !(await this.checkRateLimit(config.rateLimitKey, config))) {
        metrics.rateLimited = true
        metrics.statusCode = 429
        return this.createErrorResponse('Rate limit exceeded', 429, metrics)
      }

      // 2. Authentication check
      let session = null
      if (config.requireAuth) {
        session = await auth()
        if (!session?.user?.id) {
          metrics.statusCode = 401
          return this.createErrorResponse('Authentication required', 401, metrics)
        }
        metrics.authenticated = true
      }

      // 3. Cache check
      const cacheKey = this.generateCacheKey(request, session?.user?.id)
      if (config.cacheStrategy && config.cacheStrategy !== 'none') {
        const cached = await this.getCachedResponse(cacheKey, config)
        if (cached) {
          metrics.cacheHit = true
          return this.createSuccessResponse(cached, 200, metrics)
        }
      }

      // 4. Request validation
      let validatedBody = null
      if (config.validateRequest && request.body) {
        try {
          const body = await request.json()
          validatedBody = config.validateRequest.parse(body)
        } catch (error) {
          metrics.statusCode = 400
          return this.createErrorResponse('Invalid request data', 400, metrics, error)
        }
      }

      // 5. Execute handler with timeout and context
      const context: APIContext = {
        requestId,
        session,
        validatedBody,
        cache: {
          get: (key: string) => leagueCache.get(key),
          set: (key: string, value: any, ttl?: number) => leagueCache.set(key, value, { ttl }),
          delete: (key: string) => leagueCache.delete(key)
        },
        db: {
          read: (queryName: string, query: any) => phoenixPool.executeReadQuery(queryName, query),
          write: (queryName: string, query: any) => phoenixPool.executeWriteQuery(queryName, query),
          transaction: (queryName: string, transaction: any) => phoenixPool.executeTransaction(queryName, transaction)
        },
        metrics: phoenixMonitor
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), config.timeout || 30000)
      })

      const result = await Promise.race([
        handler(request, context),
        timeoutPromise
      ])

      // 6. Response validation
      if (config.validateResponse) {
        try {
          config.validateResponse.parse(result)
        } catch (error) {
          metrics.statusCode = 500
          return this.createErrorResponse('Invalid response data', 500, metrics, error)
        }
      }

      // 7. Cache the response
      if (config.cacheStrategy && config.cacheStrategy !== 'none' && !metrics.cacheHit) {
        await this.cacheResponse(cacheKey, result, config)
      }

      return this.createSuccessResponse(result, 200, metrics)

    } catch (error) {
      metrics.error = (error as Error).message
      metrics.statusCode = 500
      
      // Enhanced error logging
      phoenixMonitor.recordQuery(
        `api:${request.method}:${request.nextUrl.pathname}`,
        performance.now() - startTime,
        false,
        undefined,
        error as Error
      )

      return this.createErrorResponse('Internal server error', 500, metrics, error)
    } finally {
      metrics.endTime = performance.now()
      metrics.duration = metrics.endTime - metrics.startTime
      this.recordMetrics(metrics)
    }
  }

  // Optimized data fetching with batching
  async batchDataFetch<T>(
    requests: Array<{
      key: string
      query: () => Promise<T>
      cacheConfig?: { ttl?: number; tags?: string[] }
    }>
  ): Promise<Record<string, T>> {
    const results: Record<string, T> = {}
    const uncachedRequests: typeof requests = []

    // Check cache for all requests
    for (const req of requests) {
      const cached = await leagueCache.get(req.key)
      if (cached) {
        results[req.key] = cached
        phoenixMonitor.recordCacheHit()
      } else {
        uncachedRequests.push(req)
        phoenixMonitor.recordCacheMiss()
      }
    }

    // Execute uncached queries in parallel
    if (uncachedRequests.length > 0) {
      const queryPromises = uncachedRequests.map(async (req) => {
        try {
          const result = await phoenixMonitor.monitoredQuery(
            `batch:${req.key}`,
            req.query
          )
          
          // Cache the result
          if (req.cacheConfig) {
            await leagueCache.set(req.key, result, {
              ttl: req.cacheConfig.ttl || 300,
              tags: req.cacheConfig.tags
            })
          }
          
          return { key: req.key, result }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {

            console.error(`Batch query failed for ${req.key}:`, error);

          }
          return { key: req.key, result: null }
        }
      })

      const batchResults = await Promise.all(queryPromises)
      batchResults.forEach(({ key, result }) => {
        if (result !== null) {
          results[key] = result
        }
      })
    }

    return results
  }

  // High-performance paginated queries
  async paginatedQuery<T>(
    queryName: string,
    baseQuery: any,
    options: {
      page: number
      limit: number
      orderBy?: any
      cacheKey?: string
      cacheTTL?: number
    }
  ): Promise<{
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page, limit, orderBy, cacheKey, cacheTTL } = options
    const offset = (page - 1) * limit

    // Check cache first
    if (cacheKey) {
      const cached = await leagueCache.get(cacheKey)
      if (cached) {
        phoenixMonitor.recordCacheHit()
        return cached
      }
    }

    // Execute count and data queries in parallel
    const [data, totalResult] = await Promise.all([
      phoenixPool.executeReadQuery(
        `${queryName}:data`,
        (client) => client.findMany({
          ...baseQuery,
          skip: offset,
          take: limit,
          orderBy
        })
      ),
      phoenixPool.executeReadQuery(
        `${queryName}:count`,
        (client) => client.count({ where: baseQuery.where })
      )
    ])

    const total = Array.isArray(totalResult) ? totalResult.length : totalResult
    const pages = Math.ceil(total / limit)

    const result = {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    }

    // Cache the result
    if (cacheKey) {
      await leagueCache.set(cacheKey, result, { ttl: cacheTTL || 300 })
      phoenixMonitor.recordCacheMiss()
    }

    return result
  }

  // Aggregated analytics queries with caching
  async getAggregatedData<T>(
    queryName: string,
    aggregations: Record<string, any>,
    options: {
      groupBy?: any
      filters?: any
      cacheKey?: string
      cacheTTL?: number
    } = {}
  ): Promise<T> {
    const { groupBy, filters, cacheKey, cacheTTL } = options

    // Check cache first
    if (cacheKey) {
      const cached = await leagueCache.get(cacheKey)
      if (cached) {
        phoenixMonitor.recordCacheHit()
        return cached
      }
    }

    // Build aggregation query
    const aggregationQuery = {
      where: filters,
      _count: aggregations._count,
      _sum: aggregations._sum,
      _avg: aggregations._avg,
      _min: aggregations._min,
      _max: aggregations._max,
      ...(groupBy && { by: groupBy })
    }

    const result = await phoenixPool.executeReadQuery(
      queryName,
      (client) => (client as any).aggregate(aggregationQuery)
    )

    // Cache the result
    if (cacheKey) {
      await leagueCache.set(cacheKey, result, { ttl: cacheTTL || 600 })
      phoenixMonitor.recordCacheMiss()
    }

    return result
  }

  // Get API performance metrics
  getAPIMetrics(timeRange: 'last_hour' | 'last_day' = 'last_hour') {
    const now = Date.now()
    const cutoff = timeRange === 'last_hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    
    const recentMetrics = Array.from(this.requestMetrics.values())
      .filter(m => now - m.startTime < cutoff)

    if (recentMetrics.length === 0) {
      return null
    }

    const totalRequests = recentMetrics.length
    const avgDuration = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalRequests
    const cacheHitRate = (recentMetrics.filter(m => m.cacheHit).length / totalRequests) * 100
    const errorRate = (recentMetrics.filter(m => m.statusCode >= 400).length / totalRequests) * 100
    const authRate = (recentMetrics.filter(m => m.authenticated).length / totalRequests) * 100

    // Group by endpoint
    const endpointStats = new Map<string, {
      count: number
      avgDuration: number
      errorCount: number
      cacheHits: number
    }>()

    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.path}`
      if (!endpointStats.has(key)) {
        endpointStats.set(key, { count: 0, avgDuration: 0, errorCount: 0, cacheHits: 0 })
      }
      
      const stats = endpointStats.get(key)!
      stats.count++
      stats.avgDuration += (metric.duration || 0)
      if (metric.statusCode >= 400) stats.errorCount++
      if (metric.cacheHit) stats.cacheHits++
    })

    // Calculate averages
    endpointStats.forEach(stats => {
      stats.avgDuration = stats.avgDuration / stats.count
    })

    return {
      timeRange,
      totalRequests,
      avgDuration,
      cacheHitRate,
      errorRate,
      authRate,
      endpointStats: Object.fromEntries(endpointStats),
      fastestEndpoint: this.getFastestEndpoint(recentMetrics),
      slowestEndpoint: this.getSlowestEndpoint(recentMetrics)
    }
  }

  // Private helper methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCacheKey(request: NextRequest, userId?: string): string {
    const url = request.nextUrl
    const method = request.method
    const queryParams = url.searchParams.toString()
    
    return `api:${method}:${url.pathname}:${queryParams}${userId ? `:user:${userId}` : ''}`
  }

  private async checkRateLimit(key: string, config: PhoenixAPIConfig): Promise<boolean> {
    const max = config.rateLimitMax || 100
    const window = config.rateLimitWindow || 60000 // 1 minute
    const now = Date.now()

    const current = this.rateLimitMap.get(key)
    
    if (!current || now - current.windowStart > window) {
      this.rateLimitMap.set(key, { count: 1, windowStart: now })
      return true
    }

    if (current.count >= max) {
      return false
    }

    current.count++
    return true
  }

  private async getCachedResponse(key: string, config: PhoenixAPIConfig): Promise<any> {
    if (config.cacheStrategy === 'none') return null

    const ttl = config.cacheTTL || this.defaultCacheTTLs[config.cacheStrategy as keyof typeof this.defaultCacheTTLs]
    return await leagueCache.get(key, { ttl })
  }

  private async cacheResponse(key: string, data: any, config: PhoenixAPIConfig): Promise<void> {
    if (config.cacheStrategy === 'none') return

    const ttl = config.cacheTTL || this.defaultCacheTTLs[config.cacheStrategy as keyof typeof this.defaultCacheTTLs]
    await leagueCache.set(key, data, { ttl })
  }

  private createSuccessResponse(data: any, status: number, metrics: APIMetrics): NextResponse {
    const headers = this.getResponseHeaders(metrics)
    return NextResponse.json({
      success: true,
      data,
      meta: {
        requestId: metrics.requestId,
        duration: metrics.duration,
        cached: metrics.cacheHit,
        timestamp: new Date().toISOString()
      }
    }, { status, headers })
  }

  private createErrorResponse(message: string, status: number, metrics: APIMetrics, error?: any): NextResponse {
    const headers = this.getResponseHeaders(metrics)
    return NextResponse.json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      meta: {
        requestId: metrics.requestId,
        duration: metrics.duration,
        timestamp: new Date().toISOString()
      }
    }, { status, headers })
  }

  private getResponseHeaders(metrics: APIMetrics): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Request-ID': metrics.requestId,
      'X-Response-Time': `${metrics.duration?.toFixed(2)}ms`,
      'X-Cache-Status': metrics.cacheHit ? 'HIT' : 'MISS',
      'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300'
    }
  }

  private recordMetrics(metrics: APIMetrics): void {
    this.requestMetrics.set(metrics.requestId, metrics)
    
    // Keep only last 1000 metrics
    if (this.requestMetrics.size > 1000) {
      const oldest = Array.from(this.requestMetrics.keys()).slice(0, 100)
      oldest.forEach(key => this.requestMetrics.delete(key))
    }

    // Log slow requests
    if (metrics.duration && metrics.duration > 500) {
      console.warn(`🐌 Slow API request: ${metrics.method} ${metrics.path} (${metrics.duration.toFixed(2)}ms)`)
    }
  }

  private getFastestEndpoint(metrics: APIMetrics[]): { endpoint: string; duration: number } | null {
    if (metrics.length === 0) return null
    
    const fastest = metrics.reduce((fastest, current) => 
      (current.duration || Infinity) < (fastest.duration || Infinity) ? current : fastest
    )
    
    return {
      endpoint: `${fastest.method} ${fastest.path}`,
      duration: fastest.duration || 0
    }
  }

  private getSlowestEndpoint(metrics: APIMetrics[]): { endpoint: string; duration: number } | null {
    if (metrics.length === 0) return null
    
    const slowest = metrics.reduce((slowest, current) => 
      (current.duration || 0) > (slowest.duration || 0) ? current : slowest
    )
    
    return {
      endpoint: `${slowest.method} ${slowest.path}`,
      duration: slowest.duration || 0
    }
  }
}

// Export singleton instance
export const phoenixAPI = PhoenixAPIOptimizer.getInstance()

// Export types and interfaces
export interface APIContext {
  requestId: string
  session: any
  validatedBody: any
  cache: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any, ttl?: number) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  db: {
    read: (queryName: string, query: any) => Promise<any>
    write: (queryName: string, query: any) => Promise<any>
    transaction: (queryName: string, transaction: any) => Promise<any>
  }
  metrics: typeof phoenixMonitor
}

export type { PhoenixAPIConfig, APIMetrics }