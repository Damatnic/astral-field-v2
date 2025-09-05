'use client'

import React from 'react'

// Performance monitoring utilities for production optimization

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  static startTiming(label: string): string {
    const id = `${label}_${Date.now()}_${Math.random()}`
    if (typeof performance !== 'undefined') {
      performance.mark(`${id}_start`)
    }
    return id
  }

  static endTiming(id: string, label: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${id}_end`)
      performance.measure(label, `${id}_start`, `${id}_end`)
      
      const measure = performance.getEntriesByName(label, 'measure')[0]
      if (measure) {
        const existing = this.metrics.get(label) || []
        existing.push(measure.duration)
        this.metrics.set(label, existing.slice(-100)) // Keep last 100 measurements
        
        // Log slow operations in development
        if (process.env.NODE_ENV === 'development' && measure.duration > 1000) {
          console.warn(`Slow operation detected: ${label} took ${measure.duration.toFixed(2)}ms`)
        }
      }
      
      // Cleanup
      performance.clearMarks(`${id}_start`)
      performance.clearMarks(`${id}_end`)
      performance.clearMeasures(label)
    }
  }

  static getMetrics(label: string): number[] {
    return this.metrics.get(label) || []
  }

  static getAverageTime(label: string): number {
    const times = this.getMetrics(label)
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  static getAllMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {}
    
    for (const [label, times] of this.metrics) {
      result[label] = {
        average: this.getAverageTime(label),
        count: times.length,
        latest: times[times.length - 1] || 0
      }
    }
    
    return result
  }
}

// HOC for component performance monitoring
export function withPerformanceMonitoring<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: T) {
    React.useEffect(() => {
      const timingId = PerformanceMonitor.startTiming(`${componentName}_render`)
      
      return () => {
        PerformanceMonitor.endTiming(timingId, `${componentName}_render`)
      }
    })
    
    return React.createElement(WrappedComponent, props)
  }
}

// Hook for measuring async operations
export function useAsyncPerformance() {
  const measureAsync = React.useCallback(async <T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const timingId = PerformanceMonitor.startTiming(label)
    try {
      const result = await operation()
      PerformanceMonitor.endTiming(timingId, label)
      return result
    } catch (error) {
      PerformanceMonitor.endTiming(timingId, `${label}_error`)
      throw error
    }
  }, [])

  return { measureAsync }
}

// Web Vitals monitoring
export function initWebVitals() {
  if (typeof window === 'undefined') return

  // Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming
        console.log('Navigation Timing:', {
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
          firstByte: navEntry.responseStart - navEntry.requestStart
        })
      }
      
      if (entry.entryType === 'paint') {
        console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`)
      }
    }
  })

  try {
    observer.observe({ entryTypes: ['navigation', 'paint'] })
  } catch {
    // Fallback for unsupported browsers
  }

  // Monitor Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1] as PerformancePaintTiming
    console.log('LCP:', lastEntry.startTime.toFixed(2) + 'ms')
  })

  try {
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch {
    // Fallback for browsers that don't support LCP
  }

  // Monitor Cumulative Layout Shift (CLS)
  let clsValue = 0
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    }
    console.log('CLS:', clsValue)
  })

  try {
    clsObserver.observe({ entryTypes: ['layout-shift'] })
  } catch {
    // Fallback for browsers that don't support layout-shift
  }
}

// Memory usage monitoring (development only)
export function logMemoryUsage() {
  if (process.env.NODE_ENV !== 'development' || typeof performance === 'undefined') return

  const memory = (performance as any).memory
  if (memory) {
    console.log('Memory Usage:', {
      used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
    })
  }
}

// Bundle size analyzer helper
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return

  const scripts = Array.from(document.querySelectorAll('script[src]'))
  let totalSize = 0

  scripts.forEach(script => {
    fetch((script as HTMLScriptElement).src, { method: 'HEAD' })
      .then(response => {
        const size = parseInt(response.headers.get('content-length') || '0')
        totalSize += size
        console.log(`Script: ${(script as HTMLScriptElement).src.split('/').pop()} - ${(size / 1024).toFixed(2)}KB`)
      })
      .catch(() => {}) // Ignore CORS errors
  })

  setTimeout(() => {
    console.log(`Total estimated bundle size: ${(totalSize / 1024).toFixed(2)}KB`)
  }, 2000)
}