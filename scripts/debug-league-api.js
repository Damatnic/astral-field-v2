const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3009';

async function debugLeagueAPI() {
  try {
    console.log('🔍 Debugging League API Issue\n');

    // Step 1: Login to get session
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nicholas@damato-dynasty.com',
        password: 'Dynasty2025!',
        demo: true,
        season: '2025'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success || !loginData.sessionId) {
      console.log('❌ Login failed, cannot test league API');
      return;
    }

    const sessionId = loginData.sessionId;
    console.log('✅ Login successful, session:', sessionId);

    // Step 2: Test league API with session
    console.log('\n2. Testing league API with authentication...');
    const leagueResponse = await fetch(`${BASE_URL}/api/league`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionId}`
      }
    });

    console.log('League API Status:', leagueResponse.status);
    console.log('League API Headers:', Object.fromEntries(leagueResponse.headers));

    const leagueData = await leagueResponse.json();
    console.log('League API Response:');
    console.log(JSON.stringify(leagueData, null, 2));

    // Step 3: Check what's in the response
    if (leagueData.success) {
      console.log('\n✅ League API working correctly!');
      console.log('League Name:', leagueData.league.name);
      console.log('Season:', leagueData.league.season);
      console.log('Current Week:', leagueData.league.currentWeek);
      console.log('Total Teams:', leagueData.league.totalTeams);
    } else {
      console.log('\n❌ League API failed:', leagueData.error);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugLeagueAPI();