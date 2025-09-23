import { NextRequest, NextResponse } from 'next/server';
import { 
  captureError, 
  ErrorCategory
} from '@/lib/error-tracking';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public category: ErrorCategory = ErrorCategory.EXTERNAL_API_ERROR,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public resource?: string,
    public action?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public url?: string,
    public method?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function createErrorResponse(
  error: Error | string,
  statusCode: number = 500,
  additionalInfo?: Record<string, any>
) {
  const errorId = captureError(
    error,
    statusCode >= 500 ? ErrorCategory.SYSTEM_ERROR : ErrorCategory.USER_ERROR
  );

  return {
    error: true,
    message: typeof error === 'string' ? error : error.message,
    errorId,
    statusCode,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };
}

export interface APIContext {
  request: NextRequest;
  params?: any;
  userId?: string;
  sessionId?: string;
}

export type APIHandler<T = any> = (context: APIContext) => Promise<NextResponse<T>>;

export function withErrorHandling<T = any>(
  handler: APIHandler<T>,
  options?: {
    category?: ErrorCategory;
    requireAuth?: boolean;
    rateLimit?: number;
  }
): APIHandler<T> {
  return async (context: APIContext) => {
    const startTime = Date.now();
    
    try {
      if (options?.requireAuth && !context.userId) {
        throw new AuthenticationError('Authentication required');
      }

      const response = await handler(context);
      
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`Slow API response: ${context.request.url} took ${duration}ms`);
      }
      
      return response;
    } catch (error: any) {
      const category = determineErrorCategory(error, options?.category);
      const statusCode = determineStatusCode(error);
      
      const errorResponse = createErrorResponse(
        error,
        statusCode,
        {
          url: context.request.url,
          method: context.request.method,
          duration: Date.now() - startTime,
          userId: context.userId,
          sessionId: context.sessionId
        }
      );

      captureError(error, category, {
        component: 'API',
        metadata: {
          url: context.request.url,
          method: context.request.method,
          statusCode,
          params: context.params
        }
      });

      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

function determineErrorCategory(error: any, defaultCategory?: ErrorCategory): ErrorCategory {
  if (defaultCategory) return defaultCategory;
  
  if (error instanceof ValidationError) return ErrorCategory.VALIDATION_ERROR;
  if (error instanceof AuthenticationError) return ErrorCategory.AUTHENTICATION_ERROR;
  if (error instanceof AuthorizationError) return ErrorCategory.AUTHORIZATION_ERROR;
  if (error instanceof NetworkError) return ErrorCategory.NETWORK_ERROR;
  if (error instanceof APIError) return error.category;
  
  if (error.name === 'PrismaClientKnownRequestError') return ErrorCategory.DATABASE_ERROR;
  if (error.name === 'PrismaClientUnknownRequestError') return ErrorCategory.DATABASE_ERROR;
  
  return ErrorCategory.SYSTEM_ERROR;
}

function determineStatusCode(error: any): number {
  if (error instanceof APIError) return error.statusCode;
  if (error instanceof ValidationError) return 400;
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof AuthorizationError) return 403;
  if (error instanceof NetworkError) return 503;
  
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  
  return 500;
}

export async function validateRequest<T>(
  schema: any,
  data: any
): Promise<T> {
  try {
    return schema.parse(data);
  } catch (error: any) {
    throw new ValidationError(
      'Invalid request data',
      error.errors?.[0]?.path?.join('.'),
      error.errors?.[0]?.message
    );
  }
}

export function createAPIResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: HeadersInit;
    cache?: {
      maxAge?: number;
      sMaxAge?: number;
      staleWhileRevalidate?: number;
    };
  }
): NextResponse<T> {
  const headers = new Headers(options?.headers);
  
  if (options?.cache) {
    const { maxAge = 0, sMaxAge = 0, staleWhileRevalidate = 0 } = options.cache;
    const cacheControl = [
      maxAge > 0 ? `max-age=${maxAge}` : 'no-cache',
      sMaxAge > 0 ? `s-maxage=${sMaxAge}` : '',
      staleWhileRevalidate > 0 ? `stale-while-revalidate=${staleWhileRevalidate}` : ''
    ].filter(Boolean).join(', ');
    
    headers.set('Cache-Control', cacheControl);
  }
  
  return NextResponse.json(data, {
    status: options?.status || 200,
    headers
  });
}

export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    if (this.requests.size > 10000) {
      const oldestKey = this.requests.keys().next().value;
      if (oldestKey) this.requests.delete(oldestKey);
    }
    
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

export const defaultRateLimiter = new RateLimiter();

export function withRateLimit(
  limiter: RateLimiter = defaultRateLimiter,
  getIdentifier?: (request: NextRequest) => string
): (handler: APIHandler) => APIHandler {
  return (handler: APIHandler) => {
    return async (context: APIContext) => {
      const identifier = getIdentifier 
        ? getIdentifier(context.request)
        : context.userId || context.request.headers.get('x-forwarded-for') || 'anonymous';
      
      if (!limiter.check(identifier)) {
        throw new APIError(
          'Too many requests',
          429,
          ErrorCategory.USER_ERROR,
          {
            retryAfter: 60
          }
        );
      }
      
      return handler(context);
    };
  };
}

export function createSafeHandler<T = any>(
  handler: APIHandler<T>,
  options?: {
    requireAuth?: boolean;
    rateLimit?: number;
    category?: ErrorCategory;
  }
): APIHandler<T> {
  let wrappedHandler = handler;
  
  if (options?.rateLimit) {
    const limiter = new RateLimiter(options.rateLimit);
    wrappedHandler = withRateLimit(limiter)(wrappedHandler);
  }
  
  return withErrorHandling(wrappedHandler, options);
}