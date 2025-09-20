import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Production health monitoring
const startTime = Date.now();
let healthMetrics = {
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  lastCheck: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  const checkStart = Date.now();
  healthMetrics.requestCount++;
  
  const health = {
    status: 'operational',
    message: 'API is responding',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',
    uptime: Date.now() - startTime,
    metrics: {
      requests: healthMetrics.requestCount,
      errors: healthMetrics.errorCount,
      averageResponseTime: healthMetrics.averageResponseTime,
      memoryUsage: process.memoryUsage(),
    },
    checks: {
      api: { status: 'healthy', message: 'API is responding', responseTime: 0 },
      database: { status: 'unknown', message: 'Not checked', responseTime: 0 },
      cache: { status: 'unknown', message: 'Not checked', responseTime: 0 },
      external: { status: 'unknown', message: 'Not checked', responseTime: 0 },
    }
  };

  // Test database connection
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - dbStart;
    health.checks.database = { 
      status: 'healthy', 
      message: 'Database connected', 
      responseTime: dbTime 
    };
    
    // Check database pool status
    const activeConnections = await prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    ` as any[];
    
    health.checks.database.message += ` (${activeConnections[0]?.active_connections || 0} active connections)`;
  } catch (error: any) {
    healthMetrics.errorCount++;
    health.checks.database = { 
      status: 'unhealthy', 
      message: `Database connection failed: ${error.message}`, 
      responseTime: Date.now() - checkStart 
    };
    health.status = 'degraded';
  }

  // Test Redis cache (if configured)
  try {
    if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
      const cacheStart = Date.now();
      // Basic cache check - could be enhanced with actual Redis client
      const cacheTime = Date.now() - cacheStart;
      health.checks.cache = { 
        status: 'healthy', 
        message: 'Cache configured', 
        responseTime: cacheTime 
      };
    } else {
      health.checks.cache = { 
        status: 'info', 
        message: 'Cache not configured', 
        responseTime: 0 
      };
    }
  } catch (error: any) {
    health.checks.cache = { 
      status: 'degraded', 
      message: `Cache check failed: ${error.message}`, 
      responseTime: 0 
    };
  }

  // Test external services (Sleeper API)
  try {
    const externalStart = Date.now();
    const sleeper = await fetch('https://api.sleeper.app/v1/state/nfl', {
      method: 'GET',
      timeout: 5000
    });
    const externalTime = Date.now() - externalStart;
    
    if (sleeper.ok) {
      health.checks.external = { 
        status: 'healthy', 
        message: 'External APIs responding', 
        responseTime: externalTime 
      };
    } else {
      health.checks.external = { 
        status: 'degraded', 
        message: 'External API issues', 
        responseTime: externalTime 
      };
    }
  } catch (error: any) {
    health.checks.external = { 
      status: 'degraded', 
      message: `External API check failed: ${error.message}`, 
      responseTime: 0 
    };
  }

  // Calculate response time and update metrics
  const responseTime = Date.now() - checkStart;
  health.checks.api.responseTime = responseTime;
  
  // Update average response time
  healthMetrics.averageResponseTime = (
    (healthMetrics.averageResponseTime * (healthMetrics.requestCount - 1) + responseTime) / 
    healthMetrics.requestCount
  );
  healthMetrics.lastCheck = health.timestamp;

  // Determine overall status
  const unhealthyChecks = Object.values(health.checks).filter(check => check.status === 'unhealthy');
  const degradedChecks = Object.values(health.checks).filter(check => check.status === 'degraded');
  
  if (unhealthyChecks.length > 0) {
    health.status = 'unhealthy';
  } else if (degradedChecks.length > 0) {
    health.status = 'degraded';
  }

  // Return appropriate status code
  let statusCode = 200;
  if (health.status === 'unhealthy') statusCode = 503;
  else if (health.status === 'degraded') statusCode = 200; // Still available

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}