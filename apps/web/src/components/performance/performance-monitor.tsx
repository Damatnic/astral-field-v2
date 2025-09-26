/**
 * Performance Monitor Component
 * Real-time performance tracking and Core Web Vitals monitoring
 */

'use client'

import { usePerformanceMonitor, useCoreWebVitals, useEngagementTracking } from '@/hooks/use-performance-monitor'
import { memo, useEffect } from 'react'

const PerformanceMonitor = memo(() => {
  const { 
    isSupported, 
    violations, 
    recommendations,
    markFeatureUsage 
  } = usePerformanceMonitor({
    enabled: true,
    reportInterval: 30000, // Report every 30 seconds
    budget: {
      FCP: 1800,  // 1.8s
      LCP: 2500,  // 2.5s
      FID: 100,   // 100ms
      CLS: 0.1,   // 0.1
      TTFB: 600,  // 600ms
      INP: 200    // 200ms
    }
  })

  const { overallScore, hasData } = useCoreWebVitals()
  
  // Track engagement
  useEngagementTracking()

  // Mark that performance monitoring is active
  useEffect(() => {
    if (isSupported) {
      markFeatureUsage('performance-monitoring.enabled')
    }
  }, [isSupported, markFeatureUsage])

  // Log performance issues in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && violations.length > 0) {
      console.group('🚨 Performance Budget Violations')
      violations.forEach(violation => console.warn(violation))
      console.groupEnd()
    }
  }, [violations])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && recommendations.length > 0) {
      console.group('💡 Performance Recommendations')
      recommendations.forEach(rec => console.info(rec))
      console.groupEnd()
    }
  }, [recommendations])

  // Display performance badge in development
  if (process.env.NODE_ENV === 'development' && isSupported && hasData) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`
          px-3 py-2 rounded-lg text-xs font-medium shadow-lg backdrop-blur-sm
          ${overallScore === 'good' ? 'bg-green-500/90 text-white' :
            overallScore === 'needs-improvement' ? 'bg-yellow-500/90 text-black' :
            'bg-red-500/90 text-white'}
        `}>
          Performance: {overallScore || 'monitoring...'}
          {violations.length > 0 && (
            <div className="mt-1 text-xs opacity-90">
              {violations.length} violation{violations.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Production mode - no visible UI
  return null
})

PerformanceMonitor.displayName = 'PerformanceMonitor'

// Performance Debug Panel for development
const PerformanceDebugPanel = memo(() => {
  const { coreWebVitals, scores, violations, recommendations } = useCoreWebVitals()

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Core Web Vitals</h3>
      
      <div className="space-y-1 mb-3">
        {Object.entries(coreWebVitals).map(([key, value]) => {
          const score = scores[key as keyof typeof scores]
          return (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <span className={`
                ${score === 'good' ? 'text-green-400' :
                  score === 'needs-improvement' ? 'text-yellow-400' :
                  'text-red-400'}
              `}>
                {typeof value === 'number' ? value.toFixed(2) : '--'}
                {key === 'CLS' ? '' : key === 'FID' || key === 'INP' ? 'ms' : key === 'TTFB' ? 'ms' : 'ms'}
              </span>
            </div>
          )
        })}
      </div>

      {violations.length > 0 && (
        <div className="mb-3">
          <h4 className="font-semibold text-red-400 mb-1">Violations:</h4>
          <div className="text-xs space-y-1">
            {violations.map((violation, i) => (
              <div key={i} className="text-red-300">{violation}</div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <h4 className="font-semibold text-blue-400 mb-1">Recommendations:</h4>
          <div className="text-xs space-y-1">
            {recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="text-blue-300">{rec}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

PerformanceDebugPanel.displayName = 'PerformanceDebugPanel'

// Export components
export { PerformanceMonitor, PerformanceDebugPanel }