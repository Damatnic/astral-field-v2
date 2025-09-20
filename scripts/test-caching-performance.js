/**
 * Comprehensive Caching and Performance Test Suite
 * Tests web page caching, API response times, and overall performance
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configuration
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD: 2000, // 2 seconds max for page load
  API_RESPONSE: 1000, // 1 second max for API response
  CACHE_HIT: 100, // 100ms max for cache hit
  LIGHTHOUSE_SCORE: 70, // Minimum performance score
};

const TEST_ENDPOINTS = [
  { path: '/', name: 'Home Page', cacheable: true },
  { path: '/dashboard', name: 'Dashboard', cacheable: true },
  { path: '/api/league', name: 'League API', cacheable: true },
  { path: '/api/players', name: 'Players API', cacheable: true },
  { path: '/api/teams', name: 'Teams API', cacheable: true },
  { path: '/api/matchups', name: 'Matchups API', cacheable: true },
  { path: '/api/analytics', name: 'Analytics API', cacheable: true },
];

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.cacheResults = [];
  }

  async measureResponse(url, name) {
    const start = performance.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AstralField-Performance-Test/1.0'
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      const result = {
        name,
        url,
        status: response.status,
        duration: Math.round(duration),
        success: response.ok,
        cacheHeaders: {
          cacheControl: response.headers.get('cache-control'),
          etag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'),
          expires: response.headers.get('expires'),
        },
        contentLength: response.headers.get('content-length'),
        timestamp: new Date().toISOString(),
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      const result = {
        name,
        url,
        status: 0,
        duration: Math.round(duration),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      
      this.results.push(result);
      return result;
    }
  }

  async testCaching(url, name) {
    console.log(`🧪 Testing caching for ${name}...`);
    
    // First request (cache miss)
    const firstRequest = await this.measureResponse(url, `${name} (First)`);
    
    // Wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Second request (should be cache hit)
    const secondRequest = await this.measureResponse(url, `${name} (Cached)`);
    
    const cacheResult = {
      endpoint: name,
      firstRequestTime: firstRequest.duration,
      secondRequestTime: secondRequest.duration,
      cacheEfficiency: firstRequest.duration > 0 ? 
        ((firstRequest.duration - secondRequest.duration) / firstRequest.duration * 100) : 0,
      hasCacheHeaders: !!firstRequest.cacheHeaders?.cacheControl,
      cacheControl: firstRequest.cacheHeaders?.cacheControl,
    };
    
    this.cacheResults.push(cacheResult);
    
    console.log(`   First request: ${firstRequest.duration}ms`);
    console.log(`   Second request: ${secondRequest.duration}ms`);
    console.log(`   Cache efficiency: ${cacheResult.cacheEfficiency.toFixed(1)}%`);
    console.log(`   Cache headers: ${cacheResult.hasCacheHeaders ? '✅' : '❌'}`);
    
    return cacheResult;
  }

  getStats() {
    const successfulRequests = this.results.filter(r => r.success);
    const failedRequests = this.results.filter(r => !r.success);
    
    if (successfulRequests.length === 0) {
      return {
        totalRequests: this.results.length,
        successRate: 0,
        averageResponseTime: 0,
        failedRequests: failedRequests.length,
      };
    }
    
    const totalResponseTime = successfulRequests.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      totalRequests: this.results.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: (successfulRequests.length / this.results.length) * 100,
      averageResponseTime: Math.round(totalResponseTime / successfulRequests.length),
      fastestResponse: Math.min(...successfulRequests.map(r => r.duration)),
      slowestResponse: Math.max(...successfulRequests.map(r => r.duration)),
      cacheResults: this.cacheResults,
    };
  }
}

// Authentication helper
async function authenticate() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nicholas@astralfield.com',
        password: 'Dynasty2025!'
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.sessionId;
    } else {
      console.log('⚠️  Authentication failed, testing without session');
      return null;
    }
  } catch (error) {
    console.log('⚠️  Authentication error, testing without session');
    return null;
  }
}

// Load testing
async function runLoadTest(url, concurrency = 5, duration = 10000) {
  console.log(`🚀 Running load test for ${url}...`);
  console.log(`   Concurrency: ${concurrency} users`);
  console.log(`   Duration: ${duration}ms`);
  
  const startTime = Date.now();
  const requests = [];
  let requestCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Create concurrent workers
  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() - startTime < duration) {
      try {
        const start = performance.now();
        const response = await fetch(url);
        const end = performance.now();
        
        requestCount++;
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
        
        requests.push(end - start);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        requestCount++;
        errorCount++;
      }
    }
  });
  
  await Promise.all(workers);
  
  const avgResponseTime = requests.length > 0 ? 
    requests.reduce((sum, time) => sum + time, 0) / requests.length : 0;
  
  return {
    totalRequests: requestCount,
    successfulRequests: successCount,
    errorRequests: errorCount,
    averageResponseTime: Math.round(avgResponseTime),
    requestsPerSecond: Math.round(requestCount / (duration / 1000)),
    successRate: (successCount / requestCount) * 100,
  };
}

// Main test function
async function runPerformanceTests() {
  console.log('🚀 ASTRAL FIELD - CACHING & PERFORMANCE TEST SUITE');
  console.log('====================================================\\n');
  console.log(`🌐 Testing against: ${BASE_URL}\\n`);
  
  const monitor = new PerformanceMonitor();
  
  // Authenticate
  console.log('🔐 Authenticating...');
  const sessionId = await authenticate();
  console.log(sessionId ? '✅ Authenticated successfully\\n' : '⚠️  Testing without authentication\\n');
  
  // Test each endpoint for caching
  console.log('📊 CACHING PERFORMANCE TESTS');
  console.log('==============================\\n');
  
  for (const endpoint of TEST_ENDPOINTS) {
    const url = `${BASE_URL}${endpoint.path}`;
    
    if (endpoint.cacheable) {
      await monitor.testCaching(url, endpoint.name);
      console.log('');
    } else {
      await monitor.measureResponse(url, endpoint.name);
    }
  }
  
  // Run load tests on critical endpoints
  console.log('⚡ LOAD TESTING');
  console.log('================\\n');
  
  const loadTestResults = [];
  
  const criticalEndpoints = [
    `${BASE_URL}/`,
    `${BASE_URL}/api/league`,
    `${BASE_URL}/api/players`,
  ];
  
  for (const url of criticalEndpoints) {
    const result = await runLoadTest(url, 3, 5000); // 3 concurrent users for 5 seconds
    loadTestResults.push({ url, ...result });
    
    console.log(`📈 Results for ${url}:`);
    console.log(`   Total requests: ${result.totalRequests}`);
    console.log(`   Success rate: ${result.successRate.toFixed(1)}%`);
    console.log(`   Avg response time: ${result.averageResponseTime}ms`);
    console.log(`   Requests per second: ${result.requestsPerSecond}\\n`);
  }
  
  // Generate comprehensive report
  console.log('📋 COMPREHENSIVE PERFORMANCE REPORT');
  console.log('=====================================\\n');
  
  const stats = monitor.getStats();
  
  console.log('🎯 OVERALL PERFORMANCE:');
  console.log(`✅ Total requests: ${stats.totalRequests}`);
  console.log(`✅ Success rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`⚡ Average response time: ${stats.averageResponseTime}ms`);
  console.log(`🚀 Fastest response: ${stats.fastestResponse}ms`);
  console.log(`🐌 Slowest response: ${stats.slowestResponse}ms\\n`);
  
  console.log('🗄️  CACHING EFFICIENCY:');
  const avgCacheEfficiency = stats.cacheResults.length > 0 ?
    stats.cacheResults.reduce((sum, r) => sum + r.cacheEfficiency, 0) / stats.cacheResults.length : 0;
  
  console.log(`📊 Average cache efficiency: ${avgCacheEfficiency.toFixed(1)}%`);
  console.log(`🎯 Endpoints with cache headers: ${stats.cacheResults.filter(r => r.hasCacheHeaders).length}/${stats.cacheResults.length}\\n`);
  
  // Performance scoring
  let performanceScore = 100;
  
  if (stats.averageResponseTime > PERFORMANCE_THRESHOLDS.API_RESPONSE) {
    performanceScore -= 20;
    console.log(`⚠️  Average response time (${stats.averageResponseTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.API_RESPONSE}ms)`);
  }
  
  if (stats.successRate < 95) {
    performanceScore -= 30;
    console.log(`⚠️  Success rate (${stats.successRate.toFixed(1)}%) is below 95%`);
  }
  
  if (avgCacheEfficiency < 30) {
    performanceScore -= 20;
    console.log(`⚠️  Cache efficiency (${avgCacheEfficiency.toFixed(1)}%) is below 30%`);
  }
  
  const endpointsWithCache = stats.cacheResults.filter(r => r.hasCacheHeaders).length;
  if (endpointsWithCache < stats.cacheResults.length * 0.8) {
    performanceScore -= 15;
    console.log(`⚠️  Only ${endpointsWithCache}/${stats.cacheResults.length} endpoints have proper cache headers`);
  }
  
  console.log('\\n🏆 FINAL PERFORMANCE SCORE:');
  console.log(`${performanceScore >= 80 ? '🟢' : performanceScore >= 60 ? '🟡' : '🔴'} ${performanceScore}/100`);
  
  if (performanceScore >= 80) {
    console.log('\\n🎉 EXCELLENT! Your caching implementation is working great!');
  } else if (performanceScore >= 60) {
    console.log('\\n✅ GOOD! Minor optimizations could improve performance further.');
  } else {
    console.log('\\n⚠️  NEEDS IMPROVEMENT! Consider reviewing caching configuration.');
  }
  
  return {
    overallStats: stats,
    loadTestResults,
    performanceScore,
    cacheEfficiency: avgCacheEfficiency,
  };
}

// Run the tests
runPerformanceTests().catch(console.error);