import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { phoenixDb } from '@/lib/optimized-prisma'
import { withRetry, timedQuery } from '@/lib/prisma'
import { z } from 'zod'

// Phoenix: Enhanced validation schema
const LineupUpdateSchema = z.object({
  teamId: z.string().cuid(),
  roster: z.array(z.object({
    id: z.string().cuid(),
    position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPER_FLEX', 'BENCH', 'IR']),
    isStarter: z.boolean()
  })).min(1).max(20), // Reasonable roster limits
  validateLineup: z.boolean().optional().default(true)
})

// Phoenix: Lineup validation rules
const validateLineupConfiguration = (roster: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  const starters = roster.filter(p => p.isStarter)
  const positionCounts = starters.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Standard fantasy football lineup requirements
  const requirements = {
    QB: { min: 1, max: 1 },
    RB: { min: 1, max: 2 },
    WR: { min: 1, max: 3 },
    TE: { min: 1, max: 1 },
    K: { min: 1, max: 1 },
    DEF: { min: 1, max: 1 }
  }

  for (const [position, rules] of Object.entries(requirements)) {
    const count = positionCounts[position] || 0
    if (count < rules.min) {
      errors.push(`Too few ${position} players starting (${count}/${rules.min} minimum)`)
    }
    if (count > rules.max) {
      errors.push(`Too many ${position} players starting (${count}/${rules.max} maximum)`)
    }
  }

  const totalStarters = starters.length
  if (totalStarters > 9) {
    errors.push(`Too many starters (${totalStarters}/9 maximum)`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Phoenix: Enhanced session validation
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 })
    }

    // Phoenix: Parse and validate request body
    const body = await request.json()
    const { teamId, roster, validateLineup } = LineupUpdateSchema.parse(body)

    // Phoenix: Validate lineup configuration if requested
    if (validateLineup) {
      const validation = validateLineupConfiguration(roster)
      if (!validation.isValid) {
        return NextResponse.json({
          error: 'Invalid lineup configuration',
          details: validation.errors,
          code: 'INVALID_LINEUP'
        }, { status: 400 })
      }
    }

    // Phoenix: Optimized team ownership verification
    const teamWithRoster = await timedQuery('verifyTeamOwnership', () =>
      phoenixDb.findUserWithRelations(session.user.id)
    )

    const userTeam = teamWithRoster?.teams?.find(t => t.id === teamId)
    if (!userTeam) {
      return NextResponse.json({ 
        error: 'Team not found or access denied',
        code: 'TEAM_NOT_FOUND' 
      }, { status: 404 })
    }

    // Phoenix: Validate all roster player IDs belong to the team
    const teamRosterIds = userTeam.roster?.map(r => r.id) || []
    const invalidIds = roster.filter(p => !teamRosterIds.includes(p.id))
    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: 'Invalid roster player IDs',
        details: invalidIds.map(p => p.id),
        code: 'INVALID_ROSTER_IDS'
      }, { status: 400 })
    }

    // Phoenix: Optimized batch update with transaction
    const updateResult = await withRetry(async () => {
      return await phoenixDb.updateRosterBatch(roster)
    }, 3, 1000)

    // Phoenix: Clear relevant caches
    phoenixDb.clearCache(`user:${session.user.id}`)
    phoenixDb.clearCache(`teams:${userTeam.leagueId}`)

    // Phoenix: Success response with operation details
    return NextResponse.json({ 
      success: true,
      message: 'Lineup updated successfully',
      data: {
        teamId,
        playersUpdated: roster.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Phoenix: Lineup update error:', error)
    
    // Phoenix: Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        })),
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (error instanceof Error) {
      // Phoenix: Check for specific database errors
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json({
          error: 'One or more roster players not found',
          code: 'ROSTER_PLAYER_NOT_FOUND'
        }, { status: 404 })
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json({
          error: 'Database operation timeout',
          code: 'TIMEOUT_ERROR'
        }, { status: 504 })
      }
    }

    // Phoenix: Generic error response
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating the lineup',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Phoenix: GET endpoint for retrieving current lineup
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({
        error: 'Team ID is required',
        code: 'MISSING_TEAM_ID'
      }, { status: 400 })
    }

    const userWithTeams = await phoenixDb.findUserWithRelations(session.user.id)
    const team = userWithTeams?.teams?.find(t => t.id === teamId)

    if (!team) {
      return NextResponse.json({
        error: 'Team not found or access denied',
        code: 'TEAM_NOT_FOUND'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          league: team.league
        },
        roster: team.roster?.map(r => ({
          id: r.id,
          position: r.position,
          isStarter: r.isStarter,
          player: r.player
        })) || []
      }
    })

  } catch (error) {
    console.error('Phoenix: Lineup retrieval error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}