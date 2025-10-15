import { NextRequest, NextResponse } from 'next/server'
import { getOptimizedLeagueData, phoenixDb } from '@/lib/optimized-prisma'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { prisma } from '@/lib/database/prisma'

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
    
    let leagueData = await leagueCache.getLeagueStandings(leagueId, currentWeek)
    
    if (!leagueData) {
      leagueData = await getOptimizedLeagueData(leagueId, currentWeek)
      
      if (leagueData) {
        await leagueCache.setLeagueStandings(leagueId, currentWeek, leagueData)
      }
    }

    if (!leagueData) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    if (includeProjections) {
      const cacheKey1 = 'projections:' + leagueId + ':week:' + currentWeek
      const projections = await phoenixDb.getCachedResult(cacheKey1)
      
      if (!projections) {
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
        
        Object.assign(leagueData, { currentProjections })
        phoenixDb.setCachedResult(cacheKey1, currentProjections, 300000)
      } else {
        Object.assign(leagueData, { currentProjections: projections })
      }
    }

    const responseTime = performance.now() - startTime

    return NextResponse.json({
      data: leagueData,
      meta: {
        responseTime: responseTime.toFixed(2) + 'ms',
        week: currentWeek,
        cached: !!leagueData,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180, s-maxage=300, stale-while-revalidate=600',
        'Content-Type': 'application/json',
        'X-Response-Time': responseTime.toFixed(2) + 'ms'
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('League data fetch error:', error)
    }
    return NextResponse.json(
      { 
        error: 'Failed to fetch league data',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
