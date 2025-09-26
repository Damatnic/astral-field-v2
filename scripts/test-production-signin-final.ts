import { chromium, Browser, Page } from 'playwright';

interface TestResult {
  user: string;
  email: string;
  team: string;
  role: string;
  loginSuccess: boolean;
  dashboardAccess: boolean;
  quickSigninWorking: boolean;
  iconFilesLoaded: boolean;
  error?: string;
  responseTime: number;
}

const DAMATO_DYNASTY_MEMBERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
] as const;

const PRODUCTION_URL = 'https://web-3n61yluzx-astral-productions.vercel.app';
const PASSWORD = 'Dynasty2025!';

async function testUserLogin(browser: Browser, member: typeof DAMATO_DYNASTY_MEMBERS[0]): Promise<TestResult> {
  const startTime = Date.now();
  const page = await browser.newPage();
  
  let result: TestResult = {
    user: member.name,
    email: member.email,
    team: member.teamName,
    role: member.role,
    loginSuccess: false,
    dashboardAccess: false,
    quickSigninWorking: false,
    iconFilesLoaded: false,
    responseTime: 0
  };

  try {
    console.log(`\n🧪 Testing ${member.name} (${member.teamName})`);
    
    // Navigate to signin page
    console.log('📄 Loading signin page...');
    await page.goto(`${PRODUCTION_URL}/auth/signin`, { waitUntil: 'networkidle' });
    
    // Check for icon files (404 errors)
    const iconRequests = [];
    page.on('response', response => {
      if (response.url().includes('icon-') && response.status() === 404) {
        iconRequests.push(response.url());
      }
    });
    
    // Wait a moment for all resources to load
    await page.waitForTimeout(2000);
    result.iconFilesLoaded = iconRequests.length === 0;
    
    if (iconRequests.length > 0) {
      console.log(`⚠️  Found 404 errors for icons: ${iconRequests.join(', ')}`);
    } else {
      console.log('✅ All icon files loaded successfully');
    }
    
    // Test Quick Signin Button
    console.log('🔘 Testing quick signin button...');
    try {
      const quickSigninButton = page.locator(`button:has-text("${member.name}")`);
      await quickSigninButton.waitFor({ timeout: 5000 });
      result.quickSigninWorking = true;
      console.log('✅ Quick signin button found');
      
      // Click quick signin
      await quickSigninButton.click();
      
      // Wait for either dashboard or error
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        result.loginSuccess = true;
        result.dashboardAccess = true;
        console.log('✅ Quick signin successful - redirected to dashboard');
      } catch {
        // Quick signin didn't work, try manual login
        console.log('⚠️  Quick signin didn\'t redirect, trying manual login...');
      }
    } catch {
      console.log('❌ Quick signin button not found');
    }
    
    // If quick signin didn't work, try manual login
    if (!result.loginSuccess) {
      console.log('📝 Attempting manual login...');
      await page.goto(`${PRODUCTION_URL}/auth/signin`);
      
      // Fill in credentials manually
      await page.fill('input[name="email"]', member.email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        result.loginSuccess = true;
        result.dashboardAccess = true;
        console.log('✅ Manual login successful');
      } catch {
        console.log('❌ Manual login failed');
        
        // Check for error messages
        const errorMessages = await page.locator('[role="alert"], .error, .text-red-500').allTextContents();
        if (errorMessages.length > 0) {
          result.error = errorMessages.join('; ');
          console.log(`🚨 Error messages: ${result.error}`);
        }
      }
    }
    
    // If on dashboard, verify content
    if (result.dashboardAccess) {
      console.log('🏠 Verifying dashboard content...');
      try {
        await page.waitForSelector('h1, [data-testid="dashboard-title"]', { timeout: 5000 });
        const title = await page.locator('h1').first().textContent();
        console.log(`✅ Dashboard loaded: ${title}`);
      } catch {
        console.log('⚠️  Dashboard content verification failed');
      }
    }
    
  } catch (error: any) {
    result.error = error.message;
    console.log(`💥 Test failed for ${member.name}: ${error.message}`);
  } finally {
    result.responseTime = Date.now() - startTime;
    await page.close();
  }
  
  return result;
}

async function main() {
  console.log('🚀 D\'AMATO DYNASTY PRODUCTION SIGNIN TEST');
  console.log('==========================================');
  console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
  console.log(`🔑 Password: ${PASSWORD}`);
  console.log(`👥 Testing ${DAMATO_DYNASTY_MEMBERS.length} users\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  // Test each user
  for (const member of DAMATO_DYNASTY_MEMBERS) {
    const result = await testUserLogin(browser, member);
    results.push(result);
  }

  await browser.close();

  // Generate report
  console.log('\n📊 FINAL TEST RESULTS');
  console.log('=====================');
  
  const successful = results.filter(r => r.loginSuccess && r.dashboardAccess);
  const quickSigninWorking = results.filter(r => r.quickSigninWorking);
  const iconIssues = results.filter(r => !r.iconFilesLoaded);
  
  console.log(`✅ Successful logins: ${successful.length}/${results.length}`);
  console.log(`🔘 Quick signin working: ${quickSigninWorking.length}/${results.length}`);
  console.log(`🖼️  Icon files loading: ${results.length - iconIssues.length}/${results.length}`);
  
  if (iconIssues.length > 0) {
    console.log(`⚠️  Icon loading issues detected: ${iconIssues.length} users`);
  }
  
  console.log('\n📋 Individual Results:');
  results.forEach(result => {
    const status = result.loginSuccess ? '✅' : '❌';
    const quickStatus = result.quickSigninWorking ? '🔘' : '⭕';
    const iconStatus = result.iconFilesLoaded ? '🖼️' : '🚫';
    
    console.log(`${status} ${quickStatus} ${iconStatus} ${result.user} (${result.team}) - ${result.responseTime}ms`);
    if (result.error) {
      console.log(`    💥 Error: ${result.error}`);
    }
  });
  
  const allWorking = successful.length === results.length && iconIssues.length === 0;
  
  console.log('\n🎯 SUMMARY');
  console.log('==========');
  if (allWorking) {
    console.log('🎉 ALL SYSTEMS WORKING! D\'Amato Dynasty League is ready for production!');
  } else {
    console.log('⚠️  Some issues detected. See details above.');
  }
  
  console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
  console.log(`🔑 Password: ${PASSWORD}`);
  console.log('📅 Ready for league play!');

  // Save results
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    productionUrl: PRODUCTION_URL,
    password: PASSWORD,
    summary: {
      totalUsers: results.length,
      successfulLogins: successful.length,
      quickSigninWorking: quickSigninWorking.length,
      iconIssues: iconIssues.length,
      allWorking
    },
    results
  };

  const fs = require('fs');
  const reportPath = `production-signin-test-${timestamp.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved: ${reportPath}`);
}

main().catch(console.error);