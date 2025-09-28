import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('[Zenith E2E] Global setup started')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for server to be ready
    console.log('[Zenith E2E] Waiting for server...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    console.log('[Zenith E2E] Server is ready')
    
    // Pre-authenticate if needed
    // This could include creating test users, clearing databases, etc.
    
  } catch (error) {
    console.error('[Zenith E2E] Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('[Zenith E2E] Global setup completed')
}

export default globalSetup