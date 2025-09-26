#!/usr/bin/env tsx
/**
 * Production Authentication Flow Test
 * Tests actual login functionality against the production deployment
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const PRODUCTION_URL = 'https://web-7ts4brd6b-astral-productions.vercel.app';
const TEST_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", password: "Dynasty2025!" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", password: "Dynasty2025!" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", password: "Dynasty2025!" }
];

interface AuthTestResult {
  user: string;
  email: string;
  success: boolean;
  status: number;
  message: string;
  duration: number;
  error?: string;
}

class ProductionAuthTester {
  private results: AuthTestResult[] = [];

  async testUserAuthentication(user: { name: string; email: string; password: string }): Promise<AuthTestResult> {
    console.log(`🔐 Testing authentication for ${user.name}...`);
    
    const startTime = Date.now();
    
    try {
      // Get CSRF token first
      const signinResponse = await fetch(`${PRODUCTION_URL}/auth/signin`);
      const signinHtml = await signinResponse.text();
      
      // Extract CSRF token (if present)
      const csrfMatch = signinHtml.match(/name="csrfToken" value="([^"]+)"/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';
      
      // Extract cookies
      const cookies = signinResponse.headers.get('set-cookie') || '';
      
      // Prepare login request
      const loginData = new URLSearchParams({
        email: user.email,
        password: user.password,
        csrfToken,
        redirect: 'false',
        json: 'true'
      });

      const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/signin/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: loginData.toString(),
        redirect: 'manual'
      });

      const duration = Date.now() - startTime;
      const responseText = await loginResponse.text();
      
      // Check for successful authentication
      const isSuccess = loginResponse.status === 200 && !responseText.includes('error');
      
      return {
        user: user.name,
        email: user.email,
        success: isSuccess,
        status: loginResponse.status,
        message: isSuccess ? 'Authentication successful' : 'Authentication failed',
        duration,
        error: isSuccess ? undefined : responseText
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        user: user.name,
        email: user.email,
        success: false,
        status: 0,
        message: 'Network error',
        duration,
        error: error.message
      };
    }
  }

  async testAllUsers(): Promise<void> {
    console.log('🚀 Starting Production Authentication Flow Tests');
    console.log(`🎯 Target: ${PRODUCTION_URL}`);
    console.log(`👥 Testing ${TEST_USERS.length} users from D'Amato Dynasty League\n`);

    for (const user of TEST_USERS) {
      const result = await this.testUserAuthentication(user);
      this.results.push(result);

      const emoji = result.success ? '✅' : '❌';
      console.log(`${emoji} ${result.user}: ${result.message} (${result.duration}ms)`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error.substring(0, 100)}...`);
      }
    }
  }

  generateReport(): void {
    console.log('\n📊 Production Authentication Test Report');
    console.log('=' * 50);

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`\n✅ Successful logins: ${successful.length}/${this.results.length}`);
    console.log(`❌ Failed logins: ${failed.length}/${this.results.length}`);

    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      console.log(`⚡ Average login time: ${Math.round(avgDuration)}ms`);
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.success ? 'PASS' : 'FAIL';
      console.log(`   ${result.user} (${result.email}): ${status} - ${result.duration}ms`);
    });

    if (failed.length > 0) {
      console.log('\n❌ Failed Authentication Details:');
      failed.forEach(result => {
        console.log(`   ${result.user}: ${result.message}`);
        if (result.error) {
          console.log(`     Error: ${result.error.substring(0, 200)}`);
        }
      });
    }

    const overallSuccess = failed.length === 0;
    console.log(`\n🎯 Overall Status: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    if (overallSuccess) {
      console.log('🎉 Production authentication system is fully operational!');
      console.log('👥 All D\'Amato Dynasty League members can successfully log in.');
    } else {
      console.log('⚠️ Some authentication issues detected. Please review the errors above.');
    }
  }

  async runFullTest(): Promise<boolean> {
    try {
      await this.testAllUsers();
      this.generateReport();
      
      const allPassed = this.results.every(r => r.success);
      return allPassed;
      
    } catch (error) {
      console.error('💥 Production Auth Test Error:', error);
      return false;
    }
  }
}

// Run the authentication test
if (require.main === module) {
  const tester = new ProductionAuthTester();
  
  tester.runFullTest()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test System Failure:', error);
      process.exit(1);
    });
}

export { ProductionAuthTester };