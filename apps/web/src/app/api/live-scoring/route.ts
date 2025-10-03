import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'


// Live Scoring API - Production Ready Fantasy Football Scoring System
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const week = parseInt(searchParams.get('week') || '4')
    const season = parseInt(searchParams.get('season') || '2025')

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID required' }, { status: 400 })
    }

    // Get live matchups for the week
    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId,
        week,
        season
      },
      include: {
        homeTeam: {
          include: {
            owner: { select: { name: true, email: true } },
            roster: {
              where: { isStarter: true },
              include: {
                player: {
                  include: {
                    stats: {
                      where: { week, season },
                      orderBy: { week: 'desc' },
                      take: 1
                    },
                    liveUpdates: {
                      where: {
                        timestamp: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                        }
                      },
                      orderBy: { timestamp: 'desc' }
                    },
                    injuryReports: {
                      where: { week, season },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        },
        awayTeam: {
          include: {
            owner: { select: { name: true, email: true } },
            roster: {
              where: { isStarter: true },
              include: {
                player: {
                  include: {
                    stats: {
                      where: { week, season },
                      orderBy: { week: 'desc' },
                      take: 1
                    },
                    liveUpdates: {
                      where: {
                        timestamp: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                      },
                      orderBy: { timestamp: 'desc' }
                    },
                    injuryReports: {
                      where: { week, season },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        },
        liveScores: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Get live games for this week
    const liveGames = await prisma.liveGame.findMany({
      where: { week, season },
      include: {
        playerUpdates: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        }
      },
      orderBy: { gameTime: 'asc' }
    })

    // Calculate live scores for each matchup
    const liveScoringData = await Promise.all(
      matchups.map(async (matchup) => {
        const homeScore = await calculateLiveTeamScore(matchup.homeTeam.roster, week, season)
        const awayScore = await calculateLiveTeamScore(matchup.awayTeam.roster, week, season)

        return {
          matchupId: matchup.id,
          week,
          season,
          homeTeam: {
            id: matchup.homeTeam.id,
            name: matchup.homeTeam.name,
            owner: matchup.homeTeam.owner.name,
            score: homeScore.total,
            projectedScore: homeScore.projected,
            roster: homeScore.rosterDetails
          },
          awayTeam: {
            id: matchup.awayTeam.id,
            name: matchup.awayTeam.name,
            owner: matchup.awayTeam.owner.name,
            score: awayScore.total,
            projectedScore: awayScore.projected,
            roster: awayScore.rosterDetails
          },
          isComplete: matchup.isComplete,
          lastUpdated: new Date().toISOString()
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        matchups: liveScoringData,
        liveGames,
        week,
        season,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Live scoring API error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to fetch live scoring data' },
      { status: 500 }
    )
  }
}

// Update live scores - typically called by background job or webhook
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'PLAYER_UPDATE':
        await handlePlayerStatUpdate(data)
        break
      case 'GAME_UPDATE':
        await handleGameUpdate(data)
        break
      case 'INJURY_UPDATE':
        await handleInjuryUpdate(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid update type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Live scoring update error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to update live scoring data' },
      { status: 500 }
    )
  }
}

// Helper function to calculate live team score
async function calculateLiveTeamScore(roster: any[], week: number, season: number) {
  let totalScore = 0
  let projectedScore = 0
  const rosterDetails = []

  for (const rosterPlayer of roster) {
    const player = rosterPlayer.player
    let playerScore = 0
    let playerProjected = 0

    // Get base stats for the week
    if (player.stats && player.stats.length > 0) {
      playerScore = player.stats[0].fantasyPoints
    }

    // Add live updates
    for (const update of player.liveUpdates || []) {
      playerScore += calculateStatPoints(update.statType, update.statValue)
    }

    // Get projected points (simplified calculation)
    if (player.projections && player.projections.length > 0) {
      playerProjected = player.projections[0].projectedPoints
    }

    totalScore += playerScore
    projectedScore += playerProjected

    rosterDetails.push({
      playerId: player.id,
      name: player.name,
      position: player.position,
      rosterPosition: rosterPlayer.position,
      nflTeam: player.nflTeam,
      currentScore: playerScore,
      projectedScore: playerProjected,
      isActive: isPlayerActive(player),
      injuryStatus: player.injuryReports?.[0]?.status || 'HEALTHY',
      liveUpdates: player.liveUpdates?.slice(0, 5) || []
    })
  }

  return {
    total: Math.round(totalScore * 100) / 100,
    projected: Math.round(projectedScore * 100) / 100,
    rosterDetails
  }
}

// Calculate fantasy points for a stat
function calculateStatPoints(statType: string, statValue: number): number {
  const scoringRules: Record<string, number> = {
    'PASSING_YDS': 0.04,    // 1 point per 25 yards
    'PASSING_TD': 4,        // 4 points per TD
    'PASSING_INT': -2,      // -2 points per INT
    'RUSHING_YDS': 0.1,     // 1 point per 10 yards
    'RUSHING_TD': 6,        // 6 points per TD
    'RECEIVING_YDS': 0.1,   // 1 point per 10 yards
    'RECEIVING_TD': 6,      // 6 points per TD
    'RECEIVING_REC': 0.5,   // 0.5 PPR
    'FUMBLE_LOST': -2,      // -2 points per fumble
    'TWO_POINT': 2,         // 2 points for 2PT conversion
    'KICKING_FG': 3,        // 3 points per FG (simplified)
    'KICKING_XP': 1,        // 1 point per XP
    'DEF_TD': 6,            // 6 points for defensive TD
    'DEF_INT': 2,           // 2 points for INT
    'DEF_FUMBLE': 2,        // 2 points for fumble recovery
    'DEF_SACK': 1,          // 1 point per sack
    'DEF_SAFETY': 2         // 2 points for safety
  }

  return (scoringRules[statType] || 0) * statValue
}

// Check if player is currently active in a game
function isPlayerActive(player: any): boolean {
  // Check if player has recent live updates (within last 4 hours)
  const recentUpdates = player.liveUpdates?.filter((update: any) => 
    new Date(update.timestamp) > new Date(Date.now() - 4 * 60 * 60 * 1000)
  )
  
  return (recentUpdates?.length || 0) > 0
}

// Handle player stat update
async function handlePlayerStatUpdate(data: any) {
  const { playerId, gameId, statType, statValue, quarter, timeInQuarter } = data

  // Record live update
  await prisma.livePlayerUpdate.create({
    data: {
      gameId,
      playerId,
      statType,
      statValue,
      quarter,
      timeInQuarter,
      timestamp: new Date()
    }
  })

  // Update player's weekly stats
  const existingStats = await prisma.playerStats.findFirst({
    where: {
      playerId,
      week: data.week,
      season: data.season
    }
  })

  const currentStats = existingStats?.stats ? JSON.parse(existingStats.stats) : {}
  currentStats[statType] = (currentStats[statType] || 0) + statValue

  const fantasyPoints = calculateStatPoints(statType, statValue)
  const newTotalPoints = (existingStats?.fantasyPoints || 0) + fantasyPoints

  await prisma.playerStats.upsert({
    where: {
      playerId_week_season: {
        playerId,
        week: data.week,
        season: data.season
      }
    },
    update: {
      fantasyPoints: newTotalPoints,
      stats: JSON.stringify(currentStats)
    },
    create: {
      playerId,
      week: data.week,
      season: data.season,
      fantasyPoints: newTotalPoints,
      stats: JSON.stringify(currentStats)
    }
  })
}

// Handle game update
async function handleGameUpdate(data: any) {
  const { nflGameId, status, quarter, timeRemaining, homeScore, awayScore } = data

  await prisma.liveGame.upsert({
    where: { nflGameId },
    update: {
      status,
      quarter,
      timeRemaining,
      homeScore,
      awayScore,
      lastUpdated: new Date()
    },
    create: {
      nflGameId,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      week: data.week,
      season: data.season,
      gameTime: new Date(data.gameTime),
      status,
      quarter,
      timeRemaining,
      homeScore,
      awayScore
    }
  })
}

// Handle injury update
async function handleInjuryUpdate(data: any) {
  const { playerId, status, injury, description, week, season } = data

  await prisma.playerInjuryReport.upsert({
    where: {
      playerId_week_season: {
        playerId,
        week,
        season
      }
    },
    update: {
      status,
      injury,
      description,
      updatedAt: new Date()
    },
    create: {
      playerId,
      status,
      injury,
      description,
      week,
      season
    }
  })
}