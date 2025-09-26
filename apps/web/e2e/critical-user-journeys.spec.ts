/**
 * Zenith Critical User Journeys E2E Tests
 * Comprehensive testing for core user workflows
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from the dashboard
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test.describe('User Registration and Onboarding Flow', () => {
    test('should complete user registration flow', async ({ page, context }) => {
      // Use a new context without authentication
      const newContext = await context.browser()?.newContext()
      const newPage = await newContext?.newPage() || page

      await newPage.goto('/auth/signup')

      // Fill registration form
      await newPage.fill('[data-testid="email-input"]', `newuser-${Date.now()}@example.com`)
      await newPage.fill('[data-testid="password-input"]', 'securePassword123!')
      await newPage.fill('[data-testid="confirm-password-input"]', 'securePassword123!')
      await newPage.fill('[data-testid="name-input"]', 'New Test User')

      // Submit registration
      await newPage.click('[data-testid="signup-button"]')

      // Should redirect to onboarding
      await expect(newPage).toHaveURL('/onboarding')
      await expect(newPage.locator('[data-testid="welcome-message"]')).toBeVisible()

      // Complete onboarding steps
      await newPage.click('[data-testid="favorite-team-select"]')
      await newPage.click('[data-testid="team-option-buffalo-bills"]')

      await newPage.fill('[data-testid="team-name-input"]', 'My Awesome Team')

      await newPage.click('[data-testid="complete-onboarding-button"]')

      // Should redirect to dashboard
      await expect(newPage).toHaveURL('/dashboard')
      await expect(newPage.locator('[data-testid="onboarding-complete-banner"]')).toBeVisible()

      await newContext?.close()
    })

    test('should validate registration form inputs', async ({ page, context }) => {
      const newContext = await context.browser()?.newContext()
      const newPage = await newContext?.newPage() || page

      await newPage.goto('/auth/signup')

      // Test invalid email
      await newPage.fill('[data-testid="email-input"]', 'invalid-email')
      await newPage.fill('[data-testid="password-input"]', 'password123')
      await newPage.click('[data-testid="signup-button"]')

      await expect(newPage.locator('[data-testid="email-error"]')).toHaveText('Please enter a valid email address')

      // Test weak password
      await newPage.fill('[data-testid="email-input"]', 'test@example.com')
      await newPage.fill('[data-testid="password-input"]', '123')
      await newPage.click('[data-testid="signup-button"]')

      await expect(newPage.locator('[data-testid="password-error"]')).toHaveText('Password must be at least 8 characters long')

      // Test password mismatch
      await newPage.fill('[data-testid="password-input"]', 'password123')
      await newPage.fill('[data-testid="confirm-password-input"]', 'differentpassword')
      await newPage.click('[data-testid="signup-button"]')

      await expect(newPage.locator('[data-testid="confirm-password-error"]')).toHaveText('Passwords do not match')

      await newContext?.close()
    })
  })

  test.describe('Draft Room Experience', () => {
    test('should join draft room and participate in draft', async ({ page }) => {
      // Navigate to draft room
      await page.click('[data-testid="nav-draft"]')
      await expect(page).toHaveURL('/draft')

      // Should show draft lobby
      await expect(page.locator('[data-testid="draft-lobby"]')).toBeVisible()
      await expect(page.locator('[data-testid="league-name"]')).toHaveText('Championship League')

      // Join draft room
      await page.click('[data-testid="join-draft-button"]')

      // Wait for draft room to load
      await expect(page.locator('[data-testid="draft-room"]')).toBeVisible()
      await expect(page.locator('[data-testid="draft-board"]')).toBeVisible()
      await expect(page.locator('[data-testid="available-players"]')).toBeVisible()

      // Verify draft status
      await expect(page.locator('[data-testid="draft-status"]')).toHaveText('IN PROGRESS')
      await expect(page.locator('[data-testid="current-pick"]')).toBeVisible()

      // Check if it's user's turn
      const isUserTurn = await page.locator('[data-testid="your-turn-indicator"]').isVisible()

      if (isUserTurn) {
        // Select a player to draft
        await page.click('[data-testid="player-card"]:first-child')
        await page.click('[data-testid="draft-player-button"]')

        // Verify pick was made
        await expect(page.locator('[data-testid="pick-confirmation"]')).toBeVisible()
        await expect(page.locator('[data-testid="draft-board"] .pick-slot:last-child')).not.toBeEmpty()
      }

      // Verify real-time updates
      await expect(page.locator('[data-testid="time-remaining"]')).toBeVisible()
      await expect(page.locator('[data-testid="pick-counter"]')).toBeVisible()

      // Test player search functionality
      await page.fill('[data-testid="player-search"]', 'Josh Allen')
      await expect(page.locator('[data-testid="player-card"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="player-name"]')).toHaveText('Josh Allen')

      // Test position filtering
      await page.click('[data-testid="position-filter-rb"]')
      await expect(page.locator('[data-testid="player-card"] [data-testid="player-position"]')).toHaveText('RB')

      // Clear filters
      await page.click('[data-testid="clear-filters"]')
      await expect(page.locator('[data-testid="player-card"]')).toHaveCount.toBeGreaterThan(5)
    })

    test('should handle draft room errors gracefully', async ({ page }) => {
      // Test connection loss simulation
      await page.goto('/draft')
      await page.click('[data-testid="join-draft-button"]')

      // Simulate network interruption
      await page.route('**/api/draft/events', route => route.abort())

      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="reconnecting-indicator"]')).toBeVisible()

      // Test recovery
      await page.unroute('**/api/draft/events')
      await page.click('[data-testid="reconnect-button"]')

      await expect(page.locator('[data-testid="draft-room"]')).toBeVisible()
      await expect(page.locator('[data-testid="connection-error"]')).not.toBeVisible()
    })
  })

  test.describe('Team Management Workflow', () => {
    test('should manage team lineup and make roster changes', async ({ page }) => {
      // Navigate to team page
      await page.click('[data-testid="nav-team"]')
      await expect(page).toHaveURL('/team')

      // Verify team overview
      await expect(page.locator('[data-testid="team-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="team-record"]')).toBeVisible()
      await expect(page.locator('[data-testid="team-points"]')).toBeVisible()

      // Switch to lineup tab
      await page.click('[data-testid="lineup-tab"]')
      await expect(page.locator('[data-testid="lineup-manager"]')).toBeVisible()

      // Verify starting lineup slots
      const requiredPositions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DEF']
      for (const position of requiredPositions) {
        await expect(page.locator(`[data-testid="lineup-slot-${position}"]`)).toBeVisible()
      }

      // Test drag and drop lineup changes
      const benchPlayer = page.locator('[data-testid="bench-player"]:first-child')
      const flexSlot = page.locator('[data-testid="lineup-slot-FLEX"]')

      // Drag bench player to flex position
      await benchPlayer.dragTo(flexSlot)

      // Verify lineup change
      await expect(page.locator('[data-testid="lineup-changed-indicator"]')).toBeVisible()

      // Save lineup
      await page.click('[data-testid="save-lineup-button"]')
      await expect(page.locator('[data-testid="lineup-saved-message"]')).toBeVisible()

      // Test auto-optimize feature
      await page.click('[data-testid="auto-optimize-button"]')
      await expect(page.locator('[data-testid="optimize-modal"]')).toBeVisible()
      await page.click('[data-testid="confirm-optimize"]')
      await expect(page.locator('[data-testid="lineup-optimized-message"]')).toBeVisible()

      // Switch to transactions tab
      await page.click('[data-testid="transactions-tab"]')
      await expect(page.locator('[data-testid="available-players"]')).toBeVisible()

      // Test waiver claim
      await page.click('[data-testid="available-player"]:first-child')
      await page.click('[data-testid="add-to-waiver"]')
      await page.selectOption('[data-testid="drop-player-select"]', 'bench-player-1')
      await page.click('[data-testid="submit-waiver-claim"]')

      await expect(page.locator('[data-testid="waiver-claim-success"]')).toBeVisible()
    })

    test('should handle lineup validation and restrictions', async ({ page }) => {
      await page.goto('/team')
      await page.click('[data-testid="lineup-tab"]')

      // Test invalid position assignment
      const qbPlayer = page.locator('[data-testid="lineup-slot-QB"] [data-testid="player-card"]')
      const rbSlot = page.locator('[data-testid="lineup-slot-RB1"]')

      // Try to drag QB to RB position (should fail)
      await qbPlayer.dragTo(rbSlot)
      await expect(page.locator('[data-testid="invalid-move-error"]')).toBeVisible()

      // Test bye week warnings
      await page.selectOption('[data-testid="week-selector"]', '12') // Bye week
      await expect(page.locator('[data-testid="bye-week-warning"]')).toBeVisible()

      // Test locked lineup
      await page.selectOption('[data-testid="week-selector"]', '1') // Past week
      await expect(page.locator('[data-testid="lineup-locked-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="save-lineup-button"]')).toBeDisabled()
    })
  })

  test.describe('Live Scoring and Matchup Tracking', () => {
    test('should view live scores and matchup details', async ({ page }) => {
      // Navigate to live scoring
      await page.click('[data-testid="nav-live"]')
      await expect(page).toHaveURL('/live')

      // Verify live scoring dashboard
      await expect(page.locator('[data-testid="live-scoring-dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="current-week"]')).toBeVisible()

      // Check matchup cards
      await expect(page.locator('[data-testid="matchup-card"]')).toHaveCount.toBeGreaterThan(0)

      // Click on user's matchup
      await page.click('[data-testid="user-matchup"]')
      await expect(page.locator('[data-testid="matchup-details"]')).toBeVisible()

      // Verify matchup information
      await expect(page.locator('[data-testid="home-team"]')).toBeVisible()
      await expect(page.locator('[data-testid="away-team"]')).toBeVisible()
      await expect(page.locator('[data-testid="matchup-score"]')).toBeVisible()

      // Check player performance details
      await page.click('[data-testid="player-stats-tab"]')
      await expect(page.locator('[data-testid="player-stats-table"]')).toBeVisible()

      // Verify real-time score updates
      const initialScore = await page.locator('[data-testid="home-score"]').textContent()
      
      // Wait for potential score update (simulated)
      await page.waitForTimeout(2000)
      
      // Scores should update automatically
      await expect(page.locator('[data-testid="last-updated"]')).toBeVisible()

      // Test league standings
      await page.click('[data-testid="standings-tab"]')
      await expect(page.locator('[data-testid="standings-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="team-row"]')).toHaveCount(12) // 12 teams
    })

    test('should display player news and updates', async ({ page }) => {
      await page.goto('/live')

      // Check news ticker
      await expect(page.locator('[data-testid="news-ticker"]')).toBeVisible()

      // Click on news item
      await page.click('[data-testid="news-item"]:first-child')
      await expect(page.locator('[data-testid="news-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="news-headline"]')).toBeVisible()
      await expect(page.locator('[data-testid="news-content"]')).toBeVisible()

      // Close modal
      await page.click('[data-testid="close-modal"]')
      await expect(page.locator('[data-testid="news-modal"]')).not.toBeVisible()

      // Test injury reports
      await page.click('[data-testid="injury-report-tab"]')
      await expect(page.locator('[data-testid="injury-list"]')).toBeVisible()
    })
  })

  test.describe('League Chat and Communication', () => {
    test('should send and receive chat messages', async ({ page }) => {
      // Open chat from any page
      await page.click('[data-testid="chat-toggle"]')
      await expect(page.locator('[data-testid="league-chat"]')).toBeVisible()

      // Send a message
      const testMessage = `Test message ${Date.now()}`
      await page.fill('[data-testid="message-input"]', testMessage)
      await page.click('[data-testid="send-message"]')

      // Verify message appears
      await expect(page.locator('[data-testid="chat-messages"]').last()).toContainText(testMessage)

      // Test message reactions
      await page.hover('[data-testid="chat-message"]:last-child')
      await page.click('[data-testid="add-reaction"]')
      await page.click('[data-testid="emoji-thumbs-up"]')

      await expect(page.locator('[data-testid="message-reaction"]')).toBeVisible()

      // Test message reply
      await page.click('[data-testid="reply-message"]')
      await page.fill('[data-testid="message-input"]', 'Reply to message')
      await page.click('[data-testid="send-message"]')

      await expect(page.locator('[data-testid="reply-indicator"]')).toBeVisible()

      // Test trash talk category
      await page.selectOption('[data-testid="message-category"]', 'TRASH_TALK')
      await page.fill('[data-testid="message-input"]', 'Friendly trash talk! 😄')
      await page.click('[data-testid="send-message"]')

      await expect(page.locator('[data-testid="trash-talk-badge"]')).toBeVisible()
    })

    test('should handle chat moderation features', async ({ page }) => {
      await page.click('[data-testid="chat-toggle"]')

      // Test message editing (own messages only)
      await page.hover('[data-testid="own-message"]:last-child')
      await page.click('[data-testid="edit-message"]')
      await page.fill('[data-testid="edit-input"]', 'Edited message')
      await page.click('[data-testid="save-edit"]')

      await expect(page.locator('[data-testid="edited-indicator"]')).toBeVisible()

      // Test message deletion
      await page.hover('[data-testid="own-message"]:last-child')
      await page.click('[data-testid="delete-message"]')
      await page.click('[data-testid="confirm-delete"]')

      await expect(page.locator('[data-testid="deleted-message"]')).toBeVisible()

      // Test chat history loading
      await page.click('[data-testid="load-older-messages"]')
      await expect(page.locator('[data-testid="chat-messages"] [data-testid="chat-message"]')).toHaveCount.toBeGreaterThan(10)
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should load pages within performance thresholds', async ({ page }) => {
      // Test dashboard load time
      const startTime = Date.now()
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      const dashboardLoadTime = Date.now() - startTime

      expect(dashboardLoadTime).toBeLessThan(3000) // Should load within 3 seconds

      // Test navigation speed
      const navStartTime = Date.now()
      await page.click('[data-testid="nav-team"]')
      await page.waitForLoadState('networkidle')
      const navTime = Date.now() - navStartTime

      expect(navTime).toBeLessThan(2000) // Navigation should be fast

      // Test data fetch performance
      await page.goto('/live')
      await page.waitForSelector('[data-testid="live-scoring-dashboard"]')
      
      // Measure time for live data to load
      const dataStartTime = Date.now()
      await page.waitForSelector('[data-testid="matchup-card"]:first-child [data-testid="score"]')
      const dataLoadTime = Date.now() - dataStartTime

      expect(dataLoadTime).toBeLessThan(5000) // Live data should load within 5 seconds
    })

    test('should handle large datasets efficiently', async ({ page }) => {
      // Navigate to players page (potentially large dataset)
      await page.goto('/players')
      await page.waitForLoadState('networkidle')

      // Test search performance
      const searchStartTime = Date.now()
      await page.fill('[data-testid="player-search"]', 'A')
      await page.waitForSelector('[data-testid="search-results"]')
      const searchTime = Date.now() - searchStartTime

      expect(searchTime).toBeLessThan(1000) // Search should be responsive

      // Test pagination
      await page.click('[data-testid="next-page"]')
      await page.waitForSelector('[data-testid="player-list"]')
      
      // Verify pagination works smoothly
      await expect(page.locator('[data-testid="current-page"]')).toHaveText('2')
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work properly on mobile devices', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Verify mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      await page.click('[data-testid="mobile-menu-button"]')
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()

      // Test mobile lineup management
      await page.click('[data-testid="nav-team-mobile"]')
      await expect(page.locator('[data-testid="mobile-lineup-view"]')).toBeVisible()

      // Test touch interactions
      await page.tap('[data-testid="bench-player"]:first-child')
      await expect(page.locator('[data-testid="player-options-modal"]')).toBeVisible()

      // Test mobile chat
      await page.click('[data-testid="mobile-chat-button"]')
      await expect(page.locator('[data-testid="mobile-chat-overlay"]')).toBeVisible()
    })
  })
})