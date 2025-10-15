import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { sendNotificationToUser } from '@/app/api/notifications/sse/route'

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

    // Get user's team with league data
    const team = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        league: {
          select: {
            currentWeek: true
          }
        }
      }
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

    // Get player name for notification
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { name: true }
    })

    // Create waiver claim
    const claim = await prisma.waiverClaim.create({
      data: {
        teamId: team.id,
        playerId,
        droppedPlayerId: dropPlayerId,
        status: 'PENDING',
        priority: waiverPriority?.priority || 1,
        week: team.league?.currentWeek || 1
      }
    })

    // Send real-time notification via SSE
    sendNotificationToUser(userId, {
      type: 'waiver',
      title: 'Waiver Claim Submitted',
      message: `Your waiver claim for ${player?.name || 'player'} has been submitted`,
      actionUrl: '/waivers',
      actionLabel: 'View Waivers',
      priority: 'normal',
      metadata: { playerId, claimId: claim.id }
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

