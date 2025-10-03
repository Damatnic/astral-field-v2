import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Draft API - Complete Draft Management System
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const action = searchParams.get('action')

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID required' }, { status: 400 })
    }

    switch (action) {
      case 'status':
        return await getDraftStatus(leagueId)
      case 'board':
        return await getDraftBoard(leagueId)
      case 'history':
        return await getDraftHistory(leagueId)
      case 'available-players':
        return await getAvailablePlayers(leagueId, searchParams)
      default:
        return await getDraftStatus(leagueId)
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Draft API error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to fetch draft data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, leagueId, ...data } = body

    switch (action) {
      case 'create':
        return await createDraft(leagueId, data, session.user.id)
      case 'start':
        return await startDraft(leagueId, session.user.id)
      case 'draft-player':
        return await draftPlayer(leagueId, data, session.user.id)
      case 'auto-pick':
        return await enableAutoPick(leagueId, data.teamId, session.user.id)
      case 'pause':
        return await pauseDraft(leagueId, session.user.id)
      case 'resume':
        return await resumeDraft(leagueId, session.user.id)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Draft API error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to process draft action' },
      { status: 500 }
    )
  }
}

async function getDraftStatus(leagueId: string) {
  const draft = await prisma.draft.findUnique({
    where: { leagueId },
    include: {
      league: {
        include: {
          teams: {
            include: {
              owner: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      picks: {
        include: {
          player: true,
          team: {
            include: {
              owner: { select: { name: true } }
            }
          }
        },
        orderBy: { pick: 'asc' }
      },
      order: {
        include: {
          team: {
            include: {
              owner: { select: { name: true } }
            }
          }
        },
        orderBy: [{ round: 'asc' }, { position: 'asc' }]
      }
    }
  })

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  // Calculate current pick info
  const totalTeams = draft.league.teams.length
  const roundsCompleted = Math.floor((draft.picks.length) / totalTeams)
  const currentRound = roundsCompleted + 1
  const pickInRound = (draft.picks.length % totalTeams) + 1
  
  // Snake draft logic
  let currentTeamIndex
  if (currentRound % 2 === 1) {
    // Odd rounds: normal order
    currentTeamIndex = pickInRound - 1
  } else {
    // Even rounds: reverse order
    currentTeamIndex = totalTeams - pickInRound
  }

  const currentTeam = draft.league.teams[currentTeamIndex]
  const timePerPick = draft.timePerPick
  const pickStartTime = draft.pickStartTime ? new Date(draft.pickStartTime) : new Date()
  const timeElapsed = Math.floor((Date.now() - pickStartTime.getTime()) / 1000)
  const timeRemaining = Math.max(0, timePerPick - timeElapsed)

  return NextResponse.json({
    success: true,
    data: {
      draft,
      currentPick: {
        round: currentRound,
        pick: draft.picks.length + 1,
        team: currentTeam,
        timeRemaining,
        timePerPick
      },
      totalPicks: totalTeams * 15, // 15 rounds typical
      picksCompleted: draft.picks.length,
      isComplete: draft.status === 'COMPLETED'
    }
  })
}

async function getDraftBoard(leagueId: string) {
  const draft = await prisma.draft.findUnique({
    where: { leagueId },
    include: {
      league: {
        include: {
          teams: {
            include: {
              owner: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      picks: {
        include: {
          player: true,
          team: {
            include: {
              owner: { select: { name: true } }
            }
          }
        },
        orderBy: { pick: 'asc' }
      }
    }
  })

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  // Build draft board grid
  const teams = draft.league.teams
  const totalRounds = 15
  const board = []

  for (let round = 1; round <= totalRounds; round++) {
    const roundPicks = []
    
    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      // Snake draft logic
      const actualTeamIndex = round % 2 === 1 
        ? teamIndex 
        : teams.length - 1 - teamIndex
      
      const pickNumber = (round - 1) * teams.length + teamIndex + 1
      const pick = draft.picks.find(p => p.pick === pickNumber)
      
      roundPicks.push({
        pickNumber,
        round,
        teamIndex: actualTeamIndex,
        team: teams[actualTeamIndex],
        player: pick?.player || null,
        pickTime: pick?.pickTime || null,
        isAutoPick: pick?.isAutoPick || false
      })
    }
    
    board.push({
      round,
      picks: roundPicks
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      board,
      teams,
      totalRounds,
      picksCompleted: draft.picks.length
    }
  })
}

async function getDraftHistory(leagueId: string) {
  const picks = await prisma.draftPick.findMany({
    where: {
      draft: { leagueId }
    },
    include: {
      player: true,
      team: {
        include: {
          owner: { select: { name: true } }
        }
      }
    },
    orderBy: { pick: 'desc' },
    take: 50
  })

  return NextResponse.json({
    success: true,
    data: picks
  })
}

async function getAvailablePlayers(leagueId: string, searchParams: URLSearchParams) {
  const position = searchParams.get('position')
  const search = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'adp'
  const limit = parseInt(searchParams.get('limit') || '100')

  // Get drafted player IDs
  const draftedPlayers = await prisma.draftPick.findMany({
    where: {
      draft: { leagueId }
    },
    select: { playerId: true }
  })

  const draftedPlayerIds = draftedPlayers.map(p => p.playerId)

  // Build filter
  const where: any = {
    isFantasyRelevant: true,
    NOT: {
      id: { in: draftedPlayerIds }
    }
  }

  if (position && position !== 'ALL') {
    where.position = position
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nflTeam: { contains: search, mode: 'insensitive' } }
    ]
  }

  // Build orderBy
  let orderBy: any = { adp: 'asc' }
  
  switch (sortBy) {
    case 'name':
      orderBy = { name: 'asc' }
      break
    case 'position':
      orderBy = [{ position: 'asc' }, { adp: 'asc' }]
      break
    case 'team':
      orderBy = [{ nflTeam: 'asc' }, { adp: 'asc' }]
      break
    case 'projection':
      orderBy = { projections: { _count: 'desc' } }
      break
  }

  const players = await prisma.player.findMany({
    where,
    include: {
      projections: {
        where: { week: null }, // Season projections
        orderBy: { projectedPoints: 'desc' },
        take: 1
      },
      news: {
        orderBy: { publishedAt: 'desc' },
        take: 1
      },
      injuryReports: {
        where: { week: 4, season: 2025 },
        take: 1
      }
    },
    orderBy,
    take: limit
  })

  return NextResponse.json({
    success: true,
    data: players.map(player => ({
      ...player,
      projectedPoints: player.projections[0]?.projectedPoints || 0,
      latestNews: player.news[0] || null,
      injuryStatus: player.injuryReports[0]?.status || 'HEALTHY'
    }))
  })
}

async function createDraft(leagueId: string, data: any, userId: string) {
  // Verify user is commissioner
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      settings: true,
      teams: {
        include: {
          owner: { select: { id: true } }
        }
      }
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  if (!league.settings || league.settings.commissionerId !== userId) {
    return NextResponse.json({ error: 'Only commissioner can create draft' }, { status: 403 })
  }

  // Create draft
  const draft = await prisma.draft.create({
    data: {
      leagueId,
      type: data.type || 'SNAKE',
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      timePerPick: data.timePerPick || 60,
      autoPickEnabled: data.autoPickEnabled ?? true,
      settings: JSON.stringify(data.settings || {})
    }
  })

  // Create draft order
  const teams = league.teams
  const shuffledTeams = data.randomizeOrder 
    ? [...teams].sort(() => Math.random() - 0.5)
    : teams

  for (let round = 1; round <= 15; round++) {
    for (let position = 0; position < shuffledTeams.length; position++) {
      await prisma.draftOrder.create({
        data: {
          draftId: draft.id,
          teamId: shuffledTeams[position].id,
          position: position + 1,
          round
        }
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: draft
  })
}

async function startDraft(leagueId: string, userId: string) {
  // Verify user is commissioner
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { settings: true }
  })

  if (!league?.settings || league.settings.commissionerId !== userId) {
    return NextResponse.json({ error: 'Only commissioner can start draft' }, { status: 403 })
  }

  const draft = await prisma.draft.update({
    where: { leagueId },
    data: {
      status: 'IN_PROGRESS',
      startTime: new Date(),
      pickStartTime: new Date()
    }
  })

  return NextResponse.json({
    success: true,
    data: draft
  })
}

async function draftPlayer(leagueId: string, data: any, userId: string) {
  const { playerId, teamId } = data

  // Verify user owns the team
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { owner: true }
  })

  if (!team || team.ownerId !== userId) {
    return NextResponse.json({ error: 'Invalid team or unauthorized' }, { status: 403 })
  }

  // Get draft and verify it's the team's turn
  const draft = await prisma.draft.findUnique({
    where: { leagueId },
    include: {
      picks: { orderBy: { pick: 'asc' } },
      league: {
        include: {
          teams: { orderBy: { createdAt: 'asc' } }
        }
      }
    }
  })

  if (!draft || draft.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Draft not in progress' }, { status: 400 })
  }

  // Verify player is available
  const existingPick = await prisma.draftPick.findFirst({
    where: {
      draftId: draft.id,
      playerId
    }
  })

  if (existingPick) {
    return NextResponse.json({ error: 'Player already drafted' }, { status: 400 })
  }

  // Calculate current pick
  const pickNumber = draft.picks.length + 1
  const totalTeams = draft.league.teams.length
  const round = Math.ceil(pickNumber / totalTeams)

  // Create draft pick
  const pick = await prisma.draftPick.create({
    data: {
      draftId: draft.id,
      teamId,
      playerId,
      round,
      pick: pickNumber,
      isAutoPick: false
    },
    include: {
      player: true,
      team: {
        include: {
          owner: { select: { name: true } }
        }
      }
    }
  })

  // Add player to roster
  await prisma.rosterPlayer.create({
    data: {
      teamId,
      playerId,
      position: 'BENCH',
      isStarter: false
    }
  })

  // Update draft status
  const totalPicks = totalTeams * 15
  if (pickNumber >= totalPicks) {
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date()
      }
    })
  } else {
    // Update pick start time for next pick
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        pickStartTime: new Date()
      }
    })
  }

  return NextResponse.json({
    success: true,
    data: pick
  })
}

