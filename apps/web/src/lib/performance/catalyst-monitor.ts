/**
 * Catalyst Performance Monitoring System
 * Real-time Core Web Vitals tracking, performance budgets, and optimization insights
 */

interface PerformanceMetric {
  name: string
  value: number
  threshold?: number
  timestamp: number
  url: string
  userAgent: string
  connectionType?: string
}

interface CoreWebVitals {
  FCP?: number // First Contentful Paint
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  TTFB?: number // Time to First Byte
  INP?: number // Interaction to Next Paint
}

interface PerformanceBudget {
  FCP: number
  LCP: number
  FID: number
  CLS: number
  TTFB: number
  INP: number
  bundleSize: number
  imageSize: number
  fontCount: number
}

interface ResourceTiming {
  name: string
  size: number
  duration: number
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'other'
  cached: boolean
}

interface PerformanceReport {
  timestamp: number
  url: string
  userAgent: string
  connectionType?: string
  coreWebVitals: CoreWebVitals
  resourceTimings: ResourceTiming[]
  memoryUsage?: {
    used: number
    total: number
    limit: number
  }
  pageLoadTime: number
  domContentLoadedTime: number
  timeToInteractive?: number
  budgetViolations: string[]
  recommendations: string[]
}

class CatalystPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()
  private budget: PerformanceBudget
  private reportInterval: number
  private isInitialized = false
  
  // Performance thresholds (Google's recommended values)
  private readonly THRESHOLDS = {
    FCP: 1800,  // Good: < 1.8s
    LCP: 2500,  // Good: < 2.5s
    FID: 100,   // Good: < 100ms
    CLS: 0.1,   // Good: < 0.1
    TTFB: 600,  // Good: < 600ms
    INP: 200    // Good: < 200ms
  }

  constructor(
    budget: Partial<PerformanceBudget> = {},
    reportInterval = 30000 // 30 seconds
  ) {
    this.budget = {
      ...this.THRESHOLDS,
      bundleSize: 500 * 1024, // 500KB
      imageSize: 100 * 1024,  // 100KB per image
      fontCount: 4,           // Max 4 fonts
      ...budget
    }
    this.reportInterval = reportInterval
    
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private initialize() {
    if (this.isInitialized) return
    // Initialize Core Web Vitals tracking
    this.trackCoreWebVitals()
    
    // Initialize resource monitoring
    this.trackResourceTimings()
    
    // Initialize memory monitoring
    this.trackMemoryUsage()
    
    // Initialize user interactions
    this.trackUserInteractions()
    
    // Set up periodic reporting
    setInterval(() => this.generateReport(), this.reportInterval)
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.generateReport() // Send final report when page becomes hidden
      }
    })
    
    this.isInitialized = true
  }

  private trackCoreWebVitals() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.recordMetric('FCP', entry.startTime, this.budget.FCP)
            }
          }
        })
        fcpObserver.observe({ entryTypes: ['paint'] })
        this.observers.set('fcp', fcpObserver)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('[Catalyst Monitor] FCP tracking not supported');

        }
      }

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          this.recordMetric('LCP', lastEntry.startTime, this.budget.LCP)
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.set('lcp', lcpObserver)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('[Catalyst Monitor] LCP tracking not supported');

        }
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('processingStart' in entry) {
              const fid = (entry as any).processingStart - entry.startTime
              this.recordMetric('FID', fid, this.budget.FID)
            }
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.set('fid', fidObserver)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('[Catalyst Monitor] FID tracking not supported');

        }
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('hadRecentInput' in entry && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          this.recordMetric('CLS', clsValue, this.budget.CLS)
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.set('cls', clsObserver)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('[Catalyst Monitor] CLS tracking not supported');

        }
      }

      // Interaction to Next Paint (INP)
      try {
        const inpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('processingEnd' in entry) {
              const inp = (entry as any).processingEnd - entry.startTime
              this.recordMetric('INP', inp, this.budget.INP)
            }
          }
        })
        inpObserver.observe({ entryTypes: ['event'] })
        this.observers.set('inp', inpObserver)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('[Catalyst Monitor] INP tracking not supported');

        }
      }
    }

    // Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigationTiming) {
        const ttfb = navigationTiming.responseStart - navigationTiming.fetchStart
        this.recordMetric('TTFB', ttfb, this.budget.TTFB)
      }
    })
  }

  private trackResourceTimings() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.analyzeResource(entry as PerformanceResourceTiming)
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.set('resource', resourceObserver)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('[Catalyst Monitor] Resource timing not supported');

        }
      }
    }
  }

  private analyzeResource(entry: PerformanceResourceTiming) {
    const url = new URL(entry.name)
    const size = entry.transferSize || 0
    const duration = entry.duration
    
    let type: ResourceTiming['type'] = 'other'
    if (entry.name.match(/\.(js|mjs)$/)) type = 'script'
    else if (entry.name.match(/\.css$/)) type = 'stylesheet'
    else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)) type = 'image'
    else if (entry.name.match(/\.(woff|woff2|ttf|otf)$/)) type = 'font'

    const resource: ResourceTiming = {
      name: url.pathname,
      size,
      duration,
      type,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0
    }

    // Check budget violations
    if (type === 'image' && size > this.budget.imageSize) {
      console.warn(`[Catalyst Monitor] Image size budget violation: ${url.pathname} (${(size/1024).toFixed(1)}KB)`)
    }

    // Record slow resources
    if (duration > 1000) { // > 1 second
      console.warn(`[Catalyst Monitor] Slow resource: ${url.pathname} (${duration.toFixed(0)}ms)`)
    }
  }

  private trackMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.recordMetric('memoryUsed', memory.usedJSHeapSize / 1024 / 1024) // MB
        this.recordMetric('memoryTotal', memory.totalJSHeapSize / 1024 / 1024) // MB
      }, 5000) // Every 5 seconds
    }
  }

  private trackUserInteractions() {
    // Track click responsiveness
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const startTime = performance.now()
        
        // Use scheduler.postTask or setTimeout fallback
        const scheduleCallback = (window as any).scheduler?.postTask || 
          ((callback: () => void) => setTimeout(callback, 0))
        
        scheduleCallback(() => {
          const duration = performance.now() - startTime
          this.recordMetric(`${eventType}Responsiveness`, duration)
        })
      }, { passive: true })
    })
  }

  private recordMetric(name: string, value: number, threshold?: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      threshold,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType()
    }

    this.metrics.set(name, metric)

    // Log threshold violations
    if (threshold && value > threshold) {
      console.warn(`[Catalyst Monitor] Performance threshold violation: ${name} = ${value.toFixed(2)} (threshold: ${threshold})`)
    }

    // Send critical metrics immediately
    if (this.isCriticalMetric(name, value, threshold)) {
      this.sendMetric(metric)
    }
  }

  private isCriticalMetric(name: string, value: number, threshold?: number): boolean {
    if (!threshold) return false
    
    // Send immediately if significantly over threshold
    const violationRatio = value / threshold
    return violationRatio > 2 || (name === 'CLS' && violationRatio > 1.5)
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    return connection?.effectiveType || 'unknown'
  }

  private generateReport(): PerformanceReport {
    const coreWebVitals: CoreWebVitals = {}
    const budgetViolations: string[] = []
    const recommendations: string[] = []

    // Collect Core Web Vitals
    for (const [name, metric] of this.metrics) {
      if (['FCP', 'LCP', 'FID', 'CLS', 'TTFB', 'INP'].includes(name)) {
        coreWebVitals[name as keyof CoreWebVitals] = metric.value
        
        if (metric.threshold && metric.value > metric.threshold) {
          budgetViolations.push(`${name}: ${metric.value.toFixed(2)} > ${metric.threshold}`)
        }
      }
    }

    // Generate recommendations
    if (coreWebVitals.LCP && coreWebVitals.LCP > this.budget.LCP) {
      recommendations.push('Optimize largest contentful paint: compress images, reduce server response time')
    }
    
    if (coreWebVitals.FID && coreWebVitals.FID > this.budget.FID) {
      recommendations.push('Reduce first input delay: minimize JavaScript execution time')
    }
    
    if (coreWebVitals.CLS && coreWebVitals.CLS > this.budget.CLS) {
      recommendations.push('Improve layout stability: add size attributes to images and videos')
    }

    // Get page timing
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const pageLoadTime = navigationTiming ? navigationTiming.loadEventEnd - navigationTiming.fetchStart : 0
    const domContentLoadedTime = navigationTiming ? navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart : 0

    // Get resource timings
    const resourceTimings: ResourceTiming[] = performance.getEntriesByType('resource').map(entry => {
      const resource = entry as PerformanceResourceTiming
      const url = new URL(resource.name)
      
      let type: ResourceTiming['type'] = 'other'
      if (resource.name.match(/\.(js|mjs)$/)) type = 'script'
      else if (resource.name.match(/\.css$/)) type = 'stylesheet'
      else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)) type = 'image'
      else if (resource.name.match(/\.(woff|woff2|ttf|otf)$/)) type = 'font'

      return {
        name: url.pathname,
        size: resource.transferSize || 0,
        duration: resource.duration,
        type,
        cached: resource.transferSize === 0 && resource.decodedBodySize > 0
      }
    })

    // Get memory usage
    let memoryUsage
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      }
    }

    const report: PerformanceReport = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      coreWebVitals,
      resourceTimings,
      memoryUsage,
      pageLoadTime,
      domContentLoadedTime,
      budgetViolations,
      recommendations
    }

    // Send report to analytics
    this.sendReport(report)

    return report
  }

  private async sendMetric(metric: PerformanceMetric) {
    if (navigator.sendBeacon) {
      const data = JSON.stringify({ type: 'performance-metric', metric })
      navigator.sendBeacon('/api/analytics/performance', data)
    }
  }

  private async sendReport(report: PerformanceReport) {
    try {
      if (navigator.sendBeacon) {
        const data = JSON.stringify({ type: 'performance-report', report })
        navigator.sendBeacon('/api/analytics/performance', data)
      } else {
        // Fallback to fetch
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'performance-report', report }),
          keepalive: true
        }).catch(() => {
          // Silently fail
        })
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.warn('[Catalyst Monitor] Failed to send performance report:', error);

      }
    }
  }

  // Public methods
  public getMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics)
  }

  public getReport(): PerformanceReport {
    return this.generateReport()
  }

  public setBudget(budget: Partial<PerformanceBudget>) {
    this.budget = { ...this.budget, ...budget }
  }

  public startProfiling(name: string): () => void {
    const startTime = performance.now()
    return () => {
      const duration = performance.now() - startTime
      this.recordMetric(`profile.${name}`, duration)
    }
  }

  public markFeatureUsage(feature: string) {
    this.recordMetric(`feature.${feature}`, 1)
  }

  public trackError(error: Error, context?: any) {
    if (process.env.NODE_ENV === 'development') {

      console.error('[Catalyst Monitor] Error tracked:', error);

    }
    // Send error report
    if (navigator.sendBeacon) {
      const data = JSON.stringify({ 
        type: 'error-report', 
        error: {
          message: error.message,
          stack: error.stack,
          context,
          timestamp: Date.now(),
          url: window.location.href
        }
      })
      navigator.sendBeacon('/api/analytics/errors', data)
    }
  }

  public dispose() {
    // Clean up observers
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
    this.metrics.clear()
    this.isInitialized = false
  }
}

// Export singleton instance
export const catalystMonitor = new CatalystPerformanceMonitor()

// Export class for custom instances
export { CatalystPerformanceMonitor }

// Export types
export type { 
  PerformanceMetric, 
  CoreWebVitals, 
  PerformanceBudget, 
  PerformanceReport,
  ResourceTiming 
}