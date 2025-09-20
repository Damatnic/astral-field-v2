/**
 * FRONTEND ROUTE TESTING SCRIPT
 * Tests all critical frontend routes for proper loading and MyTeamCard functionality
 */

const puppeteer = require('puppeteer');
const BASE_URL = 'http://localhost:3001';

// Test user credentials
const TEST_USER = {
  email: 'nicholas@astralfield.com',
  password: 'Astral2025!'
};

// Routes to test
const ROUTES_TO_TEST = [
  '/',
  '/teams',
  '/teams/cmfrkb7da0002o8l3427vcxzj', // Nicholas's team
  '/teams/cmfrkb7da0002o8l3427vcxzj/lineup',
  '/league',
  '/leagues',
  '/leagues/cmfrfv65b000c6u97sojf46dz',
  '/matchup',
  '/players',
  '/trade',
  '/draft',
  '/schedule',
  '/analytics',
  '/activity',
  '/chat'
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

// Test individual route
async function testRoute(page, route) {
  const routeResult = {
    route,
    success: false,
    loadTime: 0,
    errors: [],
    consoleErrors: [],
    myTeamCardPresent: false,
    myTeamCardErrors: []
  };

  try {
    log(`Testing route: ${route}`);
    
    // Navigate to route with timeout
    const startTime = Date.now();
    
    // Set up console error monitoring
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Set up error monitoring
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.goto(`${BASE_URL}${route}`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    const loadTime = Date.now() - startTime;
    routeResult.loadTime = loadTime;
    
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for JavaScript errors
    routeResult.consoleErrors = consoleErrors;
    if (pageErrors.length > 0) {
      routeResult.errors.push(...pageErrors);
    }
    
    // Check if MyTeamCard is present on relevant pages
    if (route === '/' || route.includes('/teams') || route === '/league') {
      try {
        // Look for MyTeamCard component or similar team display elements
        const myTeamElements = await page.$$eval('[data-testid*="team"], [class*="team"], [class*="MyTeam"], .team-card, #my-team', elements => {
          return elements.length > 0;
        }).catch(() => false);
        
        routeResult.myTeamCardPresent = myTeamElements;
        
        // Check for toFixed errors specifically
        const toFixedErrors = consoleErrors.filter(error => 
          error.includes('toFixed') || 
          error.includes('is not a function') ||
          error.includes('Cannot read properties')
        );
        
        routeResult.myTeamCardErrors = toFixedErrors;
        
        if (toFixedErrors.length > 0) {
          throw new Error(`MyTeamCard toFixed errors detected: ${toFixedErrors.join(', ')}`);
        }
        
      } catch (error) {
        routeResult.myTeamCardErrors.push(error.message);
        throw error;
      }
    }
    
    // Check for critical errors that would break functionality
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('500') || 
      error.includes('404') ||
      error.includes('Uncaught') ||
      error.includes('TypeError') ||
      error.includes('toFixed')
    );
    
    if (criticalErrors.length > 0) {
      throw new Error(`Critical errors detected: ${criticalErrors.join(', ')}`);
    }
    
    routeResult.success = true;
    testResults.passed++;
    log(`✓ Route ${route} loaded successfully in ${loadTime}ms`, 'SUCCESS');
    
  } catch (error) {
    routeResult.success = false;
    routeResult.errors.push(error.message);
    testResults.failed++;
    testResults.errors.push(`${route}: ${error.message}`);
    log(`✗ Route ${route} failed: ${error.message}`, 'ERROR');
  }
  
  testResults.routeResults.set(route, routeResult);
  return routeResult;
}

// Test login functionality
async function testLogin(page) {
  try {
    log('Testing login functionality...');
    
    await page.goto(`${BASE_URL}/login`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Fill login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', TEST_USER.email);
    
    await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 10000 });
    await page.type('input[type="password"], input[name="password"]', TEST_USER.password);
    
    // Submit form
    await page.click('button[type="submit"], button:contains("Login")');
    
    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    // Verify we're logged in (should redirect to dashboard/home)
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      log('✓ Login successful', 'SUCCESS');
      return true;
    } else {
      throw new Error('Login failed - still on login page');
    }
    
  } catch (error) {
    log(`✗ Login failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Main test execution
async function runFrontendTests() {
  let browser = null;
  
  try {
    log('Starting comprehensive frontend route testing...');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Test login first
    await testLogin(page);
    
    // Test each route
    for (const route of ROUTES_TO_TEST) {
      await testRoute(page, route);
      // Small delay between route tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Generate final report
    generateFrontendReport();
    
  } catch (error) {
    log(`Fatal error in frontend testing: ${error.message}`, 'ERROR');
    testResults.errors.push(`Fatal: ${error.message}`);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return testResults.passed > 0 && testResults.failed === 0;
}

// Generate final report
function generateFrontendReport() {
  log(`\n=== FRONTEND ROUTE TEST REPORT ===`, 'INFO');
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
  for (const [route, result] of testResults.routeResults) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const loadTime = result.loadTime ? ` (${result.loadTime}ms)` : '';
    const teamCard = result.myTeamCardPresent ? ' | MyTeamCard: ✓' : '';
    log(`${status} - ${route}${loadTime}${teamCard}`, result.success ? 'SUCCESS' : 'ERROR');
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => log(`    Error: ${error}`, 'ERROR'));
    }
    
    if (result.myTeamCardErrors.length > 0) {
      result.myTeamCardErrors.forEach(error => log(`    MyTeamCard Error: ${error}`, 'ERROR'));
    }
  }
  
  if (testResults.passed === ROUTES_TO_TEST.length && testResults.failed === 0) {
    log(`\n🎉 ALL FRONTEND ROUTES PASSED! Site navigation is 100% functional.`, 'SUCCESS');
    return true;
  } else {
    log(`\n❌ SOME FRONTEND ROUTES FAILED! Site needs fixes before users can navigate properly.`, 'ERROR');
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

// Check if Puppeteer is available
try {
  require.resolve('puppeteer');
} catch (error) {
  log('Puppeteer not found. Installing puppeteer...', 'WARN');
  log('Please run: npm install puppeteer', 'INFO');
  process.exit(1);
}

// Run the tests
runFrontendTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});