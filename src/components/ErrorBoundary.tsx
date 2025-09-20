'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Use comprehensive error tracking system
    if (typeof window !== 'undefined') {
      const { captureError, ErrorCategory } = require('@/lib/error-tracking');
      
      const errorId = captureError(error, ErrorCategory.SYSTEM_ERROR, {
        component: 'ErrorBoundary',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: errorInfo.errorBoundary,
          errorInfo: errorInfo
        }
      });

      // Store error ID for user reference
      this.setState({ errorId });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full">
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              {/* Error Icon */}
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 mb-8">
                We encountered an unexpected error while loading this page. 
                Our team has been notified and is working to fix it.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6 text-left"
                >
                  <div className="flex items-center mb-2">
                    <Bug className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Error Details (Development)
                    </span>
                  </div>
                  <code className="text-xs text-red-600 block whitespace-pre-wrap">
                    {this.state.error.name}: {this.state.error.message}
                  </code>
                  <div className="mt-2 text-xs text-gray-500">
                    Error ID: {this.state.errorId}
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.href = '/'}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </motion.button>
              </div>

              {/* Support Contact */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-gray-500 mt-6"
              >
                If this problem persists, please contact support with Error ID: 
                <span className="font-mono bg-gray-100 px-2 py-1 rounded ml-1">
                  {this.state.errorId}
                </span>
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to use error boundaries
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Application Error:', error);
    
    // Use comprehensive error tracking system
    if (typeof window !== 'undefined') {
      const { captureError, ErrorCategory } = require('@/lib/error-tracking');
      
      return captureError(error, ErrorCategory.USER_ERROR, {
        component: 'useErrorHandler',
        metadata: { errorInfo }
      });
    }
    
    return null;
  };
}

// Async error boundary for handling promise rejections
export function setupGlobalErrorHandling() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser behavior
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
    });
  }
}

// Error toast notification for non-critical errors
export function showErrorToast(message: string, options?: {
  duration?: number;
  action?: { label: string; onClick: () => void };
}) {
  // This would integrate with your toast system
  console.error('Error Toast:', message);
  
  // Example implementation with a hypothetical toast system:
  // toast.error(message, {
  //   duration: options?.duration || 5000,
  //   action: options?.action
  // });
}

export default ErrorBoundary;