import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { handleComponentError } from '@/lib/error-handling';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/my-matchup - Get current user's matchup for current week
export async function GET() {
  try {
    const user = await getCurrentUser();
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
      // Calculate projected scores (mock data for now)
      projections: {
        userProjected: 124.5,
        opponentProjected: 118.2
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