import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/utils/errorHandling';
import { errorTracker, ErrorCategory, captureError } from '@/lib/error-tracking';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Use new comprehensive error tracking system
    const errorId = captureError(
      errorData.error || errorData.message || 'Unknown error',
      errorData.category || ErrorCategory.USER_ERROR,
      {
        component: errorData.component || 'client',
        userId: errorData.userId,
        url: errorData.url,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: errorData.metadata
      }
    );

    // Also use legacy error handling for backward compatibility
    handleComponentError(errorData as Error, 'legacy-route');
    
    logger.info({
      errorReport: {
        errorId,
        source: 'legacy-api',
        component: errorData.component
      }
    }, 'Error reported via legacy API');
    
    return NextResponse.json({ 
      success: true, 
      errorId,
      message: 'Error recorded' 
    });
  } catch (error) {
    const errorId = captureError(
      error as Error,
      ErrorCategory.SYSTEM_ERROR,
      {
        component: 'legacy-error-api',
        action: 'POST /api/errors'
      }
    );

    handleComponentError(error as Error, 'legacy-route');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to record error',
        errorId
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get basic error tracking status
    const metrics = errorTracker.getErrorMetrics();
    const recentErrors = errorTracker.getRecentErrors(5);
    
    return NextResponse.json({ 
      message: 'Error endpoint active',
      timestamp: new Date().toISOString(),
      status: 'operational',
      metrics: {
        totalErrors: metrics.totalErrors,
        errorRate: metrics.errorRate,
        recentErrorCount: recentErrors.length
      }
    });
  } catch (error) {
    const errorId = captureError(
      error as Error,
      ErrorCategory.SYSTEM_ERROR,
      {
        component: 'legacy-error-api',
        action: 'GET /api/errors'
      }
    );

    return NextResponse.json({
      message: 'Error endpoint operational with issues',
      timestamp: new Date().toISOString(),
      status: 'degraded',
      errorId
    }, { status: 200 }); // Return 200 to indicate endpoint is available
  }
}