import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  correlationId: string;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace?.(this, AppError);
  }
}

export function handleApiError(error: unknown, correlationId?: string): NextResponse<ApiError> {
  const id = correlationId || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Log error with correlation ID for debugging
  console.error(`[${id}] API Error:`, {
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    correlationId: id
  });

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json<ApiError>(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        correlationId: id,
        timestamp
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json<ApiError>(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        })),
        correlationId: id,
        timestamp
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json<ApiError>(
          {
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: 'A record with this data already exists',
            details: { target: error.meta?.target },
            correlationId: id,
            timestamp
          },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json<ApiError>(
          {
            code: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found',
            details: error.meta,
            correlationId: id,
            timestamp
          },
          { status: 404 }
        );
      case 'P2014':
        return NextResponse.json<ApiError>(
          {
            code: 'INVALID_ID',
            message: 'Invalid ID provided',
            details: error.meta,
            correlationId: id,
            timestamp
          },
          { status: 400 }
        );
      default:
        return NextResponse.json<ApiError>(
          {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: { prismaCode: error.code },
            correlationId: id,
            timestamp
          },
          { status: 500 }
        );
    }
  }

  // Handle Prisma client validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json<ApiError>(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid database query',
        correlationId: id,
        timestamp
      },
      { status: 400 }
    );
  }

  // Handle network/connection errors
  if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
    return NextResponse.json<ApiError>(
      {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Unable to connect to database',
        correlationId: id,
        timestamp
      },
      { status: 503 }
    );
  }

  // Handle timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return NextResponse.json<ApiError>(
      {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out',
        correlationId: id,
        timestamp
      },
      { status: 408 }
    );
  }

  // Generic error response for unknown errors
  return NextResponse.json<ApiError>(
    {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error instanceof Error 
          ? error.message 
          : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined,
        raw: String(error)
      } : undefined,
      correlationId: id,
      timestamp
    },
    { status: 500 }
  );
}

// Middleware wrapper for API routes
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as Request;
    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
    
    try {
      const response = await handler(...args);
      
      // Add correlation ID to successful responses
      if (response.headers) {
        response.headers.set('x-correlation-id', correlationId);
      }
      
      return response;
    } catch (error) {
      return handleApiError(error, correlationId);
    }
  };
}

// Common error factory functions
export const createApiError = {
  badRequest: (message: string, details?: any) => 
    new AppError('BAD_REQUEST', 400, message, details),
    
  unauthorized: (message: string = 'Authentication required') => 
    new AppError('UNAUTHORIZED', 401, message),
    
  forbidden: (message: string = 'Access denied') => 
    new AppError('FORBIDDEN', 403, message),
    
  notFound: (resource: string = 'Resource') => 
    new AppError('NOT_FOUND', 404, `${resource} not found`),
    
  conflict: (message: string, details?: any) => 
    new AppError('CONFLICT', 409, message, details),
    
  rateLimit: (message: string = 'Too many requests') => 
    new AppError('RATE_LIMIT', 429, message),
    
  internal: (message: string = 'Internal server error') => 
    new AppError('INTERNAL_ERROR', 500, message)
};

// Utility to validate and extract user from session
export function validateSession(session: any) {
  if (!session?.user?.id) {
    throw createApiError.unauthorized();
  }
  return session.user;
}

// Utility to validate request method
export function validateMethod(request: Request, allowedMethods: string[]) {
  if (!allowedMethods.includes(request.method || '')) {
    throw createApiError.badRequest(`Method ${request.method} not allowed`);
  }
}

// Utility to safely parse JSON
export async function safeParseJson(request: Request) {
  try {
    return await request.json();
  } catch (error) {
    throw createApiError.badRequest('Invalid JSON in request body');
  }
}