/**
 * Environment Setup for Sleeper API Testing
 * 
 * Sets up environment variables and configuration needed for testing.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JEST_TIMEOUT = '300000'; // 5 minutes

// Mock environment variables for testing
process.env.SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';
process.env.TEST_MODE = 'true';
process.env.ENABLE_MOCKS = 'true';

// Disable external API calls during testing
process.env.DISABLE_EXTERNAL_APIS = 'true';

// Testing framework configuration
process.env.TESTING_FRAMEWORK = 'sleeper-comprehensive';
process.env.TEST_DATA_SEED = '42';

// Mock Redis for caching tests
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CACHE_ENABLED = 'true';

// Performance testing configuration
process.env.PERFORMANCE_TEST_DURATION = '10000'; // 10 seconds
process.env.MAX_CONCURRENT_REQUESTS = '50';
process.env.RATE_LIMIT_WINDOW = '60000'; // 1 minute

console.log('🔧 Environment configured for Sleeper API testing');
console.log(`📊 Test mode: ${process.env.TEST_MODE}`);
console.log(`🎭 Mocks enabled: ${process.env.ENABLE_MOCKS}`);
console.log(`⏱️ Test timeout: ${process.env.JEST_TIMEOUT}ms`);