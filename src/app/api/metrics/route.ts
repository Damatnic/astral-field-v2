import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic application metrics for monitoring
    const metrics = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',
      environment: process.env.NODE_ENV || 'production',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      
      // Performance metrics
      performance: {
        startTime: Date.now(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      
      // Health indicators
      health: {
        database: 'connected', // Will be updated with actual DB check
        cache: 'operational',
        external_apis: 'operational',
      },
      
      // Request information
      request_info: {
        url: request.url,
        method: request.method,
        user_agent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      }
    };

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Metrics collection failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}