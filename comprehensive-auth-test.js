const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://astralfield.vercel.app';
const DEFAULT_PASSWORD = 'Dynasty2025!';

// All D'Amato Dynasty league accounts
const LEAGUE_ACCOUNTS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: "Commissioner" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: "Player" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: "Player" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: "Player" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: "Player" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: "Player" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: "Player" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: "Player" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: "Player" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: "Player" }
];

// Protected routes to test
const PROTECTED_ROUTES = [
  '/dashboard',
  '/team',
  '/players',
  '/ai-coach',
  '/analytics',
  '/settings',
  '/leagues'
];

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  
  setCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    headers.forEach(header => {
      const [cookiePart] = header.split(';');
      const [name, value] = cookiePart.split('=');
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
      }
    });
  }
  
  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
  getCookie(name) {
    return this.cookies.get(name);
  }
  
  clear() {
    this.cookies.clear();
  }
  
  hasSessionToken() {
    return this.cookies.has('__Secure-next-auth.session-token') || 
           this.cookies.has('next-auth.session-token');
  }
}

function makeRequest(url, options = {}, data = null, cookieJar = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };

    if (cookieJar && cookieJar.cookies.size > 0) {
      reqOptions.headers['Cookie'] = cookieJar.getCookieHeader();
    }

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let body = buffer.toString();
        
        if (res.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          try {
            body = zlib.gunzipSync(buffer).toString();
          } catch (e) {
            body = buffer.toString();
          }
        }
        
        if (cookieJar && res.headers['set-cookie']) {
          cookieJar.setCookies(res.headers['set-cookie']);
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testQuickLogin(account) {
  const cookieJar = new CookieJar();
  
  try {
    // Get CSRF token
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf`, {}, null, cookieJar);
    if (csrfResponse.statusCode !== 200) {
      return { success: false, error: 'Failed to get CSRF token' };
    }
    
    const csrfData = JSON.parse(csrfResponse.body);
    const csrfToken = csrfData.csrfToken;
    
    // Test quick login API
    const quickLoginResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/quick-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ email: account.email }), cookieJar);
    
    if (quickLoginResponse.statusCode !== 200) {
      return { success: false, error: 'Quick login API failed' };
    }
    
    const quickLoginData = JSON.parse(quickLoginResponse.body);
    
    // Test verify quick login
    const verifyResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/verify-quick-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ 
      email: account.email, 
      sessionToken: quickLoginData.sessionToken 
    }), cookieJar);
    
    if (verifyResponse.statusCode !== 200) {
      return { success: false, error: 'Quick login verification failed' };
    }
    
    const verifyData = JSON.parse(verifyResponse.body);
    
    // Perform authentication
    const authData = `email=${encodeURIComponent(account.email)}&password=${encodeURIComponent(verifyData.credentials.password)}&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=${encodeURIComponent('/dashboard')}`;
    
    const authResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(authData),
        'Referer': `${PRODUCTION_URL}/auth/signin`
      }
    }, authData, cookieJar);
    
    if (authResponse.statusCode !== 302) {
      return { success: false, error: 'Authentication failed' };
    }
    
    // Check session
    const sessionResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/session`, {}, null, cookieJar);
    if (sessionResponse.statusCode !== 200) {
      return { success: false, error: 'Session check failed' };
    }
    
    const sessionData = JSON.parse(sessionResponse.body);
    if (!sessionData.user || sessionData.user.email !== account.email) {
      return { success: false, error: 'Invalid session data' };
    }
    
    return { 
      success: true, 
      sessionData: sessionData.user,
      cookieJar: cookieJar
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testManualLogin(account) {
  const cookieJar = new CookieJar();
  
  try {
    // Get CSRF token
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf`, {}, null, cookieJar);
    if (csrfResponse.statusCode !== 200) {
      return { success: false, error: 'Failed to get CSRF token' };
    }
    
    const csrfData = JSON.parse(csrfResponse.body);
    const csrfToken = csrfData.csrfToken;
    
    // Perform authentication
    const authData = `email=${encodeURIComponent(account.email)}&password=${encodeURIComponent(DEFAULT_PASSWORD)}&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=${encodeURIComponent('/dashboard')}`;
    
    const authResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(authData),
        'Referer': `${PRODUCTION_URL}/auth/signin`
      }
    }, authData, cookieJar);
    
    if (authResponse.statusCode !== 302) {
      return { success: false, error: 'Authentication failed' };
    }
    
    // Check session
    const sessionResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/session`, {}, null, cookieJar);
    if (sessionResponse.statusCode !== 200) {
      return { success: false, error: 'Session check failed' };
    }
    
    const sessionData = JSON.parse(sessionResponse.body);
    if (!sessionData.user || sessionData.user.email !== account.email) {
      return { success: false, error: 'Invalid session data' };
    }
    
    return { 
      success: true, 
      sessionData: sessionData.user,
      cookieJar: cookieJar
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testProtectedRoutes(cookieJar) {
  const results = [];
  
  for (const route of PROTECTED_ROUTES) {
    try {
      const response = await makeRequest(`${PRODUCTION_URL}${route}`, {}, null, cookieJar);
      results.push({
        route: route,
        status: response.statusCode,
        accessible: response.statusCode === 200,
        redirected: response.statusCode >= 300 && response.statusCode < 400
      });
    } catch (error) {
      results.push({
        route: route,
        status: 'error',
        accessible: false,
        error: error.message
      });
    }
  }
  
  return results;
}

async function testLogout(cookieJar) {
  try {
    // Get CSRF token for logout
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf`, {}, null, cookieJar);
    if (csrfResponse.statusCode !== 200) {
      return { success: false, error: 'Failed to get CSRF token for logout' };
    }
    
    const csrfData = JSON.parse(csrfResponse.body);
    const csrfToken = csrfData.csrfToken;
    
    // Perform logout
    const logoutResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${PRODUCTION_URL}/dashboard`
      }
    }, `csrfToken=${encodeURIComponent(csrfToken)}`, cookieJar);
    
    // Check if session is cleared
    const sessionResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/session`, {}, null, cookieJar);
    const sessionData = JSON.parse(sessionResponse.body);
    
    return {
      success: !sessionData.user,
      sessionCleared: !sessionData.user
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function comprehensiveAuthTest() {
  console.log('🚀 COMPREHENSIVE AUTHENTICATION SYSTEM VERIFICATION');
  console.log('=' .repeat(60));
  
  const results = {
    quickLogin: {},
    manualLogin: {},
    protectedRoutes: {},
    logout: {},
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0
    }
  };
  
  // Test 1: Quick Login for all accounts
  console.log('\n📍 TEST 1: Quick Login Functionality');
  console.log('-'.repeat(40));
  
  for (const account of LEAGUE_ACCOUNTS) {
    console.log(`Testing quick login: ${account.name} (${account.email})`);
    const result = await testQuickLogin(account);
    results.quickLogin[account.email] = result;
    results.summary.totalTests++;
    
    if (result.success) {
      console.log(`  ✅ SUCCESS - Role: ${result.sessionData.role}, Team: ${result.sessionData.teamName}`);
      results.summary.passed++;
    } else {
      console.log(`  ❌ FAILED - ${result.error}`);
      results.summary.failed++;
    }
  }
  
  // Test 2: Manual Login for all accounts
  console.log('\n📍 TEST 2: Manual Email/Password Login');
  console.log('-'.repeat(40));
  
  for (const account of LEAGUE_ACCOUNTS) {
    console.log(`Testing manual login: ${account.name} (${account.email})`);
    const result = await testManualLogin(account);
    results.manualLogin[account.email] = result;
    results.summary.totalTests++;
    
    if (result.success) {
      console.log(`  ✅ SUCCESS - Role: ${result.sessionData.role}, Team: ${result.sessionData.teamName}`);
      results.summary.passed++;
    } else {
      console.log(`  ❌ FAILED - ${result.error}`);
      results.summary.failed++;
    }
  }
  
  // Test 3: Protected Routes Access (using first successful login)
  console.log('\n📍 TEST 3: Protected Routes Access');
  console.log('-'.repeat(40));
  
  const successfulLogin = Object.values(results.manualLogin).find(r => r.success);
  if (successfulLogin) {
    console.log('Testing protected routes with authenticated session...');
    const routeResults = await testProtectedRoutes(successfulLogin.cookieJar);
    results.protectedRoutes = routeResults;
    
    for (const routeResult of routeResults) {
      results.summary.totalTests++;
      if (routeResult.accessible) {
        console.log(`  ✅ ${routeResult.route} - Status: ${routeResult.status}`);
        results.summary.passed++;
      } else {
        console.log(`  ❌ ${routeResult.route} - Status: ${routeResult.status}${routeResult.redirected ? ' (redirected)' : ''}`);
        results.summary.failed++;
      }
    }
  } else {
    console.log('  ❌ No successful login to test protected routes');
    results.summary.failed++;
  }
  
  // Test 4: Logout Functionality
  console.log('\n📍 TEST 4: Logout Functionality');
  console.log('-'.repeat(40));
  
  if (successfulLogin) {
    console.log('Testing logout functionality...');
    const logoutResult = await testLogout(successfulLogin.cookieJar);
    results.logout = logoutResult;
    results.summary.totalTests++;
    
    if (logoutResult.success) {
      console.log(`  ✅ SUCCESS - Session cleared: ${logoutResult.sessionCleared}`);
      results.summary.passed++;
    } else {
      console.log(`  ❌ FAILED - ${logoutResult.error}`);
      results.summary.failed++;
    }
  } else {
    console.log('  ❌ No successful login to test logout');
    results.summary.failed++;
  }
  
  // Test 5: User Data Verification
  console.log('\n📍 TEST 5: User Data Integrity');
  console.log('-'.repeat(40));
  
  const userDataTests = Object.entries(results.manualLogin).filter(([email, result]) => result.success);
  for (const [email, result] of userDataTests) {
    const account = LEAGUE_ACCOUNTS.find(a => a.email === email);
    const userData = result.sessionData;
    
    console.log(`Verifying data for: ${account.name}`);
    
    const checks = [
      { name: 'Email Match', pass: userData.email === account.email },
      { name: 'Name Present', pass: !!userData.name },
      { name: 'Team Name Present', pass: !!userData.teamName },
      { name: 'Role Present', pass: !!userData.role },
      { name: 'User ID Present', pass: !!userData.id },
      { name: 'Session ID Present', pass: !!userData.sessionId }
    ];
    
    for (const check of checks) {
      results.summary.totalTests++;
      if (check.pass) {
        console.log(`    ✅ ${check.name}`);
        results.summary.passed++;
      } else {
        console.log(`    ❌ ${check.name}`);
        results.summary.failed++;
      }
    }
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passRate = ((results.summary.passed / results.summary.totalTests) * 100).toFixed(1);
  
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  console.log('\n📊 Detailed Results:');
  console.log(`• Quick Login Success: ${Object.values(results.quickLogin).filter(r => r.success).length}/${LEAGUE_ACCOUNTS.length}`);
  console.log(`• Manual Login Success: ${Object.values(results.manualLogin).filter(r => r.success).length}/${LEAGUE_ACCOUNTS.length}`);
  console.log(`• Protected Routes Accessible: ${results.protectedRoutes.filter ? results.protectedRoutes.filter(r => r.accessible).length : 0}/${PROTECTED_ROUTES.length}`);
  console.log(`• Logout Functionality: ${results.logout.success ? 'Working' : 'Failed'}`);
  
  if (passRate >= 95) {
    console.log('\n🎉 AUTHENTICATION SYSTEM: FULLY FUNCTIONAL ✅');
  } else if (passRate >= 80) {
    console.log('\n⚠️  AUTHENTICATION SYSTEM: MOSTLY FUNCTIONAL (minor issues)');
  } else {
    console.log('\n❌ AUTHENTICATION SYSTEM: NEEDS ATTENTION');
  }
  
  console.log('\n🔗 Live Application: https://astralfield.vercel.app');
  console.log('📧 Test any account with password: Dynasty2025!');
  
  return results;
}

comprehensiveAuthTest().catch(console.error);