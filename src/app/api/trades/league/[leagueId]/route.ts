import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const leagueId = params.leagueId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    // Get all teams in the league
    const teams = await prisma.team.findMany({
      where: { leagueId },
      select: { id: true, name: true }
    });

    if (teams.length === 0) {
      return NextResponse.json({
        success: true,
        trades: [],
        count: 0
      });
    }

    const teamIds = teams.map(t => t.id);
    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Build where clause for trades
    const where: any = {
      OR: [
        { proposingTeamId: { in: teamIds } },
        { receivingTeamId: { in: teamIds } }
      ]
    };

    if (status !== 'all') {
      where.status = status;
    }

    // Get all trade proposals
    const trades = await prisma.tradeProposal.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Get all unique player IDs
    const allPlayerIds = trades.flatMap(t => [
      ...t.givingPlayerIds,
      ...t.receivingPlayerIds
    ]);
    const uniquePlayerIds = [...new Set(allPlayerIds)];

    // Get all players at once
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
      proposingTeam: teamMap.get(trade.proposingTeamId) || { id: trade.proposingTeamId, name: 'Unknown' },
      receivingTeam: teamMap.get(trade.receivingTeamId) || { id: trade.receivingTeamId, name: 'Unknown' },
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
      count: formattedTrades.length,
      league: {
        id: leagueId,
        teamCount: teams.length
      }
    });

  } catch (error) {
    console.error('Error fetching league trades:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}