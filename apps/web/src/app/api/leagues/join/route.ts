import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const JoinLeagueSchema = z.object({
  leagueId: z.string().cuid('Invalid league ID')
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
    const { leagueId } = JoinLeagueSchema.parse(body)

    // Check if league exists and has space
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: true
      }
    })

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    if (!league.isActive) {
      return NextResponse.json(
        { error: 'League is not active' },
        { status: 400 }
      )
    }

    if (league.teams.length >= league.maxTeams) {
      return NextResponse.json(
        { error: 'League is full' },
        { status: 400 }
      )
    }

    // Check if user is already in this league
    const existingTeam = await prisma.team.findFirst({
      where: {
        ownerId: session.user.id,
        leagueId: leagueId
      }
    })

    if (existingTeam) {
      return NextResponse.json(
        { error: 'You are already a member of this league' },
        { status: 400 }
      )
    }

    // Create the user's team
    const newTeam = await prisma.team.create({
      data: {
        name: `${session.user.name || session.user.email?.split('@')[0] || 'Manager'}'s Team`,
        ownerId: session.user.id,
        leagueId: leagueId,
        wins: 0,
        losses: 0,
        ties: 0
      }
    })

    // Add sample players to the new team's roster
    const availablePlayers = await prisma.player.findMany({
      where: { 
        isFantasyRelevant: true,
        roster: {
          none: {
            team: {
              leagueId: leagueId
            }
          }
        }
      },
      orderBy: { adp: 'asc' },
      take: 15
    })

    if (availablePlayers.length > 0) {
      // Create a starting lineup
      const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      let playerIndex = 0

      for (let i = 0; i < positions.length && playerIndex < availablePlayers.length; i++) {
        const position = positions[i]
        const player = availablePlayers.find((p, idx) => 
          idx >= playerIndex && 
          (position === 'FLEX' ? ['RB', 'WR', 'TE'].includes(p.position) : p.position === position)
        )

        if (player) {
          await prisma.rosterPlayer.create({
            data: {
              teamId: newTeam.id,
              playerId: player.id,
              position,
              isStarter: true
            }
          })
          playerIndex = availablePlayers.indexOf(player) + 1
        }
      }

      // Add remaining players to bench
      const remainingPlayers = availablePlayers.slice(playerIndex, playerIndex + 6)
      for (const player of remainingPlayers) {
        await prisma.rosterPlayer.create({
          data: {
            teamId: newTeam.id,
            playerId: player.id,
            position: 'BENCH',
            isStarter: false
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined league',
      team: {
        id: newTeam.id,
        name: newTeam.name,
        leagueId: newTeam.leagueId
      }
    })

  } catch (error) {
    console.error('League join error:', error)

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
      { error: 'Failed to join league' },
      { status: 500 }
    )
  }
}