import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Basic health metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      status: 'healthy',
      system: {
        memory: {
          freeMemory: process.memoryUsage().heapUsed,
          totalMemory: process.memoryUsage().heapTotal,
          usage: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2) + '%'
        },
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime()
      }
    };

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch metrics'
    }, { status: 500 });
  }
}