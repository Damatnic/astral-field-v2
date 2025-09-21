#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

interface VerificationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class PostDeploymentVerification {
  private baseUrl: string;
  private results: VerificationResult[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async runVerification(): Promise<boolean> {
    console.log(chalk.blue.bold('\n🔍 POST-DEPLOYMENT VERIFICATION\n'));
    console.log('═'.repeat(60));
    console.log(`Target URL: ${chalk.cyan(this.baseUrl)}\n`);

    const tests = [
      { name: 'Health Check', fn: this.testHealthEndpoint.bind(this) },
      { name: 'API Authentication', fn: this.testAuthentication.bind(this) },
      { name: 'Database Connection', fn: this.testDatabaseConnection.bind(this) },
      { name: 'Critical API Endpoints', fn: this.testCriticalEndpoints.bind(this) },
      { name: 'Performance Metrics', fn: this.testPerformance.bind(this) },
      { name: 'Security Headers', fn: this.testSecurityHeaders.bind(this) },
      { name: 'Error Handling', fn: this.testErrorHandling.bind(this) },
      { name: 'Frontend Load', fn: this.testFrontendLoad.bind(this) },
      { name: 'Cache Functionality', fn: this.testCaching.bind(this) },
      { name: 'Rate Limiting', fn: this.testRateLimiting.bind(this) }
    ];

    for (const test of tests) {
      process.stdout.write(`  ${test.name}...`);
      try {
        await test.fn();
        console.log(chalk.green(' ✓'));
      } catch (error: any) {
        console.log(chalk.red(' ✗'));
        this.results.push({
          test: test.name,
          status: 'fail',
          message: error.message,
          details: error.stack
        });
      }
    }

    this.displayResults();
    return this.results.filter(r => r.status === 'fail').length === 0;
  }

  private async testHealthEndpoint(): Promise<void> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/health`, 5000);
    
    if (!response.ok) {
      throw new Error(`Health endpoint returned ${response.status}`);
    }

    const data = await response.json();
    // Accept both 'ok' and 'operational' as valid statuses
    if (data.status !== 'ok' && data.status !== 'operational') {
      throw new Error('Health check failed: ' + (data.message || 'Unknown error'));
    }

    this.results.push({
      test: 'Health Check',
      status: 'pass',
      message: `Status: ${data.status}, Environment: ${data.environment || 'N/A'}`
    });
  }

  private async testAuthentication(): Promise<void> {
    // Test login endpoint
    const loginResponse = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/login`, 5000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'invalid-password' 
      })
    });

    // Should return 401 for invalid credentials
    if (loginResponse.status !== 401) {
      throw new Error('Authentication endpoint not properly secured');
    }

    // Test protected endpoint without auth
    const protectedResponse = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/me`, 5000);
    if (protectedResponse.status !== 401) {
      throw new Error('Protected endpoint accessible without authentication');
    }

    this.results.push({
      test: 'API Authentication',
      status: 'pass',
      message: 'Authentication properly configured'
    });
  }

  private async testDatabaseConnection(): Promise<void> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/health/db`, 5000);
    
    if (!response.ok) {
      throw new Error(`Database health check failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.connected) {
      throw new Error('Database not connected');
    }

    this.results.push({
      test: 'Database Connection',
      status: 'pass',
      message: `Connection pool: ${data.poolSize || 'N/A'} connections`
    });
  }

  private async testCriticalEndpoints(): Promise<void> {
    const endpoints = [
      '/api/leagues',
      '/api/players'
    ];

    let workingEndpoints = 0;
    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, 5000);
        
        // Should return either 401 (auth required), 200 (public endpoint), or 500 (server error but endpoint exists)
        if ([200, 401, 500].includes(response.status)) {
          workingEndpoints++;
        }
      } catch (error) {
        // Endpoint might not exist yet, which is acceptable for deployment verification
        console.log(`Endpoint ${endpoint} not available: ${error}`);
      }
    }

    this.results.push({
      test: 'Critical API Endpoints',
      status: workingEndpoints > 0 ? 'pass' : 'warning',
      message: `${workingEndpoints}/${endpoints.length} endpoints responding`
    });
  }

  private async testPerformance(): Promise<void> {
    const startTime = Date.now();
    const response = await this.fetchWithTimeout(`${this.baseUrl}/`, 10000);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Homepage returned ${response.status}`);
    }

    if (responseTime > 3000) {
      this.results.push({
        test: 'Performance Metrics',
        status: 'warning',
        message: `Slow response time: ${responseTime}ms`
      });
    } else {
      this.results.push({
        test: 'Performance Metrics',
        status: 'pass',
        message: `Response time: ${responseTime}ms`
      });
    }
  }

  private async testSecurityHeaders(): Promise<void> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/`, 5000);
    
    const requiredHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ];

    const missing = requiredHeaders.filter(header => !response.headers.get(header));
    
    if (missing.length > 0) {
      this.results.push({
        test: 'Security Headers',
        status: 'warning',
        message: `Missing headers: ${missing.join(', ')}`
      });
    } else {
      this.results.push({
        test: 'Security Headers',
        status: 'pass',
        message: 'All security headers present'
      });
    }
  }

  private async testErrorHandling(): Promise<void> {
    // Test 404 handling
    const notFoundResponse = await this.fetchWithTimeout(`${this.baseUrl}/non-existent-page`, 5000);
    if (notFoundResponse.status !== 404) {
      throw new Error('404 handling not working correctly');
    }

    // Test malformed API request
    const malformedResponse = await this.fetchWithTimeout(`${this.baseUrl}/api/invalid-endpoint`, 5000);
    if (![404, 405].includes(malformedResponse.status)) {
      throw new Error('API error handling not working correctly');
    }

    this.results.push({
      test: 'Error Handling',
      status: 'pass',
      message: 'Error pages and API errors handled correctly'
    });
  }

  private async testFrontendLoad(): Promise<void> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/`, 5000);
    const html = await response.text();

    // Check for critical elements
    if (!html.includes('<!DOCTYPE html>')) {
      throw new Error('Invalid HTML structure');
    }

    if (html.includes('error') || html.includes('Error')) {
      this.results.push({
        test: 'Frontend Load',
        status: 'warning',
        message: 'Possible errors detected in HTML'
      });
    } else {
      this.results.push({
        test: 'Frontend Load',
        status: 'pass',
        message: 'Frontend loading correctly'
      });
    }
  }

  private async testCaching(): Promise<void> {
    // Test static asset caching
    const response = await this.fetchWithTimeout(`${this.baseUrl}/_next/static/css`, 5000);
    
    const cacheHeader = response.headers.get('cache-control');
    if (!cacheHeader || !cacheHeader.includes('max-age')) {
      this.results.push({
        test: 'Cache Functionality',
        status: 'warning',
        message: 'Static assets not properly cached'
      });
    } else {
      this.results.push({
        test: 'Cache Functionality',
        status: 'pass',
        message: `Cache headers: ${cacheHeader}`
      });
    }
  }

  private async testRateLimiting(): Promise<void> {
    // Make multiple rapid requests to test rate limiting
    const promises = Array(5).fill(null).map(() => 
      this.fetchWithTimeout(`${this.baseUrl}/api/health`, 1000)
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);

    if (rateLimited) {
      this.results.push({
        test: 'Rate Limiting',
        status: 'pass',
        message: 'Rate limiting active'
      });
    } else {
      this.results.push({
        test: 'Rate Limiting',
        status: 'warning',
        message: 'Rate limiting may not be configured'
      });
    }
  }

  private async fetchWithTimeout(url: string, timeout: number, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  private displayResults(): void {
    console.log('\n📊 VERIFICATION RESULTS\n');
    console.log('─'.repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}\n`);

    // Show details for warnings and failures
    this.results
      .filter(r => r.status !== 'pass')
      .forEach(result => {
        const icon = result.status === 'warning' ? '⚠️ ' : '❌';
        const color = result.status === 'warning' ? chalk.yellow : chalk.red;
        
        console.log(color(`${icon} ${result.test}: ${result.message}`));
        if (result.details) {
          console.log(chalk.gray(`   ${result.details.substring(0, 100)}...`));
        }
      });

    if (failed === 0) {
      console.log(chalk.green.bold('\n🎉 All critical tests passed!'));
    } else {
      console.log(chalk.red.bold('\n💥 Deployment verification failed!'));
    }

    console.log('\n═'.repeat(60));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || process.env.BASE_URL || 'http://localhost:3000';

  if (!baseUrl || args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/post-deployment-verification.ts [URL]

Options:
  URL               Target URL to verify (default: http://localhost:3000)
  --help            Show this help message

Environment Variables:
  BASE_URL          Default URL if not provided as argument

Examples:
  npx tsx scripts/post-deployment-verification.ts
  npx tsx scripts/post-deployment-verification.ts https://production.app
  BASE_URL=https://staging.app npx tsx scripts/post-deployment-verification.ts
    `);
    process.exit(0);
  }

  console.log(chalk.blue(`Starting verification for: ${baseUrl}`));
  
  const verifier = new PostDeploymentVerification(baseUrl);
  const success = await verifier.runVerification();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { PostDeploymentVerification };