import { test, expect } from '@playwright/test'

// Mock authenticated user for dashboard tests
test.use({
  storageState: {
    cookies: [
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: '127.0.0.1',
        path: '/',
        expires: Date.now() + 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ],
    origins: []
  }
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session API
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })
    })

    // Mock dashboard data API
    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          teams: [
            {
              id: 'team1',
              name: 'Fire Breathing Rubber Ducks',
              league: { name: 'Championship League', id: 'league1' },
              record: { wins: 8, losses: 4, ties: 0 },
              rank: 2,
              totalTeams: 12,
              nextMatchup: {
                opponent: 'Storm Hawks',
                isHome: true,
                projectedScore: 127.5,
                opponentProjectedScore: 118.3
              }
            }
          ],
          recentActivity: [
            {
              id: 'activity1',
              type: 'TRADE_COMPLETED',
              message: 'Trade completed: Gave Saquon Barkley, received Cooper Kupp',
              timestamp: new Date().toISOString()
            }
          ],
          weeklyStats: {
            currentWeek: 14,
            weeklyScore: 127.4,
            weeklyRank: 3,
            projectedScore: 132.1
          }
        })
      })
    })

    await page.goto('/dashboard')
  })

  test('should display dashboard layout correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check for sidebar
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=My Team')).toBeVisible()
    await expect(page.locator('text=Players')).toBeVisible()
    await expect(page.locator('text=Live Scoring')).toBeVisible()
    await expect(page.locator('text=Draft Room')).toBeVisible()
    await expect(page.locator('text=AI Coach')).toBeVisible()
    
    // Check user info in sidebar
    await expect(page.locator('text=John Doe')).toBeVisible()
  })

  test('should display team overview cards', async ({ page }) => {
    await expect(page.locator('text=Fire Breathing Rubber Ducks')).toBeVisible()
    await expect(page.locator('text=Championship League')).toBeVisible()
    await expect(page.locator('text=8-4-0')).toBeVisible() // Record
    await expect(page.locator('text=2nd of 12')).toBeVisible() // Ranking
  })

  test('should show weekly stats', async ({ page }) => {
    await expect(page.locator('text=Week 14')).toBeVisible()
    await expect(page.locator('text=127.4')).toBeVisible() // Weekly score
    await expect(page.locator('text=3rd')).toBeVisible() // Weekly rank
    await expect(page.locator('text=Projected: 132.1')).toBeVisible()
  })

  test('should display next matchup information', async ({ page }) => {
    await expect(page.locator('text=Next Matchup')).toBeVisible()
    await expect(page.locator('text=vs Storm Hawks')).toBeVisible()
    await expect(page.locator('text=127.5')).toBeVisible() // Projected score
    await expect(page.locator('text=118.3')).toBeVisible() // Opponent projected
  })

  test('should show recent activity feed', async ({ page }) => {
    await expect(page.locator('text=Recent Activity')).toBeVisible()
    await expect(page.locator('text=Trade completed')).toBeVisible()
    await expect(page.locator('text=Saquon Barkley')).toBeVisible()
    await expect(page.locator('text=Cooper Kupp')).toBeVisible()
  })

  test('should navigate to team page', async ({ page }) => {
    await page.click('text=My Team')
    await expect(page).toHaveURL(/\/teams\/team1/)
  })

  test('should navigate to players page', async ({ page }) => {
    await page.click('text=Players')
    await expect(page).toHaveURL(/\/players/)
  })

  test('should navigate to live scoring', async ({ page }) => {
    await page.click('text=Live Scoring')
    await expect(page).toHaveURL(/\/live/)
  })

  test('should navigate to draft room', async ({ page }) => {
    await page.click('text=Draft Room')
    await expect(page).toHaveURL(/\/draft/)
  })

  test('should navigate to AI Coach', async ({ page }) => {
    await page.click('text=AI Coach')
    await expect(page).toHaveURL(/\/ai-coach/)
  })

  test('should handle sign out', async ({ page }) => {
    await page.route('/api/auth/signout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/auth/signin' })
      })
    })

    await page.click('text=Sign out')
    
    // Should redirect to sign in page
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone size
    
    // Mobile menu should be collapsed initially
    await expect(page.locator('[aria-label="Open sidebar"]')).toBeVisible()
    
    // Click hamburger menu
    await page.click('[aria-label="Open sidebar"]')
    
    // Sidebar should be visible
    await expect(page.locator('text=My Team')).toBeVisible()
    await expect(page.locator('text=Players')).toBeVisible()
  })

  test('should display quick actions section', async ({ page }) => {
    await expect(page.locator('text=Quick Actions')).toBeVisible()
    await expect(page.locator('text=Set Lineup')).toBeVisible()
    await expect(page.locator('text=Check Waivers')).toBeVisible()
    await expect(page.locator('text=View Trade Offers')).toBeVisible()
  })

  test('should show performance metrics', async ({ page }) => {
    await expect(page.locator('text=Season Stats')).toBeVisible()
    
    // Should show various performance indicators
    const metricsToCheck = [
      'Points For',
      'Points Against', 
      'Avg Points/Week',
      'Best Week',
      'Worst Week'
    ]
    
    for (const metric of metricsToCheck) {
      await expect(page.locator(`text=${metric}`).first()).toBeVisible()
    }
  })

  test('should handle loading states', async ({ page }) => {
    // Intercept API call with delay
    await page.route('/api/dashboard', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          teams: [],
          recentActivity: [],
          weeklyStats: { currentWeek: 14, weeklyScore: 0, weeklyRank: 0, projectedScore: 0 }
        })
      })
    })
    
    await page.reload()
    
    // Should show loading indicators
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    await page.reload()
    
    // Should show error message
    await expect(page.locator('text=Failed to load dashboard data')).toBeVisible()
    await expect(page.locator('button', { hasText: 'Try again' })).toBeVisible()
  })

  test('should refresh data when retry button is clicked', async ({ page }) => {
    // First, make API fail
    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    await page.reload()
    await expect(page.locator('text=Failed to load dashboard data')).toBeVisible()
    
    // Now make API succeed
    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          teams: [
            {
              id: 'team1',
              name: 'Fire Breathing Rubber Ducks',
              league: { name: 'Championship League' },
              record: { wins: 8, losses: 4, ties: 0 }
            }
          ],
          recentActivity: [],
          weeklyStats: { currentWeek: 14, weeklyScore: 127.4, weeklyRank: 3, projectedScore: 132.1 }
        })
      })
    })
    
    await page.click('button', { hasText: 'Try again' })
    
    // Data should load successfully
    await expect(page.locator('text=Fire Breathing Rubber Ducks')).toBeVisible()
  })

  test('should display league standings preview', async ({ page }) => {
    await expect(page.locator('text=League Standings')).toBeVisible()
    
    // Should show at least current team's position
    await expect(page.locator('text=2nd')).toBeVisible()
    await expect(page.locator('text=Fire Breathing Rubber Ducks')).toBeVisible()
  })

  test('should show upcoming games this week', async ({ page }) => {
    await expect(page.locator('text=This Week')).toBeVisible()
    await expect(page.locator('text=Week 14')).toBeVisible()
    
    // Should show game information
    await expect(page.locator('text=vs Storm Hawks')).toBeVisible()
  })
})

