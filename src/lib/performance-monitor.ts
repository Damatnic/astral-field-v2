export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  timestamp: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;
  private listeners: Array<(metric: PerformanceMetric) => void> = [];
  private timers = new Map<string, number>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupBrowserMonitoring();
    } else {
      this.setupServerMonitoring();
    }
  }

  private setupBrowserMonitoring() {
    if (!window.performance) return;

    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observePaintTiming();
    this.observeLongTasks();
    this.observeMemoryUsage();

    window.addEventListener('error', () => {
      this.recordMetric('client_error', 1, 'count');
    });

    window.addEventListener('unhandledrejection', () => {
      this.recordMetric('unhandled_rejection', 1, 'count');
    });
  }

  private observeNavigationTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            this.recordMetric('page_load_time', nav.loadEventEnd - nav.fetchStart, 'ms');
            this.recordMetric('dom_content_loaded', nav.domContentLoadedEventEnd - nav.fetchStart, 'ms');
            this.recordMetric('first_byte', nav.responseStart - nav.fetchStart, 'ms');
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      console.warn('Failed to setup navigation timing observer:', e);
    }
  }

  private observeResourceTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            const duration = resource.responseEnd - resource.startTime;
            
            if (resource.name.includes('/api/')) {
              this.recordMetric('api_call_duration', duration, 'ms', {
                url: resource.name,
                method: resource.initiatorType
              });
            } else if (resource.initiatorType === 'script') {
              this.recordMetric('script_load_time', duration, 'ms', {
                url: resource.name
              });
            } else if (resource.initiatorType === 'css') {
              this.recordMetric('css_load_time', duration, 'ms', {
                url: resource.name
              });
            }
          }
        }
      });
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Failed to setup resource timing observer:', e);
    }
  }

  private observePaintTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            this.recordMetric('first_paint', entry.startTime, 'ms');
          } else if (entry.name === 'first-contentful-paint') {
            this.recordMetric('first_contentful_paint', entry.startTime, 'ms');
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Failed to setup paint timing observer:', e);
    }
  }

  private observeLongTasks() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('long_task', entry.duration, 'ms', {
            startTime: entry.startTime
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Failed to setup long task observer:', e);
    }
  }

  private observeMemoryUsage() {
    if (typeof window === 'undefined') return;
    
    setInterval(() => {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        this.recordMetric('js_heap_used', memory.usedJSHeapSize, 'bytes');
        this.recordMetric('js_heap_limit', memory.jsHeapSizeLimit, 'bytes');
        
        const heapUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        this.recordMetric('js_heap_usage_percent', heapUsagePercent, 'percent');
        
        if (heapUsagePercent > 90) {
          console.warn('High memory usage detected:', heapUsagePercent.toFixed(2) + '%');
        }
      }
    }, 30000);
  }

  private setupServerMonitoring() {
    if (typeof process === 'undefined') return;

    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.recordMetric('server_memory_rss', memoryUsage.rss, 'bytes');
      this.recordMetric('server_memory_heap_used', memoryUsage.heapUsed, 'bytes');
      this.recordMetric('server_memory_heap_total', memoryUsage.heapTotal, 'bytes');
      
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      this.recordMetric('server_heap_usage_percent', heapUsagePercent, 'percent');
    }, 30000);

    process.on('warning', (warning) => {
      console.warn('Process warning:', warning);
      this.recordMetric('process_warning', 1, 'count', {
        name: warning.name,
        message: warning.message
      });
    });
  }

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  endTimer(name: string, metadata?: Record<string, any>): number | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    this.recordMetric(name, duration, 'ms', metadata);
    return duration;
  }

  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.notifyListeners(metric);

    if (this.isAnomalous(metric)) {
      this.handleAnomalousMetric(metric);
    }
  }

  private isAnomalous(metric: PerformanceMetric): boolean {
    const thresholds: Record<string, number> = {
      'api_call_duration': 3000,
      'page_load_time': 5000,
      'first_contentful_paint': 2500,
      'long_task': 150,
      'js_heap_usage_percent': 90,
      'server_heap_usage_percent': 85
    };

    const threshold = thresholds[metric.name];
    return threshold ? metric.value > threshold : false;
  }

  private handleAnomalousMetric(metric: PerformanceMetric): void {
    console.warn(`Performance anomaly detected: ${metric.name} = ${metric.value}${metric.unit}`);
    
    if (typeof window !== 'undefined') {
      fetch('/api/performance/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      }).catch(e => console.error('Failed to report anomaly:', e));
    }
  }

  getMetrics(name?: string, since?: number): PerformanceMetric[] {
    let filtered = this.metrics;
    
    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }
    
    return filtered;
  }

  generateReport(windowMs: number = 60000): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.getMetrics(undefined, now - windowMs);
    
    const responseTimes = recentMetrics
      .filter(m => m.name === 'api_call_duration')
      .map(m => m.value)
      .sort((a, b) => a - b);

    const errors = recentMetrics.filter(m => 
      m.name === 'client_error' || m.name === 'unhandled_rejection'
    ).length;

    const total = responseTimes.length;
    
    return {
      metrics: recentMetrics,
      summary: {
        avgResponseTime: total > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / total 
          : 0,
        p95ResponseTime: total > 0 
          ? responseTimes[Math.floor(total * 0.95)] || 0 
          : 0,
        p99ResponseTime: total > 0 
          ? responseTimes[Math.floor(total * 0.99)] || 0 
          : 0,
        errorRate: total > 0 ? (errors / total) * 100 : 0,
        throughput: (total / (windowMs / 1000))
      },
      timestamp: new Date().toISOString()
    };
  }

  subscribe(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(metric: PerformanceMetric): void {
    this.listeners.forEach(listener => listener(metric));
  }

  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

const performanceMonitor = new PerformanceMonitor();

export function startTimer(name: string): void {
  performanceMonitor.startTimer(name);
}

export function endTimer(name: string, metadata?: Record<string, any>): number | null {
  return performanceMonitor.endTimer(name, metadata);
}

export function recordMetric(
  name: string,
  value: number,
  unit: PerformanceMetric['unit'] = 'ms',
  metadata?: Record<string, any>
): void {
  performanceMonitor.recordMetric(name, value, unit, metadata);
}

export function getMetrics(name?: string, since?: number): PerformanceMetric[] {
  return performanceMonitor.getMetrics(name, since);
}

export function generatePerformanceReport(windowMs?: number): PerformanceReport {
  return performanceMonitor.generateReport(windowMs);
}

export function subscribeToMetrics(
  listener: (metric: PerformanceMetric) => void
): () => void {
  return performanceMonitor.subscribe(listener);
}

export function clearMetrics(): void {
  performanceMonitor.clear();
}

export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const timer = `function_${name}`;
    startTimer(timer);
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          endTimer(timer, { name, async: true });
        });
      }
      
      endTimer(timer, { name, async: false });
      return result;
    } catch (error) {
      endTimer(timer, { name, error: true });
      throw error;
    }
  }) as T;
}

export class PerformanceOptimizer {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private cacheTimeout = 60000;

  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = this.cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        recordMetric('cache_hit', 1, 'count', { key });
        return cached.value;
      }
      
      recordMetric('cache_miss', 1, 'count', { key });
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.then(value => {
          this.cache.set(key, { value, timestamp: Date.now() });
          this.cleanCache();
          return value;
        });
      }
      
      this.cache.set(key, { value: result, timestamp: Date.now() });
      this.cleanCache();
      return result;
    }) as T;
  }

  private cleanCache(): void {
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entries.length / 2; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  }

  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): T {
    let inThrottle = false;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    }) as T;
  }
}

export const optimizer = new PerformanceOptimizer();

export default performanceMonitor;