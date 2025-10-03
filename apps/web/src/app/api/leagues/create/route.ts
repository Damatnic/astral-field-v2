import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'


const CreateLeagueSchema = z.object({
  name: z.string().min(1, 'League name is required').max(100, 'League name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  maxTeams: z.number().min(4).max(20),
  isPublic: z.boolean().default(true),
  draftDate: z.string().optional(),
  scoringType: z.enum(['standard', 'ppr', 'half-ppr', 'super-flex']).default('standard')
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CreateLeagueSchema.parse(body)

    // Create the league
    const league = await prisma.league.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        maxTeams: validatedData.maxTeams,
        isActive: true,
        playoffs: false,
        currentWeek: 1
      }
    })

    // Create the owner's team automatically
    const ownerTeam = await prisma.team.create({
      data: {
        name: `${session.user.name || session.user.email?.split('@')[0] || 'Manager'}'s Team`,
        ownerId: session.user.id,
        leagueId: league.id,
        wins: 0,
        losses: 0,
        ties: 0
      }
    })

    // Add some sample players to the owner's roster
    const samplePlayers = await prisma.player.findMany({
      where: { isFantasyRelevant: true },
      orderBy: { adp: 'asc' },
      take: 15 // Get top 15 players
    })

    if (samplePlayers.length > 0) {
      // Create a starting lineup
      const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      let playerIndex = 0

      for (let i = 0; i < positions.length && playerIndex < samplePlayers.length; i++) {
        const position = positions[i]
        const player = samplePlayers.find((p, idx) => 
          idx >= playerIndex && 
          (position === 'FLEX' ? ['RB', 'WR', 'TE'].includes(p.position) : p.position === position)
        )

        if (player) {
          await prisma.rosterPlayer.create({
            data: {
              teamId: ownerTeam.id,
              playerId: player.id,
              position,
              isStarter: true
            }
          })
          playerIndex = samplePlayers.indexOf(player) + 1
        }
      }

      // Add remaining players to bench
      const remainingPlayers = samplePlayers.slice(playerIndex, playerIndex + 6)
      for (const player of remainingPlayers) {
        await prisma.rosterPlayer.create({
          data: {
            teamId: ownerTeam.id,
            playerId: player.id,
            position: 'BENCH',
            isStarter: false
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'League created successfully',
      league: {
        id: league.id,
        name: league.name,
        description: league.description,
        maxTeams: league.maxTeams
      }
    })

  } catch (error) {
    logger.error('League creation error', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create league' },
      { status: 500 }
    )
  }
}