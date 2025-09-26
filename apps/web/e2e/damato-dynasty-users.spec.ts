/**
 * Zenith E2E Tests for D'Amato Dynasty League Users
 * Comprehensive testing for all 10 production users
 */
import { test, expect, Page } from '@playwright/test'
import { ZenithE2EFramework } from './utils/zenith-framework'

// D'Amato Dynasty League Users (Production)
const DAMATO_USERS = [
  { email: 'alex@damato.com', name: 'Alex D\'Amato', team: 'Thunder Bolts' },
  { email: 'maria@damato.com', name: 'Maria D\'Amato', team: 'Lightning Strike' },
  { email: 'tony@damato.com', name: 'Tony D\'Amato', team: 'Storm Chasers' },
  { email: 'sofia@damato.com', name: 'Sofia D\'Amato', team: 'Wind Warriors' },
  { email: 'marco@damato.com', name: 'Marco D\'Amato', team: 'Tornado Titans' },
  { email: 'lucia@damato.com', name: 'Lucia D\'Amato', team: 'Hurricane Heroes' },
  { email: 'giovanni@damato.com', name: 'Giovanni D\'Amato', team: 'Cyclone Squad' },
  { email: 'elena@damato.com', name: 'Elena D\'Amato', team: 'Tempest Force' },
  { email: 'francesco@damato.com', name: 'Francesco D\'Amato', team: 'Blizzard Brigade' },
  { email: 'giulia@damato.com', name: 'Giulia D\'Amato', team: 'Frost Giants' }
]

const DEFAULT_PASSWORD = 'Dynasty2024!'

test.describe('D\'Amato Dynasty League - User Journey Tests', () => {
  let framework: ZenithE2EFramework

  test.beforeEach(async ({ page }) => {
    framework = new ZenithE2EFramework(page)
    
    // Navigate to app
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  // Test each user individually
  DAMATO_USERS.forEach((user, index) => {
    test(`User ${index + 1}: ${user.name} complete journey`, async ({ page }) => {
      // 1. Login Process
      await test.step('Login to application', async () => {
        await framework.login(user.email, DEFAULT_PASSWORD)
        
        // Verify successful login
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 })
        
        // Verify user name is displayed
        await expect(page.locator('body')).toContainText(user.name.split(' ')[0])
      })

      // 2. Dashboard Access
      await test.step('Access dashboard', async () => {
        // Should be on dashboard after login
        await expect(page).toHaveURL(/\/dashboard/)
        
        // Verify dashboard elements load
        await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
        
        // Check for no error messages
        await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
        
        // Verify team name appears
        await expect(page.locator('body')).toContainText(user.team)
      })

      // 3. Team Management
      await test.step('Access team management', async () => {
        // Navigate to team page
        await page.click('[data-testid="team-nav"]')
        
        // Verify team page loads
        await expect(page).toHaveURL(/\/team/)
        await expect(page.locator('[data-testid="team-header"]')).toBeVisible()
        
        // Check roster loads
        await expect(page.locator('[data-testid="roster-container"]')).toBeVisible()
      })

      // 4. League Features
      await test.step('Test league features', async () => {
        // Check standings
        await page.click('[data-testid="standings-nav"]')
        await expect(page.locator('[data-testid="standings-table"]')).toBeVisible()
        
        // Verify user's team appears in standings
        await expect(page.locator('[data-testid="standings-table"]')).toContainText(user.team)
      })

      // 5. Performance Validation
      await test.step('Validate page performance', async () => {
        // Measure page load time
        const startTime = Date.now()
        await page.reload()
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        
        // Should load in under 3 seconds
        expect(loadTime).toBeLessThan(3000)
        
        // Check for console errors
        const consoleErrors: string[] = []
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text())
          }
        })
        
        await page.waitForTimeout(1000)
        expect(consoleErrors.length).toBe(0)
      })

      // 6. Logout
      await test.step('Logout successfully', async () => {
        await page.click('[data-testid="user-menu"]')
        await page.click('[data-testid="logout-button"]')
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/auth\/signin/)
        await expect(page.locator('[data-testid="signin-form"]')).toBeVisible()
      })
    })
  })

  test('All users can access league simultaneously', async ({ browser }) => {
    // Test concurrent access by multiple users
    const contexts = await Promise.all(
      DAMATO_USERS.slice(0, 5).map(() => browser.newContext())
    )
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    )

    try {
      // Login all users simultaneously
      await Promise.all(
        pages.map(async (page, index) => {
          const user = DAMATO_USERS[index]
          await page.goto('/')
          
          const pageFramework = new ZenithE2EFramework(page)
          await pageFramework.login(user.email, DEFAULT_PASSWORD)
          
          // Verify successful login
          await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
        })
      )

      // Verify all users are on dashboard
      await Promise.all(
        pages.map(async (page) => {
          await expect(page).toHaveURL(/\/dashboard/)
          await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
        })
      )
    } finally {
      // Cleanup
      await Promise.all(contexts.map(context => context.close()))
    }
  })

  test('League data consistency across users', async ({ browser }) => {
    // Verify that league standings are consistent across different user sessions
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      // Login two different users
      await page1.goto('/')
      await page2.goto('/')
      
      const framework1 = new ZenithE2EFramework(page1)
      const framework2 = new ZenithE2EFramework(page2)
      
      await framework1.login(DAMATO_USERS[0].email, DEFAULT_PASSWORD)
      await framework2.login(DAMATO_USERS[1].email, DEFAULT_PASSWORD)

      // Navigate to standings for both users
      await page1.click('[data-testid="standings-nav"]')
      await page2.click('[data-testid="standings-nav"]')
      
      // Get standings data from both pages
      const standings1 = await page1.locator('[data-testid="standings-table"]').textContent()
      const standings2 = await page2.locator('[data-testid="standings-table"]').textContent()
      
      // Standings should be identical
      expect(standings1).toBe(standings2)
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})

