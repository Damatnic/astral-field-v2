/**
 * COMPREHENSIVE FANTASY FOOTBALL SITE TESTING SCRIPT
 * Tests all 10 league members for complete functionality
 */

const BASE_URL = 'http://localhost:3001';

// All 10 D'Amato Dynasty League Members
const LEAGUE_MEMBERS = [
  { email: 'nicholas@astralfield.com', name: "Nicholas D'Amato", role: 'COMMISSIONER' },
  { email: 'nick@astralfield.com', name: 'Nick Hartley', role: 'PLAYER' },
  { email: 'jack@astralfield.com', name: 'Jack McCaigue', role: 'PLAYER' },
  { email: 'larry@astralfield.com', name: 'Larry McCaigue', role: 'PLAYER' },
  { email: 'renee@astralfield.com', name: 'Renee McCaigue', role: 'PLAYER' },
  { email: 'jon@astralfield.com', name: 'Jon Kornbeck', role: 'PLAYER' },
  { email: 'david@astralfield.com', name: 'David Jarvey', role: 'PLAYER' },
  { email: 'kaity@astralfield.com', name: 'Kaity Lorbecki', role: 'PLAYER' },
  { email: 'cason@astralfield.com', name: 'Cason Minor', role: 'PLAYER' },
  { email: 'brittany@astralfield.com', name: 'Brittany Bergum', role: 'PLAYER' }
];

const PASSWORD = 'Astral2025!';

// Test result tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  userResults: new Map()
};

// Logger utility
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const levelColors = {
    'INFO': '\x1b[36m',    // Cyan
    'SUCCESS': '\x1b[32m', // Green
    'ERROR': '\x1b[31m',   // Red
    'WARN': '\x1b[33m'     // Yellow
  };
  
  console.log(`${levelColors[level]}[${timestamp}] ${level}: ${message}\x1b[0m`);
}

// HTTP request helper with better error handling
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      data: null,
      error: error.message
    };
  }
}

// Test individual user login
async function testUserLogin(user) {
  log(`Testing login for ${user.name} (${user.email})...`);
  
  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/simple-login`, {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: PASSWORD
    })
  });
  
  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`);
  }
  
  if (!loginResponse.data.success) {
    throw new Error(`Login unsuccessful: ${loginResponse.data.error}`);
  }
  
  const sessionToken = loginResponse.data.token;
  if (!sessionToken) {
    throw new Error('No session token received');
  }
  
  log(`✓ Login successful for ${user.name}`, 'SUCCESS');
  return sessionToken;
}

