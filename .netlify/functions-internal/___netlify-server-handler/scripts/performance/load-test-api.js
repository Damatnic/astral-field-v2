/**
 * API Performance Testing Script
 * Tests all API endpoints under various load conditions
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

class APILoadTester extends EventEmitter {
  constructor(options = {}) {
    super();
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.maxConcurrentUsers = options.maxConcurrentUsers || 50;
    this.testDuration = options.testDuration || 300000; // 5 minutes
    this.rampUpTime = options.rampUpTime || 30000; // 30 seconds
    this.results = {
      endpoints: {},
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: [],
      resourceUtilization: []
    };
    this.users = [];
    this.isRunning = false;
    this.apiEndpoints = this.defineAPIEndpoints();
  }

  defineAPIEndpoints() {
    return [
      // Authentication endpoints
      { path: '/api/auth/session', method: 'GET', weight: 10, category: 'auth' },
      { path: '/api/auth/login', method: 'POST', weight: 5, category: 'auth', requiresAuth: false },
      
      // League endpoints
      { path: '/api/leagues', method: 'GET', weight: 15, category: 'leagues' },
      { path: '/api/leagues/[id]', method: 'GET', weight: 20, category: 'leagues' },
      { path: '/api/leagues/[id]/standings', method: 'GET', weight: 10, category: 'leagues' },
      { path: '/api/leagues/[id]/matchups', method: 'GET', weight: 12, category: 'leagues' },
      { path: '/api/leagues/[id]/teams', method: 'GET', weight: 8, category: 'leagues' },
      
      // Player endpoints
      { path: '/api/players', method: 'GET', weight: 25, category: 'players' },
      { path: '/api/players/[id]', method: 'GET', weight: 15, category: 'players' },
      { path: '/api/players/[id]/stats', method: 'GET', weight: 20, category: 'players' },
      { path: '/api/players/search', method: 'GET', weight: 12, category: 'players' },
      
      // Sleeper API integration
      { path: '/api/sleeper/players', method: 'GET', weight: 18, category: 'sleeper' },
      { path: '/api/sleeper/leagues/[id]', method: 'GET', weight: 10, category: 'sleeper' },
      { path: '/api/sleeper/users/[id]', method: 'GET', weight: 8, category: 'sleeper' },
      
      // Draft endpoints
      { path: '/api/drafts/[id]', method: 'GET', weight: 15, category: 'drafts' },
      { path: '/api/drafts/[id]/picks', method: 'GET', weight: 10, category: 'drafts' },
      { path: '/api/drafts/[id]/pick', method: 'POST', weight: 5, category: 'drafts' },
      
      // Trade endpoints
      { path: '/api/trades', method: 'GET', weight: 8, category: 'trades' },
      { path: '/api/trades/[id]', method: 'GET', weight: 5, category: 'trades' },
      { path: '/api/trades', method: 'POST', weight: 3, category: 'trades' },
      
      // Waiver endpoints
      { path: '/api/waivers', method: 'GET', weight: 6, category: 'waivers' },
      { path: '/api/waivers/claims', method: 'POST', weight: 2, category: 'waivers' },
      
      // AI endpoints
      { path: '/api/ai/trade-analysis', method: 'POST', weight: 4, category: 'ai' },
      { path: '/api/ai/review', method: 'POST', weight: 3, category: 'ai' },
      
      // System endpoints
      { path: '/api/system/performance', method: 'GET', weight: 2, category: 'system' },
      { path: '/api/system/health', method: 'GET', weight: 3, category: 'system' },
      
      // NFL data endpoints
      { path: '/api/nfl/stats', method: 'GET', weight: 12, category: 'nfl' },
      { path: '/api/nfl/schedule', method: 'GET', weight: 8, category: 'nfl' },
      { path: '/api/nfl/teams', method: 'GET', weight: 5, category: 'nfl' }
    ];
  }

  async startLoadTest() {
    console.log(`🔧 Starting comprehensive API load test`);
    console.log(`👥 Max concurrent users: ${this.maxConcurrentUsers}`);
    console.log(`⏱️ Test duration: ${this.testDuration / 1000} seconds`);
    console.log(`🚀 Ramp-up time: ${this.rampUpTime / 1000} seconds`);
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`📊 Testing ${this.apiEndpoints.length} API endpoints`);
    
    this.isRunning = true;
    const startTime = performance.now();

    // Initialize results for each endpoint
    this.apiEndpoints.forEach(endpoint => {
      const key = `${endpoint.method} ${endpoint.path}`;
      this.results.endpoints[key] = {
        requests: 0,
        successes: 0,
        failures: 0,
        responseTimes: [],
        errors: [],
        category: endpoint.category
      };
    });

    // Start throughput monitoring
    this.startThroughputMonitoring();

    // Gradual ramp-up of users
    await this.rampUpUsers();

    // Run test for full duration
    const remainingTime = this.testDuration - this.rampUpTime;
    if (remainingTime > 0) {
      await this.sleep(remainingTime);
    }

    this.stopLoadTest();
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    await this.generateReport(totalDuration);
  }

  async rampUpUsers() {
    const usersPerSecond = this.maxConcurrentUsers / (this.rampUpTime / 1000);
    const interval = 1000 / usersPerSecond;
    
    for (let i = 0; i < this.maxConcurrentUsers && this.isRunning; i++) {
      const user = new APIUser(i, this.baseUrl, this, this.apiEndpoints);
      this.users.push(user);
      user.startAPITesting();
      
      if (i < this.maxConcurrentUsers - 1) {
        await this.sleep(interval);
      }
    }
  }

  startThroughputMonitoring() {
    const monitor = () => {
      if (!this.isRunning) return;
      
      const now = Date.now();
      const currentThroughput = this.calculateCurrentThroughput();
      
      this.results.throughput.push({
        timestamp: now,
        requestsPerSecond: currentThroughput,
        activeUsers: this.users.filter(u => u.isActive).length
      });
      
      setTimeout(monitor, 5000); // Monitor every 5 seconds
    };
    
    monitor();
  }

  calculateCurrentThroughput() {
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;
    
    let recentRequests = 0;
    Object.values(this.results.endpoints).forEach(endpoint => {
      endpoint.responseTimes.forEach(rt => {
        if (rt.timestamp > fiveSecondsAgo) {
          recentRequests++;
        }
      });
    });
    
    return recentRequests / 5; // requests per second
  }

  stopLoadTest() {
    console.log('⏹️ Stopping API load test...');
    this.isRunning = false;
    this.users.forEach(user => user.stop());
  }

  recordRequest(endpoint, responseTime, success, error = null) {
    const key = `${endpoint.method} ${endpoint.path}`;
    const endpointResult = this.results.endpoints[key];
    
    if (!endpointResult) return;
    
    endpointResult.requests++;
    this.results.totalRequests++;
    
    if (success) {
      endpointResult.successes++;
      this.results.successfulRequests++;
      endpointResult.responseTimes.push({
        time: responseTime,
        timestamp: Date.now()
      });
      this.results.responseTimes.push(responseTime);
    } else {
      endpointResult.failures++;
      this.results.failedRequests++;
      if (error) {
        endpointResult.errors.push({
          timestamp: new Date().toISOString(),
          error: error.message || error,
          code: error.code || 'UNKNOWN'
        });
        this.results.errors.push({
          endpoint: key,
          error: error.message || error,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async generateReport(duration) {
    // Calculate overall statistics
    const avgResponseTime = this.results.responseTimes.length > 0 
      ? this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length 
      : 0;
    
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const requestsPerSecond = this.results.totalRequests / (duration / 1000);
    
    // Calculate endpoint statistics
    const endpointStats = {};
    Object.entries(this.results.endpoints).forEach(([key, data]) => {
      const times = data.responseTimes.map(rt => rt.time);
      endpointStats[key] = {
        requests: data.requests,
        successRate: data.requests > 0 ? (data.successes / data.requests) * 100 : 0,
        averageResponseTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        p95: this.getPercentile(times.sort((a, b) => a - b), 95),
        category: data.category,
        errorCount: data.errors.length
      };
    });

    // Group by category
    const categoryStats = this.groupStatsByCategory(endpointStats);
    
    // Calculate percentiles for overall response times
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedTimes, 50);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    const report = {
      testSummary: {
        duration: Math.round(duration),
        maxConcurrentUsers: this.maxConcurrentUsers,
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: Math.round(successRate * 100) / 100,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
      },
      responseTimeMetrics: {
        average: Math.round(avgResponseTime),
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99)
      },
      endpointAnalysis: {
        totalEndpoints: Object.keys(endpointStats).length,
        topPerformers: this.getTopPerformingEndpoints(endpointStats, 5),
        poorPerformers: this.getPoorPerformingEndpoints(endpointStats, 5),
        categoryBreakdown: categoryStats
      },
      throughputAnalysis: {
        peakThroughput: Math.max(...this.results.throughput.map(t => t.requestsPerSecond)),
        averageThroughput: this.results.throughput.length > 0 
          ? this.results.throughput.reduce((sum, t) => sum + t.requestsPerSecond, 0) / this.results.throughput.length 
          : 0,
        throughputTrend: this.results.throughput
      },
      errorAnalysis: {
        totalErrors: this.results.errors.length,
        errorsByEndpoint: this.groupErrorsByEndpoint(),
        commonErrors: this.getCommonErrors()
      },
      recommendations: this.generateRecommendations(successRate, avgResponseTime, p95, endpointStats)
    };

    // Output results
    console.log('\n🔧 API LOAD TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Duration: ${report.testSummary.duration}ms`);
    console.log(`Max Concurrent Users: ${report.testSummary.maxConcurrentUsers}`);
    console.log(`Total Requests: ${report.testSummary.totalRequests}`);
    console.log(`Success Rate: ${report.testSummary.successRate}%`);
    console.log(`Requests/Second: ${report.testSummary.requestsPerSecond}`);
    
    console.log('\n⏱️ Response Time Metrics:');
    console.log(`Average: ${report.responseTimeMetrics.average}ms`);
    console.log(`P50: ${report.responseTimeMetrics.p50}ms`);
    console.log(`P95: ${report.responseTimeMetrics.p95}ms`);
    console.log(`P99: ${report.responseTimeMetrics.p99}ms`);
    
    console.log('\n📊 Category Performance:');
    Object.entries(report.endpointAnalysis.categoryBreakdown).forEach(([category, stats]) => {
      console.log(`${category.toUpperCase()}:`);
      console.log(`  Avg Response: ${Math.round(stats.averageResponseTime)}ms`);
      console.log(`  Success Rate: ${Math.round(stats.successRate)}%`);
      console.log(`  Total Requests: ${stats.totalRequests}`);
    });
    
    console.log('\n🚀 Throughput Analysis:');
    console.log(`Peak Throughput: ${Math.round(report.throughputAnalysis.peakThroughput)} req/s`);
    console.log(`Average Throughput: ${Math.round(report.throughputAnalysis.averageThroughput)} req/s`);
    
    if (report.endpointAnalysis.poorPerformers.length > 0) {
      console.log('\n⚠️ Poor Performing Endpoints:');
      report.endpointAnalysis.poorPerformers.forEach(endpoint => {
        console.log(`${endpoint.endpoint}: ${Math.round(endpoint.averageResponseTime)}ms avg`);
      });
    }
    
    if (report.errorAnalysis.totalErrors > 0) {
      console.log('\n❌ Error Analysis:');
      console.log(`Total Errors: ${report.errorAnalysis.totalErrors}`);
      console.log('Common Errors:', report.errorAnalysis.commonErrors);
    }

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`• ${rec}`));

    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `scripts/performance/api-load-test-${timestamp}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }

  groupStatsByCategory(endpointStats) {
    const categories = {};
    Object.entries(endpointStats).forEach(([endpoint, stats]) => {
      const category = stats.category;
      if (!categories[category]) {
        categories[category] = {
          totalRequests: 0,
          totalSuccesses: 0,
          responseTimes: [],
          errorCount: 0
        };
      }
      
      categories[category].totalRequests += stats.requests;
      categories[category].totalSuccesses += Math.round(stats.requests * stats.successRate / 100);
      categories[category].responseTimes.push(stats.averageResponseTime);
      categories[category].errorCount += stats.errorCount;
    });
    
    // Calculate averages
    Object.values(categories).forEach(category => {
      category.successRate = (category.totalSuccesses / category.totalRequests) * 100;
      category.averageResponseTime = category.responseTimes.reduce((a, b) => a + b, 0) / category.responseTimes.length;
    });
    
    return categories;
  }

  getTopPerformingEndpoints(endpointStats, limit) {
    return Object.entries(endpointStats)
      .sort(([,a], [,b]) => a.averageResponseTime - b.averageResponseTime)
      .slice(0, limit)
      .map(([endpoint, stats]) => ({ endpoint, ...stats }));
  }

  getPoorPerformingEndpoints(endpointStats, limit) {
    return Object.entries(endpointStats)
      .filter(([,stats]) => stats.requests > 0)
      .sort(([,a], [,b]) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit)
      .map(([endpoint, stats]) => ({ endpoint, ...stats }));
  }

  groupErrorsByEndpoint() {
    const grouped = {};
    this.results.errors.forEach(error => {
      const endpoint = error.endpoint;
      if (!grouped[endpoint]) grouped[endpoint] = 0;
      grouped[endpoint]++;
    });
    return grouped;
  }

  getCommonErrors() {
    const errorMessages = {};
    this.results.errors.forEach(error => {
      const message = error.error.substring(0, 50); // Truncate for grouping
      errorMessages[message] = (errorMessages[message] || 0) + 1;
    });
    
    return Object.entries(errorMessages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  generateRecommendations(successRate, avgResponseTime, p95, endpointStats) {
    const recommendations = [];
    
    if (successRate < 95) {
      recommendations.push('Critical: Overall success rate is below 95%. Investigate failing endpoints immediately.');
    }
    
    if (avgResponseTime > 1000) {
      recommendations.push('High average response time detected. Consider API optimization and caching strategies.');
    }
    
    if (p95 > 3000) {
      recommendations.push('95th percentile response time is very high. Check for slow database queries and resource bottlenecks.');
    }
    
    // Check for specific endpoint issues
    const slowEndpoints = Object.entries(endpointStats)
      .filter(([,stats]) => stats.averageResponseTime > 2000)
      .map(([endpoint]) => endpoint);
    
    if (slowEndpoints.length > 0) {
      recommendations.push(`Optimize slow endpoints: ${slowEndpoints.slice(0, 3).join(', ')}`);
    }
    
    // Check category performance
    const aiEndpoints = Object.entries(endpointStats)
      .filter(([,stats]) => stats.category === 'ai');
    
    if (aiEndpoints.some(([,stats]) => stats.averageResponseTime > 3000)) {
      recommendations.push('AI endpoints are slow. Consider implementing async processing or response caching.');
    }
    
    recommendations.push('Implement API rate limiting to prevent abuse and ensure fair usage.');
    recommendations.push('Add API response caching for frequently accessed, low-change data.');
    recommendations.push('Consider implementing API versioning for better backward compatibility.');
    
    return recommendations;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class APIUser {
  constructor(id, baseUrl, tester, endpoints) {
    this.id = id;
    this.baseUrl = baseUrl;
    this.tester = tester;
    this.endpoints = endpoints;
    this.isActive = false;
    this.sessionToken = null;
  }

  async startAPITesting() {
    this.isActive = true;
    console.log(`🔧 User ${this.id} starting API testing`);
    
    try {
      // Authenticate first
      await this.authenticate();
      
      // Start making requests to various endpoints
      while (this.isActive && this.tester.isRunning) {
        await this.makeRandomRequest();
        await this.sleep(Math.random() * 2000 + 500); // 0.5-2.5 second intervals
      }
    } catch (error) {
      console.error(`❌ User ${this.id} error:`, error.message);
    }
  }

  async authenticate() {
    const authEndpoint = this.endpoints.find(e => e.path === '/api/auth/session');
    if (authEndpoint) {
      await this.makeRequest(authEndpoint);
      this.sessionToken = 'mock-token-' + this.id;
    }
  }

  async makeRandomRequest() {
    // Choose random endpoint based on weight
    const endpoint = this.chooseWeightedEndpoint();
    await this.makeRequest(endpoint);
  }

  chooseWeightedEndpoint() {
    const totalWeight = this.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.endpoints[0]; // fallback
  }

  async makeRequest(endpoint) {
    const startTime = performance.now();
    let actualPath = endpoint.path;
    
    // Replace dynamic segments
    actualPath = actualPath.replace('[id]', Math.floor(Math.random() * 1000) + 1);
    
    try {
      const response = await this.httpRequest(actualPath, endpoint.method, this.getRequestData(endpoint));
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(endpoint, responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(endpoint, responseTime, false, error);
    }
  }

  getRequestData(endpoint) {
    if (endpoint.method === 'GET') return null;
    
    // Generate mock data based on endpoint
    if (endpoint.path.includes('/api/trades')) {
      return {
        fromTeamId: Math.floor(Math.random() * 10) + 1,
        toTeamId: Math.floor(Math.random() * 10) + 1,
        fromPlayers: ['player1'],
        toPlayers: ['player2']
      };
    }
    
    if (endpoint.path.includes('/api/ai/')) {
      return {
        prompt: 'Analyze this trade',
        context: 'fantasy football'
      };
    }
    
    return { data: 'mock' };
  }

  async httpRequest(path, method, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `APILoadTester/1.0 User-${this.id}`,
          ...(this.sessionToken && { 'Authorization': `Bearer ${this.sessionToken}` })
        },
        timeout: 15000
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = httpModule.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  stop() {
    this.isActive = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'users') options.maxConcurrentUsers = parseInt(value);
    if (key === 'duration') options.testDuration = parseInt(value) * 1000;
    if (key === 'rampup') options.rampUpTime = parseInt(value) * 1000;
    if (key === 'url') options.baseUrl = value;
  }
  
  const tester = new APILoadTester(options);
  
  process.on('SIGINT', () => {
    console.log('\n⏹️ Received interrupt signal, stopping test...');
    tester.stopLoadTest();
    process.exit(0);
  });
  
  tester.startLoadTest().catch(error => {
    console.error('❌ API load test failed:', error);
    process.exit(1);
  });
}

module.exports = APILoadTester;