'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('App Error:', error)
    
    if (process.env.NODE_ENV === 'production') {
      // In production, send to error monitoring service
      const errorData = {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      console.error('Error logged for monitoring:', errorData)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Something went wrong!
          </h1>
          <p className="text-gray-400 text-sm">
            We encountered an unexpected error. Please try again or contact support if the issue persists.
          </p>
        </div>

        {/* Development mode - show error details */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-left">
            <h3 className="text-red-400 font-medium mb-2">Error Details:</h3>
            <pre className="text-xs text-red-300 overflow-auto max-h-40">
              {error.message}
            </pre>
            {error.digest && (
              <p className="text-xs text-gray-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-xs">
            Error ID: <code className="bg-gray-700 px-1 py-0.5 rounded text-xs">
              {error.digest || Date.now().toString(36)}
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}