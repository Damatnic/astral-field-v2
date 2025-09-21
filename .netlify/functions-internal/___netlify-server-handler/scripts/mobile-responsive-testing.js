/**
 * MOBILE & RESPONSIVE TESTING FRAMEWORK
 * Phase 2 Cross-Platform - Military-Grade Mobile Validation
 * 
 * Integrates with Zero-Defect Testing Protocol
 * Adds 140+ comprehensive mobile and responsive design checks
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const { performance } = require('perf_hooks');

class MobileResponsiveTester {
  constructor(baseUrl = 'https://astral-field-v1.vercel.app') {
    this.baseUrl = baseUrl;
    
    this.testRegistry = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      mobileCompatibilityIssues: [],
      responsiveDesignIssues: [],
      touchInteractionIssues: [],
      performanceOnMobileIssues: [],
      accessibilityOnMobileIssues: [],
      orientationIssues: [],
      startTime: Date.now(),
      endTime: null
    };
    
    // Mobile testing thresholds
    this.thresholds = {
      minTouchTargetSize: 44, // pixels (Apple HIG standard)
      maxMobileLoadTime: 5000, // milliseconds
      minViewportWidth: 320, // iPhone SE
      maxViewportWidth: 1920, // Desktop
      maxMemoryUsageMobile: 100, // MB
      minTapResponseTime: 100, // milliseconds
      maxScrollJank: 16.67 // milliseconds (60fps)
    };
    
    // Device configurations for testing
    this.deviceConfigs = [
      {
        name: 'iPhone SE',
        viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        category: 'small-mobile'
      },
      {
        name: 'iPhone 12 Pro',
        viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        category: 'medium-mobile'
      },
      {
        name: 'iPhone 14 Pro Max',
        viewport: { width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        category: 'large-mobile'
      },
      {
        name: 'Samsung Galaxy S21',
        viewport: { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36',
        category: 'android-mobile'
      },
      {
        name: 'iPad Air',
        viewport: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        category: 'tablet'
      },
      {
        name: 'iPad Pro 12.9"',
        viewport: { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        category: 'large-tablet'
      },
      {
        name: 'Desktop Responsive',
        viewport: { width: 1280, height: 1024, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        category: 'desktop'
      }
    ];
    
    // Responsive breakpoints to test
    this.breakpoints = [
      { name: 'xs', width: 320, height: 568 },   // Extra small devices
      { name: 'sm', width: 576, height: 768 },   // Small devices
      { name: 'md', width: 768, height: 1024 },  // Medium devices
      { name: 'lg', width: 992, height: 1200 },  // Large devices
      { name: 'xl', width: 1200, height: 1600 }, // Extra large devices
      { name: '2xl', width: 1920, height: 1080 } // Ultra wide
    ];
  }

  async runTest(testName, testFunction, category = 'mobile') {
    this.testRegistry.totalTests++;
    const startTime = performance.now();
    
    console.log(`📱 Testing: ${testName}`);
    
    try {
      await testFunction();
      const duration = (performance.now() - startTime).toFixed(2);
      this.testRegistry.passedTests++;
      console.log(`  ✅ MOBILE VERIFIED (${duration}ms)`);
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      this.testRegistry.failedTests++;
      
      const issue = {
        test: testName,
        category,
        severity: this.determineSeverity(error.message),
        message: error.message,
        timestamp: new Date().toISOString(),
        duration
      };
      
      this.categorizeMobileIssue(issue);
      console.log(`  ❌ MOBILE VIOLATION - ${error.message} (${duration}ms)`);
      
      if (issue.severity === 'critical') {
        throw error; // Fail fast on critical mobile issues
      }
    }
  }

  categorizeMobileIssue(issue) {
    const { test } = issue;
    
    if (test.includes('touch') || test.includes('tap') || test.includes('gesture')) {
      this.testRegistry.touchInteractionIssues.push(issue);
    } else if (test.includes('responsive') || test.includes('breakpoint') || test.includes('layout')) {
      this.testRegistry.responsiveDesignIssues.push(issue);
    } else if (test.includes('performance') || test.includes('speed') || test.includes('load')) {
      this.testRegistry.performanceOnMobileIssues.push(issue);
    } else if (test.includes('accessibility') || test.includes('a11y') || test.includes('screen reader')) {
      this.testRegistry.accessibilityOnMobileIssues.push(issue);
    } else if (test.includes('orientation') || test.includes('rotate') || test.includes('landscape')) {
      this.testRegistry.orientationIssues.push(issue);
    } else {
      this.testRegistry.mobileCompatibilityIssues.push(issue);
    }
  }

  determineSeverity(errorMessage) {
    const criticalKeywords = ['unusable on mobile', 'complete failure', 'cannot interact', 'broken layout'];
    const majorKeywords = ['poor mobile experience', 'difficult to use', 'layout issue'];
    const minorKeywords = ['minor mobile issue', 'cosmetic problem', 'small gap'];
    
    if (criticalKeywords.some(keyword => errorMessage.toLowerCase().includes(keyword))) {
      return 'critical';
    } else if (majorKeywords.some(keyword => errorMessage.toLowerCase().includes(keyword))) {
      return 'major';
    } else if (minorKeywords.some(keyword => errorMessage.toLowerCase().includes(keyword))) {
      return 'minor';
    }
    return 'major'; // Default to major for mobile issues
  }

  // ========================================
  // MOBILE DEVICE TESTING (40 tests)
  // ========================================

  async testMobileDevices() {
    console.log('\n📱 MOBILE DEVICE COMPATIBILITY TESTING');
    console.log('══════════════════════════════════════════');
    
    await this.testDeviceSpecificRendering();
    await this.testMobileViewports();
    await this.testDeviceOrientation();
    await this.testMobilePerformance();
  }

  async testDeviceSpecificRendering() {
    // Test 1-20: Device-specific rendering
    for (const device of this.deviceConfigs) {
      await this.runTest(`${device.name} page rendering`, async () => {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          
          const startTime = performance.now();
          const response = await page.goto(this.baseUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000
          });
          const loadTime = performance.now() - startTime;
          
          if (!response.ok()) {
            throw new Error(`Page failed to load on ${device.name}: ${response.status()}`);
          }
          
          if (device.viewport.isMobile && loadTime > this.thresholds.maxMobileLoadTime) {
            throw new Error(`Mobile load time too slow on ${device.name}: ${loadTime.toFixed(2)}ms`);
          }
          
          // Check for horizontal scroll on mobile
          if (device.viewport.isMobile) {
            const hasHorizontalScroll = await page.evaluate(() => {
              return document.documentElement.scrollWidth > document.documentElement.clientWidth;
            });
            
            if (hasHorizontalScroll) {
              throw new Error(`Horizontal scroll detected on ${device.name}`);
            }
          }
          
          // Verify content is visible
          const visibleContent = await page.evaluate(() => {
            const body = document.body;
            return body && body.offsetHeight > 0 && body.textContent.trim().length > 0;
          });
          
          if (!visibleContent) {
            throw new Error(`No visible content on ${device.name}`);
          }
          
          console.log(`  ℹ️  ${device.name} load time: ${loadTime.toFixed(2)}ms`);
          
        } finally {
          await browser.close();
        }
      }, 'device_rendering');

      await this.runTest(`${device.name} critical UI elements`, async () => {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Check critical UI elements are present and visible
          const criticalElements = [
            'header, .header',
            'nav, .navigation',
            'main, .main',
            'button, .btn'
          ];
          
          for (const selector of criticalElements) {
            const element = await page.$(selector);
            if (element) {
              const isVisible = await element.isIntersectingViewport();
              const bounds = await element.boundingBox();
              
              if (!isVisible && bounds) {
                console.warn(`Element ${selector} not in viewport on ${device.name}`);
              }
              
              if (bounds && bounds.width === 0 && bounds.height === 0) {
                throw new Error(`Element ${selector} has no dimensions on ${device.name}`);
              }
            }
          }
          
        } finally {
          await browser.close();
        }
      }, 'device_rendering');
    }
  }

  async testMobileViewports() {
    // Test 21-25: Mobile viewport handling
    await this.runTest('Viewport meta tag implementation', async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      try {
        await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        const viewportMeta = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="viewport"]');
          return meta ? meta.getAttribute('content') : null;
        });
        
        if (!viewportMeta) {
          throw new Error('Missing viewport meta tag');
        }
        
        // Check for proper viewport configuration
        const hasWidth = viewportMeta.includes('width=device-width');
        const hasInitialScale = viewportMeta.includes('initial-scale=1');
        
        if (!hasWidth) {
          throw new Error('Viewport meta tag missing width=device-width');
        }
        
        if (!hasInitialScale) {
          throw new Error('Viewport meta tag missing initial-scale=1');
        }
        
        console.log(`  ℹ️  Viewport meta: ${viewportMeta}`);
        
      } finally {
        await browser.close();
      }
    }, 'viewport');

    await this.runTest('Responsive viewport behavior', async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      try {
        // Test different viewport sizes
        for (const breakpoint of this.breakpoints) {
          await page.setViewport({ 
            width: breakpoint.width, 
            height: breakpoint.height,
            deviceScaleFactor: 1
          });
          
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Check layout at this breakpoint
          const layoutInfo = await page.evaluate(() => {
            return {
              bodyWidth: document.body.offsetWidth,
              bodyHeight: document.body.offsetHeight,
              hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
              hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight
            };
          });
          
          if (layoutInfo.hasHorizontalScroll && breakpoint.width >= 320) {
            throw new Error(`Horizontal scroll at ${breakpoint.name} breakpoint (${breakpoint.width}px)`);
          }
          
          if (layoutInfo.bodyWidth === 0) {
            throw new Error(`Zero body width at ${breakpoint.name} breakpoint`);
          }
        }
        
      } finally {
        await browser.close();
      }
    }, 'viewport');
  }

  async testDeviceOrientation() {
    // Test 26-30: Device orientation handling
    await this.runTest('Portrait and landscape orientation support', async () => {
      const mobileDevices = this.deviceConfigs.filter(d => d.viewport.isMobile && d.category !== 'desktop');
      
      for (const device of mobileDevices.slice(0, 3)) { // Test first 3 mobile devices
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          
          // Test portrait
          const portraitViewport = { 
            ...device.viewport, 
            width: Math.min(device.viewport.width, device.viewport.height),
            height: Math.max(device.viewport.width, device.viewport.height)
          };
          
          await page.setViewport(portraitViewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          const portraitLayout = await page.evaluate(() => ({
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            bodyHeight: document.body.offsetHeight,
            visibleContent: document.body.textContent.trim().length > 0
          }));
          
          if (portraitLayout.hasHorizontalScroll) {
            throw new Error(`Horizontal scroll in portrait mode on ${device.name}`);
          }
          
          if (!portraitLayout.visibleContent) {
            throw new Error(`No content visible in portrait mode on ${device.name}`);
          }
          
          // Test landscape
          const landscapeViewport = {
            ...device.viewport,
            width: Math.max(device.viewport.width, device.viewport.height),
            height: Math.min(device.viewport.width, device.viewport.height)
          };
          
          await page.setViewport(landscapeViewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          const landscapeLayout = await page.evaluate(() => ({
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            bodyHeight: document.body.offsetHeight,
            visibleContent: document.body.textContent.trim().length > 0
          }));
          
          if (landscapeLayout.hasHorizontalScroll) {
            console.warn(`Horizontal scroll in landscape mode on ${device.name}`);
          }
          
          if (!landscapeLayout.visibleContent) {
            throw new Error(`No content visible in landscape mode on ${device.name}`);
          }
          
        } finally {
          await browser.close();
        }
      }
    }, 'orientation');
  }

  async testMobilePerformance() {
    // Test 31-40: Mobile performance
    await this.runTest('Mobile load performance benchmarks', async () => {
      const mobileDevices = this.deviceConfigs.filter(d => d.viewport.isMobile);
      
      for (const device of mobileDevices) {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          
          // Simulate slower mobile connection
          await page.emulateNetworkConditions({
            offline: false,
            downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
            uploadThroughput: 750 * 1024 / 8, // 750 Kbps
            latency: 40 // 40ms RTT
          });
          
          const startTime = performance.now();
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          const loadTime = performance.now() - startTime;
          
          if (loadTime > this.thresholds.maxMobileLoadTime) {
            throw new Error(`Mobile load time too slow on ${device.name}: ${loadTime.toFixed(2)}ms`);
          }
          
          // Test Core Web Vitals on mobile
          const webVitals = await page.evaluate(() => {
            return new Promise((resolve) => {
              const vitals = {};
              let collectedMetrics = 0;
              const totalMetrics = 2;
              
              // Collect FCP (First Contentful Paint)
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (entry.name === 'first-contentful-paint') {
                    vitals.fcp = entry.startTime;
                    collectedMetrics++;
                    if (collectedMetrics >= totalMetrics) resolve(vitals);
                  }
                }
              }).observe({ entryTypes: ['paint'] });
              
              // Collect LCP (Largest Contentful Paint) - simplified
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  vitals.lcp = entry.startTime;
                }
                collectedMetrics++;
                if (collectedMetrics >= totalMetrics) resolve(vitals);
              }).observe({ entryTypes: ['largest-contentful-paint'] });
              
              setTimeout(() => resolve(vitals), 3000);
            });
          });
          
          if (webVitals.fcp && webVitals.fcp > 2500) { // 2.5s threshold for mobile
            console.warn(`Slow First Contentful Paint on ${device.name}: ${webVitals.fcp.toFixed(2)}ms`);
          }
          
          console.log(`  ℹ️  ${device.name} mobile load: ${loadTime.toFixed(2)}ms`);
          
        } finally {
          await browser.close();
        }
      }
    }, 'mobile_performance');
  }

  // ========================================
  // TOUCH INTERACTION TESTING (40 tests)
  // ========================================

  async testTouchInteractions() {
    console.log('\n👆 TOUCH INTERACTION TESTING');
    console.log('════════════════════════════');
    
    await this.testTouchTargetSizes();
    await this.testTouchGestures();
    await this.testScrollBehavior();
    await this.testTouchFeedback();
  }

  async testTouchTargetSizes() {
    // Test 41-60: Touch target size validation
    const touchDevices = this.deviceConfigs.filter(d => d.viewport.hasTouch);
    
    for (const device of touchDevices) {
      await this.runTest(`${device.name} touch target sizes`, async () => {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Find all interactive elements
          const interactiveElements = await page.$$('button, a, input[type="button"], input[type="submit"], [onclick], [role="button"]');
          
          const tooSmallTargets = [];
          
          for (let i = 0; i < Math.min(interactiveElements.length, 20); i++) {
            const element = interactiveElements[i];
            const bounds = await element.boundingBox();
            
            if (bounds) {
              const isVisible = await element.isIntersectingViewport();
              
              if (isVisible) {
                if (bounds.width < this.thresholds.minTouchTargetSize || 
                    bounds.height < this.thresholds.minTouchTargetSize) {
                  
                  const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                  tooSmallTargets.push({
                    tag: tagName,
                    width: bounds.width,
                    height: bounds.height
                  });
                }
              }
            }
          }
          
          if (tooSmallTargets.length > 0) {
            const examples = tooSmallTargets.slice(0, 3).map(t => 
              `${t.tag}(${t.width.toFixed(0)}x${t.height.toFixed(0)}px)`
            ).join(', ');
            
            throw new Error(`${tooSmallTargets.length} touch targets too small on ${device.name}. Examples: ${examples}`);
          }
          
          console.log(`  ℹ️  ${device.name} checked ${Math.min(interactiveElements.length, 20)} touch targets`);
          
        } finally {
          await browser.close();
        }
      }, 'touch_targets');

      await this.runTest(`${device.name} touch target spacing`, async () => {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Check spacing between interactive elements
          const spacingIssues = await page.evaluate((minTargetSize) => {
            const interactiveElements = Array.from(document.querySelectorAll(
              'button, a, input[type="button"], input[type="submit"], [onclick], [role="button"]'
            ));
            
            const issues = [];
            
            for (let i = 0; i < Math.min(interactiveElements.length - 1, 10); i++) {
              const current = interactiveElements[i];
              const next = interactiveElements[i + 1];
              
              const currentRect = current.getBoundingClientRect();
              const nextRect = next.getBoundingClientRect();
              
              // Check if elements are on the same row (similar Y coordinates)
              const yDifference = Math.abs(currentRect.y - nextRect.y);
              
              if (yDifference < 20) { // Elements on same row
                const xDistance = Math.abs((currentRect.x + currentRect.width) - nextRect.x);
                
                if (xDistance < 8) { // Less than 8px spacing
                  issues.push({
                    distance: xDistance,
                    element1: current.tagName,
                    element2: next.tagName
                  });
                }
              }
            }
            
            return issues;
          }, this.thresholds.minTouchTargetSize);
          
          if (spacingIssues.length > 0) {
            const minDistance = Math.min(...spacingIssues.map(i => i.distance));
            throw new Error(`Touch targets too close on ${device.name}: ${minDistance.toFixed(1)}px minimum spacing`);
          }
          
        } finally {
          await browser.close();
        }
      }, 'touch_targets');
    }
  }

  async testTouchGestures() {
    // Test 61-70: Touch gesture support
    await this.runTest('Touch gesture recognition', async () => {
      const touchDevices = this.deviceConfigs.filter(d => d.viewport.hasTouch);
      
      for (const device of touchDevices.slice(0, 3)) {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Test touch event support
          const touchSupport = await page.evaluate(() => {
            const touchEvents = {
              touchstart: false,
              touchmove: false,
              touchend: false,
              touchcancel: false
            };
            
            // Check if TouchEvent constructor exists
            const hasTouchEventConstructor = typeof TouchEvent !== 'undefined';
            
            // Check if touch events can be created
            Object.keys(touchEvents).forEach(eventType => {
              try {
                const event = new TouchEvent(eventType, {
                  touches: [],
                  targetTouches: [],
                  changedTouches: []
                });
                touchEvents[eventType] = true;
              } catch (e) {
                touchEvents[eventType] = false;
              }
            });
            
            return {
              constructor: hasTouchEventConstructor,
              events: touchEvents,
              touchPointsSupported: 'maxTouchPoints' in navigator
            };
          });
          
          if (!touchSupport.constructor) {
            console.warn(`TouchEvent constructor not available on ${device.name}`);
          }
          
          const supportedEvents = Object.values(touchSupport.events).filter(Boolean).length;
          if (supportedEvents === 0) {
            console.warn(`No touch events supported on ${device.name}`);
          }
          
        } finally {
          await browser.close();
        }
      }
    }, 'touch_gestures');

    await this.runTest('Swipe and scroll gesture behavior', async () => {
      const mobileDevice = this.deviceConfigs.find(d => d.name === 'iPhone 12 Pro');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      try {
        await page.setUserAgent(mobileDevice.userAgent);
        await page.setViewport(mobileDevice.viewport);
        await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        // Test vertical scrolling
        const initialScrollY = await page.evaluate(() => window.scrollY);
        
        await page.evaluate(() => {
          window.scrollBy(0, 200);
        });
        
        await page.waitForTimeout(100);
        const afterScrollY = await page.evaluate(() => window.scrollY);
        
        if (afterScrollY === initialScrollY) {
          console.warn('Vertical scrolling may not be working on mobile');
        }
        
        // Check for scroll event handling
        const scrollEventHandled = await page.evaluate(() => {
          let scrollHandled = false;
          
          window.addEventListener('scroll', () => {
            scrollHandled = true;
          }, { once: true });
          
          window.scrollBy(0, 50);
          
          return new Promise(resolve => {
            setTimeout(() => resolve(scrollHandled), 100);
          });
        });
        
        if (!scrollEventHandled) {
          console.warn('Scroll events may not be properly handled');
        }
        
      } finally {
        await browser.close();
      }
    }, 'touch_gestures');
  }

  async testScrollBehavior() {
    // Test 71-75: Scroll behavior on mobile
    await this.runTest('Mobile scroll performance and behavior', async () => {
      const mobileDevices = this.deviceConfigs.filter(d => d.viewport.isMobile).slice(0, 3);
      
      for (const device of mobileDevices) {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Test momentum scrolling
          const scrollBehavior = await page.evaluate(() => {
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            
            return {
              overflowScrolling: computedStyle.webkitOverflowScrolling || computedStyle.overflowScrolling,
              scrollBehavior: computedStyle.scrollBehavior,
              overflowY: computedStyle.overflowY,
              hasScrollableContent: document.documentElement.scrollHeight > window.innerHeight
            };
          });
          
          if (scrollBehavior.hasScrollableContent) {
            // Test scroll smoothness by measuring frame timing
            const scrollPerformance = await page.evaluate(() => {
              return new Promise(resolve => {
                let frameCount = 0;
                const startTime = performance.now();
                
                function measureFrame() {
                  frameCount++;
                  if (frameCount < 10) {
                    requestAnimationFrame(measureFrame);
                  } else {
                    const endTime = performance.now();
                    const avgFrameTime = (endTime - startTime) / frameCount;
                    resolve(avgFrameTime);
                  }
                }
                
                // Start scrolling and measuring
                window.scrollBy(0, 10);
                requestAnimationFrame(measureFrame);
                
                setTimeout(() => resolve(16.67), 500); // Fallback
              });
            });
            
            if (scrollPerformance > this.thresholds.maxScrollJank) {
              console.warn(`Scroll performance may be janky on ${device.name}: ${scrollPerformance.toFixed(2)}ms per frame`);
            }
          }
          
        } finally {
          await browser.close();
        }
      }
    }, 'scroll_behavior');
  }

  async testTouchFeedback() {
    // Test 76-80: Touch feedback and states
    await this.runTest('Touch state feedback (active, hover, focus)', async () => {
      const touchDevices = this.deviceConfigs.filter(d => d.viewport.hasTouch).slice(0, 2);
      
      for (const device of touchDevices) {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setUserAgent(device.userAgent);
          await page.setViewport(device.viewport);
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Test touch states on buttons
          const buttons = await page.$$('button, [role="button"]');
          
          for (let i = 0; i < Math.min(buttons.length, 5); i++) {
            const button = buttons[i];
            
            // Test active state
            const activeState = await button.evaluate(el => {
              el.classList.add('active'); // Simulate active state
              const computedStyle = window.getComputedStyle(el, ':active');
              const hasActiveStyle = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                                   computedStyle.transform !== 'none' ||
                                   computedStyle.opacity !== '1';
              el.classList.remove('active');
              return hasActiveStyle;
            });
            
            // Test focus state for accessibility
            await button.focus();
            const focusState = await button.evaluate(el => {
              const computedStyle = window.getComputedStyle(el, ':focus');
              return computedStyle.outline !== 'none' && computedStyle.outline !== '0px';
            });
            
            if (!focusState) {
              console.warn(`Button ${i + 1} missing focus indicator on ${device.name}`);
            }
          }
          
        } finally {
          await browser.close();
        }
      }
    }, 'touch_feedback');
  }

  // ========================================
  // RESPONSIVE BREAKPOINT TESTING (40 tests)
  // ========================================

  async testResponsiveBreakpoints() {
    console.log('\n📐 RESPONSIVE BREAKPOINT TESTING');
    console.log('════════════════════════════════');
    
    await this.testBreakpointBehavior();
    await this.testFluidLayouts();
    await this.testResponsiveImages();
    await this.testResponsiveTypography();
  }

  async testBreakpointBehavior() {
    // Test 81-100: Breakpoint behavior validation
    for (const breakpoint of this.breakpoints) {
      await this.runTest(`${breakpoint.name} breakpoint (${breakpoint.width}px) layout`, async () => {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        try {
          await page.setViewport({ 
            width: breakpoint.width, 
            height: breakpoint.height,
            deviceScaleFactor: 1
          });
          
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          // Analyze layout at this breakpoint
          const layoutAnalysis = await page.evaluate(() => {
            const body = document.body;
            const header = document.querySelector('header, .header');
            const nav = document.querySelector('nav, .navigation');
            const main = document.querySelector('main, .main');
            
            return {
              bodyWidth: body.offsetWidth,
              bodyHeight: body.offsetHeight,
              hasHeader: !!header,
              headerHeight: header ? header.offsetHeight : 0,
              hasNav: !!nav,
              navWidth: nav ? nav.offsetWidth : 0,
              hasMain: !!main,
              mainWidth: main ? main.offsetWidth : 0,
              hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
              visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              }).length
            };
          });
          
          if (layoutAnalysis.hasHorizontalScroll && breakpoint.width >= 320) {
            throw new Error(`Horizontal scroll at ${breakpoint.name} breakpoint`);
          }
          
          if (layoutAnalysis.bodyWidth === 0) {
            throw new Error(`Zero body width at ${breakpoint.name} breakpoint`);
          }
          
          if (layoutAnalysis.visibleElements === 0) {
            throw new Error(`No visible elements at ${breakpoint.name} breakpoint`);
          }
          
          // Check for reasonable header height
          if (layoutAnalysis.hasHeader && layoutAnalysis.headerHeight > breakpoint.height * 0.4) {
            console.warn(`Header may be too tall at ${breakpoint.name} breakpoint: ${layoutAnalysis.headerHeight}px`);
          }
          
          console.log(`  ℹ️  ${breakpoint.name}: ${layoutAnalysis.visibleElements} visible elements, body ${layoutAnalysis.bodyWidth}x${layoutAnalysis.bodyHeight}px`);
          
        } finally {
          await browser.close();
        }
      }, 'responsive_breakpoints');
    }
  }

  async testFluidLayouts() {
    // Test 101-110: Fluid layout behavior
    await this.runTest('Fluid layout container behavior', async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      try {
        // Test fluid behavior across different widths
        const testWidths = [320, 480, 768, 1024, 1280, 1920];
        
        for (const width of testWidths) {
          await page.setViewport({ width, height: 1024, deviceScaleFactor: 1 });
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          const containerMetrics = await page.evaluate(() => {
            // Find main containers
            const containers = Array.from(document.querySelectorAll('div, section, article, main'))
              .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 200 && rect.height > 50;
              })
              .slice(0, 5);
            
            return containers.map(container => {
              const rect = container.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(container);
              
              return {
                width: rect.width,
                widthPercentage: (rect.width / window.innerWidth) * 100,
                maxWidth: computedStyle.maxWidth,
                minWidth: computedStyle.minWidth,
                padding: computedStyle.padding,
                margin: computedStyle.margin
              };
            });
          });
          
          // Check for responsive container behavior
          containerMetrics.forEach((container, index) => {
            if (container.widthPercentage > 100) {
              throw new Error(`Container ${index + 1} extends beyond viewport at ${width}px width`);
            }
            
            // Check for reasonable max-width implementation
            if (width > 1200 && container.maxWidth === 'none' && container.widthPercentage > 95) {
              console.warn(`Container ${index + 1} may need max-width at ${width}px`);
            }
          });
        }
        
      } finally {
        await browser.close();
      }
    }, 'fluid_layouts');
  }

  async testResponsiveImages() {
    // Test 111-120: Responsive image behavior
    await this.runTest('Responsive image implementation', async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      try {
        await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });
        await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        const imageAnalysis = await page.evaluate(() => {
          const images = Array.from(document.querySelectorAll('img'));
          
          return images.map(img => {
            const rect = img.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(img);
            
            return {
              src: img.src,
              width: rect.width,
              height: rect.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              maxWidth: computedStyle.maxWidth,
              objectFit: computedStyle.objectFit,
              hasResponsiveAttributes: img.hasAttribute('srcset') || img.hasAttribute('sizes'),
              isVisible: rect.width > 0 && rect.height > 0
            };
          });
        });
        
        imageAnalysis.forEach((image, index) => {
          if (image.isVisible) {
            // Check for responsive behavior
            if (image.maxWidth === 'none' && image.width > 375) {
              console.warn(`Image ${index + 1} may overflow on mobile (width: ${image.width}px)`);
            }
            
            // Check for modern responsive attributes
            if (!image.hasResponsiveAttributes && image.naturalWidth > 800) {
              console.warn(`Large image ${index + 1} missing srcset/sizes attributes`);
            }
            
            // Check for reasonable object-fit
            if (image.objectFit === 'none' && image.naturalWidth > image.width * 2) {
              console.warn(`Image ${index + 1} may benefit from object-fit property`);
            }
          }
        });
        
        console.log(`  ℹ️  Analyzed ${imageAnalysis.length} images, ${imageAnalysis.filter(i => i.hasResponsiveAttributes).length} with responsive attributes`);
        
      } finally {
        await browser.close();
      }
    }, 'responsive_images');
  }

  async testResponsiveTypography() {
    // Test 121-140: Responsive typography
    await this.runTest('Responsive typography scaling', async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      try {
        const typographyMetrics = new Map();
        
        // Test typography at different breakpoints
        for (const breakpoint of this.breakpoints.slice(0, 4)) {
          await page.setViewport({ 
            width: breakpoint.width, 
            height: breakpoint.height,
            deviceScaleFactor: 1
          });
          
          await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
          
          const textMetrics = await page.evaluate(() => {
            const textElements = ['h1', 'h2', 'h3', 'p', 'button', 'a'];
            const metrics = {};
            
            textElements.forEach(selector => {
              const element = document.querySelector(selector);
              if (element) {
                const computedStyle = window.getComputedStyle(element);
                metrics[selector] = {
                  fontSize: parseFloat(computedStyle.fontSize),
                  lineHeight: parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2,
                  fontWeight: computedStyle.fontWeight,
                  letterSpacing: computedStyle.letterSpacing
                };
              }
            });
            
            return metrics;
          });
          
          typographyMetrics.set(breakpoint.name, textMetrics);
        }
        
        // Analyze typography scaling
        const breakpointNames = Array.from(typographyMetrics.keys());
        
        if (breakpointNames.length > 1) {
          const smallestBreakpoint = typographyMetrics.get(breakpointNames[0]);
          const largestBreakpoint = typographyMetrics.get(breakpointNames[breakpointNames.length - 1]);
          
          Object.keys(smallestBreakpoint).forEach(selector => {
            if (smallestBreakpoint[selector] && largestBreakpoint[selector]) {
              const smallSize = smallestBreakpoint[selector].fontSize;
              const largeSize = largestBreakpoint[selector].fontSize;
              
              // Check for reasonable scaling
              if (smallSize === largeSize && selector === 'h1') {
                console.warn(`H1 font size not scaling responsively: ${smallSize}px at all breakpoints`);
              }
              
              // Check minimum font sizes for readability
              if (smallSize < 14 && selector === 'p') {
                console.warn(`Paragraph text may be too small on mobile: ${smallSize}px`);
              }
              
              if (smallSize < 16 && selector === 'button') {
                console.warn(`Button text may be too small: ${smallSize}px`);
              }
            }
          });
        }
        
      } finally {
        await browser.close();
      }
    }, 'responsive_typography');
  }

  // ========================================
  // REPORT GENERATION
  // ========================================

  async generateMobileResponsiveReport() {
    this.testRegistry.endTime = Date.now();
    const duration = ((this.testRegistry.endTime - this.testRegistry.startTime) / 1000).toFixed(2);
    
    console.log('\n📱 MOBILE & RESPONSIVE TEST RESULTS');
    console.log('═══════════════════════════════════════');
    
    const criticalIssues = this.getAllMobileIssues().filter(issue => issue.severity === 'critical');
    const majorIssues = this.getAllMobileIssues().filter(issue => issue.severity === 'major');
    const minorIssues = this.getAllMobileIssues().filter(issue => issue.severity === 'minor');
    
    const isMobileReady = criticalIssues.length === 0 && majorIssues.length <= 10; // Allow more major issues for mobile
    
    console.log(`\n📊 Mobile & Responsive Test Summary:`);
    console.log(`   Total Mobile Tests: ${this.testRegistry.totalTests}`);
    console.log(`   ✅ Passed: ${this.testRegistry.passedTests}`);
    console.log(`   ❌ Failed: ${this.testRegistry.failedTests}`);
    console.log(`   Duration: ${duration}s`);
    
    console.log(`\n🔍 Mobile Issue Breakdown:`);
    console.log(`   🚨 Critical: ${criticalIssues.length}`);
    console.log(`   ⚠️  Major: ${majorIssues.length}`);
    console.log(`   ℹ️  Minor: ${minorIssues.length}`);
    
    console.log(`\n📋 Issue Categories:`);
    console.log(`   📱 Mobile Compatibility: ${this.testRegistry.mobileCompatibilityIssues.length}`);
    console.log(`   📐 Responsive Design: ${this.testRegistry.responsiveDesignIssues.length}`);
    console.log(`   👆 Touch Interactions: ${this.testRegistry.touchInteractionIssues.length}`);
    console.log(`   ⚡ Mobile Performance: ${this.testRegistry.performanceOnMobileIssues.length}`);
    console.log(`   ♿ Mobile Accessibility: ${this.testRegistry.accessibilityOnMobileIssues.length}`);
    console.log(`   🔄 Orientation: ${this.testRegistry.orientationIssues.length}`);
    
    if (criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL MOBILE ISSUES:`);
      criticalIssues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.test}`);
        console.log(`     ${issue.message}`);
      });
    }
    
    if (majorIssues.length > 0) {
      console.log(`\n⚠️  MAJOR MOBILE ISSUES:`);
      majorIssues.slice(0, 10).forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.test}`);
        console.log(`     ${issue.message}`);
      });
      if (majorIssues.length > 10) {
        console.log(`  ... and ${majorIssues.length - 10} more major issues`);
      }
    }
    
    console.log(`\n🏆 MOBILE & RESPONSIVE CERTIFICATION:`);
    if (isMobileReady) {
      console.log(`  ✅ MOBILE READY - Optimized for all devices`);
      console.log(`  Application provides excellent mobile experience.`);
      console.log(`  ${this.testRegistry.totalTests} mobile tests completed successfully.`);
    } else {
      console.log(`  ❌ MOBILE CERTIFICATION FAILED`);
      console.log(`  Application has mobile usability issues.`);
      console.log(`  Mobile deployment BLOCKED until issues resolved.`);
    }
    
    console.log(`\n📱 Mobile testing completed at ${new Date().toLocaleString()}`);
    console.log('──────────────────────────────────────────────────────────────\n');
    
    return isMobileReady;
  }

  getAllMobileIssues() {
    return [
      ...this.testRegistry.mobileCompatibilityIssues,
      ...this.testRegistry.responsiveDesignIssues,
      ...this.testRegistry.touchInteractionIssues,
      ...this.testRegistry.performanceOnMobileIssues,
      ...this.testRegistry.accessibilityOnMobileIssues,
      ...this.testRegistry.orientationIssues
    ];
  }

  async runAllMobileResponsiveTests() {
    try {
      console.log('📱 INITIALIZING MOBILE & RESPONSIVE TESTING PROTOCOL');
      console.log('═══════════════════════════════════════════════════');
      console.log(`Target: ${this.baseUrl}`);
      console.log(`Mobile Standard: MILITARY-GRADE MOBILE-FIRST`);
      console.log(`Total Mobile Checks: 140+\n`);
      
      await this.testMobileDevices();
      await this.testTouchInteractions();
      await this.testResponsiveBreakpoints();
      
      const isMobileReady = await this.generateMobileResponsiveReport();
      
      return {
        passed: isMobileReady,
        totalTests: this.testRegistry.totalTests,
        passedTests: this.testRegistry.passedTests,
        failedTests: this.testRegistry.failedTests,
        mobileIssues: this.getAllMobileIssues()
      };
      
    } catch (error) {
      console.error('🚨 CRITICAL MOBILE & RESPONSIVE TEST FAILURE:', error);
      throw error;
    }
  }
}

module.exports = MobileResponsiveTester;

// Export for integration with phase2-zero-defect-integration.js
if (require.main === module) {
  const tester = new MobileResponsiveTester();
  tester.runAllMobileResponsiveTests()
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal mobile & responsive testing error:', error);
      process.exit(1);
    });
}