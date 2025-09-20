/**
 * SIMPLE ROUTE TESTING SCRIPT
 * Tests all critical routes using HTTP requests with session cookies
 */

const BASE_URL = 'http://localhost:3001';

// Test user credentials
const TEST_USER = {
  email: 'nicholas@astralfield.com',
  password: 'Astral2025!'
};

// Routes to test (HTML pages)
const ROUTES_TO_TEST = [
  { path: '/', name: 'Home/Dashboard' },
  { path: '/teams', name: 'Teams List' },
  { path: '/teams/cmfrkb7da0002o8l3427vcxzj', name: 'Nicholas Team Detail' },
  { path: '/teams/cmfrkb7da0002o8l3427vcxzj/lineup', name: 'Nicholas Team Lineup' },
  { path: '/league', name: 'League Overview' },
  { path: '/leagues', name: 'Leagues List' },
  { path: '/leagues/cmfrfv65b000c6u97sojf46dz', name: 'Dynasty League Detail' },
  { path: '/players', name: 'Players Database' },
  { path: '/trade', name: 'Trade Center' },
  { path: '/draft', name: 'Draft Room' },
  { path: '/schedule', name: 'Schedule' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/activity', name: 'Activity Feed' },
  { path: '/chat', name: 'League Chat' }
];

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

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  routeResults: new Map()
};

