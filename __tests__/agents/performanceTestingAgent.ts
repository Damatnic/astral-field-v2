/**
 * Performance Testing Agent
 * 
 * Specialized testing agent for validating Sleeper API performance characteristics,
 * load testing, rate limiting behavior, and memory/caching efficiency.
 * 
 * Features:
 * - Load testing with configurable concurrent users
 * - Rate limiting validation (1000 calls/minute)
 * - Response time measurement and analysis
 * - Memory usage monitoring during large dataset operations
 * - Cache hit ratio and efficiency testing
 * - Stress testing and breaking point detection
 */

import { SleeperApiService } from '@/services/sleeper/sleeperApiService';
import { performance } from 'perf_hooks';

export interface PerformanceTestResult {
  testName: string;
  success: boolean;
  duration: number; // milliseconds
  requestCount: number;
  errors: string[];
  metrics: {
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    throughput: number; // requests per second
    errorRate: number; // percentage
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
    cacheMetrics?: {
      hitRate: number;
      missRate: number;
      size: number;
    };
  };
  metadata: {
    timestamp: Date;
    configuration: any;
    environment: string;
  };
}

export interface LoadTestConfig {
  concurrentUsers: number;
  testDurationMs: number;
  requestsPerUser: number;
  rampUpTimeMs: number;
  endpoints: string[];
  thinkTimeMs: number; // Delay between requests
}

export interface RateLimitTestResult {
  maxRequestsPerMinute: number;
  actualRequestsAchieved: number;
  rateLimitingWorking: boolean;
  firstRateLimitAt: number; // Request number when first rate limited
  averageWaitTime: number; // When rate limited
  details: {
    requestTimes: number[];
    rateLimitedAt: number[];
    waitTimes: number[];
  };
}

export class PerformanceTestingAgent {
  private sleeperApi: SleeperApiService;
  private testResults: PerformanceTestResult[] = [];

  constructor(sleeperApiInstance?: SleeperApiService) {
    this.sleeperApi = sleeperApiInstance || new SleeperApiService();
  }

  /**
   * Comprehensive performance test suite
   */
  async runPerformanceTestSuite(): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    console.log('🚀 Starting Performance Test Suite...');

    // 1. Basic response time test
    results.push(await this.testResponseTimes());

    // 2. Rate limiting test
    results.push(await this.testRateLimiting());

    // 3. Load test with concurrent users
    results.push(await this.testConcurrentLoad());

    // 4. Memory usage test
    results.push(await this.testMemoryUsage());

    // 5. Cache efficiency test
    results.push(await this.testCacheEfficiency());

    // 6. Stress test (find breaking point)
    results.push(await this.testStressLimits());

