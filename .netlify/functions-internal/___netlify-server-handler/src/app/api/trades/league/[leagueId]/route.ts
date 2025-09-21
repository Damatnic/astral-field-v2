import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { PaginatedResponse, EnhancedTrade, TradeStatus } from '@/types/fantasy';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/trades/league/[leagueId] - Get all trades for a league
export async function GET(request: NextRequest, { params }: { params: { leagueId: string } }) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const leagueId = params.leagueId;
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100
    const status = searchParams.get('status') as TradeStatus | null;
    const teamId = searchParams.get('teamId') || null;
    const includeAnalysis = searchParams.get('analysis') === 'true';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : null;

    // Verify user is in the league
    const leagueMember = await prisma.leagueMember.findFirst({
      where: {
        userId: user.id,
        leagueId
      }
    });

    if (!leagueMember) {
      return NextResponse.json(
        { success: false, message: 'User is not a member of this league' },
        { status: 403 }
      );
    }

    // Build where clause
    const whereClause: Record<string, any> = {
      leagueId
    };

    if (status) {
      whereClause.status = status;
    }

    if (teamId) {
      whereClause.items = {
        some: {
          OR: [
            { fromTeamId: teamId },
            { toTeamId: teamId }
          ]
        }
      };
    }

    if (season) {
      whereClause.league = {
        season
      };
    }

    const skip = (page - 1) * limit;

    // Build order by clause
    const orderBy: Record<string, any> = {};
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'processedAt') {
      orderBy[sortBy] = sortOrder;
    } else if (sortBy === 'fairness') {
      // For fairness sorting, we'll need to handle this separately as it requires analysis
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Get trades with all related data
    const [trades, totalCount] = await Promise.all([
      prisma.trade.findMany({
        where: whereClause,
        include: {
          proposer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          team: {
            select: {
              id: true,
              name: true,
              ownerId: true
            }
          },
          league: {
            select: {
              id: true,
              name: true,
              currentWeek: true,
              season: true,
              settings: {
                select: {
                  tradeDeadline: true
                }
              }
            }
          },
          items: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  nflTeam: true,
                  status: true,
                  byeWeek: true
                }
              }
            }
          },
          votes: true
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.trade.count({
        where: whereClause
      })
    ]);

    // Transform trades to enhanced format
    const enhancedTrades: EnhancedTrade[] = await Promise.all(
      trades.map(async (trade: any) => {
        const involvedTeams = await getInvolvedTeams(trade.items);
        const affectedPositions = getAffectedPositions(trade.items);
        const netValues = await calculateNetValues(trade.items);
        const riskLevel = assessRiskLevel(trade.items);
        const timeRemaining = calculateTimeRemaining(trade.expiresAt);
        const voteCount = calculateVoteCount(trade.votes);

        let analysis = null;
        if (includeAnalysis && (trade.status === 'PENDING' || trade.status === 'ACCEPTED')) {
          try {
            // You could cache analysis results and only recalculate if needed
            analysis = null; // Trade analysis would be computed here
          } catch (error) {
            handleComponentError(error as Error, 'route');
          }
        }

        return {
          ...trade,
          analysis,
          involvedTeams,
          affectedPositions,
          netValues,
          riskLevel,
          timeRemaining,
          requiredVotes: calculateRequiredVotes(involvedTeams.length),
          currentVotes: voteCount
        };
      })
    );

    // Sort by fairness if requested and analysis is included
    if (sortBy === 'fairness' && includeAnalysis) {
      enhancedTrades.sort((a, b) => {
        const aScore = a.analysis?.fairnessScore || 50;
        const bScore = b.analysis?.fairnessScore || 50;
        return sortOrder === 'desc' ? bScore - aScore : aScore - bScore;
      });
    }

    // Add league statistics
    const leagueStats = await getLeagueTradeStats(leagueId, season);

    const response: PaginatedResponse<EnhancedTrade> = {
      data: enhancedTrades,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: skip + limit < totalCount
      }
    };

    // Add metadata
    const responseWithMeta = {
      ...response,
      metadata: {
        leagueStats,
        currentWeek: (trades[0] as any)?.league?.currentWeek || 1,
        tradeDeadline: (trades[0] as any)?.league?.settings?.tradeDeadline || null,
        filters: {
          status,
          teamId,
          season,
          sortBy,
          sortOrder
        }
      }
    };

    return NextResponse.json(responseWithMeta);
  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface TradeItem {
  fromTeamId: string;
  toTeamId: string;
  playerId?: string;
  player?: any;
  itemType?: string;
  metadata?: any;
}

async function getInvolvedTeams(tradeItems: TradeItem[]) {
  const teamIds = new Set<string>();
  tradeItems.forEach(item => {
    teamIds.add(item.fromTeamId);
    teamIds.add(item.toTeamId);
  });

  return await prisma.team.findMany({
    where: { id: { in: Array.from(teamIds) } },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });
}

function getAffectedPositions(tradeItems: TradeItem[]) {
  const positions = new Set<string>();
  tradeItems.forEach(item => {
    if (item.player?.position) {
      positions.add(item.player.position);
    }
  });
  return Array.from(positions);
}

