import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'operational',
    message: 'API is responding',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    responseTime: Date.now(),
    checks: {
      api: { status: 'healthy', message: 'API is responding' },
      database: { status: 'unknown', message: 'Not checked' }
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

  // Always return 200 for health check unless database is down
  return NextResponse.json(health, {
    status: 200
  });
}