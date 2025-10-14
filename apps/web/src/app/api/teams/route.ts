import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('Searching for team with ownerId:', userId)
    
    // First try a simple query
    const team = await prisma.team.findFirst({
      where: { ownerId: userId }
    })
    
    console.log('Team found:', team ? 'Yes' : 'No')
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }
    
    // Get league data first to determine current week
    const league = await prisma.league.findUnique({
      where: { id: team.leagueId },
      select: {
        name: true,
        currentWeek: true,
      },
    })

    const currentWeek = league?.currentWeek || 1

    // Get roster data with stats and projections (optimized with includes)
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId: team.id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            stats: {
              where: { week: currentWeek, season: 2025 },
              take: 1,
              select: { fantasyPoints: true }
            },
            projections: {
              where: { week: currentWeek, season: 2025 },
              take: 1,
              select: { projectedPoints: true }
            }
          },
        },
      },
    })
    
    console.log('Roster found:', roster.length, 'players')

    // Map roster with stats and projections
    const rosterWithStarters = roster.map(r => ({
      ...r,
      isStarter: r.isStarter, // Already exists in schema
      player: {
        id: r.player.id,
        name: r.player.name,
        position: r.player.position,
        nflTeam: r.player.nflTeam,
        team: r.player.nflTeam, // Map nflTeam to team for backwards compatibility
        fantasyPoints: r.player.stats[0]?.fantasyPoints || 0,
        projectedPoints: r.player.projections[0]?.projectedPoints || 0,
      }
    }))

    // Calculate totals
    const totalPoints = rosterWithStarters.reduce((sum, r) => sum + (r.player.fantasyPoints || 0), 0)
    const projectedPoints = rosterWithStarters
      .filter(r => r.isStarter)
      .reduce((sum, r) => sum + (r.player.projectedPoints || 0), 0)

    const responseData = {
      ...team,
      roster: rosterWithStarters,
      league,
      totalPoints,
      projectedPoints,
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
      },
    })
  } catch (error: any) {
    console.error('Detailed error fetching team data:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
