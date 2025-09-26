const fetch = require('node-fetch');

async function testSignin() {
  try {
    console.log('Testing signin with Nicholas D\'Amato credentials...');
    
    // Test the signin endpoint
    const response = await fetch('http://localhost:3002/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nicholas@damato-dynasty.com',
        password: 'Dynasty2025!',
        redirect: false
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('Signin failed:', result.error);
    } else {
      console.log('Signin successful!');
    }
    
  } catch (error) {
    console.error('Error testing signin:', error);
  }
}

testSignin();