import pino from 'pino';

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isBrowser = typeof window !== 'undefined';

// Browser-safe logger configuration
const createLogger = () => {
  if (isBrowser) {
    // Use console in browser with structured format
    return {
      trace: (obj: any, msg?: string) => console.trace(msg || '', obj),
      debug: (obj: any, msg?: string) => console.debug(msg || '', obj),
      info: (obj: any, msg?: string) => console.info(msg || '', obj),
      warn: (obj: any, msg?: string) => console.warn(msg || '', obj),
      error: (obj: any, msg?: string) => console.error(msg || '', obj),
      fatal: (obj: any, msg?: string) => console.error('FATAL:', msg || '', obj),
    };
  }

  // Server-side Pino logger with production-safe configuration
  const loggerConfig: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    enabled: !isTest,
    base: {
      env: process.env.NODE_ENV,
    },
    redact: ['password', 'token', 'apiKey', 'secret', 'DATABASE_URL', 'auth', 'authorization'],
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // Only use pino-pretty in development and when explicitly enabled
  if (isDevelopment && !isTest && process.env.DISABLE_PRETTY_LOGS !== 'true') {
    try {
      loggerConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss'
        }
      };
    } catch (error) {
      // If pino-pretty fails, fall back to standard JSON logging
      console.warn('pino-pretty failed to load, using standard JSON logging');
    }
  }

  return pino(loggerConfig);
};

// Create logger instance
export const logger = createLogger();

// Helper functions for structured logging
export const logError = (error: Error | unknown, context?: Record<string, any>) => {
  const errorObj = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name
  } : { error };

  logger.error({
    error: errorObj,
    ...context
  });
};

export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  logger.info({
    request: { method, url },
    response: { statusCode },
    duration
  }, 'HTTP Request');
};

export const logDatabaseQuery = (query: string, duration: number, rowCount?: number) => {
  logger.debug({
    database: {
      query: query.substring(0, 200),
      duration,
      rowCount
    }
  }, 'Database Query');
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info({
    performance: {
      operation,
      duration,
      ...metadata
    }
  }, 'Performance Metric');
};

export const logSecurity = (event: string, details: any) => {
  logger.warn({
    security: {
      event,
      ...details,
      timestamp: new Date().toISOString()
    }
  }, 'Security Event');
};

// Development-only debug logger
export const debug = isDevelopment ? logger.debug.bind(logger) : () => {};

export default logger;