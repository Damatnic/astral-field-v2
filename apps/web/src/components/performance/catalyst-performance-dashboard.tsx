/**
 * Catalyst Performance Dashboard
 * Real-time performance monitoring and metrics visualization
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
// Using emoji icons instead of heroicons for compatibility
const ChartBarIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>📊</span>
const ClockIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>⏱️</span>
const CpuChipIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>💾</span>
const ServerIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>🖥️</span>
const BoltIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>⚡</span>
const ExclamationTriangleIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>⚠️</span>
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={className || "w-5 h-5 flex items-center justify-center"}>✅</span>
import { catalystCache, leagueCache } from '@/lib/cache/catalyst-cache'
import { useCatalystPerformanceMonitor } from './catalyst-hydration-boundary'

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  
  // Runtime Performance
  hydrationTime: number
  renderTime: number
  memoryUsage: number
  domNodes: number
  
  // Network Performance
  connectionType: string
  effectiveType: string
  downlink: number
  rtt: number
  
  // Custom Metrics
  apiResponseTime: number
  cacheHitRate: number
  bundleSize: number
  jsHeapSize: number
}

interface AlertConfig {
  metric: keyof PerformanceMetrics
  threshold: number
  severity: 'low' | 'medium' | 'high'
  message: string
}

const PERFORMANCE_ALERTS: AlertConfig[] = [
  { metric: 'lcp', threshold: 2500, severity: 'high', message: 'LCP exceeds 2.5s target' },
  { metric: 'fcp', threshold: 1800, severity: 'medium', message: 'FCP exceeds 1.8s target' },
  { metric: 'fid', threshold: 100, severity: 'high', message: 'FID exceeds 100ms target' },
  { metric: 'cls', threshold: 0.1, severity: 'high', message: 'CLS exceeds 0.1 target' },
  { metric: 'ttfb', threshold: 600, severity: 'medium', message: 'TTFB exceeds 600ms target' },
  { metric: 'memoryUsage', threshold: 50000000, severity: 'medium', message: 'Memory usage exceeds 50MB' },
  { metric: 'apiResponseTime', threshold: 1000, severity: 'medium', message: 'API response time exceeds 1s' },
]

export function CatalystPerformanceDashboard() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  const [isVisible, setIsVisible] = useState(false)
  const [alerts, setAlerts] = useState<Array<AlertConfig & { value: number }>>([])
  const hydrationMetrics = useCatalystPerformanceMonitor()

  // Catalyst: Real-time performance monitoring
  const measurePerformance = useCallback(async () => {
    const newMetrics: Partial<PerformanceMetrics> = {}

    // Core Web Vitals via Performance Observer
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          newMetrics.lcp = lastEntry?.startTime || 0
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            newMetrics.fid = entry.processingStart - entry.startTime
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // CLS
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          newMetrics.cls = clsValue
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Navigation timing
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navTiming) {
          newMetrics.fcp = navTiming.responseStart - navTiming.requestStart
          newMetrics.ttfb = navTiming.responseStart - navTiming.requestStart
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Performance Observer not supported:', error);
        }
      }
    }

    // Memory usage
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      newMetrics.memoryUsage = memInfo.usedJSHeapSize
      newMetrics.jsHeapSize = memInfo.totalJSHeapSize
    }

    // DOM performance
    newMetrics.domNodes = document.querySelectorAll('*').length

    // Network information
    if ('connection' in navigator) {
      const conn = (navigator as any).connection
      newMetrics.connectionType = conn.type || 'unknown'
      newMetrics.effectiveType = conn.effectiveType || 'unknown'
      newMetrics.downlink = conn.downlink || 0
      newMetrics.rtt = conn.rtt || 0
    }

    // Cache performance
    const cacheMetrics = catalystCache.getMetrics()
    newMetrics.cacheHitRate = cacheMetrics.hitRate

    // Bundle size (approximate)
    const scripts = Array.from(document.querySelectorAll('script[src]'))
    let bundleSize = 0
    for (const script of scripts) {
      try {
        const response = await fetch((script as HTMLScriptElement).src, { method: 'HEAD' })
        bundleSize += parseInt(response.headers.get('content-length') || '0')
      } catch (error) {
        // Ignore CORS errors for external scripts
      }
    }
    newMetrics.bundleSize = bundleSize

    // API response time (mock - would be measured from actual API calls)
    newMetrics.apiResponseTime = 150 // This would come from actual API monitoring

    // Hydration metrics
    newMetrics.hydrationTime = hydrationMetrics.hydrationTime
    newMetrics.renderTime = hydrationMetrics.renderTime

    setMetrics(newMetrics)

    // Check for alerts
    const newAlerts = PERFORMANCE_ALERTS.filter(alert => {
      const value = newMetrics[alert.metric]
      return typeof value === 'number' && value > alert.threshold
    }).map(alert => ({
      ...alert,
      value: newMetrics[alert.metric] as number
    }))

    setAlerts(newAlerts)
  }, [hydrationMetrics])

  // Performance grade calculation
  const performanceGrade = useMemo(() => {
    if (!metrics.lcp || !metrics.fcp || !metrics.fid) return 'N/A'

    let score = 100
    
    // LCP scoring
    if (metrics.lcp > 4000) score -= 30
    else if (metrics.lcp > 2500) score -= 15
    
    // FCP scoring
    if (metrics.fcp > 3000) score -= 25
    else if (metrics.fcp > 1800) score -= 10
    
    // FID scoring
    if (metrics.fid > 300) score -= 25
    else if (metrics.fid > 100) score -= 10
    
    // CLS scoring
    if (metrics.cls && metrics.cls > 0.25) score -= 20
    else if (metrics.cls && metrics.cls > 0.1) score -= 10

    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    return 'D'
  }, [metrics])

  useEffect(() => {
    if (isVisible) {
      measurePerformance()
      const interval = setInterval(measurePerformance, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }
  }, [isVisible, measurePerformance])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-50 transition-colors"
        title="Open Performance Dashboard"
      >
        <ChartBarIcon className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg border border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BoltIcon className="h-8 w-8 text-yellow-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Catalyst Performance Dashboard</h2>
                <p className="text-gray-400">Real-time performance monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  performanceGrade === 'A+' ? 'text-green-400' :
                  performanceGrade === 'A' ? 'text-green-500' :
                  performanceGrade === 'B' ? 'text-yellow-400' :
                  performanceGrade === 'C' ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {performanceGrade}
                </div>
                <div className="text-sm text-gray-400">Grade</div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              Performance Alerts
            </h3>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                    alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{alert.message}</span>
                    <span className="font-mono">
                      {alert.value > 1000 ? `${(alert.value / 1000).toFixed(1)}s` : `${alert.value.toFixed(1)}ms`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Core Web Vitals */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-400 mr-2" />
              Core Web Vitals
            </h3>
            <div className="space-y-3">
              <MetricRow 
                label="LCP" 
                value={metrics.lcp} 
                unit="ms" 
                target={2500} 
                description="Largest Contentful Paint"
              />
              <MetricRow 
                label="FCP" 
                value={metrics.fcp} 
                unit="ms" 
                target={1800} 
                description="First Contentful Paint"
              />
              <MetricRow 
                label="FID" 
                value={metrics.fid} 
                unit="ms" 
                target={100} 
                description="First Input Delay"
              />
              <MetricRow 
                label="CLS" 
                value={metrics.cls} 
                unit="" 
                target={0.1} 
                description="Cumulative Layout Shift"
              />
              <MetricRow 
                label="TTFB" 
                value={metrics.ttfb} 
                unit="ms" 
                target={600} 
                description="Time to First Byte"
              />
            </div>
          </div>

          {/* Runtime Performance */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <CpuChipIcon className="h-5 w-5 text-green-400 mr-2" />
              Runtime Performance
            </h3>
            <div className="space-y-3">
              <MetricRow 
                label="Hydration" 
                value={metrics.hydrationTime} 
                unit="ms" 
                target={200} 
                description="React hydration time"
              />
              <MetricRow 
                label="Memory" 
                value={metrics.memoryUsage} 
                unit="MB" 
                target={50000000}
                formatter={(val) => `${((Number(val) || 0) / 1024 / 1024).toFixed(1)}`}
                description="JS heap memory usage"
              />
              <MetricRow 
                label="DOM Nodes" 
                value={metrics.domNodes} 
                unit="" 
                target={1500} 
                description="Total DOM elements"
              />
              <MetricRow 
                label="Bundle Size" 
                value={metrics.bundleSize} 
                unit="KB" 
                target={500000}
                formatter={(val) => `${((Number(val) || 0) / 1024).toFixed(1)}`}
                description="JavaScript bundle size"
              />
            </div>
          </div>

          {/* Network & Cache */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ServerIcon className="h-5 w-5 text-purple-400 mr-2" />
              Network & Cache
            </h3>
            <div className="space-y-3">
              <MetricRow 
                label="API Response" 
                value={metrics.apiResponseTime} 
                unit="ms" 
                target={1000} 
                description="Average API response time"
              />
              <MetricRow 
                label="Cache Hit Rate" 
                value={metrics.cacheHitRate} 
                unit="%" 
                target={70}
                formatter={(val) => `${(Number(val) || 0).toFixed(1)}`}
                description="Catalyst cache efficiency"
              />
              <MetricRow 
                label="Connection" 
                value={metrics.effectiveType} 
                unit="" 
                target={null}
                formatter={(val) => val as string || 'unknown'}
                description="Network connection type"
              />
              <MetricRow 
                label="RTT" 
                value={metrics.rtt} 
                unit="ms" 
                target={150} 
                description="Round-trip time"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={measurePerformance}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Refresh Metrics
              </button>
              <button
                onClick={() => catalystCache.clear()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear Cache
              </button>
            </div>
            <div className="text-sm text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: number | string | undefined
  unit: string
  target: number | null
  description: string
  formatter?: (value: number | string) => string
}

function MetricRow({ label, value, unit, target, description, formatter }: MetricRowProps) {
  const displayValue = formatter && typeof value === 'number' ? formatter(value) : value
  const isGood = target !== null && typeof value === 'number' ? value <= target : true

  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="text-white font-medium">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <div className="text-right">
        <div className={`font-mono ${isGood ? 'text-green-400' : 'text-red-400'}`}>
          {displayValue !== undefined ? `${displayValue}${unit}` : 'N/A'}
        </div>
        {target !== null && (
          <div className="text-xs text-gray-500">
            Target: {target}{unit}
          </div>
        )}
      </div>
    </div>
  )
}