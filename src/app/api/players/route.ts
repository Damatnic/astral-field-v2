import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { Player, PlayerSearchFilters, PaginatedResponse } from '@/types/fantasy';

export const dynamic = 'force-dynamic';

// GET /api/players - Search and get players
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchQuery = searchParams.get('search') || '';
    const positions = searchParams.get('positions')?.split(',') || [];
    const teams = searchParams.get('teams')?.split(',') || [];
    const statuses = searchParams.get('statuses')?.split(',') || [];
    const availability = searchParams.get('availability') || 'all';
    const leagueId = searchParams.get('leagueId');

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      AND: []
    };

    // Search by name
    if (searchQuery) {
      whereClause.AND.push({
        name: {
          contains: searchQuery,
          mode: 'insensitive'
        }
      });
    }

    // Filter by positions
    if (positions.length > 0) {
      whereClause.AND.push({
        position: {
          in: positions
        }
      });
    }

    // Filter by NFL teams
    if (teams.length > 0) {
      whereClause.AND.push({
        nflTeam: {
          in: teams
        }
      });
    }

    // Filter by player status
    if (statuses.length > 0) {
      whereClause.AND.push({
        status: {
          in: statuses
        }
      });
    }

    // Filter by availability (rostered vs available)
    if (availability !== 'all' && leagueId) {
      if (availability === 'available') {
        whereClause.AND.push({
          NOT: {
            rosterPlayers: {
              some: {
                team: {
                  leagueId: leagueId
                }
              }
            }
          }
        });
      } else if (availability === 'rostered') {
        whereClause.AND.push({
          rosterPlayers: {
            some: {
              team: {
                leagueId: leagueId
              }
            }
          }
        });
      }
    }

    // If no filters, add a basic filter to avoid returning all players
    if (whereClause.AND.length === 0) {
      whereClause.AND.push({
        status: {
          in: ['ACTIVE', 'QUESTIONABLE', 'DOUBTFUL']
        }
      });
    }

    const currentWeek = getCurrentWeek();
    const currentSeason = new Date().getFullYear();

    const [players, totalCount] = await Promise.all([
      prisma.player.findMany({
        where: whereClause,
        include: {
          playerStats: {
            where: {
              season: currentSeason,
              week: {
                lte: currentWeek
              }
            },
            orderBy: {
              week: 'desc'
            },
            take: 5
          },
          projections: {
            where: {
              season: currentSeason,
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
          },
          rosterPlayers: leagueId ? {
            where: {
              team: {
                leagueId: leagueId
              }
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  owner: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          } : false
        },
        orderBy: [
          { searchRank: 'asc' },
          { position: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.player.count({
        where: whereClause
      })
    ]);

    // Transform players data with comprehensive stats
    const transformedPlayers = players.map(player => {
      const seasonStats = player.playerStats || [];
      const totalPoints = seasonStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0);
      const averagePoints = seasonStats.length > 0 ? totalPoints / seasonStats.length : 0;
      const lastGamePoints = seasonStats[0]?.fantasyPoints?.toNumber() || 0;
      const projection = player.projections?.[0];
      const isRostered = player.rosterPlayers && player.rosterPlayers.length > 0;
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (seasonStats.length >= 3) {
        const recent = seasonStats.slice(0, 2);
        const older = seasonStats.slice(2, 4);
        
        if (recent.length >= 2 && older.length >= 2) {
          const recentAvg = recent.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recent.length;
          const olderAvg = older.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / older.length;
          
          if (recentAvg > olderAvg * 1.1) trend = 'up';
          else if (recentAvg < olderAvg * 0.9) trend = 'down';
        }
      }

      return {
        id: player.id,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        nflTeam: player.nflTeam,
        byeWeek: player.byeWeek,
        status: player.status,
        injuryStatus: player.injuryStatus,
        isRookie: player.isRookie,
        age: player.age,
        height: player.height,
        weight: player.weight,
        college: player.college,
        searchRank: player.searchRank,
        adp: player.adp,
        // Season statistics
        seasonStats: {
          totalPoints: totalPoints,
          averagePoints: averagePoints,
          lastGamePoints: lastGamePoints,
          gamesPlayed: seasonStats.length,
          trend: trend,
          consistency: calculateConsistency(seasonStats)
        },
        // This week's projection
        projection: {
          points: projection?.projectedPoints?.toNumber() || 0,
          confidence: projection?.confidence || 0,
          source: projection?.source || 'SYSTEM'
        },
        // Recent game log
        recentGames: seasonStats.slice(0, 5).map(stat => ({
          week: stat.week,
          opponent: stat.opponent,
          points: stat.fantasyPoints?.toNumber() || 0,
          stats: stat.stats,
          gameId: stat.gameId
        })),
        // News
        news: (player.playerNews || []).map(news => ({
          id: news.id,
          headline: news.headline,
          content: news.content,
          source: news.source,
          timestamp: news.timestamp,
          impact: news.impact,
          category: news.category
        })),
        // Roster information
        isRostered: isRostered,
        rosterInfo: isRostered && player.rosterPlayers ? {
          teamId: player.rosterPlayers[0].team.id,
          teamName: player.rosterPlayers[0].team.name,
          ownerName: player.rosterPlayers[0].team.owner.name,
          rosterSlot: player.rosterPlayers[0].rosterSlot
        } : null,
        // Fantasy relevance scoring
        fantasyScore: calculateFantasyScore(player, seasonStats, projection),
        // Matchup information
        upcomingOpponent: getUpcomingOpponent(player.nflTeam, currentWeek),
        restOfSeasonOutlook: calculateROSOutlook(seasonStats, player.byeWeek, currentWeek)
      };
    });

    const response: PaginatedResponse<Player> = {
      data: transformedPlayers as any,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: skip + limit < totalCount
      }
    };

    return NextResponse.json(response);
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

function calculateConsistency(stats: any[]): number {
  if (stats.length < 3) return 0;
  
  const points = stats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Consistency score: lower standard deviation = higher consistency
  // Normalize to 0-100 scale
  return Math.max(0, 100 - (standardDeviation * 5));
}

function calculateFantasyScore(player: any, stats: any[], projection: any): number {
  let score = 0;
  
  // Base score from search rank
  if (player.searchRank) {
    score += Math.max(0, 1000 - player.searchRank);
  }
  
  // Season performance (40% weight)
  if (stats.length > 0) {
    const avgPoints = stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / stats.length;
    score += avgPoints * 40;
  }
  
  // Projection confidence (20% weight)
  if (projection) {
    score += (projection.projectedPoints?.toNumber() || 0) * 20;
    score += (projection.confidence || 0) * 2;
  }
  
  // Health bonus (10% weight)
  if (player.status === 'ACTIVE') {
    score += 100;
  } else if (player.status === 'QUESTIONABLE') {
    score += 50;
  }
  
  // Youth bonus for rookies (5% weight)
  if (player.isRookie) {
    score += 50;
  }
  
  return Math.round(score);
}

function getUpcomingOpponent(nflTeam: string | null, currentWeek: number): string {
  // Simplified opponent lookup - in production this would use actual NFL schedule
  const weeklyOpponents: { [key: string]: { [week: number]: string } } = {
    'DAL': { 1: 'vs GB', 2: 'vs NO', 3: '@ ARI', 4: 'vs NE' },
    'GB': { 1: '@ DAL', 2: 'vs IND', 3: 'vs DEN', 4: '@ MIN' },
    // Add more teams and schedules as needed
  };
  
  if (!nflTeam || !weeklyOpponents[nflTeam] || !weeklyOpponents[nflTeam][currentWeek + 1]) {
    return 'TBD';
  }
  
  return weeklyOpponents[nflTeam][currentWeek + 1];
}

function calculateROSOutlook(stats: any[], byeWeek: number | null, currentWeek: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (stats.length === 0) return 'average';
  
  const avgPoints = stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / stats.length;
  const recentForm = stats.slice(0, 3).reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / Math.min(3, stats.length);
  
  // Consider bye week impact
  const byeWeekPenalty = (byeWeek && byeWeek > currentWeek) ? 0.9 : 1.0;
  const adjustedScore = (avgPoints * 0.6 + recentForm * 0.4) * byeWeekPenalty;
  
  if (adjustedScore >= 15) return 'excellent';
  if (adjustedScore >= 10) return 'good';
  if (adjustedScore >= 6) return 'average';
  return 'poor';
}