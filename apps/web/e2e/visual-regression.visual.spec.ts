/**
 * Zenith Visual Regression Tests
 * Comprehensive visual testing for UI consistency
 */

import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport and settings
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    })
  })

  test.describe('Dashboard Views', () => {
    test('should match dashboard layout', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

      // Wait for all content to load
      await page.waitForLoadState('networkidle')
      
      // Hide dynamic content that changes frequently
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"],
          [data-testid="last-updated"],
          [data-testid="real-time-counter"] {
            visibility: hidden !important;
          }
        `
      })

      await expect(page).toHaveScreenshot('dashboard-full-page.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('should match dashboard components', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Test individual components
      const components = [
        'user-menu',
        'navigation-sidebar',
        'main-content',
        'league-overview',
        'team-summary',
        'recent-activity',
      ]

      for (const component of components) {
        const element = page.locator(`[data-testid="${component}"]`)
        if (await element.isVisible()) {
          await expect(element).toHaveScreenshot(`dashboard-${component}.png`)
        }
      }
    })

    test('should match responsive dashboard', async ({ page }) => {
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop-xl' },
        { width: 1366, height: 768, name: 'desktop-lg' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 414, height: 896, name: 'mobile-large' },
        { width: 375, height: 667, name: 'mobile-medium' },
        { width: 320, height: 568, name: 'mobile-small' },
      ]

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')

        await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        })
      }
    })
  })

  test.describe('Team Management Views', () => {
    test('should match lineup manager layout', async ({ page }) => {
      await page.goto('/team')
      await page.click('[data-testid="lineup-tab"]')
      await expect(page.locator('[data-testid="lineup-manager"]')).toBeVisible()

      // Hide dynamic elements
      await page.addStyleTag({
        content: `
          [data-testid="projected-points"],
          [data-testid="live-score"] {
            visibility: hidden !important;
          }
        `
      })

      await expect(page.locator('[data-testid="lineup-manager"]')).toHaveScreenshot('lineup-manager.png')
    })

    test('should match roster positions', async ({ page }) => {
      await page.goto('/team')
      await page.click('[data-testid="lineup-tab"]')

      // Test each position slot
      const positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DEF']
      
      for (const position of positions) {
        const positionSlot = page.locator(`[data-testid="lineup-slot-${position}"]`)
        if (await positionSlot.isVisible()) {
          await expect(positionSlot).toHaveScreenshot(`position-slot-${position.toLowerCase()}.png`)
        }
      }

      // Test bench section
      const bench = page.locator('[data-testid="bench-section"]')
      if (await bench.isVisible()) {
        await expect(bench).toHaveScreenshot('bench-section.png')
      }
    })

    test('should match player cards', async ({ page }) => {
      await page.goto('/players')
      await page.waitForSelector('[data-testid="player-card"]:first-child')

      // Test different player card states
      const firstPlayerCard = page.locator('[data-testid="player-card"]:first-child')
      await expect(firstPlayerCard).toHaveScreenshot('player-card-default.png')

      // Hover state
      await firstPlayerCard.hover()
      await expect(firstPlayerCard).toHaveScreenshot('player-card-hover.png')

      // Selected state (if applicable)
      await firstPlayerCard.click()
      if (await firstPlayerCard.locator('.selected').isVisible()) {
        await expect(firstPlayerCard).toHaveScreenshot('player-card-selected.png')
      }
    })
  })

  test.describe('Draft Room Views', () => {
    test('should match draft room layout', async ({ page }) => {
      await page.goto('/draft')
      await page.click('[data-testid="join-draft-button"]')
      await expect(page.locator('[data-testid="draft-room"]')).toBeVisible()

      // Hide dynamic elements
      await page.addStyleTag({
        content: `
          [data-testid="time-remaining"],
          [data-testid="pick-timer"],
          [data-testid="real-time-indicator"] {
            visibility: hidden !important;
          }
        `
      })

      await expect(page.locator('[data-testid="draft-room"]')).toHaveScreenshot('draft-room-full.png')
    })

    test('should match draft board', async ({ page }) => {
      await page.goto('/draft')
      await page.click('[data-testid="join-draft-button"]')
      await expect(page.locator('[data-testid="draft-board"]')).toBeVisible()

      const draftBoard = page.locator('[data-testid="draft-board"]')
      await expect(draftBoard).toHaveScreenshot('draft-board.png')

      // Test different rounds
      const rounds = await page.locator('[data-testid="draft-round"]').count()
      if (rounds > 1) {
        for (let i = 0; i < Math.min(rounds, 3); i++) {
          const round = page.locator(`[data-testid="draft-round"]:nth-child(${i + 1})`)
          await expect(round).toHaveScreenshot(`draft-round-${i + 1}.png`)
        }
      }
    })

    test('should match available players section', async ({ page }) => {
      await page.goto('/draft')
      await page.click('[data-testid="join-draft-button"]')
      await expect(page.locator('[data-testid="available-players"]')).toBeVisible()

      const availablePlayers = page.locator('[data-testid="available-players"]')
      await expect(availablePlayers).toHaveScreenshot('available-players.png')

      // Test filtered views
      const positionFilters = ['QB', 'RB', 'WR', 'TE']
      for (const position of positionFilters) {
        await page.click(`[data-testid="position-filter-${position.toLowerCase()}"]`)
        await page.waitForSelector('[data-testid="player-list"]')
        await expect(availablePlayers).toHaveScreenshot(`available-players-${position.toLowerCase()}.png`)
      }
    })
  })

  test.describe('Live Scoring Views', () => {
    test('should match live scoring dashboard', async ({ page }) => {
      await page.goto('/live')
      await expect(page.locator('[data-testid="live-scoring-dashboard"]')).toBeVisible()

      // Hide real-time elements
      await page.addStyleTag({
        content: `
          [data-testid="live-score"],
          [data-testid="score-ticker"],
          [data-testid="last-updated"],
          [data-testid="live-indicator"] {
            visibility: hidden !important;
          }
        `
      })

      await expect(page.locator('[data-testid="live-scoring-dashboard"]')).toHaveScreenshot('live-scoring-dashboard.png')
    })

    test('should match matchup cards', async ({ page }) => {
      await page.goto('/live')
      await page.waitForSelector('[data-testid="matchup-card"]:first-child')

      // Test individual matchup card
      const matchupCard = page.locator('[data-testid="matchup-card"]:first-child')
      await expect(matchupCard).toHaveScreenshot('matchup-card.png')

      // Test user's matchup (highlighted)
      const userMatchup = page.locator('[data-testid="user-matchup"]')
      if (await userMatchup.isVisible()) {
        await expect(userMatchup).toHaveScreenshot('user-matchup-card.png')
      }
    })

    test('should match standings table', async ({ page }) => {
      await page.goto('/live')
      await page.click('[data-testid="standings-tab"]')
      await expect(page.locator('[data-testid="standings-table"]')).toBeVisible()

      const standingsTable = page.locator('[data-testid="standings-table"]')
      await expect(standingsTable).toHaveScreenshot('standings-table.png')
    })
  })

  test.describe('Form Components', () => {
    test('should match authentication forms', async ({ page, context }) => {
      // Create new context without authentication
      const newContext = await context.browser()?.newContext()
      const newPage = await newContext?.newPage() || page

      // Login form
      await newPage.goto('/auth/signin')
      await expect(newPage.locator('[data-testid="signin-form"]')).toBeVisible()
      await expect(newPage.locator('[data-testid="signin-form"]')).toHaveScreenshot('signin-form.png')

      // Registration form
      await newPage.goto('/auth/signup')
      await expect(newPage.locator('[data-testid="signup-form"]')).toBeVisible()
      await expect(newPage.locator('[data-testid="signup-form"]')).toHaveScreenshot('signup-form.png')

      await newContext?.close()
    })

    test('should match form validation states', async ({ page, context }) => {
      const newContext = await context.browser()?.newContext()
      const newPage = await newContext?.newPage() || page

      await newPage.goto('/auth/signin')

      // Empty form state
      await expect(newPage.locator('[data-testid="signin-form"]')).toHaveScreenshot('signin-form-empty.png')

      // Validation error state
      await newPage.click('[data-testid="signin-button"]')
      await expect(newPage.locator('[data-testid="email-error"]')).toBeVisible()
      await expect(newPage.locator('[data-testid="signin-form"]')).toHaveScreenshot('signin-form-validation-errors.png')

      // Filled form state
      await newPage.fill('[data-testid="email-input"]', 'test@example.com')
      await newPage.fill('[data-testid="password-input"]', 'password123')
      await expect(newPage.locator('[data-testid="signin-form"]')).toHaveScreenshot('signin-form-filled.png')

      await newContext?.close()
    })
  })

  test.describe('Modal and Overlay Components', () => {
    test('should match modal dialogs', async ({ page }) => {
      await page.goto('/team')
      
      // Test trade modal
      await page.click('[data-testid="propose-trade-button"]')
      if (await page.locator('[data-testid="trade-modal"]').isVisible()) {
        await expect(page.locator('[data-testid="trade-modal"]')).toHaveScreenshot('trade-modal.png')
      }

      // Test confirmation modal
      await page.click('[data-testid="delete-team-button"]')
      if (await page.locator('[data-testid="confirmation-modal"]').isVisible()) {
        await expect(page.locator('[data-testid="confirmation-modal"]')).toHaveScreenshot('confirmation-modal.png')
      }
    })

    test('should match chat overlay', async ({ page }) => {
      await page.click('[data-testid="chat-toggle"]')
      await expect(page.locator('[data-testid="league-chat"]')).toBeVisible()

      // Hide dynamic content
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"],
          [data-testid="online-indicator"] {
            visibility: hidden !important;
          }
        `
      })

      await expect(page.locator('[data-testid="league-chat"]')).toHaveScreenshot('chat-overlay.png')
    })
  })

  test.describe('Dark Mode and Theming', () => {
    test('should match dark mode appearance', async ({ page }) => {
      // Switch to dark mode
      await page.goto('/settings')
      await page.click('[data-testid="theme-toggle"]')
      await page.selectOption('[data-testid="theme-select"]', 'dark')

      // Test key pages in dark mode
      const pages = [
        { path: '/dashboard', name: 'dashboard-dark' },
        { path: '/team', name: 'team-dark' },
        { path: '/players', name: 'players-dark' },
        { path: '/live', name: 'live-dark' },
      ]

      for (const pageInfo of pages) {
        await page.goto(pageInfo.path)
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveScreenshot(`${pageInfo.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        })
      }
    })

    test('should match high contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.goto('/settings')
      await page.click('[data-testid="accessibility-settings"]')
      await page.check('[data-testid="high-contrast-toggle"]')

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test.describe('Error States', () => {
    test('should match error pages', async ({ page }) => {
      // 404 page
      await page.goto('/non-existent-page')
      await expect(page.locator('[data-testid="error-404"]')).toBeVisible()
      await expect(page).toHaveScreenshot('error-404.png')

      // Network error state
      await page.route('**/api/**', route => route.abort())
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="network-error"]')).toHaveScreenshot('network-error.png')
    })

    test('should match loading states', async ({ page }) => {
      // Intercept API calls to show loading states
      await page.route('**/api/teams/**', route => {
        setTimeout(() => route.continue(), 2000) // Delay response
      })

      await page.goto('/team')
      
      // Capture loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
      await expect(page.locator('[data-testid="loading-spinner"]')).toHaveScreenshot('loading-spinner.png')
    })
  })

  test.describe('Print Styles', () => {
    test('should match print layout', async ({ page }) => {
      await page.goto('/team')
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' })
      
      await expect(page).toHaveScreenshot('team-print-layout.png', {
        fullPage: true,
      })

      // Test standings print layout
      await page.goto('/live')
      await page.click('[data-testid="standings-tab"]')
      await page.emulateMedia({ media: 'print' })
      
      await expect(page).toHaveScreenshot('standings-print-layout.png', {
        fullPage: true,
      })
    })
  })

  test.describe('Cross-browser Consistency', () => {
    test('should look consistent across browsers', async ({ page, browserName }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Hide dynamic content
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"],
          [data-testid="last-updated"] {
            visibility: hidden !important;
          }
        `
      })

      await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })
})