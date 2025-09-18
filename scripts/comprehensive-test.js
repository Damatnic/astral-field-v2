const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds per test

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  startTime: Date.now(),
  endTime: null
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test utilities
async function testEndpoint(name, method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const startTime = performance.now();
  
  console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
  console.log(`  ${method} ${url}`);
  
  try {
    const config = {
      method,
      url,
      timeout: TEST_TIMEOUT,
      validateStatus: () => true, // Don't throw on any status
      ...options
    };
    
    const response = await axios(config);
    const duration = (performance.now() - startTime).toFixed(2);
    
    // Analyze response
    const isSuccess = response.status >= 200 && response.status < 400;
    const isWarning = response.status >= 400 && response.status < 500;
    const isError = response.status >= 500;
    
    const result = {
      name,
      method,
      path,
      status: response.status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    
    if (isSuccess) {
      console.log(`  ${colors.green}✓ PASSED${colors.reset} - Status: ${response.status} (${duration}ms)`);
      testResults.passed.push(result);
    } else if (isWarning) {
      console.log(`  ${colors.yellow}⚠ WARNING${colors.reset} - Status: ${response.status} (${duration}ms)`);
      testResults.warnings.push({ ...result, message: response.data?.error || 'Client error' });
    } else {
      console.log(`  ${colors.red}✗ FAILED${colors.reset} - Status: ${response.status} (${duration}ms)`);
      testResults.failed.push({ ...result, error: response.data?.error || 'Server error' });
    }
    
    return response;
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`  ${colors.red}✗ ERROR${colors.reset} - ${error.message} (${duration}ms)`);
    testResults.failed.push({
      name,
      method,
      path,
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

// Feature test groups
async function testAuthenticationAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== AUTHENTICATION APIS ===${colors.reset}`);
  
  await testEndpoint('Health Check', 'GET', '/api/health');
  await testEndpoint('Simple Login', 'POST', '/api/auth/simple-login', {
    data: { email: 'test@example.com', password: 'test123' }
  });
  await testEndpoint('Production Login', 'POST', '/api/auth/production-login', {
    data: { email: 'test@example.com', password: 'test123' }
  });
  await testEndpoint('Auth Debug', 'GET', '/api/auth/debug');
}

async function testLeagueAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== LEAGUE APIS ===${colors.reset}`);
  
  await testEndpoint('List Leagues', 'GET', '/api/leagues');
  await testEndpoint('Get League', 'GET', '/api/leagues/123');
  await testEndpoint('League Activity', 'GET', '/api/leagues/123/activity');
  await testEndpoint('Damato Dynasty League', 'GET', '/api/league/damato');
  await testEndpoint('Commissioner Tools', 'GET', '/api/commissioner');
}

async function testPlayerAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== PLAYER APIS ===${colors.reset}`);
  
  await testEndpoint('List Players', 'GET', '/api/players');
  await testEndpoint('Search Players', 'GET', '/api/players?search=mahomes');
  await testEndpoint('Filter by Position', 'GET', '/api/players?position=QB');
}

async function testTeamAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== TEAM APIS ===${colors.reset}`);
  
  await testEndpoint('Get Team', 'GET', '/api/teams/123');
  await testEndpoint('Update Team', 'PUT', '/api/teams/123', {
    data: { name: 'Test Team' }
  });
  await testEndpoint('Get Team Lineup', 'GET', '/api/teams/123/lineup');
  await testEndpoint('Update Team Lineup', 'PUT', '/api/teams/123/lineup', {
    data: { lineup: [] }
  });
}

async function testScoringAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== SCORING APIS ===${colors.reset}`);
  
  await testEndpoint('Live Scores', 'GET', '/api/scoring/live');
  await testEndpoint('Update Scores', 'POST', '/api/scoring/update');
  await testEndpoint('Score Projections', 'GET', '/api/scoring/projections');
}

async function testTradeAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== TRADE APIS ===${colors.reset}`);
  
  await testEndpoint('Create Trade', 'POST', '/api/trades/create', {
    data: { 
      leagueId: '123',
      proposingTeamId: '456',
      receivingTeamId: '789',
      proposingPlayers: [],
      receivingPlayers: []
    }
  });
  await testEndpoint('Analyze Trade', 'GET', '/api/trades/123/analyze');
  await testEndpoint('Respond to Trade', 'POST', '/api/trades/123/respond', {
    data: { action: 'accept' }
  });
  await testEndpoint('League Trades', 'GET', '/api/trades/league/123');
  await testEndpoint('Trade Analyzer', 'POST', '/api/trade/analyze', {
    data: { tradeDetails: {} }
  });
}

async function testDraftAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== DRAFT APIS ===${colors.reset}`);
  
  await testEndpoint('Get Draft Board', 'GET', '/api/draft/123/board');
  await testEndpoint('Make Draft Pick', 'POST', '/api/draft/123/pick', {
    data: { playerId: '456', teamId: '789' }
  });
  await testEndpoint('Live Draft Updates', 'GET', '/api/draft/123/live');
  await testEndpoint('Auto Pick', 'POST', '/api/draft/123/auto-pick', {
    data: { teamId: '789' }
  });
}

async function testWaiverAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== WAIVER APIS ===${colors.reset}`);
  
  await testEndpoint('Submit Waiver Claim', 'POST', '/api/waivers/claims', {
    data: { teamId: '123', playerId: '456', priority: 1 }
  });
  await testEndpoint('Process Waivers', 'POST', '/api/waivers/process');
}

