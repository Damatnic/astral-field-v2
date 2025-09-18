// Performance optimization utilities for fantasy football platform
import React from 'react';

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  private static observers: PerformanceObserver[] = [];

  // Start performance monitoring
  static initialize() {
    if (typeof window === 'undefined') return;

    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor user interactions
    this.observeUserTiming();
    
    // Monitor memory usage
    this.observeMemoryUsage();
  }

  private static observeWebVitals() {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('LCP', entry.startTime);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('FID', (entry as any).processingStart - entry.startTime);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.push(fidObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);
  }

  private static observeResourceTiming() {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Monitor slow API calls
        if (resource.name.includes('/api/')) {
          const duration = resource.responseEnd - resource.requestStart;
          this.recordMetric('API_Response_Time', duration);
          
          // Alert on slow API calls
          if (duration > 2000) {}
        }
        
        // Monitor large assets
        if (resource.transferSize > 1000000) { // 1MB
          console.warn(`Large asset loaded: ${resource.name} (${resource.transferSize} bytes)`);
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  private static observeUserTiming() {
    const userTimingObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(`User_${entry.name}`, entry.duration || entry.startTime);
      }
    });
    userTimingObserver.observe({ entryTypes: ['measure', 'mark'] });
    this.observers.push(userTimingObserver);
  }

  private static observeMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('Memory_Used', memory.usedJSHeapSize);
        this.recordMetric('Memory_Total', memory.totalJSHeapSize);
        
        // Alert on high memory usage
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn(`High memory usage: ${usagePercent.toFixed(1)}%`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private static recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Keep only last 100 measurements
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.shift();
    }
  }

  // Get performance metrics
  static getMetrics() {
    const result: Record<string, any> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[name] = {
          current: values[values.length - 1],
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    
    return result;
  }

  // Cleanup observers
  static cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// React performance optimization utilities
export class ReactOptimizer {
  // Lazy load component with error boundary
  static lazyWithErrorBoundary<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ReactElement
  ) {
    const LazyComponent = React.lazy(importFunc);
    
    const WrappedComponent = (props: React.ComponentProps<T>) =>
      React.createElement(React.Suspense, { fallback: fallback || React.createElement('div', null, 'Loading...') },
        React.createElement(ErrorBoundary, null,
          React.createElement(LazyComponent, props)
        )
      );
    
    return WrappedComponent;
  }

  // Memoize expensive calculations
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    getKey?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map();
    
    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn(...args);
      cache.set(key, result);
      
      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    }) as T;
  }

  // Debounce function calls
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T {
    let timeout: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  // Throttle function calls
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    handleComponentError(error, errorInfo as Error, 'performance');
    
    // Send error to monitoring service
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('componentError', {
        detail: { error, errorInfo }
      }));
    }
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: "p-4 border border-red-500 rounded-lg bg-red-50" },
        React.createElement('h3', { className: "text-red-800 font-bold" }, 'Something went wrong'),
        React.createElement('p', { className: "text-red-600" }, 'This component failed to load properly.')
      );
    }

    return this.props.children;
  }
}

// API optimization utilities
export class APIOptimizer {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static pendingRequests = new Map<string, Promise<any>>();

  // Cache API responses
  static async cachedFetch(
    url: string, 
    options: RequestInit = {}, 
    ttl: number = 300000 // 5 minutes default
  ) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Make request
    const requestPromise = fetch(url, options).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => {
      // Cache response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl
      });
      
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
      
      return data;
    }).catch(error => {
      // Clean up pending request on error
      this.pendingRequests.delete(cacheKey);
      throw error;
    });
    
    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Batch multiple API calls
  static batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number = 5
  ): Promise<T[]> {
    const batches: Array<Array<() => Promise<T>>> = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches.reduce(async (acc, batch) => {
      const results = await acc;
      const batchResults = await Promise.all(batch.map(req => req()));
      return [...results, ...batchResults];
    }, Promise.resolve([] as T[]));
  }

  // Clear expired cache entries
  static cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Bundle size optimization
export class BundleOptimizer {
  // Dynamically import modules
  static async loadModule<T>(
    modulePath: string
  ): Promise<T> {
    try {
      const moduleExports = await import(modulePath);
      return moduleExports.default || moduleExports;
    } catch (error) {
      handleComponentError(error as Error, 'performance');
      throw error;
    }
  }

  // Preload critical resources
  static preloadResource(href: string, as: string) {
    if (typeof document === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }

  // Prefetch next page resources
  static prefetchPage(path: string) {
    if (typeof document === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
  }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.initialize();
  
  // Cleanup cache periodically
  setInterval(() => {
    APIOptimizer.cleanupCache();
  }, 300000); // Every 5 minutes
  
  // Report performance metrics periodically
  setInterval(() => {
    const metrics = PerformanceMonitor.getMetrics();}, 60000); // Every minute
}

