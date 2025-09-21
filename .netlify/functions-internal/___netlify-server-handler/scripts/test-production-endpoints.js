// Test Production Endpoints
// Validates all Sleeper API endpoints on production deployment

const https = require('https');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AstralField-Deploy-Test/1.0',
        ...options.headers,
      },
      timeout: 30000,
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function testProductionEndpoints(baseUrl = 'https://astral-field-v1.vercel.app') {
  console.log('🌐 TESTING PRODUCTION ENDPOINTS');
  console.log('===============================');
  console.log(`Base URL: ${baseUrl}`);
  console.log('');

  const tests = [
    // Basic connectivity
    {
      name: 'Server Health',
      url: `${baseUrl}/api/sleeper/integration?action=status`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Basic server connectivity and status',
    },

    // Sleeper API validation
    {
      name: 'Sleeper API Health',
      url: `${baseUrl}/api/sleeper/integration?action=health`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Comprehensive health check of all services',
    },

    // Player data endpoints
    {
      name: 'Fantasy Players',
      url: `${baseUrl}/api/sleeper/sync?type=fantasy&force=false`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Get fantasy-relevant players from Sleeper',
    },

    {
      name: 'Dynasty Targets',
      url: `${baseUrl}/api/sleeper/sync?type=dynasty`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Get top dynasty targets',
    },

    {
      name: 'Trending Players',
      url: `${baseUrl}/api/sleeper/sync?type=trending&trend=add`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Get trending player adds',
    },

    // NFL State
    {
      name: 'NFL State',
      url: `${baseUrl}/api/sleeper/state`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Current NFL season and week information',
    },

    // Database endpoints
    {
      name: 'Database Stats',
      url: `${baseUrl}/api/sleeper/database?action=stats`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Database synchronization statistics',
    },

    // League endpoints
    {
      name: 'League Health',
      url: `${baseUrl}/api/sleeper/league?action=health`,
      method: 'GET',
      expectedStatus: 200,
      description: 'League synchronization health',
    },

    // Scoring endpoints
    {
      name: 'Scoring Status',
      url: `${baseUrl}/api/sleeper/scores?action=status`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Real-time scoring service status',
    },
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${i + 1}️⃣ ${test.name}`);
    console.log(`   ${test.description}`);
    
    try {
      const startTime = Date.now();
      const result = await makeRequest(test.url, {
        method: test.method,
        data: test.data,
      });
      const duration = Date.now() - startTime;

      if (result.status === test.expectedStatus) {
        console.log(`   ✅ Success (${result.status}) - ${duration}ms`);
        
        // Log useful data
        if (result.data?.data) {
          const data = result.data.data;
          
          if (data.count !== undefined) {
            console.log(`   📊 Count: ${data.count}`);
          }
          if (data.season && data.week) {
            console.log(`   🏈 NFL: Season ${data.season}, Week ${data.week}`);
          }
          if (data.totalPlayers) {
            console.log(`   👥 Players: ${data.totalPlayers} total`);
          }
          if (data.overall) {
            console.log(`   💊 Health: ${data.overall}`);
          }
          if (data.isLive !== undefined) {
            console.log(`   ⚡ Live: ${data.isLive ? 'Active' : 'Standard'}`);
          }
        }
        
        passed++;
        results.push({ test: test.name, status: 'pass', duration, data: result.data });
      } else {
        console.log(`   ❌ Failed (${result.status}) - Expected ${test.expectedStatus}`);
        if (result.data?.error) {
          console.log(`   💬 Error: ${result.data.error}`);
        }
        failed++;
        results.push({ test: test.name, status: 'fail', duration, error: result.data });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
      results.push({ test: test.name, status: 'error', error: error.message });
    }
    
    console.log('');
  }

  // Summary
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);

  if (passed === tests.length) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('Production deployment is fully functional.');
    
    // Show key metrics
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
    console.log(`⚡ Average Response Time: ${Math.round(avgDuration)}ms`);
    
    console.log('\n🚀 PRODUCTION READY!');
    console.log('D\'Amato Dynasty League can now use:');
    console.log('- Free Sleeper API data');
    console.log('- Real-time scoring');
    console.log('- Dynasty player rankings');
    console.log('- Automated league sync');
    
    return true;
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    console.log('Production deployment may have issues.');
    
    const failedTests = results.filter(r => r.status !== 'pass');
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(t => {
        console.log(`   - ${t.test}: ${t.error?.error || t.error || 'Unknown error'}`);
      });
    }
    
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'https://astral-field-v1.vercel.app';
  
  testProductionEndpoints(baseUrl)
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test suite crashed:', error.message);
      process.exit(1);
    });
}

module.exports = { testProductionEndpoints };