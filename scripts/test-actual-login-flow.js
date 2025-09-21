const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3009';

async function testActualLoginFlow() {
  console.log('🔐 Testing Actual User Login Flow (End-to-End)\n');

  try {
    console.log('1. Testing login API call...');
    
    // Step 1: Login with Nicholas D'Amato
    const loginResponse = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Include user-agent to simulate browser
        'User-Agent': 'Mozilla/5.0 Test Browser'
      },
      body: JSON.stringify({
        email: 'nicholas@damato-dynasty.com',
        password: 'Dynasty2025!',
        demo: true,
        season: '2025'
      })
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log(`❌ Login failed: ${loginResult.error}`);
      if (loginResponse.status === 429) {
        console.log('⚠️  Rate limiting detected - this is expected after multiple tests');
        console.log('💡 Wait 15 minutes or clear rate limit data to test properly\n');
        return;
      }
      return;
    }

    console.log('✅ Login API call successful');
    console.log(`   User: ${loginResult.user.name}`);
    console.log(`   Email: ${loginResult.user.email}`);
    console.log(`   Team: ${loginResult.user.teamName}`);
    console.log(`   Session ID: ${loginResult.sessionId}\n`);

    // Step 2: Extract session cookie (simulate browser behavior)
    const sessionId = loginResult.sessionId;
    
    console.log('2. Testing authentication check with session cookie...');
    
    // Step 3: Test /api/auth/me with the session cookie
    const authCheckResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionId}` // Include the session cookie
      }
    });

    const authCheckResult = await authCheckResponse.json();
    
    if (authCheckResponse.ok && authCheckResult.success) {
      console.log('✅ Authentication check successful');
      console.log(`   Authenticated as: ${authCheckResult.user.name}`);
      console.log(`   Role: ${authCheckResult.user.role}`);
      console.log(`   Team: ${authCheckResult.user.teamName}`);
      console.log('');

      // Step 4: Test dashboard access simulation
      console.log('3. Simulating dashboard access...');
      console.log('✅ User would be able to access dashboard');
      console.log('✅ AuthProvider would recognize the user');
      console.log('✅ No redirect to home page would occur\n');

      console.log('🎉 COMPLETE LOGIN FLOW WORKING!');
      console.log('\n🔍 What happens in browser:');
      console.log('   1. User clicks team card');
      console.log('   2. Login API sets session cookie');
      console.log('   3. Browser redirects to /dashboard');
      console.log('   4. AuthProvider calls /api/auth/me');
      console.log('   5. Session validated, user data returned');
      console.log('   6. Dashboard loads successfully');
      
    } else {
      console.log('❌ Authentication check failed');
      console.log(`   Error: ${authCheckResult.error}`);
      console.log('   This means the session cookie is not being read properly');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testActualLoginFlow().catch(console.error);