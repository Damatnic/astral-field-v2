import { test, expect } from '@playwright/test'

// Mock authenticated user for all tests
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

test.describe('Players Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session API
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

    // Mock players API
    await page.route('/api/players**', async (route) => {
      const url = new URL(route.request().url())
      const position = url.searchParams.get('position')
      const search = url.searchParams.get('search')
      const page_param = parseInt(url.searchParams.get('page') || '1')
      
      let filteredPlayers = [
        {
          id: 'player1',
          name: 'Josh Allen',
          position: 'QB',
          nflTeam: 'BUF',
          rank: 1,
          adp: 2.5,
          isAvailable: true,
          stats: [
            { week: 13, fantasyPoints: 25.6, stats: { passingYards: 285, touchdowns: 3 } }
          ],
          projections: [
            { projectedPoints: 24.8, confidence: 0.85 }
          ],
          news: [
            {
              id: 'news1',
              title: 'Josh Allen cleared to play',
              content: 'No injury concerns for Week 14',
              source: 'ESPN',
              publishedAt: new Date().toISOString(),
              severity: 'LOW'
            }
          ]
        },
        {
          id: 'player2',
          name: 'Lamar Jackson',
          position: 'QB',
          nflTeam: 'BAL',
          rank: 2,
          adp: 3.1,
          isAvailable: false,
          stats: [
            { week: 13, fantasyPoints: 22.4, stats: { passingYards: 265, touchdowns: 2 } }
          ],
          projections: [
            { projectedPoints: 23.2, confidence: 0.82 }
          ],
          news: []
        },
        {
          id: 'player3',
          name: 'Saquon Barkley',
          position: 'RB',
          nflTeam: 'PHI',
          rank: 5,
          adp: 8.2,
          isAvailable: true,
          stats: [
            { week: 13, fantasyPoints: 18.4, stats: { rushingYards: 95, touchdowns: 1 } }
          ],
          projections: [
            { projectedPoints: 16.2, confidence: 0.78 }
          ],
          news: []
        },
        {
          id: 'player4',
          name: 'Tyreek Hill',
          position: 'WR',
          nflTeam: 'MIA',
          rank: 8,
          adp: 12.5,
          isAvailable: true,
          stats: [
            { week: 13, fantasyPoints: 14.8, stats: { receivingYards: 85, touchdowns: 1 } }
          ],
          projections: [
            { projectedPoints: 17.5, confidence: 0.75 }
          ],
          news: []
        }
      ]

      // Apply filters
      if (position && position !== 'ALL') {
        filteredPlayers = filteredPlayers.filter(p => p.position === position)
      }
      if (search) {
        filteredPlayers = filteredPlayers.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.nflTeam.toLowerCase().includes(search.toLowerCase())
        )
      }

      // Pagination
      const itemsPerPage = 20
      const startIndex = (page_param - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)
      const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          players: paginatedPlayers,
          pagination: {
            currentPage: page_param,
            totalPages,
            totalPlayers: filteredPlayers.length,
            hasMore: endIndex < filteredPlayers.length
          }
        })
      })
    })

    await page.goto('/players')
  })

  test('should display players page layout', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Players')
    
    // Check for search and filter controls
    await expect(page.locator('input[placeholder*="Search players"]')).toBeVisible()
    await expect(page.locator('select')).toBeVisible() // Position filter
    
    // Check for players list
    await expect(page.locator('.player-card').first()).toBeVisible()
  })

  test('should display player cards with correct information', async ({ page }) => {
    // Check for Josh Allen card
    await expect(page.locator('text=Josh Allen')).toBeVisible()
    await expect(page.locator('text=QB')).toBeVisible()
    await expect(page.locator('text=BUF')).toBeVisible()
    await expect(page.locator('text=25.6')).toBeVisible() // Fantasy points
    await expect(page.locator('text=24.8')).toBeVisible() // Projected points
    await expect(page.locator('text=85%')).toBeVisible() // Confidence
  })

  test('should show availability status', async ({ page }) => {
    await expect(page.locator('text=Available').first()).toBeVisible()
    await expect(page.locator('text=Owned').first()).toBeVisible()
  })

  test('should filter players by position', async ({ page }) => {
    // Select QB filter
    await page.selectOption('select', 'QB')
    
    // Should show only QBs
    await expect(page.locator('text=Josh Allen')).toBeVisible()
    await expect(page.locator('text=Lamar Jackson')).toBeVisible()
    await expect(page.locator('text=Saquon Barkley')).not.toBeVisible()
    await expect(page.locator('text=Tyreek Hill')).not.toBeVisible()
  })

  test('should search players by name', async ({ page }) => {
    // Search for Josh Allen
    await page.fill('input[placeholder*="Search players"]', 'Josh Allen')
    await page.press('input[placeholder*="Search players"]', 'Enter')
    
    // Should show only Josh Allen
    await expect(page.locator('text=Josh Allen')).toBeVisible()
    await expect(page.locator('text=Lamar Jackson')).not.toBeVisible()
    await expect(page.locator('text=Saquon Barkley')).not.toBeVisible()
  })

  test('should search players by team', async ({ page }) => {
    await page.fill('input[placeholder*="Search players"]', 'BUF')
    await page.press('input[placeholder*="Search players"]', 'Enter')
    
    await expect(page.locator('text=Josh Allen')).toBeVisible()
    await expect(page.locator('text=Lamar Jackson')).not.toBeVisible()
  })

  test('should expand player details on click', async ({ page }) => {
    // Click on Josh Allen card
    await page.click('.player-card', { hasText: 'Josh Allen' })
    
    // Should show expanded details
    await expect(page.locator('text=Recent News')).toBeVisible()
    await expect(page.locator('text=Josh Allen cleared to play')).toBeVisible()
    await expect(page.locator('text=285')).toBeVisible() // Passing yards
    await expect(page.locator('text=3')).toBeVisible() // Touchdowns
  })

  test('should show position badges with correct colors', async ({ page }) => {
    const qbBadge = page.locator('.position-badge', { hasText: 'QB' }).first()
    const rbBadge = page.locator('.position-badge', { hasText: 'RB' }).first()
    
    await expect(qbBadge).toHaveClass(/bg-red-500/)
    await expect(rbBadge).toHaveClass(/bg-green-500/)
  })

  test('should handle pagination', async ({ page }) => {
    // Mock more players for pagination
    await page.route('/api/players**', async (route) => {
      const url = new URL(route.request().url())
      const page_param = parseInt(url.searchParams.get('page') || '1')
      
      // Mock 50 players to trigger pagination
      const allPlayers = Array.from({ length: 50 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        position: 'WR',
        nflTeam: 'NYJ',
        rank: i + 1,
        adp: i + 1,
        isAvailable: true,
        stats: [{ week: 13, fantasyPoints: 10, stats: {} }],
        projections: [{ projectedPoints: 12, confidence: 0.7 }],
        news: []
      }))
      
      const itemsPerPage = 20
      const startIndex = (page_param - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedPlayers = allPlayers.slice(startIndex, endIndex)
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          players: paginatedPlayers,
          pagination: {
            currentPage: page_param,
            totalPages: Math.ceil(allPlayers.length / itemsPerPage),
            totalPlayers: allPlayers.length,
            hasMore: endIndex < allPlayers.length
          }
        })
      })
    })
    
    await page.reload()
    
    // Should show pagination controls
    await expect(page.locator('button', { hasText: 'Previous' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Next' })).toBeVisible()
    await expect(page.locator('text=Page 1 of 3')).toBeVisible()
    
    // Previous should be disabled on first page
    await expect(page.locator('button', { hasText: 'Previous' })).toBeDisabled()
    
    // Click next page
    await page.click('button', { hasText: 'Next' })
    
    await expect(page.locator('text=Page 2 of 3')).toBeVisible()
    await expect(page.locator('button', { hasText: 'Previous' })).toBeEnabled()
  })

  test('should show trending indicators', async ({ page }) => {
    await expect(page.locator('[data-testid="trending-up"]')).toBeVisible()
    await expect(page.locator('[data-testid="trending-down"]')).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    // Intercept API with delay
    await page.route('/api/players**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ players: [], pagination: { currentPage: 1, totalPages: 1 } })
      })
    })
    
    await page.reload()
    
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('should handle empty search results', async ({ page }) => {
    await page.fill('input[placeholder*="Search players"]', 'Nonexistent Player')
    await page.press('input[placeholder*="Search players"]', 'Enter')
    
    await expect(page.locator('text=No players found')).toBeVisible()
    await expect(page.locator('text=Try adjusting your search criteria')).toBeVisible()
  })

  test('should display player news when available', async ({ page }) => {
    // Expand Josh Allen details
    await page.click('.player-card', { hasText: 'Josh Allen' })
    
    await expect(page.locator('text=Recent News')).toBeVisible()
    await expect(page.locator('text=Josh Allen cleared to play')).toBeVisible()
    await expect(page.locator('text=ESPN')).toBeVisible() // News source
  })

  test('should show player stats and projections', async ({ page }) => {
    // Expand player details
    await page.click('.player-card', { hasText: 'Josh Allen' })
    
    // Should show week 13 stats
    await expect(page.locator('text=Week 13')).toBeVisible()
    await expect(page.locator('text=285 Pass Yds')).toBeVisible()
    await expect(page.locator('text=3 Pass TD')).toBeVisible()
    
    // Should show projections
    await expect(page.locator('text=Week 14 Projection')).toBeVisible()
    await expect(page.locator('text=24.8 pts')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Cards should stack vertically on mobile
    const playerCards = page.locator('.player-card')
    const firstCard = playerCards.first()
    const secondCard = playerCards.nth(1)
    
    const firstCardBox = await firstCard.boundingBox()
    const secondCardBox = await secondCard.boundingBox()
    
    // Second card should be below first card (not side by side)
    expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y + firstCardBox!.height / 2)
  })

  test('should sort players by different criteria', async ({ page }) => {
    // Should have sort dropdown
    await expect(page.locator('select[name="sort"]')).toBeVisible()
    
    // Default should be by rank
    await expect(page.locator('select[name="sort"]')).toHaveValue('rank')
    
    // Change to sort by projected points
    await page.selectOption('select[name="sort"]', 'projected')
    
    // Should re-fetch data with new sort
    await expect(page.locator('text=Josh Allen')).toBeVisible()
  })

  test('should clear search and filters', async ({ page }) => {
    // Apply filters
    await page.fill('input[placeholder*="Search players"]', 'Josh')
    await page.selectOption('select', 'QB')
    
    // Should have clear button when filters are active
    await expect(page.locator('button', { hasText: 'Clear filters' })).toBeVisible()
    
    // Click clear
    await page.click('button', { hasText: 'Clear filters' })
    
    // Search should be cleared and position reset
    await expect(page.locator('input[placeholder*="Search players"]')).toHaveValue('')
    await expect(page.locator('select')).toHaveValue('ALL')
  })
})

