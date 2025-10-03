/**
 * Zenith QA Monitor
 * Comprehensive error tracking and performance monitoring for production
 */

interface ZenithError {
  id: string
  timestamp: Date
  type: 'hydration' | 'import' | 'auth' | 'network' | 'runtime' | 'performance'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  sessionId?: string
  metadata: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  url: string
  userId?: string
  metadata?: Record<string, any>
}

interface QAReport {
  errors: ZenithError[]
  performance: PerformanceMetric[]
  summary: {
    totalErrors: number
    criticalErrors: number
    avgResponseTime: number
    errorRate: number
    uptime: number
  }
}

class ZenithQAMonitor {
  private errors: ZenithError[] = []
  private metrics: PerformanceMetric[] = []
  private initialized = false
  private sessionId: string
  private startTime: number
  private errorThresholds = {
    hydration: 0, // Zero tolerance for hydration errors
    import: 3,    // Max 3 import failures per session
    auth: 5,      // Max 5 auth errors per session
    performance: 10 // Max 10 performance issues per session
  }

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
  }

  /**
   * Initialize monitoring - call this in _app.tsx or layout.tsx
   */
  initialize() {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    
    // Monitor hydration errors
    this.monitorHydrationErrors()
    
    // Monitor dynamic import failures
    this.monitorImportFailures()
    
    // Monitor performance metrics
    this.monitorPerformance()
    
    // Monitor React errors
    this.monitorReactErrors()
    
    // Monitor network errors
    this.monitorNetworkErrors()
    
    // Monitor authentication errors
    this.monitorAuthErrors()
    
    // Set up periodic reporting
    this.setupPeriodicReporting()
  }

  /**
   * Monitor React hydration errors
   */
  private monitorHydrationErrors() {
    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      
      if (this.isHydrationError(message)) {
        this.reportError({
          type: 'hydration',
          message,
          severity: 'critical',
          metadata: {
            args,
            component: this.extractComponentFromError(message)
          }
        })
      }
      
      originalError.apply(console, args)
    }
  }

  /**
   * Monitor dynamic import failures
   */
  private monitorImportFailures() {
    // Override dynamic import error handling
    window.addEventListener('error', (event) => {
      if (event.error?.message?.includes('Loading chunk') || 
          event.error?.message?.includes('import()')) {
        this.reportError({
          type: 'import',
          message: event.error.message,
          stack: event.error.stack,
          severity: 'high',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        })
      }
    })

    // Monitor unhandled promise rejections (often from failed imports)
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('import') || 
          event.reason?.message?.includes('chunk')) {
        this.reportError({
          type: 'import',
          message: event.reason.message || 'Dynamic import failed',
          stack: event.reason.stack,
          severity: 'high',
          metadata: {
            reason: event.reason
          }
        })
      }
    })
  }

  /**
   * Monitor performance metrics
   */
  private monitorPerformance() {
    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'first-contentful-paint',
            value: entry.startTime,
            metadata: { entryType: entry.entryType }
          })
        }
      }).observe({ entryTypes: ['paint'] })

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'largest-contentful-paint',
            value: (entry as any).startTime,
            metadata: { 
              element: (entry as any).element?.tagName,
              size: (entry as any).size
            }
          })
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            this.recordMetric({
              name: 'cumulative-layout-shift',
              value: (entry as any).value,
              metadata: { 
                sources: (entry as any).sources?.map((s: any) => ({
                  node: s.node?.tagName,
                  previousRect: s.previousRect,
                  currentRect: s.currentRect
                }))
              }
            })
          }
        }
      }).observe({ entryTypes: ['layout-shift'] })

      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'first-input-delay',
            value: (entry as any).processingStart - entry.startTime,
            metadata: { 
              inputType: (entry as any).name,
              target: (entry as any).target?.tagName
            }
          })
        }
      }).observe({ entryTypes: ['first-input'] })
    }

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        
        this.recordMetric({
          name: 'dns-lookup',
          value: navigation.domainLookupEnd - navigation.domainLookupStart
        })
        
        this.recordMetric({
          name: 'tcp-connection',
          value: navigation.connectEnd - navigation.connectStart
        })
        
        this.recordMetric({
          name: 'server-response',
          value: navigation.responseEnd - navigation.requestStart
        })
        
        this.recordMetric({
          name: 'dom-interactive',
          value: navigation.domInteractive - navigation.fetchStart
        })
        
        this.recordMetric({
          name: 'page-load',
          value: navigation.loadEventEnd - navigation.fetchStart
        })
      }, 0)
    })
  }

  /**
   * Monitor React component errors
   */
  private monitorReactErrors() {
    window.addEventListener('error', (event) => {
      if (event.error?.componentStack || 
          event.message?.includes('React') ||
          event.error?.name === 'ChunkLoadError') {
        this.reportError({
          type: 'runtime',
          message: event.message || event.error?.message,
          stack: event.error?.stack,
          severity: this.getSeverityFromError(event.error),
          metadata: {
            componentStack: event.error?.componentStack,
            filename: event.filename,
            lineno: event.lineno
          }
        })
      }
    })
  }

  /**
   * Monitor network errors
   */
  private monitorNetworkErrors() {
    // Monitor fetch failures
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        if (!response.ok) {
          this.reportError({
            type: 'network',
            message: `HTTP ${response.status}: ${response.statusText}`,
            severity: response.status >= 500 ? 'high' : 'medium',
            metadata: {
              url: response.url,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries())
            }
          })
        }
        
        return response
      } catch (error: any) {
        this.reportError({
          type: 'network',
          message: error.message || 'Network request failed',
          severity: 'high',
          metadata: {
            url: args[0]?.toString(),
            error: error.name
          }
        })
        throw error
      }
    }
  }

  /**
   * Monitor authentication errors
   */
  private monitorAuthErrors() {
    // Listen for auth-related errors in console
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      const message = args.join(' ')
      
      if (message.includes('auth') || message.includes('session') || message.includes('token')) {
        this.reportError({
          type: 'auth',
          message,
          severity: 'medium',
          metadata: { args }
        })
      }
      
      originalWarn.apply(console, args)
    }
  }

  /**
   * Report an error
   */
  private reportError(errorData: Partial<ZenithError>) {
    const error: ZenithError = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: errorData.type || 'runtime',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata: errorData.metadata || {},
      severity: errorData.severity || 'medium'
    }

    this.errors.push(error)
    
    // Check thresholds and take action
    this.checkErrorThresholds(error)
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(error)
    } else {
      if (process.env.NODE_ENV === 'development') {

        console.warn('[Zenith QA] Error detected:', error);

      }
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metricData: Partial<PerformanceMetric>) {
    const metric: PerformanceMetric = {
      name: metricData.name || 'unknown',
      value: metricData.value || 0,
      timestamp: new Date(),
      url: window.location.href,
      metadata: metricData.metadata
    }

    this.metrics.push(metric)
    
    // Check performance thresholds
    this.checkPerformanceThresholds(metric)
  }

  /**
   * Check error thresholds and alert if exceeded
   */
  private checkErrorThresholds(error: ZenithError) {
    const typeErrors = this.errors.filter(e => e.type === error.type)
    const threshold = this.errorThresholds[error.type]
    
    if (typeErrors.length >= threshold) {
      if (process.env.NODE_ENV === 'development') {

        console.error(`[Zenith QA] Error threshold exceeded for ${error.type}: ${typeErrors.length}/${threshold}`);

      }
      // Could trigger alerts, disable features, etc.
      if (error.type === 'hydration') {
        this.handleCriticalHydrationIssue()
      }
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metric: PerformanceMetric) {
    const thresholds = {
      'first-contentful-paint': 1800,
      'largest-contentful-paint': 2500,
      'first-input-delay': 100,
      'cumulative-layout-shift': 0.1,
      'page-load': 5000
    }

    const threshold = thresholds[metric.name as keyof typeof thresholds]
    if (threshold && metric.value > threshold) {
      this.reportError({
        type: 'performance',
        message: `Performance threshold exceeded: ${metric.name} = ${metric.value}ms (threshold: ${threshold}ms)`,
        severity: 'medium',
        metadata: { metric }
      })
    }
  }

  /**
   * Handle critical hydration issues
   */
  private handleCriticalHydrationIssue() {
    // Could implement fallback strategies
    if (process.env.NODE_ENV === 'development') {

      console.error('[Zenith QA] Critical hydration issue detected - implementing fallback strategies');

    }
    // Example: Disable SSR for problematic components
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('zenith-disable-ssr', 'true')
    }
  }

  /**
   * Generate QA report
   */
  generateReport(): QAReport {
    const now = Date.now()
    const sessionDuration = now - this.startTime
    
    const criticalErrors = this.errors.filter(e => e.severity === 'critical')
    const avgResponseTime = this.metrics
      .filter(m => m.name === 'server-response')
      .reduce((sum, m) => sum + m.value, 0) / 
      Math.max(this.metrics.filter(m => m.name === 'server-response').length, 1)

    return {
      errors: this.errors,
      performance: this.metrics,
      summary: {
        totalErrors: this.errors.length,
        criticalErrors: criticalErrors.length,
        avgResponseTime,
        errorRate: (this.errors.length / sessionDuration) * 1000 * 60, // errors per minute
        uptime: sessionDuration
      }
    }
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return 'zenith_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private generateErrorId(): string {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private isHydrationError(message: string): boolean {
    return message.includes('hydration') || 
           message.includes('Cannot read properties of undefined') ||
           message.includes('Hydration failed') ||
           message.includes('server HTML didn\'t match')
  }

  private extractComponentFromError(message: string): string | undefined {
    const match = message.match(/in (\w+)/i)
    return match?.[1]
  }

  private getSeverityFromError(error: any): 'low' | 'medium' | 'high' | 'critical' {
    if (error?.name === 'ChunkLoadError') return 'high'
    if (error?.message?.includes('hydration')) return 'critical'
    if (error?.message?.includes('auth')) return 'high'
    return 'medium'
  }

  private async sendToMonitoringService(error: ZenithError) {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      })
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {

        console.error('[Zenith QA] Failed to send error to monitoring service:', e);

      }
    }
  }

  private setupPeriodicReporting() {
    // Report every 5 minutes
    setInterval(() => {
      if (this.errors.length > 0 || this.metrics.length > 0) {
        const report = this.generateReport()
        if (process.env.NODE_ENV === 'production') {
          this.sendReportToService(report)
        }
      }
    }, 5 * 60 * 1000)
  }

  private async sendReportToService(report: QAReport) {
    try {
      await fetch('/api/monitoring/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      })
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {

        console.error('[Zenith QA] Failed to send report to monitoring service:', e);

      }
    }
  }
}

// Singleton instance
const zenithMonitor = new ZenithQAMonitor()

export { zenithMonitor, ZenithQAMonitor }
export type { ZenithError, PerformanceMetric, QAReport }