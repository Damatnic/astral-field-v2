'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

// Sigma: Mobile performance optimization utilities
export class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer
  private observers: Map<string, IntersectionObserver> = new Map()
  private loadedImages: Set<string> = new Set()
  private preloadedRoutes: Set<string> = new Set()
  private performanceMetrics: Map<string, number> = new Map()

  static getInstance(): MobilePerformanceOptimizer {
    if (!this.instance) {
      this.instance = new MobilePerformanceOptimizer()
    }
    return this.instance
  }

  // Sigma: Lazy loading with intersection observer
  createLazyLoader(threshold = 0.1, rootMargin = '50px'): IntersectionObserver {
    const observerKey = `lazy-${threshold}-${rootMargin}`
    
    if (this.observers.has(observerKey)) {
      return this.observers.get(observerKey)!
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            
            // Handle image lazy loading
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement
              const src = img.dataset.src
              if (src && !this.loadedImages.has(src)) {
                this.optimizedImageLoad(img, src)
              }
            }
            
            // Handle component lazy loading
            if (element.dataset.lazyComponent) {
              const event = new CustomEvent('lazyLoad', {
                detail: { element, componentName: element.dataset.lazyComponent }
              })
              element.dispatchEvent(event)
            }
            
            observer.unobserve(element)
          }
        })
      },
      { threshold, rootMargin }
    )

    this.observers.set(observerKey, observer)
    return observer
  }

  // Sigma: Optimized image loading with progressive enhancement
  optimizedImageLoad(img: HTMLImageElement, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedImages.has(src)) {
        img.src = src
        resolve()
        return
      }

      const tempImg = new Image()
      
      // Add performance monitoring
      const startTime = performance.now()
      
      tempImg.onload = () => {
        const loadTime = performance.now() - startTime
        this.performanceMetrics.set(`image-load-${src}`, loadTime)
        
        img.src = src
        img.classList.add('loaded')
        this.loadedImages.add(src)
        resolve()
      }
      
      tempImg.onerror = () => {
        console.warn(`Failed to load image: ${src}`)
        reject(new Error(`Failed to load image: ${src}`))
      }
      
      // Load optimized image based on device capabilities
      tempImg.src = this.getOptimizedImageUrl(src)
    })
  }

  // Sigma: Get optimized image URL based on device capabilities
  getOptimizedImageUrl(src: string): string {
    if (typeof window === 'undefined') return src

    const devicePixelRatio = window.devicePixelRatio || 1
    const screenWidth = window.screen.width
    const connection = (navigator as any).connection
    
    // Determine optimal image size
    let targetWidth = screenWidth * devicePixelRatio
    
    // Reduce quality on slow connections
    let quality = 80
    if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      quality = 60
      targetWidth = Math.min(targetWidth, screenWidth) // No pixel ratio scaling on slow connections
    } else if (connection?.effectiveType === '3g') {
      quality = 70
    }
    
    // Add optimization parameters
    const url = new URL(src, window.location.origin)
    url.searchParams.set('w', Math.round(targetWidth).toString())
    url.searchParams.set('q', quality.toString())
    url.searchParams.set('auto', 'format')
    
    return url.toString()
  }

  // Sigma: Bundle splitting and route preloading
  async preloadRoute(route: string): Promise<void> {
    if (this.preloadedRoutes.has(route)) return

    try {
      const startTime = performance.now()
      
      // Preload the route module
      await import(/* webpackChunkName: "route-[request]" */ `@/app${route}/page`)
      
      const loadTime = performance.now() - startTime
      this.performanceMetrics.set(`route-preload-${route}`, loadTime)
      this.preloadedRoutes.add(route)
      
      console.log(`[Sigma] Preloaded route ${route} in ${loadTime.toFixed(2)}ms`)
    } catch (error) {
      console.warn(`Failed to preload route: ${route}`, error)
    }
  }

  // Sigma: Memory management and cleanup
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.loadedImages.clear()
    this.preloadedRoutes.clear()
    this.performanceMetrics.clear()
  }

  // Sigma: Performance metrics collection
  getPerformanceMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {}
    this.performanceMetrics.forEach((value, key) => {
      metrics[key] = value
    })
    return metrics
  }

  // Sigma: Memory usage monitoring
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return null
  }

  // Sigma: Battery-aware optimizations
  async getBatteryInfo(): Promise<{
    level: number
    charging: boolean
    chargingTime: number
    dischargingTime: number
  } | null> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        }
      } catch (error) {
        console.warn('Battery API not available:', error)
      }
    }
    return null
  }
}

