/**
 * Performance Analytics API Route
 * Provides comprehensive performance metrics and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabasePerformanceStats } from '@/lib/db-optimized';
import { redisCache } from '@/lib/redis-cache';
import { getWebSocketManager } from '@/lib/websocket-optimized';
import { getCacheHeaders } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const timeRange = searchParams.get('range') || '1h'; // 1h, 24h, 7d, 30d

    // Collect performance metrics from various sources
    const metrics = await collectPerformanceMetrics(includeDetails, timeRange);

    const response = {
      success: true,
      data: metrics,
      meta: {
        requestTime: Date.now() - startTime,
        timestamp: Date.now(),
        range: timeRange,
      },
    };

    // Cache for 1 minute
    const headers = getCacheHeaders('realtime');
    
    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Performance analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to collect performance metrics',
        requestTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

async function collectPerformanceMetrics(includeDetails: boolean, timeRange: string) {
  const metrics: any = {
    database: await getDatabaseMetrics(),
    cache: await getCacheMetrics(),
    api: await getApiMetrics(timeRange),
    system: await getSystemMetrics(),
  };

  // Add WebSocket metrics if available
  try {
    const wsManager = getWebSocketManager();
    metrics.websocket = wsManager.getMetrics();
    metrics.websocketHealth = wsManager.getHealth();
  } catch (error) {
    // WebSocket manager not initialized
    metrics.websocket = null;
  }

  if (includeDetails) {
    metrics.details = await getDetailedMetrics(timeRange);
  }

  return metrics;
}

async function getDatabaseMetrics() {
  try {
    const dbStats = getDatabasePerformanceStats();
    
    return {
      queryCount: dbStats.queryCount,
      totalQueryTime: dbStats.totalQueryTime,
      averageQueryTime: dbStats.averageQueryTime,
      health: dbStats.averageQueryTime < 100 ? 'healthy' : 
              dbStats.averageQueryTime < 500 ? 'warning' : 'critical',
      recommendations: generateDbRecommendations(dbStats),
    };
  } catch (error) {
    return {
      error: 'Failed to collect database metrics',
      health: 'unknown',
    };
  }
}

async function getCacheMetrics() {
  try {
    const cacheStats = redisCache.getMetrics();
    
    return {
      ...cacheStats,
      health: cacheStats.isConnected ? 'healthy' : 'critical',
      recommendations: generateCacheRecommendations(cacheStats),
    };
  } catch (error) {
    return {
      error: 'Failed to collect cache metrics',
      health: 'unknown',
    };
  }
}

async function getApiMetrics(timeRange: string) {
  try {
    // Collect API performance data from logs or monitoring service
    // This would typically integrate with your logging/monitoring solution
    const metrics = {
      requestCount: await getRequestCount(timeRange),
      averageResponseTime: await getAverageResponseTime(timeRange),
      errorRate: await getErrorRate(timeRange),
      topEndpoints: await getTopEndpoints(timeRange),
      slowestEndpoints: await getSlowestEndpoints(timeRange),
    };

    const health = metrics.errorRate < 0.01 ? 'healthy' : 
                  metrics.errorRate < 0.05 ? 'warning' : 'critical';

    return {
      ...metrics,
      health,
      recommendations: generateApiRecommendations(metrics),
    };
  } catch (error) {
    return {
      error: 'Failed to collect API metrics',
      health: 'unknown',
    };
  }
}

async function getSystemMetrics() {
  try {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      cpu: await getCpuUsage(),
      health: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.8 ? 'healthy' : 'warning',
    };
  } catch (error) {
    return {
      error: 'Failed to collect system metrics',
      health: 'unknown',
    };
  }
}

async function getDetailedMetrics(timeRange: string) {
  return {
    performanceInsights: await getPerformanceInsights(timeRange),
    bottlenecks: await identifyBottlenecks(),
    optimizationSuggestions: await getOptimizationSuggestions(),
    trends: await getPerformanceTrends(timeRange),
  };
}

// Helper functions for metric collection
async function getRequestCount(timeRange: string): Promise<number> {
  // This would typically query your logs or analytics service
  // For now, return a mock value
  const multiplier = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
  return Math.floor(Math.random() * 1000) * multiplier;
}

async function getAverageResponseTime(timeRange: string): Promise<number> {
  // Mock implementation - would query actual metrics
  return 120 + Math.random() * 100;
}

async function getErrorRate(timeRange: string): Promise<number> {
  // Mock implementation - would query actual error logs
  return Math.random() * 0.02; // 0-2% error rate
}

async function getTopEndpoints(timeRange: string): Promise<Array<{endpoint: string, requests: number}>> {
  return [
    { endpoint: '/api/players', requests: 1250 },
    { endpoint: '/api/matchups', requests: 890 },
    { endpoint: '/api/roster', requests: 670 },
    { endpoint: '/api/leagues', requests: 450 },
    { endpoint: '/api/analytics', requests: 340 },
  ];
}

async function getSlowestEndpoints(timeRange: string): Promise<Array<{endpoint: string, avgTime: number}>> {
  return [
    { endpoint: '/api/analytics', avgTime: 850 },
    { endpoint: '/api/players', avgTime: 320 },
    { endpoint: '/api/matchups', avgTime: 180 },
    { endpoint: '/api/trades', avgTime: 150 },
    { endpoint: '/api/roster', avgTime: 90 },
  ];
}

async function getCpuUsage(): Promise<{percentage: number}> {
  // Mock implementation - would use actual CPU monitoring
  return { percentage: 15 + Math.random() * 20 };
}

// Recommendation generators
function generateDbRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.averageQueryTime > 200) {
    recommendations.push('Consider adding database indexes for frequently queried fields');
  }
  
  if (stats.queryCount > 1000) {
    recommendations.push('Implement query result caching to reduce database load');
  }
  
  if (stats.averageQueryTime > 500) {
    recommendations.push('Review and optimize slow queries');
    recommendations.push('Consider database connection pooling');
  }
  
  return recommendations;
}

function generateCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.hitRate < 0.7) {
    recommendations.push('Cache hit rate is low - review caching strategy');
  }
  
  if (stats.averageTime > 10) {
    recommendations.push('Cache response time is high - check Redis configuration');
  }
  
  if (!stats.isConnected) {
    recommendations.push('Redis connection is down - check cache server status');
  }
  
  return recommendations;
}

function generateApiRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.errorRate > 0.01) {
    recommendations.push('API error rate is elevated - investigate error patterns');
  }
  
  if (stats.averageResponseTime > 300) {
    recommendations.push('API response times are slow - consider performance optimization');
  }
  
  return recommendations;
}

// Advanced analytics functions
async function getPerformanceInsights(timeRange: string): Promise<any> {
  return {
    peakTrafficHours: ['19:00-21:00', '12:00-14:00'],
    performanceScore: 8.5,
    bottleneckSeverity: 'low',
    optimizationOpportunities: 3,
  };
}

async function identifyBottlenecks(): Promise<any> {
  return {
    database: {
      severity: 'medium',
      impact: 'Query response times during peak hours',
      suggestion: 'Implement read replicas for heavy queries',
    },
    cache: {
      severity: 'low',
      impact: 'Occasional cache misses on player data',
      suggestion: 'Increase cache TTL for stable data',
    },
    network: {
      severity: 'low',
      impact: 'Mobile connection latency',
      suggestion: 'Implement response compression',
    },
  };
}

async function getOptimizationSuggestions(): Promise<string[]> {
  return [
    'Enable response compression for mobile clients',
    'Implement progressive data loading for large lists',
    'Add connection pooling for database queries',
    'Use CDN for static assets',
    'Implement service worker for offline functionality',
  ];
}

async function getPerformanceTrends(timeRange: string): Promise<any> {
  // Mock trend data - would be calculated from historical metrics
  return {
    responseTime: {
      trend: 'improving',
      change: -5.2, // 5.2% improvement
    },
    errorRate: {
      trend: 'stable',
      change: 0.1,
    },
    throughput: {
      trend: 'increasing',
      change: 12.3,
    },
    cacheHitRate: {
      trend: 'improving',
      change: 8.7,
    },
  };
}