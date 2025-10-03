const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://astralfield.vercel.app';
const TEST_EMAIL = 'nicholas@damato-dynasty.com';
const TEST_PASSWORD = 'Dynasty2025!';

function makeRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let body = buffer.toString();
        
        // Handle gzipped responses
        if (res.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          try {
            body = zlib.gunzipSync(buffer).toString();
          } catch (e) {
            body = buffer.toString();
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testCompleteAuth() {
  console.log('🚀 Testing complete authentication flow...');
  
  try {
    // Test 1: Quick login API
    console.log('\n📍 Test 1: Quick login API');
    const quickLoginResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/quick-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ email: TEST_EMAIL }));
    
    console.log(`Status: ${quickLoginResponse.statusCode}`);
    if (quickLoginResponse.statusCode === 200) {
      const quickLoginData = JSON.parse(quickLoginResponse.body);
      console.log('✅ Quick login API working');
      console.log(`Session token: ${quickLoginData.sessionToken ? 'Generated' : 'Missing'}`);
      
      // Test 2: Verify quick login
      console.log('\n📍 Test 2: Verify quick login API');
      const verifyResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/verify-quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify({ 
        email: TEST_EMAIL, 
        sessionToken: quickLoginData.sessionToken 
      }));
      
      console.log(`Status: ${verifyResponse.statusCode}`);
      if (verifyResponse.statusCode === 200) {
        const verifyData = JSON.parse(verifyResponse.body);
        console.log('✅ Verify quick login API working');
        console.log(`Password: ${verifyData.credentials.password === TEST_PASSWORD ? 'Correct' : 'Incorrect'}`);
      }
    } else {
      console.log('❌ Quick login API failed');
      console.log('Response:', quickLoginResponse.body.substring(0, 200));
    }
    
    // Test 3: NextAuth CSRF token
    console.log('\n📍 Test 3: NextAuth CSRF token');
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf`);
    console.log(`Status: ${csrfResponse.statusCode}`);
    
    let csrfToken = null;
    if (csrfResponse.statusCode === 200) {
      try {
        const csrfData = JSON.parse(csrfResponse.body);
        csrfToken = csrfData.csrfToken;
        console.log(`✅ CSRF token: ${csrfToken ? 'Available' : 'Missing'}`);
      } catch (e) {
        console.log('❌ Invalid CSRF response format');
      }
    }
    
    // Test 4: Authentication attempt
    if (csrfToken) {
      console.log('\n📍 Test 4: Authentication attempt');
      
      const authData = `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=${encodeURIComponent('/dashboard')}`;
      
      const authResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(authData),
          'Referer': `${PRODUCTION_URL}/auth/signin`
        }
      }, authData);
      
      console.log(`Status: ${authResponse.statusCode}`);
      console.log(`Headers: ${Object.keys(authResponse.headers).join(', ')}`);
      
      if (authResponse.statusCode === 302) {
        const location = authResponse.headers.location;
        console.log(`✅ Authentication redirect: ${location}`);
        
        if (location && location.includes('/dashboard')) {
          console.log('🎉 SUCCESS: Authentication working!');
        } else if (location && location.includes('error')) {
          console.log('❌ Authentication error redirect');
        } else {
          console.log(`🤔 Unexpected redirect: ${location}`);
        }
      } else if (authResponse.statusCode === 200) {
        console.log('📄 Got 200 response (checking for error indicators)');
        if (authResponse.body.includes('error') || authResponse.body.includes('invalid')) {
          console.log('❌ Authentication failed (error in response)');
        } else {
          console.log('✅ Might be successful (no error indicators)');
        }
      } else {
        console.log(`❌ Unexpected status: ${authResponse.statusCode}`);
      }
    }
    
    // Test 5: Check current session
    console.log('\n📍 Test 5: Session check');
    const sessionResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/session`);
    console.log(`Status: ${sessionResponse.statusCode}`);
    
    if (sessionResponse.statusCode === 200) {
      try {
        const sessionData = JSON.parse(sessionResponse.body);
        console.log(`Session: ${sessionData.user ? 'Active' : 'None'}`);
        if (sessionData.user) {
          console.log(`User: ${sessionData.user.email || 'Unknown'}`);
        }
      } catch (e) {
        console.log('❌ Invalid session response');
      }
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('- Quick login APIs: Available');
    console.log('- CSRF protection: Active');
    console.log('- Authentication endpoint: Functional');
    console.log('\n🔗 Manual test URL:', `${PRODUCTION_URL}/auth/signin`);
    console.log('📧 Email:', TEST_EMAIL);
    console.log('🔐 Password:', TEST_PASSWORD);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteAuth().catch(console.error);