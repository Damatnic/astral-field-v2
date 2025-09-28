'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useCallback, useMemo } from 'react'

interface RouteConfig {
  path: string
  preload: boolean
  priority: 'high' | 'medium' | 'low'
  prefetchMode: 'intent' | 'viewport' | 'immediate'
}

// Catalyst: Route configuration with intelligent preloading
const ROUTE_CONFIG: RouteConfig[] = [
  { path: '/dashboard', preload: true, priority: 'high', prefetchMode: 'immediate' },
  { path: '/team', preload: true, priority: 'high', prefetchMode: 'intent' },
  { path: '/players', preload: true, priority: 'high', prefetchMode: 'intent' },
  { path: '/ai-coach', preload: true, priority: 'medium', prefetchMode: 'intent' },
  { path: '/live', preload: false, priority: 'medium', prefetchMode: 'viewport' },
  { path: '/draft', preload: false, priority: 'low', prefetchMode: 'viewport' },
  { path: '/settings', preload: false, priority: 'low', prefetchMode: 'viewport' },
  { path: '/analytics', preload: false, priority: 'low', prefetchMode: 'viewport' }
]

interface CatalystRouterProps {
  children: React.ReactNode
}

export function CatalystRouter({ children }: CatalystRouterProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Catalyst: Memoized route configurations
  const immediateRoutes = useMemo(() => 
    ROUTE_CONFIG.filter(route => route.prefetchMode === 'immediate')
  , [])

  const intentRoutes = useMemo(() => 
    ROUTE_CONFIG.filter(route => route.prefetchMode === 'intent')
  , [])

  // Catalyst: Aggressive immediate preloading
  useEffect(() => {
    const preloadImmediate = async () => {
      console.log('[Catalyst Router] Starting immediate preloading...')
      const startTime = performance.now()
      
      for (const route of immediateRoutes) {
        try {
          await router.prefetch(route.path)
          console.log(`[Catalyst Router] Preloaded ${route.path}`)
        } catch (error) {
          console.warn(`[Catalyst Router] Failed to preload ${route.path}:`, error)
        }
      }
      
      const endTime = performance.now()
      console.log(`[Catalyst Router] Immediate preloading completed in ${(endTime - startTime).toFixed(2)}ms`)
    }

    // Start immediate preloading after hydration
    const timer = setTimeout(preloadImmediate, 100)
    return () => clearTimeout(timer)
  }, [router, immediateRoutes])

  // Catalyst: Intent-based preloading on hover/focus
  useEffect(() => {
    const handleLinkInteraction = async (event: Event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a, button[data-href]')
      
      if (!link) return
      
      const href = link.getAttribute('href') || link.getAttribute('data-href')
      if (!href || !href.startsWith('/')) return
      
      const routeConfig = intentRoutes.find(route => 
        href === route.path || href.startsWith(route.path + '/')
      )
      
      if (!routeConfig) return
      
      try {
        console.log(`[Catalyst Router] Intent preloading ${href}`)
        await router.prefetch(href)
      } catch (error) {
        console.warn(`[Catalyst Router] Intent preload failed for ${href}:`, error)
      }
    }

    // Add listeners for hover and focus
    document.addEventListener('mouseover', handleLinkInteraction, { passive: true })
    document.addEventListener('focusin', handleLinkInteraction, { passive: true })
    
    return () => {
      document.removeEventListener('mouseover', handleLinkInteraction)
      document.removeEventListener('focusin', handleLinkInteraction)
    }
  }, [router, intentRoutes])

  // Catalyst: Viewport-based preloading using Intersection Observer
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const href = target.getAttribute('href') || target.getAttribute('data-href')
            
            if (!href || !href.startsWith('/')) return
            
            try {
              console.log(`[Catalyst Router] Viewport preloading ${href}`)
              await router.prefetch(href)
              observer.unobserve(target)
            } catch (error) {
              console.warn(`[Catalyst Router] Viewport preload failed for ${href}:`, error)
            }
          }
        })
      },
      {
        rootMargin: '100px', // Start preloading 100px before entering viewport
        threshold: 0.1
      }
    )

    // Observe all links after a delay
    const observeLinks = () => {
      const links = document.querySelectorAll('a[href^="/"], button[data-href^="/"]')
      links.forEach(link => {
        const href = link.getAttribute('href') || link.getAttribute('data-href')
        const routeConfig = ROUTE_CONFIG.find(route => 
          route.prefetchMode === 'viewport' && 
          (href === route.path || href?.startsWith(route.path + '/'))
        )
        
        if (routeConfig) {
          observer.observe(link as Element)
        }
      })
    }

    const timer = setTimeout(observeLinks, 1000)
    
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [router, pathname])

  // Catalyst: Navigation performance tracking
  const trackNavigation = useCallback((destination: string) => {
    const startTime = performance.now()
    
    const trackCompletion = () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`[Catalyst Router] Navigation to ${destination}: ${duration.toFixed(2)}ms`)
      
      // Send performance metric
      if (window.gtag) {
        window.gtag('event', 'catalyst_navigation', {
          destination,
          duration,
          custom_parameter: duration
        })
      }
      
      // Track slow navigations
      if (duration > 1000) {
        console.warn(`[Catalyst Router] Slow navigation detected: ${destination} took ${duration.toFixed(2)}ms`)
      }
    }

    // Wait for navigation to complete
    setTimeout(trackCompletion, 100)
  }, [])

  // Catalyst: Enhanced router with performance tracking
  const enhancedRouter = useMemo(() => ({
    ...router,
    push: async (href: string, options?: any) => {
      trackNavigation(href)
      return router.push(href, options)
    },
    replace: async (href: string, options?: any) => {
      trackNavigation(href)
      return router.replace(href, options)
    },
    prefetch: async (href: string, options?: any) => {
      const startTime = performance.now()
      try {
        const result = await router.prefetch(href, options)
        const endTime = performance.now()
        console.log(`[Catalyst Router] Prefetch ${href}: ${(endTime - startTime).toFixed(2)}ms`)
        return result
      } catch (error) {
        console.warn(`[Catalyst Router] Prefetch failed for ${href}:`, error)
        throw error
      }
    }
  }), [router, trackNavigation])

  // Catalyst: Preload critical resources
  useEffect(() => {
    const preloadCriticalResources = () => {
      // Preload critical CSS
      const criticalCSS = [
        '/_next/static/css/app/layout.css',
        '/_next/static/css/app/globals.css'
      ]
      
      criticalCSS.forEach(css => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'style'
        link.href = css
        document.head.appendChild(link)
      })
      
      // Preload critical chunks
      const criticalChunks = [
        '/_next/static/chunks/webpack.js',
        '/_next/static/chunks/main.js',
        '/_next/static/chunks/pages/_app.js'
      ]
      
      criticalChunks.forEach(chunk => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'script'
        link.href = chunk
        document.head.appendChild(link)
      })
    }

    preloadCriticalResources()
  }, [])

  return (
    <>
      {children}
      
      {/* Catalyst: Performance monitoring script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Catalyst: Route change performance monitoring
            if (typeof window !== 'undefined') {
              let routeChangeStart = 0;
              
              window.addEventListener('beforeunload', () => {
                routeChangeStart = performance.now();
              });
              
              window.addEventListener('load', () => {
                if (routeChangeStart > 0) {
                  const routeChangeDuration = performance.now() - routeChangeStart;
                  console.log('[Catalyst Router] Route change duration:', routeChangeDuration + 'ms');
                }
              });
              
              // Track history navigation
              let navigationStart = 0;
              const originalPushState = history.pushState;
              const originalReplaceState = history.replaceState;
              
              history.pushState = function() {
                navigationStart = performance.now();
                return originalPushState.apply(this, arguments);
              };
              
              history.replaceState = function() {
                navigationStart = performance.now();
                return originalReplaceState.apply(this, arguments);
              };
              
              window.addEventListener('popstate', () => {
                navigationStart = performance.now();
              });
            }
          `
        }}
      />
    </>
  )
}