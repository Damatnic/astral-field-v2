const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

console.log('🔍 Identifying Failing Endpoints...');
console.log(`Base URL: ${BASE_URL}\n`);

async function testAllEndpoints() {
  const endpoints = [
    // Authentication
    { name: 'Health Check', url: '/api/health', method: 'GET', expectedStatus: [200] },
    { name: 'Simple Login', url: '/api/auth/simple-login', method: 'POST', 
      body: { email: 'test@example.com', password: 'password' }, expectedStatus: [200, 401] },
    { name: 'Production Login', url: '/api/auth/production-login', method: 'POST',
      body: { email: 'nicholas.damato@astralfield.com', password: 'player123!' }, expectedStatus: [200, 401] },
    
    // Leagues
    { name: 'List Leagues', url: '/api/leagues', method: 'GET', expectedStatus: [200, 401] },
    { name: 'Get League', url: '/api/leagues/1', method: 'GET', expectedStatus: [200, 404] },
    { name: 'League Activity', url: '/api/leagues/1/activity', method: 'GET', expectedStatus: [200] },
    { name: 'League Standings', url: '/api/leagues/1/standings', method: 'GET', expectedStatus: [200] },
    
    // Teams
    { name: 'Get Team', url: '/api/teams/1', method: 'GET', expectedStatus: [200, 404] },
    { name: 'Team Lineup', url: '/api/teams/1/lineup', method: 'GET', expectedStatus: [200] },
    { name: 'My Team', url: '/api/my-team', method: 'GET', expectedStatus: [200, 401] },
    
    // Players
    { name: 'List Players', url: '/api/players', method: 'GET', expectedStatus: [200, 401] },
    { name: 'Search Players', url: '/api/players?search=mahomes', method: 'GET', expectedStatus: [200, 401] },
    
    // Scoring
    { name: 'Live Scores', url: '/api/scoring/live', method: 'GET', expectedStatus: [200] },
    { name: 'Score Projections', url: '/api/scoring/projections', method: 'GET', expectedStatus: [200] },
    { name: 'Update Scores', url: '/api/scoring/update', method: 'POST', 
      body: { leagueId: '1', week: 1 }, expectedStatus: [200, 400] },
    
    // Trades
    { name: 'Create Trade', url: '/api/trades/create', method: 'POST',
      body: { leagueId: '1', teamId: '1', trade: {} }, expectedStatus: [200, 400, 401] },
    { name: 'Analyze Trade', url: '/api/trades/1/analyze', method: 'GET', expectedStatus: [200] },
    { name: 'Trade Response', url: '/api/trades/1/respond', method: 'POST',
      body: { action: 'accept' }, expectedStatus: [200, 400, 404] },
    
    // Draft
    { name: 'Draft Board', url: '/api/draft/1/board', method: 'GET', expectedStatus: [200] },
    { name: 'Draft Pick', url: '/api/draft/1/pick', method: 'POST',
      body: { playerId: 'player-1', teamId: '1' }, expectedStatus: [200, 400, 500] },
    { name: 'Live Draft', url: '/api/draft/1/live', method: 'GET', expectedStatus: [200] },
    
    // Waivers
    { name: 'Waiver Claims', url: '/api/waivers/claims', method: 'GET', expectedStatus: [200, 401] },
    { name: 'Process Waivers', url: '/api/waivers/process', method: 'POST',
      body: { leagueId: '1' }, expectedStatus: [200, 401] },
    
    // Notifications
    { name: 'Get Preferences', url: '/api/notifications/preferences', method: 'GET', expectedStatus: [200, 401] },
    { name: 'Update Preferences', url: '/api/notifications/preferences', method: 'PUT',
      body: { emailNotifications: true }, expectedStatus: [200, 401] },
    
    // Sleeper Integration
    { name: 'Sleeper State', url: '/api/sleeper/state', method: 'GET', expectedStatus: [200] },
    { name: 'Sleeper Integration', url: '/api/sleeper/integration', method: 'GET', expectedStatus: [200] },
    { name: 'Sleeper Database', url: '/api/sleeper/database', method: 'GET', expectedStatus: [200] },
    { name: 'Sleeper Test', url: '/api/sleeper/test', method: 'GET', expectedStatus: [200] },
    
    // Commissioner
    { name: 'Commissioner Tools', url: '/api/commissioner', method: 'GET', expectedStatus: [200, 403] },
    
    // Performance
    { name: 'Performance Metrics', url: '/api/performance', method: 'GET', expectedStatus: [200] },
    { name: 'Error Logs', url: '/api/errors', method: 'GET', expectedStatus: [200] },
    { name: 'Test Deployment', url: '/api/test-deployment', method: 'GET', expectedStatus: [200] }
  ];
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      
      if (endpoint.expectedStatus.includes(response.status)) {
        console.log(`✅ ${endpoint.name}: PASSED (${response.status})`);
        results.passed.push(endpoint.name);
      } else if (response.status >= 500) {
        console.log(`❌ ${endpoint.name}: FAILED (${response.status}) - Server Error`);
        results.failed.push({ name: endpoint.name, status: response.status, url: endpoint.url });
      } else if (response.status >= 400) {
        console.log(`⚠️  ${endpoint.name}: WARNING (${response.status})`);
        results.warnings.push({ name: endpoint.name, status: response.status, url: endpoint.url });
      } else {
        console.log(`✅ ${endpoint.name}: PASSED (${response.status})`);
        results.passed.push(endpoint.name);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      results.failed.push({ name: endpoint.name, error: error.message, url: endpoint.url });
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📈 Pass Rate: ${((results.passed.length / endpoints.length) * 100).toFixed(1)}%`);
  
  if (results.failed.length > 0) {
    console.log('\n🔴 Failed Endpoints to Fix:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.status || f.error} (${f.url})`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n🟡 Warnings to Review:');
    results.warnings.forEach(w => {
      console.log(`  - ${w.name}: ${w.status} (${w.url})`);
    });
  }
  
  return results;
}

testAllEndpoints().catch(console.error);