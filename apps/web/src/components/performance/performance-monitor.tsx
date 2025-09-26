/**
 * Catalyst Performance Monitor Component
 * Client-side performance tracking and Core Web Vitals monitoring
 */

'use client'

import { useEffect } from 'react'

export function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring
    const initMonitoring = async () => {
      try {
        // Only in browser environment
        if (typeof window === 'undefined') return

        // Track component mount time
        const mountTime = performance.now()
        
        // Initialize Web Vitals tracking (dynamically imported for better bundles)
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')

        // Track Core Web Vitals
        getCLS((metric) => {
          console.log('[Catalyst] CLS:', metric.value)
          sendToAnalytics('CLS', metric.value)
        })

        getFID((metric) => {
          console.log('[Catalyst] FID:', metric.value)
          sendToAnalytics('FID', metric.value)
        })

        getFCP((metric) => {
          console.log('[Catalyst] FCP:', metric.value)
          sendToAnalytics('FCP', metric.value)
        })

        getLCP((metric) => {
          console.log('[Catalyst] LCP:', metric.value)
          sendToAnalytics('LCP', metric.value)
        })

        getTTFB((metric) => {
          console.log('[Catalyst] TTFB:', metric.value)
          sendToAnalytics('TTFB', metric.value)
        })

        // Track component initialization time
        const initTime = performance.now() - mountTime
        console.log(`[Catalyst] Performance Monitor initialized in ${initTime.toFixed(2)}ms`)

        // Report page load completion
        if (document.readyState === 'complete') {
          reportPageLoadComplete()
        } else {
          window.addEventListener('load', reportPageLoadComplete)
        }

      } catch (error) {
        console.warn('[Catalyst] Performance monitoring failed to initialize:', error)
      }
    }

    initMonitoring()

    // Cleanup function
    return () => {
      // Any cleanup if needed
    }
  }, [])

  return null // This component doesn't render anything
}

function sendToAnalytics(metricName: string, value: number) {
  // Send to Vercel Analytics if available
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', `performance.${metricName}`, { value })
  }

  // Send to custom analytics endpoint
  if (navigator.sendBeacon) {
    const data = JSON.stringify({
      metric: metricName,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
    navigator.sendBeacon('/api/analytics/performance', data)
  }
}

function reportPageLoadComplete() {
  const loadTime = performance.now()
  console.log(`[Catalyst] Page load completed in ${loadTime.toFixed(2)}ms`)
  
  // Send page load time
  sendToAnalytics('PAGE_LOAD_TIME', loadTime)
  
  // Report to service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PERFORMANCE_REPORT',
      data: {
        loadTime,
        timestamp: Date.now(),
        url: window.location.href
      }
    })
  }
}

// Export for use in other components
export { sendToAnalytics, reportPageLoadComplete }