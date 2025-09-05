import { NextResponse } from 'next/server'
import { neonDb } from '@/lib/neon-database'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check database connectivity
    const dbCheck = await neonDb.query('SELECT 1 as health_check')
    const dbHealthy = !dbCheck.error && dbCheck.data?.length === 1
    
    // Check environment variables
    const envCheck = {
      database: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    }
    
    const responseTime = Date.now() - startTime
    
    const health = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbHealthy ? 'pass' : 'fail',
        environment: envCheck.database ? 'pass' : 'fail'
      },
      database: {
        connected: dbHealthy,
        responseTime: `${responseTime}ms`
      }
    }
    
    const statusCode = dbHealthy ? 200 : 503
    
    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        database: 'fail',
        environment: 'unknown'
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}

export async function HEAD() {
  const response = await GET()
  return new Response(null, {
    status: response.status,
    headers: response.headers
  })
}