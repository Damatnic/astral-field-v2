/**
 * Catalyst Dynamic Loading Service
 * Implements aggressive code splitting and lazy loading
 * Optimized for Core Web Vitals and bundle size reduction
 */

import dynamic from 'next/dynamic'
import { ComponentType, ReactElement } from 'react'

interface DynamicLoadOptions {
  ssr?: boolean
  loading?: () => ReactElement | null
  suspense?: boolean
  preload?: boolean
  priority?: 'high' | 'normal' | 'low'
}

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'skeleton' | 'minimal'
}

// Catalyst: Optimized loading indicators
export const LoadingIndicators = {
  spinner: ({ size = 'md' }: LoadingIndicatorProps) => (
    <div className={`
      flex items-center justify-center
      ${size === 'sm' ? 'h-8' : size === 'lg' ? 'h-32' : 'h-16'}
    `}>
      <div className={`
        animate-spin rounded-full border-2 border-slate-300 border-t-blue-500
        ${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'}
      `} />
    </div>
  ),

  skeleton: ({ size = 'md' }: LoadingIndicatorProps) => (
    <div className={`
      animate-pulse space-y-4 p-4
      ${size === 'sm' ? 'h-20' : size === 'lg' ? 'h-40' : 'h-32'}
    `}>
      <div className="h-4 bg-slate-300 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-300 rounded"></div>
        <div className="h-3 bg-slate-300 rounded w-5/6"></div>
      </div>
    </div>
  ),

  minimal: () => (
    <div className="flex items-center justify-center h-16">
      <div className="text-sm text-slate-500">Loading...</div>
    </div>
  )
}

// Catalyst: Performance-optimized dynamic loading factory
class CatalystDynamicLoader {
  private componentCache = new Map<string, ComponentType<any>>()
  private preloadPromises = new Map<string, Promise<any>>()

  /**
   * Load component with advanced optimization
   */
  load<T = any>(
    importFn: () => Promise<{ default: ComponentType<T> }>,
    options: DynamicLoadOptions & {
      key?: string
      fallback?: ComponentType<T>
    } = {}
  ): ComponentType<T> {
    const {
      ssr = false,
      loading = LoadingIndicators.minimal,
      suspense = false,
      preload = false,
      priority = 'normal',
      key,
      fallback
    } = options

    // Use cache if key provided and component exists
    if (key && this.componentCache.has(key)) {
      return this.componentCache.get(key)!
    }

    // Catalyst: Advanced dynamic import with preloading
    const dynamicImport = async () => {
      try {
        // Check if preload promise exists
        if (key && this.preloadPromises.has(key)) {
          return await this.preloadPromises.get(key)!
        }

        // High priority components get immediate loading
        if (priority === 'high') {
          const module = await importFn()
          return module
        }

        // Normal/low priority with potential delay for better LCP
        if (priority === 'low') {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        return await importFn()
      } catch (error) {
        console.error('Dynamic import failed:', error)
        if (fallback) {
          return { default: fallback }
        }
        throw error
      }
    }

    const DynamicComponent = dynamic(dynamicImport, {
      ssr,
      loading,
      suspense
    })

    // Cache the component
    if (key) {
      this.componentCache.set(key, DynamicComponent)
    }

    // Preload if requested
    if (preload && key) {
      this.preloadComponent(key, importFn)
    }

    return DynamicComponent
  }

  /**
   * Preload component for faster rendering
   */
  preloadComponent<T>(
    key: string,
    importFn: () => Promise<{ default: ComponentType<T> }>
  ): void {
    if (!this.preloadPromises.has(key)) {
      this.preloadPromises.set(key, importFn())
    }
  }

  /**
   * Preload multiple components based on user interaction
   */
  preloadRoute(routeComponents: Array<{
    key: string
    importFn: () => Promise<any>
    condition?: () => boolean
  }>): void {
    routeComponents.forEach(({ key, importFn, condition }) => {
      if (!condition || condition()) {
        this.preloadComponent(key, importFn)
      }
    })
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.componentCache.clear()
    this.preloadPromises.clear()
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      componentsCached: this.componentCache.size,
      preloadsActive: this.preloadPromises.size
    }
  }
}

// Singleton instance
export const dynamicLoader = new CatalystDynamicLoader()

