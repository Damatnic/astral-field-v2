import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateFromRequest } from '@/lib/auth';
import { Team, ApiResponse } from '@/types/fantasy';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/teams/[id] - Get a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For testing purposes, allow unauthenticated access
    const user = await authenticateFromRequest(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    const teamId = params.id;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
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
            season: true,
            teams: user ? {
              where: {
                ownerId: user.id
              }
            } : undefined
          }
        },
        roster: {
          include: {
            player: {
              include: {
                stats: {
                  where: {
                    season: new Date().getFullYear().toString(),
                    isProjection: false
                  },
                  orderBy: {
                    week: 'desc'
                  },
                  take: 5
                },
                projections: {
                  where: {
                    season: new Date().getFullYear().toString(),
                    week: getCurrentWeek()
                  },
                  orderBy: {
                    confidence: 'desc'
                  },
                  take: 1
                },
                news: {
                  orderBy: {
                    publishedAt: 'desc'
                  },
                  take: 1
                }
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { player: { position: 'asc' } }
          ]
        },
        homeMatchups: {
          where: {
            week: {
              gte: getCurrentWeek() - 2,
              lte: getCurrentWeek() + 1
            }
          },
          include: {
            awayTeam: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        awayMatchups: {
          where: {
            week: {
              gte: getCurrentWeek() - 2,
              lte: getCurrentWeek() + 1
            }
          },
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { success: false, message: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this team
    const isOwner = user ? team.ownerId === user.id : false;
    const isLeagueMember = team.league.teams?.length > 0;

    // For testing, skip access check
    // if (!isOwner && !isLeagueMember) {
    //   return NextResponse.json(
    //     { success: false, message: 'Access denied' },
    //     { status: 403 }
    //   );
    // }

    // Transform roster data
    const transformedRoster = team.roster.map(roster => ({
      ...roster,
      player: {
        ...roster.player,
        averagePoints: calculateAveragePoints(roster.player.stats),
        projectedPoints: roster.player.projections[0]?.projectedPoints || 0,
        lastNews: roster.player.news[0] || null,
        weeklyStats: roster.player.stats.map(stat => ({
          week: stat.week,
          points: stat.fantasyPoints || 0,
          opponent: stat.opponent || '',
          gameTime: new Date(),
          isCompleted: true
        }))
      }
    }));

    // Combine and sort matchups
    const allMatchups = [
      ...team.homeMatchups.map(m => ({ ...m, isHome: true, opponent: m.awayTeam })),
      ...team.awayMatchups.map(m => ({ ...m, isHome: false, opponent: m.homeTeam }))
    ].sort((a, b) => a.week - b.week);

    const transformedTeam = {
      ...team,
      roster: transformedRoster,
      record: {
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        percentage: team.wins + team.losses + team.ties > 0 
          ? (team.wins + team.ties * 0.5) / (team.wins + team.losses + team.ties)
          : 0
      },
      standings: {
        rank: 1, // You'd calculate this based on league standings
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        streak: calculateStreak(team)
      },
      recentMatchups: allMatchups,
      isOwner
    };

    const response: ApiResponse<Team> = {
      success: true,
      data: transformedTeam as any
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in team route:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update team lineup
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For testing purposes, allow unauthenticated access
    const user = await authenticateFromRequest(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    const teamId = params.id;
    const body = await request.json();

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true }
    });

    if (!team) {
      return NextResponse.json(
        { success: false, message: 'Team not found' },
        { status: 404 }
      );
    }

    // For testing, skip ownership check
    // if (team.ownerId !== user?.id) {
    //   return NextResponse.json(
    //     { success: false, message: 'Only the team owner can update the lineup' },
    //     { status: 403 }
    //   );
    // }

    // Handle different update types
    if (body.type === 'lineup_change') {
      // Update player roster slots
      const { changes } = body;
      
      await prisma.$transaction(async (tx) => {
        for (const change of changes) {
          await tx.roster.update({
            where: {
              id: change.rosterId
            },
            data: {
              position: change.toSlot
            }
          });
        }
      });
    } else if (body.type === 'team_name') {
      // Update team name
      await prisma.team.update({
        where: { id: teamId },
        data: {
          name: body.name
        }
      });
    }

    // Return updated team
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        roster: {
          include: {
            player: {
              include: {
                stats: {
                  where: {
                    season: new Date().getFullYear().toString(),
                    isProjection: false
                  },
                  orderBy: {
                    week: 'desc'
                  },
                  take: 5
                },
                projections: {
                  where: {
                    season: new Date().getFullYear().toString(),
                    week: getCurrentWeek()
                  },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    const response: ApiResponse<Team> = {
      success: true,
      data: updatedTeam as any,
      message: 'Team updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in team route:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1);
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

function calculateAveragePoints(stats: any[]): number {
  if (!stats || stats.length === 0) return 0;
  const total = stats.reduce((sum, stat) => sum + (stat.fantasyPoints || 0), 0);
  return total / stats.length;
}

function calculateStreak(team: { wins: number; losses: number; ties: number }): string {
  // Simplified streak calculation
  if (team.wins > team.losses) {
    return `W${Math.min(team.wins, 3)}`;
  } else if (team.losses > team.wins) {
    return `L${Math.min(team.losses, 3)}`;
  } else {
    return 'T1';
  }
}