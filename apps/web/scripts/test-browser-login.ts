// Test real browser-like login flow with proper CSRF handling
import { JSDOM } from 'jsdom'

async function testBrowserLogin(): Promise<void> {
  console.log('🔐 TESTING BROWSER-LIKE LOGIN FLOW')
  console.log('=' .repeat(50))

  const baseUrl = 'http://localhost:3005'
  
  try {
    // Step 1: Get the signin page and extract any CSRF tokens
    console.log('\n📄 Step 1: Fetching signin page...')
    const signinResponse = await fetch(`${baseUrl}/auth/signin`)
    const signinHtml = await signinResponse.text()
    
    console.log(`Signin page status: ${signinResponse.status}`)
    console.log(`Content length: ${signinHtml.length} characters`)
    
    // Parse the HTML to look for CSRF tokens or forms
    const dom = new JSDOM(signinHtml)
    const document = dom.window.document
    
    // Look for any hidden CSRF token inputs
    const csrfInputs = document.querySelectorAll('input[name*="csrf" i]')
    const hiddenInputs = document.querySelectorAll('input[type="hidden"]')
    const forms = document.querySelectorAll('form')
    
    console.log(`Found ${csrfInputs.length} CSRF inputs`)
    console.log(`Found ${hiddenInputs.length} hidden inputs`)
    console.log(`Found ${forms.length} forms`)
    
    if (hiddenInputs.length > 0) {
      hiddenInputs.forEach((input, i) => {
        console.log(`Hidden input ${i + 1}: name="${input.getAttribute('name')}" value="${input.getAttribute('value')?.substring(0, 20)}..."`)
      })
    }
    
    // Step 2: Get CSRF token from API
    console.log('\n🔐 Step 2: Getting CSRF token from API...')
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
      headers: {
        'Accept': 'application/json'
      }
    })
    const csrfData = await csrfResponse.json()
    
    console.log(`CSRF API status: ${csrfResponse.status}`)
    console.log(`CSRF token: ${csrfData.csrfToken?.substring(0, 20)}...`)
    
    // Step 3: Try login with proper headers (simulate browser)
    console.log('\n🔑 Step 3: Attempting login with proper headers...')
    
    // Simulate browser cookies and headers
    const cookies = signinResponse.headers.get('set-cookie') || ''
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': `${baseUrl}/auth/signin`,
        'Origin': baseUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        'Cookie': cookies
      },
      body: new URLSearchParams({
        email: 'damato.dynasty@example.com',
        password: 'password123',
        csrfToken: csrfData.csrfToken,
        callbackUrl: `${baseUrl}/dashboard`,
        redirect: 'false'
      })
    })

    console.log(`Login status: ${loginResponse.status}`)
    console.log(`Login headers:`, Object.fromEntries(loginResponse.headers.entries()))
    
    const loginText = await loginResponse.text()
    console.log(`Login response preview: ${loginText.substring(0, 300)}...`)
    
    // Step 4: Check if we got redirected or if there's an error
    if (loginResponse.status === 302) {
      const location = loginResponse.headers.get('location')
      console.log(`✅ Redirected to: ${location}`)
      
      if (location?.includes('error')) {
        console.log(`❌ Login failed with error in redirect: ${location}`)
      } else if (location?.includes('dashboard')) {
        console.log(`✅ Login appears successful - redirected to dashboard`)
      }
    } else if (loginResponse.status === 200) {
      // Check if response contains error messages
      if (loginText.includes('error=')) {
        console.log(`❌ Login failed - response contains error`)
      } else {
        console.log(`✅ Login appears successful - status 200`)
      }
    }
    
    // Step 5: Test session after login
    console.log('\n🔍 Step 5: Checking session after login...')
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        'Cookie': loginResponse.headers.get('set-cookie') || cookies
      }
    })
    
    const sessionData = await sessionResponse.json()
    console.log(`Session status: ${sessionResponse.status}`)
    console.log(`Session data:`, sessionData)
    
    if (sessionData?.user) {
      console.log(`✅ LOGIN SUCCESS! User: ${sessionData.user.email}`)
    } else {
      console.log(`❌ LOGIN FAILED - No user session found`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBrowserLogin().catch(console.error)