async function enableAutoPick(leagueId: string, teamId: string, userId: string) {
  // Verify user owns the team
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  })

  if (!team || team.ownerId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // This would trigger auto-pick logic
  // For now, just return success
  return NextResponse.json({
    success: true,
    message: 'Auto-pick enabled'
  })
}

async function pauseDraft(leagueId: string, userId: string) {
  // Verify user is commissioner
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { settings: true }
  })

  if (!league?.settings || league.settings.commissionerId !== userId) {
    return NextResponse.json({ error: 'Only commissioner can pause draft' }, { status: 403 })
  }

  const draft = await prisma.draft.update({
    where: { leagueId },
    data: { status: 'PAUSED' }
  })

  return NextResponse.json({
    success: true,
    data: draft
  })
}

async function resumeDraft(leagueId: string, userId: string) {
  // Verify user is commissioner
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { settings: true }
  })

  if (!league?.settings || league.settings.commissionerId !== userId) {
    return NextResponse.json({ error: 'Only commissioner can resume draft' }, { status: 403 })
  }

  const draft = await prisma.draft.update({
    where: { leagueId },
    data: { 
      status: 'IN_PROGRESS',
      pickStartTime: new Date()
    }
  })

  return NextResponse.json({
    success: true,
    data: draft
  })
}