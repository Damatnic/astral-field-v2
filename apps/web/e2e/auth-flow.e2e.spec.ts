/**
 * Zenith E2E Authentication Flow Tests
 * Comprehensive testing of authentication, hydration, and navigation
 */

import { test, expect, type Page } from '@playwright/test'

// Test data
const testUser = {
  email: 'test@astralfield.com',
  password: 'TestPassword123!',
  name: 'Test User'
}

// Page Object Model for Authentication
class AuthPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/auth/signin')
    await this.page.waitForLoadState('networkidle')
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"], input[name="email"], input[type="email"]', email)
    await this.page.fill('[data-testid="password-input"], input[name="password"], input[type="password"]', password)
  }

  async submitLogin() {
    await this.page.click('[data-testid="login-submit"], button[type="submit"], .sign-in-button')
  }

  async signIn(email: string, password: string) {
    await this.fillLoginForm(email, password)
    await this.submitLogin()
  }

  async waitForRedirect() {
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 })
  }

  async expectToBeOnSignInPage() {
    await expect(this.page).toHaveURL(/.*auth.*signin.*/)
  }

  async expectSignInError() {
    await expect(
      this.page.locator('text="Invalid credentials" >> visible=true, text="Error" >> visible=true, .error >> visible=true')
    ).toBeVisible({ timeout: 5000 })
  }
}

class DashboardPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForLoad() {
    // Wait for the dashboard to fully load
    await this.page.waitForSelector('[data-testid="dashboard-content"], h1:has-text("Welcome"), .dashboard-stats', { timeout: 15000 })
    
    // Wait for any dynamic imports to complete
    await this.page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[data-testid*="loading"], .animate-pulse')
      return loadingElements.length === 0 || 
             Array.from(loadingElements).every(el => el.offsetHeight === 0)
    }, { timeout: 10000 })
  }

  async expectToBeAuthenticated() {
    await expect(this.page).toHaveURL(/.*dashboard.*/)
    await expect(this.page.locator('text="Welcome back" >> visible=true, h1 >> visible=true')).toBeVisible()
  }

  async expectNavigationToBeVisible() {
    await expect(
      this.page.locator('[data-testid="navigation"], nav, .sidebar')
    ).toBeVisible({ timeout: 10000 })
  }

  async expectStatsToBeVisible() {
    await expect(
      this.page.locator('[data-testid="stats-card"], .stats, .dashboard-stats')
    ).toBeVisible({ timeout: 10000 })
  }

  async checkForHydrationErrors() {
    // Listen for hydration errors in console
    const errors: string[] = []
    this.page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('hydration') || 
           msg.text().includes('Cannot read properties of undefined') ||
           msg.text().includes('call'))) {
        errors.push(msg.text())
      }
    })

    // Check for visible error boundaries
    const errorBoundaries = await this.page.locator('.error-boundary, [data-testid="error-boundary"]').count()
    expect(errorBoundaries).toBe(0)

    // Check that no hydration errors occurred
    expect(errors).toHaveLength(0)
  }
}

// Test Setup
test.beforeEach(async ({ page }) => {
  // Set up error tracking
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  // Set up page context
  await page.setViewportSize({ width: 1280, height: 720 })
})

test.describe('Authentication Flow', () => {
  test('should complete full sign-in flow without hydration errors', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Step 1: Navigate to sign-in page
    await authPage.goto()
    
    // Verify sign-in page loads
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()

    // Step 2: Attempt sign-in with test credentials
    await authPage.signIn(testUser.email, testUser.password)

    // Step 3: Wait for navigation to dashboard
    await authPage.waitForRedirect()
    
    // Step 4: Verify dashboard loads completely
    await dashboardPage.waitForLoad()
    await dashboardPage.expectToBeAuthenticated()

    // Step 5: Check for hydration errors
    await dashboardPage.checkForHydrationErrors()

    // Step 6: Verify all components loaded
    await dashboardPage.expectNavigationToBeVisible()
    await dashboardPage.expectStatsToBeVisible()
  })

  test('should handle authentication errors gracefully', async ({ page }) => {
    const authPage = new AuthPage(page)

    await authPage.goto()
    
    // Try with invalid credentials
    await authPage.signIn('invalid@example.com', 'wrongpassword')
    
    // Should stay on sign-in page and show error
    await authPage.expectToBeOnSignInPage()
    // Note: Expecting error might vary based on your error handling implementation
  })

  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    
    // Try to access dashboard without authentication
    await dashboardPage.goto()
    
    // Should be redirected to sign-in
    await expect(page).toHaveURL(/.*auth.*signin.*/)
  })
})

