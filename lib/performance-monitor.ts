/**
 * Phoenix Performance Monitor
 * Comprehensive performance monitoring and analytics for Astral Field
 * 
 * Features:
 * - Real-time performance metrics collection
 * - Database query performance tracking
 * - API endpoint latency monitoring
 * - Cache hit rate analysis
 * - System resource monitoring
 * - Automated alerting system
 * - Performance trending and insights
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { cpus, freemem, totalmem, loadavg } from 'os'
import pino from 'pino'
import { dbPool } from './database-pool'
import { cacheManager } from './cache-manager'
import { prisma } from './database-pool'

interface PerformanceConfig {
  monitoring?: {
    enabled?: boolean
    interval?: number // milliseconds
    retentionPeriod?: number // milliseconds
  }
  alerting?: {
    enabled?: boolean
    thresholds?: {
      apiLatency?: number // ms
      dbLatency?: number // ms
      cacheHitRate?: number // percentage
      errorRate?: number // percentage
      memoryUsage?: number // percentage
      cpuUsage?: number // percentage
    }
  }
  persistence?: {
    enabled?: boolean
    batchSize?: number
    flushInterval?: number // milliseconds
  }
}

interface SystemMetrics {
  timestamp: Date
  memory: {
    used: number
    free: number
    total: number
    usage: number // percentage
  }
  cpu: {
    cores: number
    loadAverage: number[]
    usage: number // percentage estimate
  }
  database: {
    totalConnections: number
    activeConnections: number
    waitingConnections: number
    maxConnections: number
    avgQueryTime: number
    slowQueries: number
    circuitBreakerState: string
  }
  cache: {
    l1HitRate: number
    l2HitRate: number
    totalRequests: number
    avgResponseTime: number
    memoryUsage: number
    redisConnected: boolean
  }
  api: {
    totalRequests: number
    avgLatency: number
    p95Latency: number
    p99Latency: number
    errorRate: number
    activeEndpoints: number
  }
}

interface AlertRule {
  name: string
  condition: (metrics: SystemMetrics) => boolean
  message: (metrics: SystemMetrics) => string
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldown: number // milliseconds
  lastTriggered?: number
}

interface PerformanceAlert {
  id: string
  rule: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  metrics: Partial<SystemMetrics>
  resolved?: boolean
  resolvedAt?: Date
}

class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor
  private logger: pino.Logger
  private config: Required<PerformanceConfig>
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout
  private metricsHistory: SystemMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private alertRules: AlertRule[] = []
  private apiMetrics: Map<string, { count: number, totalTime: number, errors: number }> = new Map()
  private pendingBatch: any[] = []

  private constructor(config: PerformanceConfig = {}) {
    super()
    
    this.logger = pino({
      name: 'PerformanceMonitor',
      level: process.env.LOG_LEVEL || 'info'
    })

    this.config = {
      monitoring: {
        enabled: config.monitoring?.enabled ?? true,
        interval: config.monitoring?.interval || 30000, // 30 seconds
        retentionPeriod: config.monitoring?.retentionPeriod || 24 * 60 * 60 * 1000 // 24 hours
      },
      alerting: {
        enabled: config.alerting?.enabled ?? true,
        thresholds: {
          apiLatency: config.alerting?.thresholds?.apiLatency || 500, // ms
          dbLatency: config.alerting?.thresholds?.dbLatency || 100, // ms
          cacheHitRate: config.alerting?.thresholds?.cacheHitRate || 80, // percentage
          errorRate: config.alerting?.thresholds?.errorRate || 5, // percentage
          memoryUsage: config.alerting?.thresholds?.memoryUsage || 85, // percentage
          cpuUsage: config.alerting?.thresholds?.cpuUsage || 80 // percentage
        }
      },
      persistence: {
        enabled: config.persistence?.enabled ?? (process.env.NODE_ENV === 'production'),
        batchSize: config.persistence?.batchSize || 100,
        flushInterval: config.persistence?.flushInterval || 60000 // 1 minute
      }
    }

    this.setupAlertRules()
    
    if (this.config.monitoring.enabled) {
      this.startMonitoring()
    }

    if (this.config.persistence.enabled) {
      this.startPersistenceWorker()
    }
  }

  static getInstance(config?: PerformanceConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config)
    }
    return PerformanceMonitor.instance
  }

  private setupAlertRules(): void {
    this.alertRules = [
      {
        name: 'high_api_latency',
        condition: (metrics) => metrics.api.avgLatency > this.config.alerting.thresholds.apiLatency,
        message: (metrics) => `High API latency detected: ${metrics.api.avgLatency.toFixed(2)}ms (threshold: ${this.config.alerting.thresholds.apiLatency}ms)`,
        severity: 'high',
        cooldown: 300000 // 5 minutes
      },
      {
        name: 'high_db_latency',
        condition: (metrics) => metrics.database.avgQueryTime > this.config.alerting.thresholds.dbLatency,
        message: (metrics) => `High database latency detected: ${metrics.database.avgQueryTime.toFixed(2)}ms (threshold: ${this.config.alerting.thresholds.dbLatency}ms)`,
        severity: 'high',
        cooldown: 300000
      },
      {
        name: 'low_cache_hit_rate',
        condition: (metrics) => metrics.cache.l1HitRate < this.config.alerting.thresholds.cacheHitRate,
        message: (metrics) => `Low cache hit rate detected: ${metrics.cache.l1HitRate.toFixed(2)}% (threshold: ${this.config.alerting.thresholds.cacheHitRate}%)`,
        severity: 'medium',
        cooldown: 600000 // 10 minutes
      },
      {
        name: 'high_error_rate',
        condition: (metrics) => metrics.api.errorRate > this.config.alerting.thresholds.errorRate,
        message: (metrics) => `High error rate detected: ${metrics.api.errorRate.toFixed(2)}% (threshold: ${this.config.alerting.thresholds.errorRate}%)`,
        severity: 'critical',
        cooldown: 180000 // 3 minutes
      },
      {
        name: 'high_memory_usage',
        condition: (metrics) => metrics.memory.usage > this.config.alerting.thresholds.memoryUsage,
        message: (metrics) => `High memory usage detected: ${metrics.memory.usage.toFixed(2)}% (threshold: ${this.config.alerting.thresholds.memoryUsage}%)`,
        severity: 'high',
        cooldown: 600000
      },
      {
        name: 'circuit_breaker_open',
        condition: (metrics) => metrics.database.circuitBreakerState === 'OPEN',
        message: () => 'Database circuit breaker is OPEN - service degraded',
        severity: 'critical',
        cooldown: 60000 // 1 minute
      },
      {
        name: 'cache_disconnected',
        condition: (metrics) => !metrics.cache.redisConnected,
        message: () => 'Cache system disconnected - performance degraded',
        severity: 'high',
        cooldown: 300000
      }
    ]
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.logger.info('Starting performance monitoring', {
      interval: this.config.monitoring.interval,
      alertingEnabled: this.config.alerting.enabled
    })

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.monitoring.interval)

    // Cleanup old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics()
    }, this.config.monitoring.retentionPeriod / 24) // Cleanup 24 times per retention period
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics()
      
      // Store metrics
      this.metricsHistory.push(metrics)
      
      // Check alerts
      if (this.config.alerting.enabled) {
        this.checkAlerts(metrics)
      }

      // Emit metrics event for external listeners
      this.emit('metrics', metrics)

      // Queue for persistence
      if (this.config.persistence.enabled) {
        this.queueForPersistence(metrics)
      }

      // Log summary every 10 collections
      if (this.metricsHistory.length % 10 === 0) {
        this.logMetricsSummary(metrics)
      }

    } catch (error) {
      this.logger.error('Error collecting metrics:', error)
    }
  }

  private async gatherSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date()

    // System metrics
    const memTotal = totalmem()
    const memFree = freemem()
    const memUsed = memTotal - memFree
    const memUsage = (memUsed / memTotal) * 100

    const cpuCores = cpus().length
    const loadAvg = loadavg()
    const cpuUsage = Math.min((loadAvg[0] / cpuCores) * 100, 100)

    // Database metrics
    const dbStats = dbPool.getPoolStats()
    const dbMetrics = dbPool.getMetrics()

    // Cache metrics
    const cacheStats = cacheManager.getCacheStats()
    const cacheMetrics = cacheManager.getMetrics()

    // API metrics
    const apiStats = this.calculateApiMetrics()

    return {
      timestamp,
      memory: {
        used: memUsed,
        free: memFree,
        total: memTotal,
        usage: memUsage
      },
      cpu: {
        cores: cpuCores,
        loadAverage: loadAvg,
        usage: cpuUsage
      },
      database: {
        totalConnections: dbStats.totalCount,
        activeConnections: dbStats.totalCount - dbStats.idleCount,
        waitingConnections: dbStats.waitingCount,
        maxConnections: dbStats.maxConnections,
        avgQueryTime: dbMetrics.avgExecutionTime,
        slowQueries: dbMetrics.slowQueries,
        circuitBreakerState: dbStats.circuitBreakerState
      },
      cache: {
        l1HitRate: cacheMetrics.l1Hits / Math.max(cacheMetrics.l1Hits + cacheMetrics.l1Misses, 1) * 100,
        l2HitRate: cacheMetrics.l2Hits / Math.max(cacheMetrics.l2Hits + cacheMetrics.l2Misses, 1) * 100,
        totalRequests: cacheMetrics.totalRequests,
        avgResponseTime: cacheMetrics.avgResponseTime,
        memoryUsage: cacheStats.memory.calculatedSize || 0,
        redisConnected: cacheStats.redis.healthy
      },
      api: {
        totalRequests: apiStats.totalRequests,
        avgLatency: apiStats.avgLatency,
        p95Latency: apiStats.p95Latency,
        p99Latency: apiStats.p99Latency,
        errorRate: apiStats.errorRate,
        activeEndpoints: this.apiMetrics.size
      }
    }
  }

  private calculateApiMetrics() {
    const allRequests = Array.from(this.apiMetrics.values())
    const totalRequests = allRequests.reduce((sum, metric) => sum + metric.count, 0)
    const totalTime = allRequests.reduce((sum, metric) => sum + metric.totalTime, 0)
    const totalErrors = allRequests.reduce((sum, metric) => sum + metric.errors, 0)

    const avgLatency = totalRequests > 0 ? totalTime / totalRequests : 0
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

    // Calculate percentiles (simplified estimation)
    const latencies = allRequests.flatMap(metric => 
      Array(metric.count).fill(metric.totalTime / metric.count)
    ).sort((a, b) => a - b)

    const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0
    const p99Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0

    return {
      totalRequests,
      avgLatency,
      p95Latency,
      p99Latency,
      errorRate
    }
  }

  private checkAlerts(metrics: SystemMetrics): void {
    const now = Date.now()

    for (const rule of this.alertRules) {
      // Check cooldown
      if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) {
        continue
      }

      // Check condition
      if (rule.condition(metrics)) {
        const alert: PerformanceAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          rule: rule.name,
          severity: rule.severity,
          message: rule.message(metrics),
          timestamp: new Date(),
          metrics: this.extractRelevantMetrics(metrics, rule.name)
        }

        this.alerts.push(alert)
        rule.lastTriggered = now

        // Emit alert
        this.emit('alert', alert)

        // Log alert
        this.logger.warn('Performance alert triggered', {
          rule: rule.name,
          severity: rule.severity,
          message: alert.message,
          metrics: alert.metrics
        })

        // Auto-resolve some alerts
        this.scheduleAlertResolution(alert, rule)
      }
    }
  }

  private extractRelevantMetrics(metrics: SystemMetrics, ruleName: string): Partial<SystemMetrics> {
    switch (ruleName) {
      case 'high_api_latency':
        return { api: metrics.api, timestamp: metrics.timestamp }
      case 'high_db_latency':
        return { database: metrics.database, timestamp: metrics.timestamp }
      case 'low_cache_hit_rate':
        return { cache: metrics.cache, timestamp: metrics.timestamp }
      case 'high_memory_usage':
        return { memory: metrics.memory, timestamp: metrics.timestamp }
      default:
        return { timestamp: metrics.timestamp }
    }
  }

  private scheduleAlertResolution(alert: PerformanceAlert, rule: AlertRule): void {
    // Auto-resolve alerts after 2x cooldown period if condition is no longer met
    setTimeout(async () => {
      try {
        const currentMetrics = await this.gatherSystemMetrics()
        if (!rule.condition(currentMetrics)) {
          alert.resolved = true
          alert.resolvedAt = new Date()
          this.emit('alert_resolved', alert)
          this.logger.info('Alert auto-resolved', { alertId: alert.id, rule: rule.name })
        }
      } catch (error) {
        this.logger.error('Error checking alert resolution:', error)
      }
    }, rule.cooldown * 2)
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.monitoring.retentionPeriod
    const initialCount = this.metricsHistory.length

    this.metricsHistory = this.metricsHistory.filter(
      metric => metric.timestamp.getTime() > cutoff
    )

    // Also cleanup old alerts (keep last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    if (initialCount !== this.metricsHistory.length) {
      this.logger.debug('Cleaned up old metrics', {
        removed: initialCount - this.metricsHistory.length,
        remaining: this.metricsHistory.length
      })
    }
  }

  private queueForPersistence(metrics: SystemMetrics): void {
    this.pendingBatch.push({
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metricName: 'system_performance',
      metricType: 'SYSTEM_METRICS',
      value: metrics.memory.usage, // Primary metric for sorting
      metadata: metrics,
      timestamp: metrics.timestamp
    })
  }

  private startPersistenceWorker(): void {
    setInterval(() => {
      this.flushPendingMetrics()
    }, this.config.persistence.flushInterval)
  }

  private async flushPendingMetrics(): Promise<void> {
    if (this.pendingBatch.length === 0) return

    try {
      const batch = this.pendingBatch.splice(0, this.config.persistence.batchSize)
      
      await prisma.performance_metrics.createMany({
        data: batch
      })

      this.logger.debug('Flushed performance metrics to database', {
        count: batch.length
      })

    } catch (error) {
      this.logger.error('Error persisting performance metrics:', error)
      // Put failed batch back at the beginning
      this.pendingBatch.unshift(...this.pendingBatch.splice(-this.config.persistence.batchSize))
    }
  }

  private logMetricsSummary(metrics: SystemMetrics): void {
    this.logger.info('Performance metrics summary', {
      memory: {
        usage: `${metrics.memory.usage.toFixed(2)}%`,
        used: `${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(2)}GB`,
        free: `${(metrics.memory.free / 1024 / 1024 / 1024).toFixed(2)}GB`
      },
      cpu: {
        usage: `${metrics.cpu.usage.toFixed(2)}%`,
        cores: metrics.cpu.cores,
        loadAvg: metrics.cpu.loadAverage.map(l => l.toFixed(2))
      },
      database: {
        connections: `${metrics.database.activeConnections}/${metrics.database.maxConnections}`,
        avgQueryTime: `${metrics.database.avgQueryTime.toFixed(2)}ms`,
        circuitBreaker: metrics.database.circuitBreakerState
      },
      cache: {
        l1HitRate: `${metrics.cache.l1HitRate.toFixed(2)}%`,
        l2HitRate: `${metrics.cache.l2HitRate.toFixed(2)}%`,
        avgResponseTime: `${metrics.cache.avgResponseTime.toFixed(2)}ms`
      },
      api: {
        totalRequests: metrics.api.totalRequests,
        avgLatency: `${metrics.api.avgLatency.toFixed(2)}ms`,
        errorRate: `${metrics.api.errorRate.toFixed(2)}%`
      }
    })
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  recordApiCall(endpoint: string, duration: number, isError: boolean = false): void {
    if (!this.apiMetrics.has(endpoint)) {
      this.apiMetrics.set(endpoint, { count: 0, totalTime: 0, errors: 0 })
    }

    const metric = this.apiMetrics.get(endpoint)!
    metric.count++
    metric.totalTime += duration
    if (isError) metric.errors++
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null
  }

  getMetricsHistory(hours: number = 1): SystemMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.metricsHistory.filter(
      metric => metric.timestamp.getTime() > cutoff
    )
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  getAllAlerts(limit: number = 50): PerformanceAlert[] {
    return this.alerts.slice(-limit)
  }

  getPerformanceTrends(hours: number = 24) {
    const metrics = this.getMetricsHistory(hours)
    if (metrics.length === 0) return null

    const latest = metrics[metrics.length - 1]
    const earliest = metrics[0]

    return {
      timespan: {
        start: earliest.timestamp,
        end: latest.timestamp,
        duration: latest.timestamp.getTime() - earliest.timestamp.getTime()
      },
      trends: {
        memory: {
          current: latest.memory.usage,
          average: metrics.reduce((sum, m) => sum + m.memory.usage, 0) / metrics.length,
          peak: Math.max(...metrics.map(m => m.memory.usage))
        },
        api: {
          current: latest.api.avgLatency,
          average: metrics.reduce((sum, m) => sum + m.api.avgLatency, 0) / metrics.length,
          peak: Math.max(...metrics.map(m => m.api.avgLatency))
        },
        database: {
          current: latest.database.avgQueryTime,
          average: metrics.reduce((sum, m) => sum + m.database.avgQueryTime, 0) / metrics.length,
          peak: Math.max(...metrics.map(m => m.database.avgQueryTime))
        },
        cache: {
          current: latest.cache.l1HitRate,
          average: metrics.reduce((sum, m) => sum + m.cache.l1HitRate, 0) / metrics.length,
          lowest: Math.min(...metrics.map(m => m.cache.l1HitRate))
        }
      }
    }
  }

  async getHealthStatus(): Promise<any> {
    const latestMetrics = this.getLatestMetrics()
    if (!latestMetrics) {
      return { status: 'unknown', message: 'No metrics available' }
    }

    const activeAlerts = this.getActiveAlerts()
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical')
    const highAlerts = activeAlerts.filter(a => a.severity === 'high')

    let status = 'healthy'
    let message = 'All systems operating normally'

    if (criticalAlerts.length > 0) {
      status = 'critical'
      message = `${criticalAlerts.length} critical alert(s) active`
    } else if (highAlerts.length > 0) {
      status = 'degraded'
      message = `${highAlerts.length} high severity alert(s) active`
    } else if (activeAlerts.length > 0) {
      status = 'warning'
      message = `${activeAlerts.length} alert(s) active`
    }

    return {
      status,
      message,
      timestamp: new Date(),
      metrics: latestMetrics,
      alerts: {
        total: activeAlerts.length,
        critical: criticalAlerts.length,
        high: highAlerts.length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length
      }
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    this.logger.info('Performance monitoring stopped')
  }

  async shutdown(): Promise<void> {
    this.stopMonitoring()
    
    // Flush any pending metrics
    if (this.config.persistence.enabled && this.pendingBatch.length > 0) {
      await this.flushPendingMetrics()
    }

    this.logger.info('Performance monitor shutdown complete')
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Export for testing and advanced usage
export { PerformanceMonitor }

// Export types
export type { 
  PerformanceConfig, 
  SystemMetrics, 
  PerformanceAlert,
  AlertRule
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down performance monitor...')
  try {
    await performanceMonitor.shutdown()
  } catch (error) {
    console.error('Error during performance monitor shutdown:', error)
  }
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down performance monitor...')
  try {
    await performanceMonitor.shutdown()
  } catch (error) {
    console.error('Error during performance monitor shutdown:', error)
  }
})