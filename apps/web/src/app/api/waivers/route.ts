import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const status = searchParams.get('status')

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const whereClause: any = {
      teamId,
    }

    if (status) {
      whereClause.status = status
    }

    const waiverClaims = await prisma.waiverClaim.findMany({
      where: whereClause,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
          },
        },
        dropPlayer: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
          },
        },
      },
      orderBy: {
        priority: 'asc',
      },
    })

    return NextResponse.json({ waiverClaims })
  } catch (error) {
    console.error('Error fetching waiver claims:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, playerId, dropPlayerId, faabBid, priority } = body

    if (!teamId || !playerId) {
      return NextResponse.json(
        { error: 'Team ID and Player ID are required' },
        { status: 400 }
      )
    }

    // Get the team to check FAAB budget
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { faabBudget: true },
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    if (faabBid && team.faabBudget !== null && faabBid > team.faabBudget) {
      return NextResponse.json(
        { error: 'Insufficient FAAB budget' },
        { status: 400 }
      )
    }

    const waiverClaim = await prisma.waiverClaim.create({
      data: {
        teamId,
        playerId,
        dropPlayerId,
        faabBid,
        priority: priority || 1,
        status: 'pending',
      },
      include: {
        player: true,
        dropPlayer: true,
      },
    })

    return NextResponse.json({ waiverClaim }, { status: 201 })
  } catch (error) {
    console.error('Error creating waiver claim:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const claimId = searchParams.get('claimId')

    if (!claimId) {
      return NextResponse.json(
        { error: 'Claim ID is required' },
        { status: 400 }
      )
    }

    await prisma.waiverClaim.delete({
      where: { id: claimId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting waiver claim:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