async function calculateNetValues(tradeItems: TradeItem[]) {
  // Calculate net value change for each team
  const teamValues: Record<string, number> = {};

  for (const item of tradeItems) {
    if (item.itemType === 'PLAYER' && item.player) {
      // Simplified value calculation - in production, use more sophisticated method
      const playerValue = item.playerId ? await getPlayerValue(item.playerId) : 0;
      
      // Subtract from giving team
      teamValues[item.fromTeamId] = (teamValues[item.fromTeamId] || 0) - playerValue;
      
      // Add to receiving team
      teamValues[item.toTeamId] = (teamValues[item.toTeamId] || 0) + playerValue;
    } else if (item.itemType === 'FAAB_MONEY' && item.metadata?.faabAmount) {
      const faabValue = item.metadata.faabAmount * 0.1; // $1 FAAB = 0.1 value points
      
      teamValues[item.fromTeamId] = (teamValues[item.fromTeamId] || 0) - faabValue;
      teamValues[item.toTeamId] = (teamValues[item.toTeamId] || 0) + faabValue;
    }
  }

  return teamValues;
}

async function getPlayerValue(playerId: string): Promise<number> {
  // Simplified player value calculation
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      projections: {
        where: {
          season: 2024,
          week: { gte: 1 }
        },
        take: 17 // Rest of season
      }
    }
  });

  if (!player || !player.projections.length) return 10; // Default value

  const totalProjectedPoints = player.projections.reduce((sum, p) => sum + Number(p.projectedPoints), 0);
  const positionMultiplier = getPositionValueMultiplier(player.position);
  
  return totalProjectedPoints * positionMultiplier / 10; // Normalize to reasonable scale
}

function getPositionValueMultiplier(position: string): number {
  const multipliers: Record<string, number> = {
    QB: 1.0,
    RB: 1.3,
    WR: 1.2,
    TE: 1.0,
    K: 0.3,
    DST: 0.4
  };
  return multipliers[position] || 1.0;
}

function assessRiskLevel(tradeItems: TradeItem[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  let riskScore = 0;

  tradeItems.forEach(item => {
    if (item.player) {
      // Injury risk
      if (item.player.status !== 'ACTIVE') {
        riskScore += item.player.status === 'OUT' ? 3 : 1;
      }

      // Position risk (RBs are injury prone)
      if (item.player.position === 'RB') {
        riskScore += 1;
      }

      // Age risk (if we had age data)
      // if (item.player.age > 30) riskScore += 1;
    }
  });

  if (riskScore >= 5) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

function calculateTimeRemaining(expiresAt: Date | null): string | undefined {
  if (!expiresAt) return undefined;

  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function calculateVoteCount(votes: any[]) {
  const approve = votes.filter(v => v.vote === 'APPROVE').length;
  const veto = votes.filter(v => v.vote === 'VETO').length;
  
  return {
    approve,
    veto,
    total: votes.length,
    required: Math.ceil(votes.length * 0.5) // Simplified - would get from league settings
  };
}

function calculateRequiredVotes(teamCount: number): number {
  // In most leagues, trades require majority approval from non-involved teams
  return Math.ceil((teamCount - 2) * 0.5); // Exclude the 2 teams in the trade
}

async function getLeagueTradeStats(leagueId: string, season: number | null) {
  const whereClause: any = { leagueId };
  if (season) {
    whereClause.league = { season };
  }

  const [
    totalTrades,
    acceptedTrades,
    rejectedTrades,
    pendingTrades,
    vetoedTrades,
    avgProcessingTime
  ] = await Promise.all([
    prisma.trade.count({ where: whereClause }),
    prisma.trade.count({ where: { ...whereClause, status: 'ACCEPTED' } }),
    prisma.trade.count({ where: { ...whereClause, status: 'REJECTED' } }),
    prisma.trade.count({ where: { ...whereClause, status: 'PENDING' } }),
    prisma.trade.count({ where: { ...whereClause, status: 'VETOED' } }),
    calculateAverageProcessingTime(leagueId, season)
  ]);

  const acceptanceRate = totalTrades > 0 ? (acceptedTrades / totalTrades) * 100 : 0;
  const rejectionRate = totalTrades > 0 ? (rejectedTrades / totalTrades) * 100 : 0;
  const vetoRate = totalTrades > 0 ? (vetoedTrades / totalTrades) * 100 : 0;

  return {
    totalTrades,
    acceptedTrades,
    rejectedTrades,
    pendingTrades,
    vetoedTrades,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    rejectionRate: Math.round(rejectionRate * 100) / 100,
    vetoRate: Math.round(vetoRate * 100) / 100,
    avgProcessingTime: avgProcessingTime ? `${Math.round(avgProcessingTime)}h` : null
  };
}

async function calculateAverageProcessingTime(leagueId: string, season: number | null): Promise<number | null> {
  const whereClause: any = {
    leagueId,
    processedAt: { not: null },
    status: { in: ['ACCEPTED', 'REJECTED'] }
  };

  if (season) {
    whereClause.league = { season };
  }

  const processedTrades = await prisma.trade.findMany({
    where: whereClause,
    select: {
      createdAt: true,
      processedAt: true
    }
  });

  if (processedTrades.length === 0) return null;

  const totalProcessingTime = processedTrades.reduce((sum, trade) => {
    if (trade.processedAt) {
      const diff = trade.processedAt.getTime() - trade.createdAt.getTime();
      return sum + diff;
    }
    return sum;
  }, 0);

  // Return average in hours
  return totalProcessingTime / processedTrades.length / (1000 * 60 * 60);
}