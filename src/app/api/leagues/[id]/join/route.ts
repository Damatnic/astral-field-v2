import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get current user from session
    const currentUser = await authenticateFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const leagueId = params.id;
    const body = await request.json();
    const { teamName } = body;

    if (!teamName) {
      return NextResponse.json({
        success: false,
        message: 'Team name is required'
      }, { status: 400 });
    }

    // Check if league exists and is active
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: true,
        _count: {
          select: { teams: true }
        }
      }
    });

    if (!league) {
      return NextResponse.json({
        success: false,
        message: 'League not found'
      }, { status: 404 });
    }

    if (!league.isActive) {
      return NextResponse.json({
        success: false,
        message: 'League is not accepting new members'
      }, { status: 400 });
    }

    // Check if user already has a team in this league
    const existingTeam = await prisma.team.findFirst({
      where: {
        leagueId,
        ownerId: currentUser.id
      }
    });

    if (existingTeam) {
      return NextResponse.json({
        success: false,
        message: 'You already have a team in this league'
      }, { status: 400 });
    }

    // Get league settings to check max teams
    const settings = league.settings as any;
    const maxTeams = settings?.maxTeams || 10;

    if (league._count.teams >= maxTeams) {
      return NextResponse.json({
        success: false,
        message: 'League is full'
      }, { status: 400 });
    }

    // Check if team name is already taken
    const existingTeamName = await prisma.team.findFirst({
      where: {
        leagueId,
        name: teamName
      }
    });

    if (existingTeamName) {
      return NextResponse.json({
        success: false,
        message: 'Team name is already taken'
      }, { status: 400 });
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        name: teamName,
        ownerId: currentUser.id,
        leagueId,
        standing: league._count.teams + 1,
        waiverPriority: league._count.teams + 1
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            season: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          owner: team.owner,
          league: team.league,
          standing: team.standing,
          waiverPriority: team.waiverPriority
        }
      },
      message: 'Successfully joined league'
    });

  } catch (error) {
    console.error('Error joining league:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to join league'
    }, { status: 500 });
  }
}