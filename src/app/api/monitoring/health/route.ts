import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

export async function GET() {
  const startTime = Date.now();
  
  const health: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: [],
    summary: {
      total: 0,
      healthy: 0,
      unhealthy: 0,
      degraded: 0
    }
  };

  // Database Health Check
  const dbCheck = await checkDatabase();
  health.checks.push(dbCheck);

  // ESPN API Health Check
  const espnCheck = await checkESPNAPI();
  health.checks.push(espnCheck);

  // Authentication Health Check
  const authCheck = await checkAuthentication();
  health.checks.push(authCheck);

  // Environment Variables Check
  const envCheck = await checkEnvironmentVariables();
  health.checks.push(envCheck);

  // Memory Health Check
  const memoryCheck = await checkMemoryUsage();
  health.checks.push(memoryCheck);

  // Disk Space Check (simplified for serverless)
  const systemCheck = await checkSystemHealth();
  health.checks.push(systemCheck);

  // Calculate summary
  health.summary.total = health.checks.length;
  health.checks.forEach(check => {
    health.summary[check.status]++;
  });

  // Determine overall health status
  if (health.summary.unhealthy > 0) {
    health.status = 'unhealthy';
  } else if (health.summary.degraded > 0) {
    health.status = 'degraded';
  } else {
    health.status = 'healthy';
  }

  // Add response time
  const responseTime = Date.now() - startTime;
  
  // Add additional metadata
  const response = {
    ...health,
    responseTime,
    requestId: generateRequestId(),
    server: {
      region: process.env.VERCEL_REGION || 'local',
      deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'
    }
  };

  // Return appropriate HTTP status code
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 503 : 500;

  return NextResponse.json(response, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Test a simple query to ensure tables exist
    const userCount = await prisma.user.count();
    
    const responseTime = Date.now() - startTime;
    
    return {
      name: 'database',
      status: 'healthy',
      responseTime,
      details: {
        userCount,
        connectionPool: 'active'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Database connection failed',
      details: {
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      }
    };
  }
}

async function checkESPNAPI(): Promise<HealthCheck> {
  const startTime = Date.now();
  const espnBaseUrl = process.env.ESPN_BASE_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${espnBaseUrl}/scoreboard`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Fantasy-Football-App/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const hasData = data.events && data.events.length > 0;
      
      return {
        name: 'espn_api',
        status: hasData ? 'healthy' : 'degraded',
        responseTime,
        details: {
          httpStatus: response.status,
          hasGameData: hasData,
          apiUrl: espnBaseUrl
        }
      };
    } else {
      return {
        name: 'espn_api',
        status: 'degraded',
        responseTime,
        error: `HTTP ${response.status}`,
        details: {
          httpStatus: response.status,
          apiUrl: espnBaseUrl
        }
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: 'espn_api',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'ESPN API unreachable',
      details: {
        apiUrl: espnBaseUrl
      }
    };
  }
}

async function checkAuthentication(): Promise<HealthCheck> {
  const requiredAuthVars = [
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID', 
    'AUTH0_CLIENT_SECRET',
    'NEXTAUTH_SECRET'
  ];
  
  const missingVars = requiredAuthVars.filter(varName => !process.env[varName]);
  const hasBasicConfig = missingVars.length === 0;
  
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  let error: string | undefined;
  
  if (missingVars.length > 0) {
    status = 'unhealthy';
    error = `Missing required auth variables: ${missingVars.join(', ')}`;
  } else if (!process.env.NEXTAUTH_URL) {
    status = 'degraded';
    error = 'NEXTAUTH_URL not configured';
  }
  
  return {
    name: 'authentication',
    status,
    error,
    details: {
      auth0Domain: process.env.AUTH0_DOMAIN ? 'configured' : 'missing',
      clientId: process.env.AUTH0_CLIENT_ID ? 'configured' : 'missing',
      clientSecret: process.env.AUTH0_CLIENT_SECRET ? 'configured' : 'missing',
      nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing',
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not-set'
    }
  };
}

async function checkEnvironmentVariables(): Promise<HealthCheck> {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET'
  ];
  
  const optionalVars = [
    'ESPN_BASE_URL',
    'VERCEL_URL',
    'NODE_ENV'
  ];
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  let error: string | undefined;
  
  if (missingRequired.length > 0) {
    status = 'unhealthy';
    error = `Missing required environment variables: ${missingRequired.join(', ')}`;
  } else if (missingOptional.length > 2) {
    status = 'degraded';
    error = `Some optional environment variables missing: ${missingOptional.join(', ')}`;
  }
  
  return {
    name: 'environment',
    status,
    error,
    details: {
      required: {
        total: requiredVars.length,
        configured: requiredVars.length - missingRequired.length,
        missing: missingRequired
      },
      optional: {
        total: optionalVars.length,
        configured: optionalVars.length - missingOptional.length,
        missing: missingOptional
      },
      nodeEnv: process.env.NODE_ENV || 'undefined'
    }
  };
}

async function checkMemoryUsage(): Promise<HealthCheck> {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memoryUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  let error: string | undefined;
  
  if (heapUsedMB > 1000) { // Over 1GB
    status = 'unhealthy';
    error = `High memory usage: ${heapUsedMB}MB`;
  } else if (heapUsedMB > 512) { // Over 512MB
    status = 'degraded';
    error = `Elevated memory usage: ${heapUsedMB}MB`;
  }
  
  return {
    name: 'memory',
    status,
    error,
    details: {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      usagePercent: `${memoryUsagePercent}%`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    }
  };
}

async function checkSystemHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check if we can perform basic operations
    const testData = { test: 'health-check', timestamp: Date.now() };
    const jsonTest = JSON.stringify(testData);
    const parsedTest = JSON.parse(jsonTest);
    
    const responseTime = Date.now() - startTime;
    
    const isHealthy = parsedTest.test === 'health-check';
    
    return {
      name: 'system',
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      details: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: `${Math.round(process.uptime())}s`,
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: 'system',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'System check failed'
    };
  }
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}