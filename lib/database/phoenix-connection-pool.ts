/**
 * Phoenix High-Performance Database Connection Pool
 * Enterprise-grade connection pooling and query optimization
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

export interface ConnectionPoolConfig {
  maxConnections?: number
  minConnections?: number
  acquireTimeoutMs?: number
  idleTimeoutMs?: number
  statementCacheSize?: number
  enableLogging?: boolean
  enableMonitoring?: boolean
}

export interface ConnectionMetrics {
  activeConnections: number
  idleConnections: number
  totalConnections: number
  averageLatency: number
  queryCount: number
  errorCount: number
  poolUtilization: number
}

export interface QueryMetrics {
  queryTime: number
  connectionTime: number
  totalTime: number
  cached: boolean
}

export class PhoenixConnectionPool {
  private static instance: PhoenixConnectionPool
  private prismaClient: PrismaClient
  private config: Required<ConnectionPoolConfig>
  private metrics: ConnectionMetrics
  private queryHistory: Array<{ timestamp: number; queryTime: number; success: boolean }>
  private connectionHealthStatus: boolean = true
  private lastHealthCheck: number = 0

  private constructor(config: ConnectionPoolConfig = {}) {
    this.config = {
      maxConnections: config.maxConnections || 100,
      minConnections: config.minConnections || 10,
      acquireTimeoutMs: config.acquireTimeoutMs || 30000,
      idleTimeoutMs: config.idleTimeoutMs || 300000, // 5 minutes
      statementCacheSize: config.statementCacheSize || 500,
      enableLogging: config.enableLogging ?? (process.env.NODE_ENV === 'development'),
      enableMonitoring: config.enableMonitoring ?? true
    }

    this.metrics = {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      averageLatency: 0,
      queryCount: 0,
      errorCount: 0,
      poolUtilization: 0
    }

    this.queryHistory = []
    this.initializePrismaClient()
    this.setupMonitoring()
  }

  static getInstance(config?: ConnectionPoolConfig): PhoenixConnectionPool {
    if (!PhoenixConnectionPool.instance) {
      PhoenixConnectionPool.instance = new PhoenixConnectionPool(config)
    }
    return PhoenixConnectionPool.instance
  }

  private initializePrismaClient(): void {
    this.prismaClient = new PrismaClient({
      log: this.config.enableLogging 
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
      
      datasources: {
        db: {
          url: this.buildOptimizedConnectionString()
        }
      }
    })

    // Setup event listeners for monitoring
    if (this.config.enableLogging) {
      this.prismaClient.$on('query', (e) => {
        this.recordQueryMetrics(parseFloat(e.duration.toString()), true)
        
        if (parseFloat(e.duration.toString()) > 100) {
          console.warn('Slow query detected:', {
            duration: e.duration,
            query: e.query.substring(0, 100) + '...',
            params: e.params
          })
        }
      })
    }

    this.prismaClient.$on('error', (e) => {
      this.recordQueryMetrics(0, false)
      console.error('Database error:', e)
    })

    // Test initial connection
    this.testConnection()
  }

  private buildOptimizedConnectionString(): string {
    const baseUrl = process.env.DATABASE_URL || ''
    
    // Add connection pool parameters for PostgreSQL
    const url = new URL(baseUrl)
    
    // Phoenix optimized connection parameters
    url.searchParams.set('connection_limit', this.config.maxConnections.toString())
    url.searchParams.set('pool_timeout', '10')
    url.searchParams.set('connect_timeout', '10')
    url.searchParams.set('statement_cache_size', this.config.statementCacheSize.toString())
    
    // Performance optimizations
    url.searchParams.set('prepared_statement_cache_size', '100')
    url.searchParams.set('schema_cache_size', '1000')
    
    // SSL and security settings
    if (process.env.NODE_ENV === 'production') {
      url.searchParams.set('sslmode', 'require')
    }

    return url.toString()
  }

  private async testConnection(): Promise<void> {
    try {
      const start = performance.now()
      await this.prismaClient.$queryRaw`SELECT 1 as test`
      const latency = performance.now() - start
      
      this.connectionHealthStatus = true
      this.recordQueryMetrics(latency, true)
      
      console.log(`Phoenix Connection Pool initialized successfully. Latency: ${latency.toFixed(2)}ms`)
    } catch (error) {
      this.connectionHealthStatus = false
      console.error('Database connection test failed:', error)
      throw new Error('Failed to establish database connection')
    }
  }

  /**
   * Execute optimized query with connection pool
   */
  async executeQuery<T>(
    queryFn: (prisma: PrismaClient) => Promise<T>,
    options: {
      timeout?: number
      retries?: number
      cacheable?: boolean
    } = {}
  ): Promise<{ result: T; metrics: QueryMetrics }> {
    const startTime = performance.now()
    const {
      timeout = 30000,
      retries = 3,
      cacheable = false
    } = options

    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Health check if needed
        await this.ensureConnectionHealth()
        
        const connectionStartTime = performance.now()
        
        // Execute query with timeout
        const result = await Promise.race([
          queryFn(this.prismaClient),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ])
        
        const totalTime = performance.now() - startTime
        const connectionTime = performance.now() - connectionStartTime
        
        this.recordQueryMetrics(totalTime, true)
        
        return {
          result,
          metrics: {
            queryTime: totalTime - connectionTime,
            connectionTime: connectionTime,
            totalTime: totalTime,
            cached: false
          }
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        this.recordQueryMetrics(performance.now() - startTime, false)
        
        if (attempt === retries) {
          console.error(`Query failed after ${retries} attempts:`, {
            error: lastError.message,
            attempt,
            totalTime: performance.now() - startTime
          })
          break
        }
        
        // Exponential backoff for retries
        const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, backoffTime))
      }
    }

    throw lastError || new Error('Query execution failed')
  }

  /**
   * Optimized transaction execution
   */
  async executeTransaction<T>(
    transactionFn: (prisma: PrismaClient) => Promise<T>,
    options: {
      timeout?: number
      isolationLevel?: 'ReadCommitted' | 'RepeatableRead' | 'Serializable'
    } = {}
  ): Promise<{ result: T; metrics: QueryMetrics }> {
    const startTime = performance.now()
    const { timeout = 30000, isolationLevel = 'ReadCommitted' } = options

    try {
      await this.ensureConnectionHealth()
      
      const result = await this.prismaClient.$transaction(
        transactionFn,
        {
          maxWait: timeout,
          timeout: timeout,
          isolationLevel: isolationLevel as any
        }
      )

      const totalTime = performance.now() - startTime
      this.recordQueryMetrics(totalTime, true)

      return {
        result,
        metrics: {
          queryTime: totalTime,
          connectionTime: 0,
          totalTime: totalTime,
          cached: false
        }
      }
    } catch (error) {
      const totalTime = performance.now() - startTime
      this.recordQueryMetrics(totalTime, false)
      
      console.error('Transaction failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: totalTime
      })
      
      throw error
    }
  }

  /**
   * Batch query execution for optimal performance
   */
  async executeBatch<T>(
    queries: Array<(prisma: PrismaClient) => Promise<T>>,
    options: {
      batchSize?: number
      timeout?: number
      failFast?: boolean
    } = {}
  ): Promise<{ results: T[]; metrics: QueryMetrics; errors: Error[] }> {
    const startTime = performance.now()
    const {
      batchSize = 10,
      timeout = 60000,
      failFast = false
    } = options

    const results: T[] = []
    const errors: Error[] = []

    // Process queries in batches
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (queryFn, index) => {
        try {
          const result = await queryFn(this.prismaClient)
          return { success: true, result, index: i + index }
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown error')
          return { success: false, error: err, index: i + index }
        }
      })

      try {
        const batchResults = await Promise.all(batchPromises)
        
        for (const batchResult of batchResults) {
          if (batchResult.success) {
            results[batchResult.index] = (batchResult as any).result
          } else {
            errors.push((batchResult as any).error)
            if (failFast) {
              throw (batchResult as any).error
            }
          }
        }
      } catch (error) {
        if (failFast) {
          throw error
        }
        errors.push(error instanceof Error ? error : new Error('Batch execution failed'))
      }
    }

    const totalTime = performance.now() - startTime
    this.recordQueryMetrics(totalTime, errors.length === 0)

    return {
      results,
      errors,
      metrics: {
        queryTime: totalTime,
        connectionTime: 0,
        totalTime: totalTime,
        cached: false
      }
    }
  }

  private async ensureConnectionHealth(): Promise<void> {
    const now = Date.now()
    
    // Check connection health every 30 seconds
    if (now - this.lastHealthCheck > 30000) {
      this.lastHealthCheck = now
      
      try {
        const start = performance.now()
        await this.prismaClient.$queryRaw`SELECT 1`
        const latency = performance.now() - start
        
        this.connectionHealthStatus = latency < 1000 // Consider healthy if < 1s
        
        if (!this.connectionHealthStatus) {
          console.warn(`High database latency detected: ${latency.toFixed(2)}ms`)
        }
      } catch (error) {
        this.connectionHealthStatus = false
        console.error('Database health check failed:', error)
        throw new Error('Database connection unhealthy')
      }
    }
    
    if (!this.connectionHealthStatus) {
      throw new Error('Database connection is unhealthy')
    }
  }

  private recordQueryMetrics(queryTime: number, success: boolean): void {
    this.metrics.queryCount++
    
    if (!success) {
      this.metrics.errorCount++
    }
    
    // Update average latency (rolling average)
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.queryCount - 1)) + queryTime
    ) / this.metrics.queryCount
    
    // Add to query history (keep last 1000 queries)
    this.queryHistory.push({
      timestamp: Date.now(),
      queryTime,
      success
    })
    
    if (this.queryHistory.length > 1000) {
      this.queryHistory.shift()
    }
    
    // Update pool utilization (simplified estimation)
    this.metrics.poolUtilization = Math.min(
      (this.metrics.queryCount % this.config.maxConnections) / this.config.maxConnections * 100,
      100
    )
  }

  private setupMonitoring(): void {
    if (!this.config.enableMonitoring) return

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics()
    }, 5 * 60 * 1000)

    // Cleanup old query history every hour
    setInterval(() => {
      const cutoff = Date.now() - (60 * 60 * 1000) // 1 hour ago
      this.queryHistory = this.queryHistory.filter(q => q.timestamp > cutoff)
    }, 60 * 60 * 1000)
  }

  private logMetrics(): void {
    const recentQueries = this.queryHistory.filter(
      q => q.timestamp > Date.now() - (5 * 60 * 1000) // Last 5 minutes
    )
    
    const avgLatency = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.queryTime, 0) / recentQueries.length
      : 0
    
    const errorRate = recentQueries.length > 0
      ? (recentQueries.filter(q => !q.success).length / recentQueries.length) * 100
      : 0

    console.log('Phoenix Connection Pool Metrics:', {
      totalQueries: this.metrics.queryCount,
      recentQueries: recentQueries.length,
      averageLatency: `${avgLatency.toFixed(2)}ms`,
      errorRate: `${errorRate.toFixed(2)}%`,
      poolUtilization: `${this.metrics.poolUtilization.toFixed(2)}%`,
      connectionHealth: this.connectionHealthStatus ? 'Healthy' : 'Unhealthy'
    })
  }

  /**
   * Public API methods
   */
  getPrismaClient(): PrismaClient {
    return this.prismaClient
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics }
  }

  getConnectionHealth(): boolean {
    return this.connectionHealthStatus
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting Phoenix Connection Pool...')
    
    try {
      await this.prismaClient.$disconnect()
      console.log('Phoenix Connection Pool disconnected successfully')
    } catch (error) {
      console.error('Error disconnecting Phoenix Connection Pool:', error)
      throw error
    }
  }

  /**
   * Reset metrics and clear history
   */
  resetMetrics(): void {
    this.metrics = {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      averageLatency: 0,
      queryCount: 0,
      errorCount: 0,
      poolUtilization: 0
    }
    
    this.queryHistory = []
    console.log('Phoenix Connection Pool metrics reset')
  }
}

// Singleton instance
let phoenixPool: PhoenixConnectionPool | null = null

export function getPhoenixConnectionPool(config?: ConnectionPoolConfig): PhoenixConnectionPool {
  if (!phoenixPool) {
    phoenixPool = PhoenixConnectionPool.getInstance(config)
  }
  return phoenixPool
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting Phoenix Connection Pool...')
  if (phoenixPool) {
    try {
      await phoenixPool.disconnect()
    } catch (error) {
      console.error('Error during connection pool shutdown:', error)
    }
  }
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting Phoenix Connection Pool...')
  if (phoenixPool) {
    try {
      await phoenixPool.disconnect()
    } catch (error) {
      console.error('Error during connection pool shutdown:', error)
    }
  }
})