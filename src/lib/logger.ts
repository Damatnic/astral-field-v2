// Production-ready logging system
interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  url?: string
  method?: string
  [key: string]: any
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

class Logger {
  private logLevel: LogLevel
  private isDevelopment: boolean
  private isServer: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isServer = typeof window === 'undefined'
    
    // Set log level based on environment
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): any {
    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]
    
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      environment: process.env.NODE_ENV,
      server: this.isServer,
      ...(context && { context })
    }

    if (this.isDevelopment) {
      // Pretty print in development
      const emoji = this.getLevelEmoji(level)
      console.log(`${emoji} [${levelName}] ${message}`)
      if (context) {
        console.log('Context:', context)
      }
      return logEntry
    }

    // Structured JSON in production
    return logEntry
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍'
      case LogLevel.INFO: return 'ℹ️'
      case LogLevel.WARN: return '⚠️'
      case LogLevel.ERROR: return '❌'
      case LogLevel.FATAL: return '💥'
      default: return '📝'
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const logEntry = this.formatMessage(LogLevel.DEBUG, message, context)
      if (!this.isDevelopment) {
        console.debug(JSON.stringify(logEntry))
      }
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      const logEntry = this.formatMessage(LogLevel.INFO, message, context)
      if (!this.isDevelopment) {
        console.info(JSON.stringify(logEntry))
      }
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      const logEntry = this.formatMessage(LogLevel.WARN, message, context)
      if (!this.isDevelopment) {
        console.warn(JSON.stringify(logEntry))
      }
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        ...(error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        })
      }
      
      const logEntry = this.formatMessage(LogLevel.ERROR, message, errorContext)
      if (!this.isDevelopment) {
        console.error(JSON.stringify(logEntry))
      }
    }
  }

  fatal(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      })
    }
    
    const logEntry = this.formatMessage(LogLevel.FATAL, message, errorContext)
    console.error(JSON.stringify(logEntry))
  }

  // API request logging
  logApiRequest(method: string, url: string, statusCode: number, duration: number, context?: LogContext) {
    const message = `${method} ${url} ${statusCode} - ${duration}ms`
    const requestContext = {
      ...context,
      method,
      url,
      statusCode,
      duration,
      type: 'api_request'
    }

    if (statusCode >= 500) {
      this.error(message, undefined, requestContext)
    } else if (statusCode >= 400) {
      this.warn(message, requestContext)
    } else {
      this.info(message, requestContext)
    }
  }

  // Database query logging
  logDatabaseQuery(query: string, duration: number, error?: Error) {
    const message = `Database query completed in ${duration}ms`
    const context = {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration,
      type: 'database_query'
    }

    if (error) {
      this.error(message, error, context)
    } else {
      this.debug(message, context)
    }
  }

  // Authentication logging
  logAuth(event: 'login' | 'logout' | 'register' | 'failure', userId?: string, context?: LogContext) {
    const message = `Authentication event: ${event}`
    const authContext = {
      ...context,
      userId,
      event,
      type: 'authentication'
    }

    if (event === 'failure') {
      this.warn(message, authContext)
    } else {
      this.info(message, authContext)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Error boundary logging
export function logErrorBoundary(error: Error, errorInfo: any) {
  logger.fatal('React Error Boundary triggered', error, {
    componentStack: errorInfo.componentStack,
    type: 'error_boundary'
  })
}

// Unhandled rejection logging
if (typeof window === 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
      promise: String(promise),
      type: 'unhandled_rejection'
    })
  })

  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught Exception', error, {
      type: 'uncaught_exception'
    })
    process.exit(1)
  })
}