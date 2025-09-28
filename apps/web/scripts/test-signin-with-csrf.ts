// Test real signin with proper CSRF token after fix
async function testSigninWithCSRF(): Promise<void> {
  console.log('🔐 TESTING SIGNIN WITH CSRF TOKEN FIX')
  console.log('=' .repeat(50))

  const baseUrl = 'http://localhost:3005'
  
  try {
    // Step 1: Get CSRF token
    console.log('\n🔐 Step 1: Getting CSRF token...')
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()
    
    console.log(`CSRF token: ${csrfData.csrfToken?.substring(0, 20)}...`)
    
    // Step 2: Get session cookies
    console.log('\n🍪 Step 2: Getting session cookies...')
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`)
    const cookies = sessionResponse.headers.get('set-cookie') || ''
    
    console.log(`Session cookies: ${cookies.substring(0, 100)}...`)
    
    // Step 3: Test with valid user credentials
    console.log('\n🔑 Step 3: Testing login with valid credentials...')
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': `${baseUrl}/auth/signin`,
        'Origin': baseUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies
      },
      body: new URLSearchParams({
        email: 'test@test.com',  // Use the valid test user
        password: 'password123',
        csrfToken: csrfData.csrfToken,
        callbackUrl: `${baseUrl}/dashboard`,
        redirect: 'false'
      })
    })

    console.log(`Login status: ${loginResponse.status}`)
    
    // Check for redirect
    const location = loginResponse.headers.get('location')
    if (location) {
      console.log(`Redirect location: ${location}`)
    }
    
    // Get response text
    const loginText = await loginResponse.text()
    console.log(`Response preview: ${loginText.substring(0, 200)}...`)
    
    // Step 4: Check session after login
    console.log('\n🔍 Step 4: Checking session after login...')
    
    const finalCookies = loginResponse.headers.get('set-cookie') || cookies
    const finalSessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        'Cookie': finalCookies
      }
    })
    
    const sessionData = await finalSessionResponse.json()
    console.log(`Final session status: ${finalSessionResponse.status}`)
    console.log(`Session data:`, sessionData)
    
    // Final verdict
    console.log('\n🎯 FINAL VERDICT:')
    console.log('=' .repeat(50))
    
    if (loginResponse.status === 302 && location && !location.includes('error')) {
      console.log('✅ LOGIN SUCCESS! - Got redirect without error')
    } else if (sessionData?.user) {
      console.log(`✅ LOGIN SUCCESS! - User: ${sessionData.user.email}`)
    } else if (location?.includes('error')) {
      console.log(`❌ LOGIN FAILED - Error in redirect: ${location}`)
    } else {
      console.log('❌ LOGIN FAILED - No valid session or redirect')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSigninWithCSRF().catch(console.error)