test.describe('Player Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Setup same session mock
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

    // Mock players API with basic data
    await page.route('/api/players**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          players: [
            {
              id: 'player1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              rank: 1,
              adp: 2.5,
              isAvailable: true,
              stats: [{ week: 13, fantasyPoints: 25.6, stats: { passingYards: 285, touchdowns: 3 } }],
              projections: [{ projectedPoints: 24.8, confidence: 0.85 }],
              news: []
            }
          ],
          pagination: { currentPage: 1, totalPages: 1, totalPlayers: 1, hasMore: false }
        })
      })
    })

    await page.goto('/players')
  })

  test('should bookmark favorite players', async ({ page }) => {
    // Click bookmark button on player card
    await page.click('[data-testid="bookmark-button"]')
    
    // Should show bookmarked state
    await expect(page.locator('[data-testid="bookmark-button"].bookmarked')).toBeVisible()
    
    // Click again to unbookmark
    await page.click('[data-testid="bookmark-button"]')
    
    // Should return to unbookmarked state
    await expect(page.locator('[data-testid="bookmark-button"]:not(.bookmarked)')).toBeVisible()
  })

  test('should compare multiple players', async ({ page }) => {
    // Mock more players for comparison
    await page.route('/api/players**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          players: [
            {
              id: 'player1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              rank: 1,
              adp: 2.5,
              isAvailable: true,
              stats: [{ week: 13, fantasyPoints: 25.6, stats: {} }],
              projections: [{ projectedPoints: 24.8, confidence: 0.85 }],
              news: []
            },
            {
              id: 'player2',
              name: 'Lamar Jackson',
              position: 'QB',
              nflTeam: 'BAL',
              rank: 2,
              adp: 3.1,
              isAvailable: false,
              stats: [{ week: 13, fantasyPoints: 22.4, stats: {} }],
              projections: [{ projectedPoints: 23.2, confidence: 0.82 }],
              news: []
            }
          ],
          pagination: { currentPage: 1, totalPages: 1, totalPlayers: 2, hasMore: false }
        })
      })
    })
    
    await page.reload()
    
    // Select players for comparison
    await page.check('[data-testid="compare-checkbox"][data-player-id="player1"]')
    await page.check('[data-testid="compare-checkbox"][data-player-id="player2"]')
    
    // Should show compare button
    await expect(page.locator('button', { hasText: 'Compare Selected' })).toBeVisible()
    
    // Click compare
    await page.click('button', { hasText: 'Compare Selected' })
    
    // Should open comparison modal
    await expect(page.locator('[data-testid="comparison-modal"]')).toBeVisible()
    await expect(page.locator('text=Josh Allen vs Lamar Jackson')).toBeVisible()
  })
})