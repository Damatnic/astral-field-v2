import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, dropPlayerId, userId } = body

    if (!playerId || !userId) {
      return NextResponse.json(
        { error: 'Player ID and User ID are required' },
        { status: 400 }
      )
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: userId }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get team's waiver priority
    const waiverPriority = await prisma.teamWaiverPriority.findFirst({
      where: { teamId: team.id },
      orderBy: { priority: 'asc' }
    })

    // Create waiver claim
    const claim = await prisma.waiverClaim.create({
      data: {
        teamId: team.id,
        playerId,
        droppedPlayerId: dropPlayerId,
        status: 'PENDING',
        priority: waiverPriority?.priority || 1
      }
    })

    return NextResponse.json(
      { success: true, claimId: claim.id },
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error: any) {
    console.error('Error creating waiver claim:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

