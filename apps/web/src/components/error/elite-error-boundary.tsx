'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class EliteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Elite Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // @ts-ignore - Optional dependency
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureException(error, { 
          extra: { 
            componentStack: errorInfo.componentStack,
            errorBoundary: 'EliteErrorBoundary'
          } 
        })
      }).catch(() => {})
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            {/* Error Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-red-500/30 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-red-500/10">
                  <AlertTriangle className="w-16 h-16 text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-white text-center mb-4">
                Oops! Something went wrong
              </h1>

              {/* Description */}
              <p className="text-slate-300 text-center mb-6">
                We encountered an unexpected error. Our team has been notified and we're working on a fix.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Error Details (Dev Mode):</h3>
                  <pre className="text-xs text-slate-400 overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
                >
                  <RefreshCcw className="w-5 h-5" />
                  <span>Try Again</span>
                </button>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>Go Home</span>
                </Link>
              </div>

              {/* Support Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  Need help?{' '}
                  <a href="/support" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Quick Fixes:</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Try refreshing the page</li>
                <li>• Clear your browser cache</li>
                <li>• Check your internet connection</li>
                <li>• Try again in a few minutes</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

