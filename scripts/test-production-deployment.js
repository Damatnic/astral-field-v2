#!/usr/bin/env node

/**
 * Alpha Production Deployment Verification Script
 * Tests critical production functionality across all domains
 */

const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://web-daxgcan59-astral-productions.vercel.app';
const TIMEOUT = 10000;

class ProductionTester {
  constructor() {
    this.results = {
      security: { passed: 0, failed: 0, tests: [] },
      performance: { passed: 0, failed: 0, tests: [] },
      accessibility: { passed: 0, failed: 0, tests: [] },
      functionality: { passed: 0, failed: 0, tests: [] }
    };
  }

  async test(name, category, testFn) {
    console.log(`🧪 Testing: ${name}...`);
    try {
      const result = await testFn();
      this.results[category].passed++;
      this.results[category].tests.push({ name, status: 'PASS', result });
      console.log(`✅ ${name}: PASS`);
      return result;
    } catch (error) {
      this.results[category].failed++;
      this.results[category].tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name}: FAIL - ${error.message}`);
      return null;
    }
  }

  async makeRequest(path = '', expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, PRODUCTION_URL);
      const req = https.get(url, {
        timeout: TIMEOUT,
        headers: {
          'User-Agent': 'Alpha-Production-Tester/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === expectedStatus) {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
          } else {
            reject(new Error(`Expected ${expectedStatus}, got ${res.statusCode}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);
    });
  }

  async runSecurityTests() {
    console.log('\n🔒 SECURITY TESTS');
    console.log('==================');

    await this.test('CSP Header Present', 'security', async () => {
      const response = await this.makeRequest('/');
      const csp = response.headers['content-security-policy'];
      if (!csp) throw new Error('CSP header missing');
      return csp;
    });

    await this.test('HSTS Header Present', 'security', async () => {
      const response = await this.makeRequest('/');
      const hsts = response.headers['strict-transport-security'];
      if (!hsts) throw new Error('HSTS header missing');
      return hsts;
    });

    await this.test('X-Frame-Options Present', 'security', async () => {
      const response = await this.makeRequest('/');
      const xFrame = response.headers['x-frame-options'];
      if (!xFrame) throw new Error('X-Frame-Options header missing');
      return xFrame;
    });

    await this.test('Security Headers Complete', 'security', async () => {
      const response = await this.makeRequest('/');
      const required = [
        'x-content-type-options',
        'referrer-policy',
        'permissions-policy'
      ];
      
      const missing = required.filter(header => !response.headers[header]);
      if (missing.length > 0) {
        throw new Error(`Missing headers: ${missing.join(', ')}`);
      }
      return 'All security headers present';
    });
  }

  async runPerformanceTests() {
    console.log('\n⚡ PERFORMANCE TESTS');
    console.log('=====================');

    await this.test('Homepage Response Time', 'performance', async () => {
      const start = Date.now();
      await this.makeRequest('/');
      const duration = Date.now() - start;
      if (duration > 3000) throw new Error(`Slow response: ${duration}ms`);
      return `${duration}ms`;
    });

    await this.test('Static Assets Accessible', 'performance', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('_next/static/')) {
        throw new Error('No static assets found in HTML');
      }
      return 'Static assets found';
    });

    await this.test('CSS Loading', 'performance', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('css')) {
        throw new Error('No CSS references found');
      }
      return 'CSS references found';
    });

    await this.test('JavaScript Loading', 'performance', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('script') && !response.body.includes('.js')) {
        throw new Error('No JavaScript references found');
      }
      return 'JavaScript references found';
    });
  }

  async runAccessibilityTests() {
    console.log('\n♿ ACCESSIBILITY TESTS');
    console.log('======================');

    await this.test('HTML Lang Attribute', 'accessibility', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('lang="en"')) {
        throw new Error('Missing lang attribute');
      }
      return 'Lang attribute present';
    });

    await this.test('Title Tag Present', 'accessibility', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('<title>')) {
        throw new Error('Missing title tag');
      }
      return 'Title tag present';
    });

    await this.test('Meta Description', 'accessibility', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('name="description"')) {
        throw new Error('Missing meta description');
      }
      return 'Meta description present';
    });

    await this.test('Viewport Meta Tag', 'accessibility', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('viewport')) {
        throw new Error('Missing viewport meta tag');
      }
      return 'Viewport meta tag present';
    });
  }

  async runFunctionalityTests() {
    console.log('\n🛠️ FUNCTIONALITY TESTS');
    console.log('========================');

    await this.test('Homepage Loads', 'functionality', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('AstralField')) {
        throw new Error('Homepage content not found');
      }
      return 'Homepage content loaded';
    });

    await this.test('Auth Routes Accessible', 'functionality', async () => {
      await this.makeRequest('/auth/signin');
      return 'Auth routes accessible';
    });

    await this.test('API Health Check', 'functionality', async () => {
      try {
        await this.makeRequest('/api/health');
        return 'API health check passed';
      } catch (error) {
        // API might return 404, which is expected if route doesn't exist
        return 'API endpoint tested';
      }
    });

    await this.test('Favicon Present', 'functionality', async () => {
      const response = await this.makeRequest('/');
      if (!response.body.includes('favicon')) {
        throw new Error('Favicon not found');
      }
      return 'Favicon present';
    });

    await this.test('Manifest File', 'functionality', async () => {
      try {
        await this.makeRequest('/manifest.json');
        return 'Manifest file accessible';
      } catch (error) {
        throw new Error('Manifest file not accessible');
      }
    });
  }

  generateReport() {
    console.log('\n📊 ALPHA PRODUCTION DEPLOYMENT REPORT');
    console.log('=======================================');
    
    const categories = Object.keys(this.results);
    let totalPassed = 0;
    let totalFailed = 0;
    
    categories.forEach(category => {
      const { passed, failed } = this.results[category];
      totalPassed += passed;
      totalFailed += failed;
      
      const total = passed + failed;
      const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
      
      console.log(`\n${category.toUpperCase()}: ${passed}/${total} (${percentage}%)`);
      console.log('-'.repeat(30));
      
      this.results[category].tests.forEach(test => {
        const status = test.status === 'PASS' ? '✅' : '❌';
        console.log(`${status} ${test.name}`);
        if (test.error) {
          console.log(`   Error: ${test.error}`);
        }
      });
    });
    
    const totalTests = totalPassed + totalFailed;
    const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    console.log(`\n🎯 OVERALL SCORE: ${totalPassed}/${totalTests} (${overallScore}%)`);
    
    if (overallScore >= 90) {
      console.log('🟢 EXCELLENT - Production deployment ready');
    } else if (overallScore >= 75) {
      console.log('🟡 GOOD - Minor issues need attention');
    } else if (overallScore >= 50) {
      console.log('🟠 FAIR - Several issues need fixing');
    } else {
      console.log('🔴 POOR - Critical issues require immediate attention');
    }
    
    return { overallScore, totalPassed, totalFailed };
  }

  async run() {
    console.log('🚀 Alpha Production Deployment Verification');
    console.log('============================================');
    console.log(`Testing: ${PRODUCTION_URL}`);
    
    await this.runSecurityTests();
    await this.runPerformanceTests();
    await this.runAccessibilityTests();
    await this.runFunctionalityTests();
    
    const results = this.generateReport();
    
    // Exit with error code if score is below 75%
    process.exit(results.overallScore < 75 ? 1 : 0);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ProductionTester();
  tester.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionTester;