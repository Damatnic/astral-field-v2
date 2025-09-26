/**
 * Zenith Accessibility Tests - Dashboard Components
 * Comprehensive WCAG 2.1 AA compliance testing
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ZenithE2EFramework } from '../utils/zenith-framework'

const DAMATO_USERS = [
  { email: 'alex@damato.com', name: 'Alex D\'Amato', team: 'Thunder Bolts' },
  { email: 'maria@damato.com', name: 'Maria D\'Amato', team: 'Lightning Strike' },
  { email: 'sofia@damato.com', name: 'Sofia D\'Amato', team: 'Wind Warriors' }
]

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

test.describe('Dashboard Accessibility Compliance', () => {
  let framework: ZenithE2EFramework

  test.beforeEach(async ({ page }) => {
    framework = new ZenithE2EFramework(page)
    await page.goto('/')
  })

  test('Homepage accessibility scan', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Additional checks
    await expect(page.locator('h1')).toBeVisible()
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
    expect(headings.length).toBeGreaterThan(0)
    
    // Check for alt text on images
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')
      
      // Images should have alt text or be decorative
      if (role !== 'presentation' && role !== 'none') {
        expect(alt).toBeTruthy()
      }
    }
  })

  test('Login form accessibility', async ({ page }) => {
    // Navigate to login if not already there
    const isLoginPage = await page.locator('[data-testid="signin-form"]').isVisible()
    if (!isLoginPage) {
      await page.click('a[href*="signin"]').catch(() => {})
    }

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Form accessibility checks
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    // Check for proper labels
    await expect(emailInput).toHaveAttribute('aria-label')
    await expect(passwordInput).toHaveAttribute('aria-label')
    
    // Check for form validation accessibility
    await emailInput.fill('invalid-email')
    await submitButton.click()
    
    // Error messages should be accessible
    const errorMessage = page.locator('[role="alert"], [aria-live="polite"]')
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible()
    }
  })

  DAMATO_USERS.forEach((user) => {
    test(`Dashboard accessibility for ${user.name}`, async ({ page }) => {
      // Login user
      await framework.login(user.email, 'Dynasty2024!')
      await framework.verifyDashboard()

      // Run accessibility scan on dashboard
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .exclude('[data-testid="chart"]') // Charts might have known accessibility issues
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])

      // Test keyboard navigation
      await test.step('Test keyboard navigation', async () => {
        // Tab through interactive elements
        const focusableElements = page.locator(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        
        const count = await focusableElements.count()
        expect(count).toBeGreaterThan(0)
        
        // Test first few elements for focus visibility
        for (let i = 0; i < Math.min(5, count); i++) {
          await page.keyboard.press('Tab')
          const focused = page.locator(':focus')
          await expect(focused).toBeVisible()
        }
      })

      // Test color contrast
      await test.step('Test color contrast', async () => {
        const contrastResults = await new AxeBuilder({ page })
          .withTags(['wcag2aa'])
          .include('[data-testid="main-content"]')
          .analyze()

        const contrastViolations = contrastResults.violations.filter(
          v => v.id === 'color-contrast'
        )
        expect(contrastViolations).toEqual([])
      })

      // Test screen reader compatibility
      await test.step('Test screen reader elements', async () => {
        // Check for proper ARIA labels
        const buttons = page.locator('button')
        const buttonCount = await buttons.count()
        
        for (let i = 0; i < buttonCount; i++) {
          const button = buttons.nth(i)
          const ariaLabel = await button.getAttribute('aria-label')
          const textContent = await button.textContent()
          
          // Button should have accessible name
          expect(ariaLabel || textContent?.trim()).toBeTruthy()
        }
        
        // Check for proper landmarks
        await expect(page.locator('main, [role="main"]')).toBeVisible()
        await expect(page.locator('nav, [role="navigation"]')).toBeVisible()
      })
    })
  })

  test('Team page accessibility', async ({ page }) => {
    // Login and navigate to team page
    await framework.login(DAMATO_USERS[0].email, 'Dynasty2024!')
    await page.click('[data-testid="team-nav"], a[href*="team"]')
    
    await page.waitForLoadState('networkidle')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test table accessibility if present
    const tables = page.locator('table')
    const tableCount = await tables.count()
    
    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i)
      
      // Tables should have captions or aria-label
      const caption = await table.locator('caption').count()
      const ariaLabel = await table.getAttribute('aria-label')
      
      expect(caption > 0 || !!ariaLabel).toBe(true)
      
      // Check for proper headers
      const headers = await table.locator('th').count()
      expect(headers).toBeGreaterThan(0)
    }
  })

  test('Standings page accessibility', async ({ page }) => {
    await framework.login(DAMATO_USERS[0].email, 'Dynasty2024!')
    await page.click('[data-testid="standings-nav"], a[href*="standings"]')
    
    await page.waitForLoadState('networkidle')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test sortable table accessibility
    const sortableHeaders = page.locator('th[role="columnheader"], th[aria-sort]')
    const sortableCount = await sortableHeaders.count()
    
    if (sortableCount > 0) {
      for (let i = 0; i < sortableCount; i++) {
        const header = sortableHeaders.nth(i)
        
        // Sortable headers should have proper ARIA attributes
        const ariaSortValue = await header.getAttribute('aria-sort')
        expect(['ascending', 'descending', 'none', null]).toContain(ariaSortValue)
      }
    }
  })

  test('Mobile accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await framework.login(DAMATO_USERS[0].email, 'Dynasty2024!')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test mobile navigation accessibility
    const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"], .hamburger, .mobile-menu-toggle')
    
    if (await mobileMenuToggle.isVisible()) {
      // Mobile menu should be accessible
      await expect(mobileMenuToggle).toHaveAttribute('aria-label')
      await expect(mobileMenuToggle).toHaveAttribute('aria-expanded')
      
      // Test mobile menu interaction
      await mobileMenuToggle.click()
      
      const mobileMenu = page.locator('[data-testid="mobile-nav-menu"], .mobile-nav')
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenuToggle).toHaveAttribute('aria-expanded', 'true')
      }
    }
    
    // Test touch target sizes
    const touchTargets = page.locator('button, a, input[type="checkbox"], input[type="radio"]')
    const touchTargetCount = await touchTargets.count()
    
    // Sample a few touch targets for size validation
    for (let i = 0; i < Math.min(5, touchTargetCount); i++) {
      const target = touchTargets.nth(i)
      const boundingBox = await target.boundingBox()
      
      if (boundingBox) {
        // Touch targets should be at least 44x44px for accessibility
        expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        expect(boundingBox.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('Focus management and skip links', async ({ page }) => {
    await framework.login(DAMATO_USERS[0].email, 'Dynasty2024!')
    
    // Test skip links
    await page.keyboard.press('Tab')
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link')
    
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused()
      await skipLink.click()
      
      // Main content should be focused
      const mainContent = page.locator('#main, #content, main')
      await expect(mainContent).toBeFocused()
    }
    
    // Test focus trap in modals
    const modalTrigger = page.locator('[data-testid="modal-trigger"], .modal-trigger')
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click()
      
      const modal = page.locator('[role="dialog"], .modal')
      if (await modal.isVisible()) {
        // Focus should be trapped within modal
        await page.keyboard.press('Tab')
        const focusedElement = page.locator(':focus')
        
        // Focused element should be within modal
        expect(await modal.locator(':focus').count()).toBeGreaterThan(0)
      }
    }
  })

  test('Form error handling accessibility', async ({ page }) => {
    // Test form with validation errors
    const forms = page.locator('form')
    const formCount = await forms.count()
    
    if (formCount > 0) {
      const form = forms.first()
      
      // Submit form without filling required fields
      await form.locator('button[type="submit"]').click()
      
      // Check for accessible error messages
      const errorMessages = page.locator('[role="alert"], [aria-live="polite"], .error-message')
      const errorCount = await errorMessages.count()
      
      if (errorCount > 0) {
        // Error messages should be properly associated with fields
        const firstError = errorMessages.first()
        await expect(firstError).toBeVisible()
        
        // Run accessibility scan with errors present
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          .analyze()

        expect(accessibilityScanResults.violations).toEqual([])
      }
    }
  })

  test('Charts and data visualization accessibility', async ({ page }) => {
    await framework.login(DAMATO_USERS[0].email, 'Dynasty2024!')
    
    // Look for charts or data visualizations
    const charts = page.locator('[data-testid="chart"], .chart, canvas, svg')
    const chartCount = await charts.count()
    
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i)
      
      // Charts should have accessible descriptions
      const ariaLabel = await chart.getAttribute('aria-label')
      const ariaDescribedBy = await chart.getAttribute('aria-describedby')
      const title = await chart.getAttribute('title')
      
      // At least one accessibility attribute should be present
      expect(ariaLabel || ariaDescribedBy || title).toBeTruthy()
      
      // If chart has describedby, the description should exist
      if (ariaDescribedBy) {
        const description = page.locator(`#${ariaDescribedBy}`)
        await expect(description).toBeVisible()
      }
    }
  })
})

test.describe('High Contrast Mode Support', () => {
  test('should work in high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' })
    
    const framework = new ZenithE2EFramework(page)
    await page.goto('/')
    await framework.login(DAMATO_USERS[0].email, 'Dynasty2024!')
    
    // Basic accessibility scan in high contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Visual elements should still be visible
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('button')).toBeVisible()
  })
})

test.describe('Reduced Motion Support', () => {
  test('should respect reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    const framework = new ZenithE2EFramework(page)
    await page.goto('/')
    
    // Check that animations are disabled or reduced
    const animatedElements = page.locator('[class*="animate"], [style*="transition"]')
    const animatedCount = await animatedElements.count()
    
    if (animatedCount > 0) {
      // Verify that motion is actually reduced
      const computedStyle = await page.evaluate(() => {
        const element = document.querySelector('[class*="animate"]')
        if (element) {
          return window.getComputedStyle(element).getPropertyValue('animation-duration')
        }
        return null
      })
      
      // Animations should be disabled or very short
      if (computedStyle) {
        expect(computedStyle).toMatch(/0s|none/)
      }
    }
  })
})
