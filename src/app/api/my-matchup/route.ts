import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';
import { handleComponentError } from '@/lib/error-handling';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';


// GET /api/my-matchup - Get current user's matchup for current week
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user's team
    const userTeam = await prisma.team.findFirst({
      where: { ownerId: user.id },
      include: { league: true }
    });

    if (!userTeam) {
      return NextResponse.json(
        { success: false, message: 'No team found for current user' },
        { status: 404 }
      );
    }

    const currentWeek = userTeam.league.currentWeek;

    if (!currentWeek) {
      return NextResponse.json(
        { success: false, message: 'League current week not set' },
        { status: 404 }
      );
    }

    // Find user's matchup for current week
    const matchup = await prisma.matchup.findFirst({
      where: {
        week: currentWeek,
        OR: [
          { homeTeamId: userTeam.id },
          { awayTeamId: userTeam.id }
        ]
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
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
        awayTeam: {
          select: {
            id: true,
            name: true,
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
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true
          }
        }
      }
    });

    if (!matchup) {
      return NextResponse.json(
        { success: false, message: 'No matchup found for current week' },
        { status: 404 }
      );
    }

    // Determine user's team and opponent
    const isHome = matchup.homeTeam.id === userTeam.id;
    const userMatchupTeam = isHome ? matchup.homeTeam : matchup.awayTeam;
    const opponentTeam = isHome ? matchup.awayTeam : matchup.homeTeam;
    const userScore = isHome ? matchup.homeScore : matchup.awayScore;
    const opponentScore = isHome ? matchup.awayScore : matchup.homeScore;

    // Calculate actual projected scores from player projections
    const userRoster = await prisma.rosterPlayer.findMany({
      where: { 
        teamId: userMatchupTeam.id,
        position: { notIn: ['BENCH', 'IR'] }
      },
      include: {
        player: {
          include: {
            projections: {
              where: {
                week: currentWeek,
                season: matchup.league.season
              }
            }
          }
        }
      }
    });

    const opponentRoster = await prisma.rosterPlayer.findMany({
      where: { 
        teamId: opponentTeam.id,
        position: { notIn: ['BENCH', 'IR'] }
      },
      include: {
        player: {
          include: {
            projections: {
              where: {
                week: currentWeek,
                season: matchup.league.season
              }
            }
          }
        }
      }
    });

    // Calculate projected points for each team
    const userProjected = userRoster.reduce((total, rp) => {
      const projection = rp.player.projections[0];
      return total + (projection?.projectedPoints?.toNumber() || 0);
    }, 0);

    const opponentProjected = opponentRoster.reduce((total, rp) => {
      const projection = rp.player.projections[0];
      return total + (projection?.projectedPoints?.toNumber() || 0);
    }, 0);

    const matchupData = {
      id: matchup.id,
      week: matchup.week,
      status: matchup.isComplete ? 'completed' : 'upcoming',
      userTeam: {
        ...userMatchupTeam,
        score: userScore || 0,
        isHome
      },
      opponent: {
        ...opponentTeam,
        score: opponentScore || 0,
        isHome: !isHome
      },
      league: matchup.league,
      // Use real projected scores from player projections
      projections: {
        userProjected: Math.round(userProjected * 100) / 100,
        opponentProjected: Math.round(opponentProjected * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: matchupData
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}