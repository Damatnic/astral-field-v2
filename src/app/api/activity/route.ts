import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/activity - Get league activity feed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter'); // trades, waivers, lineup, all
    
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
    
    // Get user's league if not specified
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    // Build activity feed from multiple sources
    const activities: any[] = [];
    
    // Get trades
    if (!filter || filter === 'all' || filter === 'trades') {
      const trades = await prisma.trade.findMany({
        where: { leagueId: targetLeagueId },
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
        orderBy: { createdAt: 'desc' },
        take: filter === 'trades' ? limit : 10,
        skip: filter === 'trades' ? offset : 0
      });
      
      trades.forEach(trade => {
        activities.push({
          id: `trade-${trade.id}`,
          type: 'TRADE',
          timestamp: trade.createdAt,
          title: getTradeTitle(trade.status),
          description: getTradeDescription(trade),
          participants: [
            trade.proposer.name,
            trade.team?.owner.name || 'Unknown'
          ].filter(Boolean),
          status: trade.status,
          metadata: {
            tradeId: trade.id,
            playerCount: trade.items.filter(i => i.playerId).length
          }
        });
      });
    }
    
    // Get waiver claims
    if (!filter || filter === 'all' || filter === 'waivers') {
      const waivers = await prisma.waiverClaim.findMany({
        where: {
          team: {
            leagueId: targetLeagueId
          },
          status: 'SUCCESSFUL'
        },
        include: {
          team: {
            include: { owner: true }
          },
          player: true
        },
        orderBy: { processedAt: 'desc' },
        take: filter === 'waivers' ? limit : 10,
        skip: filter === 'waivers' ? offset : 0
      });
      
      waivers.forEach(waiver => {
        activities.push({
          id: `waiver-${waiver.id}`,
          type: 'WAIVER',
          timestamp: waiver.processedAt,
          title: 'Waiver Claim Processed',
          description: getWaiverDescription(waiver),
          participants: [waiver.team.owner.name],
          status: 'SUCCESSFUL',
          metadata: {
            playerId: waiver.playerId,
            playerName: waiver.player.name,
            dropPlayerId: waiver.dropPlayerId,
            dropPlayerName: null, // Would need separate query for dropPlayer name
            bidAmount: waiver.bidAmount
          }
        });
      });
    }
    
    // Get lineup changes
    if (!filter || filter === 'all' || filter === 'lineup') {
      const lineupChanges = await prisma.auditLog.findMany({
        where: {
          leagueId: targetLeagueId,
          action: 'LINEUP_UPDATED'
        },
        orderBy: { createdAt: 'desc' },
        take: filter === 'lineup' ? limit : 10,
        skip: filter === 'lineup' ? offset : 0
      });
      
      // Get user names for lineup changes
      const userIds = lineupChanges.map(log => log.userId).filter(Boolean);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds as string[] } },
        select: { id: true, name: true }
      });
      const userMap = new Map(users.map(u => [u.id, u.name]));
      
      lineupChanges.forEach(log => {
        const data = log.after as any;
        const userName = log.userId ? (userMap.get(log.userId) || 'Unknown') : 'Unknown';
        activities.push({
          id: `lineup-${log.id}`,
          type: 'LINEUP',
          timestamp: log.createdAt,
          title: 'Lineup Updated',
          description: `${userName} updated their lineup`,
          participants: [userName],
          status: 'COMPLETED',
          metadata: {
            changes: data?.changes || 0,
            week: data?.week
          }
        });
      });
    }
    
    // Get draft picks (if draft is active)
    const activeDraft = await prisma.draft.findFirst({
      where: {
        leagueId: targetLeagueId,
        status: 'IN_PROGRESS'
      }
    });
    
    if (activeDraft) {
      const recentPicks = await prisma.draftPick.findMany({
        where: { draftId: activeDraft.id },
        include: {
          team: {
            include: { owner: true }
          },
          player: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      recentPicks.forEach(pick => {
        activities.push({
          id: `draft-${pick.id}`,
          type: 'DRAFT',
          timestamp: pick.createdAt,
          title: 'Draft Pick',
          description: `${pick.team.owner.name} selected ${pick.player.name} (${pick.player.position})`,
          participants: [pick.team.owner.name],
          status: 'COMPLETED',
          metadata: {
            round: pick.round,
            pick: pick.pick,
            playerId: pick.playerId,
            playerName: pick.player.name,
            position: pick.player.position
          }
        });
      });
    }
    
    // Get matchup results
    const recentMatchups = await prisma.matchup.findMany({
      where: {
        leagueId: targetLeagueId,
        isComplete: true
      },
      include: {
        homeTeam: {
          include: { owner: true }
        },
        awayTeam: {
          include: { owner: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });
    
    recentMatchups.forEach(matchup => {
      const homeScore = Number(matchup.homeScore);
      const awayScore = Number(matchup.awayScore);
      const winner = homeScore > awayScore ? matchup.homeTeam : matchup.awayTeam;
      const loser = homeScore > awayScore ? matchup.awayTeam : matchup.homeTeam;
      
      activities.push({
        id: `matchup-${matchup.id}`,
        type: 'MATCHUP',
        timestamp: matchup.updatedAt,
        title: 'Matchup Complete',
        description: `${winner.owner.name} defeated ${loser.owner.name} ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}`,
        participants: [
          matchup.homeTeam.owner.name,
          matchup.awayTeam.owner.name
        ],
        status: 'COMPLETED',
        metadata: {
          week: matchup.week,
          homeScore,
          awayScore,
          isPlayoffs: matchup.week >= 15 // Calculate based on week
        }
      });
    });
    
    // Sort all activities by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination if not filtering
    const paginatedActivities = filter 
      ? activities 
      : activities.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        total: activities.length,
        hasMore: offset + limit < activities.length
      }
    });
    
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}

function getTradeTitle(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Trade Proposed';
    case 'ACCEPTED':
      return 'Trade Accepted';
    case 'REJECTED':
      return 'Trade Rejected';
    case 'VETOED':
      return 'Trade Vetoed';
    case 'EXPIRED':
      return 'Trade Expired';
    default:
      return 'Trade Activity';
  }
}

function getTradeDescription(trade: any): string {
  const user1 = trade.proposer.name;
  const user2 = trade.team?.owner.name || 'Unknown';
  const playerCount = trade.items.filter((i: any) => i.playerId).length;
  
  if (trade.status === 'PENDING') {
    return `${user1} proposed a trade with ${user2} involving ${playerCount} player${playerCount !== 1 ? 's' : ''}`;
  } else if (trade.status === 'ACCEPTED') {
    return `Trade between ${user1} and ${user2} completed (${playerCount} player${playerCount !== 1 ? 's' : ''})`;
  } else if (trade.status === 'REJECTED') {
    return `${user2} rejected trade proposal from ${user1}`;
  } else if (trade.status === 'VETOED') {
    return `Commissioner vetoed trade between ${user1} and ${user2}`;
  }
  
  return `Trade activity between ${user1} and ${user2}`;
}

function getWaiverDescription(waiver: any): string {
  const team = waiver.team.owner.name;
  const player = waiver.player.name;
  
  if (waiver.dropPlayerId) {
    return `${team} claimed ${player} and dropped a player${waiver.bidAmount > 0 ? ` ($${waiver.bidAmount} FAAB)` : ''}`;
  }
  
  return `${team} claimed ${player}${waiver.bidAmount > 0 ? ` ($${waiver.bidAmount} FAAB)` : ''}`;
}