import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateFromRequest } from '@/lib/auth';
import { Player, PlayerSearchFilters, PaginatedResponse } from '@/types/fantasy';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

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

    const [players, totalCount] = await Promise.all([
      prisma.player.findMany({
        where: whereClause,
        include: {
          playerStats: {
            where: {
              season: new Date().getFullYear(),
              isProjected: false
            },
            orderBy: {
              week: 'desc'
            },
            take: 5
          },
          projections: {
            where: {
              season: new Date().getFullYear(),
              week: getCurrentWeek() // You'd implement this function
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
                  ownerId: true
                }
              }
            }
          } : false
        },
        orderBy: [
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

    // Transform players data to include calculated fields
    const transformedPlayers = players.map(player => {
      const recentStats = player.playerStats || [];
      const averagePoints = recentStats.length > 0
        ? recentStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recentStats.length
        : 0;

      const weeklyStats = recentStats.map(stat => ({
        week: stat.week,
        points: stat.fantasyPoints?.toNumber() || 0,
        projectedPoints: player.projections[0]?.projectedPoints?.toNumber(),
        opponent: stat.opponent || '',
        gameTime: new Date(), // You'd get this from game data
        isCompleted: true
      }));

      return {
        ...player,
        averagePoints,
        weeklyStats,
        isRostered: leagueId ? (player.rosterPlayers?.length || 0) > 0 : undefined,
        rosterInfo: leagueId && player.rosterPlayers?.[0] ? {
          teamId: (player.rosterPlayers[0] as any).team?.id,
          teamName: (player.rosterPlayers[0] as any).team?.name,
          ownerId: (player.rosterPlayers[0] as any).team?.ownerId,
          rosterSlot: player.rosterPlayers[0].rosterSlot
        } : null
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
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get current NFL week
function getCurrentWeek(): number {
  // This is a simplified implementation
  // In a real app, you'd calculate this based on the current date and NFL schedule
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}