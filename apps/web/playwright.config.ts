import { defineConfig, devices } from '@playwright/test'

/**
 * Zenith Playwright Configuration
 * Comprehensive E2E testing setup for Astral Field
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Global test settings */
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1,
  
  /* Worker configuration */
  workers: process.env.CI ? 2 : '50%',
  
  /* Reporter configuration */
  reporter: [
    ['html', { outputFolder: 'e2e-results/html-report' }],
    ['json', { outputFile: 'e2e-results/results.json' }],
    ['junit', { outputFile: 'e2e-results/junit-results.xml' }],
    ['line'],
    ['github'], // For CI
  ],
  
  /* Output directory */
  outputDir: 'e2e-results/artifacts',
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like page.goto('/') */
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    
    /* Collect trace when retrying failed tests */
    trace: 'retain-on-failure',
    
    /* Screenshot settings */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
    
    /* Accept downloads */
    acceptDownloads: true,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Viewport */
    viewport: { width: 1280, height: 720 },
    
    /* Additional context options */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    
    /* Storage state for authenticated tests */
    storageState: process.env.CI ? undefined : 'e2e/.auth/user.json',
  },

  /* Test directory patterns */
  testMatch: [
    'e2e/**/*.{test,spec}.{js,ts}',
    'e2e/**/*.e2e.{js,ts}',
  ],

  /* Global setup and teardown */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* Configure projects for different browsers and scenarios */
  projects: [
    /* Setup authentication */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    /* Desktop browsers */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    /* Mobile testing */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Landscape',
      use: { 
        ...devices['Pixel 5 landscape'],
        viewport: { width: 844, height: 390 },
      },
      dependencies: ['setup'],
    },

    /* High DPI testing */
    {
      name: 'Desktop Chrome HiDPI',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        deviceScaleFactor: 2,
      },
      dependencies: ['setup'],
    },

    /* Accessibility testing */
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    /* Performance testing */
    {
      name: 'performance',
      testMatch: /.*\.perf\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
      dependencies: ['setup'],
    },

    /* Visual regression testing */
    {
      name: 'visual',
      testMatch: /.*\.visual\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },

    /* Branded browsers for cross-browser testing */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },

  /* Folder for test artifacts */
  testIgnore: [
    'e2e/fixtures/**',
    'e2e/utils/**',
    'e2e/page-objects/**',
  ],
})