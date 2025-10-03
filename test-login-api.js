const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://web-n2ykhu4p0-astral-productions.vercel.app';
const DEFAULT_PASSWORD = 'Dynasty2025!';
const TEST_EMAIL = 'nicholas@damato-dynasty.com';

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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testLoginFlow() {
  console.log('🚀 Testing production login API flow...');
  
  try {
    // Step 1: Get the sign-in page to extract CSRF token
    console.log('📍 Step 1: Getting sign-in page...');
    const signinResponse = await makeRequest(`${PRODUCTION_URL}/auth/signin`);
    console.log(`✅ Sign-in page status: ${signinResponse.statusCode}`);
    
    // Extract CSRF token from the page
    const csrfMatch = signinResponse.body.match(/name="csrfToken" value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    console.log(`🔐 CSRF Token: ${csrfToken ? 'Found' : 'Not found'}`);
    
    if (!csrfToken) {
      console.log('❌ Could not find CSRF token in sign-in page');
      return;
    }
    
    // Extract cookies from response
    const cookies = signinResponse.headers['set-cookie'] || [];
    const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    console.log(`🍪 Cookies: ${cookieHeader ? 'Found' : 'None'}`);
    
    // Step 2: Attempt authentication
    console.log('🔐 Step 2: Attempting authentication...');
    const authData = `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(DEFAULT_PASSWORD)}&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=${encodeURIComponent('/dashboard')}`;
    
    const authResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(authData),
        'Cookie': cookieHeader,
        'Referer': `${PRODUCTION_URL}/auth/signin`
      }
    }, authData);
    
    console.log(`✅ Auth response status: ${authResponse.statusCode}`);
    console.log('📍 Response headers:', Object.keys(authResponse.headers));
    
    // Check for redirect (successful login usually returns 302)
    if (authResponse.statusCode === 302) {
      const location = authResponse.headers.location;
      console.log(`🎉 LOGIN SUCCESS! Redirected to: ${location}`);
      
      if (location && location.includes('/dashboard')) {
        console.log('✅ Successfully redirected to dashboard');
      } else if (location && location.includes('/auth/signin')) {
        console.log('❌ Redirected back to sign-in (login failed)');
      } else {
        console.log(`🤔 Unexpected redirect: ${location}`);
      }
    } else if (authResponse.statusCode === 200) {
      console.log('📄 Received 200 response (checking content)...');
      
      if (authResponse.body.includes('Sign in') || authResponse.body.includes('signin')) {
        console.log('❌ Still showing sign-in page (login failed)');
      } else {
        console.log('✅ Login may have succeeded (different page content)');
      }
    } else {
      console.log(`❌ Unexpected status code: ${authResponse.statusCode}`);
    }
    
    // Check response body for errors
    if (authResponse.body.includes('error') || authResponse.body.includes('invalid')) {
      console.log('❗ Response contains error indicators');
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

testLoginFlow().catch(console.error);