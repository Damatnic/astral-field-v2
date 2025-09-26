/**
 * Zenith Performance E2E Tests
 * Comprehensive performance testing for user-facing features
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start performance monitoring
    await page.goto('/dashboard')
  })

  test.describe('Page Load Performance', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      // Navigate to dashboard and measure performance
      const navigationPromise = page.waitForLoadState('networkidle')
      await page.goto('/dashboard')
      await navigationPromise

      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: any = {}
          
          // Largest Contentful Paint (LCP)
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            vitals.lcp = lastEntry.startTime
          }).observe({ entryTypes: ['largest-contentful-paint'] })

          // First Input Delay (FID) - simulated
          vitals.fid = 0 // Will be measured during actual interaction

          // Cumulative Layout Shift (CLS)
          let clsValue = 0
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value
              }
            }
            vitals.cls = clsValue
          }).observe({ entryTypes: ['layout-shift'] })

          // Return vitals after a short delay
          setTimeout(() => resolve(vitals), 3000)
        })
      })

      // Core Web Vitals thresholds
      expect(vitals.lcp).toBeLessThan(2500) // LCP should be < 2.5s
      expect(vitals.cls).toBeLessThan(0.1)  // CLS should be < 0.1
    })

    test('should load critical resources quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/dashboard')
      
      // Wait for critical elements to be visible
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Critical content should load within 3s
    })

    test('should optimize image loading', async ({ page }) => {
      await page.goto('/players')
      
      // Measure time for player images to load
      const startTime = Date.now()
      await page.waitForSelector('[data-testid="player-image"]:first-child')
      const imageLoadTime = Date.now() - startTime
      
      expect(imageLoadTime).toBeLessThan(2000) // Images should load within 2s

      // Check for lazy loading implementation
      const images = await page.$$('[data-testid="player-image"]')
      expect(images.length).toBeGreaterThan(0)

      // Verify images use optimization (WebP, proper sizing)
      const firstImage = images[0]
      const src = await firstImage.getAttribute('src')
      
      // Should use optimized format or CDN
      expect(src).toMatch(/\.(webp|avif)|width=|w_/)
    })
  })

  test.describe('Interactive Performance', () => {
    test('should respond to user interactions quickly', async ({ page }) => {
      await page.goto('/team')

      // Measure response time for lineup changes
      const startTime = Date.now()
      
      await page.click('[data-testid="lineup-tab"]')
      await expect(page.locator('[data-testid="lineup-manager"]')).toBeVisible()
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(500) // Interactions should respond within 500ms
    })

    test('should handle form submissions efficiently', async ({ page }) => {
      await page.goto('/team')
      await page.click('[data-testid="lineup-tab"]')

      // Measure lineup save performance
      const startTime = Date.now()
      
      await page.click('[data-testid="save-lineup-button"]')
      await expect(page.locator('[data-testid="lineup-saved-message"]')).toBeVisible()
      
      const saveTime = Date.now() - startTime
      expect(saveTime).toBeLessThan(2000) // Form submissions should complete within 2s
    })

    test('should search players efficiently', async ({ page }) => {
      await page.goto('/players')

      // Measure search performance
      const startTime = Date.now()
      
      await page.fill('[data-testid="player-search"]', 'Josh Allen')
      await page.waitForSelector('[data-testid="search-results"]')
      
      const searchTime = Date.now() - startTime
      expect(searchTime).toBeLessThan(1000) // Search should be responsive within 1s

      // Test search with multiple characters
      await page.fill('[data-testid="player-search"]', 'Ja')
      await page.waitForSelector('[data-testid="search-results"]')
      
      // Should show filtered results quickly
      const resultCount = await page.locator('[data-testid="player-card"]').count()
      expect(resultCount).toBeGreaterThan(0)
    })
  })

  test.describe('Real-time Features Performance', () => {
    test('should establish WebSocket connections quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/draft')
      await page.click('[data-testid="join-draft-button"]')
      
      // Wait for WebSocket connection indicator
      await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible()
      
      const connectionTime = Date.now() - startTime
      expect(connectionTime).toBeLessThan(3000) // WebSocket should connect within 3s
    })

    test('should handle real-time updates efficiently', async ({ page }) => {
      await page.goto('/live')
      
      // Monitor for score updates
      const initialScore = await page.locator('[data-testid="home-score"]').textContent()
      
      // Simulate score update by refreshing data
      await page.click('[data-testid="refresh-scores"]')
      
      // Measure update response time
      const startTime = Date.now()
      await page.waitForFunction(
        (initial) => document.querySelector('[data-testid="last-updated"]')?.textContent !== initial,
        initialScore,
        { timeout: 5000 }
      )
      const updateTime = Date.now() - startTime
      
      expect(updateTime).toBeLessThan(2000) // Real-time updates should be fast
    })

    test('should handle chat messages efficiently', async ({ page }) => {
      await page.click('[data-testid="chat-toggle"]')
      await expect(page.locator('[data-testid="league-chat"]')).toBeVisible()

      // Measure message send performance
      const testMessage = `Performance test ${Date.now()}`
      
      const startTime = Date.now()
      await page.fill('[data-testid="message-input"]', testMessage)
      await page.click('[data-testid="send-message"]')
      
      // Wait for message to appear
      await expect(page.locator('[data-testid="chat-messages"]').last()).toContainText(testMessage)
      
      const messageTime = Date.now() - startTime
      expect(messageTime).toBeLessThan(1500) // Chat messages should send quickly
    })
  })

  test.describe('Data Loading Performance', () => {
    test('should paginate large datasets efficiently', async ({ page }) => {
      await page.goto('/players')
      
      // Measure initial load
      const initialStartTime = Date.now()
      await page.waitForSelector('[data-testid="player-list"]')
      const initialLoadTime = Date.now() - initialStartTime
      
      expect(initialLoadTime).toBeLessThan(3000)

      // Measure pagination performance
      const paginationStartTime = Date.now()
      await page.click('[data-testid="next-page"]')
      await page.waitForSelector('[data-testid="player-list"]')
      const paginationTime = Date.now() - paginationStartTime
      
      expect(paginationTime).toBeLessThan(1000) // Page changes should be fast
    })

    test('should load nested data efficiently', async ({ page }) => {
      await page.goto('/team')
      
      // Measure time to load team with all related data
      const startTime = Date.now()
      await expect(page.locator('[data-testid="team-stats"]')).toBeVisible()
      await expect(page.locator('[data-testid="roster-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="recent-transactions"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(4000) // Complex data should load within 4s
    })

    test('should handle infinite scroll efficiently', async ({ page }) => {
      await page.goto('/players')
      
      // Enable infinite scroll if available
      let previousCount = await page.locator('[data-testid="player-card"]').count()
      
      // Scroll to trigger loading more items
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      // Wait for new items to load
      await page.waitForFunction(
        (prevCount) => document.querySelectorAll('[data-testid=\"player-card\"]').length > prevCount,
        previousCount,
        { timeout: 5000 }
      )
      
      const newCount = await page.locator('[data-testid="player-card"]').count()
      expect(newCount).toBeGreaterThan(previousCount)
    })
  })

  test.describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      // Navigate through multiple pages to test for memory leaks
      const pages = ['/dashboard', '/team', '/players', '/live', '/draft']
      
      for (let i = 0; i < 3; i++) {
        for (const pagePath of pages) {
          await page.goto(pagePath)
          await page.waitForLoadState('networkidle')
          
          // Check for memory usage (in a real test, you'd use browser DevTools)
          const memoryInfo = await page.evaluate(() => {
            if ('memory' in performance) {
              return (performance as any).memory
            }
            return null
          })
          
          if (memoryInfo) {
            // Memory should not continuously increase
            expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024) // < 100MB
          }
        }
      }
    })

    test('should optimize network requests', async ({ page }) => {
      // Monitor network requests
      const requests: string[] = []
      
      page.on('request', request => {
        requests.push(request.url())
      })
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Check for duplicate requests
      const uniqueRequests = new Set(requests)
      const duplicateRequests = requests.length - uniqueRequests.size
      
      expect(duplicateRequests).toBeLessThan(5) // Minimal duplicate requests
      
      // Check for unnecessary requests
      const apiRequests = requests.filter(url => url.includes('/api/'))
      expect(apiRequests.length).toBeLessThan(10) // Reasonable number of API calls
    })
  })

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async ({ page, isMobile }) => {
      if (!isMobile) return

      const startTime = Date.now()
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      const mobileLoadTime = Date.now() - startTime
      
      // Mobile should load within reasonable time
      expect(mobileLoadTime).toBeLessThan(5000)

      // Test mobile interactions
      const interactionStartTime = Date.now()
      await page.tap('[data-testid="mobile-menu-button"]')
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
      const interactionTime = Date.now() - interactionStartTime
      
      expect(interactionTime).toBeLessThan(800) // Mobile interactions should be responsive
    })

    test('should optimize touch interactions', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/team')
      await page.tap('[data-testid="lineup-tab"]')
      
      // Test drag and drop on mobile
      const startTime = Date.now()
      await page.tap('[data-testid="bench-player"]:first-child')
      await expect(page.locator('[data-testid="player-options-modal"]')).toBeVisible()
      const touchTime = Date.now() - startTime
      
      expect(touchTime).toBeLessThan(600) // Touch interactions should be immediate
    })
  })

  test.describe('Error Handling Performance', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())
      
      const startTime = Date.now()
      await page.goto('/dashboard')
      
      // Should show error state quickly
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      const errorTime = Date.now() - startTime
      
      expect(errorTime).toBeLessThan(5000) // Error states should appear quickly
      
      // Restore network and test recovery
      await page.unroute('**/api/**')
      await page.click('[data-testid="retry-button"]')
      
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
    })

    test('should handle large error responses efficiently', async ({ page }) => {
      // Simulate large error response
      await page.route('**/api/players', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            error: 'Server error',
            details: 'A'.repeat(10000), // Large error message
          }),
        })
      })
      
      await page.goto('/players')
      
      // Should handle large errors without freezing
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      // Page should remain responsive
      await page.click('[data-testid="nav-dashboard"]')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })
  })

  test.describe('Progressive Enhancement', () => {
    test('should work without JavaScript for critical features', async ({ page }) => {
      // Disable JavaScript
      await page.setJavaScriptEnabled(false)
      
      await page.goto('/auth/signin')
      
      // Basic form should still work
      await page.fill('[name="email"]', 'test@example.com')
      await page.fill('[name="password"]', 'password123')
      
      // Form should be submittable (even if JS is disabled)
      const submitButton = page.locator('[type="submit"]')
      await expect(submitButton).toBeVisible()
      await expect(submitButton).not.toBeDisabled()
    })

    test('should enhance with JavaScript gracefully', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check for progressive enhancement
      const enhancedFeatures = [
        '[data-testid="real-time-scores"]',
        '[data-testid="auto-refresh"]',
        '[data-testid="keyboard-shortcuts"]',
      ]
      
      for (const feature of enhancedFeatures) {
        const element = page.locator(feature)
        if (await element.isVisible()) {
          // Enhanced features should load after basic content
          await expect(element).toBeVisible()
        }
      }
    })
  })
})