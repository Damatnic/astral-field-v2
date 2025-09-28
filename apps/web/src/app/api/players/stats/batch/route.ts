import { NextRequest, NextResponse } from 'next/server'
import { phoenixDb } from '@/lib/optimized-prisma'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { z } from 'zod'

// Catalyst: Batch player stats endpoint for efficient data loading
const BatchStatsSchema = z.object({
  playerIds: z.array(z.string()).min(1).max(50), // Limit to 50 players per request
  weeks: z.array(z.number()).min(1).max(17),
  season: z.number().optional().default(2025),
  includeProjections: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const validation = BatchStatsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { playerIds, weeks, season, includeProjections } = validation.data
    
    // Catalyst: Check cache first
    const cacheKey = `batch_stats:${playerIds.slice(0,5).join(',')}:${weeks.join(',')}`
    let statsData = await leagueCache.getPlayerStats(playerIds, weeks)
    
    if (!statsData) {
      // Catalyst: Cache miss - fetch with optimized batch query
      statsData = await phoenixDb.getPlayerStatsHistory(playerIds, weeks)
      
      if (statsData && statsData.length > 0) {
        await leagueCache.setPlayerStats(playerIds, weeks, statsData)
      }
    }
    
    // Catalyst: Organize data by player for efficient frontend consumption
    const organizedData = new Map()
    
    statsData.forEach(stat => {
      if (!organizedData.has(stat.playerId)) {
        organizedData.set(stat.playerId, {
          player: stat.player,
          weeklyStats: new Map(),
          totalPoints: 0,
          avgPoints: 0,
          gamesPlayed: 0
        })
      }
      
      const playerData = organizedData.get(stat.playerId)
      playerData.weeklyStats.set(stat.week, {
        week: stat.week,
        fantasyPoints: stat.fantasyPoints,
        stats: JSON.parse(stat.stats || '{}')
      })
      
      playerData.totalPoints += stat.fantasyPoints
      playerData.gamesPlayed += 1
    })
    
    // Calculate averages
    for (const [playerId, playerData] of organizedData) {
      playerData.avgPoints = playerData.gamesPlayed > 0 
        ? playerData.totalPoints / playerData.gamesPlayed 
        : 0
      
      // Convert Maps to Objects for JSON serialization
      playerData.weeklyStats = Object.fromEntries(playerData.weeklyStats)
    }
    
    // Catalyst: Add projections if requested
    let projections = []
    if (includeProjections) {
      projections = await phoenixDb.getCachedResult(`projections:batch:${playerIds.slice(0,5).join(',')}`)
      
      if (!projections) {
        // Fetch current projections for these players
        projections = await prisma.playerProjection.findMany({
          where: {
            playerId: { in: playerIds },
            season: season,
            week: { in: weeks }
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
        
        phoenixDb.setCachedResult(`projections:batch:${playerIds.slice(0,5).join(',')}`, projections, 300000)
      }
    }
    
    const responseTime = performance.now() - startTime
    
    return NextResponse.json({
      data: {
        playerStats: Object.fromEntries(organizedData),
        projections: projections,
        summary: {
          playersRequested: playerIds.length,
          playersFound: organizedData.size,
          weeksRequested: weeks,
          totalDataPoints: statsData.length
        }
      },
      meta: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        cached: !!statsData,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1200',
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`
      }
    })
    
  } catch (error) {
    console.error('Batch stats fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch player stats',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Catalyst: Also support GET requests for simpler queries
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const playerIds = url.searchParams.get('playerIds')?.split(',') || []
  const weeks = url.searchParams.get('weeks')?.split(',').map(Number) || [1, 2, 3, 4]
  const includeProjections = url.searchParams.get('projections') === 'true'
  
  if (playerIds.length === 0) {
    return NextResponse.json(
      { error: 'playerIds parameter is required' },
      { status: 400 }
    )
  }
  
  // Convert to POST format and reuse logic
  const mockRequest = {
    json: async () => ({
      playerIds,
      weeks,
      includeProjections
    })
  } as NextRequest
  
  return POST(mockRequest)
}

export const runtime = 'nodejs'