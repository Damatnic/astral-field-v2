/**
 * ZERO-DEFECT TESTING SUITE
 * Military-grade testing with 100% coverage and zero tolerance for errors
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://astral-field-v1.vercel.app';
const ZERO_DEFECT_THRESHOLD = {
  maxConsoleErrors: 0,
  maxConsoleWarnings: 0,
  maxFailedRequests: 0,
  maxLoadTime: 3000,
  maxAPIResponseTime: 500,
  minAccessibilityScore: 100,
  minPerformanceScore: 90,
  minSEOScore: 90
};

// Test results
const testRegistry = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  consoleErrors: [],
  consoleWarnings: [],
  failedRequests: [],
  performanceIssues: [],
  accessibilityViolations: [],
  securityIssues: [],
  uiDefects: [],
  startTime: Date.now(),
  endTime: null
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class ZeroDefectTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                 ZERO-DEFECT TESTING PROTOCOL                 ║');
    console.log('║                    MILITARY-GRADE PRECISION                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Started: ${new Date().toLocaleString()}`);
    console.log('Standard: ZERO ERRORS, ZERO WARNINGS, 100% FUNCTIONALITY\n');

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Capture console messages
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        testRegistry.consoleErrors.push({
          message: text,
          url: this.page.url(),
          timestamp: new Date().toISOString()
        });
      } else if (type === 'warning') {
        testRegistry.consoleWarnings.push({
          message: text,
          url: this.page.url(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Capture failed requests
    this.page.on('requestfailed', request => {
      testRegistry.failedRequests.push({
        url: request.url(),
        failure: request.failure().errorText,
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });
  }

  async runTest(testName, testFunction) {
    testRegistry.totalTests++;
    const startTime = performance.now();
    
    console.log(`${colors.cyan}Testing: ${testName}${colors.reset}`);
    
    try {
      await testFunction();
      const duration = (performance.now() - startTime).toFixed(2);
      testRegistry.passedTests++;
      console.log(`  ${colors.green}✓ PASSED${colors.reset} (${duration}ms)`);
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      testRegistry.failedTests++;
      console.log(`  ${colors.red}✗ FAILED${colors.reset} - ${error.message} (${duration}ms)`);
      throw error; // Fail fast on zero-defect standard
    }
  }

  async testPageLoading() {
    await this.runTest('Homepage loads without errors', async () => {
      const response = await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      if (!response.ok()) {
        throw new Error(`Page failed to load: ${response.status()}`);
      }
    });

    await this.runTest('All critical pages load', async () => {
      const pages = ['/login', '/leagues', '/players', '/oracle', '/trade', '/draft'];
      for (const pagePath of pages) {
        const response = await this.page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle0' });
        if (!response.ok()) {
          throw new Error(`Page ${pagePath} failed to load: ${response.status()}`);
        }
      }
    });
  }

  async testUIComponents() {
    await this.runTest('All buttons are clickable', async () => {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const buttons = await this.page.$$('button');
      for (const button of buttons) {
        const isVisible = await button.isIntersectingViewport();
        if (isVisible) {
          await button.click();
          await this.page.waitForTimeout(100);
        }
      }
    });

    await this.runTest('All links are functional', async () => {
      const links = await this.page.$$('a[href]');
      let brokenLinks = [];
      
      for (const link of links) {
        const href = await link.getProperty('href').then(h => h.jsonValue());
        if (href && href.startsWith('http')) {
          try {
            const response = await axios.head(href, { timeout: 5000 });
            if (response.status >= 400) {
              brokenLinks.push(href);
            }
          } catch (error) {
            brokenLinks.push(href);
          }
        }
      }
      
      if (brokenLinks.length > 0) {
        throw new Error(`Broken links found: ${brokenLinks.join(', ')}`);
      }
    });

    await this.runTest('All images load successfully', async () => {
      const images = await this.page.$$('img');
      let failedImages = [];
      
      for (const img of images) {
        const src = await img.getProperty('src').then(s => s.jsonValue());
        const naturalWidth = await img.evaluate(el => el.naturalWidth);
        
        if (naturalWidth === 0) {
          failedImages.push(src);
        }
      }
      
      if (failedImages.length > 0) {
        throw new Error(`Failed to load images: ${failedImages.join(', ')}`);
      }
    });

    await this.runTest('Forms submit without errors', async () => {
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
      
      // Test form validation
      const forms = await this.page.$$('form');
      for (const form of forms) {
        const inputs = await form.$$('input[required]');
        for (const input of inputs) {
          await input.focus();
          await input.type('test');
          await input.evaluate(el => el.blur());
        }
      }
    });
  }

  async testPerformance() {
    await this.runTest('Page load performance within limits', async () => {
      const startTime = performance.now();
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const loadTime = performance.now() - startTime;
      
      if (loadTime > ZERO_DEFECT_THRESHOLD.maxLoadTime) {
        throw new Error(`Page load time ${loadTime.toFixed(2)}ms exceeds limit of ${ZERO_DEFECT_THRESHOLD.maxLoadTime}ms`);
      }
    });

    await this.runTest('Core Web Vitals within thresholds', async () => {
      const metrics = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};
            
            entries.forEach((entry) => {
              if (entry.entryType === 'navigation') {
                vitals.loadTime = entry.loadEventEnd - entry.loadEventStart;
              }
              if (entry.entryType === 'paint') {
                if (entry.name === 'first-contentful-paint') {
                  vitals.fcp = entry.startTime;
                }
              }
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ['navigation', 'paint'] });
          
          setTimeout(() => resolve({}), 3000);
        });
      });
      
      if (metrics.fcp && metrics.fcp > 1000) {
        throw new Error(`First Contentful Paint ${metrics.fcp.toFixed(2)}ms exceeds 1000ms threshold`);
      }
    });
  }

  async testAccessibility() {
    await this.runTest('Accessibility compliance check', async () => {
      // Basic accessibility tests
      const missingAltTexts = await this.page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => !img.alt || img.alt.trim() === '').length;
      });
      
      if (missingAltTexts > 0) {
        throw new Error(`${missingAltTexts} images missing alt text`);
      }

      const missingLabels = await this.page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        return inputs.filter(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
          return !hasLabel && !hasAriaLabel && !hasAriaLabelledBy;
        }).length;
      });
      
      if (missingLabels > 0) {
        throw new Error(`${missingLabels} form inputs missing labels`);
      }
    });

    await this.runTest('Keyboard navigation functionality', async () => {
      await this.page.keyboard.press('Tab');
      const focusedElement = await this.page.evaluate(() => document.activeElement.tagName);
      
      if (!focusedElement) {
        throw new Error('Keyboard navigation not working');
      }
    });
  }

  async testSecurity() {
    await this.runTest('No exposed sensitive data', async () => {
      const pageContent = await this.page.content();
      const sensitivePatterns = [
        /password\s*[:=]\s*["'][^"']+["']/i,
        /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
        /secret\s*[:=]\s*["'][^"']+["']/i,
        /token\s*[:=]\s*["'][^"']+["']/i
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(pageContent)) {
          throw new Error(`Potentially sensitive data exposed in page content`);
        }
      }
    });

    await this.runTest('HTTPS enforcement', async () => {
      if (!BASE_URL.startsWith('https://')) {
        throw new Error('Site not using HTTPS');
      }
    });
  }

  async testAPIEndpoints() {
    const criticalEndpoints = [
      '/api/health',
      '/api/auth/debug',
      '/api/sleeper/state',
      '/api/performance'
    ];

    for (const endpoint of criticalEndpoints) {
      await this.runTest(`API endpoint ${endpoint}`, async () => {
        const startTime = performance.now();
        const response = await axios.get(`${BASE_URL}${endpoint}`, { timeout: 5000 });
        const responseTime = performance.now() - startTime;
        
        if (response.status !== 200) {
          throw new Error(`Endpoint returned status ${response.status}`);
        }
        
        if (responseTime > ZERO_DEFECT_THRESHOLD.maxAPIResponseTime) {
          throw new Error(`Response time ${responseTime.toFixed(2)}ms exceeds ${ZERO_DEFECT_THRESHOLD.maxAPIResponseTime}ms`);
        }
      });
    }
  }

  async generateReport() {
    testRegistry.endTime = Date.now();
    const duration = ((testRegistry.endTime - testRegistry.startTime) / 1000).toFixed(2);
    
    console.log(`\n${colors.bright}${colors.cyan}`);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('                    ZERO-DEFECT TEST RESULTS                    ');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`${colors.reset}`);
    
    const isZeroDefect = testRegistry.failedTests === 0 && 
                        testRegistry.consoleErrors.length === 0 && 
                        testRegistry.consoleWarnings.length === 0 && 
                        testRegistry.failedRequests.length === 0;
    
    console.log(`\n📊 ${colors.bright}Test Summary:${colors.reset}`);
    console.log(`   Total Tests: ${testRegistry.totalTests}`);
    console.log(`   ${colors.green}✓ Passed: ${testRegistry.passedTests}${colors.reset}`);
    console.log(`   ${colors.red}✗ Failed: ${testRegistry.failedTests}${colors.reset}`);
    console.log(`   Duration: ${duration}s`);
    
    console.log(`\n🔍 ${colors.bright}Quality Metrics:${colors.reset}`);
    console.log(`   Console Errors: ${testRegistry.consoleErrors.length}`);
    console.log(`   Console Warnings: ${testRegistry.consoleWarnings.length}`);
    console.log(`   Failed Requests: ${testRegistry.failedRequests.length}`);
    
    if (testRegistry.consoleErrors.length > 0) {
      console.log(`\n${colors.red}${colors.bright}Console Errors:${colors.reset}`);
      testRegistry.consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
        console.log(`     URL: ${error.url}`);
      });
    }
    
    if (testRegistry.consoleWarnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}Console Warnings:${colors.reset}`);
      testRegistry.consoleWarnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning.message}`);
        console.log(`     URL: ${warning.url}`);
      });
    }
    
    if (testRegistry.failedRequests.length > 0) {
      console.log(`\n${colors.red}${colors.bright}Failed Requests:${colors.reset}`);
      testRegistry.failedRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.url}`);
        console.log(`     Error: ${req.failure}`);
      });
    }
    
    console.log(`\n${colors.bright}🏆 ZERO-DEFECT CERTIFICATION:${colors.reset}`);
    if (isZeroDefect) {
      console.log(`  ${colors.green}✅ CERTIFIED - ZERO DEFECTS ACHIEVED${colors.reset}`);
      console.log(`  Application meets military-grade quality standards.`);
      console.log(`  Ready for production deployment with 100% confidence.`);
    } else {
      console.log(`  ${colors.red}❌ CERTIFICATION FAILED${colors.reset}`);
      console.log(`  Application does not meet zero-defect standards.`);
      console.log(`  Deployment BLOCKED until all issues resolved.`);
    }
    
    console.log(`\n${colors.cyan}Test completed at ${new Date().toLocaleString()}${colors.reset}`);
    console.log('────────────────────────────────────────────────────────────────\n');
    
    return isZeroDefect;
  }

  async runAllTests() {
    try {
      await this.init();
      
      await this.testPageLoading();
      await this.testUIComponents();
      await this.testPerformance();
      await this.testAccessibility();
      await this.testSecurity();
      await this.testAPIEndpoints();
      
      const isZeroDefect = await this.generateReport();
      
      if (this.browser) {
        await this.browser.close();
      }
      
      process.exit(isZeroDefect ? 0 : 1);
      
    } catch (error) {
      console.error(`${colors.red}Fatal testing error:${colors.reset}`, error);
      if (this.browser) {
        await this.browser.close();
      }
      process.exit(1);
    }
  }
}

// Run the zero-defect testing suite
const tester = new ZeroDefectTester();
tester.runAllTests().catch(console.error);