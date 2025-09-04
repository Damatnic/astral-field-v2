import { test, expect } from '@playwright/test'

test.describe('League Systems - League Creation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser'
          }
        })
      })
    })

    // Mock Supabase API responses
    await page.route('**/rest/v1/leagues**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'league-123',
            name: 'Test League',
            commissioner_id: 'user-123',
            max_teams: 12,
            season_year: 2025,
            league_type: 'standard',
            status: 'draft'
          })
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      }
    })

    await page.goto('/')
  })

  test('should display league creation form', async ({ page }) => {
    // Navigate to create league page
    await page.click('[data-testid="create-league-button"]')
    
    // Check that form is displayed
    await expect(page.locator('[data-testid="league-creation-form"]')).toBeVisible()
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
    await expect(page.locator('select[name="league_type"]')).toBeVisible()
    await expect(page.locator('input[name="max_teams"]')).toBeVisible()
  })

  test('should create a standard scoring league', async ({ page }) => {
    await page.click('[data-testid="create-league-button"]')
    
    // Fill out league creation form
    await page.fill('input[name="name"]', 'My Test League')
    await page.fill('textarea[name="description"]', 'A test league for E2E testing')
    await page.selectOption('select[name="league_type"]', 'standard')
    await page.fill('input[name="max_teams"]', '12')
    
    // Submit form
    await page.click('[data-testid="create-league-submit"]')
    
    // Should redirect to league page
    await expect(page).toHaveURL(/\/leagues\/league-123/)
    
    // Should display league information
    await expect(page.locator('[data-testid="league-name"]')).toContainText('Test League')
    await expect(page.locator('[data-testid="league-type"]')).toContainText('Standard')
    await expect(page.locator('[data-testid="max-teams"]')).toContainText('12')
  })

  test('should create a PPR league with custom settings', async ({ page }) => {
    await page.click('[data-testid="create-league-button"]')
    
    // Fill basic info
    await page.fill('input[name="name"]', 'PPR Championship League')
    await page.fill('textarea[name="description"]', 'A competitive PPR league')
    await page.selectOption('select[name="league_type"]', 'ppr')
    await page.fill('input[name="max_teams"]', '10')
    
    // Configure advanced settings
    await page.click('[data-testid="advanced-settings-toggle"]')
    await page.fill('input[name="bench_size"]', '6')
    await page.selectOption('select[name="waiver_period"]', '2')
    
    // Configure scoring settings
    await page.click('[data-testid="scoring-settings-tab"]')
    await page.fill('input[name="receptions"]', '1') // PPR
    await page.fill('input[name="passing_touchdowns"]', '6') // Custom QB scoring
    
    // Submit
    await page.click('[data-testid="create-league-submit"]')
    
    // Verify league was created with custom settings
    await expect(page).toHaveURL(/\/leagues\/league-123/)
    await expect(page.locator('[data-testid="league-type"]')).toContainText('PPR')
  })

  test('should validate required fields', async ({ page }) => {
    await page.click('[data-testid="create-league-button"]')
    
    // Try to submit without required fields
    await page.click('[data-testid="create-league-submit"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('League name is required')
    await expect(page.locator('input[name="name"]')).toHaveClass(/error/)
  })

  test('should prevent duplicate league names for same user', async ({ page }) => {
    // Mock API to return conflict error
    await page.route('**/rest/v1/leagues**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'League name already exists'
          })
        })
      }
    })

    await page.click('[data-testid="create-league-button"]')
    
    await page.fill('input[name="name"]', 'Existing League')
    await page.selectOption('select[name="league_type"]', 'standard')
    await page.click('[data-testid="create-league-submit"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="form-error"]'))
      .toContainText('League name already exists')
  })

  test('should show loading state during creation', async ({ page }) => {
    // Mock slow API response
    await page.route('**/rest/v1/leagues**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'league-123', name: 'Test League' })
        })
      }, 1000)
    })

    await page.click('[data-testid="create-league-button"]')
    
    await page.fill('input[name="name"]', 'Test League')
    await page.selectOption('select[name="league_type"]', 'standard')
    await page.click('[data-testid="create-league-submit"]')
    
    // Should show loading state
    await expect(page.locator('[data-testid="create-league-submit"]')).toBeDisabled()
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('should allow cancelling league creation', async ({ page }) => {
    await page.click('[data-testid="create-league-button"]')
    
    // Fill out some form data
    await page.fill('input[name="name"]', 'Test League')
    
    // Click cancel
    await page.click('[data-testid="cancel-button"]')
    
    // Should return to leagues list
    await expect(page).toHaveURL('/')
    await expect(page.locator('[data-testid="league-creation-form"]')).not.toBeVisible()
  })

  test('should auto-save draft as user types', async ({ page }) => {
    await page.click('[data-testid="create-league-button"]')
    
    await page.fill('input[name="name"]', 'Auto Save Test')
    
    // Wait for auto-save indicator
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toContainText('Saved')
    
    // Refresh page and check if data persists
    await page.reload()
    await expect(page.locator('input[name="name"]')).toHaveValue('Auto Save Test')
  })
})