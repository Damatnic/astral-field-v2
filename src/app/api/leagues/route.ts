import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive') === 'true';
    const season = searchParams.get('season');

    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (season) {
      whereClause.season = season;
    }

    const leagues = await prisma.league.findMany({
      where: whereClause,
      include: {
        commissioner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        teams: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformedLeagues = leagues.map(league => ({
      id: league.id,
      name: league.name,
      season: league.season,
      currentWeek: league.currentWeek,
      isActive: league.isActive,
      commissioner: {
        id: league.commissioner.id,
        name: league.commissioner.name,
        email: league.commissioner.email
      },
      teamCount: league.teams.length,
      members: league.teams.map(team => ({
        id: team.owner.id,
        name: team.owner.name,
        teamName: team.name
      }))
    }));

    return NextResponse.json({
      success: true,
      data: transformedLeagues
    });

  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leagues' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      season = "2025", 
      commissionerId,
      maxTeams = 10,
      draftDate,
      settings = {},
      scoringSettings = {},
      rosterSettings = {}
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'League name is required' },
        { status: 400 }
      );
    }

    if (!commissionerId) {
      return NextResponse.json(
        { success: false, message: 'Commissioner ID is required' },
        { status: 400 }
      );
    }

    // Verify commissioner exists
    const commissioner = await prisma.user.findUnique({
      where: { id: commissionerId }
    });

    if (!commissioner) {
      return NextResponse.json(
        { success: false, message: 'Commissioner not found' },
        { status: 404 }
      );
    }

    // Default league settings
    const defaultSettings = {
      maxTeams,
      playoffTeams: Math.floor(maxTeams / 2),
      playoffWeeks: 3,
      regularSeasonWeeks: 14,
      tradeDeadline: 12,
      waiverPeriod: 1,
      faabBudget: 1000,
      ...settings
    };

    // Default scoring settings (PPR)
    const defaultScoringSettings = {
      passingYards: 0.04,
      passingTouchdowns: 4,
      interceptions: -2,
      rushingYards: 0.1,
      rushingTouchdowns: 6,
      receivingYards: 0.1,
      receivingTouchdowns: 6,
      receptions: 1, // PPR
      fumbles: -2,
      kickingXP: 1,
      kickingFG: 3,
      kickingMissedFG: -1,
      defensePointsAllowed: 10,
      defenseTouchdowns: 6,
      defenseSacks: 1,
      defenseInterceptions: 2,
      defenseFumbles: 2,
      defenseBlocks: 2,
      defenseSafeties: 2,
      ...scoringSettings
    };

    // Default roster settings
    const defaultRosterSettings = {
      qb: 1,
      rb: 2,
      wr: 2,
      te: 1,
      flex: 1,
      k: 1,
      def: 1,
      bench: 6,
      ir: 1,
      ...rosterSettings
    };

    // Create the league
    const league = await prisma.league.create({
      data: {
        name,
        season,
        commissionerId,
        draftDate: draftDate ? new Date(draftDate) : null,
        settings: defaultSettings,
        scoringSettings: defaultScoringSettings,
        rosterSettings: defaultRosterSettings,
        currentWeek: 1,
        isActive: true,
        playoffs: false
      },
      include: {
        commissioner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create commissioner's team
    await prisma.team.create({
      data: {
        name: `${commissioner.name}'s Team`,
        ownerId: commissionerId,
        leagueId: league.id,
        standing: 1,
        waiverPriority: 1
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: league.id,
        name: league.name,
        season: league.season,
        commissioner: league.commissioner,
        settings: league.settings,
        scoringSettings: league.scoringSettings,
        rosterSettings: league.rosterSettings,
        currentWeek: league.currentWeek,
        isActive: league.isActive,
        draftDate: league.draftDate,
        createdAt: league.createdAt
      },
      message: 'League created successfully'
    });

  } catch (error) {
    console.error('Error creating league:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create league' },
      { status: 500 }
    );
  }
}