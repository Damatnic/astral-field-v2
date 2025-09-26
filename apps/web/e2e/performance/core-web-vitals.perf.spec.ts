/**
 * Zenith Performance Tests - Core Web Vitals
 * Comprehensive performance testing for production deployment
 */
import { test, expect, Page } from '@playwright/test'
import { ZenithE2EFramework } from '../utils/zenith-framework'

// Performance thresholds based on Google's Core Web Vitals
const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (LCP) - should be under 2.5s
  LCP: 2500,
  // First Input Delay (FID) - should be under 100ms  
  FID: 100,
  // Cumulative Layout Shift (CLS) - should be under 0.1
  CLS: 0.1,
  // First Contentful Paint (FCP) - should be under 1.8s
  FCP: 1800,
  // Time to Interactive (TTI) - should be under 3.8s
  TTI: 3800,
  // Total Blocking Time (TBT) - should be under 200ms
  TBT: 200
}

const CRITICAL_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/auth/signin', name: 'Login Page' },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/team', name: 'Team Page', requiresAuth: true },
  { path: '/standings', name: 'Standings Page', requiresAuth: true }
]

test.describe('Core Web Vitals Performance Tests', () => {
  let framework: ZenithE2EFramework

  test.beforeEach(async ({ page }) => {
    framework = new ZenithE2EFramework(page)
  })

  CRITICAL_PAGES.forEach((pageConfig) => {
    test(`Core Web Vitals - ${pageConfig.name}`, async ({ page }) => {
      // Set up performance monitoring
      const performanceMetrics: any[] = []
      
      // Listen for Core Web Vitals
      await page.addInitScript(() => {
        // Web Vitals library simulation
        const vitals = {
          LCP: 0,
          FID: 0,
          CLS: 0,
          FCP: 0,
          TTI: 0,
          TBT: 0
        }
        
        // Monitor LCP
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.LCP = lastEntry.startTime
          ;(window as any).__vitals = vitals
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // Monitor FCP
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          for (const entry of entries) {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime
              ;(window as any).__vitals = vitals
            }
          }
        }).observe({ entryTypes: ['paint'] })
        
        // Monitor layout shifts
        let clsValue = 0
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          vitals.CLS = clsValue
          ;(window as any).__vitals = vitals
        }).observe({ entryTypes: ['layout-shift'] })
      })

      // Handle authentication if required
      if (pageConfig.requiresAuth) {
        await page.goto('/')
        await framework.login('alex@damato.com', 'Dynasty2024!')
        await framework.verifyDashboard()
      }

      // Navigate to target page and measure performance
      const startTime = Date.now()
      await page.goto(pageConfig.path)
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000) // Allow time for vitals to be measured
      
      const loadTime = Date.now() - startTime
      
      // Get Core Web Vitals
      const vitals = await page.evaluate(() => (window as any).__vitals || {})
      
      // Get additional performance metrics
      const performanceData = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paintEntries = performance.getEntriesByType('paint')
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          timeToInteractive: navigation.loadEventEnd - navigation.fetchStart,
          resourceCount: performance.getEntriesByType('resource').length,
          transferSize: performance.getEntriesByType('navigation')[0]?.transferSize || 0
        }
      })

      // Performance assertions
      console.log(`\n=== Performance Metrics for ${pageConfig.name} ===`)
      console.log(`Load Time: ${loadTime}ms`)
      console.log(`LCP: ${vitals.LCP || 'N/A'}ms`)
      console.log(`FCP: ${vitals.FCP || performanceData.firstContentfulPaint}ms`)
      console.log(`CLS: ${vitals.CLS || 'N/A'}`)
      console.log(`DOM Content Loaded: ${performanceData.domContentLoaded}ms`)
      console.log(`Resources Loaded: ${performanceData.resourceCount}`)
      
      // Core Web Vitals assertions
      if (vitals.LCP) {
        expect(vitals.LCP).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP)
      }
      
      if (vitals.FCP || performanceData.firstContentfulPaint) {
        const fcp = vitals.FCP || performanceData.firstContentfulPaint
        expect(fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP)
      }
      
      if (vitals.CLS !== undefined) {
        expect(vitals.CLS).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS)
      }
      
      // Page load time should be reasonable
      expect(loadTime).toBeLessThan(5000) // 5 seconds max
      
      // DOM should load quickly
      expect(performanceData.domContentLoaded).toBeLessThan(2000) // 2 seconds max
    })
  })

  test('Asset loading performance', async ({ page }) => {
    const resourceMetrics: Array<{
      url: string
      type: string
      size: number
      loadTime: number
      status: number
    }> = []

    page.on('response', async (response) => {
      const request = response.request()
      const timing = await response.timing()
      
      resourceMetrics.push({
        url: response.url(),
        type: request.resourceType(),
        size: parseInt(response.headers()['content-length'] || '0'),
        loadTime: timing.responseEnd - timing.requestStart,
        status: response.status()
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Analyze critical assets
    const jsAssets = resourceMetrics.filter(r => r.type === 'script' || r.url.endsWith('.js'))
    const cssAssets = resourceMetrics.filter(r => r.type === 'stylesheet' || r.url.endsWith('.css'))
    const imageAssets = resourceMetrics.filter(r => r.type === 'image')
    
    console.log(`\n=== Asset Loading Performance ===`)
    console.log(`Total Resources: ${resourceMetrics.length}`)
    console.log(`JavaScript Assets: ${jsAssets.length}`)
    console.log(`CSS Assets: ${cssAssets.length}`)
    console.log(`Image Assets: ${imageAssets.length}`)
    
    // Performance assertions for assets
    const failedAssets = resourceMetrics.filter(r => r.status >= 400)
    expect(failedAssets).toHaveLength(0)
    
    // Critical JavaScript should load quickly
    const criticalJS = jsAssets.filter(asset => 
      asset.url.includes('webpack') || 
      asset.url.includes('main') || 
      asset.url.includes('polyfills')
    )
    
    criticalJS.forEach(asset => {
      expect(asset.loadTime).toBeLessThan(2000) // 2 seconds max for critical JS
    })
    
    // CSS should load quickly
    cssAssets.forEach(asset => {
      expect(asset.loadTime).toBeLessThan(1500) // 1.5 seconds max for CSS
    })
    
    // No single asset should be excessively large
    const largeAssets = resourceMetrics.filter(r => r.size > 1000000) // 1MB
    expect(largeAssets.length).toBeLessThan(3) // Maximum 3 assets over 1MB
  })

  test('Memory usage and performance under load', async ({ page }) => {
    await page.goto('/')
    
    // Simulate user interactions to test memory usage
    const actions = [
      () => page.click('a[href="/dashboard"]').catch(() => {}),
      () => page.click('a[href="/team"]').catch(() => {}),
      () => page.click('a[href="/standings"]').catch(() => {}),
      () => page.goBack(),
      () => page.goForward()
    ]
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
      }
    })
    
    // Perform actions and measure memory
    for (let i = 0; i < 10; i++) {
      const action = actions[i % actions.length]
      await action()
      await page.waitForTimeout(500)
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
      }
    })
    
    console.log(`\n=== Memory Usage ===`)
    console.log(`Initial Used Heap: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Final Used Heap: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Memory Increase: ${((finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / 1024 / 1024).toFixed(2)}MB`)
    
    // Memory shouldn't grow excessively
    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Less than 50MB increase
  })

  test('Performance on slow network', async ({ page }) => {
    // Simulate slow 3G network
    await page.context().setNetworkConditions({
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 300 // 300ms latency
    })
    
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime
    
    console.log(`\n=== Slow Network Performance ===`)
    console.log(`Load Time on Slow 3G: ${loadTime}ms`)
    
    // Should still be usable on slow networks
    expect(loadTime).toBeLessThan(10000) // 10 seconds max on slow network
    
    // Critical content should be visible
    await expect(page.locator('h1, [data-testid="main-content"]')).toBeVisible({ timeout: 8000 })
  })

  test('Bundle size analysis', async ({ page }) => {
    const bundleMetrics = {
      totalJSSize: 0,
      totalCSSSize: 0,
      totalImageSize: 0,
      totalFontSize: 0,
      uniqueResources: new Set()
    }
    
    page.on('response', async (response) => {
      const url = response.url()
      const size = parseInt(response.headers()['content-length'] || '0')
      
      if (bundleMetrics.uniqueResources.has(url)) return
      bundleMetrics.uniqueResources.add(url)
      
      if (url.endsWith('.js')) {
        bundleMetrics.totalJSSize += size
      } else if (url.endsWith('.css')) {
        bundleMetrics.totalCSSSize += size
      } else if (url.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)) {
        bundleMetrics.totalImageSize += size
      } else if (url.match(/\.(woff2?|ttf|eot)$/)) {
        bundleMetrics.totalFontSize += size
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    console.log(`\n=== Bundle Size Analysis ===`)
    console.log(`Total JavaScript: ${(bundleMetrics.totalJSSize / 1024).toFixed(2)}KB`)
    console.log(`Total CSS: ${(bundleMetrics.totalCSSSize / 1024).toFixed(2)}KB`)
    console.log(`Total Images: ${(bundleMetrics.totalImageSize / 1024).toFixed(2)}KB`)
    console.log(`Total Fonts: ${(bundleMetrics.totalFontSize / 1024).toFixed(2)}KB`)
    
    // Bundle size assertions
    expect(bundleMetrics.totalJSSize).toBeLessThan(1024 * 1024) // 1MB max for JS
    expect(bundleMetrics.totalCSSSize).toBeLessThan(200 * 1024) // 200KB max for CSS
  })
})
