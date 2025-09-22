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

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const week = searchParams.get('week');
    const season = searchParams.get('season') || '2025';

    if (!teamId) {
      return NextResponse.json({
        success: false,
        message: 'Team ID is required'
      }, { status: 400 });
    }

    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: { 
        id: teamId,
        ownerId: session.user.id 
      }
    });

    if (!team) {
      return NextResponse.json({
        success: false,
        message: 'Team not found or access denied'
      }, { status: 404 });
    }

    let whereClause: any = {
      teamId: teamId
    };

    // Filter by week if specified
    if (week) {
      whereClause.week = parseInt(week);
    }

    // Get lineup history using PlayerStats as a proxy for historical lineups
    const lineupHistory = await prisma.playerStats.findMany({
      where: {
        week: whereClause.week || { gte: 1, lte: 18 },
        player: {
          roster: {
            some: {
              teamId: teamId
            }
          }
        }
      },
      include: {
        player: {
          include: {
            roster: {
              where: { teamId: teamId }
            }
          }
        }
      },
      orderBy: [
        { week: 'desc' },
        { fantasyPoints: 'desc' }
      ]
    });

    // Group by week
    const historyByWeek = lineupHistory.reduce((acc, stat) => {
      const weekNum = stat.week;
      if (!acc[weekNum]) {
        acc[weekNum] = {
          week: weekNum,
          totalPoints: 0,
          lineup: [],
          timestamp: new Date()
        };
      }

      const rosterEntry = stat.player.roster[0];
      if (rosterEntry) {
        acc[weekNum].lineup.push({
          playerId: stat.playerId,
          playerName: stat.player.name,
          position: stat.player.position,
          rosterPosition: rosterEntry.position,
          isStarter: rosterEntry.isStarter,
          fantasyPoints: stat.fantasyPoints || 0,
          projectedPoints: 0
        });
        
        if (rosterEntry.isStarter) {
          acc[weekNum].totalPoints += (stat.fantasyPoints || 0);
        }
      }

      return acc;
    }, {} as any);

    // Convert to array and sort
    const history = Object.values(historyByWeek).sort((a: any, b: any) => b.week - a.week);

    // If specific week requested, return just that week
    if (week) {
      const weekData = history.find((h: any) => h.week === parseInt(week));
      return NextResponse.json({
        success: true,
        data: weekData || {
          week: parseInt(week),
          totalPoints: 0,
          lineup: [],
          timestamp: new Date()
        }
      });
    }

    // Return all weeks
    return NextResponse.json({
      success: true,
      data: {
        teamId,
        season,
        history: history,
        totalWeeks: history.length,
        averagePoints: 0
      }
    });

  } catch (error) {
    console.error('Lineup history error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch lineup history'
    }, { status: 500 });
  }
}