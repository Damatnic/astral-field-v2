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

    const draftId = params.id;
    const leagueId = draftId.replace('draft-', '');

    // Get league and verify access
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            owner: {
              select: { id: true, name: true }
            },
            roster: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true
                  }
                }
              }
            }
          },
          orderBy: { waiverPriority: 'asc' }
        }
      }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Check if user has access to this league
    const hasAccess = league.teams.some(team => team.ownerId === session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get available players (not on any roster in this league)
    const draftedPlayerIds = league.teams.flatMap(team => 
      team.roster.map(r => r.playerId)
    );

    const availablePlayers = await prisma.player.findMany({
      where: {
        id: { notIn: draftedPlayerIds },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true,
        stats: {
          where: { week: { gte: 1, lte: 18 } },
          orderBy: { week: 'desc' },
          take: 1,
          select: {
            fantasyPoints: true
          }
        },
        projections: {
          where: { week: { gte: 1, lte: 18 } },
          orderBy: { week: 'desc' },
          take: 1,
          select: {
            projectedPoints: true
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { name: 'asc' }
      ]
    });

    // Calculate draft order and current pick
    const totalTeams = league.teams.length;
    const totalPicks = league.teams.reduce((sum, team) => sum + team.roster.length, 0);
    const currentRound = Math.floor(totalPicks / totalTeams) + 1;
    const pickInRound = (totalPicks % totalTeams) + 1;
    
    // Snake draft logic
    let currentTeamIndex;
    if (currentRound % 2 === 1) {
      // Odd round - normal order
      currentTeamIndex = pickInRound - 1;
    } else {
      // Even round - reverse order
      currentTeamIndex = totalTeams - pickInRound;
    }

    const draftBoard = {
      draftId: draftId,
      leagueId: leagueId,
      leagueName: league.name,
      status: totalPicks >= (totalTeams * 16) ? 'completed' : 'active',
      currentRound: currentRound,
      currentPick: totalPicks + 1,
      pickInRound: pickInRound,
      currentTeam: league.teams[currentTeamIndex] || null,
      teams: league.teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        ownerName: team.owner.name,
        draftOrder: index + 1,
        picks: team.roster.map(r => ({
          playerId: r.player.id,
          playerName: r.player.name,
          position: r.player.position,
          nflTeam: r.player.nflTeam,
          pickNumber: null, // Would need to calculate based on draft order
          round: null
        }))
      })),
      availablePlayers: availablePlayers.map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        lastWeekPoints: player.stats[0]?.fantasyPoints || 0,
        projectedPoints: player.projections[0]?.projectedPoints || 0
      })),
      draftSettings: {
        rounds: 16,
        timePerPick: 90,
        draftType: 'snake'
      }
    };

    return NextResponse.json({
      success: true,
      data: draftBoard
    });

  } catch (error) {
    console.error('Error fetching draft board:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch draft board'
    }, { status: 500 });
  }
}