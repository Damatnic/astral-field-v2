import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/team - Get current user's team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get team either by ID or user's ownership
    const team = teamId 
      ? await prisma.team.findUnique({
          where: { id: teamId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            roster: {
              include: {
                player: true
              }
            },
            league: {
              select: {
                id: true,
                name: true,
                season: true,
                currentWeek: true
              }
            }
          }
        })
      : await prisma.team.findFirst({
          where: { ownerId: session.userId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            roster: {
              include: {
                player: true
              }
            },
            league: {
              select: {
                id: true,
                name: true,
                season: true,
                currentWeek: true
              }
            }
          }
        });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Calculate team stats
    const totalPoints = Number(team.pointsFor);
    const totalPointsAgainst = Number(team.pointsAgainst);
    const gamesPlayed = team.wins + team.losses + team.ties;
    const avgPointsFor = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
    const avgPointsAgainst = gamesPlayed > 0 ? totalPointsAgainst / gamesPlayed : 0;
    
    // Get current week lineup
    const currentLineup = team.roster.filter(r => r.position !== 'BENCH');
    const benchPlayers = team.roster.filter(r => r.position === 'BENCH');
    
    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        owner: team.owner,
        league: team.league,
        record: {
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          winPercentage: gamesPlayed > 0 ? team.wins / gamesPlayed : 0
        },
        points: {
          totalFor: totalPoints,
          totalAgainst: totalPointsAgainst,
          avgFor: avgPointsFor,
          avgAgainst: avgPointsAgainst,
          differential: totalPoints - totalPointsAgainst
        },
        waiverPriority: team.waiverPriority,
        faab: {
          budget: team.faabBudget,
          spent: team.faabSpent,
          remaining: team.faabBudget - team.faabSpent
        },
        roster: {
          total: team.roster.length,
          starters: currentLineup.length,
          bench: benchPlayers.length,
          players: team.roster.map(rp => ({
            id: rp.playerId,
            name: rp.player.name,
            position: rp.player.position,
            team: rp.player.nflTeam,
            rosterSlot: rp.position,
            status: rp.player.status,
            acquisitionType: rp.acquisitionType,
            acquisitionDate: rp.acquisitionDate,
            recentStats: []
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('Team fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}