test.describe('D\'Amato Dynasty - Error Handling', () => {
  test('Handle invalid login gracefully', async ({ page }) => {
    await page.goto('/')
    
    const framework = new ZenithE2EFramework(page)
    
    // Try to login with invalid credentials
    await framework.login('invalid@damato.com', 'wrongpassword')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid|error/i)
    
    // Should not redirect to dashboard
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('Handle network errors gracefully', async ({ page }) => {
    await page.goto('/')
    
    // Simulate network failure
    await page.route('**/api/**', route => {
      route.abort('failed')
    })
    
    const framework = new ZenithE2EFramework(page)
    
    try {
      await framework.login(DAMATO_USERS[0].email, DEFAULT_PASSWORD)
    } catch (error) {
      // Should handle gracefully
    }
    
    // Should show appropriate error state
    const hasErrorState = await page.locator('[data-testid="error-message"], [data-testid="network-error"]').isVisible()
    expect(hasErrorState).toBe(true)
  })
})

test.describe('D\'Amato Dynasty - Accessibility', () => {
  DAMATO_USERS.slice(0, 3).forEach((user) => {
    test(`Accessibility compliance for ${user.name}`, async ({ page }) => {
      await page.goto('/')
      
      const framework = new ZenithE2EFramework(page)
      await framework.login(user.email, DEFAULT_PASSWORD)
      
      // Wait for dashboard to load
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
      
      // Run accessibility scan
      const accessibilityScanResults = await framework.runAccessibilityTest()
      expect(accessibilityScanResults.violations).toEqual([])
    })
  })
})

test.describe('D\'Amato Dynasty - Mobile Experience', () => {
  test('Mobile responsive dashboard', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    const framework = new ZenithE2EFramework(page)
    await framework.login(DAMATO_USERS[0].email, DEFAULT_PASSWORD)
    
    // Verify mobile navigation works
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()
    
    // Test mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    
    // Verify responsive layout
    const dashboardContainer = page.locator('[data-testid="dashboard-container"]')
    const boundingBox = await dashboardContainer.boundingBox()
    expect(boundingBox?.width).toBeLessThanOrEqual(375)
  })
})
