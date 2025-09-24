import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis';
import { productionAlerts } from '@/lib/monitoring/production-alerts';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    api: ServiceHealth;
    external: ServiceHealth;
  };
  metrics: {
    responseTime: number;
    memoryUsage: number;
    activeUsers: number;
    errorRate: number;
  };
  alerts: {
    active: number;
    critical: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize services
    const prisma = new PrismaClient();
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Check database health
    const databaseHealth = await checkDatabaseHealth(prisma);
    
    // Check Redis health
    const redisHealth = await checkRedisHealth(redis);
    
    // Check API health
    const apiHealth = await checkApiHealth();
    
    // Check external services
    const externalHealth = await checkExternalServices();
    
    // Get system metrics
    const metrics = await getSystemMetrics(redis);
    
    // Get active alerts
    const alerts = await getAlertStatus();
    
    // Calculate overall status
    const services = {
      database: databaseHealth,
      redis: redisHealth,
      api: apiHealth,
      external: externalHealth
    };
    
    const overallStatus = calculateOverallStatus(services);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      metrics: {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        activeUsers: metrics.activeUsers,
        errorRate: metrics.errorRate
      },
      alerts: {
        active: alerts.active,
        critical: alerts.critical
      }
    };

    // Store health check result
    await redis.setex('health:latest', 300, JSON.stringify(healthStatus)); // Cache for 5 minutes
    await redis.lpush('health:history', JSON.stringify(healthStatus));
    await redis.ltrim('health:history', 0, 287); // Keep 24 hours of 5-minute intervals

    // Clean up
    await prisma.$disconnect();

    return NextResponse.json(healthStatus, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
        redis: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
        api: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
        external: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' }
      },
      metrics: {
        responseTime: Date.now() - startTime,
        memoryUsage: 0,
        activeUsers: 0,
        errorRate: 100
      },
      alerts: {
        active: 0,
        critical: 0
      }
    };

    return NextResponse.json(errorStatus, { status: 503 });
  }
}

async function checkDatabaseHealth(prisma: PrismaClient): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkRedisHealth(redis: Redis): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test Redis connectivity with ping
    await redis.ping();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 500 ? 'healthy' : responseTime < 1500 ? 'degraded' : 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkApiHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Check internal API endpoints
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/test`, {
      method: 'GET',
      headers: { 'User-Agent': 'AstralField-HealthCheck' }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkExternalServices(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Check ESPN API connectivity
    const espnResponse = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
      method: 'GET',
      headers: { 'User-Agent': 'AstralField-HealthCheck' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (espnResponse.ok) {
      return {
        status: responseTime < 2000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } else {
      return {
        status: 'degraded', // External services being down shouldn't make us unhealthy
        responseTime,
        lastCheck: new Date().toISOString(),
        error: `ESPN API HTTP ${espnResponse.status}`
      };
    }
  } catch (error) {
    return {
      status: 'degraded', // External services being down shouldn't make us unhealthy
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getSystemMetrics(redis: Redis): Promise<{
  activeUsers: number;
  errorRate: number;
}> {
  try {
    const now = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute intervals
    
    // Get active users from last 5 minutes
    const activeUsers = await redis.scard(`active_users:${now}`);
    
    // Get error rate from last 5 minutes
    const totalRequests = await redis.get(`requests:total:${now}`);
    const errorRequests = await redis.get(`requests:errors:${now}`);
    
    const total = parseInt(totalRequests as string || '0');
    const errors = parseInt(errorRequests as string || '0');
    const errorRate = total > 0 ? (errors / total) * 100 : 0;
    
    return {
      activeUsers,
      errorRate
    };
  } catch (error) {
    return {
      activeUsers: 0,
      errorRate: 0
    };
  }
}

async function getAlertStatus(): Promise<{ active: number; critical: number }> {
  try {
    const activeAlerts = await productionAlerts.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    return {
      active: activeAlerts.length,
      critical: criticalAlerts.length
    };
  } catch (error) {
    return {
      active: 0,
      critical: 0
    };
  }
}

function calculateOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(service => service.status);
  
  // If any critical service is unhealthy, system is unhealthy
  if (services.database.status === 'unhealthy' || services.api.status === 'unhealthy') {
    return 'unhealthy';
  }
  
  // If any service is unhealthy or degraded, system is degraded
  if (statuses.includes('unhealthy') || statuses.includes('degraded')) {
    return 'degraded';
  }
  
  // All services healthy
  return 'healthy';
}

// Metrics collection endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metric, value, timestamp } = body;

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const timeSlot = Math.floor((timestamp || Date.now()) / (5 * 60 * 1000));

    switch (metric) {
      case 'api_request':
        await redis.incr(`requests:total:${timeSlot}`);
        if (body.error) {
          await redis.incr(`requests:errors:${timeSlot}`);
        }
        if (body.responseTime) {
          await redis.lpush('metrics:api_response_times', body.responseTime);
          await redis.ltrim('metrics:api_response_times', 0, 999); // Keep last 1000 requests
        }
        break;

      case 'active_user':
        await redis.sadd(`active_users:${timeSlot}`, body.userId);
        await redis.expire(`active_users:${timeSlot}`, 600); // Expire after 10 minutes
        break;

      case 'failed_login':
        await redis.incr(`failed_logins:${timeSlot}`);
        await redis.expire(`failed_logins:${timeSlot}`, 600);
        break;

      case 'database_error':
        await redis.incr(`failures:database:${timeSlot}`);
        await redis.expire(`failures:database:${timeSlot}`, 600);
        break;

      case 'redis_error':
        await redis.incr(`failures:redis:${timeSlot}`);
        await redis.expire(`failures:redis:${timeSlot}`, 600);
        break;

      case 'suspicious_ip':
        await redis.sadd('suspicious_ips', body.ip);
        await redis.incr(`ip_activity:${timeSlot}:${body.ip}`);
        await redis.expire(`ip_activity:${timeSlot}:${body.ip}`, 120); // 2 minutes
        break;

      default:
        return NextResponse.json({ error: 'Unknown metric type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error collecting metric:', error);
    return NextResponse.json({ error: 'Failed to collect metric' }, { status: 500 });
  }
}