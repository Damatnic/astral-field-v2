import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateFromRequest } from '@/lib/auth';
import { handleComponentError } from '@/lib/error-handling';
import { League, ApiResponse } from '@/types/fantasy';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/leagues/[id] - Get a specific league
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const leagueId = params.id;

    // Get league with all relations
    const league: any = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        commissioner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                teamName: true
              }
            }
          }
        },
        teams: {
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
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    status: true,
                    byeWeek: true
                  }
                }
              }
            }
          },
          orderBy: [
            { pointsFor: 'desc' }
          ]
        },
        settings: true,
        matchups: {
          where: {
            week: 1 // Default current week - will be updated properly in the future
          },
          include: {
            homeTeam: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            awayTeam: {
              include: {
                owner: {
                  select: {
                    id: true,
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

    if (!league) {
      return NextResponse.json(
        { success: false, message: 'League not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of the league
    const isMember = league.members.some((member: any) => member.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { success: false, message: 'Access denied. You are not a member of this league.' },
        { status: 403 }
      );
    }

    // Transform the league data
    const transformedLeague = {
      ...league,
      memberCount: league.members.length,
      teamCount: league.teams.length,
      teams: league.teams.map((team: any, index: number) => ({
        ...team,
        record: {
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          percentage: team.wins + team.losses + team.ties > 0 
            ? (team.wins + team.ties * 0.5) / (team.wins + team.losses + team.ties)
            : 0
        },
        standings: {
          rank: index + 1,
          pointsFor: team.pointsFor,
          pointsAgainst: team.pointsAgainst,
          streak: calculateStreak(team) // You'd implement this function
        }
      }))
    };

    const response: ApiResponse<League> = {
      success: true,
      data: transformedLeague as League
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

// PUT /api/leagues/[id] - Update a league
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const leagueId = params.id;
    const body = await request.json();

    // Check if user is the commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { commissionerId: true }
    });

    if (!league) {
      return NextResponse.json(
        { success: false, message: 'League not found' },
        { status: 404 }
      );
    }

    if (league.commissionerId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only the commissioner can update league settings' },
        { status: 403 }
      );
    }

    // Update league and settings in a transaction
    const updatedLeague = await prisma.$transaction(async (tx) => {
      // Update league basic info
      const league = await tx.league.update({
        where: { id: leagueId },
        data: {
          name: body.name,
          description: body.description,
          currentWeek: body.currentWeek,
          isActive: body.isActive
        }
      });

      // Update settings if provided
      if (body.settings) {
        await tx.settings.update({
          where: { leagueId },
          data: {
            rosterSlots: body.settings.rosterSlots,
            scoringSystem: body.settings.scoringSystem,
            waiverMode: body.settings.waiverMode,
            tradeDeadline: body.settings.tradeDeadline ? new Date(body.settings.tradeDeadline) : null,
            playoffWeeks: body.settings.playoffWeeks
          }
        });
      }

      return league;
    });

    // Fetch updated league with relations
    const completeLeague = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        commissioner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        teams: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        settings: true
      }
    });

    const response: ApiResponse<League> = {
      success: true,
      data: completeLeague as any,
      message: 'League updated successfully'
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

// DELETE /api/leagues/[id] - Delete a league
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const leagueId = params.id;

    // Check if user is the commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { commissionerId: true, name: true }
    });

    if (!league) {
      return NextResponse.json(
        { success: false, message: 'League not found' },
        { status: 404 }
      );
    }

    if (league.commissionerId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only the commissioner can delete the league' },
        { status: 403 }
      );
    }

    // Delete league (cascade will handle related records)
    await prisma.league.delete({
      where: { id: leagueId }
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: `League "${league.name}" deleted successfully`
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

// Helper function to calculate team streak
function calculateStreak(team: { wins: number; losses: number; ties: number }): string {
  // This is a simplified implementation
  // In a real app, you'd look at recent matchup results
  if (team.wins > team.losses) {
    return `W${Math.min(team.wins, 3)}`;
  } else if (team.losses > team.wins) {
    return `L${Math.min(team.losses, 3)}`;
  } else {
    return 'T1';
  }
}