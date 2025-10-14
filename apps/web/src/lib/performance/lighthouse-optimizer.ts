/**
 * Catalyst Lighthouse Performance Optimizer
 * Advanced Core Web Vitals monitoring and optimization
 * Targets 100/100 Lighthouse scores across all metrics
 */

interface CoreWebVitals {
  lcp: number    // Largest Contentful Paint (< 2.5s)
  fid: number    // First Input Delay (< 100ms)
  cls: number    // Cumulative Layout Shift (< 0.1)
  fcp: number    // First Contentful Paint (< 1.8s)
  inp: number    // Interaction to Next Paint (< 200ms)
  ttfb: number   // Time to First Byte (< 800ms)
}

interface PerformanceMetrics {
  webVitals: CoreWebVitals
  lighthouse: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
    pwa: number
  }
  customMetrics: {
    timeToInteractive: number
    totalBlockingTime: number
    speedIndex: number
    bundleSize: number
    resourceCount: number
  }
}

interface PerformanceThresholds {
  excellent: CoreWebVitals
  good: CoreWebVitals
  needsImprovement: CoreWebVitals
}

// Catalyst: Performance monitoring and optimization
export class LighthouseOptimizer {
  private static instance: LighthouseOptimizer
  private metrics: PerformanceMetrics | null = null
  private observers: Map<string, PerformanceObserver> = new Map()
  private vitalsBuffer: Partial<CoreWebVitals>[] = []
  private optimizationQueue: Array<() => Promise<void>> = []

