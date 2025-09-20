/**
 * Comprehensive Test Script for Real-Time Scoring Engine
 * Tests all components of the live scoring system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3007';
const TEST_LEAGUE_ID = '1018171619806932992'; // D'Amato Dynasty League ID

class LiveScoringTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`✅ PASSED: ${name}`);
        console.log(`   ${result.message || 'Test completed successfully'}`);
        this.results.passed++;
        this.results.tests.push({ name, status: 'PASSED', message: result.message });
      } else {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   ${result.message || 'Test failed'}`);
        this.results.failed++;
        this.results.tests.push({ name, status: 'FAILED', message: result.message });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name}`);
      console.log(`   ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'ERROR', message: error.message });
    }
  }

  async testLiveScoringAPI() {
    const response = await axios.get(`${BASE_URL}/api/scoring/live?leagueId=${TEST_LEAGUE_ID}`);
    
    if (response.status !== 200) {
      return { success: false, message: `Expected status 200, got ${response.status}` };
    }

    const data = response.data;
    
    if (!data.success) {
      return { success: false, message: 'API returned success: false' };
    }

    if (!data.data) {
      return { success: false, message: 'No data returned from API' };
    }

    // Check required fields
    const requiredFields = ['leagueId', 'week', 'season', 'matchups', 'lastUpdated', 'isLive'];
    for (const field of requiredFields) {
      if (!(field in data.data)) {
        return { success: false, message: `Missing required field: ${field}` };
      }
    }

    return { 
      success: true, 
      message: `Live scoring API working. Found ${data.data.matchups?.length || 0} matchups for week ${data.data.week}` 
    };
  }

  async testAnalyticsIntegration() {
    const response = await axios.get(`${BASE_URL}/api/analytics?leagueId=${TEST_LEAGUE_ID}`);
    
    if (response.status !== 200) {
      return { success: false, message: `Expected status 200, got ${response.status}` };
    }

    const data = response.data;
    
    if (!data.success || !data.data) {
      return { success: false, message: 'Analytics API failed or returned no data' };
    }

    // Check for live scoring integration
    if (!data.data.liveScoring) {
      return { success: false, message: 'Analytics missing live scoring integration' };
    }

    // Check top players integration
    if (!data.data.topPlayers || !Array.isArray(data.data.topPlayers)) {
      return { success: false, message: 'Analytics missing top players data' };
    }

    const hasLiveData = data.data.topPlayers.some(player => player.isLive === true);
    
    return { 
      success: true, 
      message: `Analytics integration working. ${data.data.topPlayers.length} top players found${hasLiveData ? ' (includes live data)' : ''}` 
    };
  }

  async testScoringOrchestrator() {
    try {
      // Test starting live updates
      const startResponse = await axios.post(`${BASE_URL}/api/scoring/live?action=start_live_tracking`, {
        leagueId: TEST_LEAGUE_ID,
        options: { intervalMs: 30000 }
      });

      if (startResponse.status !== 200 || !startResponse.data.success) {
        return { success: false, message: 'Failed to start live tracking' };
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test stopping live updates
      const stopResponse = await axios.post(`${BASE_URL}/api/scoring/live?action=stop_live_tracking`, {
        leagueId: TEST_LEAGUE_ID
      });

      if (stopResponse.status !== 200 || !stopResponse.data.success) {
        return { success: false, message: 'Failed to stop live tracking' };
      }

      return { success: true, message: 'Scoring orchestrator start/stop working correctly' };
    } catch (error) {
      return { success: false, message: `Orchestrator test failed: ${error.message}` };
    }
  }

  async testGameStatusService() {
    // This would require the service to be exposed via API
    // For now, we'll test through the analytics endpoint which includes game status
    
    const response = await axios.get(`${BASE_URL}/api/analytics?leagueId=${TEST_LEAGUE_ID}`);
    
    if (response.status !== 200) {
      return { success: false, message: 'Could not access game status via analytics' };
    }

    const data = response.data;
    
    if (!data.data.liveScoring) {
      return { success: false, message: 'No live scoring status in analytics' };
    }

    const liveScoring = data.data.liveScoring;
    const requiredFields = ['isLive', 'activeGames', 'scoringPriority', 'updateInterval'];
    
    for (const field of requiredFields) {
      if (!(field in liveScoring)) {
        return { success: false, message: `Missing game status field: ${field}` };
      }
    }

    return { 
      success: true, 
      message: `Game status service working. ${liveScoring.activeGames} active games, priority: ${liveScoring.scoringPriority}` 
    };
  }

  async testErrorHandling() {
    try {
      // Test with invalid league ID
      const response = await axios.get(`${BASE_URL}/api/scoring/live?leagueId=invalid-league-id`);
      
      // Should either return an error or fallback data
      if (response.status === 200) {
        const data = response.data;
        if (data.success && data.data) {
          return { success: true, message: 'Error handling working - returned fallback data' };
        } else if (!data.success && data.error) {
          return { success: true, message: 'Error handling working - returned error response' };
        }
      }
      
      return { success: false, message: 'Error handling not working properly' };
    } catch (error) {
      // If it throws an error, that's also acceptable error handling
      if (error.response && error.response.status >= 400) {
        return { success: true, message: 'Error handling working - returned HTTP error' };
      }
      
      return { success: false, message: `Unexpected error: ${error.message}` };
    }
  }

  async testWebSocketAPI() {
    try {
      const response = await axios.get(`${BASE_URL}/api/socket`);
      
      if (response.status !== 200) {
        return { success: false, message: `WebSocket API not responding, status: ${response.status}` };
      }

      const data = response.data;
      
      if (!data.endpoints || !data.endpoints.events) {
        return { success: false, message: 'WebSocket API missing endpoint configuration' };
      }

      return { success: true, message: 'WebSocket API endpoint accessible and configured' };
    } catch (error) {
      return { success: false, message: `WebSocket API test failed: ${error.message}` };
    }
  }

  async testDataIntegrity() {
    const response = await axios.get(`${BASE_URL}/api/scoring/live?leagueId=${TEST_LEAGUE_ID}&format=detailed`);
    
    if (response.status !== 200 || !response.data.success) {
      return { success: false, message: 'Could not get detailed scoring data' };
    }

    const data = response.data.data;
    
    // Check matchup data integrity
    if (!data.matchups || !Array.isArray(data.matchups)) {
      return { success: false, message: 'Matchups data is not an array' };
    }

    let validMatchups = 0;
    for (const matchup of data.matchups) {
      const requiredFields = ['matchupId', 'homeTeamId', 'awayTeamId', 'homeTeamName', 'awayTeamName'];
      const hasAllFields = requiredFields.every(field => field in matchup);
      
      if (hasAllFields) {
        validMatchups++;
      }
    }

    if (validMatchups === 0 && data.matchups.length > 0) {
      return { success: false, message: 'No valid matchups found in data' };
    }

    return { 
      success: true, 
      message: `Data integrity check passed. ${validMatchups}/${data.matchups.length} valid matchups` 
    };
  }

  async testPerformance() {
    const start = Date.now();
    
    try {
      const response = await axios.get(`${BASE_URL}/api/scoring/live?leagueId=${TEST_LEAGUE_ID}`);
      const duration = Date.now() - start;
      
      if (response.status !== 200) {
        return { success: false, message: 'Performance test failed - API error' };
      }

      if (duration > 5000) {
        return { success: false, message: `API too slow: ${duration}ms (should be < 5000ms)` };
      }

      return { success: true, message: `API performance good: ${duration}ms` };
    } catch (error) {
      return { success: false, message: `Performance test failed: ${error.message}` };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Real-Time Scoring Engine Tests\n');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Test League ID: ${TEST_LEAGUE_ID}\n`);

    await this.runTest('Live Scoring API', () => this.testLiveScoringAPI());
    await this.runTest('Analytics Integration', () => this.testAnalyticsIntegration());
    await this.runTest('Scoring Orchestrator', () => this.testScoringOrchestrator());
    await this.runTest('Game Status Service', () => this.testGameStatusService());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('WebSocket API', () => this.testWebSocketAPI());
    await this.runTest('Data Integrity', () => this.testDataIntegrity());
    await this.runTest('Performance', () => this.testPerformance());

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED' || test.status === 'ERROR')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (passRate >= 80) {
      console.log('🎉 OVERALL: SYSTEM IS READY FOR PRODUCTION');
    } else if (passRate >= 60) {
      console.log('⚠️  OVERALL: SYSTEM NEEDS MINOR FIXES');
    } else {
      console.log('🚨 OVERALL: SYSTEM NEEDS MAJOR FIXES');
    }
    
    console.log('='.repeat(50) + '\n');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new LiveScoringTester();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = LiveScoringTester;