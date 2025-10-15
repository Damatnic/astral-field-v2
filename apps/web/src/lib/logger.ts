/**
 * Centralized Logging Utility
 * 
 * Provides consistent logging across the application with:
 * - Environment-aware logging (dev vs production)
 * - Structured log format
 * - Integration points for monitoring services
 * - Type-safe logging methods
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: Error
}

class Logger {
  private isDevelopment: boolean
  private isDebugEnabled: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isDebugEnabled = process.env.DEBUG === 'true' || process.env.AUTH_DEBUG === 'true'
  }

  /**
   * Format log entry for consistent output
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }

    let formatted = `${levelEmoji[level]} [${level.toUpperCase()}] ${timestamp} - ${message}`
    
    if (context && Object.keys(context).length > 0) {
      formatted += `\n  Context: ${JSON.stringify(context, null, 2)}`
    }

    return formatted
  }

  /**
   * Send log to monitoring service (Sentry, DataDog, etc.)
   */
  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    if (this.isDevelopment) return

    // Send to external monitoring if configured
    // Note: Sentry integration available via environment variable
    // Install @sentry/nextjs and configure NEXT_PUBLIC_SENTRY_DSN to enable
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error): void {
    const timestamp = new Date().toISOString()
    let context: LogContext | undefined
    let error: Error | undefined

    // Handle both context object and Error
    if (contextOrError instanceof Error) {
      error = contextOrError
      context = {
        errorMessage: error.message,
        errorStack: error.stack
      }
    } else {
      context = contextOrError
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp,
      context,
      error
    }

    // Console output based on environment
    const shouldLog = 
      (level === 'error') || // Always log errors
      (level === 'warn' && this.isDevelopment) ||
      (level === 'info' && this.isDevelopment) ||
      (level === 'debug' && this.isDebugEnabled)

    if (shouldLog) {
      const formatted = this.formatLog(entry)
      
      switch (level) {
        case 'debug':
          console.log(formatted)
          break
        case 'info':
          console.log(formatted)
          break
        case 'warn':
          console.warn(formatted)
          if (error) console.warn(error)
          break
        case 'error':
          console.error(formatted)
          if (error) console.error(error)
          break
      }
    }

    // Send to monitoring service (async, non-blocking)
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry).catch(() => {
        // Silently fail - don't break app if monitoring fails
      })
    }
  }

  /**
   * Debug level logging
   * Only shown when DEBUG=true or AUTH_DEBUG=true
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  /**
   * Info level logging
   * Shown in development, sent to monitoring in production
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Warning level logging
   * Shown in development, sent to monitoring in production
   */
  warn(message: string, contextOrError?: LogContext | Error): void {
    this.log('warn', message, contextOrError)
  }

  /**
   * Error level logging
   * Always shown and sent to monitoring
   */
  error(message: string, error?: Error | LogContext): void {
    this.log('error', message, error)
  }

  /**
   * Performance logging
   * Track timing and performance metrics
   */
  perf(operation: string, durationMs: number, context?: LogContext): void {
    const message = `${operation} completed in ${durationMs.toFixed(2)}ms`
    
    if (durationMs > 1000) {
      this.warn(message, { ...context, duration: durationMs, slow: true })
    } else if (this.isDevelopment) {
      this.debug(message, { ...context, duration: durationMs })
    }
  }

  /**
   * API request logging
   */
  api(method: string, path: string, status: number, durationMs: number, context?: LogContext): void {
    const message = `${method} ${path} - ${status} (${durationMs.toFixed(2)}ms)`
    
    if (status >= 500) {
      this.error(message, context)
    } else if (status >= 400) {
      this.warn(message, context)
    } else if (this.isDevelopment) {
      this.info(message, context)
    }
  }

  /**
   * Security event logging
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const message = `Security Event: ${event}`
    
    switch (severity) {
      case 'critical':
      case 'high':
        this.error(message, context)
        break
      case 'medium':
        this.warn(message, context)
        break
      case 'low':
        this.info(message, context)
        break
    }
  }

  /**
   * Database query logging
   */
  query(queryName: string, durationMs: number, context?: LogContext): void {
    const message = `Query: ${queryName} (${durationMs.toFixed(2)}ms)`
    
    if (durationMs > 1000) {
      this.warn(`Slow query detected: ${message}`, context)
    } else if (this.isDebugEnabled) {
      this.debug(message, context)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const logDebug = logger.debug.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)
export const logPerf = logger.perf.bind(logger)
export const logApi = logger.api.bind(logger)
export const logSecurity = logger.security.bind(logger)
export const logQuery = logger.query.bind(logger)

// Export types
export type { LogLevel, LogContext, LogEntry }