    this.testResults.push(...results);
    return results;
  }

  /**
   * Test basic response times for various endpoints
   */
  private async testResponseTimes(): Promise<PerformanceTestResult> {
    const testName = 'Response Time Analysis';
    const startTime = performance.now();
    const responseTimes: number[] = [];
    const errors: string[] = [];
    let requestCount = 0;

    const endpoints = [
      () => this.sleeperApi.getNFLState(),
      () => this.sleeperApi.getAllPlayers(),
      () => this.sleeperApi.getTrendingPlayers('add', 24, 25),
      () => this.sleeperApi.getPlayerStats('2024', 1)
    ];

    try {
      for (const endpoint of endpoints) {
        for (let i = 0; i < 5; i++) { // 5 requests per endpoint
          const requestStart = performance.now();
          try {
            await endpoint();
            const responseTime = performance.now() - requestStart;
            responseTimes.push(responseTime);
            requestCount++;
          } catch (error) {
            errors.push(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            requestCount++;
          }
        }
        
        // Small delay between endpoint tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      errors.push(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      testName,
      success: errors.length === 0,
      duration,
      requestCount,
      errors,
      metrics: {
        avgResponseTime,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        throughput: requestCount > 0 ? (requestCount / duration) * 1000 : 0,
        errorRate: requestCount > 0 ? (errors.length / requestCount) * 100 : 0
      },
      metadata: {
        timestamp: new Date(),
        configuration: { endpoints: endpoints.length, requestsPerEndpoint: 5 },
        environment: 'test'
      }
    };
  }

  /**
   * Test rate limiting behavior (1000 requests/minute)
   */
  private async testRateLimiting(): Promise<PerformanceTestResult> {
    const testName = 'Rate Limiting Validation';
    const startTime = performance.now();
    const errors: string[] = [];
    const requestTimes: number[] = [];
    const rateLimitedAt: number[] = [];
    const waitTimes: number[] = [];
    let requestCount = 0;
    let rateLimitingDetected = false;

    try {
      // Create a new service instance with known rate limits for testing
      const testService = new SleeperApiService({
        rateLimit: { maxRequests: 10, windowMs: 60000 } // Lower limit for testing
      });

      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        const requestStart = performance.now();
        
        try {
          await testService.getNFLState();
          const responseTime = performance.now() - requestStart;
          requestTimes.push(responseTime);
          
          // Check if this request took significantly longer (indicating rate limiting)
          if (responseTime > 1000) { // More than 1 second suggests rate limiting
            rateLimitedAt.push(i);
            waitTimes.push(responseTime);
            rateLimitingDetected = true;
          }
        } catch (error) {
          errors.push(`Request ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        requestCount++;
      }
    } catch (error) {
      errors.push(`Rate limiting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;
    const avgResponseTime = requestTimes.length > 0 
      ? requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length 
      : 0;

    return {
      testName,
      success: rateLimitingDetected && errors.length === 0,
      duration,
      requestCount,
      errors: rateLimitingDetected ? errors : [...errors, 'Rate limiting was not triggered as expected'],
      metrics: {
        avgResponseTime,
        minResponseTime: requestTimes.length > 0 ? Math.min(...requestTimes) : 0,
        maxResponseTime: requestTimes.length > 0 ? Math.max(...requestTimes) : 0,
        throughput: requestCount > 0 ? (requestCount / duration) * 1000 : 0,
        errorRate: requestCount > 0 ? (errors.length / requestCount) * 100 : 0
      },
      metadata: {
        timestamp: new Date(),
        configuration: {
          targetRequests: 15,
          rateLimitExpected: true,
          rateLimitedRequests: rateLimitedAt.length
        },
        environment: 'test'
      }
    };
  }

  /**
   * Test concurrent load with multiple simulated users
   */
  private async testConcurrentLoad(): Promise<PerformanceTestResult> {
    const testName = 'Concurrent Load Test';
    const startTime = performance.now();
    const errors: string[] = [];
    let requestCount = 0;
    const responseTimes: number[] = [];

    const config: LoadTestConfig = {
      concurrentUsers: 5,
      testDurationMs: 10000, // 10 seconds
      requestsPerUser: 5,
      rampUpTimeMs: 2000, // 2 seconds
      endpoints: ['getNFLState', 'getTrendingPlayers'],
      thinkTimeMs: 200
    };

    try {
      const userPromises: Promise<void>[] = [];

      for (let userId = 0; userId < config.concurrentUsers; userId++) {
        const userPromise = this.simulateUser(userId, config, responseTimes, errors);
        userPromises.push(userPromise);
        
        // Ramp up delay
        if (userId < config.concurrentUsers - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, config.rampUpTimeMs / config.concurrentUsers)
          );
        }
      }

      await Promise.all(userPromises);
      requestCount = responseTimes.length + errors.length;
    } catch (error) {
      errors.push(`Load test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      testName,
      success: errors.length < requestCount * 0.1, // Success if < 10% error rate
      duration,
      requestCount,
      errors,
      metrics: {
        avgResponseTime,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        throughput: requestCount > 0 ? (requestCount / duration) * 1000 : 0,
        errorRate: requestCount > 0 ? (errors.length / requestCount) * 100 : 0
      },
      metadata: {
        timestamp: new Date(),
        configuration: config,
        environment: 'test'
      }
    };
  }

  /**
   * Simulate a single user making requests
   */
  private async simulateUser(
    userId: number, 
    config: LoadTestConfig, 
    responseTimes: number[], 
    errors: string[]
  ): Promise<void> {
    for (let request = 0; request < config.requestsPerUser; request++) {
      try {
        const requestStart = performance.now();
        
        // Randomly select an endpoint
        const endpointIndex = Math.floor(Math.random() * config.endpoints.length);
        const endpoint = config.endpoints[endpointIndex];
        
        switch (endpoint) {
          case 'getNFLState':
            await this.sleeperApi.getNFLState();
            break;
          case 'getTrendingPlayers':
            await this.sleeperApi.getTrendingPlayers('add', 24, 10);
            break;
          default:
            await this.sleeperApi.getNFLState();
        }
        
        const responseTime = performance.now() - requestStart;
        responseTimes.push(responseTime);
        
        // Think time between requests
        if (request < config.requestsPerUser - 1) {
          await new Promise(resolve => setTimeout(resolve, config.thinkTimeMs));
        }
      } catch (error) {
        errors.push(`User ${userId} request ${request} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Test memory usage during large data operations
   */
  private async testMemoryUsage(): Promise<PerformanceTestResult> {
    const testName = 'Memory Usage Test';
    const startTime = performance.now();
    const errors: string[] = [];
    let requestCount = 0;

    const getMemoryUsage = () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const mem = process.memoryUsage();
        return {
          used: mem.heapUsed,
          total: mem.heapTotal,
          percentage: (mem.heapUsed / mem.heapTotal) * 100
        };
      }
      return { used: 0, total: 0, percentage: 0 };
    };

    const initialMemory = getMemoryUsage();
    let peakMemory = initialMemory;

    try {
      // Test 1: Load all players (large dataset)
      const memBefore = getMemoryUsage();
      await this.sleeperApi.getAllPlayers();
      const memAfter = getMemoryUsage();
      
      if (memAfter.used > peakMemory.used) {
        peakMemory = memAfter;
      }
      
      requestCount++;

      // Test 2: Multiple rapid requests
      for (let i = 0; i < 10; i++) {
        await this.sleeperApi.getTrendingPlayers('add', 24, 25);
        const currentMem = getMemoryUsage();
        
        if (currentMem.used > peakMemory.used) {
          peakMemory = currentMem;
        }
        
        requestCount++;
      }

      // Test 3: Cache stress test
      for (let i = 0; i < 5; i++) {
        await this.sleeperApi.getNFLState();
        await this.sleeperApi.getAllPlayers();
        const currentMem = getMemoryUsage();
        
        if (currentMem.used > peakMemory.used) {
          peakMemory = currentMem;
        }
        
        requestCount += 2;
      }

    } catch (error) {
      errors.push(`Memory test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;
    const finalMemory = getMemoryUsage();

    return {
      testName,
      success: errors.length === 0 && peakMemory.percentage < 90, // Success if memory usage < 90%
      duration,
      requestCount,
      errors,
      metrics: {
        avgResponseTime: duration / requestCount,
        minResponseTime: 0,
        maxResponseTime: 0,
        throughput: requestCount > 0 ? (requestCount / duration) * 1000 : 0,
        errorRate: requestCount > 0 ? (errors.length / requestCount) * 100 : 0,
        memoryUsage: {
          used: peakMemory.used,
          total: peakMemory.total,
          percentage: peakMemory.percentage
        }
      },
      metadata: {
        timestamp: new Date(),
        configuration: {
          initialMemory,
          peakMemory,
          finalMemory,
          memoryIncrease: finalMemory.used - initialMemory.used
        },
        environment: 'test'
      }
    };
  }

  /**
   * Test cache efficiency and hit ratios
   */
  private async testCacheEfficiency(): Promise<PerformanceTestResult> {
    const testName = 'Cache Efficiency Test';
    const startTime = performance.now();
    const errors: string[] = [];
    let requestCount = 0;
    const responseTimes: number[] = [];

    try {
      // Clear cache to start fresh
      await this.sleeperApi.clearCache();

      // Test 1: Cold cache (first requests)
      const coldCacheStart = performance.now();
      await this.sleeperApi.getNFLState();
      const coldCacheTime = performance.now() - coldCacheStart;
      responseTimes.push(coldCacheTime);
      requestCount++;

      // Test 2: Warm cache (repeat same request)
      const warmCacheStart = performance.now();
      await this.sleeperApi.getNFLState();
      const warmCacheTime = performance.now() - warmCacheStart;
      responseTimes.push(warmCacheTime);
      requestCount++;

      // Test 3: Multiple cached requests
      for (let i = 0; i < 5; i++) {
        const cacheTestStart = performance.now();
        await this.sleeperApi.getNFLState();
        const cacheTestTime = performance.now() - cacheTestStart;
        responseTimes.push(cacheTestTime);
        requestCount++;
      }

      // Test 4: Different endpoint (should be cold)
      const newEndpointStart = performance.now();
      await this.sleeperApi.getTrendingPlayers('add', 24, 25);
      const newEndpointTime = performance.now() - newEndpointStart;
      responseTimes.push(newEndpointTime);
      requestCount++;

      // Calculate cache efficiency
      const cacheHitThreshold = coldCacheTime * 0.5; // Cached requests should be < 50% of cold cache time
      const cachedRequests = responseTimes.slice(1, 6); // Requests 2-6 should be cached
      const cacheHits = cachedRequests.filter(time => time < cacheHitThreshold).length;
      const cacheHitRate = (cacheHits / cachedRequests.length) * 100;

    } catch (error) {
      errors.push(`Cache efficiency test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate cache metrics
    const cacheHitThreshold = responseTimes[0] * 0.5;
    const cachedRequests = responseTimes.slice(1, 6);
    const cacheHits = cachedRequests.filter(time => time < cacheHitThreshold).length;
    const cacheHitRate = cachedRequests.length > 0 ? (cacheHits / cachedRequests.length) * 100 : 0;
    const cacheMissRate = 100 - cacheHitRate;

    return {
      testName,
      success: errors.length === 0 && cacheHitRate > 60, // Success if cache hit rate > 60%
      duration,
      requestCount,
      errors,
      metrics: {
        avgResponseTime,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        throughput: requestCount > 0 ? (requestCount / duration) * 1000 : 0,
        errorRate: requestCount > 0 ? (errors.length / requestCount) * 100 : 0,
        cacheMetrics: {
          hitRate: cacheHitRate,
          missRate: cacheMissRate,
          size: this.sleeperApi.getUsageStats().cacheSize
        }
      },
      metadata: {
        timestamp: new Date(),
        configuration: {
          cacheHitThreshold,
          coldCacheTime: responseTimes[0] || 0,
          avgCachedTime: cachedRequests.length > 0 
            ? cachedRequests.reduce((sum, time) => sum + time, 0) / cachedRequests.length 
            : 0
        },
        environment: 'test'
      }
    };
  }

  /**
   * Stress test to find breaking points
   */
  private async testStressLimits(): Promise<PerformanceTestResult> {
    const testName = 'Stress Limit Test';
    const startTime = performance.now();
    const errors: string[] = [];
    let requestCount = 0;
    const responseTimes: number[] = [];
    let breakingPoint = 0;

    try {
      // Gradually increase load until we find the breaking point
      const stressLevels = [1, 2, 5, 10, 20];
      
      for (const concurrentRequests of stressLevels) {
        const levelStart = performance.now();
        const promises: Promise<void>[] = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
          const promise = (async () => {
            try {
              const requestStart = performance.now();
              await this.sleeperApi.getNFLState();
              const responseTime = performance.now() - requestStart;
              responseTimes.push(responseTime);
            } catch (error) {
              errors.push(`Stress test request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          })();
          promises.push(promise);
        }
        
        await Promise.all(promises);
        requestCount += concurrentRequests;
        
        const levelDuration = performance.now() - levelStart;
        const errorRateForLevel = (errors.length / requestCount) * 100;
        const avgResponseTimeForLevel = responseTimes.length > 0 
          ? responseTimes.slice(-concurrentRequests).reduce((sum, time) => sum + time, 0) / concurrentRequests
          : 0;
        
        // Consider breaking point if error rate > 20% or avg response time > 10 seconds
        if (errorRateForLevel > 20 || avgResponseTimeForLevel > 10000) {
          breakingPoint = concurrentRequests;
          break;
        }
        
        // Small delay between stress levels
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      errors.push(`Stress test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      testName,
      success: errors.length < requestCount * 0.2, // Success if error rate < 20%
      duration,
      requestCount,
      errors,
      metrics: {
        avgResponseTime,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        throughput: requestCount > 0 ? (requestCount / duration) * 1000 : 0,
        errorRate: requestCount > 0 ? (errors.length / requestCount) * 100 : 0
      },
      metadata: {
        timestamp: new Date(),
        configuration: {
          stressLevels: [1, 2, 5, 10, 20],
          breakingPoint: breakingPoint || 'Not reached',
          maxConcurrentTested: Math.max(...[1, 2, 5, 10, 20])
        },
        environment: 'test'
      }
    };
  }

  /**
   * Test specific rate limiting behavior
   */
  async testRateLimitingBehavior(): Promise<RateLimitTestResult> {
    const requestTimes: number[] = [];
    const rateLimitedAt: number[] = [];
    const waitTimes: number[] = [];
    
    const testStart = Date.now();
    let requestsMade = 0;
    let firstRateLimit = -1;
    
    try {
      // Create a test service with known limits
      const testService = new SleeperApiService({
        rateLimit: { maxRequests: 5, windowMs: 60000 } // 5 requests per minute for testing
      });
      
      // Make rapid requests
      for (let i = 0; i < 10; i++) {
        const requestStart = performance.now();
        
        try {
          await testService.getNFLState();
          const responseTime = performance.now() - requestStart;
          requestTimes.push(responseTime);
          
          if (responseTime > 1000 && firstRateLimit === -1) {
            firstRateLimit = i;
            rateLimitedAt.push(i);
            waitTimes.push(responseTime - 1000); // Subtract normal response time
          }
        } catch (error) {
          // Rate limiting might cause errors
        }
        
        requestsMade++;
      }
    } catch (error) {
      console.warn('Rate limiting test error:', error);
    }
    
    const avgWaitTime = waitTimes.length > 0 
      ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length 
      : 0;
    
    return {
      maxRequestsPerMinute: 5,
      actualRequestsAchieved: requestsMade,
      rateLimitingWorking: firstRateLimit > -1,
      firstRateLimitAt: firstRateLimit,
      averageWaitTime: avgWaitTime,
      details: {
        requestTimes,
        rateLimitedAt,
        waitTimes
      }
    };
  }

  /**
   * Get performance test history
   */
  getTestHistory(): PerformanceTestResult[] {
    return [...this.testResults];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalTests: number;
    successRate: number;
    avgResponseTime: number;
    avgThroughput: number;
    avgErrorRate: number;
  } {
    if (this.testResults.length === 0) {
      return {
        totalTests: 0,
        successRate: 0,
        avgResponseTime: 0,
        avgThroughput: 0,
        avgErrorRate: 0
      };
    }

    const successfulTests = this.testResults.filter(result => result.success).length;
    const successRate = (successfulTests / this.testResults.length) * 100;
    
    const avgResponseTime = this.testResults.reduce((sum, result) => 
      sum + result.metrics.avgResponseTime, 0) / this.testResults.length;
    
    const avgThroughput = this.testResults.reduce((sum, result) => 
      sum + result.metrics.throughput, 0) / this.testResults.length;
    
    const avgErrorRate = this.testResults.reduce((sum, result) => 
      sum + result.metrics.errorRate, 0) / this.testResults.length;

    return {
      totalTests: this.testResults.length,
      successRate,
      avgResponseTime,
      avgThroughput,
      avgErrorRate
    };
  }

  /**
   * Export performance report
   */
  exportPerformanceReport(): string {
    const summary = this.getPerformanceSummary();
    const latest = this.testResults[this.testResults.length - 1];

    return `
# Sleeper API Performance Test Report

**Generated**: ${new Date().toISOString()}
**Total Tests**: ${summary.totalTests}
**Success Rate**: ${summary.successRate.toFixed(1)}%

## Performance Metrics Summary
- **Average Response Time**: ${summary.avgResponseTime.toFixed(2)}ms
- **Average Throughput**: ${summary.avgThroughput.toFixed(2)} req/s
- **Average Error Rate**: ${summary.avgErrorRate.toFixed(2)}%

## Recent Test Results
${this.testResults.slice(-5).map(result => `
### ${result.testName}
- **Status**: ${result.success ? 'PASS' : 'FAIL'}
- **Duration**: ${result.duration.toFixed(2)}ms
- **Requests**: ${result.requestCount}
- **Avg Response**: ${result.metrics.avgResponseTime.toFixed(2)}ms
- **Throughput**: ${result.metrics.throughput.toFixed(2)} req/s
- **Error Rate**: ${result.metrics.errorRate.toFixed(2)}%
${result.errors.length > 0 ? `- **Errors**: ${result.errors.slice(0, 3).join(', ')}` : ''}
`).join('\n')}

## Recommendations
${summary.avgResponseTime > 5000 ? '- ⚠️ High response times detected. Consider optimizing API calls or caching.' : '- ✅ Response times are within acceptable limits.'}
${summary.avgErrorRate > 5 ? '- ⚠️ High error rate detected. Investigate API reliability.' : '- ✅ Error rates are within acceptable limits.'}
${summary.successRate < 80 ? '- ⚠️ Low success rate. Review test configurations and API health.' : '- ✅ Test success rate is acceptable.'}
    `.trim();
  }
}