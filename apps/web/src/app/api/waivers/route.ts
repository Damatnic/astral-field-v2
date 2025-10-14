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

    const currentWeek = 1 // Default to week 1 for now

    // Get available players not on any team (simplified approach)
    const allPlayers = await prisma.player.findMany({
      where: {
        isFantasyRelevant: true,
        roster: { none: {} } // Only players not on any roster
      },
      orderBy: [
        { name: 'asc' },
      ],
      take: 100,
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
    })
    
    // For now, return all players as "available" (simplified)
    const availablePlayers = allPlayers

    // Map nflTeam to team for backwards compatibility and extract stats
    const playersWithTeam = availablePlayers.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      nflTeam: p.nflTeam,
      team: p.nflTeam,
      fantasyPoints: p.stats[0]?.fantasyPoints || 0,
      projectedPoints: p.projections[0]?.projectedPoints || 0,
    }))

    // Get user's team to determine waiver priority
    const userTeam = await prisma.team.findFirst({
      where: { ownerId: userId }, // Changed from userId to ownerId
      select: { waiverPriority: true }, // Changed from waiverOrder to waiverPriority
    })

    // Simple AI recommendations based on top performers
    const recommendations = playersWithTeam
      .slice(0, 10)

    const responseData = {
      availablePlayers: playersWithTeam,
      recommendations,
      waiverOrder: userTeam?.waiverPriority || 1, // Changed from waiverOrder to waiverPriority
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
      },
    })
  } catch (error: any) {
    console.error('Detailed error fetching waivers data:', {
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