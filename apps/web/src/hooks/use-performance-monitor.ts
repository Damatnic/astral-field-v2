/**
 * React Hook for Catalyst Performance Monitoring
 * Provides easy integration with React components
 */

import { useEffect, useState, useCallback } from 'react'
import { catalystMonitor, PerformanceReport, CoreWebVitals } from '@/lib/performance/catalyst-monitor'

interface UsePerformanceMonitorOptions {
  enabled?: boolean
  reportInterval?: number
  budget?: Partial<{
    FCP: number
    LCP: number
    FID: number
    CLS: number
    TTFB: number
    INP: number
  }>
}

interface PerformanceMetrics {
  coreWebVitals: CoreWebVitals
  lastReport?: PerformanceReport
  isMonitoring: boolean
  violations: string[]
  recommendations: string[]
}

/**
 * Hook for monitoring Core Web Vitals and performance metrics
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    coreWebVitals: {},
    isMonitoring: false,
    violations: [],
    recommendations: []
  })

  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if performance monitoring is supported
    const supported = typeof window !== 'undefined' && 
                     'performance' in window &&
                     'PerformanceObserver' in window
    
    setIsSupported(supported)

    if (!supported || options.enabled === false) {
      return
    }

    // Set budget if provided
    if (options.budget) {
      catalystMonitor.setBudget(options.budget)
    }

    // Update metrics state when report is generated
    const updateMetrics = () => {
      try {
        const report = catalystMonitor.getReport()
        setMetrics({
          coreWebVitals: report.coreWebVitals,
          lastReport: report,
          isMonitoring: true,
          violations: report.budgetViolations,
          recommendations: report.recommendations
        })
      } catch (error) {
        console.warn('Failed to get performance metrics:', error)
      }
    }

    // Initial update
    updateMetrics()

    // Set up periodic updates
    const interval = setInterval(updateMetrics, options.reportInterval || 10000)

    return () => {
      clearInterval(interval)
    }
  }, [options.enabled, options.reportInterval, options.budget])

  // Utility functions
  const startProfiling = useCallback((name: string) => {
    return catalystMonitor.startProfiling(name)
  }, [])

  const markFeatureUsage = useCallback((feature: string) => {
    catalystMonitor.markFeatureUsage(feature)
  }, [])

  const trackError = useCallback((error: Error, context?: any) => {
    catalystMonitor.trackError(error, context)
  }, [])

  const generateReport = useCallback(() => {
    return catalystMonitor.getReport()
  }, [])

  return {
    ...metrics,
    isSupported,
    startProfiling,
    markFeatureUsage,
    trackError,
    generateReport
  }
}

/**
 * Hook for tracking component performance
 */
export function useComponentPerformance(componentName: string) {
  const { startProfiling, markFeatureUsage } = usePerformanceMonitor()

  // Track component mount time
  useEffect(() => {
    const endProfiling = startProfiling(`component.${componentName}.mount`)
    markFeatureUsage(`component.${componentName}`)

    return () => {
      endProfiling()
    }
  }, [componentName, startProfiling, markFeatureUsage])

  // Utility for tracking specific operations
  const trackOperation = useCallback((operationName: string, operation: () => any) => {
    const endProfiling = startProfiling(`${componentName}.${operationName}`)
    
    try {
      const result = operation()
      
      // Handle async operations
      if (result && typeof result.then === 'function') {
        return result.finally(() => endProfiling())
      }
      
      endProfiling()
      return result
    } catch (error) {
      endProfiling()
      throw error
    }
  }, [componentName, startProfiling])

  return {
    trackOperation
  }
}

/**
 * Hook for Core Web Vitals monitoring with thresholds
 */
export function useCoreWebVitals() {
  const { coreWebVitals, violations, isSupported } = usePerformanceMonitor()

  // Calculate scores based on Google's thresholds
  const getScore = useCallback((metric: string, value?: number) => {
    if (!value) return null

    const thresholds = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 600, poor: 1500 },
      INP: { good: 200, poor: 500 }
    }

    const threshold = thresholds[metric as keyof typeof thresholds]
    if (!threshold) return null

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }, [])

  const scores = {
    FCP: getScore('FCP', coreWebVitals.FCP),
    LCP: getScore('LCP', coreWebVitals.LCP),
    FID: getScore('FID', coreWebVitals.FID),
    CLS: getScore('CLS', coreWebVitals.CLS),
    TTFB: getScore('TTFB', coreWebVitals.TTFB),
    INP: getScore('INP', coreWebVitals.INP)
  }

  // Calculate overall score
  const overallScore = (() => {
    const validScores = Object.values(scores).filter(Boolean)
    if (validScores.length === 0) return null

    const scoreValues = validScores.map(score => {
      switch (score) {
        case 'good': return 100
        case 'needs-improvement': return 50
        case 'poor': return 0
        default: return 0
      }
    })

    const average = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
    
    if (average >= 90) return 'good'
    if (average >= 50) return 'needs-improvement'
    return 'poor'
  })()

  return {
    coreWebVitals,
    scores,
    overallScore,
    violations,
    isSupported,
    hasData: Object.keys(coreWebVitals).length > 0
  }
}

/**
 * Performance debugging hook for development
 */
export function usePerformanceDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const updateDebugInfo = () => {
      const metrics = catalystMonitor.getMetrics()
      const report = catalystMonitor.getReport()
      
      setDebugInfo({
        metrics: Array.from(metrics.entries()),
        report,
        performance: {
          navigation: performance.getEntriesByType('navigation')[0],
          resources: performance.getEntriesByType('resource').slice(-10), // Last 10 resources
          memory: (performance as any).memory
        }
      })
    }

    updateDebugInfo()
    const interval = setInterval(updateDebugInfo, 5000)

    return () => clearInterval(interval)
  }, [])

  return debugInfo
}

/**
 * Hook for tracking user engagement metrics
 */
export function useEngagementTracking() {
  const { markFeatureUsage } = usePerformanceMonitor()

  useEffect(() => {
    let startTime = Date.now()
    let isActive = true

    // Track time on page
    const trackTimeOnPage = () => {
      if (isActive) {
        const timeSpent = Date.now() - startTime
        markFeatureUsage(`time-on-page.${Math.floor(timeSpent / 1000)}s`)
      }
    }

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isActive = true
        startTime = Date.now()
      } else {
        trackTimeOnPage()
        isActive = false
      }
    }

    // Track page unload
    const handleBeforeUnload = () => {
      trackTimeOnPage()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Track scroll depth
    let maxScrollDepth = 0
    const handleScroll = () => {
      const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        markFeatureUsage(`scroll-depth.${Math.floor(scrollDepth / 25) * 25}%`)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      trackTimeOnPage()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [markFeatureUsage])

  return {
    trackClick: useCallback((element: string) => {
      markFeatureUsage(`click.${element}`)
    }, [markFeatureUsage]),
    
    trackFormSubmit: useCallback((form: string) => {
      markFeatureUsage(`form-submit.${form}`)
    }, [markFeatureUsage]),
    
    trackSearch: useCallback((query: string) => {
      markFeatureUsage(`search.${query.length > 0 ? 'with-query' : 'empty'}`)
    }, [markFeatureUsage])
  }
}