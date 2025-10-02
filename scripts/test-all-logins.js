#!/usr/bin/env node

/**
 * Login Verification Script
 * Tests login functionality for all 10 accounts
 * All credentials pre-filled - no input required
 */

const https = require('https');

// ============================================
// PRE-FILLED CONFIGURATION
// ============================================
const CONFIG = {
  baseUrl: 'https://web-seven-rho-32.vercel.app',
  
  accounts: [
    { id: 1, name: 'Nicholas Damato', email: 'nicholas.damato@test.com', password: 'fantasy2025' },
    { id: 2, name: 'Mark Damato', email: 'mark.damato@test.com', password: 'fantasy2025' },
    { id: 3, name: 'Steve Damato', email: 'steve.damato@test.com', password: 'fantasy2025' },
    { id: 4, name: 'Mike Damato', email: 'mike.damato@test.com', password: 'fantasy2025' },
    { id: 5, name: 'Nick Damato', email: 'nick.damato@test.com', password: 'fantasy2025' },
    { id: 6, name: 'Anthony Damato', email: 'anthony.damato@test.com', password: 'fantasy2025' },
    { id: 7, name: 'Paul Damato', email: 'paul.damato@test.com', password: 'fantasy2025' },
    { id: 8, name: 'Frank Damato', email: 'frank.damato@test.com', password: 'fantasy2025' },
    { id: 9, name: 'Joe Damato', email: 'joe.damato@test.com', password: 'fantasy2025' },
    { id: 10, name: 'Tony Damato', email: 'tony.damato@test.com', password: 'fantasy2025' }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testLogin(account) {
  try {
    // Step 1: Get CSRF token
    const csrfResponse = await makeRequest(`${CONFIG.baseUrl}/api/auth/csrf`);
    
    if (csrfResponse.statusCode !== 200) {
      return {
        success: false,
        error: `CSRF request failed: ${csrfResponse.statusCode}`,
        step: 'csrf'
      };
    }
    
    let csrfToken;
    try {
      const csrfData = JSON.parse(csrfResponse.body);
      csrfToken = csrfData.csrfToken;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse CSRF token',
        step: 'csrf-parse'
      };
    }
    
    // Step 2: Attempt login
    const loginData = JSON.stringify({
      email: account.email,
      password: account.password,
      csrfToken: csrfToken,
      json: true
    });
    
    const loginResponse = await makeRequest(`${CONFIG.baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      },
      body: loginData
    });
    
    // Check response
    if (loginResponse.statusCode === 200 || loginResponse.statusCode === 302) {
      // Check for session cookie
      const hasSessionCookie = loginResponse.cookies.some(cookie => 
        cookie.includes('next-auth.session-token') || 
        cookie.includes('__Secure-next-auth.session-token')
      );
      
      if (hasSessionCookie) {
        return {
          success: true,
          statusCode: loginResponse.statusCode,
          hasSession: true
        };
      } else {
        return {
          success: true,
          statusCode: loginResponse.statusCode,
          hasSession: false,
          warning: 'No session cookie found'
        };
      }
    } else if (loginResponse.statusCode === 404) {
      return {
        success: false,
        error: 'Login endpoint not found (404)',
        step: 'login',
        statusCode: 404
      };
    } else if (loginResponse.statusCode === 401) {
      return {
        success: false,
        error: 'Invalid credentials (401)',
        step: 'login',
        statusCode: 401
      };
    } else {
      return {
        success: false,
        error: `Unexpected status: ${loginResponse.statusCode}`,
        step: 'login',
        statusCode: loginResponse.statusCode
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      step: 'request'
    };
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         ASTRAL FIELD LOGIN VERIFICATION                    ║');
  console.log('║         Testing All 10 Accounts                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`🌐 Deployment URL: ${CONFIG.baseUrl}`);
  console.log(`👥 Testing ${CONFIG.accounts.length} accounts`);
  console.log(`🔑 Password: fantasy2025 (all accounts)\n`);
  console.log('='.repeat(60) + '\n');
  
  const results = [];
  
  for (const account of CONFIG.accounts) {
    process.stdout.write(`Testing ${account.name.padEnd(20)} ... `);
    
    const result = await testLogin(account);
    results.push({ account, result });
    
    if (result.success) {
      if (result.hasSession) {
        console.log('✅ PASS (Session created)');
      } else {
        console.log('⚠️  WARN (No session cookie)');
      }
    } else {
      console.log(`❌ FAIL (${result.error})`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;
  const warnings = results.filter(r => r.result.success && r.result.warning).length;
  
  console.log(`✅ Successful logins: ${successful}/${CONFIG.accounts.length}`);
  console.log(`❌ Failed logins:     ${failed}/${CONFIG.accounts.length}`);
  if (warnings > 0) {
    console.log(`⚠️  Warnings:          ${warnings}/${CONFIG.accounts.length}`);
  }
  
  // Detailed failures
  if (failed > 0) {
    console.log('\n❌ FAILED ACCOUNTS:\n');
    results.filter(r => !r.result.success).forEach(({ account, result }) => {
      console.log(`   ${account.name}:`);
      console.log(`   - Email: ${account.email}`);
      console.log(`   - Error: ${result.error}`);
      console.log(`   - Step: ${result.step}`);
      if (result.statusCode) {
        console.log(`   - Status: ${result.statusCode}`);
      }
      console.log('');
    });
  }
  
  // Account list
  console.log('\n📋 ALL ACCOUNTS:\n');
  CONFIG.accounts.forEach(account => {
    const result = results.find(r => r.account.id === account.id);
    const status = result.result.success ? '✅' : '❌';
    console.log(`   ${status} ${account.name}`);
    console.log(`      Email: ${account.email}`);
    console.log(`      Password: ${account.password}\n`);
  });
  
  // Final status
  const percentage = Math.round((successful / CONFIG.accounts.length) * 100);
  console.log('='.repeat(60));
  console.log(`\n🎯 Success Rate: ${percentage}%`);
  
  if (percentage === 100) {
    console.log('🎉 ALL LOGINS WORKING! 🎉\n');
    process.exit(0);
  } else if (percentage >= 80) {
    console.log('⚠️  Most logins working, some issues detected\n');
    process.exit(1);
  } else {
    console.log('❌ Critical login failures detected\n');
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
