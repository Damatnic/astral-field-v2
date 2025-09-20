'use client';

/**
 * Enhanced Error Provider Component
 * Provides comprehensive client-side error capture and recovery mechanisms
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { errorTracker, ErrorCategory, ErrorSeverity, captureError } from '@/lib/error-tracking';

interface ErrorContextType {
  reportError: (error: Error | string, category?: ErrorCategory, context?: any) => string;
  reportUserError: (message: string, context?: any) => void;
  reportNetworkError: (error: Error, context?: any) => void;
  isOnline: boolean;
  errorCount: number;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  enableToastNotifications?: boolean;
  enableOfflineDetection?: boolean;
  maxErrorsBeforeReload?: number;
}

export function ErrorProvider({ 
  children, 
  enableToastNotifications = true,
  enableOfflineDetection = true,
  maxErrorsBeforeReload = 10
}: ErrorProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [criticalErrorCount, setCriticalErrorCount] = useState(0);

  useEffect(() => {
    if (!enableOfflineDetection) return;

    const handleOnline = () => {
      setIsOnline(true);
      if (enableToastNotifications) {
        toast.success('Connection restored', {
          duration: 3000,
          icon: '🌐'
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (enableToastNotifications) {
        toast.error('Connection lost - working offline', {
          duration: 5000,
          icon: '📡'
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableToastNotifications, enableOfflineDetection]);

  useEffect(() => {
    // Set up global error handlers with enhanced tracking
    const handleUnhandledError = (event: ErrorEvent) => {
      const errorId = captureError(event.error || event.message, ErrorCategory.SYSTEM_ERROR, {
        component: 'global-error-handler',
        url: window.location.href,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });

      setErrorCount(prev => prev + 1);

      if (enableToastNotifications) {
        toast.error('Something went wrong. We\'ve been notified.', {
          duration: 4000,
          icon: '⚠️'
        });
      }

      return errorId;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorId = captureError(event.reason, ErrorCategory.SYSTEM_ERROR, {
        component: 'promise-rejection-handler',
        url: window.location.href,
        metadata: {
          reason: event.reason
        }
      });

      setErrorCount(prev => prev + 1);

      if (enableToastNotifications) {
        toast.error('An unexpected error occurred', {
          duration: 4000,
          icon: '🔧'
        });
      }

      event.preventDefault(); // Prevent console error
      return errorId;
    };

    // Performance monitoring
    const handlePerformanceIssue = (entry: PerformanceEntry) => {
      if (entry.duration > 5000) { // More than 5 seconds
        captureError(
          new Error(`Slow operation detected: ${entry.name}`),
          ErrorCategory.PERFORMANCE_ERROR,
          {
            component: 'performance-monitor',
            metadata: {
              entryType: entry.entryType,
              duration: entry.duration,
              startTime: entry.startTime
            }
          }
        );
      }
    };

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(handlePerformanceIssue);
        });
        
        observer.observe({ entryTypes: ['longtask', 'navigation', 'resource'] });
        
        return () => {
          observer.disconnect();
        };
      } catch (error) {
        // PerformanceObserver might not be supported
      }
    }

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [enableToastNotifications]);

  // Auto-reload if too many critical errors occur
  useEffect(() => {
    if (criticalErrorCount >= 3) {
      if (enableToastNotifications) {
        toast.error('Multiple critical errors detected. Reloading page...', {
          duration: 3000,
          icon: '🔄'
        });
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else if (errorCount >= maxErrorsBeforeReload) {
      if (enableToastNotifications) {
        toast.error('Too many errors detected. Consider refreshing the page.', {
          duration: 8000,
          icon: '🔄',
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      }
    }
  }, [errorCount, criticalErrorCount, maxErrorsBeforeReload, enableToastNotifications]);

  const reportError = (
    error: Error | string, 
    category: ErrorCategory = ErrorCategory.USER_ERROR, 
    context: any = {}
  ): string => {
    const errorId = captureError(error, category, {
      component: 'ErrorProvider',
      ...context
    });

    setErrorCount(prev => prev + 1);

    // Track critical errors separately
    if (category === ErrorCategory.SYSTEM_ERROR && 
        (error instanceof Error && error.message.toLowerCase().includes('critical'))) {
      setCriticalErrorCount(prev => prev + 1);
    }

    return errorId;
  };

  const reportUserError = (message: string, context: any = {}) => {
    const errorId = reportError(new Error(message), ErrorCategory.USER_ERROR, context);
    
    if (enableToastNotifications) {
      toast.error(message, {
        duration: 4000,
        icon: '❌'
      });
    }

    return errorId;
  };

  const reportNetworkError = (error: Error, context: any = {}) => {
    const errorId = reportError(error, ErrorCategory.NETWORK_ERROR, {
      isOnline,
      ...context
    });

    if (enableToastNotifications) {
      const message = isOnline 
        ? 'Network request failed. Please try again.'
        : 'You appear to be offline. Check your connection.';
      
      toast.error(message, {
        duration: 5000,
        icon: isOnline ? '🌐' : '📡'
      });
    }

    return errorId;
  };

  const clearErrors = () => {
    setErrorCount(0);
    setCriticalErrorCount(0);
    errorTracker.clearResolvedErrors();
    
    if (enableToastNotifications) {
      toast.success('Error tracking cleared', {
        duration: 2000,
        icon: '✅'
      });
    }
  };

  const contextValue: ErrorContextType = {
    reportError,
    reportUserError,
    reportNetworkError,
    isOnline,
    errorCount,
    clearErrors
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorReporting() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorReporting must be used within an ErrorProvider');
  }
  return context;
}

// Higher-order component for automatic error boundary integration
export function withErrorReporting<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const { reportError } = useErrorReporting();

    return (
      <ErrorBoundary
        onError={(error, errorInfo) => {
          reportError(error, ErrorCategory.SYSTEM_ERROR, {
            component: componentName || Component.displayName || Component.name,
            errorInfo
          });
        }}
        fallback={
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Something went wrong</h3>
            <p className="text-red-600 text-sm mt-1">
              This component encountered an error. Please refresh the page or try again.
            </p>
          </div>
        }
      >
        <Component {...props} ref={ref} />
      </ErrorBoundary>
    );
  });

  WrappedComponent.displayName = `withErrorReporting(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for async operation error handling
export function useAsyncErrorHandler() {
  const { reportError, reportNetworkError } = useErrorReporting();

  return {
    handleAsyncError: async <T>(
      operation: () => Promise<T>,
      options: {
        category?: ErrorCategory;
        context?: any;
        showToast?: boolean;
        fallbackValue?: T;
      } = {}
    ): Promise<T | undefined> => {
      try {
        return await operation();
      } catch (error) {
        const { category = ErrorCategory.SYSTEM_ERROR, context = {}, fallbackValue } = options;
        
        if (error instanceof Error && error.message.includes('fetch')) {
          reportNetworkError(error, context);
        } else {
          reportError(error as Error, category, context);
        }

        return fallbackValue;
      }
    }
  };
}

// Import ErrorBoundary from the existing component
import ErrorBoundary from '../ErrorBoundary';

export default ErrorProvider;