import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Production metrics storage
let metricsStore = {
  startTime: Date.now(),
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    routes: {} as Record<string, number>,
  },
  performance: {
    averageResponseTime: 0,
    slowestEndpoint: '',
    slowestTime: 0,
    responseTimeHistory: [] as number[],
  },
  database: {
    queries: 0,
    slowQueries: 0,
    errorCount: 0,
    connectionPool: {
      active: 0,
      idle: 0,
      total: 0,
    },
  },
  errors: {
    count: 0,
    recent: [] as Array<{ timestamp: string; error: string; endpoint?: string }>,
  },
  security: {
    rateLimitHits: 0,
    blockedRequests: 0,
    suspiciousActivity: [],
  },
};

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Gather comprehensive system metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - metricsStore.startTime,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',
      environment: process.env.NODE_ENV || 'production',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      
      system: {
        memory: {
          ...process.memoryUsage(),
          freeMemory: process.platform !== 'win32' ? require('os').freemem() : null,
          totalMemory: process.platform !== 'win32' ? require('os').totalmem() : null,
        },
        cpu: process.platform !== 'win32' ? require('os').loadavg() : null,
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
      },
      
      requests: {
        ...metricsStore.requests,
        requestsPerMinute: metricsStore.requests.total / (Date.now() - metricsStore.startTime) * 60000,
        errorRate: metricsStore.requests.total > 0 ? 
          (metricsStore.requests.failed / metricsStore.requests.total * 100).toFixed(2) + '%' : '0%',
      },
      
      performance: {
        ...metricsStore.performance,
        currentResponseTime: 0, // Will be set at the end
      },
      
      database: {
        status: 'unknown',
        ...metricsStore.database,
        connectionPool: {
          ...metricsStore.database.connectionPool,
          utilization: metricsStore.database.connectionPool.total > 0 ? 
            (metricsStore.database.connectionPool.active / metricsStore.database.connectionPool.total * 100).toFixed(2) + '%' : '0%',
        },
      },
      
      security: {
        ...metricsStore.security,
      },
      
      errors: {
        count: metricsStore.errors.count,
        recentErrors: metricsStore.errors.recent.slice(-10), // Last 10 errors
      },
      
      // Request information
      requestInfo: {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      }
    };

    // Test database and get detailed connection info
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;
      
      metrics.database.status = 'connected';
      metrics.database.lastResponseTime = dbResponseTime;
      
      // Get detailed connection pool info
      const connectionInfo = await prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          max(now() - query_start) as longest_running_query,
          count(*) FILTER (WHERE now() - query_start > interval '1 minute') as long_running_queries
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[];
      
      if (connectionInfo[0]) {
        const info = connectionInfo[0];
        metrics.database.connectionPool = {
          active: parseInt(info.active_connections) || 0,
          idle: parseInt(info.idle_connections) || 0,
          total: parseInt(info.total_connections) || 0,
          idleInTransaction: parseInt(info.idle_in_transaction) || 0,
          longRunningQueries: parseInt(info.long_running_queries) || 0,
          utilization: parseInt(info.total_connections) > 0 ? 
            ((parseInt(info.active_connections) / parseInt(info.total_connections)) * 100).toFixed(2) + '%' : '0%',
        };
      }

      // Get database size and table statistics
      const dbStats = await prisma.$queryRaw`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
      ` as any[];
      
      if (dbStats[0]) {
        metrics.database.size = dbStats[0].database_size;
        metrics.database.tableCount = parseInt(dbStats[0].table_count) || 0;
      }

    } catch (error: any) {
      metrics.database.status = 'error';
      metrics.database.error = error.message;
      metricsStore.database.errorCount++;
    }

    // Update request metrics
    metricsStore.requests.total++;
    metricsStore.requests.successful++;
    
    // Track route
    const pathname = new URL(request.url).pathname;
    metricsStore.requests.routes[pathname] = (metricsStore.requests.routes[pathname] || 0) + 1;

    // Calculate and record response time
    const responseTime = Date.now() - startTime;
    metrics.performance.currentResponseTime = responseTime;
    
    // Update performance metrics
    metricsStore.performance.responseTimeHistory.push(responseTime);
    if (metricsStore.performance.responseTimeHistory.length > 100) {
      metricsStore.performance.responseTimeHistory.shift(); // Keep only last 100
    }
    
    metricsStore.performance.averageResponseTime = 
      metricsStore.performance.responseTimeHistory.reduce((a, b) => a + b, 0) / 
      metricsStore.performance.responseTimeHistory.length;

    if (responseTime > metricsStore.performance.slowestTime) {
      metricsStore.performance.slowestTime = responseTime;
      metricsStore.performance.slowestEndpoint = pathname;
    }

    // Add health status based on metrics
    metrics.health = {
      overall: 'healthy',
      issues: [] as string[],
    };

    // Check for issues
    if (metrics.database.status === 'error') {
      metrics.health.overall = 'unhealthy';
      metrics.health.issues.push('Database connection failed');
    }
    
    if (parseFloat(metrics.requests.errorRate) > 5) {
      metrics.health.overall = 'degraded';
      metrics.health.issues.push('High error rate');
    }
    
    if (metrics.performance.averageResponseTime > 1000) {
      metrics.health.overall = 'degraded';
      metrics.health.issues.push('Slow response times');
    }

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
  } catch (error: any) {
    metricsStore.requests.total++;
    metricsStore.requests.failed++;
    metricsStore.errors.count++;
    metricsStore.errors.recent.push({
      timestamp: new Date().toISOString(),
      error: error.message,
      endpoint: '/api/metrics',
    });

    return NextResponse.json(
      { 
        error: 'Failed to gather metrics', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Reset metrics endpoint (for testing/maintenance)
export async function DELETE() {
  metricsStore = {
    startTime: Date.now(),
    requests: { total: 0, successful: 0, failed: 0, routes: {} },
    performance: { averageResponseTime: 0, slowestEndpoint: '', slowestTime: 0, responseTimeHistory: [] },
    database: { queries: 0, slowQueries: 0, errorCount: 0, connectionPool: { active: 0, idle: 0, total: 0 } },
    errors: { count: 0, recent: [] },
    security: { rateLimitHits: 0, blockedRequests: 0, suspiciousActivity: [] },
  };

  return NextResponse.json({ message: 'Metrics reset successfully' });
}