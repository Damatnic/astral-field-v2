/**
 * Jest Configuration for Sleeper API Testing Framework
 * 
 * Specialized Jest configuration for running the comprehensive Sleeper API
 * testing framework with appropriate timeouts, setup, and reporting.
 */

module.exports = {
  displayName: 'Sleeper API Testing Framework',
  testMatch: [
    '**/__tests__/**/comprehensive-sleeper-test.ts',
    '**/__tests__/agents/*.test.ts',
    '**/__tests__/utils/*.test.ts'
  ],
  
  // TypeScript and ES modules support
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          target: 'es2020',
          lib: ['es2020'],
          declaration: false,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        }
      }
    }]
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/sleeper-test-setup.ts'
  ],
  
  // Timeouts for comprehensive tests
  testTimeout: 300000, // 5 minutes for comprehensive tests
  
  // Coverage configuration
  collectCoverage: false, // Disabled by default for performance
  collectCoverageFrom: [
    'src/services/sleeper/**/*.ts',
    '__tests__/agents/**/*.ts',
    '__tests__/utils/**/*.ts',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/coverage/sleeper',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test result formatting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports/sleeper',
        filename: 'sleeper-test-report.html',
        pageTitle: 'Sleeper API Testing Framework Report',
        overwrite: true,
        expand: true,
        hideIcon: false,
        testCommand: 'npm run test:sleeper'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-reports/sleeper',
        outputName: 'sleeper-test-results.xml',
        suiteName: 'Sleeper API Testing Framework',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Global configuration
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Performance and optimization
  maxWorkers: '50%', // Use half of available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/sleeper',
  
  // Test patterns and exclusions
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__tests__/factories/',
    '/__tests__/mocks/',
    '/__tests__/setup/'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Error handling
  bail: false, // Continue running tests even if some fail
  verbose: true,
  
  // Additional Jest options for comprehensive testing
  detectOpenHandles: true,
  forceExit: false,
  
  // Environment variables for testing
  setupFiles: ['<rootDir>/__tests__/setup/env-setup.ts']
};