import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth'

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
        homeTeam: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            owner: {
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
        season: 2025,
        homeTeamId: team1Id,
        awayTeamId: team2Id,
        homeScore: 0,
        awayScore: 0,
        isComplete: false,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
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
    
    if (team1Score !== undefined) updateData.homeScore = team1Score
    if (team2Score !== undefined) updateData.awayScore = team2Score
    if (status) updateData.isComplete = status === 'complete'

    const matchup = await prisma.matchup.update({
      where: { id: matchupId },
      data: updateData,
      include: {
        homeTeam: true,
        awayTeam: true,
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

