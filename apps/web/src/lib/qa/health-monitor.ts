/**
 * Zenith Automated QA Health Check System
 * Continuous monitoring and automated quality assurance
 */

interface HealthCheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  timestamp: Date
  duration: number
  metadata?: Record<string, any>
}

interface HealthReport {
  overall: 'healthy' | 'degraded' | 'critical'
  checks: HealthCheckResult[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
  timestamp: Date
}

type HealthCheckFunction = () => Promise<HealthCheckResult>

class ZenithHealthMonitor {
  private checks = new Map<string, HealthCheckFunction>()
  private isRunning = false
  private intervalId?: NodeJS.Timeout
  private lastReport?: HealthReport

  constructor() {
    this.registerDefaultChecks()
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, checkFn: HealthCheckFunction) {
    this.checks.set(name, checkFn)
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMinutes = 5) {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(async () => {
      try {
        const report = await this.runAllChecks()
        this.handleReport(report)
      } catch (error) {
        console.error('[Zenith Health] Monitoring error:', error)
      }
    }, intervalMinutes * 60 * 1000)

    console.log(`[Zenith Health] Monitoring started (${intervalMinutes}min intervals)`)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('[Zenith Health] Monitoring stopped')
  }

  /**
   * Run all registered health checks
   */
  async runAllChecks(): Promise<HealthReport> {
    const results: HealthCheckResult[] = []
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn()
        results.push(result)
      } catch (error) {
        results.push({
          name,
          status: 'fail',
          message: `Health check failed: ${error.message}`,
          timestamp: new Date(),
          duration: 0,
          metadata: { error: error.stack }
        })
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length
    }

    const overall = this.calculateOverallHealth(summary)

    const report: HealthReport = {
      overall,
      checks: results,
      summary,
      timestamp: new Date()
    }

    this.lastReport = report
    return report
  }

