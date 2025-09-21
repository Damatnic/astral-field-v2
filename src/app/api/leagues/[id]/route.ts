import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leagueId = params.id;

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        commissioner: {
          select: { id: true, name: true, email: true, image: true }
        },
        teams: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, image: true }
            },
            roster: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    team: true,
                    status: true,
                    byeWeek: true
                  }
                }
              }
            }
          },
          orderBy: { pointsFor: 'desc' }
        },
        matchups: {
          where: { week: 3 },
          include: {
            homeTeam: {
              include: { owner: { select: { id: true, name: true, image: true } } }
            },
            awayTeam: {
              include: { owner: { select: { id: true, name: true, image: true } } }
            }
          }
        }
      }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const userTeam = league.teams.find(team => team.ownerId === session.user.id);
    if (!userTeam) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const transformedLeague = {
      ...league,
      teamCount: league.teams.length,
      teams: league.teams.map((team, index) => ({
        ...team,
        record: {
          wins: team.wins,
          losses: team.losses,
          ties: team.ties || 0,
          percentage: team.wins + team.losses > 0 
            ? team.wins / (team.wins + team.losses)
            : 0
        },
        standings: {
          rank: index + 1,
          pointsFor: team.pointsFor?.toNumber() || 0,
          pointsAgainst: team.pointsAgainst?.toNumber() || 0,
          streak: calculateStreak(team)
        }
      }))
    };

    return NextResponse.json({
      success: true,
      data: transformedLeague
    });
  } catch (error) {
    console.error('League fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch league' }, { status: 500 });
  }
}

function calculateStreak(team: { wins: number; losses: number; ties?: number }): string {
  if (team.wins > team.losses) {
    return `W${Math.min(team.wins, 3)}`;
  } else if (team.losses > team.wins) {
    return `L${Math.min(team.losses, 3)}`;
  } else {
    return 'T1';
  }
}