
export const dynamic = 'force-dynamic';
/**
 * Error Analytics API Endpoint
 * Provides detailed error analytics, trends, and insights for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger, logError } from '@/lib/logger';
import { errorTracker, ErrorSeverity, ErrorCategory } from '@/lib/error-tracking';
import { PrismaClient } from '@prisma/client';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

const prisma = new PrismaClient();

// Query parameter validation schema
const AnalyticsQuerySchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  severity: z.nativeEnum(ErrorSeverity).optional(),
  category: z.nativeEnum(ErrorCategory).optional(),
  component: z.string().optional(),
  userId: z.string().optional(),
  groupBy: z.enum(['hour', 'day', 'component', 'category', 'severity']).optional().default('hour'),
  limit: z.coerce.number().min(1).max(1000).optional().default(100)
});

// Rate limiting for analytics requests
const analyticsConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Max 30 analytics requests per minute
  message: 'Too many analytics requests'
};

// Helper function to convert time range to milliseconds
function getTimeRangeMs(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return ranges[timeRange] || ranges['24h'];
}

// Helper function to get time bucket interval
function getTimeBucket(groupBy: string): string {
  const buckets: Record<string, string> = {
    'hour': '1 hour',
    'day': '1 day'
  };
  return buckets[groupBy] || '1 hour';
}

// Function to calculate error trends
function calculateTrends(current: number, previous: number): {
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
} {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 5) {
    trend = changePercent > 0 ? 'up' : 'down';
  }

  return { change, changePercent, trend };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Apply rate limiting  
    return await withRateLimit(request, analyticsConfig, async () => {

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = AnalyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { timeRange, severity, category, component, userId, groupBy, limit } = validationResult.data;

    // Calculate time bounds
    const timeRangeMs = getTimeRangeMs(timeRange);
    const endTime = new Date();
    const startTimeDate = new Date(endTime.getTime() - timeRangeMs);
    
    // Get previous period for trend comparison
    const prevStartTime = new Date(startTimeDate.getTime() - timeRangeMs);
    const prevEndTime = startTimeDate;

    // Get error metrics from error tracker
    const currentMetrics = errorTracker.getErrorMetrics({
      start: startTimeDate,
      end: endTime
    });

    const previousMetrics = errorTracker.getErrorMetrics({
      start: prevStartTime,
      end: prevEndTime
    });

    // Calculate trends
    const errorTrend = calculateTrends(currentMetrics.totalErrors, previousMetrics.totalErrors);
    const rateTrend = calculateTrends(currentMetrics.errorRate, previousMetrics.errorRate);

    // Build SQL query for detailed analytics
    let sqlWhere = 'WHERE created_at >= $1 AND created_at <= $2';
    let params: any[] = [startTimeDate, endTime];
    let paramIndex = 3;

    if (severity) {
      sqlWhere += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (category) {
      sqlWhere += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (component) {
      sqlWhere += ` AND context->>'component' = $${paramIndex}`;
      params.push(component);
      paramIndex++;
    }

    if (userId) {
      sqlWhere += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Get time series data
    let timeSeriesData: any[] = [];
    if (groupBy === 'hour' || groupBy === 'day') {
      const interval = getTimeBucket(groupBy);
      
      try {
        timeSeriesData = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC(${interval}, created_at) as time_bucket,
            COUNT(*) as error_count,
            COUNT(DISTINCT fingerprint) as unique_errors,
            severity,
            category
          FROM error_logs 
          ${sqlWhere}
          GROUP BY time_bucket, severity, category
          ORDER BY time_bucket DESC
          LIMIT ${limit}
        `;
      } catch (dbError) {
        // Fallback to in-memory data if database query fails
        logError(dbError as Error, { context: 'error_analytics_timeseries' });
      }
    }

    // Get top error components
    let topComponents: any[] = [];
    try {
      topComponents = await prisma.$queryRaw`
        SELECT 
          context->>'component' as component,
          COUNT(*) as error_count,
          COUNT(DISTINCT fingerprint) as unique_errors,
          MAX(created_at) as last_seen
        FROM error_logs 
        ${sqlWhere}
        GROUP BY context->>'component'
        ORDER BY error_count DESC
        LIMIT 20
      `;
    } catch (dbError) {
      logError(dbError as Error, { context: 'error_analytics_components' });
    }

    // Get error pattern analysis
    let errorPatterns: any[] = [];
    try {
      errorPatterns = await prisma.$queryRaw`
        SELECT 
          fingerprint,
          message,
          COUNT(*) as occurrences,
          severity,
          category,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          COUNT(DISTINCT user_id) as affected_users
        FROM error_logs 
        ${sqlWhere}
        GROUP BY fingerprint, message, severity, category
        ORDER BY occurrences DESC
        LIMIT 50
      `;
    } catch (dbError) {
      logError(dbError as Error, { context: 'error_analytics_patterns' });
    }

    // Get user impact analysis
    let userImpact: any = {};
    try {
      const impactData = await prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT user_id) as affected_users,
          COUNT(*) as total_errors,
          AVG(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_error_rate
        FROM error_logs 
        ${sqlWhere} AND user_id IS NOT NULL
      `;
      
      userImpact = Array.isArray(impactData) ? impactData[0] : {};
    } catch (dbError) {
      logError(dbError as Error, { context: 'error_analytics_user_impact' });
    }

    // Calculate MTTR (Mean Time To Resolution) for resolved errors
    let mttr: number | null = null;
    try {
      const mttrData = await prisma.$queryRaw`
        SELECT AVG(
          EXTRACT(EPOCH FROM (resolved_at - created_at))
        ) as avg_resolution_time_seconds
        FROM error_logs 
        WHERE resolved_at IS NOT NULL 
        AND created_at >= $1 
        AND created_at <= $2
      `;
      
      if (Array.isArray(mttrData) && mttrData[0]?.avg_resolution_time_seconds) {
        mttr = Number(mttrData[0].avg_resolution_time_seconds);
      }
    } catch (dbError) {
      logError(dbError as Error, { context: 'error_analytics_mttr' });
    }

    // Build response
    const analytics = {
      summary: {
        timeRange,
        totalErrors: currentMetrics.totalErrors,
        uniqueErrors: Object.keys(currentMetrics.errorsByComponent).length,
        errorRate: currentMetrics.errorRate,
        affectedUsers: userImpact.affected_users || 0,
        mttr: mttr ? Math.round(mttr / 60) : null, // Convert to minutes
        trends: {
          errors: errorTrend,
          rate: rateTrend
        }
      },
      breakdown: {
        bySeverity: currentMetrics.errorsBySeverity,
        byCategory: currentMetrics.errorsByCategory,
        byComponent: currentMetrics.errorsByComponent
      },
      timeSeries: timeSeriesData,
      topComponents,
      errorPatterns,
      userImpact,
      generated: {
        at: new Date().toISOString(),
        duration: Date.now() - startTime,
        queryParams: validationResult.data
      }
    };

    // Log analytics request
    logger.info({
      errorAnalytics: {
        timeRange,
        totalErrors: currentMetrics.totalErrors,
        errorRate: currentMetrics.errorRate,
        duration: Date.now() - startTime
      }
    }, 'Error analytics generated');

    return NextResponse.json({
      success: true,
      analytics
    });

    }); // Close withRateLimit
  } catch (error) {
    const errorId = errorTracker.captureError(
      error as Error,
      ErrorCategory.SYSTEM_ERROR,
      {
        component: 'error-analytics-api',
        action: 'GET /api/errors/analytics'
      }
    );

    logError(error as Error, {
      context: 'error_analytics_api_failure',
      errorId,
      duration: Date.now() - startTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate analytics',
        errorId
      },
      { status: 500 }
    );
  }
}

// POST endpoint for custom analytics queries
export async function POST(request: NextRequest) {
  try {
    return await withRateLimit(request, analyticsConfig, async () => {

    const body = await request.json();
    
    // Custom analytics query schema
    const CustomQuerySchema = z.object({
      query: z.string().min(1).max(1000),
      timeRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime()
      }),
      filters: z.object({
        severity: z.array(z.nativeEnum(ErrorSeverity)).optional(),
        category: z.array(z.nativeEnum(ErrorCategory)).optional(),
        components: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional()
      }).optional(),
      groupBy: z.array(z.string()).optional(),
      limit: z.number().min(1).max(1000).optional().default(100)
    });

    const validationResult = CustomQuerySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid custom query',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { query, timeRange, filters, groupBy, limit } = validationResult.data;

    // This would implement custom analytics queries
    // For security, you'd want to validate and sanitize the query
    // and only allow predefined query patterns

    logger.info({
      customAnalytics: {
        query: query.substring(0, 100), // Log truncated query
        timeRange,
        filters
      }
    }, 'Custom analytics query requested');

    return NextResponse.json({
      success: true,
      message: 'Custom analytics queries not yet implemented',
      queryReceived: query
    });

    }); // Close withRateLimit
  } catch (error) {
    const errorId = errorTracker.captureError(
      error as Error,
      ErrorCategory.SYSTEM_ERROR,
      {
        component: 'error-analytics-api',
        action: 'POST /api/errors/analytics'
      }
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process custom analytics query',
        errorId
      },
      { status: 500 }
    );
  }
}