  /**
   * Get the last health report
   */
  getLastReport(): HealthReport | undefined {
    return this.lastReport
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks() {
    // Database connectivity check
    this.registerCheck('database', async (): Promise<HealthCheckResult> => {
      const start = Date.now()
      try {
        const response = await fetch('/api/health/database')
        const duration = Date.now() - start
        
        if (response.ok) {
          return {
            name: 'database',
            status: duration > 1000 ? 'warning' : 'pass',
            message: duration > 1000 ? `Database slow: ${duration}ms` : 'Database healthy',
            timestamp: new Date(),
            duration,
            metadata: { responseTime: duration }
          }
        } else {
          return {
            name: 'database',
            status: 'fail',
            message: `Database error: ${response.status}`,
            timestamp: new Date(),
            duration,
            metadata: { status: response.status }
          }
        }
      } catch (error) {
        return {
          name: 'database',
          status: 'fail',
          message: `Database connection failed: ${error.message}`,
          timestamp: new Date(),
          duration: Date.now() - start,
          metadata: { error: error.message }
        }
      }
    })

    // Authentication system check
    this.registerCheck('auth', async (): Promise<HealthCheckResult> => {
      const start = Date.now()
      try {
        const response = await fetch('/api/auth/session')
        const duration = Date.now() - start
        
        return {
          name: 'auth',
          status: response.ok ? 'pass' : 'fail',
          message: response.ok ? 'Auth system healthy' : `Auth error: ${response.status}`,
          timestamp: new Date(),
          duration,
          metadata: { status: response.status }
        }
      } catch (error) {
        return {
          name: 'auth',
          status: 'fail',
          message: `Auth system error: ${error.message}`,
          timestamp: new Date(),
          duration: Date.now() - start
        }
      }
    })

    // API endpoints check
    this.registerCheck('api', async (): Promise<HealthCheckResult> => {
      const endpoints = [
        '/api/health',
        '/api/auth/session',
        '/api/teams/lineup'
      ]
      
      const start = Date.now()
      const results = await Promise.allSettled(
        endpoints.map(endpoint => fetch(endpoint))
      )
      
      const duration = Date.now() - start
      const failures = results.filter(r => r.status === 'rejected' || 
        (r.status === 'fulfilled' && !r.value.ok))
      
      return {
        name: 'api',
        status: failures.length === 0 ? 'pass' : failures.length <= 1 ? 'warning' : 'fail',
        message: failures.length === 0 ? 'All APIs healthy' : `${failures.length} API failures`,
        timestamp: new Date(),
        duration,
        metadata: { 
          total: endpoints.length, 
          failures: failures.length,
          endpoints: endpoints
        }
      }
    })

    // Frontend hydration check
    this.registerCheck('hydration', async (): Promise<HealthCheckResult> => {
      if (typeof window === 'undefined') {
        return {
          name: 'hydration',
          status: 'pass',
          message: 'Server-side, skipping hydration check',
          timestamp: new Date(),
          duration: 0
        }
      }

      const start = Date.now()
      
      // Check for hydration errors in console
      const originalError = console.error
      let hydrationErrors = 0
      
      console.error = (...args) => {
        const message = args.join(' ')
        if (message.includes('hydration') || message.includes('Hydration failed')) {
          hydrationErrors++
        }
        originalError.apply(console, args)
      }

      // Wait a bit to catch any hydration errors
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.error = originalError
      const duration = Date.now() - start

      return {
        name: 'hydration',
        status: hydrationErrors === 0 ? 'pass' : 'fail',
        message: hydrationErrors === 0 ? 'No hydration errors' : `${hydrationErrors} hydration errors detected`,
        timestamp: new Date(),
        duration,
        metadata: { errorCount: hydrationErrors }
      }
    })

    // Performance metrics check
    this.registerCheck('performance', async (): Promise<HealthCheckResult> => {
      if (typeof window === 'undefined') {
        return {
          name: 'performance',
          status: 'pass',
          message: 'Server-side, skipping performance check',
          timestamp: new Date(),
          duration: 0
        }
      }

      const start = Date.now()
      
      // Check Core Web Vitals
      const vitals = await new Promise<any>((resolve) => {
        const metrics: any = {}
        
        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            metrics.lcp = entries[entries.length - 1].startTime
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] })

        // CLS
        let cls = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value
            }
          }
          metrics.cls = cls
        }).observe({ entryTypes: ['layout-shift'] })

        setTimeout(() => resolve(metrics), 1500)
      })

      const duration = Date.now() - start
      
      let status: 'pass' | 'warning' | 'fail' = 'pass'
      let messages = []
      
      if (vitals.lcp && vitals.lcp > 2500) {
        status = 'warning'
        messages.push(`LCP slow: ${vitals.lcp.toFixed(0)}ms`)
      }
      
      if (vitals.cls && vitals.cls > 0.1) {
        status = 'fail'
        messages.push(`CLS high: ${vitals.cls.toFixed(3)}`)
      }

      return {
        name: 'performance',
        status,
        message: messages.length > 0 ? messages.join(', ') : 'Performance metrics healthy',
        timestamp: new Date(),
        duration,
        metadata: vitals
      }
    })

    // Error rate check
    this.registerCheck('errors', async (): Promise<HealthCheckResult> => {
      const start = Date.now()
      
      // Check recent error reports
      try {
        const response = await fetch('/api/monitoring/health')
        const data = await response.json()
        const duration = Date.now() - start
        
        const errorRate = data.errorRate || 0
        const criticalErrors = data.criticalErrors || 0
        
        let status: 'pass' | 'warning' | 'fail' = 'pass'
        let message = 'Error rate normal'
        
        if (criticalErrors > 0) {
          status = 'fail'
          message = `${criticalErrors} critical errors`
        } else if (errorRate > 5) {
          status = 'warning'
          message = `Error rate elevated: ${errorRate.toFixed(1)}%`
        }

        return {
          name: 'errors',
          status,
          message,
          timestamp: new Date(),
          duration,
          metadata: { errorRate, criticalErrors }
        }
      } catch (error) {
        return {
          name: 'errors',
          status: 'warning',
          message: 'Cannot check error metrics',
          timestamp: new Date(),
          duration: Date.now() - start
        }
      }
    })

    // Memory usage check
    this.registerCheck('memory', async (): Promise<HealthCheckResult> => {
      if (typeof window === 'undefined' || !(performance as any).memory) {
        return {
          name: 'memory',
          status: 'pass',
          message: 'Memory metrics not available',
          timestamp: new Date(),
          duration: 0
        }
      }

      const start = Date.now()
      const memory = (performance as any).memory
      const duration = Date.now() - start
      
      const usedMB = memory.usedJSHeapSize / (1024 * 1024)
      const totalMB = memory.totalJSHeapSize / (1024 * 1024)
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024)
      
      const usage = (usedMB / limitMB) * 100
      
      let status: 'pass' | 'warning' | 'fail' = 'pass'
      let message = `Memory usage: ${usedMB.toFixed(1)}MB (${usage.toFixed(1)}%)`
      
      if (usage > 80) {
        status = 'fail'
        message = `Memory usage critical: ${usage.toFixed(1)}%`
      } else if (usage > 60) {
        status = 'warning'
        message = `Memory usage high: ${usage.toFixed(1)}%`
      }

      return {
        name: 'memory',
        status,
        message,
        timestamp: new Date(),
        duration,
        metadata: { usedMB, totalMB, limitMB, usage }
      }
    })
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(summary: HealthReport['summary']): HealthReport['overall'] {
    if (summary.failed > 0) {
      return summary.failed > summary.passed ? 'critical' : 'degraded'
    }
    
    if (summary.warnings > summary.passed / 2) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  /**
   * Handle health report
   */
  private async handleReport(report: HealthReport) {
    console.log(`[Zenith Health] Status: ${report.overall.toUpperCase()}`)
    console.log(`[Zenith Health] Checks: ${report.summary.passed}✓ ${report.summary.warnings}⚠ ${report.summary.failed}✗`)

    // Log failed checks
    const failedChecks = report.checks.filter(c => c.status === 'fail')
    if (failedChecks.length > 0) {
      console.error('[Zenith Health] Failed checks:')
      failedChecks.forEach(check => {
        console.error(`  - ${check.name}: ${check.message}`)
      })
    }

    // Log warnings
    const warningChecks = report.checks.filter(c => c.status === 'warning')
    if (warningChecks.length > 0) {
      console.warn('[Zenith Health] Warnings:')
      warningChecks.forEach(check => {
        console.warn(`  - ${check.name}: ${check.message}`)
      })
    }

    // Send alerts for critical issues
    if (report.overall === 'critical') {
      await this.sendCriticalAlert(report)
    }

    // Store report for API access
    try {
      await fetch('/api/monitoring/health-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      })
    } catch (error) {
      console.error('[Zenith Health] Failed to store report:', error)
    }
  }

  /**
   * Send critical health alerts
   */
  private async sendCriticalAlert(report: HealthReport) {
    const failedChecks = report.checks.filter(c => c.status === 'fail')
    
    console.error('[CRITICAL HEALTH ALERT]', {
      status: report.overall,
      failedChecks: failedChecks.map(c => ({ name: c.name, message: c.message })),
      timestamp: report.timestamp
    })

    // In production, send to alerting service (Slack, PagerDuty, etc.)
  }
}

// Singleton instance
const zenithHealth = new ZenithHealthMonitor()

// Auto-start in browser environment
if (typeof window !== 'undefined') {
  // Start monitoring after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      zenithHealth.startMonitoring(10) // Check every 10 minutes
    }, 5000) // Wait 5 seconds after load
  })
}

export { zenithHealth, ZenithHealthMonitor }
export type { HealthCheckResult, HealthReport, HealthCheckFunction }