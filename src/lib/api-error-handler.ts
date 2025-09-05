import { NextResponse } from 'next/server'

export interface ApiError {
  message: string
  code?: string
  status: number
  details?: any
}

export class ApiErrorResponse extends Error {
  public status: number
  public code?: string
  public details?: any

  constructor(message: string, status: number = 500, code?: string, details?: any) {
    super(message)
    this.name = 'ApiErrorResponse'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function createErrorResponse(error: ApiError | Error | unknown, fallbackMessage?: string): NextResponse {
  console.error('API Error:', error)

  // If it's our custom ApiErrorResponse
  if (error instanceof ApiErrorResponse) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      timestamp: new Date().toISOString()
    }, { status: error.status })
  }

  // If it's a standard Error
  if (error instanceof Error) {
    return NextResponse.json({
      error: fallbackMessage || error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    }, { status: 500 })
  }

  // Unknown error type
  return NextResponse.json({
    error: fallbackMessage || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      details: error
    })
  }, { status: 500 })
}

export function handleApiError(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}

// Common error responses
export const CommonErrors = {
  ValidationError: (message: string, details?: any) => 
    new ApiErrorResponse(message, 400, 'VALIDATION_ERROR', details),
  
  NotFound: (resource: string = 'Resource') => 
    new ApiErrorResponse(`${resource} not found`, 404, 'NOT_FOUND'),
  
  Unauthorized: (message: string = 'Unauthorized access') => 
    new ApiErrorResponse(message, 401, 'UNAUTHORIZED'),
  
  Forbidden: (message: string = 'Forbidden access') => 
    new ApiErrorResponse(message, 403, 'FORBIDDEN'),
  
  DatabaseError: (message: string = 'Database operation failed') => 
    new ApiErrorResponse(message, 500, 'DATABASE_ERROR'),
  
  RateLimited: (message: string = 'Too many requests') => 
    new ApiErrorResponse(message, 429, 'RATE_LIMITED'),
}

// Request validation helper
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]) {
  const missing = requiredFields.filter(field => !data[field])
  if (missing.length > 0) {
    throw CommonErrors.ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missing }
    )
  }
}