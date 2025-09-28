import fetch from 'node-fetch'

async function testSigninEndpoints(): Promise<void> {
  console.log('🔐 TESTING SIGNIN ENDPOINTS')
  console.log('=' .repeat(50))

  const baseUrl = 'http://localhost:3005'
  
  const endpoints = [
    { name: 'NextAuth Signin Page', url: `${baseUrl}/api/auth/signin` },
    { name: 'NextAuth CSRF Token', url: `${baseUrl}/api/auth/csrf` },
    { name: 'NextAuth Session', url: `${baseUrl}/api/auth/session` },
    { name: 'NextAuth Providers', url: `${baseUrl}/api/auth/providers` },
    { name: 'Custom Signin Page', url: `${baseUrl}/auth/signin` }
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting ${endpoint.name}...`)
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Test-Script'
        }
      })
      
      console.log(`Status: ${response.status}`)
      console.log(`Content-Type: ${response.headers.get('content-type')}`)
      
      if (response.ok) {
        const text = await response.text()
        if (endpoint.name.includes('JSON') || response.headers.get('content-type')?.includes('json')) {
          try {
            const json = JSON.parse(text)
            console.log(`Response: ${JSON.stringify(json, null, 2)}`)
          } catch {
            console.log(`Response: ${text.substring(0, 200)}...`)
          }
        } else {
          console.log(`Response length: ${text.length} characters`)
        }
      } else {
        console.log(`❌ Error: ${response.statusText}`)
      }
    } catch (error) {
      console.log(`❌ Failed to connect: ${error}`)
    }
  }

  // Test actual login attempt
  console.log('\n🔐 TESTING ACTUAL LOGIN ATTEMPT')
  console.log('=' .repeat(50))
  
  try {
    // First get CSRF token
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()
    console.log(`CSRF Token: ${csrfData.csrfToken?.substring(0, 20)}...`)

    // Try login with test credentials
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        email: 'test@example.com',
        password: 'password123',
        csrfToken: csrfData.csrfToken,
        callbackUrl: `${baseUrl}/dashboard`,
        json: 'true'
      })
    })

    console.log(`Login attempt status: ${loginResponse.status}`)
    console.log(`Login response headers:`, Object.fromEntries(loginResponse.headers.entries()))
    
    const loginText = await loginResponse.text()
    console.log(`Login response: ${loginText.substring(0, 500)}`)

  } catch (error) {
    console.log(`❌ Login test failed: ${error}`)
  }
}

testSigninEndpoints().catch(console.error)