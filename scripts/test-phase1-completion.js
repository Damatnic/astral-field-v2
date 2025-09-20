const BASE_URL = process.env.BASE_URL || 'http://localhost:3007';

// Test accounts for D'Amato Dynasty League
const testAccounts = [
  { email: 'nicholas@damatodynasty.com', password: 'Dynasty2025!', name: 'Nicholas D\'Amato' },
  { email: 'samuel@damatodynasty.com', password: 'Dynasty2025!', name: 'Samuel L. Damato' },
  { email: 'nick@damatodynasty.com', password: 'Dynasty2025!', name: 'Nick D\'Amato' }
];

async function testAuthentication() {
  console.log('🔐 Testing Authentication System...\n');
  
  for (const account of testAccounts) {
    try {
      // Test login with rate limiting and validation
      const loginResponse = await fetch(`${BASE_URL}/api/auth/simple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          password: account.password
        })
      });
      
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok && loginData.success) {
        console.log(`✅ ${account.name}: Authentication successful`);
        
        // Test session validation
        const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
          headers: {
            'Cookie': `session=${loginData.sessionId}`
          }
        });
        
        const sessionData = await sessionResponse.json();
        if (sessionResponse.ok && sessionData.user) {
          console.log(`   ✅ Session valid for ${sessionData.user.email}`);
        } else {
          console.log(`   ❌ Session validation failed`);
        }
      } else {
        console.log(`❌ ${account.name}: Authentication failed - ${loginData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${account.name}: Request failed - ${error.message}`);
    }
  }
}

async function testRateLimiting() {
  console.log('\n🚦 Testing Rate Limiting...\n');
  
  const testEmail = 'test@ratelimit.com';
  const requests = [];
  
  // Try to make 10 rapid requests (should be limited after 5)
  for (let i = 0; i < 10; i++) {
    requests.push(
      fetch(`${BASE_URL}/api/auth/simple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!'
        })
      })
    );
  }
  
  const responses = await Promise.all(requests);
  let successCount = 0;
  let rateLimitedCount = 0;
  
  for (const response of responses) {
    if (response.status === 429) {
      rateLimitedCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`✅ ${successCount} requests succeeded`);
  console.log(`✅ ${rateLimitedCount} requests were rate limited`);
  
  if (rateLimitedCount > 0) {
    console.log('   ✅ Rate limiting is working correctly');
  } else {
    console.log('   ⚠️  Rate limiting may not be working');
  }
}

async function testInputValidation() {
  console.log('\n✅ Testing Input Validation...\n');
  
  const invalidInputs = [
    { email: 'notanemail', password: '123' }, // Invalid email and short password
    { email: 'test@test.com' }, // Missing password
    { password: 'TestPassword123!' }, // Missing email
    { email: '', password: '' } // Empty values
  ];
  
  for (const input of invalidInputs) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      
      const data = await response.json();
      
      if (response.status === 400 && data.errors) {
        console.log(`✅ Validation rejected invalid input: ${JSON.stringify(input)}`);
      } else {
        console.log(`❌ Validation failed to reject: ${JSON.stringify(input)}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
}

async function testAnalyticsAPI() {
  console.log('\n📊 Testing Analytics API...\n');
  
  // First login to get a session
  const loginResponse = await fetch(`${BASE_URL}/api/auth/simple-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nicholas@damatodynasty.com',
      password: 'Dynasty2025!'
    })
  });
  
  const loginData = await loginResponse.json();
  
  if (loginData.success) {
    const analyticsResponse = await fetch(`${BASE_URL}/api/analytics`, {
      headers: {
        'Cookie': `session=${loginData.sessionId}`
      }
    });
    
    const analyticsData = await analyticsResponse.json();
    
    if (analyticsResponse.ok && analyticsData.success) {
      console.log('✅ Analytics API returned data');
      console.log(`   - League: ${analyticsData.data.league.name}`);
      console.log(`   - Teams: ${analyticsData.data.teamStats.length}`);
      console.log(`   - Current Week: ${analyticsData.data.league.currentWeek}`);
    } else {
      console.log(`❌ Analytics API failed: ${analyticsData.error || 'Unknown error'}`);
    }
  }
}

async function runPhase1Tests() {
  console.log('========================================');
  console.log('PHASE 1 COMPLETION TESTS');
  console.log('========================================\n');
  
  await testAuthentication();
  await testRateLimiting();
  await testInputValidation();
  await testAnalyticsAPI();
  
  console.log('\n========================================');
  console.log('PHASE 1 TESTS COMPLETED');
  console.log('========================================');
}

// Run the tests
runPhase1Tests().catch(console.error);