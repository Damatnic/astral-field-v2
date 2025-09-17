async function testAPILogin() {
  console.log('🧪 Testing API login functionality...');
  const BASE_URL = 'http://localhost:3002';
  
  try {
    // Test 1: Login with Nicholas D'Amato
    console.log('\n🔑 Testing login with Nicholas D\'Amato...');
    const loginResponse1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'nicholas.damato@astralfield.com',
        password: 'player123!'
      })
    });
    
    const loginData1 = await loginResponse1.json();
    console.log(`Status: ${loginResponse1.status}`);
    console.log('Response:', JSON.stringify(loginData1, null, 2));
    
    if (loginData1.success) {
      console.log('✅ Login successful!');
      console.log(`User: ${loginData1.user.name} (${loginData1.user.role})`);
    } else {
      console.log('❌ Login failed:', loginData1.error);
    }
    
    // Test 2: Login with Nick Hartley
    console.log('\n🔑 Testing login with Nick Hartley...');
    const loginResponse2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'nick.hartley@astralfield.com',
        password: 'player123!'
      })
    });
    
    const loginData2 = await loginResponse2.json();
    console.log(`Status: ${loginResponse2.status}`);
    console.log('Response:', JSON.stringify(loginData2, null, 2));
    
    if (loginData2.success) {
      console.log('✅ Login successful!');
      console.log(`User: ${loginData2.user.name} (${loginData2.user.role})`);
    } else {
      console.log('❌ Login failed:', loginData2.error);
    }
    
    // Test 3: Login with wrong password
    console.log('\n🔑 Testing login with wrong password...');
    const loginResponse3 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'nicholas.damato@astralfield.com',
        password: 'wrongpassword'
      })
    });
    
    const loginData3 = await loginResponse3.json();
    console.log(`Status: ${loginResponse3.status}`);
    console.log('Response:', JSON.stringify(loginData3, null, 2));
    
    if (!loginData3.success) {
      console.log('✅ Wrong password correctly rejected');
    } else {
      console.log('❌ Wrong password was accepted (unexpected)');
    }
    
    // Test 4: Login with non-existent user
    console.log('\n🔑 Testing login with non-existent user...');
    const loginResponse4 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'nonexistent@astralfield.com',
        password: 'player123!'
      })
    });
    
    const loginData4 = await loginResponse4.json();
    console.log(`Status: ${loginResponse4.status}`);
    console.log('Response:', JSON.stringify(loginData4, null, 2));
    
    if (!loginData4.success) {
      console.log('✅ Non-existent user correctly rejected');
    } else {
      console.log('❌ Non-existent user was accepted (unexpected)');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAPILogin()
  .then(() => {
    console.log('\n🎉 API login test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });