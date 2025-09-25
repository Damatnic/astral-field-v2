import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface AIRecommendation {
  type: 'lineup' | 'trade' | 'waiver' | 'start_sit'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  action?: string
}

// AI Algorithm for generating recommendations
class AICoach {
  static async generateLineupRecommendations(userId: string): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Get user's teams and rosters
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        league: { select: { currentWeek: true } },
        roster: {
          include: {
            player: {
              include: {
                stats: {
                  where: { season: 2024 },
                  orderBy: { week: 'desc' },
                  take: 3
                },
                projections: {
                  where: { season: 2024 },
                  orderBy: { week: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    })

    for (const team of userTeams) {
      const starters = team.roster.filter((rp: any) => rp.isStarter)
      const bench = team.roster.filter((rp: any) => !rp.isStarter)

      // Analyze bench vs starters
      for (const benchPlayer of bench) {
        const benchProjection = benchPlayer.player.projections[0]?.projectedPoints || 0
        
        // Find starter in same position or FLEX
        const comparableStarters = starters.filter((sp: any) => 
          sp.player.position === benchPlayer.player.position || sp.position === 'FLEX'
        )

        for (const starter of comparableStarters) {
          const starterProjection = starter.player.projections[0]?.projectedPoints || 0
          
          if (benchProjection > starterProjection + 2) {
            recommendations.push({
              type: 'lineup',
              title: `Start ${benchPlayer.player.name}`,
              description: `${benchPlayer.player.name} is projected for ${benchProjection.toFixed(1)} points vs ${starter.player.name}'s ${starterProjection.toFixed(1)} points.`,
              confidence: Math.min(95, Math.round(((benchProjection - starterProjection) / starterProjection) * 100 + 60)),
              impact: benchProjection - starterProjection > 5 ? 'high' : 'medium',
              action: `Start ${benchPlayer.player.name} over ${starter.player.name}`
            })
          }
        }
      }

      // TODO: Add player injury status check when status field is added to Player model
      // Currently commented out as Player model doesn't have status field
      // const questionablePlayers = starters.filter(rp => 
      //   rp.player.status !== 'active' && rp.player.status !== ''
      // )
      
      // for (const qPlayer of questionablePlayers) {
      //   recommendations.push({
      //     type: 'start_sit',
      //     title: `Monitor ${qPlayer.player.name}`,
      //     description: `${qPlayer.player.name} is listed as ${qPlayer.player.status}. Consider backup options.`,
      //     confidence: 75,
      //     impact: 'medium',
      //     action: `Check injury report and have backup ready`
      //   })
      // }
    }

    return recommendations.slice(0, 5) // Limit to top 5
  }

  static async generateTradeRecommendations(userId: string): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Get user's teams
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        league: {
          include: {
            teams: {
              where: { ownerId: { not: userId } },
              include: {
                owner: { select: { name: true } },
                roster: {
                  include: {
                    player: {
                      select: {
                        id: true,
                        name: true,
                        position: true,
                        projections: {
                          where: { season: 2024 },
                          orderBy: { week: 'desc' },
                          take: 1
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        roster: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                projections: {
                  where: { season: 2024 },
                  orderBy: { week: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    })

    for (const team of userTeams) {
      // Identify team weaknesses (positions with low projections)
      const positionStrength: Record<string, number> = {}
      
      for (const rp of team.roster.filter((rp: any) => rp.isStarter)) {
        const projection = rp.player.projections[0]?.projectedPoints || 0
        positionStrength[rp.player.position] = (positionStrength[rp.player.position] || 0) + projection
      }

      // Find weakest position
      const weakestPosition = Object.entries(positionStrength)
        .sort(([,a], [,b]) => a - b)[0]?.[0]

      if (weakestPosition) {
        // Look for teams with strength in that position
        for (const otherTeam of team.league.teams) {
          const strongPlayers = otherTeam.roster
            .filter((rp: any) => rp.player.position === weakestPosition)
            .sort((a: any, b: any) => (b.player.projections[0]?.projectedPoints || 0) - (a.player.projections[0]?.projectedPoints || 0))

          if (strongPlayers.length > 1) {
            recommendations.push({
              type: 'trade',
              title: `Trade Target: ${strongPlayers[0].player.name}`,
              description: `${otherTeam.owner.name} has depth at ${weakestPosition}. Consider offering players from your stronger positions.`,
              confidence: 60,
              impact: 'high',
              action: `Propose trade with ${otherTeam.owner.name}`
            })
          }
        }
      }
    }

    return recommendations.slice(0, 2)
  }

  static async generateWaiverRecommendations(userId: string): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Get available players (not rostered)
    const rosteredPlayerIds = await prisma.rosterPlayer.findMany({
      select: { playerId: true }
    })

    const availablePlayers = await prisma.player.findMany({
      where: {
        id: { notIn: rosteredPlayerIds.map((rp: any) => rp.playerId) },
        isFantasyRelevant: true
      },
      include: {
        projections: {
          where: { season: 2024 },
          orderBy: { week: 'desc' },
          take: 1
        },
        stats: {
          where: { season: 2024 },
          orderBy: { week: 'desc' },
          take: 3
        }
      },
      orderBy: { adp: 'asc' },
      take: 20
    })

    // Find players with upward trend
    for (const player of availablePlayers) {
      if (player.stats.length >= 2) {
        const recentAvg = player.stats.slice(0, 2).reduce((sum, s) => sum + s.fantasyPoints, 0) / 2
        const olderAvg = player.stats.slice(1).reduce((sum, s) => sum + s.fantasyPoints, 0) / (player.stats.length - 1)
        
        if (recentAvg > olderAvg + 3) {
          recommendations.push({
            type: 'waiver',
            title: `Trending Up: ${player.name}`,
            description: `${player.name} has averaged ${recentAvg.toFixed(1)} points in recent games, showing upward trend.`,
            confidence: Math.min(80, Math.round(((recentAvg - olderAvg) / olderAvg) * 100 + 50)),
            impact: recentAvg > 15 ? 'high' : 'medium',
            action: `Add ${player.name} from waivers`
          })
        }
      }
    }

    return recommendations.slice(0, 3)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Generate AI recommendations
    const [lineupRecs, tradeRecs, waiverRecs] = await Promise.all([
      AICoach.generateLineupRecommendations(userId),
      AICoach.generateTradeRecommendations(userId),
      AICoach.generateWaiverRecommendations(userId)
    ])

    const allRecommendations = [...lineupRecs, ...tradeRecs, ...waiverRecs]
    
    // Sort by confidence and impact
    allRecommendations.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 }
      const aScore = a.confidence + (impactScore[a.impact] * 10)
      const bScore = b.confidence + (impactScore[b.impact] * 10)
      return bScore - aScore
    })

    return NextResponse.json({
      recommendations: allRecommendations.slice(0, 10)
    })

  } catch (error) {
    console.error('AI recommendations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}