const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://astralfield.vercel.app';
const TEST_EMAIL = 'nicholas@damato-dynasty.com';
const TEST_PASSWORD = 'Dynasty2025!';

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  
  setCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    headers.forEach(header => {
      const [cookiePart] = header.split(';');
      const [name, value] = cookiePart.split('=');
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
      }
    });
  }
  
  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
  hasCookie(name) {
    return this.cookies.has(name);
  }
  
  getCookie(name) {
    return this.cookies.get(name);
  }
  
  listCookies() {
    return Array.from(this.cookies.keys());
  }
}

function makeRequest(url, options = {}, data = null, cookieJar = null) {
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

    // Add cookies if available
    if (cookieJar && cookieJar.cookies.size > 0) {
      reqOptions.headers['Cookie'] = cookieJar.getCookieHeader();
    }

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
        
        // Update cookies
        if (cookieJar && res.headers['set-cookie']) {
          cookieJar.setCookies(res.headers['set-cookie']);
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

async function testCompleteLoginFlow() {
  console.log('🚀 Testing complete login flow with cookie handling...');
  
  const cookieJar = new CookieJar();
  
  try {
    // Step 1: Get the sign-in page (this should set initial cookies)
    console.log('\n📍 Step 1: Getting sign-in page');
    const signinResponse = await makeRequest(`${PRODUCTION_URL}/auth/signin`, {}, null, cookieJar);
    console.log(`Status: ${signinResponse.statusCode}`);
    console.log(`Cookies after signin page: ${cookieJar.listCookies().join(', ')}`);
    
    // Step 2: Get CSRF token
    console.log('\n📍 Step 2: Getting CSRF token');
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf`, {}, null, cookieJar);
    console.log(`Status: ${csrfResponse.statusCode}`);
    
    let csrfToken = null;
    if (csrfResponse.statusCode === 200) {
      try {
        const csrfData = JSON.parse(csrfResponse.body);
        csrfToken = csrfData.csrfToken;
        console.log(`CSRF token: ${csrfToken ? 'Available' : 'Missing'}`);
        console.log(`Cookies after CSRF: ${cookieJar.listCookies().join(', ')}`);
      } catch (e) {
        console.log('❌ Invalid CSRF response format');
      }
    }
    
    if (!csrfToken) {
      console.log('❌ Cannot proceed without CSRF token');
      return;
    }
    
    // Step 3: Perform authentication
    console.log('\n📍 Step 3: Performing authentication');
    const authData = `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=${encodeURIComponent('/dashboard')}`;
    
    const authResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(authData),
        'Referer': `${PRODUCTION_URL}/auth/signin`
      }
    }, authData, cookieJar);
    
    console.log(`Auth status: ${authResponse.statusCode}`);
    console.log(`Cookies after auth: ${cookieJar.listCookies().join(', ')}`);
    
    if (authResponse.statusCode === 302) {
      const location = authResponse.headers.location;
      console.log(`Auth redirect: ${location}`);
      
      if (location && location.includes('error')) {
        console.log('❌ Authentication failed with error');
        return;
      }
      
      // Step 4: Follow the redirect
      console.log('\n📍 Step 4: Following auth redirect');
      const redirectResponse = await makeRequest(location, {}, null, cookieJar);
      console.log(`Redirect status: ${redirectResponse.statusCode}`);
      console.log(`Cookies after redirect: ${cookieJar.listCookies().join(', ')}`);
      
      if (redirectResponse.statusCode === 302) {
        const finalLocation = redirectResponse.headers.location;
        console.log(`Final redirect: ${finalLocation}`);
        
        // Step 5: Follow to final destination
        console.log('\n📍 Step 5: Following to final destination');
        const finalResponse = await makeRequest(finalLocation, {}, null, cookieJar);
        console.log(`Final status: ${finalResponse.statusCode}`);
        console.log(`Final cookies: ${cookieJar.listCookies().join(', ')}`);
        
        if (finalResponse.statusCode === 200) {
          if (finalResponse.body.includes('dashboard') || finalResponse.body.includes('Welcome')) {
            console.log('🎉 SUCCESS: Reached authenticated area!');
          } else if (finalResponse.body.includes('signin') || finalResponse.body.includes('login')) {
            console.log('❌ FAILED: Back to login page');
          } else {
            console.log('🤔 Unknown page reached');
          }
        }
      } else if (redirectResponse.statusCode === 200) {
        if (redirectResponse.body.includes('dashboard') || redirectResponse.body.includes('Welcome')) {
          console.log('🎉 SUCCESS: Reached authenticated area!');
        } else if (redirectResponse.body.includes('signin') || redirectResponse.body.includes('login')) {
          console.log('❌ FAILED: Back to login page');
        } else {
          console.log('🤔 Unknown page reached');
        }
      }
    }
    
    // Step 6: Check session status
    console.log('\n📍 Step 6: Checking session status');
    const sessionResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/session`, {}, null, cookieJar);
    console.log(`Session status: ${sessionResponse.statusCode}`);
    
    if (sessionResponse.statusCode === 200) {
      try {
        const sessionData = JSON.parse(sessionResponse.body);
        console.log(`Session user: ${sessionData.user ? sessionData.user.email || 'Present' : 'None'}`);
      } catch (e) {
        console.log('❌ Invalid session response');
      }
    }
    
    // Step 7: Test accessing protected route
    console.log('\n📍 Step 7: Testing protected route access');
    const dashboardResponse = await makeRequest(`${PRODUCTION_URL}/dashboard`, {}, null, cookieJar);
    console.log(`Dashboard status: ${dashboardResponse.statusCode}`);
    
    if (dashboardResponse.statusCode === 200) {
      console.log('✅ Dashboard accessible (authentication working)');
    } else if (dashboardResponse.statusCode === 302) {
      const location = dashboardResponse.headers.location;
      if (location && location.includes('signin')) {
        console.log('❌ Dashboard redirected to signin (authentication failed)');
      } else {
        console.log(`🤔 Dashboard redirected to: ${location}`);
      }
    }
    
    console.log('\n🔍 Debug Information:');
    console.log('Session cookies present:');
    const sessionCookie = cookieJar.getCookie('next-auth.session-token') || cookieJar.getCookie('__Secure-next-auth.session-token');
    console.log(`- Session token: ${sessionCookie ? 'Present' : 'Missing'}`);
    console.log(`- CSRF token: ${cookieJar.hasCookie('next-auth.csrf-token') || cookieJar.hasCookie('__Secure-next-auth.csrf-token') ? 'Present' : 'Missing'}`);
    console.log(`- Callback URL: ${cookieJar.hasCookie('next-auth.callback-url') || cookieJar.hasCookie('__Secure-next-auth.callback-url') ? 'Present' : 'Missing'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteLoginFlow().catch(console.error);