const https = require('https')
const http = require('http')

// Test authentication flow
async function testSigninFlow() {
  console.log('🧪 Testing complete signin flow...\n')
  
  try {
    // First get CSRF token
    console.log('1️⃣ Getting CSRF token...')
    const csrfResponse = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/auth/csrf',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    const csrfData = JSON.parse(csrfResponse.body)
    console.log('✅ CSRF token received:', csrfData.csrfToken.substring(0, 20) + '...')
    
    // Now test signin
    console.log('\n2️⃣ Testing credentials signin...')
    const signinPayload = JSON.stringify({
      csrfToken: csrfData.csrfToken,
      email: 'test@test.com',
      password: 'testuser123',
      callbackUrl: '/dashboard',
      json: true
    })
    
    const signinResponse = await makeRequest({
      hostname: 'localhost',
      port: 5005,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(signinPayload),
        'Accept': 'application/json',
        'Cookie': csrfResponse.headers['set-cookie']?.join('; ') || ''
      }
    }, signinPayload)
    
    console.log('📄 Signin response status:', signinResponse.statusCode)
    console.log('📄 Signin response headers:', Object.keys(signinResponse.headers))
    
    if (signinResponse.headers.location) {
      console.log('📍 Redirect location:', signinResponse.headers.location)
    }
    
    if (signinResponse.statusCode === 200 || signinResponse.statusCode === 302) {
      console.log('✅ Signin API response successful')
      
      // Check if we have session cookies
      const cookies = signinResponse.headers['set-cookie']
      if (cookies) {
        console.log('🍪 Session cookies received:', cookies.length)
        
        // Test session with cookies
        console.log('\n3️⃣ Testing session with cookies...')
        const sessionResponse = await makeRequest({
          hostname: 'localhost',
          port: 5005,
          path: '/api/auth/session',
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cookie': cookies.join('; ')
          }
        })
        
        console.log('👤 Session response:', sessionResponse.body)
        
        if (sessionResponse.body && sessionResponse.body !== 'null') {
          console.log('✅ Session established successfully!')
        } else {
          console.log('❌ Session not established')
        }
      } else {
        console.log('❌ No session cookies received')
      }
    } else {
      console.log('❌ Signin failed with status:', signinResponse.statusCode)
      console.log('📄 Response body:', signinResponse.body)
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        })
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    if (data) {
      req.write(data)
    }
    
    req.end()
  })
}

// Run the test
testSigninFlow()