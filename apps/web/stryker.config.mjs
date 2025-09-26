/**
 * Zenith Stryker Mutation Testing Configuration
 * Advanced mutation testing for test quality validation
 */

export default {
  // Test runner configuration
  testRunner: 'jest',
  testRunnerNodeArgs: ['--max_old_space_size=4096'],
  
  // Coverage analysis
  coverageAnalysis: 'perTest',
  
  // Mutation configuration
  mutate: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,ts}',
    '!src/app/globals.css',
    '!src/middleware.ts',
  ],
  
  // Mutators to use
  mutator: {
    // Arithmetic operators
    ArithmeticOperator: true,
    
    // Array declarations
    ArrayDeclaration: true,
    
    // Assignment operators
    AssignmentOperator: true,
    
    // Block statements
    BlockStatement: true,
    
    // Boolean literals
    BooleanLiteral: true,
    
    // Conditional expressions
    ConditionalExpression: true,
    
    // Equality operators
    EqualityOperator: true,
    
    // Logical operators
    LogicalOperator: true,
    
    // Method expressions
    MethodExpression: true,
    
    // Object literals
    ObjectLiteral: true,
    
    // Optional chaining
    OptionalChaining: true,
    
    // String literals
    StringLiteral: true,
    
    // Update operators
    UpdateOperator: true,
  },
  
  // Plugins
  plugins: [
    '@stryker-mutator/core',
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/html-reporter',
    '@stryker-mutator/json-reporter',
  ],
  
  // Reporters
  reporters: [
    'progress',
    'clear-text',
    'html',
    'json',
  ],
  
  // HTML report configuration
  htmlReporter: {
    baseDir: 'mutation-reports/html',
    fileName: 'mutation-report.html',
  },
  
  // JSON report configuration
  jsonReporter: {
    fileName: 'mutation-reports/mutation-report.json',
  },
  
  
  // Test framework configuration
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },
  
  // Threshold configuration
  thresholds: {
    high: 85,
    low: 70,
    break: 60,
  },
  
  // Performance settings
  maxConcurrentTestRunners: 4,
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  dryRunTimeoutMinutes: 5,
  
  // File patterns to ignore
  ignorePatterns: [
    'node_modules',
    '.next',
    'dist',
    'build',
    'coverage',
    'e2e',
    '__tests__/setup',
    '__tests__/fixtures',
    '__tests__/mocks',
  ],
  
  // Incremental mutation testing
  incremental: true,
  incrementalFile: 'mutation-reports/.stryker-tmp/incremental.json',
  
  // Advanced configuration
  symlinkNodeModules: false,
  tempDirName: 'mutation-reports/.stryker-tmp',
  cleanTempDir: true,
  
  // Disable mutants that are known to be problematic
  disableTypeChecks: false,
  checkers: ['typescript'],
  
  // TypeScript configuration
  tsconfigFile: 'tsconfig.json',
  
  // Build command (if needed)
  buildCommand: 'npm run build',
  
  // Custom mutation levels for different file types
  mutationLevels: {
    // Critical business logic - highest mutation testing
    'src/lib/**/*.{ts,tsx}': {
      mutator: {
        ArithmeticOperator: true,
        BooleanLiteral: true,
        ConditionalExpression: true,
        EqualityOperator: true,
        LogicalOperator: true,
        StringLiteral: true,
      },
      threshold: 90,
    },
    
    // API routes - high mutation testing
    'src/app/api/**/*.{ts,tsx}': {
      mutator: {
        ArithmeticOperator: true,
        BooleanLiteral: true,
        ConditionalExpression: true,
        EqualityOperator: true,
        LogicalOperator: true,
      },
      threshold: 85,
    },
    
    // Components - standard mutation testing
    'src/components/**/*.{tsx,ts}': {
      mutator: {
        BooleanLiteral: true,
        ConditionalExpression: true,
        EqualityOperator: true,
        LogicalOperator: true,
      },
      threshold: 80,
    },
    
    // Utilities - high mutation testing
    'src/utils/**/*.{ts,tsx}': {
      mutator: {
        ArithmeticOperator: true,
        BooleanLiteral: true,
        ConditionalExpression: true,
        EqualityOperator: true,
        LogicalOperator: true,
        StringLiteral: true,
        UpdateOperator: true,
      },
      threshold: 95,
    },
  },
  
  // Custom mutant filters
  ignoreMutants: [
    // Ignore console statements
    {
      mutatorName: 'StringLiteral',
      location: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 },
      },
      ignore: 'console.*',
    },
    
    // Ignore test data
    {
      mutatorName: '*',
      fileName: '**/*fixture*',
    },
    
    // Ignore configuration files
    {
      mutatorName: '*',
      fileName: '**/*config*',
    },
  ],
  
  // Environment variables for testing
  env: {
    NODE_ENV: 'test',
    STRYKER_MUTATION_TESTING: 'true',
  },
  
  // Logging configuration
  logLevel: 'info',
  fileLogLevel: 'debug',
  allowConsoleColors: true,
  
  // Webpack configuration (if using custom webpack)
  webpack: {
    configFile: 'webpack.config.js',
  },
  
  // Custom commands
  commands: {
    build: 'npm run build',
    test: 'npm run test',
    'test:unit': 'npm run test:unit',
    'test:integration': 'npm run test:integration',
  },
}