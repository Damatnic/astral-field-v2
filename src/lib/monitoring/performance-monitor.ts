/**
 * Performance Monitoring System
 * Comprehensive performance tracking and alerting
 */

import { prisma } from '@/lib/prisma';

export interface PerformanceMetric {
  id?: string;
  metricType: 'page_load' | 'api_response' | 'database_query' | 'component_render' | 'user_interaction';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceAlert {
  id?: string;
  alertType: 'slow_query' | 'high_memory' | 'slow_page_load' | 'error_rate' | 'user_experience';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  resolved: boolean;
  timestamp: Date;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    slowPageLoad: 3000,      // 3 seconds
    slowApiResponse: 1000,   // 1 second
    slowDbQuery: 500,        // 500ms
    slowComponentRender: 100, // 100ms
    errorRateThreshold: 0.05  // 5%
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // ==================== METRIC COLLECTION ====================

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Check for performance issues
    this.checkThresholds(fullMetric);

    // Persist critical metrics to database
    if (this.isCriticalMetric(fullMetric)) {
      await this.persistMetric(fullMetric);
    }

    // In development, log all metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.metricType}: ${metric.name} = ${metric.value}${metric.unit}`);
    }
  }

  /**
   * Record page load performance
   */
  recordPageLoad(pageName: string, loadTime: number, userId?: string): void {
    this.recordMetric({
      metricType: 'page_load',
      name: pageName,
      value: loadTime,
      unit: 'ms',
      userId,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    });
  }

  /**
   * Record API response performance
   */
  recordApiResponse(endpoint: string, responseTime: number, statusCode?: number): void {
    this.recordMetric({
      metricType: 'api_response',
      name: endpoint,
      value: responseTime,
      unit: 'ms',
      additionalData: {
        statusCode,
        success: statusCode ? statusCode < 400 : true
      }
    });
  }

  /**
   * Record database query performance
   */
  recordDbQuery(queryName: string, executionTime: number, recordCount?: number): void {
    this.recordMetric({
      metricType: 'database_query',
      name: queryName,
      value: executionTime,
      unit: 'ms',
      additionalData: {
        recordCount
      }
    });
  }

  /**
   * Record component render performance
   */
  recordComponentRender(componentName: string, renderTime: number, propsSize?: number): void {
    this.recordMetric({
      metricType: 'component_render',
      name: componentName,
      value: renderTime,
      unit: 'ms',
      additionalData: {
        propsSize
      }
    });
  }

  /**
   * Record user interaction performance
   */
  recordUserInteraction(interactionType: string, responseTime: number, userId?: string): void {
    this.recordMetric({
      metricType: 'user_interaction',
      name: interactionType,
      value: responseTime,
      unit: 'ms',
      userId
    });
  }

  // ==================== PERFORMANCE DECORATORS ====================

  /**
   * Decorator for timing function execution
   */
  static timed(metricName: string, metricType: PerformanceMetric['metricType'] = 'api_response') {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = performance.now();
        
        try {
          const result = await method.apply(this, args);
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          PerformanceMonitor.getInstance().recordMetric({
            metricType,
            name: metricName,
            value: duration,
            unit: 'ms'
          });
          
          return result;
        } catch (error) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          PerformanceMonitor.getInstance().recordMetric({
            metricType,
            name: `${metricName}_error`,
            value: duration,
            unit: 'ms',
            additionalData: {
              error: error.message
            }
          });
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Wrap async functions with performance monitoring
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    metricName: string,
    metricType: PerformanceMetric['metricType'] = 'api_response'
  ): T {
    return (async (...args: any[]) => {
      const startTime = performance.now();
      
      try {
        const result = await fn(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        PerformanceMonitor.getInstance().recordMetric({
          metricType,
          name: metricName,
          value: duration,
          unit: 'ms'
        });
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        PerformanceMonitor.getInstance().recordMetric({
          metricType,
          name: `${metricName}_error`,
          value: duration,
          unit: 'ms',
          additionalData: {
            error: error.message
          }
        });
        
        throw error;
      }
    }) as T;
  }

  // ==================== THRESHOLD MONITORING ====================

  /**
   * Check if a metric exceeds performance thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    let shouldAlert = false;
    let severity: PerformanceAlert['severity'] = 'low';

    switch (metric.metricType) {
      case 'page_load':
        if (metric.value > this.thresholds.slowPageLoad) {
          shouldAlert = true;
          severity = metric.value > this.thresholds.slowPageLoad * 2 ? 'high' : 'medium';
        }
        break;

      case 'api_response':
        if (metric.value > this.thresholds.slowApiResponse) {
          shouldAlert = true;
          severity = metric.value > this.thresholds.slowApiResponse * 3 ? 'high' : 'medium';
        }
        break;

      case 'database_query':
        if (metric.value > this.thresholds.slowDbQuery) {
          shouldAlert = true;
          severity = metric.value > this.thresholds.slowDbQuery * 4 ? 'high' : 'medium';
        }
        break;

      case 'component_render':
        if (metric.value > this.thresholds.slowComponentRender) {
          shouldAlert = true;
          severity = metric.value > this.thresholds.slowComponentRender * 5 ? 'medium' : 'low';
        }
        break;
    }

    if (shouldAlert) {
      this.createAlert({
        alertType: this.getAlertType(metric.metricType),
        severity,
        message: `Slow ${metric.metricType}: ${metric.name} took ${metric.value}ms`,
        details: {
          metric: metric.name,
          value: metric.value,
          threshold: this.getThreshold(metric.metricType),
          url: metric.url,
          additionalData: metric.additionalData
        },
        resolved: false
      });
    }
  }

  private getAlertType(metricType: PerformanceMetric['metricType']): PerformanceAlert['alertType'] {
    switch (metricType) {
      case 'page_load':
        return 'slow_page_load';
      case 'database_query':
        return 'slow_query';
      default:
        return 'user_experience';
    }
  }

  private getThreshold(metricType: PerformanceMetric['metricType']): number {
    switch (metricType) {
      case 'page_load':
        return this.thresholds.slowPageLoad;
      case 'api_response':
        return this.thresholds.slowApiResponse;
      case 'database_query':
        return this.thresholds.slowDbQuery;
      case 'component_render':
        return this.thresholds.slowComponentRender;
      default:
        return 0;
    }
  }

  // ==================== ALERTING ====================

  /**
   * Create a performance alert
   */
  private async createAlert(alert: Omit<PerformanceAlert, 'timestamp'>): Promise<void> {
    const fullAlert: PerformanceAlert = {
      ...alert,
      timestamp: new Date()
    };

    this.alerts.push(fullAlert);

    // Log alert
    console.warn(`[Performance Alert] ${alert.severity.toUpperCase()}: ${alert.message}`, alert.details);

    // Send to external monitoring service in production
    if (process.env.NODE_ENV === 'production' && alert.severity !== 'low') {
      await this.sendAlertToMonitoring(fullAlert);
    }

    // Persist critical alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await this.persistAlert(fullAlert);
    }
  }

  /**
   * Send alert to external monitoring service
   */
  private async sendAlertToMonitoring(alert: PerformanceAlert): Promise<void> {
    try {
      if (process.env.MONITORING_WEBHOOK_URL) {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'AstralField',
            alert_type: alert.alertType,
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            timestamp: alert.timestamp.toISOString()
          })
        });
      }
    } catch (error) {
      console.error('Failed to send alert to monitoring service:', error);
    }
  }

  // ==================== DATA PERSISTENCE ====================

  /**
   * Check if a metric is critical enough to persist
   */
  private isCriticalMetric(metric: PerformanceMetric): boolean {
    switch (metric.metricType) {
      case 'page_load':
        return metric.value > this.thresholds.slowPageLoad;
      case 'api_response':
        return metric.value > this.thresholds.slowApiResponse || !metric.additionalData?.success;
      case 'database_query':
        return metric.value > this.thresholds.slowDbQuery;
      default:
        return false;
    }
  }

  /**
   * Persist metric to database
   */
  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Store in a separate performance metrics table or external service
      console.log('Persisting critical metric:', metric);
      
      // In production, you might send to a service like DataDog, New Relic, etc.
      if (process.env.ANALYTICS_API_URL) {
        await fetch(process.env.ANALYTICS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metric)
        });
      }
    } catch (error) {
      console.error('Failed to persist metric:', error);
    }
  }

  /**
   * Persist alert to database
   */
  private async persistAlert(alert: PerformanceAlert): Promise<void> {
    try {
      console.log('Persisting critical alert:', alert);
      
      // Store in audit log or monitoring table
      if (process.env.NODE_ENV === 'production') {
        await prisma.auditLog.create({
          data: {
            userId: 'system',
            action: 'PERFORMANCE_ALERT',
            details: JSON.stringify(alert),
            ipAddress: '127.0.0.1',
            userAgent: 'PerformanceMonitor'
          }
        });
      }
    } catch (error) {
      console.error('Failed to persist alert:', error);
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange: '1h' | '24h' | '7d' = '24h'): any {
    const cutoff = new Date();
    switch (timeRange) {
      case '1h':
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case '24h':
        cutoff.setHours(cutoff.getHours() - 24);
        break;
      case '7d':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
    }

    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    return {
      totalMetrics: recentMetrics.length,
      averagePageLoad: this.calculateAverage(recentMetrics, 'page_load'),
      averageApiResponse: this.calculateAverage(recentMetrics, 'api_response'),
      averageDbQuery: this.calculateAverage(recentMetrics, 'database_query'),
      slowestQueries: this.getSlowestQueries(recentMetrics, 10),
      alertCount: this.alerts.filter(a => a.timestamp > cutoff).length,
      criticalAlerts: this.alerts.filter(a => a.timestamp > cutoff && a.severity === 'critical').length
    };
  }

  private calculateAverage(metrics: PerformanceMetric[], type: string): number {
    const filtered = metrics.filter(m => m.metricType === type);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / filtered.length);
  }

  private getSlowestQueries(metrics: PerformanceMetric[], limit: number): PerformanceMetric[] {
    return metrics
      .filter(m => m.metricType === 'database_query')
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  /**
   * Clear old metrics and alerts to prevent memory leaks
   */
  cleanup(): void {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24); // Keep last 24 hours in memory

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-cleanup every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitor.cleanup();
  }, 3600000); // 1 hour
}