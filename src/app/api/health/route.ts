import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'ok',
    message: 'API is responding',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    responseTime: Date.now(),
    checks: {
      api: { status: 'healthy', message: 'API is responding' },
      database: { status: 'unknown', message: 'Not checked' },
      auth: { status: 'unknown', message: 'Not checked' },
      sleeper: { status: 'unknown', message: 'Not checked' }
    },
    endpoints: {
      tested: [] as string[],
      failed: [] as string[]
    }
  };

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { status: 'healthy', message: 'Database connected' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', message: 'Database connection failed' };
    health.status = 'degraded';
  }

  // Test auth endpoint
  try {
    const authTest = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://astral-field-v1.vercel.app'}/api/auth/simple-login`, {
      method: 'GET'
    });
    if (authTest.ok) {
      health.checks.auth = { status: 'healthy', message: 'Auth endpoint responding' };
      health.endpoints.tested.push('/api/auth/simple-login');
    } else {
      health.checks.auth = { status: 'unhealthy', message: 'Auth endpoint not responding' };
      health.endpoints.failed.push('/api/auth/simple-login');
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.auth = { status: 'unhealthy', message: 'Auth endpoint unreachable' };
    health.status = 'degraded';
  }

  // Test Sleeper integration
  try {
    const sleeperTest = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://astral-field-v1.vercel.app'}/api/sleeper/test`);
    if (sleeperTest.ok) {
      health.checks.sleeper = { status: 'healthy', message: 'Sleeper integration active' };
      health.endpoints.tested.push('/api/sleeper/test');
    } else {
      health.checks.sleeper = { status: 'unhealthy', message: 'Sleeper integration failed' };
      health.endpoints.failed.push('/api/sleeper/test');
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.sleeper = { status: 'unhealthy', message: 'Sleeper integration unreachable' };
    health.status = 'degraded';
  }

  // Determine overall health
  const unhealthyChecks = Object.values(health.checks).filter(c => c.status === 'unhealthy').length;
  if (unhealthyChecks > 2) {
    health.status = 'critical';
  } else if (unhealthyChecks > 0) {
    health.status = 'degraded';
  }

  return NextResponse.json(health, {
    status: health.status === 'operational' ? 200 : 503
  });
}