test.describe('Dashboard Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Setup same mocks as main describe block
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user1', name: 'John Doe', email: 'john@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })
    })

    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          teams: [{
            id: 'team1',
            name: 'Fire Breathing Rubber Ducks',
            league: { name: 'Championship League', id: 'league1' },
            record: { wins: 8, losses: 4, ties: 0 },
            rank: 2,
            totalTeams: 12
          }],
          recentActivity: [],
          weeklyStats: { currentWeek: 14, weeklyScore: 127.4, weeklyRank: 3, projectedScore: 132.1 }
        })
      })
    })

    await page.goto('/dashboard')
  })

  test('should expand and collapse team details', async ({ page }) => {
    // Click on team card to expand
    await page.click('.team-card')
    
    // Should show expanded details (roster preview, recent changes, etc.)
    await expect(page.locator('text=Roster Preview')).toBeVisible()
    
    // Click again to collapse
    await page.click('.team-card')
    
    // Details should be hidden
    await expect(page.locator('text=Roster Preview')).not.toBeVisible()
  })

  test('should filter recent activity by type', async ({ page }) => {
    // Mock activity data with different types
    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          teams: [],
          recentActivity: [
            { id: '1', type: 'TRADE_COMPLETED', message: 'Trade completed', timestamp: new Date().toISOString() },
            { id: '2', type: 'WAIVER_CLAIM', message: 'Waiver claim successful', timestamp: new Date().toISOString() },
            { id: '3', type: 'LINEUP_CHANGE', message: 'Lineup updated', timestamp: new Date().toISOString() }
          ],
          weeklyStats: { currentWeek: 14, weeklyScore: 0, weeklyRank: 0, projectedScore: 0 }
        })
      })
    })
    
    await page.reload()
    
    // Filter buttons should be visible
    await expect(page.locator('button', { hasText: 'All' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Trades' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Waivers' })).toBeVisible()
    
    // Click trade filter
    await page.click('button', { hasText: 'Trades' })
    
    // Should only show trade activity
    await expect(page.locator('text=Trade completed')).toBeVisible()
    await expect(page.locator('text=Waiver claim successful')).not.toBeVisible()
  })
})