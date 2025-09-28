'use client'

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  lcp: number | null
  fid: number | null
  cls: number | null
  fcp: number | null
  ttfb: number | null
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Catalyst: Core Web Vitals tracking
    const trackWebVitals = () => {
      // LCP - Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            if (lastEntry) {
              const lcpValue = Math.round(lastEntry.startTime)
              setMetrics(prev => ({ ...prev, lcp: lcpValue }))
              // Only log if performance is poor
              if (lcpValue > 2500) {
                console.warn('[Catalyst] Poor LCP:', lcpValue + 'ms (target: <2500ms)')
              }
            }
          })
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
        } catch (e) {
          console.warn('[Catalyst] LCP observer failed:', e)
        }

        // FCP - First Contentful Paint
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                const fcpValue = Math.round(entry.startTime)
                setMetrics(prev => ({ ...prev, fcp: fcpValue }))
                // Only log if performance is poor
                if (fcpValue > 1800) {
                  console.warn('[Catalyst] Poor FCP:', fcpValue + 'ms (target: <1800ms)')
                }
              }
            }
          })
          fcpObserver.observe({ type: 'paint', buffered: true })
        } catch (e) {
          console.warn('[Catalyst] FCP observer failed:', e)
        }

        // CLS - Cumulative Layout Shift
        try {
          let clsValue = 0
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value
              }
            }
            const finalCLS = Math.round(clsValue * 1000) / 1000
            setMetrics(prev => ({ ...prev, cls: finalCLS }))
            // Only log if performance is poor
            if (finalCLS > 0.1) {
              console.warn('[Catalyst] Poor CLS:', finalCLS + ' (target: <0.1)')
            }
          })
          clsObserver.observe({ type: 'layout-shift', buffered: true })
        } catch (e) {
          console.warn('[Catalyst] CLS observer failed:', e)
        }

        // FID - First Input Delay (using INP as fallback)
        try {
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'first-input') {
                const fid = Math.round((entry as any).processingStart - entry.startTime)
                setMetrics(prev => ({ ...prev, fid }))
                // Only log if performance is poor
                if (fid > 100) {
                  console.warn('[Catalyst] Poor FID:', fid + 'ms (target: <100ms)')
                }
              }
            }
          })
          fidObserver.observe({ type: 'first-input', buffered: true })
        } catch (e) {
          console.warn('[Catalyst] FID observer failed:', e)
        }
      }

      // TTFB - Time to First Byte
      if (window.performance && window.performance.getEntriesByType) {
        const navigation = window.performance.getEntriesByType('navigation')[0] as any
        if (navigation) {
          const ttfb = Math.round(navigation.responseStart - navigation.requestStart)
          setMetrics(prev => ({ ...prev, ttfb }))
          // Only log if performance is poor
          if (ttfb > 600) {
            console.warn('[Catalyst] Poor TTFB:', ttfb + 'ms (target: <600ms)')
          }
        }
      }
    }

    // Initialize tracking
    if (document.readyState === 'complete') {
      trackWebVitals()
    } else {
      window.addEventListener('load', trackWebVitals)
    }

    // Performance budget alerts
    const checkPerformanceBudget = () => {
      if (metrics.lcp && metrics.lcp > 2500) {
        console.warn('[Catalyst] LCP Budget Exceeded:', metrics.lcp + 'ms (target: <2500ms)')
      }
      if (metrics.fid && metrics.fid > 100) {
        console.warn('[Catalyst] FID Budget Exceeded:', metrics.fid + 'ms (target: <100ms)')
      }
      if (metrics.cls && metrics.cls > 0.1) {
        console.warn('[Catalyst] CLS Budget Exceeded:', metrics.cls + ' (target: <0.1)')
      }
      if (metrics.fcp && metrics.fcp > 1800) {
        console.warn('[Catalyst] FCP Budget Exceeded:', metrics.fcp + 'ms (target: <1800ms)')
      }
    }

    const budgetTimer = setTimeout(checkPerformanceBudget, 3000)

    return () => {
      window.removeEventListener('load', trackWebVitals)
      clearTimeout(budgetTimer)
    }
  }, [metrics])

  // Real-time performance dashboard (development only)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 backdrop-blur-sm border border-gray-700">
        <div className="text-green-400 font-bold mb-2">🚀 CATALYST PERF</div>
        <div className="grid grid-cols-2 gap-2">
          <div>LCP: <span className={metrics.lcp ? (metrics.lcp < 2500 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>{metrics.lcp ? `${metrics.lcp}ms` : '—'}</span></div>
          <div>FID: <span className={metrics.fid ? (metrics.fid < 100 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>{metrics.fid ? `${metrics.fid}ms` : '—'}</span></div>
          <div>CLS: <span className={metrics.cls ? (metrics.cls < 0.1 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>{metrics.cls ? metrics.cls : '—'}</span></div>
          <div>FCP: <span className={metrics.fcp ? (metrics.fcp < 1800 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>{metrics.fcp ? `${metrics.fcp}ms` : '—'}</span></div>
          <div>TTFB: <span className={metrics.ttfb ? (metrics.ttfb < 600 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}>{metrics.ttfb ? `${metrics.ttfb}ms` : '—'}</span></div>
        </div>
      </div>
    )
  }

  return null
}