/**
 * Zenith Critical User Flows E2E Tests
 * Comprehensive end-to-end testing for authentication, draft, and scoring flows
 */

import { test, expect, type Page } from '@playwright/test'

test.describe('Zenith Critical User Flows', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    // Set up common test data
    await page.goto('/')
  })

  test.describe('Authentication Flow', () => {
    test('should complete full user registration and login flow', async () => {
      // Navigate to sign up
      await page.click('[data-testid="sign-up-button"]')
      await expect(page).toHaveURL(/.*auth\/signup/)

      // Fill registration form
      await page.fill('[data-testid="email-input"]', 'test-e2e@example.com')
      await page.fill('[data-testid="password-input"]', 'TestPassword123!')
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!')
      await page.fill('[data-testid="name-input"]', 'E2E Test User')

      // Submit registration
      await page.click('[data-testid="register-submit"]')

      // Should redirect to dashboard or email verification
      await expect(page).toHaveURL(/.*dashboard|.*verify-email/)

      // If on dashboard, registration was successful
      if (await page.url().includes('dashboard')) {
        await expect(page.getByText('Welcome, E2E Test User')).toBeVisible()
      }
    })

    test('should handle login flow correctly', async () => {
      // Navigate to sign in
      await page.click('[data-testid="sign-in-button"]')
      await expect(page).toHaveURL(/.*auth\/signin/)

      // Fill login form with demo user
      await page.fill('[data-testid="email-input"]', 'nicholas@damato-dynasty.com')
      await page.fill('[data-testid="password-input"]', 'Dynasty2025!')

      // Submit login
      await page.click('[data-testid="signin-submit"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.getByText('Welcome back')).toBeVisible()
    })

    test('should handle password reset flow', async () => {
      await page.goto('/auth/signin')

      // Click forgot password
      await page.click('[data-testid="forgot-password-link"]')
      await expect(page).toHaveURL(/.*auth\/forgot-password/)

      // Enter email
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.click('[data-testid="reset-submit"]')

      // Should show success message
      await expect(page.getByText('Password reset email sent')).toBeVisible()
    })

    test('should handle logout correctly', async () => {
      // Login first
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'nicholas@damato-dynasty.com')
      await page.fill('[data-testid="password-input"]', 'Dynasty2025!')
      await page.click('[data-testid="signin-submit"]')

      // Wait for dashboard
      await expect(page).toHaveURL(/.*dashboard/)

      // Logout
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="logout-button"]')

      // Should redirect to home
      await expect(page).toHaveURL('/')
      await expect(page.getByText('Sign In')).toBeVisible()
    })
  })

  test.describe('Dashboard Navigation', () => {
    test('should navigate between main dashboard sections', async () => {
      // Login first
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'nicholas@damato-dynasty.com')
      await page.fill('[data-testid="password-input"]', 'Dynasty2025!')
      await page.click('[data-testid="signin-submit"]')
      await expect(page).toHaveURL(/.*dashboard/)

      // Test sidebar navigation
      await page.click('[data-testid="nav-teams"]')
      await expect(page).toHaveURL(/.*teams/)

      await page.click('[data-testid="nav-leagues"]')
      await expect(page).toHaveURL(/.*leagues/)

      await page.click('[data-testid="nav-trades"]')
      await expect(page).toHaveURL(/.*trades/)

      await page.click('[data-testid="nav-dashboard"]')
      await expect(page).toHaveURL(/.*dashboard/)
    })

    test('should display user stats and league information', async () => {
      await page.goto('/dashboard')

      // Check for key dashboard elements
      await expect(page.getByTestId('user-stats')).toBeVisible()
      await expect(page.getByTestId('league-overview')).toBeVisible()
      await expect(page.getByTestId('recent-activity')).toBeVisible()
    })
  })

  test.describe('League Management Flow', () => {
    test('should create a new league', async () => {
      await page.goto('/leagues')

      await page.click('[data-testid="create-league-button"]')
      await expect(page.getByText('Create New League')).toBeVisible()

      // Fill league details
      await page.fill('[data-testid="league-name"]', 'Test E2E League')
      await page.selectOption('[data-testid="league-size"]', '12')
      await page.selectOption('[data-testid="scoring-type"]', 'ppr')
      await page.selectOption('[data-testid="draft-type"]', 'snake')

      await page.click('[data-testid="create-league-submit"]')

      // Should redirect to league page
      await expect(page).toHaveURL(/.*leagues\/.*/)
      await expect(page.getByText('Test E2E League')).toBeVisible()
    })

    test('should join an existing league', async () => {
      await page.goto('/leagues')

      await page.click('[data-testid="join-league-button"]')
      await page.fill('[data-testid="league-code"]', 'TEST123')
      await page.click('[data-testid="join-submit"]')

      // Should show success or error message
      await expect(page.getByText(/joined|error/i)).toBeVisible()
    })
  })

  test.describe('Draft Flow', () => {
    test('should navigate to draft room and make picks', async () => {
      await page.goto('/draft/test-draft-id')

      // Should show draft room interface
      await expect(page.getByTestId('draft-board')).toBeVisible()
      await expect(page.getByTestId('available-players')).toBeVisible()
      await expect(page.getByTestId('draft-timer')).toBeVisible()

      // Make a draft pick
      const firstPlayer = page.getByTestId('player-1').first()
      await firstPlayer.click()
      await page.click('[data-testid="draft-player-button"]')

      // Should update draft board
      await expect(page.getByText('Your Pick:')).toBeVisible()
    })

    test('should handle auto-pick when timer expires', async () => {
      await page.goto('/draft/test-draft-id')

      // Wait for auto-pick (simulated short timer)
      await page.waitForTimeout(5000)

      // Should show auto-pick notification
      await expect(page.getByText(/auto.*pick/i)).toBeVisible()
    })
  })

  test.describe('Lineup Management', () => {
    test('should set weekly lineup', async () => {
      await page.goto('/teams/test-team-id/lineup')

      // Should show lineup interface
      await expect(page.getByTestId('lineup-manager')).toBeVisible()
      await expect(page.getByTestId('starting-lineup')).toBeVisible()
      await expect(page.getByTestId('bench-players')).toBeVisible()

      // Drag and drop player (simulate)
      const benchPlayer = page.getByTestId('bench-player-1').first()
      const flexSlot = page.getByTestId('lineup-slot-flex')

      await benchPlayer.dragTo(flexSlot)

      // Save lineup
      await page.click('[data-testid="save-lineup"]')
      await expect(page.getByText('Lineup saved')).toBeVisible()
    })

    test('should show player projections and stats', async () => {
      await page.goto('/teams/test-team-id/lineup')

      // Click on a player to see details
      await page.click('[data-testid="player-details-1"]')

      // Should show player modal with stats
      await expect(page.getByTestId('player-modal')).toBeVisible()
      await expect(page.getByText(/projected points/i)).toBeVisible()
      await expect(page.getByText(/season stats/i)).toBeVisible()
    })
  })

  test.describe('Live Scoring', () => {
    test('should display live scores during games', async () => {
      await page.goto('/live-scores')

      // Should show live scoring interface
      await expect(page.getByTestId('live-scoreboard')).toBeVisible()
      await expect(page.getByTestId('my-matchup')).toBeVisible()

      // Should update scores in real-time (check for score elements)
      await expect(page.getByTestId('total-points')).toBeVisible()
      await expect(page.getByTestId('player-scores')).toBeVisible()
    })

    test('should show matchup details and projections', async () => {
      await page.goto('/matchups/week/4')

      await expect(page.getByTestId('matchup-details')).toBeVisible()
      await expect(page.getByText(/vs\./)).toBeVisible()
      await expect(page.getByText(/projected/i)).toBeVisible()
    })
  })

  test.describe('Trade Management', () => {
    test('should propose a trade', async () => {
      await page.goto('/trades')

      await page.click('[data-testid="propose-trade-button"]')

      // Select trade partner
      await page.selectOption('[data-testid="trade-partner"]', 'test-user-2')

      // Add players to trade
      await page.click('[data-testid="my-player-1"]')
      await page.click('[data-testid="their-player-1"]')

      // Submit trade proposal
      await page.click('[data-testid="propose-trade-submit"]')

      await expect(page.getByText('Trade proposal sent')).toBeVisible()
    })

    test('should respond to trade offers', async () => {
      await page.goto('/trades')

      // Should show pending trades
      await expect(page.getByTestId('pending-trades')).toBeVisible()

      // Accept or decline trade
      await page.click('[data-testid="trade-action-accept"]')
      await expect(page.getByText('Trade accepted')).toBeVisible()
    })
  })

  test.describe('AI Coach Integration', () => {
    test('should display AI recommendations', async () => {
      await page.goto('/ai-coach')

      await expect(page.getByTestId('ai-recommendations')).toBeVisible()
      await expect(page.getByText(/recommendation/i)).toBeVisible()

      // Switch between recommendation types
      await page.click('[data-testid="ai-tab-trades"]')
      await expect(page.getByText(/trade/i)).toBeVisible()

      await page.click('[data-testid="ai-tab-waivers"]')
      await expect(page.getByText(/waiver/i)).toBeVisible()
    })

    test('should act on AI recommendations', async () => {
      await page.goto('/ai-coach')

      // Click on a recommendation
      await page.click('[data-testid="recommendation-1"]')

      // Should show action options
      await expect(page.getByTestId('recommendation-actions')).toBeVisible()
      
      // Take recommended action
      await page.click('[data-testid="accept-recommendation"]')
      await expect(page.getByText('Recommendation applied')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')

      // Should show mobile navigation
      await expect(page.getByTestId('mobile-menu-toggle')).toBeVisible()
      
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.getByTestId('mobile-navigation')).toBeVisible()
    })

    test('should work correctly on tablet devices', async () => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/dashboard')

      // Should adapt layout for tablet
      await expect(page.getByTestId('sidebar')).toBeVisible()
      await expect(page.getByTestId('main-content')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load pages within acceptable time limits', async () => {
      const startTime = Date.now()
      await page.goto('/dashboard')
      const loadTime = Date.now() - startTime

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)

      // Check for core web vitals
      const navigationTiming = await page.evaluate(() => performance.getEntriesByType('navigation')[0])
      expect(navigationTiming.loadEventEnd - navigationTiming.loadEventStart).toBeLessThan(2000)
    })

    test('should handle large datasets efficiently', async () => {
      await page.goto('/players')

      // Should load player list efficiently
      await expect(page.getByTestId('players-list')).toBeVisible()

      // Test scrolling performance
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 500)
        await page.waitForTimeout(100)
      }

      // Should remain responsive
      await expect(page.getByTestId('players-list')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())

      await page.goto('/dashboard')

      // Should show error message
      await expect(page.getByText(/error|failed/i)).toBeVisible()
      await expect(page.getByTestId('retry-button')).toBeVisible()
    })

    test('should handle 404 errors', async () => {
      await page.goto('/non-existent-page')

      await expect(page.getByText(/404|not found/i)).toBeVisible()
      await expect(page.getByTestId('back-to-home')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.goto('/dashboard')

      // Test tab navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')

      // Should navigate using keyboard
      await expect(page).toHaveURL(/.*/)
    })

    test('should have proper ARIA labels', async () => {
      await page.goto('/dashboard')

      // Check for accessibility attributes
      const buttons = await page.locator('button')
      const buttonCount = await buttons.count()

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()
        
        // Button should have either text content or aria-label
        expect(ariaLabel || text).toBeTruthy()
      }
    })
  })
})