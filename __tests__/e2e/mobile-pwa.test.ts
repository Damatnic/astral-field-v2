/**
 * Mobile PWA Integration Tests
 * Tests Progressive Web App functionality, offline capabilities, and mobile UX
 */

import { test, expect, devices } from '@playwright/test';

const isMobile = true;

// Configure mobile testing
test.use({
  ...devices['iPhone 12'],
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});

describe('Mobile PWA Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for service worker registration
    await page.waitForFunction(() => {
      return 'serviceWorker' in navigator;
    });
  });

  test('PWA manifest loads correctly', async ({ page }) => {
    // Check if manifest exists
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    // Fetch and verify manifest content
    const response = await page.request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest.name).toBe('AstralField');
    expect(manifest.short_name).toBe('AstralField');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#10b981');
    expect(manifest.background_color).toBe('#ffffff');
    
    // Verify icons exist
    expect(manifest.icons).toHaveLength(4);
    expect(manifest.icons[0].sizes).toBe('192x192');
    expect(manifest.icons[1].sizes).toBe('512x512');
  });

  test('Service worker registers and caches resources', async ({ page }) => {
    // Check service worker registration
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.ready.then(registration => {
        return registration.active !== null;
      });
    });
    expect(swRegistered).toBe(true);

    // Verify service worker file exists
    const swResponse = await page.request.get('/sw.js');
    expect(swResponse.status()).toBe(200);

    // Check if critical resources are cached
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const cacheEntries = await page.evaluate(() => {
      return caches.open('astralfield-v1').then(cache => {
        return cache.keys().then(requests => {
          return requests.map(req => req.url);
        });
      });
    });

    // Verify key resources are cached
    expect(cacheEntries.some(url => url.includes('/'))).toBe(true);
    expect(cacheEntries.some(url => url.includes('/dashboard'))).toBe(true);
  });

  test('App works offline for cached pages', async ({ page, context }) => {
    // Load key pages while online
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/leagues');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/players');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Verify cached pages still work
    await page.goto('/dashboard');
    await expect(page.getByText('Dashboard')).toBeVisible();
    
    await page.goto('/leagues');
    await expect(page.getByText('My Leagues')).toBeVisible();
    
    await page.goto('/players');
    await expect(page.getByText('Player Search')).toBeVisible();

    // Verify offline indicator appears
    await expect(page.getByText('You are currently offline')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    await page.reload();
    
    // Verify online status restored
    await expect(page.getByText('You are currently offline')).not.toBeVisible();
  });

  test('Touch interactions work properly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test tap interactions
    const leagueCard = page.locator('[data-testid="league-card"]').first();
    await leagueCard.tap();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/\/leagues\/.+/);

    // Test swipe gestures on player list
    await page.goto('/players');
    
    const playerList = page.locator('[data-testid="player-list"]');
    await expect(playerList).toBeVisible();

    // Simulate swipe to refresh
    await playerList.touch({
      start: { x: 195, y: 400 },
      end: { x: 195, y: 600 }
    });

    // Verify pull-to-refresh indicator
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible();

    // Test long press context menu
    const firstPlayer = page.locator('[data-testid="player-item"]').first();
    await firstPlayer.touchLongpress();
    
    // Verify context menu appears
    await expect(page.getByText('Add to Watch List')).toBeVisible();
  });

  test('Responsive layout adapts to mobile viewport', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify mobile navigation is visible
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();

    // Test hamburger menu
    await page.click('[data-testid="hamburger-menu"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Verify responsive grid layout
    const dashboardCards = page.locator('[data-testid="dashboard-card"]');
    const cardCount = await dashboardCards.count();
    
    // On mobile, cards should stack vertically
    for (let i = 0; i < cardCount - 1; i++) {
      const currentCard = dashboardCards.nth(i);
      const nextCard = dashboardCards.nth(i + 1);
      
      const currentBounds = await currentCard.boundingBox();
      const nextBounds = await nextCard.boundingBox();
      
      if (currentBounds && nextBounds) {
        // Next card should be below current card (vertical stacking)
        expect(nextBounds.y).toBeGreaterThan(currentBounds.y + currentBounds.height - 10);
      }
    }

    // Test orientation change
    await page.setViewportSize({ width: 844, height: 390 }); // Landscape
    await page.waitForTimeout(500);
    
    // Verify layout adapts to landscape
    const landscapeCards = page.locator('[data-testid="dashboard-card"]');
    const landscapeCardBounds = await landscapeCards.first().boundingBox();
    
    expect(landscapeCardBounds?.width).toBeGreaterThan(300);
  });

  test('Mobile-specific features work correctly', async ({ page }) => {
    await page.goto('/');

    // Test PWA install prompt (simulated)
    await page.evaluate(() => {
      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);
    });

    // Verify install banner appears
    await expect(page.getByText('Install AstralField')).toBeVisible();
    
    // Test install button
    await page.click('[data-testid="install-pwa"]');
    
    // Verify install process initiated
    await expect(page.getByText('Installing...')).toBeVisible();

    // Test share functionality
    await page.goto('/leagues/test-league');
    await page.click('[data-testid="share-league"]');
    
    // On mobile, should trigger native share
    await expect(page.getByText('Share League')).toBeVisible();

    // Test haptic feedback simulation
    const importantButton = page.locator('[data-testid="make-pick"]');
    await importantButton.click();
    
    // Verify haptic feedback was triggered (simulated)
    const hapticTriggered = await page.evaluate(() => {
      return window.hapticFeedbackTriggered === true;
    });
    // Note: This would need to be implemented in the actual app
  });

  test('Performance metrics meet mobile standards', async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {};
      
      // Measure First Contentful Paint
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics[entry.name] = entry.startTime;
        }
      });
      observer.observe({ entryTypes: ['paint'] });

      // Measure Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.performanceMetrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get performance metrics
    const metrics = await page.evaluate(() => window.performanceMetrics);

    // Verify mobile performance standards
    expect(metrics['first-contentful-paint']).toBeLessThan(2000); // 2 seconds
    expect(metrics.lcp).toBeLessThan(2500); // 2.5 seconds for LCP

    // Measure page load time
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
    expect(loadTime).toBeLessThan(3000); // 3 seconds total load time

    // Test scroll performance
    const scrollContainer = page.locator('[data-testid="scrollable-content"]');
    await scrollContainer.scrollIntoViewIfNeeded();

    // Simulate fast scrolling
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }

    // Verify smooth scrolling (no jank)
    const scrollPerformance = await page.evaluate(() => {
      return performance.getEntriesByType('measure')
        .filter(entry => entry.name.includes('scroll'))
        .every(entry => entry.duration < 16); // 60fps = 16ms per frame
    });
    expect(scrollPerformance).toBe(true);
  });

  test('Push notifications can be subscribed to', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);

    await page.goto('/settings');
    
    // Test notification subscription
    await page.click('[data-testid="enable-notifications"]');
    
    // Verify subscription process
    const subscribed = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
      }
      return false;
    });
    expect(subscribed).toBe(true);

    // Test notification preferences
    await page.check('[data-testid="lineup-reminders"]');
    await page.check('[data-testid="trade-alerts"]');
    await page.check('[data-testid="waiver-notifications"]');
    
    await page.click('[data-testid="save-notification-settings"]');
    
    // Verify settings saved
    await expect(page.getByText('Notification settings saved')).toBeVisible();

    // Test push notification reception (simulated)
    await page.evaluate(() => {
      // Simulate push notification
      const notificationData = {
        title: 'AstralField',
        body: 'Your lineup needs attention!',
        icon: '/icon-192x192.png',
        badge: '/badge.png',
        tag: 'lineup-reminder'
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(notificationData.title, notificationData);
        });
      }
    });

    // Verify notification appears (would need to check system notification)
    await page.waitForTimeout(1000);
  });

  test('Offline data synchronization works', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    // Make some changes while online
    await page.click('[data-testid="favorite-team"]');
    await page.fill('[data-testid="team-name-input"]', 'Mobile Test Team');
    
    // Go offline
    await context.setOffline(true);
    
    // Make more changes while offline
    await page.click('[data-testid="add-player-note"]');
    await page.fill('[data-testid="player-note"]', 'Offline note');
    await page.click('[data-testid="save-note"]');
    
    // Verify offline changes are queued
    const queuedChanges = await page.evaluate(() => {
      return localStorage.getItem('offlineQueue') !== null;
    });
    expect(queuedChanges).toBe(true);

    // Go back online
    await context.setOffline(false);
    await page.reload();
    
    // Wait for sync to complete
    await page.waitForTimeout(2000);
    
    // Verify changes were synced
    await expect(page.locator('[data-testid="team-name-input"]')).toHaveValue('Mobile Test Team');
    await expect(page.getByText('Offline note')).toBeVisible();
    
    // Verify sync queue is cleared
    const queueCleared = await page.evaluate(() => {
      return localStorage.getItem('offlineQueue') === null;
    });
    expect(queueCleared).toBe(true);
  });

  test('Mobile accessibility features work', async ({ page }) => {
    await page.goto('/dashboard');

    // Test voice over / screen reader support
    const mainHeading = page.getByRole('heading', { name: 'Dashboard' });
    await expect(mainHeading).toHaveAttribute('aria-level', '1');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test high contrast mode detection
    const highContrastSupported = await page.evaluate(() => {
      return window.matchMedia('(prefers-contrast: high)').matches;
    });

    if (highContrastSupported) {
      await expect(page.locator('body')).toHaveClass(/high-contrast/);
    }

    // Test reduced motion preference
    const reducedMotionSupported = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    if (reducedMotionSupported) {
      await expect(page.locator('body')).toHaveClass(/reduced-motion/);
    }

    // Test touch target sizes (minimum 44px)
    const touchTargets = page.locator('button, [role="button"], a');
    const touchTargetCount = await touchTargets.count();

    for (let i = 0; i < touchTargetCount; i++) {
      const target = touchTargets.nth(i);
      const bounds = await target.boundingBox();
      
      if (bounds) {
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('App handles device rotation and viewport changes', async ({ page }) => {
    await page.goto('/draft/test-draft');

    // Test portrait mode
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-draft-layout"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-draft-layout"]')).not.toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);

    // Verify landscape adaptations
    await expect(page.locator('[data-testid="landscape-draft-layout"]')).toBeVisible();

    // Test different device sizes
    const devices = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 414, height: 896 }, // iPhone XR
      { width: 768, height: 1024 }, // iPad
    ];

    for (const device of devices) {
      await page.setViewportSize(device);
      await page.waitForTimeout(300);

      // Verify responsive behavior
      const layout = page.locator('[data-testid="responsive-container"]');
      await expect(layout).toBeVisible();

      const bounds = await layout.boundingBox();
      if (bounds) {
        expect(bounds.width).toBeLessThanOrEqual(device.width);
      }
    }
  });
});

// Utility functions for mobile testing
export async function simulateSlowNetwork(page: any) {
  await page.route('**/*', route => {
    setTimeout(() => route.continue(), 1000); // 1 second delay
  });
}

export async function simulateTouchGesture(page: any, selector: string, gesture: string) {
  const element = page.locator(selector);
  const bounds = await element.boundingBox();
  
  if (!bounds) return;

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  switch (gesture) {
    case 'tap':
      await element.tap();
      break;
    case 'longPress':
      await element.touchLongpress();
      break;
    case 'swipeLeft':
      await page.touchscreen.tap(centerX, centerY);
      await page.touchscreen.tap(centerX - 100, centerY);
      break;
    case 'swipeRight':
      await page.touchscreen.tap(centerX, centerY);
      await page.touchscreen.tap(centerX + 100, centerY);
      break;
  }
}