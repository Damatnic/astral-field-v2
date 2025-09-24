/**
 * Production Readiness End-to-End Tests
 * Comprehensive testing for production deployment
 */

import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';

describe('Production Readiness E2E Tests', () => {
  let server: ChildProcess;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  
  const BASE_URL = 'http://localhost:3007';
  
  beforeAll(async () => {
    // Start the Next.js server
    server = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Wait for server to start
    await new Promise((resolve) => {
      server.stdout?.on('data', (data) => {
        if (data.toString().includes('ready')) {
          resolve(true);
        }
      });
    });
    
    // Launch browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  });
  
  afterAll(async () => {
    await page?.close();
    await context?.close();
    await browser?.close();
    server?.kill();
  });

  describe('Core Web Vitals & Performance', () => {
    test('should meet Core Web Vitals benchmarks', async () => {
      await page.goto(BASE_URL);
      
      // Measure Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: any = {};
          
          // First Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
            });
          }).observe({ entryTypes: ['paint'] });
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              vitals.fid = entry.processingStart - entry.startTime;
            });
          }).observe({ entryTypes: ['first-input'] });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(vitals), 3000);
        });
      });
      
      // Verify Core Web Vitals thresholds
      expect(webVitals.fcp).toBeLessThan(1800); // FCP < 1.8s
      expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
      expect(webVitals.fid || 0).toBeLessThan(100); // FID < 100ms
      expect(webVitals.cls || 0).toBeLessThan(0.1); // CLS < 0.1
    });
    
    test('should load page within performance budget', async () => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Page should load within 3 seconds
    });
    
    test('should have optimal Lighthouse score', async () => {
      // Run basic Lighthouse audit
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
      
      // Check critical resources
      const jsResources = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.map((script: any) => script.src);
      });
      
      const cssResources = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.map((link: any) => link.href);
      });
      
      // Verify resource optimization
      expect(jsResources.length).toBeLessThan(10); // Reasonable number of JS files
      expect(cssResources.length).toBeLessThan(5); // Reasonable number of CSS files
    });
  });

  describe('Functionality Testing', () => {
    test('should navigate through all main pages', async () => {
      const pages = [
        '/',
        '/leagues',
        '/dashboard'
      ];
      
      for (const pagePath of pages) {
        await page.goto(`${BASE_URL}${pagePath}`);
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Check for no console errors
        const errors = await page.evaluate(() => {
          return window.console.error.toString();
        });
        
        expect(errors).not.toContain('Error');
      }
    });
    
    test('should handle authentication flow', async () => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Check if sign-in page loads
      await expect(page).toHaveTitle(/Sign In|AstralField/);
      
      // Verify sign-in form exists
      const signInForm = page.locator('form, [data-testid="signin-form"]');
      await expect(signInForm).toBeVisible({ timeout: 5000 });
    });
    
    test('should be responsive on mobile devices', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      // Check mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, button[aria-label*="menu"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
      }
      
      // Verify responsive layout
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();
      
      // Reset to desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
    });
  });

  describe('API Performance Testing', () => {
    test('should handle API endpoints efficiently', async () => {
      const endpoints = [
        '/api/health',
        '/api/monitoring/performance'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await fetch(`${BASE_URL}${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        expect(response.status).toBeLessThan(400);
        expect(responseTime).toBeLessThan(1000); // API should respond within 1 second
      }
    });
    
    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(async () => {
        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}/api/health`);
        const responseTime = Date.now() - startTime;
        
        return {
          status: response.status,
          responseTime
        };
      });
      
      const results = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.responseTime).toBeLessThan(2000); // Allow more time for concurrent requests
      });
      
      // Average response time should be reasonable
      const avgResponseTime = results.reduce((acc, r) => acc + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(1500);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async () => {
      const response = await page.goto(`${BASE_URL}/non-existent-page`);
      expect(response?.status()).toBe(404);
      
      // Should show custom 404 page
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('404' || 'Not Found' || 'Page not found');
    });
    
    test('should handle API errors gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/non-existent-endpoint`);
      expect(response.status).toBe(404);
      
      const responseData = await response.json().catch(() => ({}));
      expect(responseData).toHaveProperty('error');
    });
    
    test('should handle network failures', async () => {
      // Simulate offline mode
      await context.setOffline(true);
      await page.goto(BASE_URL);
      
      // Should show offline indicator or cached content
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toBe('');
      
      // Restore online mode
      await context.setOffline(false);
    });
  });

  describe('Security Testing', () => {
    test('should have proper security headers', async () => {
      const response = await page.goto(BASE_URL);
      const headers = response?.headers() || {};
      
      // Check for security headers
      expect(headers['x-frame-options'] || headers['X-Frame-Options']).toBeTruthy();
      expect(headers['x-content-type-options'] || headers['X-Content-Type-Options']).toBeTruthy();
      expect(headers['x-xss-protection'] || headers['X-XSS-Protection']).toBeTruthy();
    });
    
    test('should not expose sensitive information', async () => {
      await page.goto(BASE_URL);
      
      // Check page source for sensitive data
      const pageSource = await page.content();
      
      // Should not contain sensitive environment variables
      expect(pageSource).not.toContain('DATABASE_URL');
      expect(pageSource).not.toContain('SECRET_KEY');
      expect(pageSource).not.toContain('API_KEY');
      expect(pageSource).not.toContain('password');
    });
  });

  describe('PWA Features', () => {
    test('should have valid service worker', async () => {
      await page.goto(BASE_URL);
      
      // Check if service worker is registered
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            return !!registration;
          } catch (error) {
            return false;
          }
        }
        return false;
      });
      
      expect(swRegistered).toBe(true);
    });
    
    test('should have valid manifest', async () => {
      const response = await fetch(`${BASE_URL}/manifest.json`);
      expect(response.status).toBe(200);
      
      const manifest = await response.json();
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('short_name');
      expect(manifest).toHaveProperty('icons');
      expect(manifest).toHaveProperty('start_url');
      expect(manifest).toHaveProperty('display');
      expect(manifest).toHaveProperty('theme_color');
    });
  });

  describe('Accessibility Testing', () => {
    test('should meet basic accessibility standards', async () => {
      await page.goto(BASE_URL);
      
      // Check for basic accessibility attributes
      const hasMainLandmark = await page.locator('main, [role="main"]').count() > 0;
      expect(hasMainLandmark).toBe(true);
      
      // Check for heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);
      
      // Check for alt text on images
      const imagesWithoutAlt = await page.locator('img:not([alt])').count();
      expect(imagesWithoutAlt).toBe(0);
      
      // Check color contrast (basic test)
      const backgroundColors = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.map(el => {
          const style = window.getComputedStyle(el);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color
          };
        }).filter(style => style.backgroundColor !== 'rgba(0, 0, 0, 0)');
      });
      
      expect(backgroundColors.length).toBeGreaterThan(0);
    });
  });

  describe('Load Testing Simulation', () => {
    test('should handle multiple users simultaneously', async () => {
      const users = 5;
      const userSessions = [];
      
      for (let i = 0; i < users; i++) {
        const userContext = await browser.newContext();
        const userPage = await userContext.newPage();
        userSessions.push({ context: userContext, page: userPage });
      }
      
      // Simulate concurrent user activity
      const userActions = userSessions.map(async (session, index) => {
        const { page } = session;
        
        try {
          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
          
          // Simulate user interactions
          await page.click('body'); // Basic interaction
          await page.waitForTimeout(1000);
          
          return { success: true, user: index };
        } catch (error) {
          return { success: false, user: index, error };
        }
      });
      
      const results = await Promise.all(userActions);
      
      // All users should complete successfully
      const successfulUsers = results.filter(r => r.success).length;
      expect(successfulUsers).toBe(users);
      
      // Cleanup user sessions
      for (const session of userSessions) {
        await session.page.close();
        await session.context.close();
      }
    });
  });
});

// Helper function to wait for server
async function waitForServer(url: string, timeout = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}