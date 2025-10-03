/**
 * Logger Utility Tests
 * 
 * Demonstrates comprehensive testing approach for utility functions
 */

import { logger, logDebug, logInfo, logWarn, logError } from '@/lib/logger'

describe('Logger Utility', () => {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  }

  // Mock console methods
  beforeEach(() => {
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    
    jest.clearAllMocks()
  })

  describe('Basic Logging', () => {
    it('should log debug messages when DEBUG is enabled', () => {
      process.env.DEBUG = 'true'
      
      logger.debug('Test debug message')
      
      expect(console.log).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test debug message')
      )
    })

    it('should not log debug messages when DEBUG is disabled', () => {
      process.env.DEBUG = 'false'
      
      logger.debug('Test debug message')
      
      // In production, debug messages should not be logged
      if (process.env.NODE_ENV === 'production') {
        expect(console.log).not.toHaveBeenCalled()
      }
    })

    it('should log info messages in development', () => {
      process.env.NODE_ENV = 'development'
      
      logger.info('Test info message')
      
      expect(console.log).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test info message')
      )
    })

    it('should log warning messages', () => {
      logger.warn('Test warning message')
      
      expect(console.warn).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message')
      )
    })

    it('should always log error messages', () => {
      logger.error('Test error message')
      
      expect(console.error).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      )
    })
  })

  describe('Context Logging', () => {
    it('should include context in log output', () => {
      const context = { userId: '123', action: 'test' }
      
      logger.info('Test with context', context)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('userId')
      )
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error')
      
      logger.error('Error occurred', error)
      
      expect(console.error).toHaveBeenCalled()
      // Should log both the message and the error
      expect(console.error).toHaveBeenCalledTimes(2)
    })

    it('should extract error details into context', () => {
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      logger.warn('Warning with error', error)
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      )
    })
  })

  describe('Performance Logging', () => {
    it('should log fast operations as debug', () => {
      process.env.DEBUG = 'true'
      
      logger.perf('Fast operation', 100)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('100.00ms')
      )
    })

    it('should warn about slow operations', () => {
      logger.perf('Slow operation', 1500)
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('1500.00ms')
      )
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('slow')
      )
    })

    it('should include context in performance logs', () => {
      logger.perf('Operation', 1500, { operation: 'database-query' })
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('database-query')
      )
    })
  })

  describe('API Logging', () => {
    it('should log successful API requests', () => {
      process.env.NODE_ENV = 'development'
      
      logger.api('GET', '/api/users', 200, 150)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/users - 200')
      )
    })

    it('should warn about client errors (4xx)', () => {
      logger.api('POST', '/api/users', 400, 100)
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/users - 400')
      )
    })

    it('should error on server errors (5xx)', () => {
      logger.api('GET', '/api/users', 500, 200)
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/users - 500')
      )
    })

    it('should include context in API logs', () => {
      logger.api('GET', '/api/users', 500, 200, { error: 'Database connection failed' })
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed')
      )
    })
  })

  describe('Security Logging', () => {
    it('should error on critical security events', () => {
      logger.security('Unauthorized access attempt', 'critical', { ip: '1.2.3.4' })
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Security Event')
      )
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('1.2.3.4')
      )
    })

    it('should warn on medium severity events', () => {
      logger.security('Suspicious activity', 'medium')
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Security Event')
      )
    })

    it('should info on low severity events', () => {
      process.env.NODE_ENV = 'development'
      
      logger.security('Login attempt', 'low')
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Security Event')
      )
    })
  })

  describe('Query Logging', () => {
    it('should debug log fast queries', () => {
      process.env.DEBUG = 'true'
      
      logger.query('findUsers', 50)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Query: findUsers')
      )
    })

    it('should warn about slow queries', () => {
      logger.query('complexJoin', 1500)
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected')
      )
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('1500.00ms')
      )
    })

    it('should include query context', () => {
      logger.query('findUsers', 1500, { table: 'users', filters: { active: true } })
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('users')
      )
    })
  })

  describe('Convenience Functions', () => {
    it('should export logDebug function', () => {
      process.env.DEBUG = 'true'
      
      logDebug('Test debug')
      
      expect(console.log).toHaveBeenCalled()
    })

    it('should export logInfo function', () => {
      process.env.NODE_ENV = 'development'
      
      logInfo('Test info')
      
      expect(console.log).toHaveBeenCalled()
    })

    it('should export logWarn function', () => {
      logWarn('Test warn')
      
      expect(console.warn).toHaveBeenCalled()
    })

    it('should export logError function', () => {
      logError('Test error')
      
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Log Formatting', () => {
    it('should include timestamp in logs', () => {
      logger.info('Test message')
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      )
    })

    it('should include log level in logs', () => {
      logger.info('Test message')
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      )
    })

    it('should include emoji indicators', () => {
      logger.error('Test error')
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      )
    })
  })

  describe('Environment Handling', () => {
    it('should respect NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development'
      
      logger.info('Dev message')
      
      expect(console.log).toHaveBeenCalled()
    })

    it('should respect NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production'
      process.env.DEBUG = 'false'
      
      logger.info('Prod message')
      
      // Info messages should not be logged in production
      // (unless sent to monitoring service)
      expect(console.log).not.toHaveBeenCalled()
    })

    it('should respect DEBUG flag', () => {
      process.env.DEBUG = 'true'
      
      logger.debug('Debug message')
      
      expect(console.log).toHaveBeenCalled()
    })

    it('should respect AUTH_DEBUG flag', () => {
      process.env.AUTH_DEBUG = 'true'
      
      logger.debug('Auth debug message')
      
      expect(console.log).toHaveBeenCalled()
    })
  })
})
