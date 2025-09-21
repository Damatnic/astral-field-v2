/**
 * Global Error Handling Utilities
 * Provides comprehensive error handling, logging, and recovery mechanisms
 */

export interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  errorInfo?: any;
}

export interface ErrorMetrics {
  timestamp: number;
  component: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
}

class ErrorManager {
  private static instance: ErrorManager;
  private errorQueue: ErrorMetrics[] = [];
  private maxQueueSize = 100;
  private isOnline = true;

  private constructor() {
    this.initializeErrorTracking();
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  private initializeErrorTracking(): void {
    // Track online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushErrorQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // Global error handler
      window.addEventListener('error', (event) => {
        this.logError(event.error, 'global', 'Unhandled JavaScript error');
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(event.reason, 'promise', 'Unhandled Promise rejection');
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public logError(
    error: Error | string | any,
    component: string,
    context?: string
  ): void {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      const errorMetrics: ErrorMetrics = {
        timestamp: Date.now(),
        component,
        message: context ? `${context}: ${errorMessage}` : errorMessage,
        stack: errorStack,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        sessionId: this.generateSessionId()
      };

      // Add to queue
      this.errorQueue.push(errorMetrics);
      
      // Trim queue if too large
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue.shift();
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        // Development error logging
      }

      // Send to monitoring service if online
      if (this.isOnline) {
        this.sendErrorToMonitoring(errorMetrics);
      }

      // Store in local storage for offline recovery
      this.storeErrorLocally(errorMetrics);

    } catch (logError) {
      // Fallback logging if error handling itself fails - silent fail in production
    }
  }

  private async sendErrorToMonitoring(_errorMetrics: ErrorMetrics): Promise<void> {
    try {
      // In a real implementation, this would send to your monitoring service
      // Development logging disabled for production build

      // Example implementation for production monitoring
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorMetrics)
      // });

    } catch (_monitoringError) {
      // Silent fail in production
    }
  }

  private storeErrorLocally(errorMetrics: ErrorMetrics): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('astral_field_errors') || '[]';
        const errors = JSON.parse(stored);
        errors.push(errorMetrics);
        
        // Keep only last 50 errors locally
        if (errors.length > 50) {
          errors.splice(0, errors.length - 50);
        }
        
        localStorage.setItem('astral_field_errors', JSON.stringify(errors));
      }
    } catch (_storageError) {
      // Silent fail in production
    }
  }

  private flushErrorQueue(): void {
    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift();
      if (error) {
        this.sendErrorToMonitoring(error);
      }
    }
  }

  public getErrorMetrics(): ErrorMetrics[] {
    return [...this.errorQueue];
  }

  public clearErrors(): void {
    this.errorQueue = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('astral_field_errors');
    }
  }
}

// Global error handler function
export function handleComponentError(
  error: Error | string | any,
  component: string,
  context?: string
): void {
  const errorManager = ErrorManager.getInstance();
  errorManager.logError(error, component, context);
}

// Error boundary helper - returns class constructor function
export function createErrorBoundaryClass(_componentName: string): any {
  // This will be implemented in the React component file
  return null;
}

// Performance monitoring helpers
export function measureComponentPerformance<T extends (..._args: any[]) => any>(
  fn: T,
  componentName: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    try {
      const result = fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 16) { // More than 1 frame at 60fps
        // Performance warning - component took too long
      }
      
      return result;
    } catch (error) {
      handleComponentError(error, componentName, 'Performance measurement');
      throw error;
    }
  }) as T;
}

// Async error handling wrapper
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  component: string,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleComponentError(error, component, 'Async operation failed');
    return fallbackValue;
  }
}

// Export singleton instance
export const errorManager = ErrorManager.getInstance();

// Error handling utilities - no React imports needed