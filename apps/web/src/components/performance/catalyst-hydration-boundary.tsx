/**
 * Catalyst Hydration Boundary
 * Eliminates React hydration mismatches by ensuring client-server consistency
 */

'use client'

import { useState, useEffect, ReactNode, memo } from 'react'

interface CatalystHydrationBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  errorFallback?: ReactNode
  className?: string
}

/**
 * Catalyst Hydration Boundary Component
 * Prevents hydration mismatches by delaying client-only content
 */
const CatalystHydrationBoundary = memo(function CatalystHydrationBoundary({
  children,
  fallback = null,
  errorFallback = null,
  className
}: CatalystHydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    try {
      // Catalyst: Ensure hydration safety with requestAnimationFrame
      const frame = requestAnimationFrame(() => {
        setIsHydrated(true)
      })
      
      return () => cancelAnimationFrame(frame)
    } catch (error) {
      console.error('Hydration boundary error:', error)
      setHasError(true)
    }
  }, [])

  if (hasError && errorFallback) {
    return <div className={className}>{errorFallback}</div>
  }

  if (!isHydrated) {
    return <div className={className}>{fallback}</div>
  }

  return <div className={className}>{children}</div>
})

/**
 * SSR-Safe Component Wrapper
 * Prevents component from rendering on server to avoid hydration issues
 */
interface NoSSRProps {
  children: ReactNode
  fallback?: ReactNode
}

const NoSSR = memo(function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
})

/**
 * Client-Only Component
 * Ensures component only renders on client side
 */
interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

const ClientOnly = memo(function ClientOnly({ 
  children, 
  fallback = <div className="animate-pulse bg-slate-700 rounded h-8 w-full" />
}: ClientOnlyProps) {
  return (
    <NoSSR fallback={fallback}>
      {children}
    </NoSSR>
  )
})

/**
 * Performance-Optimized Lazy Wrapper
 * Delays rendering until component is visible
 */
interface LazyHydrateProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  threshold?: number
}

const LazyHydrate = memo(function LazyHydrate({
  children,
  fallback = <div className="animate-pulse bg-slate-700 rounded h-32 w-full" />,
  rootMargin = '50px',
  threshold = 0.1
}: LazyHydrateProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [ref, setRef] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref, rootMargin, threshold])

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsHydrated(true), 0)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  return (
    <div ref={setRef}>
      {isHydrated ? children : fallback}
    </div>
  )
})

/**
 * Catalyst Performance Monitor Hook
 * Tracks hydration performance metrics
 */
export function useCatalystPerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    hydrationTime: 0,
    renderTime: 0,
    memoryUsage: 0
  })

  useEffect(() => {
    const startTime = performance.now()
    
    const measureHydration = () => {
      const hydrationTime = performance.now() - startTime
      
      // Measure memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0
      
      setMetrics(prev => ({
        ...prev,
        hydrationTime,
        memoryUsage
      }))
    }

    // Measure after hydration completes
    const timer = setTimeout(measureHydration, 0)
    return () => clearTimeout(timer)
  }, [])

  return metrics
}

export { 
  CatalystHydrationBoundary, 
  NoSSR, 
  ClientOnly, 
  LazyHydrate 
}