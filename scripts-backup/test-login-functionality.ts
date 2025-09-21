import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://astral-field-v1.vercel.app';

async function testLoginFunctionality() {
  console.log('🔐 === TESTING LOGIN FUNCTIONALITY ===\n');
  console.log(`🌐 Testing: ${PRODUCTION_URL}`);
  console.log('📅 September 18, 2025 - NFL Week 3\n');
  
  // Test login with a real user
  const testUser = {
    email: 'nicholas.damato@astralfield.com',
    password: 'player123!'
  };
  
  try {
    console.log('🧪 Testing login endpoint...');
    
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    console.log(`📊 Login Response Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log(`👤 User: ${loginData.user?.name || 'Unknown'}`);
      console.log(`📧 Email: ${loginData.user?.email || 'Unknown'}`);
      console.log(`👑 Role: ${loginData.user?.role || 'Unknown'}`);
      
      // Test if we can access protected endpoints
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        console.log('\n🍪 Testing authenticated access...');
        
        const meResponse = await fetch(`${PRODUCTION_URL}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Cookie': cookies
          }
        });
        
        console.log(`📊 /api/auth/me Status: ${meResponse.status}`);
        
        if (meResponse.ok) {
          const meData = await meResponse.json();
          console.log('✅ Authenticated access working!');
          console.log(`👤 Authenticated as: ${meData.user?.name || 'Unknown'}`);
        } else {
          console.log('⚠️ Authenticated access not working');
        }
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:');
      console.log(`Error: ${errorData.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Test other users
  console.log('\n🔍 Testing other user accounts...');
  
  const otherUsers = [
    { email: 'brittany.bergum@astralfield.com', name: 'Brittany Bergum' },
    { email: 'david.jarvey@astralfield.com', name: 'David Jarvey' },
    { email: 'jon.kornbeck@astralfield.com', name: 'Jon Kornbeck' }
  ];
  
  for (const user of otherUsers) {
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: 'player123!'
        })
      });
      
      const status = response.ok ? '✅' : '❌';
      console.log(`${status} ${user.name}: ${response.status}`);
      
    } catch (error) {
      console.log(`❌ ${user.name}: Error`);
    }
  }
  
  console.log('\n🎉 === LOGIN TEST COMPLETE ===');
  console.log('🔗 Production URL: https://astral-field-v1.vercel.app');
  console.log('👥 All users should use password: player123!');
  
}

testLoginFunctionality().catch(console.error);