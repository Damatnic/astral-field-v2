'use client'

import { useEffect } from 'react'

export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      if (process.env.NODE_ENV === 'production') {
        // Log to monitoring service
        const errorData = {
          type: 'unhandledRejection',
          reason: event.reason?.toString() || 'Unknown rejection',
          stack: event.reason?.stack || null,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }
        
        console.error('Unhandled rejection logged:', errorData)
        
        // Optionally show user-friendly notification
        // Could integrate with a toast system here
      }
      
      // Prevent the default browser handling
      event.preventDefault()
    }

    // Handle uncaught JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error)
      
      if (process.env.NODE_ENV === 'production') {
        // Log to monitoring service
        const errorData = {
          type: 'uncaughtError',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || null,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }
        
        console.error('Uncaught error logged:', errorData)
      }
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // This component doesn't render anything
  return null
}