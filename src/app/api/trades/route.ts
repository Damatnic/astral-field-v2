import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/trades - Get trades for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    
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
    
    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: session.userId }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Build query conditions based on actual schema
    const where: any = {
      leagueId: team.leagueId // Get all trades in this league
    };
    
    if (status) {
      where.status = status;
    }
    
    // Get trades
    const trades = await prisma.trade.findMany({
      where,
      include: {
        proposer: true,
        team: {
          include: { owner: true }
        },
        items: {
          include: {
            player: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
    
    // Format trades for response
    const formattedTrades = trades.map(trade => ({
      id: trade.id,
      status: trade.status,
      proposer: {
        userId: trade.proposerId,
        userName: trade.proposer.name,
        teamId: trade.teamId,
        teamName: trade.team?.name || 'Unknown'
      },
      items: trade.items.map(item => ({
        fromTeamId: item.fromTeamId,
        toTeamId: item.toTeamId,
        player: item.player ? {
          id: item.playerId,
          name: item.player.name,
          position: item.player.position,
          team: item.player.nflTeam
        } : null,
        itemType: item.itemType
      })),
      proposedAt: trade.createdAt,
      expiresAt: trade.expiresAt,
      processedAt: trade.processedAt,
      isMyTrade: trade.proposerId === session.userId,
      notes: trade.notes
    }));
    
    return NextResponse.json({
      success: true,
      trades: formattedTrades,
      teamId: team.id
    });
    
  } catch (error) {
    console.error('Trades fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}