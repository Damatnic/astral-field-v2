const baseUrl = process.env.BASE_URL || 'https://astralfield.vercel.app';
const bypassSecret = 'K9mR3nP7xQ2sL8vY1uW5tE4oI6aS9dF0';

console.log('🔐 Testing Production Authentication...');
console.log(`Base URL: ${baseUrl}`);

async function testLogin() {
  try {
    // Test login with production credentials
    console.log('\n1. Testing login with admin credentials...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/simple-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': bypassSecret
      },
      body: JSON.stringify({
        email: 'nicholas.damato@astralfield.com',
        password: 'admin123!'
      })
    });

    console.log(`   Status: ${loginResponse.status}`);
    const loginData = await loginResponse.json();
    console.log(`   Response:`, loginData);

    if (loginData.success && loginData.token) {
      console.log('\n2. Testing authenticated API call...');
      
      // Test health endpoint with auth token
      const healthResponse = await fetch(`${baseUrl}/api/health`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'x-vercel-protection-bypass': bypassSecret,
          'Cookie': loginResponse.headers.get('set-cookie') || ''
        }
      });
      
      console.log(`   Health Status: ${healthResponse.status}`);
      const healthData = await healthResponse.json();
      console.log(`   Health Response:`, healthData);

      // Test leagues endpoint
      console.log('\n3. Testing leagues endpoint...');
      const leaguesResponse = await fetch(`${baseUrl}/api/leagues`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'x-vercel-protection-bypass': bypassSecret,
          'Cookie': loginResponse.headers.get('set-cookie') || ''
        }
      });
      
      console.log(`   Leagues Status: ${leaguesResponse.status}`);
      const leaguesData = await leaguesResponse.json();
      console.log(`   Leagues Response:`, leaguesData);
    }

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
  }
}

testLogin();
