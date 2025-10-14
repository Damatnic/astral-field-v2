/**
 * Zenith Load Testing Suite for Authentication
 * Tests authentication endpoints under load
 */

import fetch from 'node-fetch'
import { performance } from 'perf_hooks'

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  requestsPerSecond: number
  errorRate: number
  p95ResponseTime: number
  p99ResponseTime: number
}

interface LoadTestConfig {
  concurrent: number
  duration: number // in seconds
  endpoint: string
  method: string
  payload?: any
  headers?: Record<string, string>
}

class ZenithLoadTester {
  private results: number[] = []
  private errors: Error[] = []
  private baseUrl: string

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const { concurrent, duration, endpoint, method, payload, headers } = config
    
    console.log(`Starting load test: ${concurrent} concurrent requests for ${duration}s`)
    console.log(`Target: ${method} ${this.baseUrl}${endpoint}`)

    const startTime = performance.now()
    const endTime = startTime + (duration * 1000)
    
    this.results = []
    this.errors = []

    const workers = Array.from({ length: concurrent }, () => 
      this.createWorker(endTime, endpoint, method, payload, headers)
    )

    await Promise.all(workers)

    const totalTime = (performance.now() - startTime) / 1000
    
    return this.calculateResults(totalTime)
  }

  private async createWorker(
    endTime: number,
    endpoint: string,
    method: string,
    payload?: any,
    headers?: Record<string, string>
  ): Promise<void> {
    while (performance.now() < endTime) {
      try {
        const requestStart = performance.now()
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: payload ? JSON.stringify(payload) : undefined
        })

        const requestTime = performance.now() - requestStart
        
        if (response.ok) {
          this.results.push(requestTime)
        } else {
          this.errors.push(new Error(`HTTP ${response.status}: ${response.statusText}`))
        }
      } catch (error) {
        this.errors.push(error as Error)
      }

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  private calculateResults(totalTime: number): LoadTestResult {
    const sortedResults = this.results.sort((a, b) => a - b)
    const totalRequests = this.results.length + this.errors.length
    
    return {
      totalRequests,
      successfulRequests: this.results.length,
      failedRequests: this.errors.length,
      averageResponseTime: this.results.reduce((sum, time) => sum + time, 0) / this.results.length || 0,
      maxResponseTime: Math.max(...this.results) || 0,
      minResponseTime: Math.min(...this.results) || 0,
      requestsPerSecond: totalRequests / totalTime,
      errorRate: (this.errors.length / totalRequests) * 100,
      p95ResponseTime: sortedResults[Math.floor(sortedResults.length * 0.95)] || 0,
      p99ResponseTime: sortedResults[Math.floor(sortedResults.length * 0.99)] || 0
    }
  }
}

