import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateFromRequest } from '@/lib/auth';
import { handleComponentError } from '@/lib/error-handling';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/my-team - Get current user's team with full roster
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentWeek = getCurrentWeek();

    // Find user's team in the current league
    const userTeam = await prisma.team.findFirst({
      where: {
        ownerId: user.id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true
          }
        },
        roster: {
          include: {
            player: {
              include: {
                playerStats: {
                  where: {
                    season: new Date().getFullYear(),
                    week: {
                      gte: Math.max(1, currentWeek - 3),
                      lte: currentWeek
                    }
                  },
                  orderBy: {
                    week: 'desc'
                  }
                },
                projections: {
                  where: {
                    season: new Date().getFullYear(),
                    week: currentWeek
                  },
                  orderBy: {
                    confidence: 'desc'
                  },
                  take: 1
                },
                playerNews: {
                  orderBy: {
                    timestamp: 'desc'
                  },
                  take: 3
                }
              }
            }
          },
          orderBy: [
            { rosterSlot: 'asc' },
            { player: { position: 'asc' } },
            { player: { name: 'asc' } }
          ]
        }
      }
    });

    if (!userTeam) {
      return NextResponse.json(
        { success: false, message: 'No team found for current user' },
        { status: 404 }
      );
    }

    // Transform roster data with enhanced player information
    const transformedRoster = userTeam.roster.map(rosterPlayer => {
      const latestStats = rosterPlayer.player.playerStats[0];
      const projection = rosterPlayer.player.projections[0];
      
      return {
        id: rosterPlayer.id,
        playerId: rosterPlayer.playerId,
        rosterSlot: rosterPlayer.rosterSlot,
        position: rosterPlayer.position,
        isLocked: rosterPlayer.isLocked,
        acquisitionDate: rosterPlayer.acquisitionDate,
        acquisitionType: rosterPlayer.acquisitionType,
        player: {
          id: rosterPlayer.player.id,
          name: rosterPlayer.player.name,
          firstName: rosterPlayer.player.firstName,
          lastName: rosterPlayer.player.lastName,
          position: rosterPlayer.player.position,
          nflTeam: rosterPlayer.player.nflTeam,
          byeWeek: rosterPlayer.player.byeWeek,
          status: rosterPlayer.player.status,
          injuryStatus: rosterPlayer.player.injuryStatus,
          isRookie: rosterPlayer.player.isRookie,
          age: rosterPlayer.player.age,
          height: rosterPlayer.player.height,
          weight: rosterPlayer.player.weight,
          college: rosterPlayer.player.college,
          // Current season stats
          seasonStats: {
            totalPoints: calculateTotalPoints(rosterPlayer.player.playerStats),
            averagePoints: calculateAveragePoints(rosterPlayer.player.playerStats),
            lastWeekPoints: latestStats?.fantasyPoints?.toNumber() || 0,
            gamesPlayed: rosterPlayer.player.playerStats.length,
            trend: calculateTrend(rosterPlayer.player.playerStats)
          },
          // This week's projection
          projection: {
            points: projection?.projectedPoints?.toNumber() || 0,
            confidence: projection?.confidence || 0,
            source: projection?.source || 'SYSTEM'
          },
          // Recent games
          recentGames: rosterPlayer.player.playerStats.slice(0, 4).map(stat => ({
            week: stat.week,
            opponent: stat.opponent,
            points: stat.fantasyPoints?.toNumber() || 0,
            stats: stat.stats,
            gameId: stat.gameId
          })),
          // Latest news
          news: rosterPlayer.player.playerNews.map(news => ({
            id: news.id,
            headline: news.headline,
            content: news.content,
            source: news.source,
            timestamp: news.timestamp,
            impact: news.impact,
            category: news.category
          }))
        }
      };
    });

    // Group roster by position slots for lineup management
    const lineup = {
      starters: transformedRoster.filter(p => 
        ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DST'].includes(p.rosterSlot)
      ),
      bench: transformedRoster.filter(p => p.rosterSlot === 'BENCH'),
      ir: transformedRoster.filter(p => p.rosterSlot === 'IR'),
      taxi: transformedRoster.filter(p => p.rosterSlot === 'TAXI')
    };

    // Calculate team totals and projections
    const teamStats = {
      currentWeekProjection: lineup.starters.reduce((sum, player) => 
        sum + (player.player.projection.points || 0), 0
      ),
      lastWeekTotal: lineup.starters.reduce((sum, player) => 
        sum + (player.player.seasonStats.lastWeekPoints || 0), 0
      ),
      seasonAverage: lineup.starters.reduce((sum, player) => 
        sum + (player.player.seasonStats.averagePoints || 0), 0
      ),
      totalSeasonPoints: transformedRoster.reduce((sum, player) => 
        sum + (player.player.seasonStats.totalPoints || 0), 0
      )
    };

    const teamData = {
      id: userTeam.id,
      name: userTeam.name,
      leagueId: userTeam.leagueId,
      wins: userTeam.wins,
      losses: userTeam.losses,
      ties: userTeam.ties,
      pointsFor: userTeam.pointsFor,
      pointsAgainst: userTeam.pointsAgainst,
      waiverPriority: userTeam.waiverPriority,
      faabBudget: userTeam.faabBudget,
      faabSpent: userTeam.faabSpent,
      owner: userTeam.owner,
      league: userTeam.league,
      roster: transformedRoster,
      lineup: lineup,
      stats: teamStats,
      record: {
        wins: userTeam.wins,
        losses: userTeam.losses,
        ties: userTeam.ties,
        percentage: userTeam.wins + userTeam.losses + userTeam.ties > 0 
          ? (userTeam.wins + userTeam.ties * 0.5) / (userTeam.wins + userTeam.losses + userTeam.ties)
          : 0
      }
    };

    return NextResponse.json({
      success: true,
      data: teamData
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/my-team - Update team lineup
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, changes, playerId, newSlot } = body;

    // Find user's team
    const userTeam = await prisma.team.findFirst({
      where: { ownerId: user.id },
      select: { id: true }
    });

    if (!userTeam) {
      return NextResponse.json(
        { success: false, message: 'No team found for current user' },
        { status: 404 }
      );
    }

    if (type === 'lineup_change') {
      // Handle multiple lineup changes (drag and drop)
      await prisma.$transaction(async (tx) => {
        for (const change of changes) {
          await tx.rosterPlayer.update({
            where: {
              id: change.rosterPlayerId
            },
            data: {
              rosterSlot: change.toSlot,
              position: change.toSlot === 'BENCH' ? change.toSlot : change.toSlot
            }
          });
        }
      });
    } else if (type === 'single_move') {
      // Handle single player position change
      await prisma.rosterPlayer.updateMany({
        where: {
          teamId: userTeam.id,
          playerId: playerId
        },
        data: {
          rosterSlot: newSlot,
          position: newSlot === 'BENCH' ? newSlot : newSlot
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lineup updated successfully'
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

function calculateTotalPoints(stats: any[]): number {
  if (!stats || stats.length === 0) return 0;
  return stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0);
}

function calculateAveragePoints(stats: any[]): number {
  if (!stats || stats.length === 0) return 0;
  const total = calculateTotalPoints(stats);
  return total / stats.length;
}

function calculateTrend(stats: any[]): 'up' | 'down' | 'stable' {
  if (!stats || stats.length < 2) return 'stable';
  
  const recent = stats.slice(0, 2);
  const older = stats.slice(2, 4);
  
  if (recent.length < 2 || older.length < 2) return 'stable';
  
  const recentAvg = recent.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / older.length;
  
  if (recentAvg > olderAvg * 1.1) return 'up';
  if (recentAvg < olderAvg * 0.9) return 'down';
  return 'stable';
}