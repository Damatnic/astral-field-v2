import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const position = searchParams.get('position')
    const team = searchParams.get('team')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 24

    const where: any = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nflTeam: { contains: search, mode: 'insensitive' } }, // Changed from team to nflTeam
          ],
        } : {},
        position ? { position } : {},
        team ? { nflTeam: team } : {}, // Changed from team to nflTeam
      ],
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: [
          { name: 'asc' }, // Changed from searchRank to name for now
        ],
        select: {
          id: true,
          name: true,
          position: true,
          nflTeam: true, // Changed from team to nflTeam
          // status: true, // Temporarily removed due to type mismatch
        },
      }),
      prisma.player.count({ where }),
    ])

    // Map nflTeam to team for backwards compatibility
    const playersWithTeam = players.map(p => ({
      ...p,
      team: p.nflTeam,
      jerseyNumber: 0, // TODO: Add jersey number to schema
      fantasyPoints: 0, // TODO: Get from PlayerStats
      projectedPoints: 0, // TODO: Get from PlayerProjection
    }))

    const responseData = {
      players: playersWithTeam, // Use mapped players
      total,
      pages: Math.ceil(total / pageSize),
      currentPage: page,
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=600', // 10 minutes
      },
    })
  } catch (error: any) {
    console.error('Detailed error fetching players:', {
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
