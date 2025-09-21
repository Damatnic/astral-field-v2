import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status') || 'all';

    // Build where clause
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get trades based on filters
    if (teamId) {
      // Get trades for a specific team
      where.OR = [
        { proposingTeamId: teamId },
        { receivingTeamId: teamId }
      ];
    } else if (leagueId) {
      // Get all trades for a league
      const teams = await prisma.team.findMany({
        where: { leagueId },
        select: { id: true }
      });
      const teamIds = teams.map(t => t.id);
      
      where.OR = [
        { proposingTeamId: { in: teamIds } },
        { receivingTeamId: { in: teamIds } }
      ];
    }

    const trades = await prisma.tradeProposal.findMany({
      where,
      include: {
        proposingTeam: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get receiving teams separately
    const receivingTeamIds = [...new Set(trades.map(t => t.receivingTeamId))];
    const receivingTeams = await prisma.team.findMany({
      where: { id: { in: receivingTeamIds } },
      select: { id: true, name: true, ownerId: true }
    });
    const receivingTeamMap = new Map(receivingTeams.map(t => [t.id, t]));

    // Get all player IDs
    const allPlayerIds = trades.flatMap(t => [
      ...(t.givingPlayerIds || []),
      ...(t.receivingPlayerIds || [])
    ]);
    const uniquePlayerIds = [...new Set(allPlayerIds)];

    // Get all players
    const players = await prisma.player.findMany({
      where: { id: { in: uniquePlayerIds } },
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true,
        status: true
      }
    });
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Format trades with all data
    const formattedTrades = trades.map(trade => ({
      id: trade.id,
      status: trade.status,
      message: trade.message,
      createdAt: trade.createdAt,
      respondedAt: trade.respondedAt,
      proposingTeam: {
        id: trade.proposingTeam.id,
        name: trade.proposingTeam.name
      },
      receivingTeam: {
        id: trade.receivingTeamId,
        name: receivingTeamMap.get(trade.receivingTeamId)?.name || 'Unknown'
      },
      givingPlayers: trade.givingPlayerIds
        .map(id => playerMap.get(id))
        .filter(p => p !== undefined),
      receivingPlayers: trade.receivingPlayerIds
        .map(id => playerMap.get(id))
        .filter(p => p !== undefined)
    }));

    return NextResponse.json({
      success: true,
      trades: formattedTrades,
      count: formattedTrades.length
    });

  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}