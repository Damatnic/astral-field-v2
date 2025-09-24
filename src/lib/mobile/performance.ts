// Mobile Performance Optimization Utilities
// Provides utilities for optimizing mobile PWA performance

export class MobilePerformanceManager {
  private static instance: MobilePerformanceManager;
  private memoryWarningCallback?: () => void;
  private networkStatusCallback?: (online: boolean) => void;

  private constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializePerformanceMonitoring();
    }
  }

  public static getInstance(): MobilePerformanceManager {
    if (!MobilePerformanceManager.instance) {
      MobilePerformanceManager.instance = new MobilePerformanceManager();
    }
    return MobilePerformanceManager.instance;
  }

  private initializePerformanceMonitoring() {
    // Monitor memory usage (Chrome only)
    if ('memory' in performance) {
      this.monitorMemoryUsage();
    }

    // Monitor network status
    this.monitorNetworkStatus();

    // Monitor battery level (if supported)
    this.monitorBatteryLevel();

    // Monitor device orientation changes
    this.monitorOrientationChanges();
  }

  // Memory Management
  private monitorMemoryUsage() {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (memoryUsagePercentage > 80) {
          this.triggerMemoryCleanup();
        }
      }
    };

    setInterval(checkMemory, 30000); // Check every 30 seconds
  }

  private triggerMemoryCleanup() {
    // Clear caches, remove unused components, etc.
    this.clearImageCache();
    this.clearLocalStorageOldItems();
    this.memoryWarningCallback?.();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private clearImageCache() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Clear cached images that are no longer visible
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (!this.isElementInViewport(img)) {
        img.src = '';
      }
    });
  }

  private clearLocalStorageOldItems() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.timestamp && (now - item.timestamp) > maxAge) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Invalid JSON, remove it
          localStorage.removeItem(key);
        }
      }
    }
  }

  private isElementInViewport(el: Element): boolean {
    // Only run in browser environment
    if (typeof window === 'undefined') return false;
    
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Network Monitoring
  private monitorNetworkStatus() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const updateNetworkStatus = (online: boolean) => {
      this.networkStatusCallback?.(online);
      
      if (online) {
        this.syncOfflineData();
      } else {
        this.enableOfflineMode();
      }
    };

    window.addEventListener('online', () => updateNetworkStatus(true));
    window.addEventListener('offline', () => updateNetworkStatus(false));

    // Initial status
    updateNetworkStatus(navigator.onLine);
  }

  private async syncOfflineData() {
    // Sync any offline data when connection is restored
    const offlineActions = this.getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await this.executeOfflineAction(action);
      } catch (error) {
        console.error('Failed to sync offline action:', error);
      }
    }
    
    this.clearOfflineActions();
  }

  private enableOfflineMode() {
    // Switch to offline mode, cache current state
    this.cacheCurrentState();
  }

  // Battery Monitoring
  private async monitorBatteryLevel() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        
        const updatePowerSaveMode = () => {
          const lowBattery = battery.level < 0.2 && !battery.charging;
          this.setPowerSaveMode(lowBattery);
        };

        battery.addEventListener('levelchange', updatePowerSaveMode);
        battery.addEventListener('chargingchange', updatePowerSaveMode);
        
        updatePowerSaveMode();
      } catch (error) {
        console.warn('Battery API not supported:', error);
      }
    }
  }

  private setPowerSaveMode(enabled: boolean) {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    if (enabled) {
      // Reduce animations, disable auto-refresh, etc.
      document.documentElement.classList.add('power-save-mode');
      this.reducePowerConsumption();
    } else {
      document.documentElement.classList.remove('power-save-mode');
      this.restoreNormalPowerConsumption();
    }
  }

  private reducePowerConsumption() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Disable auto-refresh
    this.pauseAutoRefresh();
    
    // Reduce animation duration
    const style = document.createElement('style');
    style.id = 'power-save-animations';
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.1s !important;
        animation-delay: 0s !important;
        transition-duration: 0.1s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  }

  private restoreNormalPowerConsumption() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    this.resumeAutoRefresh();
    
    const powerSaveStyle = document.getElementById('power-save-animations');
    if (powerSaveStyle) {
      powerSaveStyle.remove();
    }
  }

  // Orientation Monitoring
  private monitorOrientationChanges() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const handleOrientationChange = () => {
      // Delay to allow for orientation change completion
      setTimeout(() => {
        this.optimizeForOrientation();
      }, 500);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);
  }

  private optimizeForOrientation() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const isLandscape = window.innerWidth > window.innerHeight;
    document.documentElement.classList.toggle('landscape', isLandscape);
    document.documentElement.classList.toggle('portrait', !isLandscape);
  }

  // Performance Utilities
  public preloadCriticalResources(urls: string[]) {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    urls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = this.getResourceType(url);
      document.head.appendChild(link);
    });
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'css': return 'style';
      case 'js': return 'script';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf': return 'font';
      default: return 'fetch';
    }
  }

  public enableVirtualScrolling(container: HTMLElement, itemHeight: number, items: any[]) {
    const containerHeight = container.clientHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    const totalHeight = items.length * itemHeight;

    let startIndex = 0;

    const updateVisibleItems = () => {
      const scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleItems, items.length);

      // Create spacers
      const topSpacer = startIndex * itemHeight;
      const bottomSpacer = (items.length - endIndex) * itemHeight;

      // Trigger re-render with visible items
      this.renderVirtualItems(container, items.slice(startIndex, endIndex), topSpacer, bottomSpacer);
    };

    container.addEventListener('scroll', updateVisibleItems, { passive: true });
    updateVisibleItems();
  }

  private renderVirtualItems(container: HTMLElement, items: any[], topSpacer: number, bottomSpacer: number) {
    // This would be implemented by the calling component
    // Just providing the interface for virtual scrolling
  }

  // Lazy Loading
  public setupLazyLoading() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all images with data-src
      document.querySelectorAll('img[data-src]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  // Cache Management
  private cacheCurrentState() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const state = {
      timestamp: Date.now(),
      url: window.location.href,
      scrollPosition: window.pageYOffset
    };
    
    localStorage.setItem('offline_state', JSON.stringify(state));
  }

  private getOfflineActions(): any[] {
    // Only run in browser environment
    if (typeof window === 'undefined') return [];
    
    const actions = localStorage.getItem('offline_actions');
    return actions ? JSON.parse(actions) : [];
  }

  private async executeOfflineAction(action: any) {
    // Execute offline action when back online
    return fetch(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body
    });
  }

  private clearOfflineActions() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('offline_actions');
  }

  private pauseAutoRefresh() {
    // Implementation to pause auto-refresh timers
  }

  private resumeAutoRefresh() {
    // Implementation to resume auto-refresh timers
  }

  // Public API
  public onMemoryWarning(callback: () => void) {
    this.memoryWarningCallback = callback;
  }

  public onNetworkStatusChange(callback: (online: boolean) => void) {
    this.networkStatusCallback = callback;
  }

  public getPerformanceMetrics() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        memory: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        },
        network: {
          online: navigator.onLine,
          connection: (navigator as any).connection
        },
        battery: this.getBatteryInfo()
      };
    }
    
    return null;
  }

  private async getBatteryInfo() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (error) {
        return null;
      }
    }
    return null;
  }
}

// Export singleton instance
export const performanceManager = MobilePerformanceManager.getInstance();