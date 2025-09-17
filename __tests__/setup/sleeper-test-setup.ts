/**
 * Sleeper API Testing Framework Setup
 * 
 * Global setup and configuration for the Sleeper API testing framework.
 * This file is run before all tests and sets up the testing environment.
 */

import { jest } from '@jest/globals';
import { SleeperApiMocks } from '../mocks/sleeperApiMocks';
import { TestDataFactories } from '../factories/testDataFactories';

// Extend Jest matchers for better assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSleeperPlayer(): R;
      toBeValidSleeperLeague(): R;
      toHaveValidationScore(min: number): R;
      toBeWithinResponseTime(maxTime: number): R;
    }
  }
}

// Custom Jest matchers for Sleeper API testing
expect.extend({
  toBeValidSleeperPlayer(received) {
    const isValid = received && 
                   received.player_id && 
                   received.full_name && 
                   received.position && 
                   received.team;
    
    return {
      message: () => `Expected ${received} to be a valid Sleeper player`,
      pass: isValid
    };
  },

  toBeValidSleeperLeague(received) {
    const isValid = received && 
                   received.league_id && 
                   received.name && 
                   received.total_rosters > 0 && 
                   received.scoring_settings &&
                   received.roster_positions;
    
    return {
      message: () => `Expected ${received} to be a valid Sleeper league`,
      pass: isValid
    };
  },

  toHaveValidationScore(received, min) {
    const hasValidScore = received && 
                         typeof received.score === 'number' && 
                         received.score >= min && 
                         received.score <= 100;
    
    return {
      message: () => `Expected validation score ${received?.score} to be >= ${min}`,
      pass: hasValidScore
    };
  },

  toBeWithinResponseTime(received, maxTime) {
    const isWithinTime = typeof received === 'number' && received <= maxTime;
    
    return {
      message: () => `Expected response time ${received}ms to be <= ${maxTime}ms`,
      pass: isWithinTime
    };
  }
});

// Global test setup
beforeAll(async () => {
  console.log('🔧 Setting up Sleeper API Testing Framework...');
  
  // Initialize test data with reproducible seed
  TestDataFactories.setSeed(42);
  
  // Configure mocks for testing
  SleeperApiMocks.reset();
  SleeperApiMocks.configure({
    enableNetworkDelay: true,
    averageDelay: 50, // Faster for tests
    errorRate: 0.02, // 2% error rate
    rateLimitSimulation: true,
    maxRequestsPerMinute: 1000,
    includeInconsistentData: false,
    cacheSimulation: true
  });
  
  // Setup Jest mocks
  SleeperApiMocks.setupJestMocks();
  
  console.log('✅ Testing framework setup completed');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up Sleeper API Testing Framework...');
  
  // Reset all mocks
  SleeperApiMocks.reset();
  jest.clearAllMocks();
  
  console.log('✅ Testing framework cleanup completed');
});

// Global error handler for uncaught exceptions during tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Suppress console output during tests unless VERBOSE is set
if (!process.env.VERBOSE) {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    // Keep warn and error for debugging
  });
  
  afterEach(() => {
    Object.assign(console, originalConsole);
  });
}

// Test utilities available globally
(global as any).testUtils = {
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate test IDs
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Helper to create test timeouts
  withTimeout: async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    
    return Promise.race([promise, timeout]);
  },
  
  // Helper to retry operations
  retry: async <T>(
    operation: () => Promise<T>, 
    maxAttempts: number = 3, 
    delay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
};

// Export setup utilities for use in individual tests
export const setupUtils = {
  configureSlowTests: () => {
    SleeperApiMocks.configure({
      enableNetworkDelay: true,
      averageDelay: 500,
      errorRate: 0.05
    });
  },
  
  configureFastTests: () => {
    SleeperApiMocks.configure({
      enableNetworkDelay: false,
      averageDelay: 10,
      errorRate: 0.01
    });
  },
  
  configureErrorTests: () => {
    SleeperApiMocks.configure({
      errorRate: 0.3, // 30% error rate
      rateLimitSimulation: true,
      maxRequestsPerMinute: 10 // Low limit for testing
    });
  },
  
  resetToDefaults: () => {
    SleeperApiMocks.reset();
    SleeperApiMocks.configure({
      enableNetworkDelay: true,
      averageDelay: 50,
      errorRate: 0.02,
      rateLimitSimulation: true,
      maxRequestsPerMinute: 1000,
      includeInconsistentData: false,
      cacheSimulation: true
    });
  }
};