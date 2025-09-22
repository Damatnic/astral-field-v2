import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await authenticateFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: currentUser.id },
      include: {
        league: {
          select: {
            id: true,
            currentWeek: true,
            season: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({
        success: false,
        message: 'No team found for user'
      }, { status: 404 });
    }

    // Get current week's matchup
    const matchup = await prisma.matchup.findFirst({
      where: {
        leagueId: team.leagueId,
        week: team.league.currentWeek,
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
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
    });

    if (!matchup) {
      return NextResponse.json({
        success: true,
        data: {
          opponent: null,
          projectedScore: { user: 0, opponent: 0 },
          winProbability: 50
        }
      });
    }

    // Determine opponent
    const isHome = matchup.homeTeamId === team.id;
    const opponent = isHome ? matchup.awayTeam : matchup.homeTeam;
    const userScore = isHome ? matchup.homeScore : matchup.awayScore;
    const opponentScore = isHome ? matchup.awayScore : matchup.homeScore;

    return NextResponse.json({
      success: true,
      data: {
        opponent: {
          name: opponent.owner.name || opponent.name,
          avatar: opponent.owner.avatar || "🏈",
          wins: opponent.wins,
          losses: opponent.losses,
          rank: opponent.standing
        },
        projectedScore: {
          user: Number(userScore),
          opponent: Number(opponentScore)
        },
        winProbability: userScore > opponentScore ? 75 : userScore < opponentScore ? 25 : 50,
        matchup: {
          week: matchup.week,
          isComplete: matchup.isComplete,
          isPlayoff: matchup.isPlayoff
        }
      }
    });

  } catch (error) {
    console.error('Error fetching my matchup:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch matchup data'
    }, { status: 500 });
  }
}