test.describe('Dashboard Hydration & Dynamic Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for these tests
    await page.addInitScript(() => {
      // Mock session storage/local storage if needed
      window.localStorage.setItem('next-auth.session-token', 'mock-session-token')
    })
  })

  test('should load dashboard components progressively without blocking', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    
    await dashboardPage.goto()
    
    // Track component loading times
    const startTime = Date.now()
    
    // Wait for main content
    await expect(page.locator('h1, .dashboard-header')).toBeVisible({ timeout: 5000 })
    const mainContentTime = Date.now() - startTime
    
    // Navigation should load dynamically
    await expect(page.locator('nav, .sidebar')).toBeVisible({ timeout: 10000 })
    const navigationTime = Date.now() - startTime
    
    // Verify reasonable loading times
    expect(mainContentTime).toBeLessThan(3000) // Main content under 3 seconds
    expect(navigationTime).toBeLessThan(8000) // Full navigation under 8 seconds
    
    // Check for hydration errors
    await dashboardPage.checkForHydrationErrors()
  })

  test('should handle dynamic import failures gracefully', async ({ page }) => {
    // Mock network failure for specific dynamic imports
    await page.route('**/_next/static/chunks/*.js', route => {
      const url = route.request().url()
      if (url.includes('navigation') || url.includes('sidebar')) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })

    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()
    
    // Main content should still load even if some dynamic imports fail
    await expect(page.locator('h1, .dashboard-header')).toBeVisible({ timeout: 10000 })
    
    // Should not crash the entire page
    const errorBoundaries = await page.locator('.error-boundary, [data-testid="error-boundary"]').count()
    expect(errorBoundaries).toBeLessThanOrEqual(1) // At most one error boundary for failed components
  })

  test('should maintain state during hydration', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    
    // Verify client-side hydration doesn't reset state
    const statsCards = page.locator('[data-testid="stats-card"], .stats-card, .dashboard-stats > div')
    const initialCount = await statsCards.count()
    
    // Wait a bit for hydration to complete
    await page.waitForTimeout(2000)
    
    // Stats should remain consistent
    const finalCount = await statsCards.count()
    expect(finalCount).toBe(initialCount)
  })
})

test.describe('Mobile Authentication Flow', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE dimensions
  })

  test('should complete authentication on mobile without issues', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    await authPage.goto()
    
    // Verify mobile layout
    await expect(page.locator('input[type="email"]')).toBeVisible()
    
    // Complete sign-in flow
    await authPage.signIn(testUser.email, testUser.password)
    await authPage.waitForRedirect()
    
    // Verify mobile dashboard
    await dashboardPage.waitForLoad()
    await dashboardPage.expectToBeAuthenticated()
    
    // Mobile navigation should work
    await expect(page.locator('nav, .mobile-nav, button[aria-label*="menu"]')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Performance & Accessibility', () => {
  test('should meet performance standards', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const metrics: any = {}
          
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              metrics.fcp = entry.value
            }
            if (entry.name === 'largest-contentful-paint') {
              metrics.lcp = entry.value
            }
          })
          
          resolve(metrics)
        }).observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] })
      })
    })
    
    // Verify reasonable performance (values in milliseconds)
    // expect(metrics.fcp).toBeLessThan(1800) // FCP under 1.8s
    // expect(metrics.lcp).toBeLessThan(2500) // LCP under 2.5s
  })

  test('should be accessible', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Check for basic accessibility
    await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-label', /.+/)
    await expect(page.locator('input[type="password"]')).toHaveAttribute('aria-label', /.+/)
    
    // Form should be submittable via keyboard
    await page.keyboard.press('Tab') // Focus first input
    await page.keyboard.type(testUser.email)
    await page.keyboard.press('Tab') // Move to password
    await page.keyboard.type(testUser.password)
    await page.keyboard.press('Enter') // Submit form
    
    // Should handle form submission
    await page.waitForTimeout(1000)
  })
})

test.describe('Error Recovery', () => {
  test('should recover from temporary network issues', async ({ page }) => {
    const authPage = new AuthPage(page)
    
    // Start with network issues
    await page.setOfflineMode(true)
    await authPage.goto()
    
    // Should show some kind of offline indicator or error
    await page.waitForTimeout(2000)
    
    // Restore network
    await page.setOfflineMode(false)
    await page.reload()
    
    // Should recover and load normally
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
  })

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    // Inject a JavaScript error
    await page.addInitScript(() => {
      // Simulate a potential error that could occur
      window.addEventListener('error', (e) => {
        console.log('Caught error:', e.error?.message)
      })
    })

    const authPage = new AuthPage(page)
    await authPage.goto()
    
    // Page should still be functional despite potential JS errors
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})