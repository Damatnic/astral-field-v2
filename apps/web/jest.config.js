// Only run Jest configuration in test environment
if (process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.argv.includes('--test')) {
  const nextJest = require('next/jest')

  const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
  })

// Zenith's Comprehensive Jest Configuration
const customJestConfig = {
  // Test environment setup
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.setup.js',
    '<rootDir>/__tests__/setup/prisma.setup.js'
  ],
  setupFiles: ['<rootDir>/__tests__/setup/env.setup.js'],
  testEnvironment: 'jsdom',
  
  // Test execution configuration
  testTimeout: 30000,
  maxWorkers: 1,
  verbose: false,
  bail: false,
  
  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/', // Ignore Playwright tests
    '<rootDir>/playwright.config.ts',
    '<rootDir>/__tests__/fixtures/',
    '<rootDir>/__tests__/performance/'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/lib/$1',
    '^@/fixtures/(.*)$': '<rootDir>/__tests__/fixtures/$1',
    '^@/mocks/(.*)$': '<rootDir>/__tests__/mocks/$1'
  },
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/globals.css',
    '!src/middleware.ts' // Exclude middleware from coverage
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary',
    'clover'
  ],
  
  // Coverage thresholds - Zenith's 95% standard
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    },
    // Critical path requirements
    './src/components/': {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95
    },
    './src/lib/': {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100
    },
    './src/app/api/': {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100
    }
  },
  
  // Transform configuration
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)/)'
  ],
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Test reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'jest-results.xml',
      suiteName: 'Astral Field Unit Tests'
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'unit-test-report.html',
      openReport: false
    }]
  ],
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  }
}

  // createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
  module.exports = createJestConfig(customJestConfig)
} else {
  // Export empty configuration for non-test environments
  module.exports = {}
}