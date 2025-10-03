import { NextRequest, NextResponse } from 'next/server'
import { getOptimizedLeagueData, phoenixDb } from '@/lib/optimized-prisma'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { prisma } from '@/lib/prisma'

// Catalyst: Ultra-fast league data endpoint with comprehensive caching
export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const startTime = performance.now()
  
  try {
    const { leagueId } = params
    const url = new URL(request.url)
    const currentWeek = parseInt(url.searchParams.get('week') || '4')
    const includeProjections = url.searchParams.get('projections') === 'true'
    
    // Catalyst: Try cache first
    let leagueData = await leagueCache.getLeagueStandings(leagueId, currentWeek)
    
    if (!leagueData) {
      // Catalyst: Cache miss - fetch with optimized query
      leagueData = await getOptimizedLeagueData(leagueId, currentWeek)
      
      if (leagueData) {
        // Cache the result
        await leagueCache.setLeagueStandings(leagueId, currentWeek, leagueData)
      }
    }

    if (!leagueData) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Catalyst: Add current week projections if requested
    if (includeProjections) {
      const projections = await phoenixDb.getCachedResult(`projections:${leagueId}:week:${currentWeek}`)
      
      if (!projections) {
        // Fetch current week projections
        const currentProjections = await prisma.playerProjection.findMany({
          where: {
            week: currentWeek,
            season: 2025,
            player: {
              roster: {
                some: {
                  team: {
                    leagueId: leagueId
                  }
                }
              }
            }
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true
              }
            }
          }
        })
        
        leagueData.currentProjections = currentProjections
        phoenixDb.setCachedResult(`projections:${leagueId}:week:${currentWeek}`, currentProjections, 300000)
      } else {
        leagueData.currentProjections = projections
      }
    }

    const responseTime = performance.now() - startTime

    return NextResponse.json({
      data: leagueData,
      meta: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        week: currentWeek,
        cached: !!leagueData,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180, s-maxage=300, stale-while-revalidate=600',
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('League data fetch error:', error);

    }
    return NextResponse.json(
      { 
        error: 'Failed to fetch league data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Catalyst: Enable compression for large league datasets
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'