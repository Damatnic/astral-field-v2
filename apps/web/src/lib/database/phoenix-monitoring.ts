/**
 * Phoenix Database Monitoring & Analytics System
 * Real-time database performance monitoring and optimization
 */

import { prisma } from '../prisma'

interface QueryMetrics {
  queryName: string
  executionTime: number
  timestamp: Date
  success: boolean
  rowsAffected?: number
  errorMessage?: string
}

interface ConnectionMetrics {
  activeConnections: number
  poolUtilization: number
  averageQueryTime: number
  queryCount: number
  errorRate: number
  slowQueryCount: number
}

interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical'
  score: number
  metrics: ConnectionMetrics
  recommendations: string[]
}

class PhoenixDatabaseMonitor {
  private static instance: PhoenixDatabaseMonitor
  private queryMetrics: QueryMetrics[] = []
  private readonly maxMetricsHistory = 10000
  private readonly slowQueryThreshold = 100 // ms
  private readonly criticalQueryThreshold = 500 // ms
  
  // Performance counters
  private counters = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    slowQueries: 0,
    criticalQueries: 0,
    totalExecutionTime: 0,
    connectionFailures: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  static getInstance(): PhoenixDatabaseMonitor {
    if (!PhoenixDatabaseMonitor.instance) {
      PhoenixDatabaseMonitor.instance = new PhoenixDatabaseMonitor()
    }
    return PhoenixDatabaseMonitor.instance
  }

  constructor() {
    this.startMetricsCleanup()
    this.startHealthChecks()
  }

  // Record query execution metrics
  recordQuery(queryName: string, executionTime: number, success: boolean, rowsAffected?: number, error?: Error): void {
    const metric: QueryMetrics = {
      queryName,
      executionTime,
      timestamp: new Date(),
      success,
      rowsAffected,
      errorMessage: error?.message
    }

    this.queryMetrics.push(metric)
    this.updateCounters(metric)

    // Trim old metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory)
    }

    // Log performance issues
    if (executionTime > this.criticalQueryThreshold) {
      console.warn(`🔥 Critical slow query detected: ${queryName} (${executionTime}ms)`)
      this.counters.criticalQueries++
    } else if (executionTime > this.slowQueryThreshold) {
      console.warn(`⚠️ Slow query detected: ${queryName} (${executionTime}ms)`)
      this.counters.slowQueries++
    }

