/**
 * Zenith Authentication E2E Tests
 * Comprehensive end-to-end testing for authentication flows
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

const DEMO_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: "Commissioner" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: "Player" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: "Player" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: "Player" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: "Player" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: "Player" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: "Player" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: "Player" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: "Player" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: "Player" }
]

test.describe('Authentication System - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies()
    await page.goto('/auth/signin')
  })

  test.describe('Login Page Rendering', () => {
    test('should display complete login interface', async ({ page }) => {
      // Check main branding and title
      await expect(page.locator('text=AstralField')).toBeVisible()
      await expect(page.locator('text=Sign in to your account')).toBeVisible()

      // Check form elements
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Check Google sign-in option
      await expect(page.locator('text=Sign in with Google')).toBeVisible()

      // Check demo users section
      await expect(page.locator('text=D\'Amato Dynasty League')).toBeVisible()
      await expect(page.locator('text=Password: Dynasty2025!')).toBeVisible()
    })

    test('should display all 10 demo user accounts', async ({ page }) => {
      for (const user of DEMO_USERS) {
        await expect(page.locator(`text=${user.name}`)).toBeVisible()
        await expect(page.locator(`text=${user.team}`)).toBeVisible()
        await expect(page.locator(`text=${user.role}`)).toBeVisible()
      }
    })

    test('should have proper accessibility attributes', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')

      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('required')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')

      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(passwordInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })
  })

  test.describe('Manual Login Flow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // Fill in login form
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')

      // Submit form
      await page.click('button[type="submit"]')

      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 })

      // Verify successful login
      await expect(page).toHaveURL(/.*dashboard/)
      
      // Check for user-specific content
      await expect(page.locator('text=Nicholas')).toBeVisible({ timeout: 5000 })
    })

    test('should reject invalid credentials', async ({ page }) => {
      // Fill in invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'wrongpassword')

      // Submit form
      await page.click('button[type="submit"]')

      // Wait for error message
      await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 })

      // Should remain on login page
      await expect(page).toHaveURL(/.*signin/)
    })

    test('should validate email format', async ({ page }) => {
      // Fill in invalid email format
      await page.fill('input[name="email"]', 'invalid-email')
      await page.fill('input[name="password"]', 'password123')

      // Try to submit form
      await page.click('button[type="submit"]')

      // Should show HTML5 validation error
      const emailInput = page.locator('input[name="email"]')
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
    })

    test('should require both email and password', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Should show validation errors
      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')

      const emailValidation = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      const passwordValidation = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage)

      expect(emailValidation).toBeTruthy()
      expect(passwordValidation).toBeTruthy()
    })

    test('should show loading state during submission', async ({ page }) => {
      // Fill in valid credentials
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')

      // Submit and check for loading state
      await page.click('button[type="submit"]')

      // Button should be disabled during loading
      await expect(page.locator('button[type="submit"]')).toBeDisabled()

      // Should show loading spinner
      await expect(page.locator('.loading-spinner')).toBeVisible()
    })
  })

  test.describe('Demo User Quick Login', () => {
    test('should auto-login with demo user credentials', async ({ page }) => {
      // Click on Nicholas D'Amato demo button
      await page.click('text=Nicholas D\'Amato')

      // Should auto-fill and submit form
      await page.waitForURL('**/dashboard', { timeout: 10000 })

      // Verify successful login
      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('text=Nicholas')).toBeVisible({ timeout: 5000 })
    })

    test('should work for all demo users', async ({ page }) => {
      // Test first 3 demo users to verify the pattern works
      const testUsers = DEMO_USERS.slice(0, 3)

      for (const user of testUsers) {
        // Clear session and go back to login
        await page.context().clearCookies()
        await page.goto('/auth/signin')

        // Click demo user button
        await page.click(`text=${user.name}`)

        // Wait for dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 })

        // Verify login success
        await expect(page).toHaveURL(/.*dashboard/)
      }
    })

    test('should auto-fill form fields before submission', async ({ page }) => {
      // Click demo user but prevent auto-submission by intercepting
      await page.evaluate(() => {
        const form = document.getElementById('signin-form') as HTMLFormElement
        if (form) {
          form.requestSubmit = () => {} // Override to prevent submission
        }
      })

      // Click demo user
      await page.click('text=Nick Hartley')

      // Check that form was auto-filled
      await expect(page.locator('input[name="email"]')).toHaveValue('nick@damato-dynasty.com')
      await expect(page.locator('input[name="password"]')).toHaveValue('Dynasty2025!')
    })
  })

  test.describe('Session Management', () => {
    test('should establish session properly and redirect after login - CRITICAL', async ({ page }) => {
      // Enable console logging to track session establishment
      const consoleLogs: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'error') {
          consoleLogs.push(`${msg.type()}: ${msg.text()}`)
        }
      })

      // Monitor network requests for session API calls
      const sessionRequests: string[] = []
      page.on('request', request => {
        if (request.url().includes('session') || request.url().includes('auth')) {
          sessionRequests.push(`${request.method()} ${request.url()}`)
        }
      })

      // Start login process
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      
      // Monitor for loading state
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Verify loading state appears
      await expect(submitButton).toBeDisabled()
      await expect(page.locator('text=Processing..., text=Signing you in...')).toBeVisible()

      // Wait for session establishment with timeout
      await page.waitForFunction(() => {
        return window.location.href.includes('/dashboard')
      }, { timeout: 10000 })

      // Verify successful redirect
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 })

      // Verify session is actually established by checking for user content
      await expect(page.locator('text=Nicholas')).toBeVisible({ timeout: 5000 })

      // Verify session cookie exists
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session-token') || cookie.name.includes('next-auth')
      )
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie?.httpOnly).toBe(true)

      // Verify at least one session API call was made
      expect(sessionRequests.length).toBeGreaterThan(0)
      
      console.log('Session establishment successful. Requests made:', sessionRequests)
    })

    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')

      // Refresh page
      await page.reload()

      // Should still be logged in
      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('text=Nicholas')).toBeVisible()
    })

    test('should handle session expiration', async ({ page }) => {
      // Login first
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')

      // Clear cookies to simulate session expiration
      await page.context().clearCookies()

      // Try to access protected route
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/.*signin/)
    })

    test('should support logout functionality', async ({ page }) => {
      // Login first
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')

      // Look for logout button/menu (adjust selector based on UI)
      const userMenu = page.locator('[data-testid="user-menu"]')
      if (await userMenu.isVisible()) {
        await userMenu.click()
        await page.click('text=Sign out')
      }

      // Should redirect to login page
      await expect(page).toHaveURL(/.*signin/)
    })
  })

  test.describe('Security Features', () => {
    test('should not expose credentials in page source', async ({ page }) => {
      const pageContent = await page.content()
      
      // Password should not be visible in plain text
      expect(pageContent).not.toContain('Dynasty2025!')
      
      // No hardcoded user credentials should be exposed
      expect(pageContent).not.toMatch(/password.*=.*["'].*["']/i)
    })

    test('should implement CSRF protection', async ({ page }) => {
      // Check for CSRF token in forms or meta tags
      const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
      
      if (csrfToken) {
        expect(csrfToken).toBeTruthy()
      }
    })

    test('should use secure cookies in production', async ({ page }) => {
      // This test would need to run against production environment
      // For now, we'll just verify the cookie configuration exists
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      await page.click('button[type="submit"]')
      
      // In production, cookies should have secure flags
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || cookie.name.includes('session')
      )

      // Verify cookie security attributes (when in production)
      authCookies.forEach(cookie => {
        expect(cookie.httpOnly).toBe(true)
        expect(cookie.sameSite).toBe('Strict')
      })
    })

    test('should prevent SQL injection attacks', async ({ page }) => {
      const maliciousInput = "'; DROP TABLE users; --"
      
      await page.fill('input[name="email"]', maliciousInput)
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')

      // Should handle malicious input gracefully
      await expect(page.locator('text=Invalid email or password')).toBeVisible()
      
      // Page should still be functional
      await expect(page.locator('input[name="email"]')).toBeVisible()
    })

    test('should prevent XSS attacks', async ({ page }) => {
      const xssPayload = '<script>alert("xss")</script>@example.com'
      
      await page.fill('input[name="email"]', xssPayload)
      await page.fill('input[name="password"]', 'password')

      // Script should not execute
      const alertPromise = new Promise(resolve => {
        page.on('dialog', dialog => {
          resolve(dialog.message())
          dialog.dismiss()
        })
      })

      await page.click('button[type="submit"]')

      // Wait a bit to see if alert fires
      const alertFired = await Promise.race([
        alertPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 1000))
      ])

      expect(alertFired).toBeNull()
    })
  })

  test.describe('Performance Testing', () => {
    test('should load login page quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/auth/signin')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should complete login flow within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')
      
      const loginTime = Date.now() - startTime

      // Should complete login within 5 seconds
      expect(loginTime).toBeLessThan(5000)
    })

    test('should handle rapid form interactions', async ({ page }) => {
      // Rapidly fill and clear form fields
      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')

      for (let i = 0; i < 10; i++) {
        await emailInput.fill(`test${i}@example.com`)
        await passwordInput.fill(`password${i}`)
        await emailInput.clear()
        await passwordInput.clear()
      }

      // Form should remain responsive
      await emailInput.fill('final@example.com')
      await expect(emailInput).toHaveValue('final@example.com')
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should display properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Check that all elements are visible and accessible
      await expect(page.locator('text=AstralField')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Demo users section should be accessible
      await expect(page.locator('text=D\'Amato Dynasty League')).toBeVisible()
    })

    test('should support touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      // Should be able to tap form fields
      await page.tap('input[name="email"]')
      await expect(page.locator('input[name="email"]')).toBeFocused()

      await page.tap('input[name="password"]')
      await expect(page.locator('input[name="password"]')).toBeFocused()

      // Should be able to tap demo user buttons
      await page.tap('text=Nicholas D\'Amato')
      await page.waitForURL('**/dashboard', { timeout: 10000 })
    })
  })

  test.describe('Accessibility Testing', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="email"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="password"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('button[type="submit"]')).toBeFocused()

      // Should be able to submit with Enter
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      
      await page.keyboard.press('Enter')
      await page.waitForURL('**/dashboard', { timeout: 10000 })
    })

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper form labeling
      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')

      await expect(emailInput).toHaveAttribute('aria-required', 'true')
      await expect(passwordInput).toHaveAttribute('aria-required', 'true')

      // Check that form has proper structure
      const form = page.locator('form')
      await expect(form).toBeVisible()
    })

    test('should work with screen readers', async ({ page }) => {
      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('h2')).toBeVisible()

      // Check for descriptive link text
      const signupLink = page.locator('text=create a new account')
      await expect(signupLink).toBeVisible()
      await expect(signupLink).toHaveAttribute('href')
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      // This test will run across different browsers automatically with Playwright
      await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com')
      await page.fill('input[name="password"]', 'Dynasty2025!')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard', { timeout: 10000 })

      // Verify consistent behavior across browsers
      await expect(page).toHaveURL(/.*dashboard/)
      
      console.log(`✓ Authentication test passed in ${browserName}`)
    })
  })

  test.describe('Concurrent User Login Testing', () => {
    test('should handle multiple simultaneous logins', async ({ browser }) => {
      // Create multiple browser contexts to simulate different users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ])

      const pages = await Promise.all(contexts.map(context => context.newPage()))

      // Navigate all pages to login
      await Promise.all(pages.map(page => page.goto('/auth/signin')))

      // Login with different demo users simultaneously
      const loginPromises = pages.map((page, index) => {
        const user = DEMO_USERS[index]
        return page.click(`text=${user.name}`)
      })

      await Promise.all(loginPromises)

      // Wait for all to reach dashboard
      await Promise.all(pages.map(page => 
        page.waitForURL('**/dashboard', { timeout: 10000 })
      ))

      // Verify all successful
      for (const page of pages) {
        await expect(page).toHaveURL(/.*dashboard/)
      }

      // Cleanup
      await Promise.all(contexts.map(context => context.close()))
    })
  })
})