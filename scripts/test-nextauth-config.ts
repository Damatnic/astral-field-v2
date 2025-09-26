// Test NextAuth configuration and environment
import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://web-3n61yluzx-astral-productions.vercel.app';

async function testNextAuthConfig() {
  console.log('🔍 Testing NextAuth Configuration');
  console.log('================================');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test 1: Check if NextAuth API endpoint responds
    console.log('\n1️⃣ Testing NextAuth API endpoints...');
    
    const response = await page.goto(`${PRODUCTION_URL}/api/auth/signin`);
    console.log(`   Signin page status: ${response?.status()}`);
    
    if (response?.status() === 200) {
      const content = await page.content();
      console.log(`   Page length: ${content.length} characters`);
      
      // Check for NextAuth elements
      const hasForm = content.includes('<form');
      const hasCSRF = content.includes('csrfToken');
      const hasInput = content.includes('input');
      
      console.log(`   ✅ Has form element: ${hasForm}`);
      console.log(`   ✅ Has CSRF token: ${hasCSRF}`);
      console.log(`   ✅ Has input fields: ${hasInput}`);
      
      if (!hasForm || !hasCSRF) {
        console.log('   ⚠️  NextAuth signin page missing required elements');
      }
    }
    
    // Test 2: Check for environment configuration issues
    console.log('\n2️⃣ Testing environment configuration...');
    
    const sessionResponse = await page.goto(`${PRODUCTION_URL}/api/auth/session`);
    console.log(`   Session endpoint status: ${sessionResponse?.status()}`);
    
    if (sessionResponse?.status() === 200) {
      const sessionContent = await page.textContent('body');
      console.log(`   Session response: ${sessionContent}`);
    }
    
    // Test 3: Check for authentication with valid credentials
    console.log('\n3️⃣ Testing authentication with CSRF...');
    
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    
    // Get CSRF token if available
    const csrfInput = page.locator('input[name="csrfToken"]');
    let csrfToken = '';
    try {
      csrfToken = await csrfInput.inputValue();
      console.log(`   ✅ CSRF token found: ${csrfToken.substring(0, 20)}...`);
    } catch {
      console.log('   ❌ CSRF token not found');
    }
    
    // Test form submission
    await page.fill('input[name="email"]', 'nicholas@damato-dynasty.com');
    await page.fill('input[name="password"]', 'Dynasty2025!');
    
    // Intercept the signin request
    let signinRequest: any = null;
    let signinResponse: any = null;
    
    page.on('request', request => {
      if (request.url().includes('/api/auth/signin/credentials')) {
        signinRequest = {
          url: request.url(),
          method: request.method(),
          headers: Object.fromEntries(Object.entries(request.headers())),
          postData: request.postData()
        };
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/auth/signin/credentials')) {
        signinResponse = {
          status: response.status(),
          statusText: response.statusText(),
          headers: Object.fromEntries(Object.entries(response.headers()))
        };
      }
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    if (signinRequest) {
      console.log('\n   📤 Signin Request:');
      console.log(`      URL: ${signinRequest.url}`);
      console.log(`      Method: ${signinRequest.method}`);
      console.log(`      Headers: ${JSON.stringify(signinRequest.headers, null, 6)}`);
      if (signinRequest.postData) {
        console.log(`      Post Data: ${signinRequest.postData}`);
      }
    }
    
    if (signinResponse) {
      console.log('\n   📥 Signin Response:');
      console.log(`      Status: ${signinResponse.status} ${signinResponse.statusText}`);
      console.log(`      Headers: ${JSON.stringify(signinResponse.headers, null, 6)}`);
    }
    
    // Check for redirect or error
    const currentUrl = page.url();
    console.log(`\n   🔗 Final URL: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ Successfully redirected to dashboard!');
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('   ❌ Still on signin page - authentication failed');
      
      // Check for error messages
      const errorElements = await page.locator('[role="alert"], .error, .text-red-500, .text-red-400').allTextContents();
      if (errorElements.length > 0) {
        console.log(`   🚨 Error messages: ${errorElements.join(', ')}`);
      }
    }
    
  } catch (error: any) {
    console.log(`💥 Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testNextAuthConfig().catch(console.error);