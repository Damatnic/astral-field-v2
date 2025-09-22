'use client';

/**
 * User-Friendly Error Handling and Fallback UI Components
 * Provides graceful error states and recovery mechanisms for better UX
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Wifi, 
  WifiOff, 
  Bug, 
  Clock,
  ArrowLeft,
  RotateCcw,
  MessageCircle,
  Shield,
  Database,
  Server,
  Loader2
} from 'lucide-react';
import { useErrorReporting } from './ErrorProvider';
import { ErrorCategory } from '@/lib/error-tracking';

// Fallback component props
interface FallbackProps {
  error?: Error;
  errorCategory?: ErrorCategory;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  showErrorDetails?: boolean;
  customMessage?: string;
  customActions?: React.ReactNode;
}

// Network error fallback
export function NetworkErrorFallback({ 
  error, 
  onRetry, 
  onGoHome,
  customMessage
}: FallbackProps) {
  const { isOnline } = useErrorReporting();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[400px] flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`h-20 w-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isOnline ? 'bg-orange-100' : 'bg-red-100'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-10 w-10 text-orange-600" />
          ) : (
            <WifiOff className="h-10 w-10 text-red-600" />
          )}
        </motion.div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isOnline ? 'Connection Issues' : 'You\'re Offline'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {customMessage || (isOnline 
            ? 'We\'re having trouble connecting to our servers. Please check your connection and try again.'
            : 'It looks like you\'re offline. Please check your internet connection.'
          )}
        </p>

        {retryCount > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-500 mb-4"
          >
            Retry attempt: {retryCount}
          </motion.p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </motion.button>
          
          {onGoHome && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGoHome}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Database error fallback
export function DatabaseErrorFallback({ 
  error, 
  onRetry, 
  onGoHome,
  customMessage 
}: FallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetry, setAutoRetry] = useState(true);
  const [countdown, setCountdown] = useState(10);

  const handleRetry = useCallback(async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  }, [onRetry]);

  useEffect(() => {
    if (!autoRetry || !onRetry) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleRetry();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRetry, onRetry, handleRetry]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[400px] flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Database className="h-10 w-10 text-red-600" />
        </motion.div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Database Connection Issue
        </h2>
        
        <p className="text-gray-600 mb-6">
          {customMessage || 'We\'re experiencing database connectivity issues. Our team has been notified and is working to resolve this.'}
        </p>

        {autoRetry && !isRetrying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                Auto-retry in {countdown} seconds
              </span>
            </div>
            <button
              onClick={() => setAutoRetry(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Cancel auto-retry
            </button>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRetrying ? 'Retrying...' : 'Retry Now'}
          </motion.button>
          
          {onGoHome && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGoHome}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Authentication error fallback
export function AuthErrorFallback({ 
  error, 
  customMessage,
  onGoHome 
}: FallbackProps) {
  const handleLogin = () => {
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[400px] flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="h-20 w-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Shield className="h-10 w-10 text-yellow-600" />
        </motion.div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Authentication Required
        </h2>
        
        <p className="text-gray-600 mb-6">
          {customMessage || 'You need to be logged in to access this page. Please sign in to continue.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogin}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <Shield className="h-4 w-4 mr-2" />
            Sign In
          </motion.button>
          
          {onGoHome && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGoHome}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Generic system error fallback
export function SystemErrorFallback({ 
  error, 
  onRetry, 
  onGoHome, 
  onGoBack,
  showErrorDetails = false,
  customMessage,
  customActions
}: FallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleReportBug = () => {
    // Open bug report or feedback form
    window.open('mailto:support@example.com?subject=Bug Report&body=Error details: ' + encodeURIComponent(error?.stack || error?.message || 'Unknown error'), '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[400px] flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </motion.div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h2>
        
        <p className="text-gray-600 mb-6">
          {customMessage || 'We encountered an unexpected error. Our team has been notified and is working to fix it.'}
        </p>

        {/* Error details (development only or when explicitly enabled) */}
        <AnimatePresence>
          {showErrorDetails && error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Bug className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">
                    Error Details
                  </span>
                </div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {showDetails ? 'Hide' : 'Show'}
                </button>
              </div>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <code className="text-xs text-red-600 block whitespace-pre-wrap break-all">
                    {error.name}: {error.message}
                  </code>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Stack Trace
                      </summary>
                      <code className="text-xs text-gray-600 block whitespace-pre-wrap break-all mt-1">
                        {error.stack}
                      </code>
                    </details>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        {customActions || (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {onRetry && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reload Page
              </motion.button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {onGoBack && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onGoBack}
                  className="flex-1 bg-gray-100 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </motion.button>
              )}
              
              {onGoHome && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onGoHome}
                  className="flex-1 bg-gray-100 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </motion.button>
              )}
            </div>

            {/* Show error details toggle and bug report */}
            <div className="flex justify-center gap-4 text-sm">
              {(showErrorDetails || process.env.NODE_ENV === 'development') && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <Bug className="h-3 w-3 mr-1" />
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              )}
              
              <button
                onClick={handleReportBug}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Report Bug
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Smart fallback component that chooses appropriate fallback based on error
export function SmartErrorFallback(props: FallbackProps) {
  const { error, errorCategory } = props;

  // Determine which fallback to show based on error type
  if (errorCategory === ErrorCategory.NETWORK_ERROR || 
      (error && error.message.toLowerCase().includes('network'))) {
    return <NetworkErrorFallback {...props} />;
  }

  if (errorCategory === ErrorCategory.DATABASE_ERROR || 
      (error && error.message.toLowerCase().includes('database'))) {
    return <DatabaseErrorFallback {...props} />;
  }

  if (errorCategory === ErrorCategory.AUTHENTICATION_ERROR || 
      errorCategory === ErrorCategory.AUTHORIZATION_ERROR ||
      (error && (error.message.toLowerCase().includes('auth') || 
                 error.message.toLowerCase().includes('unauthorized')))) {
    return <AuthErrorFallback {...props} />;
  }

  // Default to system error fallback
  return <SystemErrorFallback {...props} />;
}

// Loading fallback for when content is being retried
export function LoadingFallback({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[200px] flex items-center justify-center p-4"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-gray-600">{message}</p>
      </div>
    </motion.div>
  );
}

// Minimal error fallback for inline errors
export function InlineErrorFallback({ 
  message, 
  onRetry, 
  compact = false 
}: { 
  message: string; 
  onRetry?: () => void; 
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-red-50 border border-red-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className={`text-red-800 ${compact ? 'text-sm' : ''}`}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default SmartErrorFallback;