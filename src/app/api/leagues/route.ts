import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateFromRequest } from '@/lib/auth';
import { League, CreateLeagueForm, ApiResponse, PaginatedResponse } from '@/types/fantasy';

const prisma = new PrismaClient();

// Default league settings
const DEFAULT_ROSTER_SLOTS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  K: 1,
  DST: 1,
  BENCH: 6,
  IR: 1
};

const DEFAULT_SCORING_SYSTEM = {
  passing: {
    yards: 0.04,
    touchdowns: 4,
    interceptions: -2,
    twoPointConversions: 2
  },
  rushing: {
    yards: 0.1,
    touchdowns: 6,
    twoPointConversions: 2
  },
  receiving: {
    yards: 0.1,
    touchdowns: 6,
    receptions: 0.5,
    twoPointConversions: 2
  },
  kicking: {
    fieldGoals: {
      "0-39": 3,
      "40-49": 4,
      "50-59": 5,
      "60+": 6
    },
    extraPoints: 1
  },
  defense: {
    touchdowns: 6,
    interceptions: 2,
    fumbleRecoveries: 2,
    sacks: 1,
    safeties: 2,
    pointsAllowed: {
      "0": 10,
      "1-6": 7,
      "7-13": 4,
      "14-20": 1,
      "21-27": 0,
      "28-34": -1,
      "35+": -4
    }
  }
};

// GET /api/leagues - Get all leagues for the authenticated user
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const isActive = searchParams.get('isActive') === 'true';
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : new Date().getFullYear();

    const skip = (page - 1) * limit;

    // Get leagues where user is a member
    const [leagues, totalCount] = await Promise.all([
      prisma.league.findMany({
        where: {
          AND: [
            {
              members: {
                some: {
                  userId: user.id
                }
              }
            },
            isActive !== undefined ? { isActive } : {},
            season ? { season } : {}
          ]
        },
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
        },
        orderBy: [
          { isActive: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.league.count({
        where: {
          AND: [
            {
              members: {
                some: {
                  userId: user.id
                }
              }
            },
            isActive !== undefined ? { isActive } : {},
            season ? { season } : {}
          ]
        }
      })
    ]);

    const transformedLeagues = leagues.map(league => ({
      ...league,
      memberCount: league.members.length,
      teamCount: league.teams.length,
      settings: {
        ...league.settings,
        rosterSlots: league.settings?.rosterSlots || DEFAULT_ROSTER_SLOTS,
        scoringSystem: league.settings?.scoringSystem || DEFAULT_SCORING_SYSTEM
      }
    }));

    const response: PaginatedResponse<League> = {
      data: transformedLeagues as any,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: skip + limit < totalCount
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/leagues - Create a new league
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateLeagueForm = await request.json();

    // Validate required fields
    if (!body.name || !body.season || !body.teamCount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: name, season, teamCount' },
        { status: 400 }
      );
    }

    // Validate team count
    if (body.teamCount < 4 || body.teamCount > 16) {
      return NextResponse.json(
        { success: false, message: 'Team count must be between 4 and 16' },
        { status: 400 }
      );
    }

    // Create league with settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the league
      const league = await tx.league.create({
        data: {
          name: body.name,
          description: body.description,
          season: body.season,
          isActive: true,
          currentWeek: 1,
          commissionerId: user.id
        }
      });

      // Create league settings
      await tx.settings.create({
        data: {
          leagueId: league.id,
          rosterSlots: (body.rosterSettings || DEFAULT_ROSTER_SLOTS) as any,
          scoringSystem: (body.scoringSettings || DEFAULT_SCORING_SYSTEM) as any,
          waiverMode: body.waiverMode || 'ROLLING',
          tradeDeadline: body.tradeDeadline ? new Date(body.tradeDeadline) : null,
          playoffWeeks: [15, 16, 17] // Default playoff weeks
        }
      });

      // Add creator as league member and commissioner
      await tx.leagueMember.create({
        data: {
          userId: user.id,
          leagueId: league.id,
          role: 'COMMISSIONER'
        }
      });

      // Create commissioner team
      await tx.team.create({
        data: {
          name: `${user.name}'s Team`,
          leagueId: league.id,
          ownerId: user.id,
          waiverPriority: 1,
          faabBudget: 100
        }
      });

      return league;
    });

    // Fetch the complete league with all relations
    const completeLeague = await prisma.league.findUnique({
      where: { id: result.id },
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

    const transformedLeague = {
      ...completeLeague,
      memberCount: completeLeague?.members.length || 0,
      teamCount: completeLeague?.teams.length || 0,
      settings: {
        ...completeLeague?.settings,
        rosterSlots: completeLeague?.settings?.rosterSlots || DEFAULT_ROSTER_SLOTS,
        scoringSystem: completeLeague?.settings?.scoringSystem || DEFAULT_SCORING_SYSTEM
      }
    };

    const response: ApiResponse<League> = {
      success: true,
      data: transformedLeague as any,
      message: 'League created successfully'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating league:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}