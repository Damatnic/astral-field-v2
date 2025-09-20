const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test credentials
const TEST_USER = {
  email: 'nicholas@damato-dynasty.com',
  password: 'Dynasty2025!'
};

let sessionCookie = null;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, body = null, expectSuccess = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Include cookies
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json().catch(() => null);
    
    // Extract Set-Cookie header if present
    const setCookie = response.headers.get('set-cookie');
    
    const success = expectSuccess ? response.ok : !response.ok;
    
    if (success) {
      log(`✅ ${name}: ${response.status} ${response.statusText}`, 'green');
      return { success: true, data, status: response.status, setCookie };
    } else {
      log(`❌ ${name}: ${response.status} ${response.statusText}`, 'red');
      if (data?.error) {
        log(`   Error: ${data.error}`, 'yellow');
      }
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(`❌ ${name}: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 ASTRAL FIELD V1 - COMPREHENSIVE FEATURE TEST\n', 'blue');
  log(`Testing against: ${BASE_URL}\n`, 'blue');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Helper to track test results
  const test = async (name, method, path, body = null, expectSuccess = true) => {
    totalTests++;
    const result = await testEndpoint(name, method, path, body, expectSuccess);
    if (result.success) {
      passedTests++;
    } else {
      failedTests++;
    }
    return result;
  };

  // 1. AUTHENTICATION TESTS
  log('\n📝 AUTHENTICATION TESTS', 'magenta');
  log('========================\n', 'magenta');

  const loginResult = await test(
    'Login with valid credentials',
    'POST',
    '/api/auth/simple-login',
    TEST_USER
  );

  // Extract session cookie from Set-Cookie header
  if (loginResult.success) {
    // For simple-login, the session is returned in the response
    if (loginResult.data?.sessionId) {
      sessionCookie = `session=${loginResult.data.sessionId}`;
      log(`   Session ID: ${loginResult.data.sessionId.substring(0, 20)}...`, 'blue');
    } else {
      log(`   Warning: No session ID returned`, 'yellow');
    }
  }

  await test(
    'Login with invalid credentials',
    'POST',
    '/api/auth/simple-login',
    { email: TEST_USER.email, password: 'wrongpass' },
    false
  );

  await test(
    'Get current session',
    'GET',
    '/api/auth/session'
  );

  // 2. LEAGUE & TEAM TESTS
  log('\n🏆 LEAGUE & TEAM TESTS', 'magenta');
  log('======================\n', 'magenta');

  const leagueResult = await test(
    'Get league info',
    'GET',
    '/api/league'
  );

  await test(
    'Get teams',
    'GET',
    '/api/teams'
  );

  await test(
    'Get my team',
    'GET',
    '/api/team'
  );

  // 3. PLAYER DATA TESTS
  log('\n🏈 PLAYER DATA TESTS', 'magenta');
  log('====================\n', 'magenta');

  await test(
    'Get all players',
    'GET',
    '/api/players?limit=10'
  );

  await test(
    'Search players',
    'GET',
    '/api/players?search=mahomes'
  );

  await test(
    'Get player by position',
    'GET',
    '/api/players?position=QB&limit=5'
  );

  await test(
    'Get free agents',
    'GET',
    '/api/players?freeAgents=true&limit=10'
  );

  // 4. MATCHUP TESTS
  log('\n⚔️ MATCHUP TESTS', 'magenta');
  log('================\n', 'magenta');

  await test(
    'Get current week matchups',
    'GET',
    '/api/matchups'
  );

  await test(
    'Get specific week matchups',
    'GET',
    '/api/matchups?week=14'
  );

  // 5. ROSTER & LINEUP TESTS
  log('\n📋 ROSTER & LINEUP TESTS', 'magenta');
  log('========================\n', 'magenta');

  await test(
    'Get roster',
    'GET',
    '/api/roster'
  );

  await test(
    'Get current lineup',
    'GET',
    '/api/lineup'
  );

  await test(
    'Optimize lineup',
    'GET',
    '/api/lineup/optimize'
  );

  // 6. TRADE TESTS
  log('\n💰 TRADE TESTS', 'magenta');
  log('==============\n', 'magenta');

  await test(
    'Get trades',
    'GET',
    '/api/trades'
  );

  await test(
    'Get trade suggestions',
    'GET',
    '/api/trade/suggest'
  );

  // Test trade analysis (may fail if no active trades)
  await test(
    'Analyze trade',
    'POST',
    '/api/trade/analyze',
    {
      tradeItems: [
        { playerId: '1', fromTeamId: 'cmfrreurk0001et9ccr2tdbgl', toTeamId: 'cmfrkb7da0002o8l3427vcxzj' },
        { playerId: '2', fromTeamId: 'cmfrkb7da0002o8l3427vcxzj', toTeamId: 'cmfrreurk0001et9ccr2tdbgl' }
      ],
      teamIds: ['cmfrreurk0001et9ccr2tdbgl', 'cmfrkb7da0002o8l3427vcxzj'],
      leagueId: 'cmfrfv65b000c6u97sojf46dz'
    }
  );

  // 7. WAIVER TESTS
  log('\n📝 WAIVER TESTS', 'magenta');
  log('===============\n', 'magenta');

  await test(
    'Get waivers',
    'GET',
    '/api/waivers'
  );

  await test(
    'Get waiver wire players',
    'GET',
    '/api/waivers/wire'
  );

  // 8. DRAFT TESTS
  log('\n🎯 DRAFT TESTS', 'magenta');
  log('==============\n', 'magenta');

  await test(
    'Get drafts',
    'GET',
    '/api/draft'
  );

  // 9. ANALYTICS TESTS
  log('\n📊 ANALYTICS TESTS', 'magenta');
  log('==================\n', 'magenta');

  await test(
    'Get analytics',
    'GET',
    '/api/analytics'
  );

  // 10. ACTIVITY & NOTIFICATIONS
  log('\n🔔 ACTIVITY & NOTIFICATIONS', 'magenta');
  log('===========================\n', 'magenta');

  await test(
    'Get activity feed',
    'GET',
    '/api/activity'
  );

  await test(
    'Get notifications',
    'GET',
    '/api/notifications'
  );

  await test(
    'Get unread notifications',
    'GET',
    '/api/notifications?unreadOnly=true'
  );

  // 11. CHAT TESTS
  log('\n💬 CHAT TESTS', 'magenta');
  log('=============\n', 'magenta');

  await test(
    'Get chat messages',
    'GET',
    '/api/chat?channel=general'
  );

  const chatResult = await test(
    'Send chat message',
    'POST',
    '/api/chat',
    {
      content: `Test message from automated test at ${new Date().toLocaleTimeString()}`,
      channel: 'general'
    }
  );

  if (chatResult.success && chatResult.data?.message?.id) {
    await test(
      'Delete chat message',
      'DELETE',
      `/api/chat?messageId=${chatResult.data.message.id}`
    );
  }

  // 12. COMMISSIONER TESTS
  log('\n👑 COMMISSIONER TESTS', 'magenta');
  log('=====================\n', 'magenta');

  await test(
    'Get commissioner dashboard',
    'GET',
    '/api/commissioner'
  );

  // 13. AI FEATURES
  log('\n🤖 AI FEATURES', 'magenta');
  log('==============\n', 'magenta');

  await test(
    'Get AI lineup optimization',
    'GET',
    '/api/ai/optimize-lineup'
  );

  await test(
    'Get injury predictions',
    'GET',
    '/api/injury/predict'
  );

  // 14. SLEEPER API SYNC
  log('\n🔄 SLEEPER API TESTS', 'magenta');
  log('====================\n', 'magenta');

  await test(
    'Get Sleeper league data',
    'GET',
    '/api/sleeper/league?leagueId=cmfrfv65b000c6u97sojf46dz&action=status'
  );

  // 15. LOGOUT TEST
  log('\n🚪 LOGOUT TEST', 'magenta');
  log('==============\n', 'magenta');

  await test(
    'Logout',
    'POST',
    '/api/auth/logout'
  );

  // Clear session cookie after logout
  sessionCookie = null;

  // Test that protected endpoints now fail
  await test(
    'Access protected endpoint after logout',
    'GET',
    '/api/team',
    null,
    false
  );

  // FINAL RESULTS
  log('\n📊 TEST RESULTS', 'blue');
  log('===============\n', 'blue');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, 'red');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 
      passedTests === totalTests ? 'green' : failedTests > 5 ? 'red' : 'yellow');

  if (passedTests === totalTests) {
    log('\n🎉 ALL TESTS PASSED! The fantasy football platform is fully functional!', 'green');
  } else if (failedTests <= 5) {
    log('\n⚠️  Most features are working, but some minor issues need attention.', 'yellow');
  } else {
    log('\n❌ Multiple features are failing. Please review the errors above.', 'red');
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});