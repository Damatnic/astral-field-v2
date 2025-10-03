// Test JWT decoding to see what's in the session token
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
  
  getCookie(name) {
    return this.cookies.get(name);
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

    if (cookieJar && cookieJar.cookies.size > 0) {
      reqOptions.headers['Cookie'] = cookieJar.getCookieHeader();
    }

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let body = buffer.toString();
        
        if (res.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          try {
            body = zlib.gunzipSync(buffer).toString();
          } catch (e) {
            body = buffer.toString();
          }
        }
        
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

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: `Invalid JWT structure: ${parts.length} parts` };
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    return { header, payload };
  } catch (error) {
    return { error: error.message };
  }
}

async function debugJWT() {
  console.log('🔍 Debugging JWT token structure...');
  
  const cookieJar = new CookieJar();
  
  try {
    // Get CSRF token
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf`, {}, null, cookieJar);
    const csrfData = JSON.parse(csrfResponse.body);
    const csrfToken = csrfData.csrfToken;
    
    // Authenticate
    const authData = `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=${encodeURIComponent('/dashboard')}`;
    
    await makeRequest(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(authData),
        'Referer': `${PRODUCTION_URL}/auth/signin`
      }
    }, authData, cookieJar);
    
    // Get the session token
    const sessionToken = cookieJar.getCookie('__Secure-next-auth.session-token');
    
    if (!sessionToken) {
      console.log('❌ No session token found');
      return;
    }
    
    console.log('\n🎫 Session Token Analysis:');
    console.log(`Token length: ${sessionToken.length}`);
    console.log(`Token preview: ${sessionToken.substring(0, 50)}...${sessionToken.substring(sessionToken.length - 10)}`);
    
    // Try to decode as JWT
    const decoded = decodeJWT(sessionToken);
    
    if (decoded.error) {
      console.log(`❌ JWT decode error: ${decoded.error}`);
      
      // Try base64 decoding (maybe it's not a JWT)
      try {
        const base64Decoded = Buffer.from(sessionToken, 'base64').toString();
        console.log('🔍 Base64 decode result:', base64Decoded.substring(0, 200));
      } catch (e) {
        console.log('❌ Not valid base64 either');
      }
      
      // Try URL decoding
      try {
        const urlDecoded = decodeURIComponent(sessionToken);
        console.log('🔍 URL decode result:', urlDecoded.substring(0, 200));
      } catch (e) {
        console.log('❌ Not URL encoded');
      }
    } else {
      console.log('\n✅ JWT Token Structure:');
      console.log('Header:', JSON.stringify(decoded.header, null, 2));
      console.log('Payload:', JSON.stringify(decoded.payload, null, 2));
      
      const currentTime = Math.floor(Date.now() / 1000);
      console.log(`\nToken timing:`);
      console.log(`- Current time: ${currentTime}`);
      console.log(`- Issued at (iat): ${decoded.payload.iat}`);
      console.log(`- Expires at (exp): ${decoded.payload.exp}`);
      
      if (decoded.payload.exp) {
        const timeToExpiry = decoded.payload.exp - currentTime;
        console.log(`- Time to expiry: ${timeToExpiry} seconds (${Math.floor(timeToExpiry / 60)} minutes)`);
        console.log(`- Token valid: ${timeToExpiry > 0 ? 'Yes' : 'No'}`);
      }
      
      if (decoded.payload.iat) {
        const tokenAge = currentTime - decoded.payload.iat;
        console.log(`- Token age: ${tokenAge} seconds (${Math.floor(tokenAge / 60)} minutes)`);
      }
    }
    
    // Test the actual session API
    console.log('\n🔍 Session API Response:');
    const sessionResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/session`, {}, null, cookieJar);
    if (sessionResponse.statusCode === 200) {
      const sessionData = JSON.parse(sessionResponse.body);
      console.log('Session data:', JSON.stringify(sessionData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugJWT().catch(console.error);