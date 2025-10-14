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
    
    // Now get roster data separately
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId: team.id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            // status: true, // Temporarily removed due to type mismatch
          },
        },
      },
    })
    
    console.log('Roster found:', roster.length, 'players')
    
    // Get league data
    const league = await prisma.league.findUnique({
      where: { id: team.leagueId },
      select: {
        name: true,
        currentWeek: true,
      },
    })

    // Calculate totals from PlayerStats if available
    const totalPoints = Number(team.pointsFor || 0)
    const projectedPoints = 0 // TODO: Calculate from projections

    // Add isStarter field based on rosterSlot
    const rosterWithStarters = roster.map(r => ({
      ...r,
      isStarter: r.rosterSlot !== 'BENCH' && r.rosterSlot !== 'IR',
      player: {
        ...r.player,
        team: r.player.nflTeam, // Map nflTeam to team for backwards compatibility
        fantasyPoints: 0, // TODO: Get from PlayerStats
        projectedPoints: 0, // TODO: Get from PlayerProjection
      }
    }))

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
