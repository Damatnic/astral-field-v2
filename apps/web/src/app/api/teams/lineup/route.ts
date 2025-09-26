import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const LineupUpdateSchema = z.object({
  teamId: z.string(),
  roster: z.array(z.object({
    id: z.string(),
    position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPER_FLEX', 'BENCH', 'IR', 'LB', 'DB', 'DL']),
    isStarter: z.boolean()
  }))
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teamId, roster } = LineupUpdateSchema.parse(body)

    // Verify user owns the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: session.user.id
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Update roster positions
    await Promise.all(
      roster.map(player =>
        prisma.rosterPlayer.update({
          where: { id: player.id },
          data: {
            position: player.position as any,
            isStarter: player.isStarter
          }
        })
      )
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Lineup update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}