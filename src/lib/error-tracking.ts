/**
 * Comprehensive Error Tracking and Monitoring System
 * Provides production-ready error monitoring with classification, reporting, and recovery
 */

import { logger, logError, logSecurity, logPerformance } from './logger';
import * as Sentry from '@sentry/nextjs';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better classification
export enum ErrorCategory {
  USER_ERROR = 'user_error',
  SYSTEM_ERROR = 'system_error',
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  AUTHENTICATION_ERROR = 'auth_error',
  AUTHORIZATION_ERROR = 'authz_error',
  VALIDATION_ERROR = 'validation_error',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  PERFORMANCE_ERROR = 'performance_error',
  INTEGRATION_ERROR = 'integration_error'
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  ip?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  stack?: string;
  timestamp?: Date;
}

// Structured error interface
export interface StructuredError {
  id: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  fingerprint?: string;
  count?: number;
  firstSeen?: Date;
  lastSeen?: Date;
  resolved?: boolean;
  source?: 'client' | 'server' | 'edge';
}

// Error metrics for tracking patterns
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByComponent: Record<string, number>;
  topErrors: Array<{ fingerprint: string; count: number; message: string }>;
  errorRate: number;
  timeRange: { start: Date; end: Date };
}

// Error budget configuration
export interface ErrorBudget {
  period: 'hour' | 'day' | 'week' | 'month';
  threshold: number;
  currentCount: number;
  lastReset: Date;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorQueue: StructuredError[] = [];
  private errorBudgets: Map<string, ErrorBudget> = new Map();
  private isOnline = true;
  private maxQueueSize = 1000;
  private errorCounts: Map<string, number> = new Map();
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {
    this.initializeErrorTracking();
    this.setupErrorBudgets();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private initializeErrorTracking(): void {
    if (typeof window !== 'undefined') {
      // Browser-specific initialization
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushErrorQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // Global error handlers
      window.addEventListener('error', (event) => {
        this.captureError(event.error, ErrorCategory.SYSTEM_ERROR, {
          component: 'global',
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(event.reason, ErrorCategory.SYSTEM_ERROR, {
          component: 'promise',
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      });

      // Resource loading errors
      window.addEventListener('error', (event) => {
        const target = event.target as any;
        if (target && target !== window) {
          this.captureError(
            new Error(`Failed to load resource: ${target.src || target.href}`),
            ErrorCategory.NETWORK_ERROR,
            {
              component: 'resource-loader',
              metadata: {
                elementType: target.tagName,
                source: target.src || target.href
              }
            }
          );
        }
      }, true);
    }
  }

  private setupErrorBudgets(): void {
    // Define error budgets for different categories
    this.errorBudgets.set('critical_hourly', {
      period: 'hour',
      threshold: 5,
      currentCount: 0,
      lastReset: new Date()
    });

    this.errorBudgets.set('high_daily', {
      period: 'day',
      threshold: 50,
      currentCount: 0,
      lastReset: new Date()
    });

    this.errorBudgets.set('medium_daily', {
      period: 'day',
      threshold: 200,
      currentCount: 0,
      lastReset: new Date()
    });
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: Error | string, context: ErrorContext): string {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    
    // Create a fingerprint based on error message, component, and stack trace pattern
    const components = [
      message.replace(/\d+/g, 'N'), // Replace numbers with N
      context.component || 'unknown',
      stack ? stack.split('\n')[0] : ''
    ];
    
    return btoa(components.join('|')).substr(0, 16);
  }

  private classifyError(error: Error | string, context: ErrorContext): {
    severity: ErrorSeverity;
    category: ErrorCategory;
  } {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    // Determine severity
    let severity = ErrorSeverity.MEDIUM;
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
      severity = ErrorSeverity.CRITICAL;
    } else if (lowerMessage.includes('database') || lowerMessage.includes('connection')) {
      severity = ErrorSeverity.HIGH;
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('deprecated')) {
      severity = ErrorSeverity.LOW;
    }

    // Determine category
    let category = ErrorCategory.SYSTEM_ERROR;
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      category = ErrorCategory.NETWORK_ERROR;
    } else if (lowerMessage.includes('database') || lowerMessage.includes('prisma')) {
      category = ErrorCategory.DATABASE_ERROR;
    } else if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized')) {
      category = ErrorCategory.AUTHENTICATION_ERROR;
    } else if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
      category = ErrorCategory.AUTHORIZATION_ERROR;
    } else if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      category = ErrorCategory.VALIDATION_ERROR;
    } else if (context.component === 'user-input') {
      category = ErrorCategory.USER_ERROR;
    }

    return { severity, category };
  }

  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized = { ...context };
    