// Catalyst: Pre-configured component loaders for common patterns
export const CatalystComponents = {
  // Dashboard components (high priority)
  DashboardStats: dynamicLoader.load(
    () => import('@/components/dashboard/stats'),
    { key: 'dashboard-stats', priority: 'high', ssr: false }
  ),

  // Analytics components (normal priority)
  AnalyticsDashboard: dynamicLoader.load(
    () => import('@/components/analytics/dashboard'),
    { key: 'analytics-dashboard', priority: 'normal', loading: LoadingIndicators.skeleton }
  ),

  // Charts (low priority, heavy bundle)
  LeagueCharts: dynamicLoader.load(
    () => import('@/components/charts/league-charts'),
    { key: 'league-charts', priority: 'low', loading: LoadingIndicators.skeleton }
  ),

  // Trade components (on-demand)
  TradeInterface: dynamicLoader.load(
    () => import('@/components/trades/trade-interface'),
    { key: 'trade-interface', priority: 'normal', preload: false }
  ),

  // AI Coach (low priority, ML heavy)
  AICoach: dynamicLoader.load(
    () => import('@/components/ai/ai-coach'),
    { key: 'ai-coach', priority: 'low', ssr: false }
  ),

  // Live scoring (medium priority)
  LiveScoring: dynamicLoader.load(
    () => import('@/components/live-scoring/live-scores'),
    { key: 'live-scoring', priority: 'normal', ssr: false }
  )
}

// Catalyst: Route-based preloading strategies
export const PreloadStrategies = {
  // Preload components based on current route
  preloadByRoute: (pathname: string) => {
    const routeMap: Record<string, string[]> = {
      '/dashboard': ['analytics-dashboard', 'league-charts'],
      '/trades': ['trade-interface', 'analytics-dashboard'],
      '/ai-coach': ['ai-coach'],
      '/live-scores': ['live-scoring', 'league-charts']
    }

    const componentsToPreload = routeMap[pathname] || []
    componentsToPreload.forEach(key => {
      // Find and preload components by key
      const componentImports: Record<string, () => Promise<any>> = {
        'analytics-dashboard': () => import('@/components/analytics/dashboard'),
        'league-charts': () => import('@/components/charts/league-charts'),
        'trade-interface': () => import('@/components/trades/trade-interface'),
        'ai-coach': () => import('@/components/ai/ai-coach'),
        'live-scoring': () => import('@/components/live-scoring/live-scores')
      }

      if (componentImports[key]) {
        dynamicLoader.preloadComponent(key, componentImports[key])
      }
    })
  },

  // Preload on user interaction
  preloadOnHover: (componentKey: string) => {
    const componentImports: Record<string, () => Promise<any>> = {
      'trade-interface': () => import('@/components/trades/trade-interface'),
      'ai-coach': () => import('@/components/ai/ai-coach'),
      'analytics-dashboard': () => import('@/components/analytics/dashboard')
    }

    if (componentImports[componentKey]) {
      dynamicLoader.preloadComponent(componentKey, componentImports[componentKey])
    }
  },

  // Preload based on user behavior
  preloadByUserActivity: (userPreferences: {
    usesTrading: boolean
    usesAICoach: boolean
    viewsAnalytics: boolean
  }) => {
    const { usesTrading, usesAICoach, viewsAnalytics } = userPreferences

    if (usesTrading) {
      dynamicLoader.preloadComponent(
        'trade-interface',
        () => import('@/components/trades/trade-interface')
      )
    }

    if (usesAICoach) {
      dynamicLoader.preloadComponent(
        'ai-coach',
        () => import('@/components/ai/ai-coach')
      )
    }

    if (viewsAnalytics) {
      dynamicLoader.preloadComponent(
        'analytics-dashboard',
        () => import('@/components/analytics/dashboard')
      )
    }
  }
}

// Catalyst: Intersection Observer for lazy loading optimization
export class LazyLoadObserver {
  private observer: IntersectionObserver | null = null
  private loadedComponents = new Set<string>()

  constructor(
    private options: IntersectionObserverInit = {
      rootMargin: '100px',
      threshold: 0.1
    }
  ) {
    if (typeof window !== 'undefined') {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const componentKey = entry.target.getAttribute('data-component-key')
            if (componentKey && !this.loadedComponents.has(componentKey)) {
              this.loadedComponents.add(componentKey)
              PreloadStrategies.preloadOnHover(componentKey)
              this.observer?.unobserve(entry.target)
            }
          }
        })
      }, this.options)
    }
  }

  observe(element: Element, componentKey: string): void {
    if (this.observer) {
      element.setAttribute('data-component-key', componentKey)
      this.observer.observe(element)
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// Export singleton
export const lazyLoadObserver = new LazyLoadObserver()

// Catalyst: Performance monitoring for dynamic imports
export const DynamicLoadMetrics = {
  loadTimes: new Map<string, number>(),
  
  recordLoadTime: (componentKey: string, loadTime: number) => {
    DynamicLoadMetrics.loadTimes.set(componentKey, loadTime)
  },

  getAverageLoadTime: (): number => {
    const times = Array.from(DynamicLoadMetrics.loadTimes.values())
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  },

  getSlowComponents: (threshold: number = 1000) => {
    return Array.from(DynamicLoadMetrics.loadTimes.entries())
      .filter(([_, time]) => time > threshold)
      .map(([key, time]) => ({ key, time }))
  }
}

export default dynamicLoader