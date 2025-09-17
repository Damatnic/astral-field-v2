#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * Tests all endpoints and validates responses
 */

const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testUser: {
    email: 'mike.wilson@astralfield.com',
    password: 'player123!'
  }
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let authToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// Test utilities
async function makeRequest(endpoint, options = {}) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...options.headers
      }
    });
    
    const data = await response.text();
    let json = null;
    
    try {
      json = JSON.parse(data);
    } catch (e) {
      // Not JSON response
    }
    
    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      data: json || data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testResults.passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (error) {
      console.log(`  ${colors.red}Error: ${error}${colors.reset}`);
      testResults.errors.push({ test: name, error });
    }
    testResults.failed++;
  }
}

// API Tests
const apiTests = [
  {
    name: 'Health Check - GET /api/test-deployment',
    async test() {
      const res = await makeRequest('/api/test-deployment');
      return res.ok && res.data?.message === 'Deployment working!';
    }
  },
  
  {
    name: 'Performance API - GET /api/performance',
    async test() {
      const res = await makeRequest('/api/performance');
      return res.ok && res.data?.message === 'Performance endpoint active';
    }
  },
  
  {
    name: 'Performance API - POST /api/performance',
    async test() {
      const res = await makeRequest('/api/performance', {
        method: 'POST',
        body: JSON.stringify({
          metric: 'page_load',
          value: 1234,
          timestamp: new Date().toISOString()
        })
      });
      return res.ok && res.data?.success === true;
    }
  },
  
  {
    name: 'Error API - GET /api/errors',
    async test() {
      const res = await makeRequest('/api/errors');
      return res.ok && res.data?.message === 'Error endpoint active';
    }
  },
  
  {
    name: 'Error API - POST /api/errors',
    async test() {
      const res = await makeRequest('/api/errors', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test error',
          type: 'test',
          timestamp: new Date().toISOString()
        })
      });
      return res.ok && res.data?.success === true;
    }
  },
  
  {
    name: 'Avatar API - GET /api/avatars/test-user.jpg',
    async test() {
      const res = await makeRequest('/api/avatars/test-user.jpg');
      return res.ok && res.headers.get('content-type')?.includes('svg');
    }
  },
  
  {
    name: 'Auth API - POST /api/auth/login',
    async test() {
      const res = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(TEST_CONFIG.testUser)
      });
      
      if (res.ok && res.data?.success) {
        authToken = res.data.token || 'test-token';
        return true;
      }
      return false;
    }
  },
  
  {
    name: 'Auth API - GET /api/auth/me (authenticated)',
    async test() {
      const res = await makeRequest('/api/auth/me');
      return res.ok && res.data?.user?.email === TEST_CONFIG.testUser.email;
    }
  },
  
  {
    name: 'Players API - GET /api/players',
    async test() {
      const res = await makeRequest('/api/players?page=1&limit=10');
      return res.ok && res.data?.data && Array.isArray(res.data.data);
    }
  },
  
  {
    name: 'Leagues API - GET /api/leagues',
    async test() {
      const res = await makeRequest('/api/leagues?limit=10');
      return res.ok && (res.data?.data || res.data?.leagues);
    }
  },
  
  {
    name: 'Sleeper Integration - GET /api/sleeper/test',
    async test() {
      const res = await makeRequest('/api/sleeper/test');
      return res.ok && res.data?.success === true;
    }
  },
  
  {
    name: 'Sleeper State - GET /api/sleeper/state',
    async test() {
      const res = await makeRequest('/api/sleeper/state');
      return res.ok && res.data?.state;
    }
  },
  
  {
    name: 'Sleeper Integration Status - GET /api/sleeper/integration',
    async test() {
      const res = await makeRequest('/api/sleeper/integration');
      return res.ok && res.data?.status;
    }
  },
  
  {
    name: 'Auth API - POST /api/auth/logout',
    async test() {
      const res = await makeRequest('/api/auth/logout', {
        method: 'POST'
      });
      authToken = null;
      return res.ok;
    }
  }
];

// Main test runner
async function runTests() {
  console.log(`\n${colors.blue}=== ASTRALFIELD API TEST SUITE ===${colors.reset}`);
  console.log(`Testing: ${TEST_CONFIG.baseUrl}\n`);
  
  for (const test of apiTests) {
    try {
      const result = await test.test();
      logTest(test.name, result);
    } catch (error) {
      logTest(test.name, false, error.message);
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}=== TEST SUMMARY ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n${colors.yellow}Errors:${colors.reset}`);
    testResults.errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e.test}: ${e.error}`);
    });
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});