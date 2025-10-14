import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, roster } = body

    if (!teamId || !roster) {
      return NextResponse.json(
        { error: 'Team ID and roster are required' },
        { status: 400 }
      )
    }

    // Update each player's isStarter status
    const updates = await Promise.all(
      roster.map(async (item: { playerId: string; isStarter: boolean }) => {
        return prisma.rosterPlayer.updateMany({
          where: {
            teamId,
            playerId: item.playerId
          },
          data: {
            isStarter: item.isStarter
          }
        })
      })
    )

    return NextResponse.json(
      { success: true, updated: updates.length },
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error: any) {
    console.error('Error updating lineup:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
