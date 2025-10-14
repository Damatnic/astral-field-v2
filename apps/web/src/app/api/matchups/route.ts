import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const week = searchParams.get('week')

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      )
    }

    const whereClause: any = {
      leagueId,
    }

    if (week) {
      whereClause.week = parseInt(week)
    }

    const matchups = await prisma.matchup.findMany({
      where: whereClause,
      include: {
        team1: {
          select: {
            id: true,
            name: true,
            User: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
            User: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        week: 'asc',
      },
    })

    return NextResponse.json({ matchups })
  } catch (error) {
    console.error('Error fetching matchups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leagueId, week, team1Id, team2Id } = body

    if (!leagueId || !week || !team1Id || !team2Id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const matchup = await prisma.matchup.create({
      data: {
        leagueId,
        week: parseInt(week),
        team1Id,
        team2Id,
        status: 'upcoming',
        team1Score: 0,
        team2Score: 0,
        team1ProjectedScore: 0,
        team2ProjectedScore: 0,
      },
      include: {
        team1: true,
        team2: true,
      },
    })

    return NextResponse.json({ matchup }, { status: 201 })
  } catch (error) {
    console.error('Error creating matchup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchupId, team1Score, team2Score, status } = body

    if (!matchupId) {
      return NextResponse.json(
        { error: 'Matchup ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (team1Score !== undefined) updateData.team1Score = team1Score
    if (team2Score !== undefined) updateData.team2Score = team2Score
    if (status) updateData.status = status

    const matchup = await prisma.matchup.update({
      where: { id: matchupId },
      data: updateData,
      include: {
        team1: true,
        team2: true,
      },
    })

    return NextResponse.json({ matchup })
  } catch (error) {
    console.error('Error updating matchup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

