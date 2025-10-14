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

    // Get available players not on any team
    const availablePlayers = await prisma.player.findMany({
      where: {
        rosterPlayers: {
          none: {},
        },
      },
      orderBy: [
        { searchRank: 'asc' }, // Changed from fantasyPoints to searchRank
      ],
      take: 100,
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true, // Changed from team to nflTeam
        status: true,
      },
    })

    // Map nflTeam to team for backwards compatibility
    const playersWithTeam = availablePlayers.map(p => ({
      ...p,
      team: p.nflTeam,
      fantasyPoints: 0, // TODO: Get from PlayerStats
      projectedPoints: 0, // TODO: Get from PlayerProjection
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