const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://web-n2ykhu4p0-astral-productions.vercel.app';
const DEFAULT_PASSWORD = 'Dynasty2025!';

async function testLogin() {
  console.log('🚀 Testing production login...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to sign-in page
    console.log(`📍 Navigating to ${PRODUCTION_URL}/auth/signin`);
    await page.goto(`${PRODUCTION_URL}/auth/signin`, { waitUntil: 'networkidle2' });
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('📸 Screenshot saved as login-page.png');
    
    // Wait for form elements
    console.log('⏳ Waiting for login form...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Fill in credentials
    console.log('✍️ Filling in test credentials...');
    await page.type('input[type="email"], input[name="email"]', 'nicholas@damato-dynasty.com');
    await page.type('input[type="password"], input[name="password"]', DEFAULT_PASSWORD);
    
    // Submit form
    console.log('🔐 Submitting login form...');
    await page.click('button[type="submit"], [data-testid="signin-button"]');
    
    // Wait for navigation
    console.log('⏳ Waiting for authentication...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    // Check if we're logged in
    const currentUrl = page.url();
    console.log(`🌐 Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/home')) {
      console.log('✅ LOGIN SUCCESS! Redirected to authenticated area.');
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('❌ LOGIN FAILED! Still on sign-in page.');
      
      // Check for error messages
      const errorElements = await page.$$eval('[role="alert"], .error, .text-red-500, .text-destructive', 
        elements => elements.map(el => el.textContent.trim()));
      
      if (errorElements.length > 0) {
        console.log('❗ Error messages found:', errorElements);
      }
      
      // Take screenshot of error state
      await page.screenshot({ path: 'login-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as login-error.png');
    } else {
      console.log(`🤔 UNEXPECTED: Redirected to ${currentUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    
    // Take screenshot on error
    try {
      const page = browser.pages()[0] || await browser.newPage();
      await page.screenshot({ path: 'login-test-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as login-test-error.png');
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  } finally {
    await browser.close();
  }
}

testLogin().catch(console.error);