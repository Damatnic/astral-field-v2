
export const dynamic = 'force-dynamic';
/**
 * Enhanced Error Tracking API Endpoint
 * Handles error ingestion, processing, and storage with rate limiting and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger, logError, logSecurity } from '@/lib/logger';
import { errorTracker, StructuredError, ErrorSeverity, ErrorCategory } from '@/lib/error-tracking';
import { PrismaClient } from '@prisma/client';
import { withRateLimit, getRateLimiter } from '@/lib/rate-limiter';

const prisma = new PrismaClient();

// Validation schema for incoming error data
const ErrorTrackingSchema = z.object({
  message: z.string().min(1).max(1000),
  severity: z.nativeEnum(ErrorSeverity).optional(),
  category: z.nativeEnum(ErrorCategory).optional(),
  context: z.object({
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    requestId: z.string().optional(),
    userAgent: z.string().optional(),
    url: z.string().url().optional(),
    component: z.string().optional(),
    action: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    stack: z.string().optional()
  }).optional(),
  fingerprint: z.string().optional(),
  source: z.enum(['client', 'server', 'edge']).optional()
});

// Rate limiting configuration
const errorTrackingConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // Max 100 error reports per minute per IP
  message: 'Too many error reports, please try again later'
};

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return cfConnectingIP || realIP || forwarded?.split(',')[0] || 'unknown';
}

// Helper function to extract user context from request
function extractUserContext(request: NextRequest): {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
} {
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = getClientIP(request);
  
  // Try to extract user ID from auth headers or cookies
  // This would depend on your authentication implementation
  const authorization = request.headers.get('authorization');
  let userId: string | undefined;
  
  // Example: Extract from JWT token (implement based on your auth system)
  if (authorization?.startsWith('Bearer ')) {
    try {
      // Decode JWT and extract user ID (implement based on your JWT structure)
      // const token = authorization.substring(7);
      // const decoded = jwt.decode(token);
      // userId = decoded?.sub;
    } catch (error) {
      // Silent fail for auth extraction
    }
  }

  return {
    userId,
    userAgent,
    ip
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let errorId: string | undefined;

  try {
    return await withRateLimit(request, errorTrackingConfig, async () => {

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ErrorTrackingSchema.safeParse(body);

    if (!validationResult.success) {
      logError(new Error('Invalid error tracking data'), {
        validationErrors: validationResult.error.errors,
        receivedData: body
      });

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid error data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const errorData = validationResult.data;

    // Extract user context from request
    const userContext = extractUserContext(request);

    // Merge context
    const fullContext = {
      ...errorData.context,
      ...userContext,
      requestId: request.headers.get('x-request-id') || undefined,
      timestamp: new Date()
    };

    // Create error object
    const error = new Error(errorData.message);
    if (errorData.context?.stack) {
      error.stack = errorData.context.stack;
    }

    // Track the error
    errorId = errorTracker.captureError(
      error,
      errorData.category,
      fullContext
    );

    // Store in database for persistence and analysis
    try {
      await prisma.$executeRaw`
        INSERT INTO error_logs (
          id, message, severity, category, fingerprint, context, 
          user_id, session_id, source, created_at
        ) VALUES (
          ${errorId}, ${errorData.message}, ${errorData.severity || 'medium'}, 
          ${errorData.category || 'system_error'}, ${errorData.fingerprint || ''},
          ${JSON.stringify(fullContext)}, ${fullContext.userId || null}, 
          ${fullContext.sessionId || null}, ${errorData.source || 'unknown'}, 
          NOW()
        )
        ON CONFLICT (fingerprint) DO UPDATE SET
          count = error_logs.count + 1,
          last_seen = NOW(),
          context = ${JSON.stringify(fullContext)}
      `;
    } catch (dbError) {
      // Log database error but don't fail the request
      logError(dbError as Error, { 
        context: 'error_log_database_storage',
        errorId 
      });
    }

    // Log successful tracking
    logger.info({
      errorTracking: {
        errorId,
        severity: errorData.severity,
        category: errorData.category,
        component: fullContext.component,
        userId: fullContext.userId,
        duration: Date.now() - startTime
      }
    }, 'Error tracked successfully');

    return NextResponse.json({
      success: true,
      errorId,
      message: 'Error tracked successfully'
    });

    }); // Close withRateLimit
  } catch (error) {
    const processingErrorId = errorTracker.captureError(
      error as Error,
      ErrorCategory.SYSTEM_ERROR,
      {
        component: 'error-tracking-api',
        action: 'POST /api/errors/track',
        metadata: { originalErrorId: errorId }
      }
    );

    logError(error as Error, {
      context: 'error_tracking_api_failure',
      processingErrorId,
      originalErrorId: errorId,
      duration: Date.now() - startTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to track error',
        errorId: processingErrorId
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // This endpoint provides error tracking status and basic metrics
    const userContext = extractUserContext(request);
    
    // Apply basic rate limiting for GET requests
    const limiter = getRateLimiter();
    const { allowed } = await limiter.checkLimit(request, errorTrackingConfig);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get recent error metrics (last 24 hours)
    const metrics = errorTracker.getErrorMetrics();
    const recentErrors = errorTracker.getRecentErrors(10);
    const errorBudgets = Array.from(errorTracker.getErrorBudgets().entries()).map(([name, budget]) => ({
      name,
      ...budget
    }));

    // Sanitize error data for client response
    const sanitizedErrors = recentErrors.map(error => ({
      id: error.id,
      message: error.message,
      severity: error.severity,
      category: error.category,
      component: error.context.component,
      timestamp: error.lastSeen,
      count: error.count,
      resolved: error.resolved
    }));

    logger.info({
      errorMetrics: {
        requestedBy: userContext.userId || 'anonymous',
        ip: userContext.ip,
        totalErrors: metrics.totalErrors,
        errorRate: metrics.errorRate
      }
    }, 'Error metrics requested');

    return NextResponse.json({
      success: true,
      metrics,
      recentErrors: sanitizedErrors,
      errorBudgets,
      status: 'operational'
    });

  } catch (error) {
    const errorId = errorTracker.captureError(
      error as Error,
      ErrorCategory.SYSTEM_ERROR,
      {
        component: 'error-tracking-api',
        action: 'GET /api/errors/track'
      }
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get error metrics',
        errorId
      },
      { status: 500 }
    );
  }
}