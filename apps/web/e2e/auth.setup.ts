/**
 * Zenith Authentication Setup for E2E Tests
 * Sets up authenticated user sessions for testing
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/signin')

  // Fill in login credentials
  await page.fill('[data-testid="email-input"]', 'test@example.com')
  await page.fill('[data-testid="password-input"]', 'password123')

  // Submit login form
  await page.click('[data-testid="signin-button"]')

  // Wait for successful login redirect
  await expect(page).toHaveURL('/dashboard')

  // Verify user is logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

  // Save authentication state
  await page.context().storageState({ path: authFile })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/signin')

  await page.fill('[data-testid="email-input"]', 'admin@example.com')
  await page.fill('[data-testid="password-input"]', 'admin123')
  await page.click('[data-testid="signin-button"]')

  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible()

  await page.context().storageState({ path: path.join(__dirname, '.auth/admin.json') })
})

setup('authenticate as commissioner', async ({ page }) => {
  await page.goto('/auth/signin')

  await page.fill('[data-testid="email-input"]', 'commissioner@example.com')
  await page.fill('[data-testid="password-input"]', 'commissioner123')
  await page.click('[data-testid="signin-button"]')

  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('[data-testid="commissioner-menu"]')).toBeVisible()

  await page.context().storageState({ path: path.join(__dirname, '.auth/commissioner.json') })
})