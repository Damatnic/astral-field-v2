/**
 * Draft Load Testing Script
 * Tests 100+ concurrent users in fantasy football draft scenarios
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

class DraftLoadTester extends EventEmitter {
  constructor(options = {}) {
    super();
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.maxConcurrentUsers = options.maxConcurrentUsers || 100;
    this.draftDuration = options.draftDuration || 300000; // 5 minutes
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      responseTimes: [],
      errors: [],
      draftPicks: [],
      connectionErrors: 0
    };
    this.users = [];
    this.isRunning = false;
  }

  async startLoadTest() {
    console.log(`🚀 Starting draft load test with ${this.maxConcurrentUsers} concurrent users`);
    console.log(`📊 Test duration: ${this.draftDuration / 1000} seconds`);
    console.log(`🎯 Target: ${this.baseUrl}`);
    
    this.isRunning = true;
    const startTime = performance.now();

    // Create simulated users
    for (let i = 0; i < this.maxConcurrentUsers; i++) {
      const user = new DraftUser(i, this.baseUrl, this);
      this.users.push(user);
    }

    // Start all users simultaneously
    const userPromises = this.users.map(user => user.startDraftSession());
    
    // Set test timeout
    const testTimeout = setTimeout(() => {
      this.stopLoadTest();
    }, this.draftDuration);

    try {
      await Promise.allSettled(userPromises);
    } catch (error) {
      console.error('Error during load test:', error);
    }

    clearTimeout(testTimeout);
    this.isRunning = false;
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    await this.generateReport(totalDuration);
  }

  stopLoadTest() {
    console.log('⏹️ Stopping load test...');
    this.isRunning = false;
    this.users.forEach(user => user.stop());
  }

  recordRequest(responseTime, success, error = null) {
    this.results.totalRequests++;
    
    if (success) {
      this.results.successfulRequests++;
      this.results.responseTimes.push(responseTime);
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
      this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    } else {
      this.results.failedRequests++;
      if (error) {
        this.results.errors.push({
          timestamp: new Date().toISOString(),
          error: error.message || error,
          type: error.code || 'UNKNOWN'
        });
      }
    }
  }

  recordDraftPick(userId, playerId, responseTime, success) {
    this.results.draftPicks.push({
      userId,
      playerId,
      responseTime,
      success,
      timestamp: new Date().toISOString()
    });
  }

  async generateReport(duration) {
    // Calculate statistics
    const avgResponseTime = this.results.responseTimes.length > 0 
      ? this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length 
      : 0;
    
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const requestsPerSecond = this.results.totalRequests / (duration / 1000);
    
    // Calculate percentiles
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedTimes, 50);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    const report = {
      testSummary: {
        duration: Math.round(duration),
        concurrentUsers: this.maxConcurrentUsers,
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: Math.round(successRate * 100) / 100,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
      },
      responseTimeMetrics: {
        average: Math.round(avgResponseTime),
        minimum: Math.round(this.results.minResponseTime),
        maximum: Math.round(this.results.maxResponseTime),
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99)
      },
      draftSpecificMetrics: {
        totalDraftPicks: this.results.draftPicks.length,
        successfulPicks: this.results.draftPicks.filter(p => p.success).length,
        averagePickTime: this.results.draftPicks.length > 0 
          ? Math.round(this.results.draftPicks.reduce((sum, pick) => sum + pick.responseTime, 0) / this.results.draftPicks.length)
          : 0
      },
      errorAnalysis: {
        totalErrors: this.results.errors.length,
        connectionErrors: this.results.connectionErrors,
        errorsByType: this.groupErrorsByType()
      },
      recommendations: this.generateRecommendations(successRate, avgResponseTime, p95)
    };

    // Output results
    console.log('\n📊 DRAFT LOAD TEST RESULTS');
    console.log('=' .repeat(50));
    console.log(`Duration: ${report.testSummary.duration}ms`);
    console.log(`Concurrent Users: ${report.testSummary.concurrentUsers}`);
    console.log(`Total Requests: ${report.testSummary.totalRequests}`);
    console.log(`Success Rate: ${report.testSummary.successRate}%`);
    console.log(`Requests/Second: ${report.testSummary.requestsPerSecond}`);
    console.log('\n⏱️ Response Time Metrics:');
    console.log(`Average: ${report.responseTimeMetrics.average}ms`);
    console.log(`P50: ${report.responseTimeMetrics.p50}ms`);
    console.log(`P95: ${report.responseTimeMetrics.p95}ms`);
    console.log(`P99: ${report.responseTimeMetrics.p99}ms`);
    console.log('\n🏈 Draft Specific Metrics:');
    console.log(`Total Draft Picks: ${report.draftSpecificMetrics.totalDraftPicks}`);
    console.log(`Successful Picks: ${report.draftSpecificMetrics.successfulPicks}`);
    console.log(`Average Pick Time: ${report.draftSpecificMetrics.averagePickTime}ms`);
    
    if (report.errorAnalysis.totalErrors > 0) {
      console.log('\n❌ Error Analysis:');
      console.log(`Total Errors: ${report.errorAnalysis.totalErrors}`);
      console.log('Error Types:', report.errorAnalysis.errorsByType);
    }

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`• ${rec}`));

    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `scripts/performance/draft-load-test-${timestamp}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  groupErrorsByType() {
    const grouped = {};
    this.results.errors.forEach(error => {
      const type = error.type || 'UNKNOWN';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  generateRecommendations(successRate, avgResponseTime, p95) {
    const recommendations = [];
    
    if (successRate < 95) {
      recommendations.push('Critical: Success rate below 95%. Investigate error causes and server stability.');
    }
    
    if (avgResponseTime > 1000) {
      recommendations.push('High average response time detected. Consider server scaling or optimization.');
    }
    
    if (p95 > 2000) {
      recommendations.push('95th percentile response time is high. Check for resource bottlenecks.');
    }
    
    if (this.results.connectionErrors > this.results.totalRequests * 0.01) {
      recommendations.push('High connection error rate. Check server connection limits and load balancer configuration.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable ranges. Consider testing with higher load.');
    }
    
    return recommendations;
  }
}

class DraftUser {
  constructor(id, baseUrl, tester) {
    this.id = id;
    this.baseUrl = baseUrl;
    this.tester = tester;
    this.isActive = false;
    this.sessionToken = null;
    this.draftId = 'test-draft-' + Math.floor(Math.random() * 1000);
  }

  async startDraftSession() {
    this.isActive = true;
    console.log(`👤 User ${this.id} joining draft session`);
    
    try {
      // Simulate user authentication
      await this.authenticate();
      
      // Join draft room
      await this.joinDraft();
      
      // Simulate draft picks throughout the session
      while (this.isActive && this.tester.isRunning) {
        await this.simulateDraftActivity();
        await this.sleep(Math.random() * 2000 + 1000); // 1-3 second intervals
      }
    } catch (error) {
      console.error(`❌ User ${this.id} error:`, error.message);
    }
  }

  async authenticate() {
    const startTime = performance.now();
    try {
      await this.makeRequest('/api/auth/session', 'GET');
      this.sessionToken = 'mock-token-' + this.id;
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, error);
      throw error;
    }
  }

  async joinDraft() {
    const startTime = performance.now();
    try {
      await this.makeRequest(`/api/drafts/${this.draftId}/join`, 'POST', {
        userId: this.id,
        sessionToken: this.sessionToken
      });
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, error);
      throw error;
    }
  }

  async simulateDraftActivity() {
    const activities = [
      this.makeDraftPick,
      this.getAvailablePlayers,
      this.getDraftStatus,
      this.getTeamRoster
    ];
    
    const activity = activities[Math.floor(Math.random() * activities.length)];
    await activity.call(this);
  }

  async makeDraftPick() {
    const playerId = 'player-' + Math.floor(Math.random() * 1000);
    const startTime = performance.now();
    
    try {
      await this.makeRequest(`/api/drafts/${this.draftId}/pick`, 'POST', {
        playerId,
        userId: this.id
      });
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true);
      this.tester.recordDraftPick(this.id, playerId, responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, error);
      this.tester.recordDraftPick(this.id, playerId, responseTime, false);
    }
  }

  async getAvailablePlayers() {
    const startTime = performance.now();
    try {
      await this.makeRequest(`/api/drafts/${this.draftId}/players/available`, 'GET');
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, error);
    }
  }

  async getDraftStatus() {
    const startTime = performance.now();
    try {
      await this.makeRequest(`/api/drafts/${this.draftId}/status`, 'GET');
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, error);
    }
  }

  async getTeamRoster() {
    const startTime = performance.now();
    try {
      await this.makeRequest(`/api/drafts/${this.draftId}/roster/${this.id}`, 'GET');
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, error);
    }
  }

  async makeRequest(path, method, data = null) {
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
          'User-Agent': `DraftLoadTester/1.0 User-${this.id}`,
          ...(this.sessionToken && { 'Authorization': `Bearer ${this.sessionToken}` })
        },
        timeout: 10000
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

      req.on('error', (error) => {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.tester.results.connectionErrors++;
        }
        reject(error);
      });

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
    if (key === 'duration') options.draftDuration = parseInt(value) * 1000;
    if (key === 'url') options.baseUrl = value;
  }
  
  const tester = new DraftLoadTester(options);
  
  process.on('SIGINT', () => {
    console.log('\n⏹️ Received interrupt signal, stopping test...');
    tester.stopLoadTest();
    process.exit(0);
  });
  
  tester.startLoadTest().catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = DraftLoadTester;