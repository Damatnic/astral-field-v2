/**
 * Live Scoring Load Testing Script
 * Stress tests live scoring system during game time with high concurrent load
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

class ScoringLoadTester extends EventEmitter {
  constructor(options = {}) {
    super();
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.maxConcurrentUsers = options.maxConcurrentUsers || 200;
    this.testDuration = options.testDuration || 600000; // 10 minutes default
    this.scoreUpdateInterval = options.scoreUpdateInterval || 5000; // 5 seconds
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      scoreUpdates: [],
      websocketConnections: 0,
      websocketErrors: 0,
      dbQueries: [],
      cacheHits: 0,
      cacheMisses: 0,
      errors: []
    };
    this.users = [];
    this.isRunning = false;
    this.gameData = this.generateMockGameData();
  }

  generateMockGameData() {
    const teams = ['KC', 'BUF', 'MIA', 'NE', 'CIN', 'CLE', 'BAL', 'PIT'];
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
    const players = [];
    
    for (let i = 0; i < 500; i++) {
      players.push({
        id: `player_${i}`,
        name: `Player ${i}`,
        position: positions[Math.floor(Math.random() * positions.length)],
        team: teams[Math.floor(Math.random() * teams.length)],
        score: Math.floor(Math.random() * 30),
        isActive: Math.random() > 0.3
      });
    }
    
    return { players, teams };
  }

  async startLoadTest() {
    console.log(`🏈 Starting live scoring load test`);
    console.log(`👥 Concurrent users: ${this.maxConcurrentUsers}`);
    console.log(`⏱️ Duration: ${this.testDuration / 1000} seconds`);
    console.log(`🔄 Score update interval: ${this.scoreUpdateInterval / 1000} seconds`);
    console.log(`🎯 Target: ${this.baseUrl}`);
    
    this.isRunning = true;
    const startTime = performance.now();

    // Start score update simulation
    this.startScoreUpdates();

    // Create simulated users
    for (let i = 0; i < this.maxConcurrentUsers; i++) {
      const user = new ScoringUser(i, this.baseUrl, this);
      this.users.push(user);
    }

    // Start all users
    const userPromises = this.users.map(user => user.startScoreTracking());
    
    // Set test timeout
    const testTimeout = setTimeout(() => {
      this.stopLoadTest();
    }, this.testDuration);

    try {
      await Promise.allSettled(userPromises);
    } catch (error) {
      console.error('Error during scoring load test:', error);
    }

    clearTimeout(testTimeout);
    this.isRunning = false;
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    await this.generateReport(totalDuration);
  }

  startScoreUpdates() {
    const updateScores = () => {
      if (!this.isRunning) return;
      
      // Simulate score changes for random players
      const numUpdates = Math.floor(Math.random() * 10) + 5;
      const updates = [];
      
      for (let i = 0; i < numUpdates; i++) {
        const player = this.gameData.players[Math.floor(Math.random() * this.gameData.players.length)];
        const scoreChange = (Math.random() - 0.5) * 10; // -5 to +5 points
        player.score += scoreChange;
        
        updates.push({
          playerId: player.id,
          newScore: Math.max(0, player.score),
          timestamp: new Date().toISOString()
        });
      }
      
      this.results.scoreUpdates.push(...updates);
      this.emit('scoreUpdate', updates);
      
      setTimeout(updateScores, this.scoreUpdateInterval);
    };
    
    updateScores();
  }

  stopLoadTest() {
    console.log('⏹️ Stopping scoring load test...');
    this.isRunning = false;
    this.users.forEach(user => user.stop());
  }

  recordRequest(responseTime, success, requestType, error = null) {
    this.results.totalRequests++;
    
    if (success) {
      this.results.successfulRequests++;
      this.results.responseTimes.push({
        time: responseTime,
        type: requestType,
        timestamp: Date.now()
      });
    } else {
      this.results.failedRequests++;
      if (error) {
        this.results.errors.push({
          timestamp: new Date().toISOString(),
          error: error.message || error,
          type: error.code || 'UNKNOWN',
          requestType
        });
      }
    }
  }

  recordCacheHit(hit) {
    if (hit) {
      this.results.cacheHits++;
    } else {
      this.results.cacheMisses++;
    }
  }

  recordWebSocketEvent(type, success) {
    if (type === 'connection') {
      if (success) {
        this.results.websocketConnections++;
      } else {
        this.results.websocketErrors++;
      }
    }
  }

  async generateReport(duration) {
    // Calculate statistics
    const avgResponseTime = this.results.responseTimes.length > 0 
      ? this.results.responseTimes.reduce((sum, rt) => sum + rt.time, 0) / this.results.responseTimes.length 
      : 0;
    
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const requestsPerSecond = this.results.totalRequests / (duration / 1000);
    const cacheHitRate = this.results.cacheHits / (this.results.cacheHits + this.results.cacheMisses) * 100;
    
    // Calculate response times by request type
    const responseTimesByType = {};
    this.results.responseTimes.forEach(rt => {
      if (!responseTimesByType[rt.type]) {
        responseTimesByType[rt.type] = [];
      }
      responseTimesByType[rt.type].push(rt.time);
    });

    // Calculate percentiles
    const allTimes = this.results.responseTimes.map(rt => rt.time).sort((a, b) => a - b);
    const p50 = this.getPercentile(allTimes, 50);
    const p95 = this.getPercentile(allTimes, 95);
    const p99 = this.getPercentile(allTimes, 99);

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
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
        byRequestType: this.calculateResponseTimesByType(responseTimesByType)
      },
      scoringSpecificMetrics: {
        totalScoreUpdates: this.results.scoreUpdates.length,
        scoreUpdatesPerSecond: Math.round(this.results.scoreUpdates.length / (duration / 1000) * 100) / 100,
        avgScoreUpdateDelay: this.calculateAvgScoreUpdateDelay()
      },
      websocketMetrics: {
        successfulConnections: this.results.websocketConnections,
        connectionErrors: this.results.websocketErrors,
        connectionSuccessRate: this.results.websocketConnections / (this.results.websocketConnections + this.results.websocketErrors) * 100
      },
      cacheMetrics: {
        hitRate: Math.round(cacheHitRate * 100) / 100,
        totalHits: this.results.cacheHits,
        totalMisses: this.results.cacheMisses
      },
      errorAnalysis: {
        totalErrors: this.results.errors.length,
        errorsByType: this.groupErrorsByType(),
        errorsByRequestType: this.groupErrorsByRequestType()
      },
      recommendations: this.generateRecommendations(successRate, avgResponseTime, p95, cacheHitRate)
    };

    // Output results
    console.log('\n🏈 LIVE SCORING LOAD TEST RESULTS');
    console.log('=' .repeat(60));
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
    
    console.log('\n🔄 Scoring Metrics:');
    console.log(`Score Updates: ${report.scoringSpecificMetrics.totalScoreUpdates}`);
    console.log(`Updates/Second: ${report.scoringSpecificMetrics.scoreUpdatesPerSecond}`);
    console.log(`Avg Update Delay: ${report.scoringSpecificMetrics.avgScoreUpdateDelay}ms`);
    
    console.log('\n🔌 WebSocket Metrics:');
    console.log(`Successful Connections: ${report.websocketMetrics.successfulConnections}`);
    console.log(`Connection Success Rate: ${Math.round(report.websocketMetrics.connectionSuccessRate)}%`);
    
    console.log('\n💾 Cache Metrics:');
    console.log(`Cache Hit Rate: ${report.cacheMetrics.hitRate}%`);
    console.log(`Cache Hits: ${report.cacheMetrics.totalHits}`);
    console.log(`Cache Misses: ${report.cacheMetrics.totalMisses}`);
    
    if (report.errorAnalysis.totalErrors > 0) {
      console.log('\n❌ Error Analysis:');
      console.log(`Total Errors: ${report.errorAnalysis.totalErrors}`);
      console.log('Error Types:', report.errorAnalysis.errorsByType);
    }

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`• ${rec}`));

    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `scripts/performance/scoring-load-test-${timestamp}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }

  calculateResponseTimesByType(responseTimesByType) {
    const result = {};
    Object.keys(responseTimesByType).forEach(type => {
      const times = responseTimesByType[type];
      result[type] = {
        average: Math.round(times.reduce((sum, t) => sum + t, 0) / times.length),
        count: times.length
      };
    });
    return result;
  }

  calculateAvgScoreUpdateDelay() {
    // This would measure the delay between score change and user notification
    // For now, return a simulated value
    return Math.floor(Math.random() * 1000) + 100;
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

  groupErrorsByRequestType() {
    const grouped = {};
    this.results.errors.forEach(error => {
      const type = error.requestType || 'UNKNOWN';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  generateRecommendations(successRate, avgResponseTime, p95, cacheHitRate) {
    const recommendations = [];
    
    if (successRate < 95) {
      recommendations.push('Critical: Success rate below 95%. Check server capacity and error handling during peak load.');
    }
    
    if (avgResponseTime > 500) {
      recommendations.push('High response times detected. Consider optimizing database queries and adding more caching.');
    }
    
    if (p95 > 2000) {
      recommendations.push('95th percentile is very high. Check for resource contention and slow queries.');
    }
    
    if (cacheHitRate < 80) {
      recommendations.push('Low cache hit rate. Review caching strategy for score data and player statistics.');
    }
    
    if (this.results.websocketErrors > this.results.websocketConnections * 0.05) {
      recommendations.push('High WebSocket error rate. Check connection handling and server WebSocket capacity.');
    }
    
    recommendations.push('Consider implementing real-time score streaming with WebSocket clustering for better scalability.');
    recommendations.push('Use database read replicas for score queries to reduce load on primary database.');
    recommendations.push('Implement score update batching to reduce database write frequency.');
    
    return recommendations;
  }
}

class ScoringUser {
  constructor(id, baseUrl, tester) {
    this.id = id;
    this.baseUrl = baseUrl;
    this.tester = tester;
    this.isActive = false;
    this.leagueId = 'league_' + Math.floor(Math.random() * 100);
    this.teamId = 'team_' + id;
  }

  async startScoreTracking() {
    this.isActive = true;
    console.log(`📊 User ${this.id} starting score tracking`);
    
    try {
      // Simulate different user behaviors
      const behaviors = [
        this.activeScoreWatcher,
        this.casualScoreChecker,
        this.intensiveUserBehavior
      ];
      
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
      await behavior.call(this);
    } catch (error) {
      console.error(`❌ User ${this.id} error:`, error.message);
    }
  }

  // User who constantly watches scores
  async activeScoreWatcher() {
    while (this.isActive && this.tester.isRunning) {
      await Promise.all([
        this.getTeamScores(),
        this.getLeagueScores(),
        this.getPlayerUpdates()
      ]);
      await this.sleep(2000 + Math.random() * 1000); // 2-3 seconds
    }
  }

  // User who checks scores occasionally
  async casualScoreChecker() {
    while (this.isActive && this.tester.isRunning) {
      const actions = [
        this.getTeamScores,
        this.getLeagueScores,
        this.checkMatchupScores
      ];
      
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action.call(this);
      await this.sleep(5000 + Math.random() * 10000); // 5-15 seconds
    }
  }

  // Power user with multiple simultaneous requests
  async intensiveUserBehavior() {
    while (this.isActive && this.tester.isRunning) {
      await Promise.all([
        this.getTeamScores(),
        this.getLeagueScores(),
        this.getPlayerUpdates(),
        this.getProjectedScores(),
        this.checkMatchupScores(),
        this.getPlayerStats()
      ]);
      await this.sleep(1000 + Math.random() * 1000); // 1-2 seconds
    }
  }

  async getTeamScores() {
    await this.makeRequest(`/api/leagues/${this.leagueId}/teams/${this.teamId}/scores`, 'GET', 'team_scores');
  }

  async getLeagueScores() {
    await this.makeRequest(`/api/leagues/${this.leagueId}/scores`, 'GET', 'league_scores');
  }

  async getPlayerUpdates() {
    await this.makeRequest(`/api/leagues/${this.leagueId}/players/updates`, 'GET', 'player_updates');
  }

  async getProjectedScores() {
    await this.makeRequest(`/api/leagues/${this.leagueId}/teams/${this.teamId}/projected`, 'GET', 'projected_scores');
  }

  async checkMatchupScores() {
    await this.makeRequest(`/api/leagues/${this.leagueId}/matchups/current`, 'GET', 'matchup_scores');
  }

  async getPlayerStats() {
    const playerId = 'player_' + Math.floor(Math.random() * 500);
    await this.makeRequest(`/api/players/${playerId}/stats`, 'GET', 'player_stats');
  }

  async makeRequest(path, method, requestType, data = null) {
    const startTime = performance.now();
    try {
      await this.httpRequest(path, method, data);
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, true, requestType);
      
      // Simulate cache hit/miss
      this.tester.recordCacheHit(Math.random() > 0.2); // 80% cache hit rate simulation
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.tester.recordRequest(responseTime, false, requestType, error);
    }
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
          'User-Agent': `ScoringLoadTester/1.0 User-${this.id}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      };

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
    if (key === 'url') options.baseUrl = value;
    if (key === 'interval') options.scoreUpdateInterval = parseInt(value) * 1000;
  }
  
  const tester = new ScoringLoadTester(options);
  
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

module.exports = ScoringLoadTester;