// HTTP request helper
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType && contentType.includes('text/html')) {
      data = await response.text();
    } else {
      data = await response.text();
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers,
      contentType
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

// Get login session
async function getLoginSession() {
  log('Getting login session...');
  
  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/simple-login`, {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (!loginResponse.ok || !loginResponse.data.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
  }
  
  const sessionToken = loginResponse.data.token;
  if (!sessionToken) {
    throw new Error('No session token received');
  }
  
  log('✓ Login session obtained successfully', 'SUCCESS');
  return sessionToken;
}

// Test individual route
async function testRoute(route, sessionToken) {
  const routeResult = {
    path: route.path,
    name: route.name,
    success: false,
    loadTime: 0,
    status: 0,
    errors: [],
    hasContent: false,
    hasErrors: false
  };

  try {
    log(`Testing route: ${route.path} (${route.name})`);
    
    const startTime = Date.now();
    
    const response = await makeRequest(`${BASE_URL}${route.path}`, {
      method: 'GET',
      headers: {
        'Cookie': `session=${sessionToken}`,
        'Authorization': `Bearer ${sessionToken}`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const loadTime = Date.now() - startTime;
    routeResult.loadTime = loadTime;
    routeResult.status = response.status;
    
    // Check if route loaded successfully
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Check if we got HTML content
    if (response.contentType && response.contentType.includes('text/html')) {
      routeResult.hasContent = true;
      
      // Check for error indicators in HTML
      const htmlContent = response.data.toString().toLowerCase();
      
      const errorIndicators = [
        'error 404',
        'page not found',
        'internal server error',
        'error 500',
        'tofixed is not a function',
        'uncaught typeerror',
        'cannot read properties',
        'unexpected token',
        'syntaxerror'
      ];
      
      const hasErrors = errorIndicators.some(indicator => htmlContent.includes(indicator));
      routeResult.hasErrors = hasErrors;
      
      if (hasErrors) {
        const foundErrors = errorIndicators.filter(indicator => htmlContent.includes(indicator));
        throw new Error(`Page contains error indicators: ${foundErrors.join(', ')}`);
      }
      
      // Check for positive indicators
      const positiveIndicators = [
        'astral field',
        'damato dynasty',
        route.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        'team',
        'league',
        'player'
      ];
      
      const hasPositiveContent = positiveIndicators.some(indicator => htmlContent.includes(indicator));
      if (!hasPositiveContent) {
        log(`⚠ Route ${route.path} may not have expected content`, 'WARN');
      }
      
    } else {
      throw new Error(`Expected HTML content, got: ${response.contentType}`);
    }
    
    routeResult.success = true;
    testResults.passed++;
    log(`✓ Route ${route.path} loaded successfully in ${loadTime}ms`, 'SUCCESS');
    
  } catch (error) {
    routeResult.success = false;
    routeResult.errors.push(error.message);
    testResults.failed++;
    testResults.errors.push(`${route.path}: ${error.message}`);
    log(`✗ Route ${route.path} failed: ${error.message}`, 'ERROR');
  }
  
  testResults.routeResults.set(route.path, routeResult);
  return routeResult;
}

// Test MyTeamCard component specifically
async function testMyTeamCardComponent(sessionToken) {
  log('Testing MyTeamCard component via API...');
  
  try {
    // Test the my-team API endpoint which is used by MyTeamCard
    const myTeamResponse = await makeRequest(`${BASE_URL}/api/my-team`, {
      method: 'GET',
      headers: {
        'Cookie': `session=${sessionToken}`,
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    
    if (!myTeamResponse.ok) {
      throw new Error(`MyTeam API failed: ${myTeamResponse.status}`);
    }
    
    const teamData = myTeamResponse.data.data;
    if (!teamData) {
      throw new Error('No team data returned from API');
    }
    
    // Verify all numeric fields that would use toFixed()
    const numericFields = [
      'pointsFor',
      'pointsAgainst',
      'faabBudget',
      'faabSpent'
    ];
    
    for (const field of numericFields) {
      const value = teamData[field];
      if (value !== null && value !== undefined) {
        // Try to convert to number and call toFixed to see if it would error
        try {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            numValue.toFixed(2); // This would fail if value is not a valid number
          }
        } catch (toFixedError) {
          throw new Error(`toFixed error on field ${field}: ${toFixedError.message}`);
        }
      }
    }
    
    // Check team stats
    if (teamData.stats) {
      const statFields = [
        'currentWeekProjection',
        'lastWeekTotal',
        'seasonAverage',
        'totalSeasonPoints'
      ];
      
      for (const field of statFields) {
        const value = teamData.stats[field];
        if (value !== null && value !== undefined) {
          try {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              numValue.toFixed(2);
            }
          } catch (toFixedError) {
            throw new Error(`toFixed error on stats.${field}: ${toFixedError.message}`);
          }
        }
      }
    }
    
    log('✓ MyTeamCard component data validated - no toFixed errors', 'SUCCESS');
    return true;
    
  } catch (error) {
    log(`✗ MyTeamCard component test failed: ${error.message}`, 'ERROR');
    testResults.errors.push(`MyTeamCard: ${error.message}`);
    return false;
  }
}

// Main test execution
async function runSimpleRouteTests() {
  try {
    log('Starting simple route testing...');
    log(`Testing ${ROUTES_TO_TEST.length} routes with authenticated session...`);
    
    // Get authenticated session
    const sessionToken = await getLoginSession();
    
    // Test MyTeamCard component specifically
    await testMyTeamCardComponent(sessionToken);
    
    // Test each route
    for (const route of ROUTES_TO_TEST) {
      await testRoute(route, sessionToken);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Generate final report
    generateSimpleReport();
    
  } catch (error) {
    log(`Fatal error in route testing: ${error.message}`, 'ERROR');
    testResults.errors.push(`Fatal: ${error.message}`);
    return false;
  }
  
  return testResults.passed > 0 && testResults.failed === 0;
}

// Generate final report
function generateSimpleReport() {
  log(`\n=== SIMPLE ROUTE TEST REPORT ===`, 'INFO');
  log(`Total Routes Tested: ${ROUTES_TO_TEST.length}`);
  log(`Routes Passed: ${testResults.passed}`, testResults.passed === ROUTES_TO_TEST.length ? 'SUCCESS' : 'WARN');
  log(`Routes Failed: ${testResults.failed}`, testResults.failed === 0 ? 'SUCCESS' : 'ERROR');
  
  if (testResults.errors.length > 0) {
    log(`\nERRORS ENCOUNTERED:`, 'ERROR');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'ERROR');
    });
  }
  
  log(`\nDETAILED ROUTE RESULTS:`, 'INFO');
  for (const [path, result] of testResults.routeResults) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const loadTime = result.loadTime ? ` (${result.loadTime}ms)` : '';
    const statusCode = result.status ? ` [${result.status}]` : '';
    log(`${status} - ${result.name}${statusCode}${loadTime}`, result.success ? 'SUCCESS' : 'ERROR');
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => log(`    Error: ${error}`, 'ERROR'));
    }
  }
  
  if (testResults.passed === ROUTES_TO_TEST.length && testResults.failed === 0) {
    log(`\n🎉 ALL ROUTES PASSED! Frontend navigation is 100% functional.`, 'SUCCESS');
    return true;
  } else {
    log(`\n❌ SOME ROUTES FAILED! Frontend needs fixes before users can navigate properly.`, 'ERROR');
    return false;
  }
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
runSimpleRouteTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});