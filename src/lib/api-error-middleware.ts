/**
 * API Error Tracking Middleware
 * Comprehensive server-side error monitoring and logging for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, logError, logPerformance, logSecurity } from './logger';
import { captureError, ErrorCategory, ErrorSeverity } from './error-tracking';
import { z } from 'zod';

// Enhanced error interface for API errors
export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
  severity?: ErrorSeverity;
}

// Error response format
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
    errorId?: string;
    timestamp: string;
  };
  metadata?: {
    requestId?: string;
    duration?: number;
    endpoint?: string;
  };
}

// Success response format
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: {
    requestId?: string;
    duration?: number;
    pagination?: any;
    cache?: any;
  };
}

// API Handler type
export type APIHandler = (
  request: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse>;

// Middleware options
export interface ErrorMiddlewareOptions {
  enableDetailedErrors?: boolean;
  enablePerformanceLogging?: boolean;
  enableSecurityLogging?: boolean;
  maxRequestSize?: number;
  timeoutMs?: number;
  sensitiveFields?: string[];
}

// Default options
const defaultOptions: ErrorMiddlewareOptions = {
  enableDetailedErrors: process.env.NODE_ENV === 'development',
  enablePerformanceLogging: true,
  enableSecurityLogging: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  timeoutMs: 30000, // 30 seconds
  sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'authorization']
};

// Helper function to generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to sanitize request data
function sanitizeData(data: any, sensitiveFields: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Helper function to get client information
function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent');
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  return {
    ip: realIP || forwarded?.split(',')[0] || 'unknown',
    userAgent: userAgent || 'unknown',
    origin: origin || 'unknown',
    referer: referer || 'unknown'
  };
}

// Helper function to determine error category
function categorizeError(error: APIError, request: NextRequest): ErrorCategory {
  const message = error.message.toLowerCase();
  const statusCode = error.statusCode;
  
  // Authentication/Authorization errors
  if (statusCode === 401 || message.includes('unauthorized') || message.includes('auth')) {
    return ErrorCategory.AUTHENTICATION_ERROR;
  }
  
  if (statusCode === 403 || message.includes('forbidden') || message.includes('permission')) {
    return ErrorCategory.AUTHORIZATION_ERROR;
  }
  
  // Validation errors
  if (statusCode === 400 || message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION_ERROR;
  }
  
  // Database errors
  if (message.includes('database') || message.includes('prisma') || message.includes('sql')) {
    return ErrorCategory.DATABASE_ERROR;
  }
  
  // Network/Integration errors
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return ErrorCategory.NETWORK_ERROR;
  }
  
  // Rate limiting
  if (statusCode === 429 || message.includes('rate limit')) {
    return ErrorCategory.SYSTEM_ERROR;
  }
  
  // Default to system error
  return ErrorCategory.SYSTEM_ERROR;
}

// Helper function to determine error severity
function determineErrorSeverity(error: APIError): ErrorSeverity {
  const statusCode = error.statusCode;
  const message = error.message.toLowerCase();
  
  // Explicit severity from error object
  if (error.severity) {
    return error.severity;
  }
  
  // Critical errors
  if (statusCode === 500 || message.includes('critical') || message.includes('fatal')) {
    return ErrorSeverity.CRITICAL;
  }
  
  // High severity errors
  if (statusCode === 502 || statusCode === 503 || statusCode === 504 || 
      message.includes('database') || message.includes('timeout')) {
    return ErrorSeverity.HIGH;
  }
  
  // Medium severity errors
  if (statusCode === 400 || statusCode === 404 || statusCode === 422) {
    return ErrorSeverity.MEDIUM;
  }
  
  // Low severity errors
  return ErrorSeverity.LOW;
}

// Create standardized error response
function createErrorResponse(
  error: APIError,
  requestId: string,
  duration: number,
  endpoint: string,
  options: ErrorMiddlewareOptions
): NextResponse<ErrorResponse> {
  const severity = determineErrorSeverity(error);
  const statusCode = error.statusCode || 500;
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: error.isOperational 
        ? error.message 
        : 'An unexpected error occurred',
      code: error.code,
      details: options.enableDetailedErrors ? error.details : undefined,
      errorId: error.name, // Will be set by error tracking
      timestamp: new Date().toISOString()
    },
    metadata: {
      requestId,
      duration,
      endpoint
    }
  };
  
  return NextResponse.json(errorResponse, { status: statusCode });
}

// Create standardized success response
export function createSuccessResponse<T>(
  data: T,
  metadata?: {
    requestId?: string;
    duration?: number;
    pagination?: any;
    cache?: any;
  }
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    metadata
  };
  
  return NextResponse.json(response);
}

// Main error middleware wrapper
export function withErrorHandling(
  handler: APIHandler,
  options: Partial<ErrorMiddlewareOptions> = {}
): APIHandler {
  const mergedOptions = { ...defaultOptions, ...options };
  
  return async (request: NextRequest, context?: { params?: any }) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const endpoint = `${request.method} ${request.nextUrl.pathname}`;
    const clientInfo = getClientInfo(request);
    
    try {
      // Add request ID to headers for tracking
      const requestWithId = new NextRequest(request.url, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'x-request-id': requestId
        },
        body: request.body
      });
      
      // Security logging for sensitive endpoints
      if (mergedOptions.enableSecurityLogging) {
        logSecurity('api_request', {
          endpoint,
          method: request.method,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          origin: clientInfo.origin,
          requestId
        });
      }
      
      // Execute handler with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${mergedOptions.timeoutMs}ms`));
        }, mergedOptions.timeoutMs);
      });
      
      const response = await Promise.race([
        handler(requestWithId, context),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      
      // Performance logging
      if (mergedOptions.enablePerformanceLogging) {
        logPerformance('api_request', duration, {
          endpoint,
          method: request.method,
          statusCode: response.status,
          requestId
        });
      }
      
      // Log slow requests
      if (duration > 5000) {
        captureError(
          new Error(`Slow API request: ${endpoint}`),
          ErrorCategory.PERFORMANCE_ERROR,
          {
            component: 'api-middleware',
            metadata: {
              duration,
              endpoint,
              requestId
            }
          }
        );
      }
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const apiError = error as APIError;
      
      // Enhance error with additional context
      const enhancedError = {
        ...apiError,
        statusCode: apiError.statusCode || 500,
        isOperational: apiError.isOperational ?? false
      };
      
      // Determine error category and severity
      const category = categorizeError(enhancedError, request);
      const severity = determineErrorSeverity(enhancedError);
      
      // Capture error with comprehensive context
      const errorId = captureError(enhancedError, category, {
        component: 'api-middleware',
        action: endpoint,
        requestId,
        userId: request.headers.get('x-user-id') || undefined,
        metadata: {
          endpoint,
          method: request.method,
          statusCode: enhancedError.statusCode,
          duration,
          clientInfo: sanitizeData(clientInfo, mergedOptions.sensitiveFields || []),
          requestHeaders: sanitizeData(
            Object.fromEntries(request.headers),
            mergedOptions.sensitiveFields || []
          )
        }
      });
      
      // Log error with structured logging
      logError(enhancedError, {
        requestId,
        endpoint,
        method: request.method,
        duration,
        severity,
        category,
        errorId,
        clientInfo
      });
      
      // Set error ID for response
      enhancedError.name = errorId;
      
      // Return standardized error response
      return createErrorResponse(
        enhancedError,
        requestId,
        duration,
        endpoint,
        mergedOptions
      );
    }
  };
}

// Utility function to create operational errors
export function createOperationalError(
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any
): APIError {
  const error = new Error(message) as APIError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;
  return error;
}

// Validation error helper
export function createValidationError(
  message: string,
  validationErrors?: z.ZodError
): APIError {
  const error = createOperationalError(
    message,
    400,
    'VALIDATION_ERROR',
    validationErrors?.errors
  );
  error.severity = ErrorSeverity.LOW;
  return error;
}

// Database error helper
export function createDatabaseError(
  message: string,
  originalError?: Error
): APIError {
  const error = createOperationalError(
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    process.env.NODE_ENV === 'development' ? originalError?.message : undefined
  );
  error.severity = ErrorSeverity.HIGH;
  return error;
}

// Authentication error helper
export function createAuthError(message: string = 'Authentication required'): APIError {
  const error = createOperationalError(
    message,
    401,
    'AUTH_ERROR'
  );
  error.severity = ErrorSeverity.MEDIUM;
  return error;
}

// Authorization error helper
export function createAuthzError(message: string = 'Insufficient permissions'): APIError {
  const error = createOperationalError(
    message,
    403,
    'AUTHZ_ERROR'
  );
  error.severity = ErrorSeverity.MEDIUM;
  return error;
}

// Rate limit error helper
export function createRateLimitError(message: string = 'Rate limit exceeded'): APIError {
  const error = createOperationalError(
    message,
    429,
    'RATE_LIMIT_ERROR'
  );
  error.severity = ErrorSeverity.LOW;
  return error;
}

export default withErrorHandling;