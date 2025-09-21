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
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const userTeams = await prisma.team.findMany({
      where: { ownerId: session.user.id }
    });
    
    if (userTeams.length === 0) {
      return NextResponse.json({ trades: [], teamIds: [] });
    }

    const teamIds = userTeams.map(t => t.id);
    const leagueIds = userTeams.map(t => t.leagueId);
    
    const where: any = {
      OR: [
        { proposingTeamId: { in: teamIds } },
        { receivingTeamId: { in: teamIds } },
        { leagueId: { in: leagueIds } }
      ]
    };
    
    if (status) {
      where.status = status;
    }
    
    const trades = await prisma.trade.findMany({
      where,
      include: {
        proposingTeam: {
          include: { owner: true }
        },
        receivingTeam: {
          include: { owner: true }
        },
        league: {
          select: { id: true, name: true }
        },
        tradeItems: {
          include: {
            player: true,
            draftPick: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    const formattedTrades = trades.map(trade => ({
      id: trade.id,
      status: trade.status,
      proposingTeam: {
        id: trade.proposingTeamId,
        name: trade.proposingTeam.name,
        owner: trade.proposingTeam.owner.name
      },
      receivingTeam: {
        id: trade.receivingTeamId,
        name: trade.receivingTeam.name,
        owner: trade.receivingTeam.owner.name
      },
      league: trade.league,
      items: {
        proposingTeamGives: trade.tradeItems
          .filter(item => item.fromTeamId === trade.proposingTeamId)
          .map(item => ({
            type: item.type,
            player: item.player ? {
              id: item.player.id,
              name: item.player.name,
              position: item.player.position,
              team: item.player.team
            } : null,
            draftPick: item.draftPick ? {
              year: item.draftPick.year,
              round: item.draftPick.round,
              originalTeam: item.draftPick.originalTeam
            } : null
          })),
        receivingTeamGives: trade.tradeItems
          .filter(item => item.fromTeamId === trade.receivingTeamId)
          .map(item => ({
            type: item.type,
            player: item.player ? {
              id: item.player.id,
              name: item.player.name,
              position: item.player.position,
              team: item.player.team
            } : null,
            draftPick: item.draftPick ? {
              year: item.draftPick.year,
              round: item.draftPick.round,
              originalTeam: item.draftPick.originalTeam
            } : null
          }))
      },
      proposedAt: trade.createdAt,
      expiresAt: trade.expiresAt,
      processedAt: trade.processedAt,
      notes: trade.notes,
      analysis: trade.analysis,
      isMyProposal: teamIds.includes(trade.proposingTeamId),
      isMyTrade: teamIds.includes(trade.proposingTeamId) || teamIds.includes(trade.receivingTeamId)
    }));
    
    return NextResponse.json({
      success: true,
      trades: formattedTrades,
      teamIds
    });
    
  } catch (error) {
    console.error('Trades fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      proposingTeamId,
      receivingTeamId,
      proposingTeamGives,
      receivingTeamGives,
      notes
    } = await request.json();

    const proposingTeam = await prisma.team.findUnique({
      where: { id: proposingTeamId },
      include: { league: true }
    });

    if (!proposingTeam || proposingTeam.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid proposing team' }, { status: 400 });
    }

    const receivingTeam = await prisma.team.findUnique({
      where: { id: receivingTeamId }
    });

    if (!receivingTeam || receivingTeam.leagueId !== proposingTeam.leagueId) {
      return NextResponse.json({ error: 'Invalid receiving team' }, { status: 400 });
    }

    const trade = await prisma.$transaction(async (tx) => {
      const newTrade = await tx.trade.create({
        data: {
          proposingTeamId,
          receivingTeamId,
          leagueId: proposingTeam.leagueId,
          status: 'PENDING',
          notes: notes || '',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      const allItems = [
        ...proposingTeamGives.map((item: any) => ({
          ...item,
          fromTeamId: proposingTeamId,
          toTeamId: receivingTeamId
        })),
        ...receivingTeamGives.map((item: any) => ({
          ...item,
          fromTeamId: receivingTeamId,
          toTeamId: proposingTeamId
        }))
      ];

      for (const item of allItems) {
        await tx.tradeItem.create({
          data: {
            tradeId: newTrade.id,
            fromTeamId: item.fromTeamId,
            toTeamId: item.toTeamId,
            type: item.type,
            playerId: item.playerId || null,
            draftPickId: item.draftPickId || null
          }
        });
      }

      return newTrade;
    });

    return NextResponse.json({
      success: true,
      trade: { id: trade.id },
      message: 'Trade proposal created successfully'
    });
    
  } catch (error) {
    console.error('Trade creation error:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}