/**
 * Vortex Analytics API - High-Performance Fantasy Analytics Endpoints
 * Simplified to use existing database models only
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const week = parseInt(searchParams.get('week') || '3');
    const season = parseInt(searchParams.get('season') || '2025');
    
    switch (endpoint) {
      case 'overview':
        return await handleOverviewRequest(week, season);
      
      case 'players':
        return await handlePlayersRequest(week, season, searchParams);
      
      case 'teams':
        return await handleTeamsRequest(week, season, searchParams);
      
      case 'matchups':
        return await handleMatchupsRequest(week, season);
      
      case 'insights':
        return await handleInsightsRequest(week, season);
      
      default:
        return NextResponse.json(
          { error: 'Invalid endpoint. Available: overview, players, teams, matchups, insights' },
          { status: 400 }
        );
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Vortex Analytics API Error:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleOverviewRequest(week: number, season: number) {
  try {
    const [totalPlayers, totalTeams, totalMatchups, activeLeagues] = await Promise.all([
      prisma.player.count(),
      prisma.team.count(),
      prisma.matchup.count({ where: { week } }),
      prisma.league.count({ where: { isActive: true } })
    ]);

    const overview = {
      timestamp: new Date().toISOString(),
      week,
      season,
      summary: {
        totalPlayers,
        totalTeams,
        activeLeagues,
        weeklyMatchups: totalMatchups,
        status: 'operational'
      },
      insights: [
        'Fantasy analytics system operational',
        `Processing data for Week ${week}`,
        `${activeLeagues} active leagues tracked`,
        `${totalPlayers} players in database`
      ]
    };

    return NextResponse.json(overview);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Overview request error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

async function handlePlayersRequest(week: number, season: number, searchParams: URLSearchParams) {
  try {
    const position = searchParams.get('position') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const players = await prisma.player.findMany({
      where: position ? { position } : undefined,
      take: limit,
      orderBy: { rank: 'asc' },
      include: {
        stats: {
          where: { week, season },
          take: 1,
          orderBy: { week: 'desc' }
        },
        projections: {
          where: { week, season },
          take: 1
        }
      }
    });

    const analytics = {
      timestamp: new Date().toISOString(),
      week,
      season,
      filters: { position, limit },
      players: players.map(player => {
        const weeklyStats = player.stats[0];
        const projection = player.projections[0];
        
        return {
          id: player.id,
          name: player.name,
          position: player.position,
          nflTeam: player.nflTeam,
          rank: player.rank,
          adp: player.adp,
          weeklyPoints: weeklyStats?.fantasyPoints || 0,
          projectedPoints: projection?.projectedPoints || 0,
          analytics: {
            consistency: 75 + Math.random() * 25, // Mock for now
            trend: Math.random() > 0.5 ? 'up' : 'down',
            matchupRating: 5 + Math.random() * 5
          }
        };
      }),
      summary: {
        totalPlayers: players.length,
        averageProjection: players.reduce((sum, p) => {
          const proj = p.projections[0]?.projectedPoints || 0;
          return sum + proj;
        }, 0) / (players.length || 1)
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Players request error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch player analytics' }, { status: 500 });
  }
}

async function handleTeamsRequest(week: number, season: number, searchParams: URLSearchParams) {
  try {
    const leagueId = searchParams.get('leagueId') || undefined;
    
    const teams = await prisma.team.findMany({
      where: leagueId ? { leagueId } : undefined,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        league: { select: { id: true, name: true, currentWeek: true } },
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: { week, season },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    const analytics = {
      timestamp: new Date().toISOString(),
      week,
      season,
      filters: { leagueId },
      teams: teams.map(team => {
        const totalProjectedPoints = team.roster.reduce(
          (sum: number, rp: any) => {
            const proj = rp.player.projections[0]?.projectedPoints || 0;
            return sum + proj;
          }, 0
        );
        
        return {
          id: team.id,
          name: team.name,
          owner: team.owner.name,
          league: team.league.name,
          record: {
            wins: team.wins,
            losses: team.losses,
            ties: team.ties
          },
          rosterSize: team.roster.length,
          projectedPoints: totalProjectedPoints,
          analytics: {
            powerRanking: Math.floor(Math.random() * 10) + 1,
            strength: 50 + Math.random() * 50,
            consistency: 60 + Math.random() * 40
          }
        };
      }),
      summary: {
        totalTeams: teams.length,
        averageRosterSize: teams.reduce((sum, t) => sum + t.roster.length, 0) / (teams.length || 1)
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Teams request error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch team analytics' }, { status: 500 });
  }
}

async function handleMatchupsRequest(week: number, season: number) {
  try {
    const matchups = await prisma.matchup.findMany({
      where: { week, season },
      include: {
        homeTeam: {
          include: {
            owner: { select: { name: true } },
            roster: {
              include: {
                player: {
                  include: {
                    stats: {
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
            owner: { select: { name: true } },
            roster: {
              include: {
                player: {
                  include: {
                    stats: {
                      where: { week, season },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const analytics = {
      timestamp: new Date().toISOString(),
      week,
      season,
      matchups: matchups.map(matchup => {
        const homePoints = matchup.homeTeam.roster.reduce(
          (sum: number, rp: any) => sum + (rp.player.stats[0]?.fantasyPoints || 0), 0
        );
        const awayPoints = matchup.awayTeam.roster.reduce(
          (sum: number, rp: any) => sum + (rp.player.stats[0]?.fantasyPoints || 0), 0
        );
        
        return {
          id: matchup.id,
          homeTeam: {
            name: matchup.homeTeam.name,
            owner: matchup.homeTeam.owner.name,
            score: homePoints
          },
          awayTeam: {
            name: matchup.awayTeam.name,
            owner: matchup.awayTeam.owner.name,
            score: awayPoints
          },
          isComplete: matchup.isComplete,
          winner: homePoints > awayPoints ? 'home' : awayPoints > homePoints ? 'away' : 'tie'
        };
      }),
      summary: {
        totalMatchups: matchups.length,
        completedMatchups: matchups.filter(m => m.isComplete).length
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Matchups request error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch matchup analytics' }, { status: 500 });
  }
}

async function handleInsightsRequest(week: number, season: number) {
  try {
    // Generate basic insights from existing data
    const [topPlayers, activeLeagues, recentMatchups] = await Promise.all([
      prisma.player.findMany({
        take: 5,
        orderBy: { rank: 'asc' },
        include: {
          stats: {
            where: { week, season },
            take: 1
          }
        }
      }),
      prisma.league.count({ where: { isActive: true } }),
      prisma.matchup.count({ where: { week, season } })
    ]);

    const insights = {
      timestamp: new Date().toISOString(),
      week,
      season,
      keyInsights: [
        `${activeLeagues} active leagues this week`,
        `${recentMatchups} matchups scheduled`,
        `Top performer: ${topPlayers[0]?.name || 'N/A'}`,
        'Fantasy analytics running smoothly'
      ],
      topPerformers: topPlayers.map(player => ({
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        points: player.stats[0]?.fantasyPoints || 0
      })),
      trends: {
        mostOwned: 'QB position trending up',
        breakout: 'Watch for RB opportunities',
        injuries: 'Monitor injury reports'
      }
    };

    return NextResponse.json(insights);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Insights request error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
