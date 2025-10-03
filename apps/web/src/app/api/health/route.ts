import { NextResponse } from 'next/server'
import { prisma, checkDatabaseHealth } from '@/lib/prisma'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    // Test database connection
    const isDatabaseHealthy = await checkDatabaseHealth()
    
    // Test environment variables
    const envCheck = {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      authTrustHost: process.env.AUTH_TRUST_HOST,
      nodeEnv: process.env.NODE_ENV
    }
    
    // Basic database query test
    let databaseVersion = null
    let userCount = null
    
    try {
      const versionResult = await prisma.$queryRaw`SELECT version()`
      databaseVersion = Array.isArray(versionResult) && versionResult.length > 0 ? versionResult[0] : null
      
      userCount = await prisma.user.count()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('Database query test failed:', error);

      }
    }
    
    const healthStatus = {
      status: isDatabaseHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDatabaseHealthy,
        version: databaseVersion,
        userCount
      },
      environment: envCheck,
      deployment: {
        vercelUrl: process.env.VERCEL_URL,
        vercelEnv: process.env.VERCEL_ENV,
        vercelRegion: process.env.VERCEL_REGION
      }
    }
    
    return NextResponse.json(healthStatus, {
      status: isDatabaseHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Health check failed:', error);

    }
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  }
}