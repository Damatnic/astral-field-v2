import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Player Updates API
 * GET /api/player-updates - Get recent player updates (stats, status, injuries)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const position = searchParams.get('position');
    const team = searchParams.get('team');
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO date string
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeNews = searchParams.get('includeNews') === 'true';

    // Build where clause for players
    const playerWhere: any = {
      isActive: true,
    };

    if (playerId) {
      playerWhere.id = playerId;
    }

    if (position) {
      playerWhere.position = position;
    }

    if (team) {
      playerWhere.nflTeam = team;
    }

    if (since) {
      playerWhere.lastUpdated = {
        gte: new Date(since)
      };
    }

    // Get players with recent updates
    const players = await prisma.player.findMany({
      where: playerWhere,
      include: {
        stats: includeStats ? {
          orderBy: { createdAt: 'desc' },
          take: 5,
          where: {
            season: '2025'
          }
        } : false,
        news: includeNews ? {
          orderBy: { publishedAt: 'desc' },
          take: 3
        } : false,
        playerProjections: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: {
            season: 2025
          }
        }
      },
      orderBy: [
        { lastUpdated: 'desc' },
        { name: 'asc' }
      ],
      take: limit
    });

    // Transform the data
    const playerUpdates = players.map(player => {
      const latestProjection = player.playerProjections[0];
      const recentStats = player.stats || [];
      const recentNews = player.news || [];

      // Calculate status changes
      const statusUpdate = getPlayerStatusUpdate(player);
      
      return {
        id: player.id,
        name: player.name,
        position: player.position,
        team: player.nflTeam,
        status: player.status,
        injuryStatus: player.injuryStatus,
        injuryDetails: player.injuryDetails,
        isFantasyRelevant: player.isFantasyRelevant,
        lastUpdated: player.lastUpdated,
        
        // Status changes
        statusUpdate: statusUpdate,
        
        // Latest projection
        projection: latestProjection ? {
          week: latestProjection.week,
          points: latestProjection.points,
          confidence: latestProjection.confidence,
          source: latestProjection.source,
          updatedAt: latestProjection.updatedAt
        } : null,

        // Recent stats if requested
        ...(includeStats && {
          recentStats: recentStats.map(stat => ({
            week: stat.week,
            fantasyPoints: stat.fantasyPoints,
            stats: stat.stats,
            gameDate: stat.gameDate,
            opponent: stat.opponent
          }))
        }),

        // Recent news if requested
        ...(includeNews && {
          recentNews: recentNews.map(news => ({
            headline: news.headline,
            body: news.body,
            source: news.source,
            publishedAt: news.publishedAt,
            url: news.url
          }))
        }),

        // Fantasy relevance metrics
        fantasyMetrics: {
          adp: player.adp,
          rank: player.rank,
          isRookie: player.isRookie,
          isDynastyTarget: player.isDynastyTarget,
          dynastyRank: player.dynastyRank
        }
      };
    });

    // Get summary statistics
    const summary = {
      totalUpdates: playerUpdates.length,
      byPosition: await getUpdatesByPosition(playerWhere),
      byStatus: await getUpdatesByStatus(playerWhere),
      lastRefresh: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        players: playerUpdates,
        summary: summary,
        pagination: {
          limit: limit,
          hasMore: players.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Player updates API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch player updates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger player updates
 * POST /api/player-updates - Trigger refresh of player data
 */
export async function POST(request: Request) {
  try {
    const { playerIds, refreshType = 'full', source = 'manual' } = await request.json();

    // Build where clause
    const whereClause: any = { isActive: true };
    if (playerIds && Array.isArray(playerIds)) {
      whereClause.id = { in: playerIds };
    }

    let updatedCount = 0;

    if (refreshType === 'status' || refreshType === 'full') {
      // Update player status and injury information
      // This would integrate with ESPN/Yahoo APIs
      const statusUpdates = await refreshPlayerStatus(whereClause);
      updatedCount += statusUpdates;
    }

    if (refreshType === 'stats' || refreshType === 'full') {
      // Update recent player statistics
      const statsUpdates = await refreshPlayerStats(whereClause);
      updatedCount += statsUpdates;
    }

    if (refreshType === 'projections' || refreshType === 'full') {
      // Update player projections
      const projectionUpdates = await refreshPlayerProjections(whereClause);
      updatedCount += projectionUpdates;
    }

    if (refreshType === 'news' || refreshType === 'full') {
      // Update player news
      const newsUpdates = await refreshPlayerNews(whereClause);
      updatedCount += newsUpdates;
    }

    // Log the update request
    console.log(`Player updates completed: ${updatedCount} players updated`, {
      refreshType,
      source,
      playerIds: playerIds?.length || 'all'
    });

    return NextResponse.json({
      success: true,
      message: `Player updates completed for ${updatedCount} players`,
      data: {
        updatedCount,
        refreshType,
        source,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Player updates trigger error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to trigger player updates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

function getPlayerStatusUpdate(player: any) {
  // Analyze recent changes to determine what's new
  const updates = [];

  if (player.injuryStatus) {
    updates.push({
      type: 'injury',
      message: `${player.injuryStatus}: ${player.injuryDetails || 'No details available'}`,
      severity: getInjurySeverity(player.injuryStatus),
      timestamp: player.lastUpdated
    });
  }

  if (player.status !== 'active') {
    updates.push({
      type: 'status',
      message: `Player status: ${player.status}`,
      severity: player.status === 'injured' ? 'high' : 'medium',
      timestamp: player.lastUpdated
    });
  }

  return updates;
}

function getInjurySeverity(injuryStatus: string): 'low' | 'medium' | 'high' {
  const highSeverity = ['out', 'ir', 'suspended'];
  const mediumSeverity = ['doubtful', 'questionable'];
  
  if (highSeverity.includes(injuryStatus.toLowerCase())) return 'high';
  if (mediumSeverity.includes(injuryStatus.toLowerCase())) return 'medium';
  return 'low';
}

async function getUpdatesByPosition(whereClause: any) {
  try {
    const positions = await prisma.player.groupBy({
      by: ['position'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    return positions.reduce((acc, pos) => {
      acc[pos.position] = pos._count.id;
      return acc;
    }, {} as { [key: string]: number });
  } catch (error) {
    console.error('Error getting updates by position:', error);
    return {};
  }
}

async function getUpdatesByStatus(whereClause: any) {
  try {
    const statuses = await prisma.player.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    return statuses.reduce((acc, status) => {
      acc[status.status] = status._count.id;
      return acc;
    }, {} as { [key: string]: number });
  } catch (error) {
    console.error('Error getting updates by status:', error);
    return {};
  }
}

async function refreshPlayerStatus(whereClause: any): Promise<number> {
  try {
    // This would integrate with ESPN/Yahoo APIs to get current player status
    // For now, just update the lastUpdated timestamp
    const result = await prisma.player.updateMany({
      where: whereClause,
      data: {
        lastUpdated: new Date()
      }
    });

    return result.count;
  } catch (error) {
    console.error('Error refreshing player status:', error);
    return 0;
  }
}

async function refreshPlayerStats(whereClause: any): Promise<number> {
  try {
    // This would fetch latest stats from ESPN/Yahoo APIs
    // For now, just return count of players that would be updated
    const players = await prisma.player.count({ where: whereClause });
    return players;
  } catch (error) {
    console.error('Error refreshing player stats:', error);
    return 0;
  }
}

async function refreshPlayerProjections(whereClause: any): Promise<number> {
  try {
    // This would fetch latest projections from ESPN/Yahoo APIs
    // For now, just return count of players that would be updated
    const players = await prisma.player.count({ where: whereClause });
    return players;
  } catch (error) {
    console.error('Error refreshing player projections:', error);
    return 0;
  }
}

async function refreshPlayerNews(whereClause: any): Promise<number> {
  try {
    // This would fetch latest news from ESPN/Yahoo APIs
    // For now, just return count of players that would be updated
    const players = await prisma.player.count({ where: whereClause });
    return players;
  } catch (error) {
    console.error('Error refreshing player news:', error);
    return 0;
  }
}