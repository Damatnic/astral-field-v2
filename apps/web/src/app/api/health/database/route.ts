import { NextResponse } from 'next/server'
import { checkDatabaseHealth, timedQuery } from '@/lib/prisma'
import { phoenixDb } from '@/lib/optimized-prisma'

// Phoenix: Comprehensive database health check endpoint
export async function GET() {
  const startTime = performance.now()
  
  try {
    // Phoenix: Basic connectivity test
    const isConnected = await checkDatabaseHealth()
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Phoenix: Performance metrics collection
    const metrics = await Promise.allSettled([
      // Test basic queries
      timedQuery('health-users-count', () => 
        prisma.user.count()
      ),
      timedQuery('health-teams-count', () => 
        prisma.team.count()
      ),
      timedQuery('health-players-count', () => 
        prisma.player.count()
      ),
      
      // Test complex query performance
      timedQuery('health-complex-query', () =>
        prisma.team.findMany({
          include: {
            owner: true,
            roster: {
              include: {
                player: true
              }
            }
          },
          take: 5
        })
      )
    ])

    const endTime = performance.now()
    const totalTime = endTime - startTime

    // Phoenix: Parse results
    const [usersResult, teamsResult, playersResult, complexQueryResult] = metrics
    
    const healthData = {
      status: 'healthy',
      connection: {
        isConnected: true,
        responseTime: totalTime
      },
      metrics: {
        users: usersResult.status === 'fulfilled' ? usersResult.value : 0,
        teams: teamsResult.status === 'fulfilled' ? teamsResult.value : 0,
        players: playersResult.status === 'fulfilled' ? playersResult.value : 0,
        complexQuerySuccess: complexQueryResult.status === 'fulfilled'
      },
      cache: phoenixDb.getCacheStats(),
      performance: {
        totalCheckTime: totalTime,
        slowQueries: metrics.filter(result => 
          result.status === 'fulfilled' && 
          (result as any).duration > 100
        ).length
      },
      timestamp: new Date().toISOString()
    }

    // Phoenix: Determine overall health status
    const hasErrors = metrics.some(result => result.status === 'rejected')
    const isSlowResponse = totalTime > 1000

    if (hasErrors || isSlowResponse) {
      healthData.status = 'degraded'
      if (hasErrors) {
        healthData.message = 'Some database operations failed'
      }
      if (isSlowResponse) {
        healthData.message = `Slow database response (${totalTime.toFixed(2)}ms)`
      }
    }

    return NextResponse.json(healthData, {
      status: healthData.status === 'healthy' ? 200 : 206
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Phoenix: Database health check failed:', error);

    }
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}

// Phoenix: Health check with detailed diagnostics
export async function POST() {
  try {
    const diagnostics = await timedQuery('full-diagnostics', async () => {
      // Phoenix: Database schema validation
      const schemaInfo = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_stat_get_live_tuples(c.oid) as row_count
        FROM pg_tables pt
        JOIN pg_class c ON c.relname = pt.tablename
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `

      // Phoenix: Performance statistics
      const performanceStats = await prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          rows
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY total_exec_time DESC 
        LIMIT 10
      `

      // Phoenix: Connection information
      const connectionInfo = await prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
      `

      return {
        schema: schemaInfo,
        performance: performanceStats,
        connections: connectionInfo
      }
    })

    return NextResponse.json({
      status: 'diagnostic_complete',
      diagnostics,
      cache: phoenixDb.getCacheStats(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Phoenix: Database diagnostics failed:', error);

    }
    return NextResponse.json({
      status: 'diagnostic_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}