import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userTeams = await prisma.team.findMany({
      where: { ownerId: session.user.id },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            leagueType: true
          }
        },
        roster: {
          include: {
            player: {
              include: {
                stats: {
                  where: { week: 3 },
                  take: 1
                },
                projections: {
                  where: { week: 3 },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (userTeams.length === 0) {
      return NextResponse.json({
        teams: [],
        totalLeagues: 0,
        averageScore: 0,
        weeklyPerformance: [],
        recentActivity: []
      });
    }

    const currentWeek = 3;
    
    const dashboardData = await Promise.all(userTeams.map(async (team) => {
      const currentMatchup = await prisma.matchup.findFirst({
        where: {
          week: currentWeek,
          OR: [
            { homeTeamId: team.id },
            { awayTeamId: team.id }
          ]
        },
        include: {
          homeTeam: { include: { owner: { select: { name: true } } } },
          awayTeam: { include: { owner: { select: { name: true } } } }
        }
      });

      const weeklyStats = await prisma.matchup.findMany({
        where: {
          OR: [
            { homeTeamId: team.id },
            { awayTeamId: team.id }
          ],
          week: { gte: 1, lte: currentWeek }
        },
        orderBy: { week: 'asc' }
      });

      const teamScore = team.roster.reduce((total, rp) => {
        const stats = rp.player.stats[0];
        return total + (stats?.fantasyPoints?.toNumber() || 0);
      }, 0);

      const opponentTeam = currentMatchup ? 
        (currentMatchup.homeTeamId === team.id ? currentMatchup.awayTeam : currentMatchup.homeTeam) : null;

      return {
        teamId: team.id,
        teamName: team.name,
        league: team.league,
        record: {
          wins: team.wins,
          losses: team.losses,
          ties: team.ties || 0
        },
        currentScore: teamScore,
        projectedScore: team.roster.reduce((total, rp) => {
          const projection = rp.player.projections[0];
          return total + (projection?.projectedPoints?.toNumber() || 0);
        }, 0),
        opponent: opponentTeam ? {
          name: opponentTeam.owner.name,
          teamName: opponentTeam.name
        } : null,
        weeklyPerformance: weeklyStats.map(matchup => ({
          week: matchup.week,
          points: matchup.homeTeamId === team.id ? 
            matchup.homeScore?.toNumber() || 0 : 
            matchup.awayScore?.toNumber() || 0
        }))
      };
    }));

    const recentTrades = await prisma.trade.findMany({
      where: {
        OR: [
          { proposingTeamId: { in: userTeams.map(t => t.id) } },
          { receivingTeamId: { in: userTeams.map(t => t.id) } }
        ]
      },
      include: {
        proposingTeam: { select: { name: true } },
        receivingTeam: { select: { name: true } },
        tradeItems: {
          include: { player: { select: { name: true, position: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const recentActivity = recentTrades.map(trade => ({
      id: trade.id,
      type: 'trade',
      description: `Trade ${trade.status.toLowerCase()} between ${trade.proposingTeam.name} and ${trade.receivingTeam.name}`,
      timestamp: trade.createdAt,
      status: trade.status
    }));

    const averageScore = dashboardData.length > 0 
      ? dashboardData.reduce((sum, team) => sum + team.currentScore, 0) / dashboardData.length 
      : 0;

    return NextResponse.json({
      success: true,
      teams: dashboardData,
      totalLeagues: userTeams.length,
      averageScore,
      recentActivity,
      currentWeek
    });
    
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}