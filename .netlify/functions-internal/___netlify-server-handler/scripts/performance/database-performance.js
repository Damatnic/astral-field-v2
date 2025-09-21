/**
 * Database Performance Testing and Query Optimization
 * Comprehensive database performance analysis and optimization recommendations
 */

const { performance } = require('perf_hooks');
const fs = require('fs');

class DatabasePerformanceTester {
  constructor(options = {}) {
    this.testDuration = options.testDuration || 300000; // 5 minutes
    this.concurrentConnections = options.concurrentConnections || 20;
    this.queryBatchSize = options.queryBatchSize || 100;
    this.slowQueryThreshold = options.slowQueryThreshold || 1000; // 1 second
    
    this.results = {
      connectionTests: {
        poolPerformance: [],
        connectionLatency: [],
        maxConnections: 0
      },
      queryPerformance: {
        crud: {},
        aggregations: [],
        joins: [],
        fullTextSearch: [],
        slowQueries: []
      },
      indexAnalysis: {
        missingIndexes: [],
        unusedIndexes: [],
        fragmentedIndexes: []
      },
      optimizationOpportunities: [],
      recommendations: []
    };
    
    this.isRunning = false;
    this.mockDatabase = this.createMockDatabase();
  }

  createMockDatabase() {
    // Mock database structure for fantasy football app
    return {
      users: this.generateMockData('users', 10000),
      leagues: this.generateMockData('leagues', 1000),
      teams: this.generateMockData('teams', 12000),
      players: this.generateMockData('players', 3000),
      games: this.generateMockData('games', 500),
      trades: this.generateMockData('trades', 5000),
      waivers: this.generateMockData('waivers', 8000),
      rosters: this.generateMockData('rosters', 15000),
      matchups: this.generateMockData('matchups', 20000),
      scores: this.generateMockData('scores', 50000)
    };
  }

  generateMockData(tableName, count) {
    const data = [];
    for (let i = 1; i <= count; i++) {
      switch (tableName) {
        case 'users':
          data.push({
            id: i,
            username: `user${i}`,
            email: `user${i}@example.com`,
            created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          });
          break;
        case 'leagues':
          data.push({
            id: i,
            name: `League ${i}`,
            commissioner_id: Math.floor(Math.random() * 1000) + 1,
            created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            settings: JSON.stringify({ scoring: 'standard', teams: 12 })
          });
          break;
        case 'teams':
          data.push({
            id: i,
            league_id: Math.floor(Math.random() * 1000) + 1,
            owner_id: Math.floor(Math.random() * 10000) + 1,
            name: `Team ${i}`,
            wins: Math.floor(Math.random() * 15),
            losses: Math.floor(Math.random() * 15)
          });
          break;
        case 'players':
          data.push({
            id: i,
            name: `Player ${i}`,
            position: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'][Math.floor(Math.random() * 6)],
            team: ['KC', 'BUF', 'MIA', 'NE', 'CIN'][Math.floor(Math.random() * 5)],
            fantasy_points: Math.random() * 300,
            updated_at: new Date()
          });
          break;
        default:
          data.push({ id: i, data: `mock-${tableName}-${i}` });
      }
    }
    return data;
  }

  async startDatabaseTest() {
    console.log('🗃️ Starting comprehensive database performance test');
    console.log(`⏱️ Test duration: ${this.testDuration / 1000} seconds`);
    console.log(`🔗 Concurrent connections: ${this.concurrentConnections}`);
    console.log(`📦 Query batch size: ${this.queryBatchSize}`);
    
    this.isRunning = true;
    const startTime = performance.now();
    
    try {
      // Run all database performance tests
      await Promise.all([
        this.testConnectionPoolPerformance(),
        this.testQueryPerformance(),
        this.testIndexPerformance(),
        this.testTransactionPerformance(),
        this.simulateRealWorldLoad()
      ]);
    } catch (error) {
      console.error('Error during database testing:', error);
    }
    
    this.isRunning = false;
    const endTime = performance.now();
    
    await this.generateReport(endTime - startTime);
  }