// Test user's team access
async function testMyTeamAccess(user, sessionToken) {
  log(`Testing my-team access for ${user.name}...`);
  
  const myTeamResponse = await makeRequest(`${BASE_URL}/api/my-team`, {
    method: 'GET',
    headers: {
      'Cookie': `session=${sessionToken}`,
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  
  if (!myTeamResponse.ok) {
    throw new Error(`My-team API failed: ${myTeamResponse.status} - ${JSON.stringify(myTeamResponse.data)}`);
  }
  
  if (!myTeamResponse.data.success) {
    throw new Error(`My-team unsuccessful: ${myTeamResponse.data.message}`);
  }
  
  const teamData = myTeamResponse.data.data;
  if (!teamData) {
    throw new Error('No team data received');
  }
  
  // Validate team data structure
  const requiredFields = ['id', 'name', 'leagueId', 'owner', 'league', 'roster'];
  for (const field of requiredFields) {
    if (!(field in teamData)) {
      throw new Error(`Missing required field in team data: ${field}`);
    }
  }
  
  // Check for toFixed() error indicators in roster
  if (teamData.roster && Array.isArray(teamData.roster)) {
    for (const player of teamData.roster) {
      if (player.player && player.player.seasonStats) {
        // Check if any stats contain problematic values that would cause toFixed() errors
        const stats = player.player.seasonStats;
        if (typeof stats.totalPoints !== 'number' && stats.totalPoints !== null) {
          throw new Error(`Invalid totalPoints type for player ${player.player.name}: ${typeof stats.totalPoints}`);
        }
        if (typeof stats.averagePoints !== 'number' && stats.averagePoints !== null) {
          throw new Error(`Invalid averagePoints type for player ${player.player.name}: ${typeof stats.averagePoints}`);
        }
      }
    }
  }
  
  log(`✓ My-team access successful for ${user.name} - Team: ${teamData.name} (ID: ${teamData.id})`, 'SUCCESS');
  return teamData;
}

// Test auth/me endpoint
async function testAuthMe(user, sessionToken) {
  log(`Testing auth/me for ${user.name}...`);
  
  const authMeResponse = await makeRequest(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Cookie': `session=${sessionToken}`,
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  
  if (!authMeResponse.ok) {
    throw new Error(`Auth/me API failed: ${authMeResponse.status} - ${JSON.stringify(authMeResponse.data)}`);
  }
  
  log(`✓ Auth/me successful for ${user.name}`, 'SUCCESS');
  return authMeResponse.data;
}

// Test critical API endpoints
async function testCriticalEndpoints(user, sessionToken, teamData) {
  log(`Testing critical endpoints for ${user.name}...`);
  
  const endpoints = [
    `/api/leagues`,
    `/api/leagues/${teamData.leagueId}`,
    `/api/teams/${teamData.id}`,
    `/api/players`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Cookie': `session=${sessionToken}`,
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Endpoint ${endpoint} failed: ${response.status}`);
      }
      
      log(`✓ Endpoint ${endpoint} accessible`, 'SUCCESS');
    } catch (error) {
      log(`✗ Endpoint ${endpoint} failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

// Comprehensive test for a single user
async function testUser(user) {
  const userResult = {
    name: user.name,
    email: user.email,
    success: false,
    tests: {},
    teamData: null,
    errors: []
  };
  
  try {
    log(`\n=== TESTING USER: ${user.name} (${user.email}) ===`, 'INFO');
    
    // Test 1: Login
    const sessionToken = await testUserLogin(user);
    userResult.tests.login = { success: true, sessionToken };
    
    // Test 2: My Team Access
    const teamData = await testMyTeamAccess(user, sessionToken);
    userResult.tests.myTeam = { success: true, teamData };
    userResult.teamData = teamData;
    
    // Test 3: Auth Me
    const authData = await testAuthMe(user, sessionToken);
    userResult.tests.authMe = { success: true, authData };
    
    // Test 4: Critical Endpoints
    await testCriticalEndpoints(user, sessionToken, teamData);
    userResult.tests.endpoints = { success: true };
    
    userResult.success = true;
    testResults.passed++;
    log(`✓ ALL TESTS PASSED for ${user.name}`, 'SUCCESS');
    
  } catch (error) {
    userResult.success = false;
    userResult.errors.push(error.message);
    testResults.failed++;
    testResults.errors.push(`${user.name}: ${error.message}`);
    log(`✗ TESTS FAILED for ${user.name}: ${error.message}`, 'ERROR');
  }
  
  testResults.userResults.set(user.email, userResult);
  return userResult;
}

// Test league integrity
async function testLeagueIntegrity() {
  log(`\n=== TESTING LEAGUE INTEGRITY ===`, 'INFO');
  
  try {
    // Get a sample user's session for API calls
    const sampleUser = LEAGUE_MEMBERS[0];
    const sessionToken = await testUserLogin(sampleUser);
    
    // Test leagues endpoint
    const leaguesResponse = await makeRequest(`${BASE_URL}/api/leagues`, {
      headers: {
        'Cookie': `session=${sessionToken}`,
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    
    if (!leaguesResponse.ok) {
      throw new Error(`Leagues API failed: ${leaguesResponse.status}`);
    }
    
    // Get team data for all users to verify they're in the same league
    const teamLeagues = new Set();
    for (const [email, result] of testResults.userResults) {
      if (result.teamData && result.teamData.leagueId) {
        teamLeagues.add(result.teamData.leagueId);
      }
    }
    
    if (teamLeagues.size === 0) {
      throw new Error('No teams found with league assignments');
    }
    
    if (teamLeagues.size > 1) {
      log(`WARNING: Teams are in different leagues: ${Array.from(teamLeagues).join(', ')}`, 'WARN');
    } else {
      log(`✓ All teams are in the same league: ${Array.from(teamLeagues)[0]}`, 'SUCCESS');
    }
    
    log(`✓ League integrity check passed`, 'SUCCESS');
    
  } catch (error) {
    log(`✗ League integrity check failed: ${error.message}`, 'ERROR');
    testResults.errors.push(`League Integrity: ${error.message}`);
  }
}

// Generate final report
function generateReport() {
  log(`\n=== FINAL TEST REPORT ===`, 'INFO');
  log(`Total Users Tested: ${LEAGUE_MEMBERS.length}`);
  log(`Tests Passed: ${testResults.passed}`, testResults.passed === LEAGUE_MEMBERS.length ? 'SUCCESS' : 'WARN');
  log(`Tests Failed: ${testResults.failed}`, testResults.failed === 0 ? 'SUCCESS' : 'ERROR');
  
  if (testResults.errors.length > 0) {
    log(`\nERRORS ENCOUNTERED:`, 'ERROR');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'ERROR');
    });
  }
  
  log(`\nDETAILED RESULTS:`, 'INFO');
  for (const [email, result] of testResults.userResults) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const teamInfo = result.teamData ? ` | Team: ${result.teamData.name}` : '';
    log(`${status} - ${result.name} (${email})${teamInfo}`, result.success ? 'SUCCESS' : 'ERROR');
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => log(`    Error: ${error}`, 'ERROR'));
    }
  }
  
  if (testResults.passed === LEAGUE_MEMBERS.length && testResults.failed === 0) {
    log(`\n🎉 ALL TESTS PASSED! Site is 100% functional for all users.`, 'SUCCESS');
    return true;
  } else {
    log(`\n❌ SOME TESTS FAILED! Site needs fixes before users can access.`, 'ERROR');
    return false;
  }
}

// Main test execution
async function runAllTests() {
  log(`Starting comprehensive testing of fantasy football site...`, 'INFO');
  log(`Testing ${LEAGUE_MEMBERS.length} league members...`, 'INFO');
  
  // Test each user
  for (const user of LEAGUE_MEMBERS) {
    await testUser(user);
    // Small delay between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Test league integrity
  await testLeagueIntegrity();
  
  // Generate final report
  const allTestsPassed = generateReport();
  
  // Export results for further analysis
  console.log('\n=== RAW TEST RESULTS (JSON) ===');
  console.log(JSON.stringify({
    summary: {
      totalUsers: LEAGUE_MEMBERS.length,
      passed: testResults.passed,
      failed: testResults.failed,
      success: allTestsPassed
    },
    errors: testResults.errors,
    userResults: Object.fromEntries(testResults.userResults)
  }, null, 2));
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
  process.exit(1);
});

// Run the tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});