describe('Authentication Load Tests', () => {
  const loadTester = new ZenithLoadTester()
  
  beforeAll(async () => {
    // Ensure server is running
    try {
      const response = await fetch('http://localhost:3000/api/health')
      if (!response.ok) {
        throw new Error('Server not accessible')
      }
    } catch (error) {
      console.warn('Server may not be running for load tests')
    }
  })

  describe('Sign-in Endpoint Load Testing', () => {
    test('should handle 10 concurrent sign-in requests', async () => {
      const result = await loadTester.runLoadTest({
        concurrent: 10,
        duration: 30, // 30 seconds
        endpoint: '/api/auth/callback/credentials',
        method: 'POST',
        payload: {
          email: 'test@astralfield.com',
          password: 'TestPassword123!'
        }
      })

      // Performance assertions
      expect(result.errorRate).toBeLessThan(5) // Less than 5% error rate
      expect(result.averageResponseTime).toBeLessThan(1000) // Under 1 second average
      expect(result.p95ResponseTime).toBeLessThan(2000) // 95th percentile under 2 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(5) // At least 5 RPS

      console.log('Sign-in Load Test Results:', result)
    }, 60000)

    test('should handle burst traffic', async () => {
      const result = await loadTester.runLoadTest({
        concurrent: 25,
        duration: 15, // 15 seconds burst
        endpoint: '/api/auth/callback/credentials',
        method: 'POST',
        payload: {
          email: 'test@astralfield.com',
          password: 'TestPassword123!'
        }
      })

      // Burst traffic should be handled gracefully
      expect(result.errorRate).toBeLessThan(10) // Higher tolerance for burst
      expect(result.averageResponseTime).toBeLessThan(3000) // 3 second tolerance
      expect(result.requestsPerSecond).toBeGreaterThan(3) // Minimum throughput

      console.log('Burst Traffic Test Results:', result)
    }, 30000)
  })

  describe('Session Endpoint Load Testing', () => {
    test('should handle session validation requests efficiently', async () => {
      const result = await loadTester.runLoadTest({
        concurrent: 20,
        duration: 20,
        endpoint: '/api/auth/session',
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=mock-session-token'
        }
      })

      // Session checks should be very fast
      expect(result.errorRate).toBeLessThan(2) // Very low error rate for sessions
      expect(result.averageResponseTime).toBeLessThan(200) // Very fast response
      expect(result.p99ResponseTime).toBeLessThan(500) // Even 99th percentile should be fast
      expect(result.requestsPerSecond).toBeGreaterThan(50) // High throughput for sessions

      console.log('Session Load Test Results:', result)
    }, 40000)
  })

  describe('Registration Endpoint Load Testing', () => {
    test('should handle concurrent registration attempts', async () => {
      const result = await loadTester.runLoadTest({
        concurrent: 5, // Lower concurrency for registration
        duration: 20,
        endpoint: '/api/auth/register',
        method: 'POST',
        payload: {
          email: `test${Date.now()}@astralfield.com`,
          password: 'TestPassword123!',
          name: 'Load Test User'
        }
      })

      // Registration should be reliable but can be slower
      expect(result.errorRate).toBeLessThan(15) // Allow for higher error rate (duplicate emails)
      expect(result.averageResponseTime).toBeLessThan(2000) // 2 second tolerance
      expect(result.requestsPerSecond).toBeGreaterThan(2) // Minimum throughput

      console.log('Registration Load Test Results:', result)
    }, 45000)
  })

  describe('Password Reset Load Testing', () => {
    test('should handle password reset requests without blocking', async () => {
      const result = await loadTester.runLoadTest({
        concurrent: 8,
        duration: 15,
        endpoint: '/api/auth/forgot-password',
        method: 'POST',
        payload: {
          email: 'test@astralfield.com'
        }
      })

      // Password reset should be throttled but not fail
      expect(result.errorRate).toBeLessThan(20) // Allow for rate limiting
      expect(result.averageResponseTime).toBeLessThan(1500) // Reasonable response time
      expect(result.requestsPerSecond).toBeGreaterThan(3) // Minimum throughput

      console.log('Password Reset Load Test Results:', result)
    }, 30000)
  })

  describe('Performance Under Different Scenarios', () => {
    test('should maintain performance with mixed auth operations', async () => {
      const signInPromise = loadTester.runLoadTest({
        concurrent: 5,
        duration: 25,
        endpoint: '/api/auth/callback/credentials',
        method: 'POST',
        payload: {
          email: 'test@astralfield.com',
          password: 'TestPassword123!'
        }
      })

      const sessionPromise = loadTester.runLoadTest({
        concurrent: 15,
        duration: 25,
        endpoint: '/api/auth/session',
        method: 'GET'
      })

      const [signInResult, sessionResult] = await Promise.all([signInPromise, sessionPromise])

      // Both operations should perform well simultaneously
      expect(signInResult.errorRate).toBeLessThan(8)
      expect(sessionResult.errorRate).toBeLessThan(3)
      expect(signInResult.averageResponseTime).toBeLessThan(1500)
      expect(sessionResult.averageResponseTime).toBeLessThan(300)

      console.log('Mixed Operations Results:')
      console.log('Sign-in:', signInResult)
      console.log('Session:', sessionResult)
    }, 60000)

    test('should recover gracefully from overload', async () => {
      // Simulate overload
      const overloadResult = await loadTester.runLoadTest({
        concurrent: 50, // High load
        duration: 10,
        endpoint: '/api/auth/session',
        method: 'GET'
      })

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Test normal load after overload
      const recoveryResult = await loadTester.runLoadTest({
        concurrent: 10,
        duration: 10,
        endpoint: '/api/auth/session',
        method: 'GET'
      })

      // Should recover to normal performance
      expect(recoveryResult.errorRate).toBeLessThan(overloadResult.errorRate)
      expect(recoveryResult.averageResponseTime).toBeLessThan(overloadResult.averageResponseTime * 1.5)

      console.log('Overload Recovery Test:')
      console.log('During overload:', overloadResult)
      console.log('After recovery:', recoveryResult)
    }, 45000)
  })

  describe('Database Performance Under Load', () => {
    test('should maintain database performance during auth load', async () => {
      // Test database-heavy operations
      const result = await loadTester.runLoadTest({
        concurrent: 15,
        duration: 20,
        endpoint: '/api/auth/session',
        method: 'GET'
      })

      // Database operations should remain efficient
      expect(result.p95ResponseTime).toBeLessThan(800) // 95th percentile under 800ms
      expect(result.requestsPerSecond).toBeGreaterThan(15) // Good throughput
      
      // Monitor for potential database bottlenecks
      if (result.p99ResponseTime > 2000) {
        console.warn('Potential database bottleneck detected:', result)
      }

      console.log('Database Performance Results:', result)
    }, 40000)
  })

  describe('Memory and Resource Usage', () => {
    test('should not cause memory leaks under sustained load', async () => {
      // Run sustained load test
      const results = []
      
      for (let i = 0; i < 3; i++) {
        const result = await loadTester.runLoadTest({
          concurrent: 10,
          duration: 15,
          endpoint: '/api/auth/session',
          method: 'GET'
        })
        
        results.push(result)
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Performance should not degrade significantly over time
      const firstResult = results[0]
      const lastResult = results[results.length - 1]
      
      expect(lastResult.averageResponseTime).toBeLessThan(firstResult.averageResponseTime * 1.5)
      expect(lastResult.errorRate).toBeLessThan(firstResult.errorRate + 5)

      console.log('Sustained Load Results:')
      results.forEach((result, index) => {
        console.log(`Round ${index + 1}:`, {
          avgResponse: result.averageResponseTime,
          errorRate: result.errorRate,
          rps: result.requestsPerSecond
        })
      })
    }, 120000)
  })
})

// Export for use in other test files
export { ZenithLoadTester, LoadTestResult, LoadTestConfig }