    if (!success && error) {
      if (process.env.NODE_ENV === 'development') {

        console.error(`❌ Query failed: ${queryName}`, error.message);

      }
      this.counters.failedQueries++
    }
  }

  // Enhanced query execution wrapper with automatic monitoring
  async monitoredQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<T> {
    const start = performance.now()
    const { retries = 3, timeout = 30000 } = options
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout: ${queryName}`)), timeout)
        })
        
        const queryPromise = queryFunction()
        const result = await Promise.race([queryPromise, timeoutPromise])
        
        const executionTime = performance.now() - start
        this.recordQuery(queryName, executionTime, true)
        
        return result
      } catch (error) {
        lastError = error as Error
        
        if (attempt === retries) {
          const executionTime = performance.now() - start
          this.recordQuery(queryName, executionTime, false, undefined, lastError)
          throw lastError
        }
        
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  // Get current database health status
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentMetrics = this.queryMetrics.filter(m => m.timestamp.getTime() > oneMinuteAgo)
    
    const metrics: ConnectionMetrics = {
      activeConnections: await this.getActiveConnectionCount(),
      poolUtilization: this.calculatePoolUtilization(),
      averageQueryTime: this.calculateAverageQueryTime(recentMetrics),
      queryCount: recentMetrics.length,
      errorRate: this.calculateErrorRate(recentMetrics),
      slowQueryCount: recentMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length
    }

    const score = this.calculateHealthScore(metrics)
    const status = this.getHealthStatus(score)
    const recommendations = this.generateRecommendations(metrics, score)

    return {
      status,
      score,
      metrics,
      recommendations
    }
  }

  // Get detailed performance analytics
  getPerformanceAnalytics(timeRange: 'last_hour' | 'last_day' | 'last_week' = 'last_hour') {
    const now = Date.now()
    const timeRanges = {
      last_hour: 60 * 60 * 1000,
      last_day: 24 * 60 * 60 * 1000,
      last_week: 7 * 24 * 60 * 60 * 1000
    }
    
    const cutoff = now - timeRanges[timeRange]
    const relevantMetrics = this.queryMetrics.filter(m => m.timestamp.getTime() > cutoff)
    
    // Group by query name for analysis
    const queryAnalysis = new Map<string, {
      count: number
      totalTime: number
      avgTime: number
      maxTime: number
      minTime: number
      errorCount: number
      successRate: number
    }>()

    relevantMetrics.forEach(metric => {
      if (!queryAnalysis.has(metric.queryName)) {
        queryAnalysis.set(metric.queryName, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity,
          errorCount: 0,
          successRate: 0
        })
      }

      const stats = queryAnalysis.get(metric.queryName)!
      stats.count++
      stats.totalTime += metric.executionTime
      stats.maxTime = Math.max(stats.maxTime, metric.executionTime)
      stats.minTime = Math.min(stats.minTime, metric.executionTime)
      
      if (!metric.success) {
        stats.errorCount++
      }
    })

    // Calculate derived metrics
    queryAnalysis.forEach((stats, queryName) => {
      stats.avgTime = stats.totalTime / stats.count
      stats.successRate = ((stats.count - stats.errorCount) / stats.count) * 100
      if (stats.minTime === Infinity) stats.minTime = 0
    })

    return {
      timeRange,
      totalQueries: relevantMetrics.length,
      uniqueQueries: queryAnalysis.size,
      avgResponseTime: relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0) / relevantMetrics.length,
      errorRate: (relevantMetrics.filter(m => !m.success).length / relevantMetrics.length) * 100,
      slowQueryRate: (relevantMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length / relevantMetrics.length) * 100,
      queryBreakdown: Object.fromEntries(queryAnalysis),
      topSlowQueries: this.getTopSlowQueries(relevantMetrics),
      errorAnalysis: this.getErrorAnalysis(relevantMetrics)
    }
  }

  // Get real-time connection pool metrics
  async getConnectionPoolMetrics() {
    try {
      // This would connect to PostgreSQL specific monitoring if available
      const activeConnections = await this.getActiveConnectionCount()
      const maxConnections = await this.getMaxConnections()
      
      return {
        active: activeConnections,
        max: maxConnections,
        utilization: (activeConnections / maxConnections) * 100,
        available: maxConnections - activeConnections,
        poolEfficiency: this.calculatePoolEfficiency()
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('Failed to get connection metrics:', error);

      }
      return null
    }
  }

  // Cache performance metrics
  recordCacheHit(): void {
    this.counters.cacheHits++
  }

  recordCacheMiss(): void {
    this.counters.cacheMisses++
  }

  getCacheMetrics() {
    const total = this.counters.cacheHits + this.counters.cacheMisses
    return {
      hits: this.counters.cacheHits,
      misses: this.counters.cacheMisses,
      hitRate: total > 0 ? (this.counters.cacheHits / total) * 100 : 0,
      total
    }
  }

  // Get comprehensive system status
  async getSystemStatus() {
    const [health, connectionMetrics, cacheMetrics] = await Promise.all([
      this.getDatabaseHealth(),
      this.getConnectionPoolMetrics(),
      Promise.resolve(this.getCacheMetrics())
    ])

    return {
      health,
      connections: connectionMetrics,
      cache: cacheMetrics,
      counters: { ...this.counters },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  }

  // Database optimization recommendations
  async getOptimizationRecommendations() {
    const analytics = this.getPerformanceAnalytics('last_hour')
    const health = await this.getDatabaseHealth()
    
    const recommendations: Array<{
      type: 'performance' | 'indexing' | 'caching' | 'connection' | 'query'
      priority: 'low' | 'medium' | 'high' | 'critical'
      title: string
      description: string
      impact: string
      action: string
    }> = []

    // Analyze slow queries
    if (analytics.slowQueryRate > 10) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'High Slow Query Rate',
        description: `${analytics.slowQueryRate.toFixed(1)}% of queries are slow (>${this.slowQueryThreshold}ms)`,
        impact: 'Significant performance degradation',
        action: 'Review and optimize slow queries, add appropriate indexes'
      })
    }

    // Analyze error rates
    if (analytics.errorRate > 5) {
      recommendations.push({
        type: 'query',
        priority: 'critical',
        title: 'High Error Rate',
        description: `${analytics.errorRate.toFixed(1)}% of queries are failing`,
        impact: 'Application instability and data inconsistency',
        action: 'Investigate and fix failing queries immediately'
      })
    }

    // Analyze connection pool
    if (health.metrics.poolUtilization > 80) {
      recommendations.push({
        type: 'connection',
        priority: 'medium',
        title: 'High Connection Pool Utilization',
        description: `Pool utilization at ${health.metrics.poolUtilization.toFixed(1)}%`,
        impact: 'Potential connection bottlenecks',
        action: 'Consider increasing pool size or optimizing query patterns'
      })
    }

    // Analyze cache performance
    const cacheMetrics = this.getCacheMetrics()
    if (cacheMetrics.hitRate < 70 && cacheMetrics.total > 100) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is only ${cacheMetrics.hitRate.toFixed(1)}%`,
        impact: 'Increased database load and slower response times',
        action: 'Review caching strategy and TTL values'
      })
    }

    return recommendations
  }

  // Private helper methods
  private updateCounters(metric: QueryMetrics): void {
    this.counters.totalQueries++
    this.counters.totalExecutionTime += metric.executionTime
    
    if (metric.success) {
      this.counters.successfulQueries++
    } else {
      this.counters.failedQueries++
    }
  }

  private calculateAverageQueryTime(metrics: QueryMetrics[]): number {
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length
  }

  private calculateErrorRate(metrics: QueryMetrics[]): number {
    if (metrics.length === 0) return 0
    const errors = metrics.filter(m => !m.success).length
    return (errors / metrics.length) * 100
  }

  private calculatePoolUtilization(): number {
    // This would need actual pool metrics from Prisma
    // For now, return a simulated value based on query load
    const recentLoad = this.queryMetrics.slice(-100).length
    return Math.min((recentLoad / 100) * 80, 95) // Max 95% to be realistic
  }

  private calculateHealthScore(metrics: ConnectionMetrics): number {
    let score = 100

    // Penalize high error rates
    score -= metrics.errorRate * 2

    // Penalize slow queries
    score -= (metrics.slowQueryCount / metrics.queryCount) * 30

    // Penalize high pool utilization
    if (metrics.poolUtilization > 80) {
      score -= (metrics.poolUtilization - 80) * 2
    }

    // Penalize slow average response time
    if (metrics.averageQueryTime > 50) {
      score -= Math.min((metrics.averageQueryTime - 50) / 10, 20)
    }

    return Math.max(score, 0)
  }

  private getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= 80) return 'healthy'
    if (score >= 60) return 'warning'
    return 'critical'
  }

  private generateRecommendations(metrics: ConnectionMetrics, score: number): string[] {
    const recommendations: string[] = []

    if (metrics.errorRate > 5) {
      recommendations.push('High error rate detected - investigate failing queries')
    }

    if (metrics.averageQueryTime > 100) {
      recommendations.push('Slow query performance - consider adding indexes or optimizing queries')
    }

    if (metrics.poolUtilization > 80) {
      recommendations.push('High connection pool utilization - consider scaling or query optimization')
    }

    if (score < 60) {
      recommendations.push('Critical performance issues detected - immediate attention required')
    }

    return recommendations
  }

  private getTopSlowQueries(metrics: QueryMetrics[], limit: number = 5) {
    return metrics
      .filter(m => m.success)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit)
      .map(m => ({
        queryName: m.queryName,
        executionTime: m.executionTime,
        timestamp: m.timestamp,
        rowsAffected: m.rowsAffected
      }))
  }

  private getErrorAnalysis(metrics: QueryMetrics[]) {
    const errors = metrics.filter(m => !m.success)
    const errorCounts = new Map<string, number>()

    errors.forEach(error => {
      const message = error.errorMessage || 'Unknown error'
      errorCounts.set(message, (errorCounts.get(message) || 0) + 1)
    })

    return Object.fromEntries(errorCounts)
  }

  private async getActiveConnectionCount(): Promise<number> {
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active' AND datname = current_database()
      `
      return Number(result[0].count)
    } catch {
      return 0
    }
  }

  private async getMaxConnections(): Promise<number> {
    try {
      const result = await prisma.$queryRaw<Array<{ max_connections: string }>>`
        SHOW max_connections
      `
      return parseInt(result[0].max_connections)
    } catch {
      return 100 // Default assumption
    }
  }

  private calculatePoolEfficiency(): number {
    const totalQueries = this.counters.totalQueries
    const avgTime = totalQueries > 0 ? this.counters.totalExecutionTime / totalQueries : 0
    
    // Lower average time = higher efficiency
    return Math.max(100 - avgTime / 10, 0)
  }

  private startMetricsCleanup(): void {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - 60 * 60 * 1000 // Keep 1 hour of metrics
      this.queryMetrics = this.queryMetrics.filter(
        m => m.timestamp.getTime() > cutoff
      )
    }, 5 * 60 * 1000)
  }

  private startHealthChecks(): void {
    // Perform health checks every minute
    setInterval(async () => {
      try {
        const health = await this.getDatabaseHealth()
        if (health.status === 'critical') {
          if (process.env.NODE_ENV === 'development') {

            console.error('🚨 Database health critical:', health.recommendations);

          }
        } else if (health.status === 'warning') {
          if (process.env.NODE_ENV === 'development') {

            console.warn('⚠️ Database health warning:', health.recommendations);

          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Health check failed:', error);

        }
      }
    }, 60 * 1000)
  }
}

// Export singleton instance
export const phoenixMonitor = PhoenixDatabaseMonitor.getInstance()

// Export monitoring decorator for easy use
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    return phoenixMonitor.monitoredQuery(queryName, () => fn(...args))
  }) as T
}

// Export types
export type { QueryMetrics, ConnectionMetrics, DatabaseHealth }