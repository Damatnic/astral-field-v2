'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { signOut } from 'next-auth/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

// Sentinel: Comprehensive error boundary for authentication components
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught an error:', error, errorInfo);
    }
    this.setState({ errorInfo })
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error reporting service here
      // e.g., Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to sign out:', error);
      }
      // Force refresh as fallback
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex h-screen bg-slate-950">
          <div className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8 pt-16 lg:pt-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-2xl mx-auto">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-red-400">Authentication Error</h2>
                </div>
                
                <p className="text-gray-300 mb-6">
                  Something went wrong with the authentication system. This could be due to:
                </p>
                
                <ul className="text-gray-300 mb-6 space-y-2">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                    Session expiration or corruption
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                    Network connectivity issues
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                    Browser compatibility problems
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                    Hydration mismatches
                  </li>
                </ul>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6">
                    <summary className="text-red-400 cursor-pointer mb-2">
                      Technical Details (Development Only)
                    </summary>
                    <div className="bg-slate-900 p-4 rounded text-sm font-mono text-gray-300 overflow-auto">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs mt-1">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={this.handleSignOut}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Sign Out & Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with auth error boundary
export function withAuthErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options: { 
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void 
  } = {}
) {
  const { fallback, onError } = options

  const WrappedComponent = (props: T) => {
    return (
      <AuthErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </AuthErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Specific error boundary for session-related errors
export function SessionErrorBoundary({ children }: { children: ReactNode }) {
  const handleSessionError = (error: Error, errorInfo: ErrorInfo) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Session-specific error:', error, errorInfo);
    }
    // Check if it's a session-related error
    if (error.message.includes('session') || error.message.includes('auth')) {
      // Force a session refresh
      window.location.href = '/auth/signin'
    }
  }

  return (
    <AuthErrorBoundary onError={handleSessionError}>
      {children}
    </AuthErrorBoundary>
  )
}