import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page for unauthenticated users', async ({ page }) => {
    await expect(page).toHaveTitle(/AstralField/)
    await expect(page.locator('h1')).toContainText('Sign in to AstralField')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
  })

  test('should show validation errors for invalid login', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Please enter your email')).toBeVisible()
    await expect(page.locator('text=Please enter your password')).toBeVisible()
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Please enter a valid email')).toBeVisible()
  })

  test('should show error for short password', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '123')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible()
  })

  test('should navigate to sign up page', async ({ page }) => {
    await page.click('text=Create an account')
    
    await expect(page).toHaveURL(/\/auth\/signup/)
    await expect(page.locator('h1')).toContainText('Create your account')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Create account')
  })

  test('should show OAuth providers', async ({ page }) => {
    await expect(page.locator('text=Continue with Google')).toBeVisible()
    await expect(page.locator('text=Continue with GitHub')).toBeVisible()
  })

  test('should handle OAuth provider clicks', async ({ page }) => {
    // Mock the OAuth redirect (in real tests, this would go to actual provider)
    const googleButton = page.locator('text=Continue with Google')
    await expect(googleButton).toBeVisible()
    
    // We can't test actual OAuth flow in e2e without real providers
    // but we can verify the buttons are clickable and styled correctly
    await expect(googleButton).toBeEnabled()
  })
})

test.describe('Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup')
  })

  test('should display sign up form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create your account')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Create account')
  })

  test('should validate sign up form fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Name is required')).toBeVisible()
    await expect(page.locator('text=Please enter your email')).toBeVisible()
    await expect(page.locator('text=Please enter your password')).toBeVisible()
  })

  test('should validate name field', async ({ page }) => {
    await page.fill('input[name="name"]', 'a') // Too short
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible()
  })

  test('should show loading state during submission', async ({ page }) => {
    await page.fill('input[name="name"]', 'John Doe')
    await page.fill('input[type="email"]', 'john@example.com')
    await page.fill('input[type="password"]', 'password123')
    
    // Intercept the API call to control timing
    await page.route('/api/auth/signup', async (route) => {
      // Delay response to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: '1', email: 'john@example.com' } })
      })
    })
    
    await page.click('button[type="submit"]')
    
    // Check for loading state
    await expect(page.locator('button[type="submit"]')).toContainText('Creating account...')
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
  })

  test('should navigate back to sign in', async ({ page }) => {
    await page.click('text=Already have an account? Sign in')
    
    await expect(page).toHaveURL(/\/auth\/signin/)
    await expect(page.locator('h1')).toContainText('Sign in to AstralField')
  })
})

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin')
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('text=Forgot your password?')
    
    await expect(page).toHaveURL(/\/auth\/forgot-password/)
    await expect(page.locator('h1')).toContainText('Reset your password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Send reset email')
  })

  test('should validate forgot password form', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Please enter your email')).toBeVisible()
    
    await page.fill('input[type="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Please enter a valid email')).toBeVisible()
  })

  test('should show success message after valid submission', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    
    await page.route('/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Reset email sent' })
      })
    })
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Reset email sent')).toBeVisible()
    await expect(page.locator('text=Check your email for reset instructions')).toBeVisible()
  })
})

test.describe('Protected Route Access', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to sign in page
    await expect(page).toHaveURL(/\/auth\/signin/)
    await expect(page.locator('h1')).toContainText('Sign in to AstralField')
  })

  test('should redirect from other protected routes', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/players', '/draft', '/live', '/settings']
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/auth\/signin/)
    }
  })

  test('should preserve redirect URL after login', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should be redirected to sign in with callback URL
    await expect(page).toHaveURL(/\/auth\/signin\?callbackUrl/)
    
    // The callback URL should contain the original destination
    const url = new URL(page.url())
    const callbackUrl = url.searchParams.get('callbackUrl')
    expect(callbackUrl).toContain('/dashboard')
  })
})

test.describe('Authentication State Persistence', () => {
  test('should persist authentication across page reloads', async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/signin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: '1', name: 'John Doe', email: 'john@example.com' }
        })
      })
    })
    
    // Mock session endpoint
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', name: 'John Doe', email: 'john@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })
    })
    
    await page.goto('/auth/signin')
    
    await page.fill('input[type="email"]', 'john@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/)
    
    // Reload the page
    await page.reload()
    
    // Should still be on dashboard (authenticated)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should handle session expiration', async ({ page }) => {
    // First, set up an expired session
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: null,
          expires: null
        })
      })
    })
    
    await page.goto('/dashboard')
    
    // Should redirect to sign in when session is expired
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})