/**
 * Enterprise Error Handling System for AstralField
 * Provides comprehensive error handling, monitoring, and recovery mechanisms
 */

import { logger } from './logger';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Custom error types for different scenarios
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly correlationId: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.correlationId = generateCorrelationId();
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 401, true, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 403, true, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: Record<string, any>) {
    super(`${resource} not found`, 404, true, context);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, true, context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, 429, true, context);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`${service} error: ${message}`, 503, true, { service, ...context });
    this.name = 'ExternalServiceError';
  }
}

// Generate unique correlation ID for tracking
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Error classification and handling
export class ErrorHandler {
  /**
   * Handle and classify different types of errors
   */
  static handle(error: unknown, context?: Record<string, any>): AppError {
    const correlationId = generateCorrelationId();

    // Log the original error with context
    logger.error({
      correlationId,
      error: this.serializeError(error),
      context,
    }, 'Error occurred');

    // Handle known error types
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof ZodError) {
      return new ValidationError(
        'Validation failed: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        { validationErrors: error.errors, correlationId }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(error, correlationId);
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return new AppError('Database error occurred', 500, true, { correlationId });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new ValidationError('Invalid database query parameters', { correlationId });
    }

    // Handle network/timeout errors
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return new AppError('Request timeout', 408, true, { correlationId });
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return new ExternalServiceError('External service', 'Connection failed', { correlationId });
      }

      if (error.message.includes('EADDRINUSE')) {
        return new AppError('Port already in use', 500, false, { correlationId });
      }
    }

    // Generic error fallback
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new AppError(message, 500, false, { 
      correlationId,
      originalError: this.serializeError(error)
    });
  }

  /**
   * Handle Prisma-specific errors
   */
  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError, correlationId: string): AppError {
    switch (error.code) {
      case 'P2002':
        const target = error.meta?.target as string[] || ['field'];
        return new ConflictError(
          `Duplicate value for ${target.join(', ')}`,
          { prismaError: error.code, correlationId }
        );

      case 'P2025':
        return new NotFoundError('Record', { prismaError: error.code, correlationId });

      case 'P2003':
        return new ValidationError(
          'Foreign key constraint failed',
          { prismaError: error.code, correlationId }
        );

      case 'P2014':
        return new ValidationError(
          'Invalid relation data',
          { prismaError: error.code, correlationId }
        );

      case 'P1001':
        return new AppError(
          'Database connection failed',
          503,
          true,
          { prismaError: error.code, correlationId }
        );

      case 'P1008':
        return new AppError(
          'Database operation timeout',
          408,
          true,
          { prismaError: error.code, correlationId }
        );

      default:
        return new AppError(
          'Database operation failed',
          500,
          true,
          { prismaError: error.code, message: error.message, correlationId }
        );
    }
  }

  /**
   * Convert error to JSON-serializable format
   */
  private static serializeError(error: unknown): Record<string, any> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      error: String(error),
    };
  }

  /**
   * Create standardized API error response
   */
  static createResponse(error: AppError): NextResponse {
    const response = {
      error: {
        message: error.message,
        correlationId: error.correlationId,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          context: error.context,
        }),
      },
    };

    return NextResponse.json(response, { status: error.statusCode });
  }
}

// Async error wrapper for API routes
export function asyncHandler(
  fn: (req: Request, context?: any) => Promise<Response | NextResponse>
) {
  return async (req: Request, context?: any): Promise<Response | NextResponse> => {
    try {
      return await fn(req, context);
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        url: req.url,
        method: req.method,
        userAgent: req.headers.get('user-agent'),
      });

      return ErrorHandler.createResponse(appError);
    }
  };
}

// Retry mechanism for external service calls
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    shouldRetry = (error) => !(error instanceof AppError) || error.statusCode >= 500
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        break;
      }

      const currentDelay = backoff === 'exponential' 
        ? delay * Math.pow(2, attempt - 1)
        : delay * attempt;

      logger.warn({
        attempt,
        maxAttempts,
        delay: currentDelay,
        error: ErrorHandler.handle(error).message,
      }, 'Retrying failed operation');

      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw lastError;
}

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly monitoringWindow: number = 120000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ExternalServiceError('Circuit Breaker', 'Service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.warn({
        failures: this.failures,
        threshold: this.threshold,
        state: this.state,
      }, 'Circuit breaker opened');
    }
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
    logger.info('Circuit breaker reset');
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }
}

// Global error tracking
export class ErrorTracker {
  private static errors: Array<{
    error: AppError;
    timestamp: number;
    url?: string;
  }> = [];

  static track(error: AppError, url?: string): void {
    this.errors.push({
      error,
      timestamp: Date.now(),
      url,
    });

    // Keep only recent errors (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.errors = this.errors.filter(e => e.timestamp > oneHourAgo);
  }

  static getStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByStatus: Record<number, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const recentErrors = this.errors.filter(e => e.timestamp > fiveMinutesAgo);
    
    const errorsByType = this.errors.reduce((acc, { error }) => {
      acc[error.name] = (acc[error.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByStatus = this.errors.reduce((acc, { error }) => {
      acc[error.statusCode] = (acc[error.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsByStatus,
      recentErrors: recentErrors.length,
    };
  }
}

// Legacy compatibility functions
export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export function logError(error: Error | string, context: ErrorContext = {}): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const appError = ErrorHandler.handle(errorObj, context);
  ErrorTracker.track(appError);
}

export function handleAuthError(error: Error, operation: string): void {
  logError(error, { component: 'Auth', operation });
}

export function handleApiError(error: Error, endpoint: string, userId?: string): void {
  logError(error, { component: 'API', operation: endpoint, userId });
}

export function handleComponentError(error: Error, component: string, operation: string = 'unknown'): void {
  logError(error, { component, operation });
}

// Export helper functions
export { generateCorrelationId };