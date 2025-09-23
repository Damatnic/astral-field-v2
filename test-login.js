// Test login flow
const testLogin = async () => {
  console.log('Testing login API...');
  
  try {
    // Test with proper JSON
    const response = await fetch('http://localhost:3009/api/auth/simple-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nicholas.damato@test.com',
        password: 'Dynasty2025!'
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok && data.success) {
      console.log('✅ Login successful!');
      console.log('Session ID:', data.sessionId);
      
      // Now test if session works
      console.log('\nTesting session validation...');
      const meResponse = await fetch('http://localhost:3009/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cookie': response.headers.get('set-cookie') || ''
        }
      });
      
      console.log('Me endpoint status:', meResponse.status);
      const meData = await meResponse.json();
      console.log('Me endpoint data:', meData);
      
      if (meResponse.ok && meData.success) {
        console.log('✅ Session validation successful!');
      } else {
        console.log('❌ Session validation failed');
      }
    } else {
      console.log('❌ Login failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testLogin();