import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get basic database stats
    const userCount = await prisma.user.count();
    const leagueCount = await prisma.league.count();
    
    return NextResponse.json({
      connected: true,
      status: 'healthy',
      message: 'Database connection successful',
      poolSize: 10, // Default Prisma pool size
      stats: {
        users: userCount,
        leagues: leagueCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      connected: false,
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}