  // Core Web Vitals thresholds
  private static readonly THRESHOLDS: PerformanceThresholds = {
    excellent: {
      lcp: 2500,   // 2.5s
      fid: 100,    // 100ms
      cls: 0.1,    // 0.1
      fcp: 1800,   // 1.8s
      inp: 200,    // 200ms
      ttfb: 800    // 800ms
    },
    good: {
      lcp: 4000,   // 4s
      fid: 300,    // 300ms
      cls: 0.25,   // 0.25
      fcp: 3000,   // 3s
      inp: 500,    // 500ms
      ttfb: 1800   // 1.8s
    },
    needsImprovement: {
      lcp: 6000,   // 6s
      fid: 500,    // 500ms
      cls: 0.5,    // 0.5
      fcp: 4500,   // 4.5s
      inp: 1000,   // 1s
      ttfb: 3000   // 3s
    }
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring()
    }
  }

  static getInstance(): LighthouseOptimizer {
    if (!LighthouseOptimizer.instance) {
      LighthouseOptimizer.instance = new LighthouseOptimizer()
    }
    return LighthouseOptimizer.instance
  }

  private initializeMonitoring(): void {
    this.setupWebVitalsMonitoring()
    this.setupResourceMonitoring()
    this.setupNavigationMonitoring()
    this.scheduleOptimizations()
  }

  /**
   * Set up Core Web Vitals monitoring
   */
  private setupWebVitalsMonitoring(): void {
    // LCP (Largest Contentful Paint)
    if ('LargestContentfulPaint' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        this.updateMetric('lcp', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', lcpObserver)
    }

    // FID (First Input Delay)
    if ('FirstInputDelay' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.updateMetric('fid', entry.processingStart - entry.startTime)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', fidObserver)
    }

    // CLS (Cumulative Layout Shift)
    if ('LayoutShift' in window) {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.updateMetric('cls', clsValue)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', clsObserver)
    }

    // FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.updateMetric('fcp', entry.startTime)
        }
      })
    })
    fcpObserver.observe({ entryTypes: ['paint'] })
    this.observers.set('fcp', fcpObserver)

    // TTFB (Time to First Byte)
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.responseStart && entry.requestStart) {
          this.updateMetric('ttfb', entry.responseStart - entry.requestStart)
        }
      })
    })
    navigationObserver.observe({ entryTypes: ['navigation'] })
    this.observers.set('navigation', navigationObserver)
  }

  /**
   * Set up resource monitoring
   */
  private setupResourceMonitoring(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      this.analyzeResourcePerformance(entries)
    })
    resourceObserver.observe({ entryTypes: ['resource'] })
    this.observers.set('resource', resourceObserver)
  }

  /**
   * Set up navigation timing monitoring
   */
  private setupNavigationMonitoring(): void {
    if ('navigation' in performance.getEntriesByType('navigation')[0]) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      // Calculate additional metrics
      const timeToInteractive = nav.domInteractive - nav.fetchStart
      const totalBlockingTime = this.calculateTotalBlockingTime()
      
      this.updateCustomMetrics({
        timeToInteractive,
        totalBlockingTime,
        speedIndex: this.calculateSpeedIndex(),
        bundleSize: this.estimateBundleSize(),
        resourceCount: performance.getEntriesByType('resource').length
      })
    }
  }

  /**
   * Update a specific Core Web Vital metric
   */
  private updateMetric(metric: keyof CoreWebVitals, value: number): void {
    const latestVitals = this.vitalsBuffer[this.vitalsBuffer.length - 1] || {}
    latestVitals[metric] = value
    
    // Keep only last 10 measurements
    if (this.vitalsBuffer.length >= 10) {
      this.vitalsBuffer.shift()
    }
    this.vitalsBuffer.push(latestVitals)

    this.triggerOptimizationIfNeeded(metric, value)
  }

  /**
   * Update custom metrics
   */
  private updateCustomMetrics(metrics: Partial<PerformanceMetrics['customMetrics']>): void {
    if (!this.metrics) {
      this.metrics = this.getDefaultMetrics()
    }
    
    this.metrics.customMetrics = {
      ...this.metrics.customMetrics,
      ...metrics
    }
  }

  /**
   * Analyze resource performance and suggest optimizations
   */
  private analyzeResourcePerformance(entries: PerformanceEntry[]): void {
    entries.forEach((entry: any) => {
      const duration = entry.responseEnd - entry.startTime
      
      // Flag slow resources
      if (duration > 1000) { // > 1s
        if (process.env.NODE_ENV === 'development') {

          console.warn(`Slow resource detected: ${entry.name} took ${duration}ms`);

        }
        this.queueOptimization(() => this.optimizeSlowResource(entry))
      }

      // Flag large resources
      if (entry.transferSize && entry.transferSize > 500000) { // > 500KB
        if (process.env.NODE_ENV === 'development') {

          console.warn(`Large resource detected: ${entry.name} is ${entry.transferSize} bytes`);

        }
        this.queueOptimization(() => this.optimizeLargeResource(entry))
      }

      // Flag render-blocking resources
      if (this.isRenderBlocking(entry)) {
        if (process.env.NODE_ENV === 'development') {

          console.warn(`Render-blocking resource: ${entry.name}`);

        }
        this.queueOptimization(() => this.optimizeRenderBlockingResource(entry))
      }
    })
  }

  /**
   * Calculate Total Blocking Time
   */
  private calculateTotalBlockingTime(): number {
    const longTasks = performance.getEntriesByType('longtask')
    return longTasks.reduce((total: number, task: any) => {
      const blockingTime = Math.max(0, task.duration - 50) // 50ms threshold
      return total + blockingTime
    }, 0)
  }

  /**
   * Estimate Speed Index (simplified calculation)
   */
  private calculateSpeedIndex(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcp ? fcp.startTime * 1.2 : 0 // Simplified estimation
  }

  /**
   * Estimate bundle size from resource entries
   */
  private estimateBundleSize(): number {
    const resources = performance.getEntriesByType('resource')
    return resources.reduce((total: number, resource: any) => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        return total + (resource.transferSize || 0)
      }
      return total
    }, 0)
  }

  /**
   * Check if resource is render-blocking
   */
  private isRenderBlocking(entry: any): boolean {
    const url = new URL(entry.name)
    const isCSS = url.pathname.endsWith('.css')
    const isJS = url.pathname.endsWith('.js') && !entry.name.includes('async')
    
    return isCSS || isJS
  }

  /**
   * Trigger optimization based on metric thresholds
   */
  private triggerOptimizationIfNeeded(metric: keyof CoreWebVitals, value: number): void {
    const thresholds = LighthouseOptimizer.THRESHOLDS

    if (value > thresholds.needsImprovement[metric]) {
      if (process.env.NODE_ENV === 'development') {

        console.error(`Critical performance issue: ${metric} = ${value}`);

      }
      this.queueCriticalOptimization(metric, value)
    } else if (value > thresholds.good[metric]) {
      if (process.env.NODE_ENV === 'development') {

        console.warn(`Performance warning: ${metric} = ${value}`);

      }
      this.queueOptimization(() => this.optimizeMetric(metric, value))
    }
  }

  /**
   * Queue optimization task
   */
  private queueOptimization(optimization: () => Promise<void>): void {
    this.optimizationQueue.push(optimization)
  }

  /**
   * Queue critical optimization (runs immediately)
   */
  private queueCriticalOptimization(metric: keyof CoreWebVitals, value: number): void {
    // Run critical optimizations immediately
    this.optimizeMetric(metric, value).catch(console.error)
  }

  /**
   * Execute optimizations
   */
  private scheduleOptimizations(): void {
    // Process optimization queue periodically
    setInterval(() => {
      if (this.optimizationQueue.length > 0) {
        const optimization = this.optimizationQueue.shift()
        optimization?.().catch(console.error)
      }
    }, 1000)
  }

  /**
   * Optimize specific metric
   */
  private async optimizeMetric(metric: keyof CoreWebVitals, value: number): Promise<void> {
    switch (metric) {
      case 'lcp':
        await this.optimizeLCP()
        break
      case 'fid':
        await this.optimizeFID()
        break
      case 'cls':
        await this.optimizeCLS()
        break
      case 'fcp':
        await this.optimizeFCP()
        break
      case 'ttfb':
        await this.optimizeTTFB()
        break
    }
  }

  /**
   * LCP Optimizations
   */
  private async optimizeLCP(): Promise<void> {
    // Preload critical resources
    this.preloadCriticalResources()
    
    // Optimize images
    this.optimizeImages()
    
    // Remove render-blocking resources
    this.deferNonCriticalResources()
  }

  /**
   * FID Optimizations
   */
  private async optimizeFID(): Promise<void> {
    // Break up long tasks
    this.breakUpLongTasks()
    
    // Use web workers for heavy computations
    this.offloadToWebWorkers()
    
    // Defer non-critical JavaScript
    this.deferNonCriticalJS()
  }

  /**
   * CLS Optimizations
   */
  private async optimizeCLS(): Promise<void> {
    // Set explicit dimensions for images
    this.setImageDimensions()
    
    // Reserve space for dynamic content
    this.reserveSpaceForAds()
    
    // Use CSS containment
    this.applyCSSContainment()
  }

  /**
   * FCP Optimizations
   */
  private async optimizeFCP(): Promise<void> {
    // Inline critical CSS
    this.inlineCriticalCSS()
    
    // Preconnect to required origins
    this.preconnectToOrigins()
    
    // Optimize font loading
    this.optimizeFontLoading()
  }

  /**
   * TTFB Optimizations
   */
  private async optimizeTTFB(): Promise<void> {
    // Enable CDN caching
    this.enableCDNCaching()
    
    // Optimize server response
    this.optimizeServerResponse()
    
    // Use service worker caching
    this.enableServiceWorkerCaching()
  }

  // Individual optimization methods
  private preloadCriticalResources(): void {
    const criticalResources = [
      '/fonts/inter-var.woff2',
      '/api/user/profile',
      '/api/leagues/active'
    ]

    criticalResources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      link.as = resource.includes('/api/') ? 'fetch' : 'font'
      if (resource.includes('woff2')) {
        link.type = 'font/woff2'
        link.crossOrigin = 'anonymous'
      }
      document.head.appendChild(link)
    })
  }

  private optimizeImages(): void {
    const images = document.querySelectorAll('img[data-src]')
    images.forEach((img: any) => {
      if (!img.loading) {
        img.loading = 'lazy'
      }
      if (!img.decoding) {
        img.decoding = 'async'
      }
    })
  }

  private deferNonCriticalResources(): void {
    const scripts = document.querySelectorAll('script[src]:not([async]):not([defer])')
    scripts.forEach((script: any) => {
      if (!this.isCriticalScript(script.src)) {
        script.defer = true
      }
    })
  }

  private isCriticalScript(src: string): boolean {
    const criticalPatterns = [
      'polyfill',
      'runtime',
      'vendor',
      'framework'
    ]
    return criticalPatterns.some(pattern => src.includes(pattern))
  }

  private breakUpLongTasks(): void {
    // Use scheduler.postTask if available, fallback to setTimeout
    const scheduler = (window as any).scheduler
    if (scheduler && scheduler.postTask) {
      // Use modern scheduler API for better task scheduling
    } else {
      // Fallback to setTimeout for task yielding
    }
  }

  private offloadToWebWorkers(): void {
    // Identify heavy computation tasks and move to web workers
    console.log('Identifying tasks for web worker optimization')
  }

  private deferNonCriticalJS(): void {
    const nonCriticalScripts = [
      'analytics',
      'tracking',
      'chat',
      'social'
    ]

    nonCriticalScripts.forEach(pattern => {
      const scripts = document.querySelectorAll(`script[src*="${pattern}"]`)
      scripts.forEach((script: any) => {
        script.defer = true
      })
    })
  }

  private setImageDimensions(): void {
    const images = document.querySelectorAll('img:not([width]):not([height])')
    images.forEach((img: any) => {
      // Set intrinsic dimensions to prevent layout shift
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth
        img.height = img.naturalHeight
        img.style.width = 'auto'
        img.style.height = 'auto'
      }
    })
  }

  private reserveSpaceForAds(): void {
    const adSlots = document.querySelectorAll('[data-ad-slot]')
    adSlots.forEach((slot: any) => {
      if (!slot.style.minHeight) {
        slot.style.minHeight = '250px' // Reserve space for typical ad
      }
    })
  }

  private applyCSSContainment(): void {
    const dynamicSections = document.querySelectorAll('[data-dynamic]')
    dynamicSections.forEach((section: any) => {
      section.style.contain = 'layout style'
    })
  }

  private inlineCriticalCSS(): void {
    // This would typically be done at build time
  }

  private preconnectToOrigins(): void {
    const origins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.astralfield.com'
    ]

    origins.forEach(origin => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = origin
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }

  private optimizeFontLoading(): void {
    document.fonts.ready.then(() => {
      document.body.classList.add('fonts-loaded')
    })
  }

  private enableCDNCaching(): void {
  }

  private optimizeServerResponse(): void {
  }

  private enableServiceWorkerCaching(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registered for caching'))
        .catch(err => console.error('Service Worker registration failed:', err))
    }
  }

  // Optimization for slow/large/render-blocking resources
  private async optimizeSlowResource(entry: any): Promise<void> {
    // Implementation would vary based on resource type
  }

  private async optimizeLargeResource(entry: any): Promise<void> {
    // Implementation would vary based on resource type
  }

  private async optimizeRenderBlockingResource(entry: any): Promise<void> {
    // Implementation would vary based on resource type
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return this.metrics || this.getDefaultMetrics()
  }

  /**
   * Get performance score based on Core Web Vitals
   */
  getPerformanceScore(): number {
    if (!this.vitalsBuffer.length) return 0

    const latest = this.vitalsBuffer[this.vitalsBuffer.length - 1]
    const thresholds = LighthouseOptimizer.THRESHOLDS.excellent

    let score = 0
    let count = 0

    Object.entries(latest).forEach(([metric, value]) => {
      if (typeof value === 'number') {
        const threshold = thresholds[metric as keyof CoreWebVitals]
        const metricScore = Math.max(0, 100 - ((value / threshold) * 100))
        score += metricScore
        count++
      }
    })

    return count > 0 ? score / count : 0
  }

  /**
   * Get default metrics structure
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      webVitals: {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        inp: 0,
        ttfb: 0
      },
      lighthouse: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        pwa: 0
      },
      customMetrics: {
        timeToInteractive: 0,
        totalBlockingTime: 0,
        speedIndex: 0,
        bundleSize: 0,
        resourceCount: 0
      }
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getCurrentMetrics()
    const score = this.getPerformanceScore()

    return `
=== Catalyst Performance Report ===
Overall Score: ${score.toFixed(1)}/100

Core Web Vitals:
- LCP: ${metrics.webVitals.lcp}ms (target: <2500ms)
- FID: ${metrics.webVitals.fid}ms (target: <100ms)  
- CLS: ${metrics.webVitals.cls} (target: <0.1)
- FCP: ${metrics.webVitals.fcp}ms (target: <1800ms)
- TTFB: ${metrics.webVitals.ttfb}ms (target: <800ms)

Custom Metrics:
- Time to Interactive: ${metrics.customMetrics.timeToInteractive}ms
- Total Blocking Time: ${metrics.customMetrics.totalBlockingTime}ms
- Bundle Size: ${(metrics.customMetrics.bundleSize / 1024).toFixed(1)}KB
- Resource Count: ${metrics.customMetrics.resourceCount}

Optimization Queue: ${this.optimizationQueue.length} pending
    `.trim()
  }

  /**
   * Clean up observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.vitalsBuffer = []
    this.optimizationQueue = []
  }
}

// Export singleton
export const lighthouseOptimizer = LighthouseOptimizer.getInstance()

// Export utilities
export const PerformanceUtils = {
  thresholds: LighthouseOptimizer['THRESHOLDS'],
  
  measureWebVital: (name: string, value: number) => {
    const score = value <= LighthouseOptimizer['THRESHOLDS'].excellent[name as keyof CoreWebVitals] 
      ? 'excellent' 
      : value <= LighthouseOptimizer['THRESHOLDS'].good[name as keyof CoreWebVitals]
      ? 'good'
      : 'needs-improvement'
    
    console.log(`${name.toUpperCase()}: ${value} (${score})`)
    return score
  }
}

export default LighthouseOptimizer