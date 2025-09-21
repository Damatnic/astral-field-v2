import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teams: {
          include: {
            league: {
              select: {
                id: true,
                name: true,
                season: true,
                leagueType: true,
                scoringType: true
              }
            },
            roster: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    team: true,
                    projections: {
                      where: {
                        week: {
                          gte: 1,
                          lte: 18
                        }
                      },
                      orderBy: { week: 'desc' },
                      take: 1
                    },
                    stats: {
                      where: {
                        week: {
                          gte: 1,
                          lte: 18
                        }
                      },
                      orderBy: { week: 'desc' },
                      take: 5
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamsWithStats = user.teams.map(team => {
      const totalProjectedPoints = team.roster.reduce((total, rosterPlayer) => {
        const latestProjection = rosterPlayer.player.projections[0];
        return total + (latestProjection?.projectedPoints?.toNumber() || 0);
      }, 0);

      const totalActualPoints = team.roster.reduce((total, rosterPlayer) => {
        const latestStats = rosterPlayer.player.stats[0];
        return total + (latestStats?.fantasyPoints?.toNumber() || 0);
      }, 0);

      return {
        ...team,
        stats: {
          totalProjectedPoints,
          totalActualPoints,
          rosterCount: team.roster.length,
          activePlayersCount: team.roster.filter(rp => rp.position !== 'BENCH').length
        }
      };
    });

    return NextResponse.json({ teams: teamsWithStats });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}