    // Remove sensitive data
    if (sanitized.metadata) {
      const { password, token, apiKey, secret, ...safeMeta } = sanitized.metadata;
      sanitized.metadata = safeMeta;
    }

    // Truncate long strings
    if (sanitized.stack && sanitized.stack.length > 5000) {
      sanitized.stack = sanitized.stack.substring(0, 5000) + '... [truncated]';
    }

    return sanitized;
  }

  private checkRateLimit(fingerprint: string): boolean {
    const now = Date.now();
    const key = `rate_limit_${fingerprint}`;
    const limit = this.rateLimitCache.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset rate limit window (5 minutes)
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + (5 * 60 * 1000)
      });
      return true;
    }

    if (limit.count >= 10) { // Max 10 errors per 5 minutes per fingerprint
      return false;
    }

    limit.count++;
    return true;
  }

  private updateErrorBudgets(severity: ErrorSeverity): void {
    const now = new Date();
    
    this.errorBudgets.forEach((budget, key) => {
      // Reset budget if period has passed
      const timeDiff = now.getTime() - budget.lastReset.getTime();
      const resetThreshold = budget.period === 'hour' ? 3600000 : 
                           budget.period === 'day' ? 86400000 :
                           budget.period === 'week' ? 604800000 : 2592000000;

      if (timeDiff > resetThreshold) {
        budget.currentCount = 0;
        budget.lastReset = now;
      }

      // Increment count for relevant budgets
      if ((key.includes('critical') && severity === ErrorSeverity.CRITICAL) ||
          (key.includes('high') && severity === ErrorSeverity.HIGH) ||
          (key.includes('medium') && severity === ErrorSeverity.MEDIUM)) {
        budget.currentCount++;

        // Check if budget exceeded
        if (budget.currentCount > budget.threshold) {
          this.alertErrorBudgetExceeded(key, budget);
        }
      }
    });
  }

  private alertErrorBudgetExceeded(budgetName: string, budget: ErrorBudget): void {
    const alertError = new Error(`Error budget exceeded: ${budgetName}`);
    logSecurity('error_budget_exceeded', {
      budgetName,
      threshold: budget.threshold,
      currentCount: budget.currentCount,
      period: budget.period
    });

    // Send critical alert
    this.sendCriticalAlert({
      type: 'error_budget_exceeded',
      budgetName,
      details: budget
    });
  }

  public captureError(
    error: Error | string | any,
    category?: ErrorCategory,
    context: Partial<ErrorContext> = {}
  ): string {
    try {
      const errorId = this.generateErrorId();
      const timestamp = new Date();
      
      // Ensure we have a proper error object
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Build context with defaults
      const fullContext: ErrorContext = {
        userId: context.userId,
        sessionId: context.sessionId || this.generateSessionId(),
        requestId: context.requestId,
        userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'server'),
        url: context.url || (typeof window !== 'undefined' ? window.location.href : 'server'),
        ip: context.ip,
        component: context.component || 'unknown',
        action: context.action,
        metadata: context.metadata,
        stack: errorObj.stack,
        timestamp,
        ...this.sanitizeContext(context)
      };

      // Generate fingerprint for deduplication
      const fingerprint = this.generateFingerprint(errorObj, fullContext);

      // Check rate limiting
      if (!this.checkRateLimit(fingerprint)) {
        return errorId; // Skip this error due to rate limiting
      }

      // Classify error
      const { severity, category: autoCategory } = this.classifyError(errorObj, fullContext);
      const finalCategory = category || autoCategory;

      // Create structured error
      const structuredError: StructuredError = {
        id: errorId,
        message: errorObj.message,
        severity,
        category: finalCategory,
        context: fullContext,
        fingerprint,
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        resolved: false,
        source: typeof window !== 'undefined' ? 'client' : 'server'
      };

      // Update error budgets
      this.updateErrorBudgets(severity);

      // Add to queue
      this.addToQueue(structuredError);

      // Log error with structured logging
      logError(errorObj, {
        errorId,
        severity,
        category: finalCategory,
        fingerprint,
        component: fullContext.component,
        userId: fullContext.userId
      });

      // Send to monitoring services
      this.sendToMonitoring(structuredError);

      // Send critical alerts if needed
      if (severity === ErrorSeverity.CRITICAL) {
        this.sendCriticalAlert({
          type: 'critical_error',
          error: structuredError
        });
      }

      return errorId;
    } catch (trackingError) {
      // Fallback logging if error tracking itself fails
      console.error('Error tracking failed:', trackingError);
      logError(trackingError as Error, { context: 'error_tracking_failure' });
      return 'error_tracking_failed';
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToQueue(error: StructuredError): void {
    // Check if error already exists in queue (deduplication)
    const existingIndex = this.errorQueue.findIndex(e => e.fingerprint === error.fingerprint);
    
    if (existingIndex !== -1) {
      // Update existing error
      const existing = this.errorQueue[existingIndex];
      existing.count = (existing.count || 1) + 1;
      existing.lastSeen = error.lastSeen;
    } else {
      // Add new error
      this.errorQueue.push(error);
    }

    // Trim queue if too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0));
      this.errorQueue = this.errorQueue.slice(0, this.maxQueueSize);
    }

    // Store in localStorage for persistence
    this.persistErrors();
  }

  private persistErrors(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const recentErrors = this.errorQueue.slice(-100); // Keep last 100 errors
        localStorage.setItem('astral_field_error_queue', JSON.stringify(recentErrors));
      }
    } catch (storageError) {
      // Silent fail
    }
  }

  private async sendToMonitoring(error: StructuredError): Promise<void> {
    try {
      // Send to Sentry
      Sentry.withScope((scope) => {
        scope.setTag('errorId', error.id);
        scope.setTag('severity', error.severity);
        scope.setTag('category', error.category);
        scope.setTag('component', error.context.component);
        scope.setContext('errorContext', error.context as Record<string, any>);
        
        if (error.context.userId) {
          scope.setUser({ id: error.context.userId });
        }

        Sentry.captureException(new Error(error.message), {
          fingerprint: [error.fingerprint],
          level: this.mapSeverityToSentryLevel(error.severity)
        });
      });

      // Send to internal error API if online
      if (this.isOnline && typeof fetch !== 'undefined') {
        await fetch('/api/errors/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error)
        }).catch(() => {
          // Silent fail for API errors
        });
      }
    } catch (monitoringError) {
      // Silent fail to prevent infinite loops
    }
  }

  private mapSeverityToSentryLevel(severity: ErrorSeverity): 'error' | 'warning' | 'info' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'fatal';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.MEDIUM: return 'warning';
      case ErrorSeverity.LOW: return 'info';
      default: return 'error';
    }
  }

  private async sendCriticalAlert(alert: {
    type: string;
    error?: StructuredError;
    budgetName?: string;
    details?: any;
  }): Promise<void> {
    try {
      // Log critical alert
      logSecurity('critical_alert', alert);

      // Send to monitoring webhook if configured
      if (process.env.CRITICAL_ALERT_WEBHOOK) {
        await fetch(process.env.CRITICAL_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...alert,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
          })
        }).catch(() => {
          // Silent fail
        });
      }
    } catch (alertError) {
      // Silent fail
    }
  }

  private flushErrorQueue(): void {
    const errors = [...this.errorQueue];
    this.errorQueue = [];

    errors.forEach(error => {
      this.sendToMonitoring(error);
    });
  }

  public getErrorMetrics(timeRange?: { start: Date; end: Date }): ErrorMetrics {
    const start = timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    const end = timeRange?.end || new Date();

    const relevantErrors = this.errorQueue.filter(error => 
      error.lastSeen && error.lastSeen >= start && error.lastSeen <= end
    );

    const metrics: ErrorMetrics = {
      totalErrors: relevantErrors.reduce((sum, error) => sum + (error.count || 1), 0),
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByComponent: {},
      topErrors: [],
      errorRate: 0,
      timeRange: { start, end }
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      metrics.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      metrics.errorsBySeverity[severity] = 0;
    });

    // Calculate metrics
    relevantErrors.forEach(error => {
      const count = error.count || 1;
      metrics.errorsByCategory[error.category] += count;
      metrics.errorsBySeverity[error.severity] += count;
      
      const component = error.context.component || 'unknown';
      metrics.errorsByComponent[component] = (metrics.errorsByComponent[component] || 0) + count;
    });

    // Calculate top errors
    metrics.topErrors = relevantErrors
      .sort((a, b) => (b.count || 1) - (a.count || 1))
      .slice(0, 10)
      .map(error => ({
        fingerprint: error.fingerprint || '',
        count: error.count || 1,
        message: error.message
      }));

    // Calculate error rate (errors per hour)
    const hoursDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    metrics.errorRate = hoursDiff > 0 ? metrics.totalErrors / hoursDiff : 0;

    return metrics;
  }

  public resolveError(fingerprint: string): void {
    const error = this.errorQueue.find(e => e.fingerprint === fingerprint);
    if (error) {
      error.resolved = true;
      this.persistErrors();
    }
  }

  public clearResolvedErrors(): void {
    this.errorQueue = this.errorQueue.filter(error => !error.resolved);
    this.persistErrors();
  }

  public getErrorBudgets(): Map<string, ErrorBudget> {
    return new Map(this.errorBudgets);
  }

  public getRecentErrors(limit: number = 50): StructuredError[] {
    return this.errorQueue
      .sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0))
      .slice(0, limit);
  }
}

// Singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Convenience functions
export const captureError = (
  error: Error | string | any,
  category?: ErrorCategory,
  context?: Partial<ErrorContext>
): string => {
  return errorTracker.captureError(error, category, context);
};

export const captureUserError = (
  error: Error | string | any,
  context?: Partial<ErrorContext>
): string => {
  return errorTracker.captureError(error, ErrorCategory.USER_ERROR, context);
};

export const captureSystemError = (
  error: Error | string | any,
  context?: Partial<ErrorContext>
): string => {
  return errorTracker.captureError(error, ErrorCategory.SYSTEM_ERROR, context);
};

export const captureDatabaseError = (
  error: Error | string | any,
  context?: Partial<ErrorContext>
): string => {
  return errorTracker.captureError(error, ErrorCategory.DATABASE_ERROR, context);
};

export const captureNetworkError = (
  error: Error | string | any,
  context?: Partial<ErrorContext>
): string => {
  return errorTracker.captureError(error, ErrorCategory.NETWORK_ERROR, context);
};

export const capturePerformanceError = (
  error: Error | string | any,
  context?: Partial<ErrorContext>
): string => {
  return errorTracker.captureError(error, ErrorCategory.PERFORMANCE_ERROR, context);
};

// Performance monitoring helper
export const withErrorTracking = <T extends (...args: any[]) => any>(
  fn: T,
  component: string,
  category: ErrorCategory = ErrorCategory.SYSTEM_ERROR
): T => {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorTracker.captureError(error, category, { component });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorTracker.captureError(error, category, { component });
      throw error;
    }
  }) as T;
};

// React error boundary integration
export const withErrorBoundary = (component: string) => {
  return (error: Error, errorInfo: any) => {
    errorTracker.captureError(error, ErrorCategory.SYSTEM_ERROR, {
      component,
      metadata: { errorInfo }
    });
  };
};

export default errorTracker;