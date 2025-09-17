// Test Sleeper API Endpoints
// Quick validation of all implemented endpoints

const https = require('https');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testSleeperEndpoints() {
  console.log('🧪 TESTING SLEEPER API ENDPOINTS');
  console.log('=================================\n');

  // Note: These tests assume the Next.js server is running locally
  const baseUrl = 'localhost';
  const port = 3000;
  
  const tests = [
    {
      name: 'Sleeper API Validation',
      test: async () => {
        console.log('1️⃣ Testing basic Sleeper API validation...');
        const result = await makeRequest({
          hostname: 'api.sleeper.app',
          port: 443,
          path: '/v1/state/nfl',
          method: 'GET',
        });
        
        if (result.status === 200) {
          console.log(`   ✅ Sleeper API accessible: Season ${result.data.season}, Week ${result.data.week}`);
          return true;
        } else {
          console.log(`   ❌ Sleeper API error: ${result.status}`);
          return false;
        }
      }
    },
    
    {
      name: 'Player Service Test',
      test: async () => {
        console.log('2️⃣ Testing player service...');
        try {
          const { sleeperPlayerService } = require('../src/services/sleeper/playerService');
          const players = await sleeperPlayerService.getFantasyPlayers();
          console.log(`   ✅ Player service working: ${players.length} fantasy players`);
          return true;
        } catch (error) {
          console.log(`   ❌ Player service error: ${error.message}`);
          return false;
        }
      }
    },
    
    {
      name: 'NFL State Service Test',
      test: async () => {
        console.log('3️⃣ Testing NFL state service...');
        try {
          const { sleeperNFLStateService } = require('../src/services/sleeper/nflStateService');
          const state = await sleeperNFLStateService.getCurrentState();
          console.log(`   ✅ NFL state service working: Season ${state.season}, Week ${state.currentWeek}`);
          return true;
        } catch (error) {
          console.log(`   ❌ NFL state service error: ${error.message}`);
          return false;
        }
      }
    },
    
    {
      name: 'Integration Service Test',
      test: async () => {
        console.log('4️⃣ Testing integration service...');
        try {
          const { sleeperIntegrationService } = require('../src/services/sleeper/sleeperIntegrationService');
          const stats = await sleeperIntegrationService.getIntegrationStats();
          console.log(`   ✅ Integration service working: Season ${stats.nfl.season}, ${stats.database.totalPlayers} players in DB`);
          return true;
        } catch (error) {
          console.log(`   ❌ Integration service error: ${error.message}`);
          return false;
        }
      }
    },
    
    {
      name: 'Cache System Test',
      test: async () => {
        console.log('5️⃣ Testing cache system...');
        try {
          const { sleeperCache } = require('../src/services/sleeper/core/cacheManager');
          const stats = sleeperCache.getStats();
          console.log(`   ✅ Cache system working: ${stats.memoryEntries} entries, Redis: ${stats.redisConnected}`);
          return true;
        } catch (error) {
          console.log(`   ❌ Cache system error: ${error.message}`);
          return false;
        }
      }
    },
  ];

  console.log('Running core service tests...\n');
  
  let passed = 0;
  const total = tests.length;

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) passed++;
    } catch (error) {
      console.log(`   ❌ ${test.name} crashed: ${error.message}`);
    }
  }

  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('Sleeper integration is working correctly.\n');
    
    console.log('🚀 NEXT STEPS:');
    console.log('1. Start Next.js development server: npm run dev');
    console.log('2. Initialize integration: POST /api/sleeper/integration {"action": "initialize"}');
    console.log('3. Run quick setup: POST /api/sleeper/integration {"action": "quick_setup"}');
    console.log('4. Monitor health: GET /api/sleeper/integration?action=health');
    
    return true;
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    console.log('Check error messages above for details.');
    return false;
  }
}

// Run tests
if (require.main === module) {
  testSleeperEndpoints()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test suite crashed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSleeperEndpoints };