'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
// Emoji-based icons to replace heroicons
const ChartBarIcon = () => <span className="w-5 h-5 flex items-center justify-center">📊</span>
const CpuChipIcon = () => <span className="w-5 h-5 flex items-center justify-center">🖥️</span>
const ClockIcon = () => <span className="w-5 h-5 flex items-center justify-center">⏰</span>
const ExclamationTriangleIcon = () => <span className="w-5 h-5 flex items-center justify-center">⚠️</span>
const CheckCircleIcon = () => <span className="w-5 h-5 flex items-center justify-center">✅</span>
const XCircleIcon = () => <span className="w-5 h-5 flex items-center justify-center">❌</span>

interface PerformanceMetrics {
  navigation: Array<{
    name: string
    duration: number
    timestamp: number
  }>
  paint: {
    firstPaint?: number
    firstContentfulPaint?: number
    largestContentfulPaint?: number
  }
  layout: {
    cumulativeLayoutShift?: number
  }
  interaction: {
    firstInputDelay?: number
    totalBlockingTime?: number
  }
  resources: Array<{
    name: string
    duration: number
    size?: number
    type: string
  }>
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

interface PerformanceBudget {
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  totalBlockingTime: number
}

const PERFORMANCE_BUDGET: PerformanceBudget = {
  firstContentfulPaint: 1500, // 1.5s
  largestContentfulPaint: 2500, // 2.5s
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100, // 100ms
  totalBlockingTime: 300 // 300ms
}

export function CatalystPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    navigation: [],
    paint: {},
    layout: {},
    interaction: {},
    resources: [],
    memory: undefined
  })
  const [isVisible, setIsVisible] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Catalyst: Performance data collection
  const collectMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return

    const navigation = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const paint = performance.getEntriesByType('paint') as PerformancePaintTiming[]
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    // Get Web Vitals data
    const paintMetrics: PerformanceMetrics['paint'] = {}
    paint.forEach(entry => {
      if (entry.name === 'first-paint') {
        paintMetrics.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        paintMetrics.firstContentfulPaint = entry.startTime
      }
    })

    // Get LCP if available
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry && 'renderTime' in lastEntry) {
            setMetrics(prev => ({
              ...prev,
              paint: {
                ...prev.paint,
                largestContentfulPaint: lastEntry.renderTime || lastEntry.loadTime
              }
            }))
          }
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('LCP observer not available:', error);
        }
      }
    }

    // Get memory info if available
    const memory = (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
    } : undefined

    // Process resource timings
    const processedResources = resources
      .filter(resource => resource.duration > 0)
      .map(resource => ({
        name: resource.name.split('/').pop() || resource.name,
        duration: resource.duration,
        size: resource.transferSize,
        type: resource.initiatorType
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10) // Top 10 slowest resources

    setMetrics(prev => ({
      ...prev,
      paint: paintMetrics,
      resources: processedResources,
      memory
    }))
  }, [])

  // Catalyst: Start performance monitoring
  useEffect(() => {
    if (!isRecording) return

    collectMetrics()
    
    intervalRef.current = setInterval(collectMetrics, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording, collectMetrics])

  // Catalyst: Navigation performance tracking
  useEffect(() => {
    const trackNavigation = (event: Event) => {
      const target = event.target as HTMLAnchorElement
      if (target && target.href && target.href.startsWith(window.location.origin)) {
        const startTime = performance.now()
        const routeName = target.pathname
        
        // Track page load completion
        const trackCompletion = () => {
          const endTime = performance.now()
          const duration = endTime - startTime
          
          setMetrics(prev => ({
            ...prev,
            navigation: [
              ...prev.navigation.slice(-9), // Keep last 10 navigations
              {
                name: routeName,
                duration,
                timestamp: Date.now()
              }
            ]
          }))
        }

        // Wait for route change to complete
        setTimeout(trackCompletion, 100)
      }
    }

    document.addEventListener('click', trackNavigation)
    return () => document.removeEventListener('click', trackNavigation)
  }, [])

  // Catalyst: Performance evaluation functions
  const getMetricStatus = (value: number | undefined, budget: number, inverse = false) => {
    if (value === undefined) return 'unknown'
    const isGood = inverse ? value < budget : value <= budget
    const isNeedsImprovement = inverse ? value < budget * 1.5 : value <= budget * 1.5
    
    if (isGood) return 'good'
    if (isNeedsImprovement) return 'needs-improvement'
    return 'poor'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'needs-improvement':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
      case 'poor':
        return <XCircleIcon className="w-4 h-4 text-red-400" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-slate-900/80 backdrop-blur border-slate-700 text-white hover:bg-slate-800"
      >
        <ChartBarIcon className="w-4 h-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <CpuChipIcon className="w-5 h-5 mr-2 text-blue-400" />
          Catalyst Monitor
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsRecording(!isRecording)}
            variant="outline"
            size="sm"
            className={isRecording ? 'text-green-400 border-green-400' : 'text-gray-400 border-gray-400'}
          >
            {isRecording ? 'Recording' : 'Paused'}
          </Button>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Core Web Vitals */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Core Web Vitals</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">First Contentful Paint</span>
              <div className="flex items-center">
                {getStatusIcon(getMetricStatus(metrics.paint.firstContentfulPaint, PERFORMANCE_BUDGET.firstContentfulPaint))}
                <span className="text-sm text-white ml-2">
                  {metrics.paint.firstContentfulPaint ? formatDuration(metrics.paint.firstContentfulPaint) : '--'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Largest Contentful Paint</span>
              <div className="flex items-center">
                {getStatusIcon(getMetricStatus(metrics.paint.largestContentfulPaint, PERFORMANCE_BUDGET.largestContentfulPaint))}
                <span className="text-sm text-white ml-2">
                  {metrics.paint.largestContentfulPaint ? formatDuration(metrics.paint.largestContentfulPaint) : '--'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Cumulative Layout Shift</span>
              <div className="flex items-center">
                {getStatusIcon(getMetricStatus(metrics.layout.cumulativeLayoutShift, PERFORMANCE_BUDGET.cumulativeLayoutShift, true))}
                <span className="text-sm text-white ml-2">
                  {metrics.layout.cumulativeLayoutShift?.toFixed(3) || '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        {metrics.memory && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Memory Usage</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">JS Heap Used</span>
                <span className="text-sm text-white">
                  {formatBytes(metrics.memory.usedJSHeapSize)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">JS Heap Total</span>
                <span className="text-sm text-white">
                  {formatBytes(metrics.memory.totalJSHeapSize)}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(metrics.memory.usedJSHeapSize / metrics.memory.totalJSHeapSize) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Navigation */}
        {metrics.navigation.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Navigation</h4>
            <div className="space-y-1">
              {metrics.navigation.slice(-5).reverse().map((nav, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate max-w-32">
                    {nav.name}
                  </span>
                  <span className={`text-xs ${
                    nav.duration < 500 ? 'text-green-400' : 
                    nav.duration < 1000 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formatDuration(nav.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slow Resources */}
        {metrics.resources.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Slowest Resources</h4>
            <div className="space-y-1">
              {metrics.resources.slice(0, 5).map((resource, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate max-w-32">
                    {resource.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    {resource.size && (
                      <span className="text-xs text-gray-500">
                        {formatBytes(resource.size)}
                      </span>
                    )}
                    <span className={`text-xs ${
                      resource.duration < 100 ? 'text-green-400' : 
                      resource.duration < 500 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {formatDuration(resource.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}