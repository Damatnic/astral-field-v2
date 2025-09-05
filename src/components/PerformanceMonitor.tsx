'use client'

import { useEffect } from 'react'

interface PerformanceMetrics {
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  cumulativeLayoutShift?: number
  firstInputDelay?: number
  timeToInteractive?: number
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production for real metrics
    if (process.env.NODE_ENV !== 'production') return

    const collectMetrics = () => {
      const metrics: Partial<PerformanceMetrics> = {}
      
      // Basic timing metrics
      if (performance.timing) {
        const timing = performance.timing
        metrics.loadTime = timing.loadEventEnd - timing.navigationStart
        metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
      }
      
      // Modern Performance Observer metrics
      if ('PerformanceObserver' in window) {
        // First Contentful Paint
        try {
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry
          if (fcpEntry) {
            metrics.firstContentfulPaint = fcpEntry.startTime
          }
        } catch (error) {
          console.debug('FCP not available:', error)
        }
        
        // Largest Contentful Paint
        const observeLCP = () => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            if (lastEntry) {
              metrics.largestContentfulPaint = lastEntry.startTime
              
              // Log metrics when LCP is captured
              logMetrics({ ...metrics, largestContentfulPaint: lastEntry.startTime })
            }
          })
          
          try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] })
          } catch (error) {
            console.debug('LCP observer not supported:', error)
          }
        }
        
        // Cumulative Layout Shift
        const observeCLS = () => {
          let clsValue = 0
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value
              }
            }
            metrics.cumulativeLayoutShift = clsValue
          })
          
          try {
            observer.observe({ entryTypes: ['layout-shift'] })
          } catch (error) {
            console.debug('CLS observer not supported:', error)
          }
        }
        
        // First Input Delay
        const observeFID = () => {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              metrics.firstInputDelay = (entry as any).processingStart - entry.startTime
              
              // Log metrics when FID is captured
              logMetrics({ ...metrics, firstInputDelay: (entry as any).processingStart - entry.startTime })
              
              observer.disconnect()
            }
          })
          
          try {
            observer.observe({ entryTypes: ['first-input'] })
          } catch (error) {
            console.debug('FID observer not supported:', error)
          }
        }
        
        // Start observing
        observeLCP()
        observeCLS()
        observeFID()
      }
      
      // Time to Interactive (simplified estimation)
      const estimateTimeToInteractive = () => {
        if (document.readyState === 'complete') {
          const timing = performance.timing
          metrics.timeToInteractive = timing.domContentLoadedEventEnd - timing.navigationStart + 1000
        } else {
          setTimeout(estimateTimeToInteractive, 100)
        }
      }
      
      estimateTimeToInteractive()
      
      // Log basic metrics immediately
      setTimeout(() => {
        logMetrics(metrics)
      }, 1000)
    }
    
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      collectMetrics()
    } else {
      window.addEventListener('load', collectMetrics)
    }
    
    return () => {
      window.removeEventListener('load', collectMetrics)
    }
  }, [])
  
  // This component doesn't render anything
  return null
}

function logMetrics(metrics: Partial<PerformanceMetrics>) {
  // Filter out undefined values
  const cleanMetrics = Object.entries(metrics)
    .filter(([_, value]) => value !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
  
  if (Object.keys(cleanMetrics).length === 0) return
  
  // Log to console for debugging
  console.group('🚀 Performance Metrics')
  Object.entries(cleanMetrics).forEach(([key, value]) => {
    const formattedValue = typeof value === 'number' ? `${Math.round(value)}ms` : value
    console.log(`${key}: ${formattedValue}`)
  })
  console.groupEnd()
  
  // In production, you would send these to an analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to analytics service
    // analytics.track('page_performance', cleanMetrics)
    
    // Or send to your own API
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: cleanMetrics,
        timestamp: Date.now(),
        url: window.location.pathname,
        userAgent: navigator.userAgent
      })
    }).catch(error => {
      console.debug('Failed to send performance metrics:', error)
    })
  }
}

// Hook for component-level performance tracking
export function usePerformanceTracker(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Log component render time in development
      if (process.env.NODE_ENV === 'development' && renderTime > 100) {
        console.warn(`⚠️ Slow component render: ${componentName} took ${Math.round(renderTime)}ms`)
      }
      
      // Track in production
      if (process.env.NODE_ENV === 'production' && renderTime > 200) {
        fetch('/api/analytics/component-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component: componentName,
            renderTime,
            timestamp: Date.now(),
            url: window.location.pathname
          })
        }).catch(() => {
          // Silently fail - don't impact user experience
        })
      }
    }
  }, [componentName])
}