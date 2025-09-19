#!/usr/bin/env node

/**
 * Production Authentication Test Script
 * Tests login flow and API access with real users
 */

const TEST_USERS = [
  { email: 'admin@astralfield.com', password: 'AdminPass123!', role: 'ADMIN' },
  { email: 'demo@astralfield.com', password: 'demo123', role: 'PLAYER' }
];

// Different deployment URLs to test
const DEPLOYMENT_URLS = [
  'https://astral-field-v1-hlu41tu6e-astral-productions.vercel.app',
  'https://astral-field-v1.vercel.app'
];

async function testHealthEndpoint(baseUrl) {
  console.log(`\n📡 Testing health endpoint at ${baseUrl}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('   ✅ Health check passed:', data.status);
      console.log('   Database:', data.checks?.database?.status || 'unknown');
      return true;
    } else if (response.status === 401) {
      console.log('   ⚠️  Health endpoint requires authentication (401)');
      return false;
    } else {
      console.log('   ❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    return false;
  }
}

async function testLogin(baseUrl, credentials) {
  console.log(`\n🔐 Testing login for ${credentials.email}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('   ✅ Login successful');
      
      // Extract session cookie
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log('   🍪 Session cookie received');
        return { success: true, cookie: setCookie, user: data.user };
      }
      
      return { success: true, user: data.user };
    } else if (response.status === 401) {
      console.log('   ❌ Login failed: Invalid credentials');
      return { success: false, error: 'Invalid credentials' };
    } else {
      const error = await response.text();
      console.log('   ❌ Login failed:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAuthenticatedEndpoint(baseUrl, sessionCookie) {
  console.log(`\n🔒 Testing authenticated endpoint`);
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie || ''
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('   ✅ Authenticated access successful');
      console.log('   User:', data.user?.email || 'unknown');
      return true;
    } else {
      console.log('   ❌ Authenticated access failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Authenticated access error:', error.message);
    return false;
  }
}

async function testPublicAccess(baseUrl) {
  console.log(`\n🌐 Testing public page access at ${baseUrl}`);
  
  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ Public page accessible');
      return true;
    } else if (response.status === 401) {
      console.log('   ⚠️  Public page requires authentication (401)');
      return false;
    } else {
      console.log('   ❌ Public page not accessible');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Public page error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Production Authentication Tests\n');
  console.log('═══════════════════════════════════════════════');
  
  const results = {
    deployments: [],
    totalTests: 0,
    passed: 0,
    failed: 0
  };
  
  for (const deploymentUrl of DEPLOYMENT_URLS) {
    console.log(`\n📦 Testing Deployment: ${deploymentUrl}`);
    console.log('───────────────────────────────────────────────');
    
    const deploymentResults = {
      url: deploymentUrl,
      tests: {
        health: false,
        publicAccess: false,
        login: false,
        authenticated: false
      }
    };
    
    // Test health endpoint
    deploymentResults.tests.health = await testHealthEndpoint(deploymentUrl);
    results.totalTests++;
    if (deploymentResults.tests.health) results.passed++;
    else results.failed++;
    
    // Test public access
    deploymentResults.tests.publicAccess = await testPublicAccess(deploymentUrl);
    results.totalTests++;
    if (deploymentResults.tests.publicAccess) results.passed++;
    else results.failed++;
    
    // Test login with demo user
    const loginResult = await testLogin(deploymentUrl, TEST_USERS[1]);
    deploymentResults.tests.login = loginResult.success;
    results.totalTests++;
    if (loginResult.success) results.passed++;
    else results.failed++;
    
    // Test authenticated endpoint if login succeeded
    if (loginResult.success && loginResult.cookie) {
      deploymentResults.tests.authenticated = await testAuthenticatedEndpoint(
        deploymentUrl, 
        loginResult.cookie
      );
      results.totalTests++;
      if (deploymentResults.tests.authenticated) results.passed++;
      else results.failed++;
    }
    
    results.deployments.push(deploymentResults);
  }
  
  // Display summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Deployment Results:');
  results.deployments.forEach(deployment => {
    console.log(`\n${deployment.url}:`);
    console.log(`  Health: ${deployment.tests.health ? '✅' : '❌'}`);
    console.log(`  Public Access: ${deployment.tests.publicAccess ? '✅' : '❌'}`);
    console.log(`  Login: ${deployment.tests.login ? '✅' : '❌'}`);
    console.log(`  Authenticated: ${deployment.tests.authenticated ? '✅' : '❌'}`);
  });
  
  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. Check middleware configuration.');
  } else {
    console.log('\n🎉 All tests passed! Deployment is working correctly.');
  }
}

// Run tests
console.log('🏈 AstralField Fantasy Football Platform');
console.log('Production Authentication Test Suite\n');

runTests()
  .then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });