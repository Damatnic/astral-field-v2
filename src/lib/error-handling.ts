/**
 * Centralized error handling utilities
 */

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class AppError extends Error {
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  
  constructor(message: string, context: ErrorContext = {}) {
    super(message);
    this.name = 'AppError';
    this.context = context;
    this.timestamp = new Date();
  }
}

/**
 * Log errors to console in development, send to monitoring in production
 */
export function logError(error: Error | string, context: ErrorContext = {}): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  if (process.env.NODE_ENV === 'development') {
    // In development, we can use console for debugging
    // eslint-disable-next-line no-console
    console.error('Error:', errorObj.message, 'Context:', context);
  } else {
    // In production, log errors to a monitoring service
    // Using a lightweight error tracking approach
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      // Client-side: Send error to API endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: errorObj.message,
          stack: errorObj.stack,
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    }
    // Server-side errors are logged via the API directly
  }
}

/**
 * Handle authentication errors
 */
export function handleAuthError(error: Error, operation: string): void {
  logError(error, {
    component: 'Auth',
    operation,
  });
}

/**
 * Handle API errors
 */
export function handleApiError(error: Error, endpoint: string, userId?: string): void {
  logError(error, {
    component: 'API',
    operation: endpoint,
    userId,
  });
}

/**
 * Handle component errors
 */
export function handleComponentError(error: Error, component: string, operation: string = 'unknown'): void {
  logError(error, {
    component,
    operation,
  });
}