// Sigma: Hook for lazy loading with intersection observer
export function useLazyLoading(threshold = 0.1, rootMargin = '50px') {
  const [isLoaded, setIsLoaded] = useState(false)
  const elementRef = useRef<HTMLElement>(null)
  const optimizer = MobilePerformanceOptimizer.getInstance()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = optimizer.createLazyLoader(threshold, rootMargin)
    
    const handleLazyLoad = () => {
      setIsLoaded(true)
    }
    
    element.addEventListener('lazyLoad', handleLazyLoad)
    observer.observe(element)

    return () => {
      element.removeEventListener('lazyLoad', handleLazyLoad)
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, optimizer])

  return { elementRef, isLoaded }
}

// Sigma: Hook for optimized image loading
export function useOptimizedImage(src: string) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [optimizedSrc, setOptimizedSrc] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const optimizer = MobilePerformanceOptimizer.getInstance()

  useEffect(() => {
    if (!src) return

    const img = imgRef.current
    if (!img) return

    setIsLoaded(false)
    setIsError(false)

    const optimizedUrl = optimizer.getOptimizedImageUrl(src)
    setOptimizedSrc(optimizedUrl)

    optimizer.optimizedImageLoad(img, optimizedUrl)
      .then(() => setIsLoaded(true))
      .catch(() => setIsError(true))
  }, [src, optimizer])

  return { imgRef, isLoaded, isError, optimizedSrc }
}

// Sigma: Hook for route preloading
export function useRoutePreloading() {
  const optimizer = MobilePerformanceOptimizer.getInstance()

  const preloadRoute = useCallback((route: string) => {
    optimizer.preloadRoute(route)
  }, [optimizer])

  const preloadMultipleRoutes = useCallback((routes: string[]) => {
    routes.forEach(route => optimizer.preloadRoute(route))
  }, [optimizer])

  return { preloadRoute, preloadMultipleRoutes }
}

// Sigma: Hook for performance monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number
    total: number
    percentage: number
  } | null>(null)
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number
    charging: boolean
    chargingTime: number
    dischargingTime: number
  } | null>(null)

  const optimizer = MobilePerformanceOptimizer.getInstance()

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(optimizer.getPerformanceMetrics())
      setMemoryUsage(optimizer.getMemoryUsage())
    }

    const updateBattery = async () => {
      const battery = await optimizer.getBatteryInfo()
      setBatteryInfo(battery)
    }

    updateMetrics()
    updateBattery()

    const interval = setInterval(updateMetrics, 5000) // Update every 5 seconds
    const batteryInterval = setInterval(updateBattery, 30000) // Update every 30 seconds

    return () => {
      clearInterval(interval)
      clearInterval(batteryInterval)
    }
  }, [optimizer])

  return { metrics, memoryUsage, batteryInfo }
}

// Sigma: Network-aware loading strategies
export function useNetworkAwareLoading() {
  const [connectionQuality, setConnectionQuality] = useState<'slow' | 'medium' | 'fast'>('medium')
  const [isOnline, setIsOnline] = useState(true)
  const [saveData, setSaveData] = useState(false)

  useEffect(() => {
    const updateNetworkInfo = () => {
      setIsOnline(navigator.onLine)
      
      const connection = (navigator as any).connection
      if (connection) {
        setSaveData(connection.saveData || false)
        
        const effectiveType = connection.effectiveType
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionQuality('slow')
        } else if (effectiveType === '3g') {
          setConnectionQuality('medium')
        } else {
          setConnectionQuality('fast')
        }
      }
    }

    updateNetworkInfo()
    
    window.addEventListener('online', updateNetworkInfo)
    window.addEventListener('offline', updateNetworkInfo)
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo)
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo)
      window.removeEventListener('offline', updateNetworkInfo)
      
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  const shouldLoadContent = useCallback((priority: 'high' | 'medium' | 'low') => {
    if (!isOnline) return false
    if (saveData && priority === 'low') return false
    if (connectionQuality === 'slow' && priority !== 'high') return false
    return true
  }, [isOnline, saveData, connectionQuality])

  return {
    connectionQuality,
    isOnline,
    saveData,
    shouldLoadContent
  }
}

// Sigma: Viewport optimization
export function useViewportOptimization() {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [isInViewport, setIsInViewport] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
    window.addEventListener('orientationchange', updateViewportSize)

    return () => {
      window.removeEventListener('resize', updateViewportSize)
      window.removeEventListener('orientationchange', updateViewportSize)
    }
  }, [])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [])

  return { elementRef, viewportSize, isInViewport }
}