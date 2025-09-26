/**
 * Zenith E2E Testing Framework
 * Comprehensive utilities for end-to-end testing
 */
import { Page, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export class ZenithE2EFramework {
  constructor(private page: Page) {}

  /**
   * Enhanced selectors for reliable element targeting
   */
  get selectors() {
    return {
      auth: {
        emailInput: '[data-testid="email-input"], input[type="email"], input[name="email"]',
        passwordInput: '[data-testid="password-input"], input[type="password"], input[name="password"]',
        submitButton: '[data-testid="login-submit"], button[type="submit"], .login-button',
        errorMessage: '[data-testid="error-message"], .error-message, .alert-error',
        signupLink: '[data-testid="signup-link"], a[href*="signup"]',
        forgotPasswordLink: '[data-testid="forgot-password"], a[href*="forgot"]'
      },
      dashboard: {
        header: '[data-testid="dashboard-header"], .dashboard-header, h1',
        userMenu: '[data-testid="user-menu"], .user-menu, .profile-menu',
        sidebar: '[data-testid="sidebar"], .sidebar, nav',
        mainContent: '[data-testid="main-content"], .main-content, main',
        statsCards: '[data-testid="stats-card"], .stats-card, .metric-card',
        activityFeed: '[data-testid="activity-feed"], .activity-feed'
      },
      navigation: {
        teamNav: '[data-testid="team-nav"], a[href*="team"]',
        standingsNav: '[data-testid="standings-nav"], a[href*="standings"]',
        scheduleNav: '[data-testid="schedule-nav"], a[href*="schedule"]',
        playersNav: '[data-testid="players-nav"], a[href*="players"]'
      },
      team: {
        header: '[data-testid="team-header"], .team-header',
        rosterContainer: '[data-testid="roster-container"], .roster-container',
        playerCard: '[data-testid="player-card"], .player-card',
        lineupBuilder: '[data-testid="lineup-builder"], .lineup-builder'
      },
      standings: {
        table: '[data-testid="standings-table"], .standings-table, table',
        teamRow: '[data-testid="team-row"], .team-row, tr',
        teamName: '[data-testid="team-name"], .team-name'
      },
      mobile: {
        menuToggle: '[data-testid="mobile-menu-toggle"], .mobile-menu-toggle, .hamburger',
        navMenu: '[data-testid="mobile-nav-menu"], .mobile-nav-menu'
      }
    }
  }

  /**
   * Enhanced login method with multiple fallback strategies
   */
  async login(email: string, password: string) {
    try {
      // Method 1: Try data-testid selectors first
      await this.page.fill(this.selectors.auth.emailInput, email)
      await this.page.fill(this.selectors.auth.passwordInput, password)
      await this.page.click(this.selectors.auth.submitButton)
      
      // Wait for navigation or error
      await Promise.race([
        this.page.waitForURL(/\/dashboard/, { timeout: 10000 }),
        this.page.waitForSelector(this.selectors.auth.errorMessage, { timeout: 5000 })
      ])
      
    } catch (error) {
      // Method 2: Fallback to form submission
      try {
        await this.page.evaluate((credentials) => {
          const emailField = document.querySelector('input[type="email"]') as HTMLInputElement
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement
          const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
          
          if (emailField && passwordField && submitButton) {
            emailField.value = credentials.email
            passwordField.value = credentials.password
            submitButton.click()
          }
        }, { email, password })
        
        await this.page.waitForTimeout(2000)
      } catch (fallbackError) {
        throw new Error(`Login failed: ${error.message}`)
      }
    }
  }

  /**
   * Verify dashboard loaded successfully
   */
  async verifyDashboard() {
    await expect(this.page.locator(this.selectors.dashboard.header)).toBeVisible({ timeout: 10000 })
    
    // Check for common error indicators
    const errorElements = await this.page.locator('[data-testid="error-message"], .error, .alert-error').count()
    expect(errorElements).toBe(0)
    
    // Verify main navigation is present
    const navElements = await this.page.locator('nav, .navigation, [data-testid="sidebar"]').count()
    expect(navElements).toBeGreaterThan(0)
  }

  /**
   * Take screenshot with descriptive naming
   */
  async takeScreenshot(description: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${description}-${timestamp}.png`
    
    await this.page.screenshot({
      path: `e2e-results/screenshots/${filename}`,
      fullPage: true
    })
    
    return filename
  }

  /**
   * Wait for network to be idle (no ongoing requests)
   */
  async waitForNetworkIdle(timeout = 5000) {
    await this.page.waitForLoadState('networkidle', { timeout })
  }

  /**
   * Check for JavaScript errors in console
   */
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = []
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await this.page.waitForTimeout(1000)
    return errors
  }

  /**
   * Run accessibility test using axe-core
   */
  async runAccessibilityTest() {
    const accessibilityScanResults = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
      
    return accessibilityScanResults
  }

  /**
   * Measure page performance metrics
   */
  async measurePerformance() {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      }
    })
    
    return performanceMetrics
  }

  /**
   * Test responsive design at different viewport sizes
   */
  async testResponsiveDesign() {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ]
    
    const results = []
    
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height })
      await this.page.waitForTimeout(500) // Let layout settle
      
      const screenshot = await this.takeScreenshot(`responsive-${viewport.name.toLowerCase()}`)
      
      results.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        screenshot
      })
    }
    
    return results
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkConditions(preset: 'fast' | 'slow' | 'offline') {
    const conditions = {
      fast: { offline: false, downloadThroughput: 1000000, uploadThroughput: 1000000, latency: 10 },
      slow: { offline: false, downloadThroughput: 50000, uploadThroughput: 20000, latency: 500 },
      offline: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    }
    
    await this.page.context().setNetworkConditions(conditions[preset])
  }

  /**
   * Test user interactions and form handling
   */
  async testFormInteraction(formSelector: string, formData: Record<string, string>) {
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = this.page.locator(`${formSelector} [name="${fieldName}"], ${formSelector} #${fieldName}`)
      await field.fill(value)
    }
    
    // Submit form
    await this.page.click(`${formSelector} button[type="submit"], ${formSelector} .submit-button`)
  }

  /**
   * Verify asset loading and MIME types
   */
  async verifyAssetLoading() {
    const resources: Array<{ url: string; status: number; contentType: string | null }> = []
    
    this.page.on('response', response => {
      resources.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || null
      })
    })
    
    await this.page.reload()
    await this.waitForNetworkIdle()
    
    // Filter for static assets
    const staticAssets = resources.filter(r => 
      r.url.includes('/_next/static/') || 
      r.url.match(/\.(js|css|woff2?|png|jpg|jpeg|webp|svg)$/)
    )
    
    // Check for 404s
    const failedAssets = staticAssets.filter(asset => asset.status >= 400)
    expect(failedAssets).toHaveLength(0)
    
    // Verify MIME types
    const jsAssets = staticAssets.filter(asset => asset.url.endsWith('.js'))
    jsAssets.forEach(asset => {
      expect(asset.contentType).toMatch(/(?:text\/javascript|application\/javascript)/)
    })
    
    const cssAssets = staticAssets.filter(asset => asset.url.endsWith('.css'))
    cssAssets.forEach(asset => {
      expect(asset.contentType).toMatch(/text\/css/)
    })
    
    return {
      totalAssets: staticAssets.length,
      failedAssets: failedAssets.length,
      jsAssets: jsAssets.length,
      cssAssets: cssAssets.length
    }
  }

  /**
   * Test security headers
   */
  async verifySecurityHeaders() {
    const response = await this.page.goto(this.page.url())
    const headers = response?.headers() || {}
    
    const securityHeaders = {
      csp: headers['content-security-policy'] || headers['content-security-policy-report-only'],
      xFrameOptions: headers['x-frame-options'],
      xContentTypeOptions: headers['x-content-type-options'],
      referrerPolicy: headers['referrer-policy'],
      strictTransportSecurity: headers['strict-transport-security']
    }
    
    return securityHeaders
  }
}
