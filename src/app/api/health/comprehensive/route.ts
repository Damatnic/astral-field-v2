/**
 * Comprehensive Health Check Endpoint for AstralField
 * Provides detailed system health monitoring and diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { database } from '@/lib/database';
import { cacheService } from '@/lib/cache/redis-client';
import { asyncHandler } from '@/lib/error-handling';

interface HealthComponent {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
}

interface ComprehensiveHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    database: HealthComponent;
    redis: HealthComponent;
    application: HealthComponent;
    external_services: HealthComponent;
  };
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    errors: {
      total: number;
      recent: number;
      errorRate: number;
    };
    performance: {
      avgResponseTime: number;
      requestsPerSecond: number;
    };
  };
}

class HealthChecker {
  private startTime: number;
  private errorCounts = new Map<string, number>();
  private responseTimes: number[] = [];
  private requestCounts: number[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  async checkDatabase(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      const health = await database.getHealth();
      const responseTime = Date.now() - startTime;

      return {
        status: health.status,
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          connection: health.details.connection,
          activeConnections: health.details.activeConnections,
          queuedConnections: health.details.queuedConnections,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async checkRedis(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await cacheService.ping();
      const stats = await cacheService.getStats();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          connected: stats.connected,
          ...stats,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async checkApplication(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      // Basic application checks
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const responseTime = Date.now() - startTime;

      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (memoryPercentage > 90 || uptime < 60) {
        status = 'unhealthy';
      } else if (memoryPercentage > 75 || responseTime > 1000) {
        status = 'degraded';
      }

      return {
        status,
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          uptime: Math.floor(uptime),
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            percentage: Math.round(memoryPercentage),
          },
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async checkExternalServices(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      // Check external service dependencies
      // For now, this is a placeholder - you can add actual service checks
      const checks = [
        // Add your external service checks here
        // e.g., ESPN API, third-party services, etc.
      ];

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy', // Default to healthy if no external services configured
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          services: [],
          totalChecked: checks.length,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private getMemoryMetrics() {
    const usage = process.memoryUsage();
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024),
      total: Math.round(usage.heapTotal / 1024 / 1024),
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };
  }

  private getCpuMetrics() {
    // This is a simplified CPU usage calculation
    // In production, you might want to use a more sophisticated method
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    
    return {
      usage: Math.round((totalUsage / 1000000) * 100) / 100, // Convert to percentage
    };
  }

  private getErrorMetrics() {
    const total = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const recent = 0; // Implement recent error counting if needed
    
    return {
      total,
      recent,
      errorRate: total > 0 ? recent / total : 0,
    };
  }

  private getPerformanceMetrics() {
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;
    
    const requestsPerSecond = this.requestCounts.length > 0
      ? this.requestCounts.reduce((sum, count) => sum + count, 0) / this.requestCounts.length
      : 0;

    return {
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    };
  }

  async performComprehensiveCheck(): Promise<ComprehensiveHealthCheck> {
    try {
      // Run all health checks in parallel for better performance
      const [database, redis, application, external_services] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkApplication(),
        this.checkExternalServices(),
      ]);

      // Determine overall system health
      const components = { database, redis, application, external_services };
      const overallStatus = this.determineOverallHealth(components);

      const health: ComprehensiveHealthCheck = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '2.1.0',
        environment: process.env.NODE_ENV || 'development',
        components,
        metrics: {
          memory: this.getMemoryMetrics(),
          cpu: this.getCpuMetrics(),
          errors: this.getErrorMetrics(),
          performance: this.getPerformanceMetrics(),
        },
      };

      return health;
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '2.1.0',
        environment: process.env.NODE_ENV || 'development',
        components: {
          database: { status: 'unhealthy', lastCheck: new Date().toISOString() },
          redis: { status: 'unhealthy', lastCheck: new Date().toISOString() },
          application: { status: 'unhealthy', lastCheck: new Date().toISOString() },
          external_services: { status: 'unhealthy', lastCheck: new Date().toISOString() },
        },
        metrics: {
          memory: this.getMemoryMetrics(),
          cpu: { usage: 0 },
          errors: { total: 0, recent: 0, errorRate: 0 },
          performance: { avgResponseTime: 0, requestsPerSecond: 0 },
        },
      };
    }
  }

  private determineOverallHealth(components: Record<string, HealthComponent>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(components).map(component => component.status);
    
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

const healthChecker = new HealthChecker();

export const GET = asyncHandler(async (request: NextRequest) => {
  try {
    const health = await healthChecker.performComprehensiveCheck();
    
    // Set appropriate HTTP status code based on health
    const statusCode = health.status === 'healthy' ? 200 
                    : health.status === 'degraded' ? 200  // Still operational
                    : 503; // Service unavailable
    
    // Set cache headers to prevent caching of health checks
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Type': 'application/json',
    };

    return NextResponse.json(health, { status: statusCode, headers });
    
  } catch (error) {
    logger.error({ error }, 'Health check endpoint failed');
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, { status: 503 });
  }
});