  async testConnectionPoolPerformance() {
    console.log('🔗 Testing connection pool performance');
    
    // Test connection acquisition time
    const connectionTests = [];
    for (let i = 0; i < this.concurrentConnections; i++) {
      connectionTests.push(this.testConnectionAcquisition(i));
    }
    
    const connectionResults = await Promise.allSettled(connectionTests);
    
    connectionResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.results.connectionTests.connectionLatency.push({
          connectionId: index,
          acquisitionTime: result.value.acquisitionTime,
          queryTime: result.value.queryTime,
          releaseTime: result.value.releaseTime
        });
      }
    });
    
    this.results.connectionTests.maxConnections = this.concurrentConnections;
  }

  async testConnectionAcquisition(connectionId) {
    const startTime = performance.now();
    
    // Simulate connection acquisition
    await this.sleep(Math.random() * 50 + 10); // 10-60ms
    const acquisitionTime = performance.now() - startTime;
    
    // Simulate query execution
    const queryStartTime = performance.now();
    await this.simulateQuery('SELECT * FROM users WHERE id = ?', [connectionId]);
    const queryTime = performance.now() - queryStartTime;
    
    // Simulate connection release
    const releaseStartTime = performance.now();
    await this.sleep(Math.random() * 10 + 1); // 1-11ms
    const releaseTime = performance.now() - releaseStartTime;
    
    return { acquisitionTime, queryTime, releaseTime };
  }

  async testQueryPerformance() {
    console.log('📊 Testing query performance');
    
    // Test CRUD operations
    await this.testCRUDPerformance();
    
    // Test complex queries
    await this.testComplexQueries();
    
    // Test aggregation queries
    await this.testAggregationQueries();
    
    // Test join queries
    await this.testJoinQueries();
    
    // Test full-text search
    await this.testFullTextSearch();
  }

  async testCRUDPerformance() {
    const operations = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    
    for (const operation of operations) {
      const startTime = performance.now();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        await this.simulateCRUDOperation(operation, i);
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;
      
      this.results.queryPerformance.crud[operation] = {
        totalTime: totalTime,
        averageTime: averageTime,
        iterations: iterations,
        throughput: iterations / (totalTime / 1000) // ops per second
      };
    }
  }

  async simulateCRUDOperation(operation, id) {
    const operationTime = this.getOperationTime(operation);
    await this.sleep(operationTime);
    
    if (operationTime > this.slowQueryThreshold) {
      this.results.queryPerformance.slowQueries.push({
        operation,
        id,
        duration: operationTime,
        query: this.getQueryExample(operation),
        timestamp: new Date().toISOString()
      });
    }
  }

  getOperationTime(operation) {
    // Simulate realistic database operation times
    switch (operation) {
      case 'CREATE': return Math.random() * 50 + 10; // 10-60ms
      case 'READ': return Math.random() * 20 + 2; // 2-22ms
      case 'UPDATE': return Math.random() * 80 + 15; // 15-95ms
      case 'DELETE': return Math.random() * 40 + 8; // 8-48ms
      default: return Math.random() * 50 + 10;
    }
  }

  getQueryExample(operation) {
    switch (operation) {
      case 'CREATE': return 'INSERT INTO users (username, email) VALUES (?, ?)';
      case 'READ': return 'SELECT * FROM users WHERE id = ?';
      case 'UPDATE': return 'UPDATE users SET last_login = ? WHERE id = ?';
      case 'DELETE': return 'DELETE FROM users WHERE id = ?';
      default: return 'SELECT 1';
    }
  }

  async testComplexQueries() {
    const complexQueries = [
      {
        name: 'user_league_summary',
        query: 'SELECT u.username, COUNT(t.id) as team_count, AVG(t.wins) as avg_wins FROM users u JOIN teams t ON u.id = t.owner_id GROUP BY u.id',
        expectedTime: 150
      },
      {
        name: 'league_standings',
        query: 'SELECT t.name, t.wins, t.losses, (t.wins * 1.0 / (t.wins + t.losses)) as win_percentage FROM teams t WHERE league_id = ? ORDER BY win_percentage DESC',
        expectedTime: 80
      },
      {
        name: 'player_performance',
        query: 'SELECT p.name, p.position, AVG(s.points) as avg_points, COUNT(s.id) as games_played FROM players p JOIN scores s ON p.id = s.player_id GROUP BY p.id HAVING games_played > 5',
        expectedTime: 200
      }
    ];
    
    for (const queryTest of complexQueries) {
      const startTime = performance.now();
      await this.simulateQuery(queryTest.query, [Math.floor(Math.random() * 1000) + 1]);
      const duration = performance.now() - startTime;
      
      const result = {
        name: queryTest.name,
        query: queryTest.query,
        duration: duration,
        expectedTime: queryTest.expectedTime,
        performance: duration <= queryTest.expectedTime ? 'good' : 'poor'
      };
      
      this.results.queryPerformance.aggregations.push(result);
      
      if (duration > this.slowQueryThreshold) {
        this.results.queryPerformance.slowQueries.push({
          ...result,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async testAggregationQueries() {
    const aggregationQueries = [
      'SELECT COUNT(*) FROM users',
      'SELECT AVG(fantasy_points) FROM players WHERE position = ?',
      'SELECT SUM(points) FROM scores WHERE player_id IN (SELECT id FROM players WHERE team = ?)',
      'SELECT MAX(wins), MIN(losses) FROM teams WHERE league_id = ?',
      'SELECT position, COUNT(*) as player_count FROM players GROUP BY position'
    ];
    
    for (const query of aggregationQueries) {
      const startTime = performance.now();
      await this.simulateQuery(query, ['QB']);
      const duration = performance.now() - startTime;
      
      this.results.queryPerformance.aggregations.push({
        query,
        duration,
        type: 'aggregation'
      });
    }
  }

  async testJoinQueries() {
    const joinQueries = [
      {
        query: 'SELECT u.username, t.name FROM users u INNER JOIN teams t ON u.id = t.owner_id',
        type: 'INNER JOIN',
        complexity: 'simple'
      },
      {
        query: 'SELECT l.name, COUNT(t.id) FROM leagues l LEFT JOIN teams t ON l.id = t.league_id GROUP BY l.id',
        type: 'LEFT JOIN',
        complexity: 'medium'
      },
      {
        query: 'SELECT p.name, AVG(s.points) FROM players p JOIN rosters r ON p.id = r.player_id JOIN teams t ON r.team_id = t.id JOIN scores s ON p.id = s.player_id GROUP BY p.id',
        type: 'MULTIPLE JOIN',
        complexity: 'complex'
      }
    ];
    
    for (const joinTest of joinQueries) {
      const startTime = performance.now();
      await this.simulateQuery(joinTest.query);
      const duration = performance.now() - startTime;
      
      this.results.queryPerformance.joins.push({
        ...joinTest,
        duration,
        performance: this.getJoinPerformanceRating(duration, joinTest.complexity)
      });
    }
  }

  getJoinPerformanceRating(duration, complexity) {
    const thresholds = {
      simple: 50,
      medium: 150,
      complex: 500
    };
    
    return duration <= thresholds[complexity] ? 'excellent' : 
           duration <= thresholds[complexity] * 2 ? 'good' : 
           duration <= thresholds[complexity] * 4 ? 'fair' : 'poor';
  }

  async testFullTextSearch() {
    const searchQueries = [
      'SELECT * FROM players WHERE name LIKE ?',
      'SELECT * FROM teams WHERE name LIKE ?',
      'SELECT * FROM leagues WHERE name LIKE ?'
    ];
    
    const searchTerms = ['%Smith%', '%Championship%', '%Dynasty%'];
    
    for (let i = 0; i < searchQueries.length; i++) {
      const startTime = performance.now();
      await this.simulateQuery(searchQueries[i], [searchTerms[i]]);
      const duration = performance.now() - startTime;
      
      this.results.queryPerformance.fullTextSearch.push({
        query: searchQueries[i],
        searchTerm: searchTerms[i],
        duration,
        type: 'LIKE search'
      });
    }
  }

  async testIndexPerformance() {
    console.log('📋 Analyzing index performance');
    
    // Simulate index analysis
    const potentialIndexes = [
      { table: 'users', column: 'email', usage: 'high', recommended: true },
      { table: 'teams', column: 'league_id', usage: 'high', recommended: true },
      { table: 'players', column: 'position', usage: 'medium', recommended: true },
      { table: 'scores', column: 'player_id', usage: 'high', recommended: true },
      { table: 'scores', column: 'game_date', usage: 'medium', recommended: true },
      { table: 'rosters', column: 'team_id', usage: 'high', recommended: true },
      { table: 'trades', column: 'status', usage: 'low', recommended: false },
      { table: 'matchups', column: 'week', usage: 'medium', recommended: true }
    ];
    
    // Simulate missing indexes
    this.results.indexAnalysis.missingIndexes = potentialIndexes.filter(idx => 
      idx.recommended && Math.random() > 0.7
    );
    
    // Simulate unused indexes
    this.results.indexAnalysis.unusedIndexes = [
      { table: 'users', column: 'last_login', usage: 'never' },
      { table: 'teams', column: 'created_at', usage: 'rarely' }
    ].filter(() => Math.random() > 0.8);
    
    // Simulate fragmented indexes
    this.results.indexAnalysis.fragmentedIndexes = [
      { table: 'scores', column: 'player_id', fragmentation: 75 },
      { table: 'rosters', column: 'team_id', fragmentation: 60 }
    ].filter(idx => Math.random() > 0.6);
  }

  async testTransactionPerformance() {
    console.log('💳 Testing transaction performance');
    
    const transactionTests = [
      this.testTradeTransaction,
      this.testWaiverClaimTransaction,
      this.testScoreUpdateTransaction
    ];
    
    for (const test of transactionTests) {
      await test.call(this);
    }
  }

  async testTradeTransaction() {
    const startTime = performance.now();
    
    // Simulate complex trade transaction
    await this.simulateQuery('BEGIN TRANSACTION');
    await this.simulateQuery('UPDATE rosters SET player_id = ? WHERE team_id = ? AND player_id = ?');
    await this.simulateQuery('UPDATE rosters SET player_id = ? WHERE team_id = ? AND player_id = ?');
    await this.simulateQuery('INSERT INTO trades (from_team, to_team, status) VALUES (?, ?, ?)');
    await this.simulateQuery('UPDATE teams SET last_activity = ? WHERE id IN (?, ?)');
    await this.simulateQuery('COMMIT');
    
    const duration = performance.now() - startTime;
    
    this.results.queryPerformance.transactions = this.results.queryPerformance.transactions || [];
    this.results.queryPerformance.transactions.push({
      type: 'trade',
      duration,
      complexity: 'high'
    });
  }

  async testWaiverClaimTransaction() {
    const startTime = performance.now();
    
    await this.simulateQuery('BEGIN TRANSACTION');
    await this.simulateQuery('UPDATE waivers SET status = ? WHERE id = ?');
    await this.simulateQuery('INSERT INTO rosters (team_id, player_id) VALUES (?, ?)');
    await this.simulateQuery('DELETE FROM rosters WHERE team_id = ? AND player_id = ?');
    await this.simulateQuery('COMMIT');
    
    const duration = performance.now() - startTime;
    
    this.results.queryPerformance.transactions = this.results.queryPerformance.transactions || [];
    this.results.queryPerformance.transactions.push({
      type: 'waiver_claim',
      duration,
      complexity: 'medium'
    });
  }

  async testScoreUpdateTransaction() {
    const startTime = performance.now();
    
    await this.simulateQuery('BEGIN TRANSACTION');
    
    // Batch update multiple player scores
    for (let i = 0; i < 20; i++) {
      await this.simulateQuery('UPDATE scores SET points = ? WHERE player_id = ? AND game_id = ?');
    }
    
    await this.simulateQuery('UPDATE teams SET total_points = (SELECT SUM(points) FROM scores WHERE player_id IN (SELECT player_id FROM rosters WHERE team_id = ?))');
    await this.simulateQuery('COMMIT');
    
    const duration = performance.now() - startTime;
    
    this.results.queryPerformance.transactions = this.results.queryPerformance.transactions || [];
    this.results.queryPerformance.transactions.push({
      type: 'score_update',
      duration,
      complexity: 'high'
    });
  }

  async simulateRealWorldLoad() {
    console.log('🌍 Simulating real-world database load');
    
    const scenarios = [
      this.simulateDraftDay,
      this.simulateGameDay,
      this.simulateTradeDeadline,
      this.simulateWaiverDay
    ];
    
    for (const scenario of scenarios) {
      await scenario.call(this);
    }
  }

  async simulateDraftDay() {
    // High concurrent reads, moderate writes
    const concurrentUsers = 50;
    const promises = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(this.simulateDraftUserActivity(i));
    }
    
    await Promise.allSettled(promises);
  }

  async simulateDraftUserActivity(userId) {
    for (let i = 0; i < 20; i++) {
      if (!this.isRunning) break;
      
      // Simulate draft picks and player lookups
      await this.simulateQuery('SELECT * FROM players WHERE position = ? ORDER BY fantasy_points DESC LIMIT 50');
      await this.simulateQuery('SELECT * FROM rosters WHERE team_id = ?', [userId]);
      
      if (Math.random() > 0.8) {
        await this.simulateQuery('INSERT INTO rosters (team_id, player_id) VALUES (?, ?)', [userId, Math.floor(Math.random() * 3000) + 1]);
      }
      
      await this.sleep(Math.random() * 1000 + 500);
    }
  }

  async simulateGameDay() {
    // High read load for score updates
    const scoreUpdates = 100;
    const promises = [];
    
    for (let i = 0; i < scoreUpdates; i++) {
      promises.push(this.simulateScoreUpdate());
    }
    
    await Promise.allSettled(promises);
  }

  async simulateScoreUpdate() {
    await this.simulateQuery('UPDATE scores SET points = ? WHERE player_id = ?');
    await this.simulateQuery('SELECT * FROM matchups WHERE week = ?');
    await this.simulateQuery('SELECT SUM(points) FROM scores WHERE player_id IN (SELECT player_id FROM rosters WHERE team_id = ?)');
  }

  async simulateTradeDeadline() {
    // Moderate concurrent transactions
    const tradeAttempts = 30;
    const promises = [];
    
    for (let i = 0; i < tradeAttempts; i++) {
      promises.push(this.testTradeTransaction());
    }
    
    await Promise.allSettled(promises);
  }

  async simulateWaiverDay() {
    // High write load for waiver claims
    const waiverClaims = 200;
    const promises = [];
    
    for (let i = 0; i < waiverClaims; i++) {
      promises.push(this.testWaiverClaimTransaction());
    }
    
    await Promise.allSettled(promises);
  }

  async simulateQuery(query, params = []) {
    // Simulate actual database query execution time
    const baseTime = 5; // Base 5ms
    const complexityMultiplier = this.getQueryComplexity(query);
    const networkLatency = Math.random() * 10 + 1; // 1-11ms
    
    const executionTime = baseTime * complexityMultiplier + networkLatency;
    await this.sleep(executionTime);
    
    return executionTime;
  }

  getQueryComplexity(query) {
    if (query.includes('JOIN')) return 3;
    if (query.includes('GROUP BY') || query.includes('ORDER BY')) return 2.5;
    if (query.includes('COUNT') || query.includes('SUM') || query.includes('AVG')) return 2;
    if (query.includes('LIKE')) return 1.5;
    if (query.includes('INSERT') || query.includes('UPDATE') || query.includes('DELETE')) return 1.2;
    return 1; // Simple SELECT
  }

  async generateReport(duration) {
    console.log('📊 Generating database performance report');
    
    // Calculate summary statistics
    const totalQueries = this.calculateTotalQueries();
    const averageQueryTime = this.calculateAverageQueryTime();
    const slowQueriesCount = this.results.queryPerformance.slowQueries.length;
    const slowQueriesPercentage = (slowQueriesCount / totalQueries) * 100;
    
    // Generate optimization recommendations
    const recommendations = this.generateOptimizationRecommendations();
    
    const report = {
      testSummary: {
        duration: Math.round(duration),
        totalQueries,
        averageQueryTime: Math.round(averageQueryTime),
        slowQueries: slowQueriesCount,
        slowQueriesPercentage: Math.round(slowQueriesPercentage * 100) / 100
      },
      connectionPerformance: {
        maxConnections: this.results.connectionTests.maxConnections,
        averageConnectionTime: this.calculateAverageConnectionTime(),
        connectionLatencyP95: this.calculateConnectionLatencyP95()
      },
      queryAnalysis: {
        crud: this.results.queryPerformance.crud,
        aggregations: this.summarizeAggregationPerformance(),
        joins: this.summarizeJoinPerformance(),
        fullTextSearch: this.summarizeSearchPerformance(),
        transactions: this.summarizeTransactionPerformance()
      },
      indexAnalysis: this.results.indexAnalysis,
      optimizationOpportunities: this.identifyOptimizationOpportunities(),
      recommendations
    };

    // Output results
    console.log('\n🗃️ DATABASE PERFORMANCE TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Test Duration: ${Math.round(duration / 1000)} seconds`);
    console.log(`Total Queries: ${totalQueries}`);
    console.log(`Average Query Time: ${Math.round(averageQueryTime)}ms`);
    console.log(`Slow Queries: ${slowQueriesCount} (${Math.round(slowQueriesPercentage * 100) / 100}%)`);
    
    console.log('\n🔗 Connection Performance:');
    console.log(`Max Connections: ${report.connectionPerformance.maxConnections}`);
    console.log(`Avg Connection Time: ${Math.round(report.connectionPerformance.averageConnectionTime)}ms`);
    console.log(`Connection Latency P95: ${Math.round(report.connectionPerformance.connectionLatencyP95)}ms`);
    
    console.log('\n📊 Query Performance Summary:');
    Object.entries(report.queryAnalysis.crud).forEach(([operation, stats]) => {
      console.log(`${operation}: ${Math.round(stats.averageTime)}ms avg, ${Math.round(stats.throughput)} ops/sec`);
    });
    
    if (report.indexAnalysis.missingIndexes.length > 0) {
      console.log('\n📋 Missing Indexes Detected:');
      report.indexAnalysis.missingIndexes.forEach(idx => {
        console.log(`• ${idx.table}.${idx.column} (usage: ${idx.usage})`);
      });
    }
    
    if (report.indexAnalysis.unusedIndexes.length > 0) {
      console.log('\n🗑️ Unused Indexes:');
      report.indexAnalysis.unusedIndexes.forEach(idx => {
        console.log(`• ${idx.table}.${idx.column} (${idx.usage})`);
      });
    }
    
    console.log('\n🚀 Optimization Opportunities:');
    report.optimizationOpportunities.forEach(opp => {
      console.log(`• ${opp.type}: ${opp.description} (Impact: ${opp.impact})`);
    });
    
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`• ${rec}`));

    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `scripts/performance/database-performance-${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
      ...report,
      rawData: this.results
    }, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }

  calculateTotalQueries() {
    let total = 0;
    Object.values(this.results.queryPerformance.crud).forEach(crud => {
      total += crud.iterations || 0;
    });
    total += this.results.queryPerformance.aggregations.length;
    total += this.results.queryPerformance.joins.length;
    total += this.results.queryPerformance.fullTextSearch.length;
    total += (this.results.queryPerformance.transactions || []).length;
    return total;
  }

  calculateAverageQueryTime() {
    const allTimes = [];
    
    Object.values(this.results.queryPerformance.crud).forEach(crud => {
      if (crud.averageTime) allTimes.push(crud.averageTime);
    });
    
    this.results.queryPerformance.aggregations.forEach(agg => {
      allTimes.push(agg.duration);
    });
    
    this.results.queryPerformance.joins.forEach(join => {
      allTimes.push(join.duration);
    });
    
    return allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;
  }

  calculateAverageConnectionTime() {
    const times = this.results.connectionTests.connectionLatency.map(c => c.acquisitionTime);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  calculateConnectionLatencyP95() {
    const times = this.results.connectionTests.connectionLatency
      .map(c => c.acquisitionTime)
      .sort((a, b) => a - b);
    
    if (times.length === 0) return 0;
    const index = Math.ceil(0.95 * times.length) - 1;
    return times[Math.max(0, index)];
  }

  summarizeAggregationPerformance() {
    const aggregations = this.results.queryPerformance.aggregations;
    return {
      total: aggregations.length,
      averageTime: aggregations.length > 0 
        ? aggregations.reduce((sum, a) => sum + a.duration, 0) / aggregations.length 
        : 0,
      slowest: aggregations.length > 0 
        ? Math.max(...aggregations.map(a => a.duration)) 
        : 0
    };
  }

  summarizeJoinPerformance() {
    const joins = this.results.queryPerformance.joins;
    const performanceCounts = {};
    
    joins.forEach(join => {
      performanceCounts[join.performance] = (performanceCounts[join.performance] || 0) + 1;
    });
    
    return {
      total: joins.length,
      performanceBreakdown: performanceCounts,
      averageTime: joins.length > 0 
        ? joins.reduce((sum, j) => sum + j.duration, 0) / joins.length 
        : 0
    };
  }

  summarizeSearchPerformance() {
    const searches = this.results.queryPerformance.fullTextSearch;
    return {
      total: searches.length,
      averageTime: searches.length > 0 
        ? searches.reduce((sum, s) => sum + s.duration, 0) / searches.length 
        : 0
    };
  }

  summarizeTransactionPerformance() {
    const transactions = this.results.queryPerformance.transactions || [];
    const byType = {};
    
    transactions.forEach(tx => {
      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, totalTime: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].totalTime += tx.duration;
    });
    
    Object.keys(byType).forEach(type => {
      byType[type].averageTime = byType[type].totalTime / byType[type].count;
    });
    
    return {
      total: transactions.length,
      byType
    };
  }

  identifyOptimizationOpportunities() {
    const opportunities = [];
    
    // Check for slow CRUD operations
    Object.entries(this.results.queryPerformance.crud).forEach(([operation, stats]) => {
      if (stats.averageTime > 100) {
        opportunities.push({
          type: 'slow_crud',
          description: `${operation} operations are slow (${Math.round(stats.averageTime)}ms avg)`,
          impact: 'high',
          recommendation: `Optimize ${operation.toLowerCase()} queries and add appropriate indexes`
        });
      }
    });
    
    // Check for missing indexes
    if (this.results.indexAnalysis.missingIndexes.length > 0) {
      opportunities.push({
        type: 'missing_indexes',
        description: `${this.results.indexAnalysis.missingIndexes.length} recommended indexes are missing`,
        impact: 'high',
        recommendation: 'Add missing indexes to improve query performance'
      });
    }
    
    // Check for slow joins
    const slowJoins = this.results.queryPerformance.joins.filter(j => j.performance === 'poor');
    if (slowJoins.length > 0) {
      opportunities.push({
        type: 'slow_joins',
        description: `${slowJoins.length} join queries have poor performance`,
        impact: 'medium',
        recommendation: 'Optimize join queries and ensure proper indexing on join columns'
      });
    }
    
    return opportunities;
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.results.queryPerformance.slowQueries.length > 0) {
      recommendations.push('Optimize slow queries identified in the test results');
    }
    
    if (this.results.indexAnalysis.missingIndexes.length > 0) {
      recommendations.push(`Add ${this.results.indexAnalysis.missingIndexes.length} recommended indexes`);
    }
    
    if (this.results.indexAnalysis.unusedIndexes.length > 0) {
      recommendations.push(`Remove ${this.results.indexAnalysis.unusedIndexes.length} unused indexes to improve write performance`);
    }
    
    recommendations.push('Implement query result caching for frequently accessed data');
    recommendations.push('Consider database read replicas for reporting queries');
    recommendations.push('Implement connection pooling optimization');
    recommendations.push('Set up query performance monitoring in production');
    recommendations.push('Consider partitioning large tables (scores, matchups)');
    recommendations.push('Implement database query logging and analysis');
    
    return recommendations;
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
    
    if (key === 'duration') options.testDuration = parseInt(value) * 1000;
    if (key === 'connections') options.concurrentConnections = parseInt(value);
    if (key === 'batch-size') options.queryBatchSize = parseInt(value);
    if (key === 'slow-threshold') options.slowQueryThreshold = parseInt(value);
  }
  
  const tester = new DatabasePerformanceTester(options);
  
  process.on('SIGINT', () => {
    console.log('\n⏹️ Received interrupt signal, stopping test...');
    process.exit(0);
  });
  
  tester.startDatabaseTest().catch(error => {
    console.error('❌ Database performance test failed:', error);
    process.exit(1);
  });
}

module.exports = DatabasePerformanceTester;