async function testNotificationAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== NOTIFICATION APIS ===${colors.reset}`);
  
  await testEndpoint('Get Preferences', 'GET', '/api/notifications/preferences');
  await testEndpoint('Update Preferences', 'PUT', '/api/notifications/preferences', {
    data: { emailEnabled: true, pushEnabled: false }
  });
  await testEndpoint('Send Notification', 'POST', '/api/notifications/send', {
    data: { type: 'trade_offer', userId: '123', message: 'Test' }
  });
}

async function testSleeperIntegration() {
  console.log(`\n${colors.bright}${colors.blue}=== SLEEPER INTEGRATION APIS ===${colors.reset}`);
  
  await testEndpoint('Sleeper State', 'GET', '/api/sleeper/state');
  await testEndpoint('Sleeper Integration Status', 'GET', '/api/sleeper/integration');
  await testEndpoint('Sleeper Database', 'GET', '/api/sleeper/database');
  await testEndpoint('Sleeper Sync', 'POST', '/api/sleeper/sync');
  await testEndpoint('Sleeper League', 'GET', '/api/sleeper/league');
  await testEndpoint('Sleeper Scores', 'GET', '/api/sleeper/scores');
  await testEndpoint('Sleeper Test', 'GET', '/api/sleeper/test');
}

async function testAIAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== AI APIS ===${colors.reset}`);
  
  await testEndpoint('Optimize Lineup', 'POST', '/api/ai/optimize-lineup', {
    data: { teamId: '123', week: 1 }
  });
  await testEndpoint('Predict Injuries', 'POST', '/api/injury/predict', {
    data: { playerId: '456' }
  });
}

async function testPerformanceAPIs() {
  console.log(`\n${colors.bright}${colors.blue}=== PERFORMANCE & MONITORING APIS ===${colors.reset}`);
  
  await testEndpoint('Performance Metrics', 'GET', '/api/performance');
  await testEndpoint('Error Logs', 'GET', '/api/errors');
  await testEndpoint('Test Deployment', 'GET', '/api/test-deployment');
}

async function testStaticAssets() {
  console.log(`\n${colors.bright}${colors.blue}=== STATIC ASSETS ===${colors.reset}`);
  
  await testEndpoint('Generate Avatar', 'GET', '/api/avatars/TestUser');
}

async function testPages() {
  console.log(`\n${colors.bright}${colors.blue}=== PAGE ROUTES ===${colors.reset}`);
  
  const pages = [
    '/',
    '/login',
    '/leagues',
    '/players',
    '/oracle',
    '/trade',
    '/draft',
    '/schedule',
    '/analytics',
    '/chat',
    '/activity'
  ];
  
  for (const page of pages) {
    await testEndpoint(`Page: ${page}`, 'GET', page);
  }
}

// Run all tests
async function runComprehensiveTests() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         ASTRAL FIELD V1 - COMPREHENSIVE FEATURE TEST         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('────────────────────────────────────────────────────────────────');
  
  // Run all test groups
  await testAuthenticationAPIs();
  await testLeagueAPIs();
  await testPlayerAPIs();
  await testTeamAPIs();
  await testScoringAPIs();
  await testTradeAPIs();
  await testDraftAPIs();
  await testWaiverAPIs();
  await testNotificationAPIs();
  await testSleeperIntegration();
  await testAIAPIs();
  await testPerformanceAPIs();
  await testStaticAssets();
  await testPages();
  
  // Calculate results
  testResults.endTime = Date.now();
  const totalDuration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);
  const totalTests = testResults.passed.length + testResults.failed.length + testResults.warnings.length;
  const passRate = totalTests > 0 ? ((testResults.passed.length / totalTests) * 100).toFixed(1) : 0;
  
  // Print summary
  console.log(`\n${colors.bright}${colors.cyan}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                         TEST SUMMARY                           ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`${colors.reset}`);
  
  console.log(`\n📊 ${colors.bright}Overall Results:${colors.reset}`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ${colors.green}✓ Passed: ${testResults.passed.length}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠ Warnings: ${testResults.warnings.length}${colors.reset}`);
  console.log(`   ${colors.red}✗ Failed: ${testResults.failed.length}${colors.reset}`);
  console.log(`   Pass Rate: ${passRate}%`);
  console.log(`   Total Duration: ${totalDuration}s`);
  
  if (testResults.failed.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    testResults.failed.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name} - ${test.method} ${test.path}`);
      console.log(`     Error: ${test.error}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bright}Warnings:${colors.reset}`);
    testResults.warnings.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name} - Status ${test.status}`);
      console.log(`     Message: ${test.message}`);
    });
  }
  
  // Deployment recommendation
  console.log(`\n${colors.bright}📋 Deployment Recommendation:${colors.reset}`);
  if (testResults.failed.length === 0 && testResults.warnings.length < 5) {
    console.log(`  ${colors.green}✅ READY FOR DEPLOYMENT${colors.reset}`);
    console.log(`  All critical features are working properly.`);
  } else if (testResults.failed.length > 0) {
    console.log(`  ${colors.red}❌ NOT READY FOR DEPLOYMENT${colors.reset}`);
    console.log(`  ${testResults.failed.length} critical failures need to be fixed.`);
  } else {
    console.log(`  ${colors.yellow}⚠️ DEPLOY WITH CAUTION${colors.reset}`);
    console.log(`  Review ${testResults.warnings.length} warnings before deployment.`);
  }
  
  console.log(`\n${colors.cyan}Test completed at ${new Date().toLocaleString()}${colors.reset}`);
  console.log('────────────────────────────────────────────────────────────────\n');
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runComprehensiveTests().catch(error => {
  console.error(`${colors.red}Fatal error during testing:${colors.reset}`, error);
  process.exit(1);
});