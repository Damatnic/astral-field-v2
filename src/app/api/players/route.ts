import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { Player, PlayerSearchFilters, PaginatedResponse } from '@/types/fantasy';
import { getPlayersOptimized } from '@/lib/db/optimized-queries';
import { redisCache, fantasyKeys } from '@/lib/redis-cache';
import { CACHE_TAGS } from '@/lib/cache';
import { getCacheHeaders } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// GET /api/players - Search and get players with optimized caching
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
    const searchQuery = searchParams.get('search') || '';
    const positions = searchParams.get('positions')?.split(',') || [];
    const teams = searchParams.get('teams')?.split(',') || [];
    const statuses = searchParams.get('statuses')?.split(',') || [];
    const availability = searchParams.get('availability') || 'all';
    const leagueId = searchParams.get('leagueId');

    // Create cache key based on search parameters
    const filterString = JSON.stringify({
      page,
      limit,
      search: searchQuery,
      positions: positions.sort(),
      teams: teams.sort(),
      statuses: statuses.sort(),
      availability,
      leagueId,
    });
    const cacheKey = fantasyKeys.players(Buffer.from(filterString).toString('base64'));

    // Try to get from cache first
    const cached = await redisCache.get<{ players: any[], totalCount: number }>(
      cacheKey,
      [CACHE_TAGS.PLAYERS]
    );

    let players, totalCount;

    if (cached) {
      console.log('✅ Players cache hit');
      ({ players, totalCount } = cached);
    } else {
      console.log('❌ Players cache miss, fetching from database');
      
      // Fetch from optimized database function
      const filters = {
        search: searchQuery,
        position: positions?.[0], // Single position for now
        team: teams?.[0], // Single team for now
        availability: availability as 'all' | 'available' | 'rostered',
        leagueId,
        limit,
        offset: (page - 1) * limit,
      };

      const result = await getPlayersOptimized(filters);
      players = result.players;
      totalCount = result.total;

      // Cache the result (shorter TTL for search results)
      const ttl = searchQuery ? 300 : 900; // 5 min for search, 15 min for browsing
      await redisCache.set(
        cacheKey,
        { players, totalCount },
        ttl,
        [CACHE_TAGS.PLAYERS]
      );
    }

    // Transform players data with comprehensive stats
    const transformedPlayers = players.map(player => {
      const seasonStats = player.stats || [];
      const totalPoints = seasonStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0);
      const averagePoints = seasonStats.length > 0 ? totalPoints / seasonStats.length : 0;
      const lastGamePoints = seasonStats[0]?.fantasyPoints?.toNumber() || 0;
      const projection = player.projections?.[0];
      const isRostered = player.rosters && player.rosters.length > 0;
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (seasonStats.length >= 3) {
        const recent = seasonStats.slice(0, 2);
        const older = seasonStats.slice(2, 4);
        
        if (recent.length >= 2 && older.length >= 2) {
          const recentAvg = recent.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recent.length;
          const olderAvg = older.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / older.length;
          
          if (recentAvg > olderAvg * 1.1) trend = 'up';
          else if (recentAvg < olderAvg * 0.9) trend = 'down';
        }
      }

      return {
        id: player.id,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        nflTeam: player.nflTeam,
        byeWeek: player.byeWeek,
        status: player.status,
        injuryStatus: player.injuryStatus,
        isRookie: player.isRookie,
        age: player.age,
        height: player.height,
        weight: player.weight,
        college: player.college,
        searchRank: player.searchRank,
        adp: player.adp,
        // Season statistics
        seasonStats: {
          totalPoints: totalPoints,
          averagePoints: averagePoints,
          lastGamePoints: lastGamePoints,
          gamesPlayed: seasonStats.length,
          trend: trend,
          consistency: calculateConsistency(seasonStats)
        },
        // This week's projection
        projection: {
          points: projection?.projectedPoints?.toNumber() || 0,
          confidence: projection?.confidence || 0,
          source: projection?.source || 'SYSTEM'
        },
        // Recent game log
        recentGames: seasonStats.slice(0, 5).map(stat => ({
          week: stat.week,
          opponent: stat.opponent,
          points: stat.fantasyPoints?.toNumber() || 0,
          stats: stat.stats,
          gameId: stat.gameId
        })),
        // News
        news: (player.news || []).map(news => ({
          id: news.id,
          headline: news.headline,
          content: news.content,
          source: news.source,
          timestamp: news.timestamp,
          impact: news.impact,
          category: news.category
        })),
        // Roster information
        isRostered: isRostered,
        rosterInfo: isRostered && player.rosters ? {
          teamId: player.rosters[0].team.id,
          teamName: player.rosters[0].team.name,
          ownerName: player.rosters[0].team.owner.name,
          rosterSlot: player.rosters[0].rosterSlot
        } : null,
        // Fantasy relevance scoring
        fantasyScore: calculateFantasyScore(player, seasonStats, projection),
        // Matchup information
        upcomingOpponent: getUpcomingOpponent(player.nflTeam, getCurrentWeek()),
        restOfSeasonOutlook: calculateROSOutlook(seasonStats, player.byeWeek, getCurrentWeek())
      };
    });

    const response: PaginatedResponse<Player> = {
      data: transformedPlayers as any,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: (page - 1) * limit + limit < totalCount
      }
    };

    // Set appropriate cache headers
    const cacheType = searchQuery ? 'dynamic' : 'static';
    const headers = getCacheHeaders(cacheType);

    return NextResponse.json(response, { headers });
  } catch (error) {
    handleComponentError(error as Error, 'players-api');
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        requestTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Helper functions

function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

function calculateConsistency(stats: any[]): number {
  if (stats.length < 3) return 0;
  
  const points = stats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Consistency score: lower standard deviation = higher consistency
  // Normalize to 0-100 scale
  return Math.max(0, 100 - (standardDeviation * 5));
}

function calculateFantasyScore(player: any, stats: any[], projection: any): number {
  let score = 0;
  
  // Base score from search rank
  if (player.searchRank) {
    score += Math.max(0, 1000 - player.searchRank);
  }
  
  // Season performance (40% weight)
  if (stats.length > 0) {
    const avgPoints = stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / stats.length;
    score += avgPoints * 40;
  }
  
  // Projection confidence (20% weight)
  if (projection) {
    score += (projection.projectedPoints?.toNumber() || 0) * 20;
    score += (projection.confidence || 0) * 2;
  }
  
  // Health bonus (10% weight)
  if (player.status === 'ACTIVE') {
    score += 100;
  } else if (player.status === 'QUESTIONABLE') {
    score += 50;
  }
  
  // Youth bonus for rookies (5% weight)
  if (player.isRookie) {
    score += 50;
  }
  
  return Math.round(score);
}

function getUpcomingOpponent(nflTeam: string | null, currentWeek: number): string {
  // Simplified opponent lookup - in production this would use actual NFL schedule
  const weeklyOpponents: { [key: string]: { [week: number]: string } } = {
    'DAL': { 1: 'vs GB', 2: 'vs NO', 3: '@ ARI', 4: 'vs NE' },
    'GB': { 1: '@ DAL', 2: 'vs IND', 3: 'vs DEN', 4: '@ MIN' },
    // Add more teams and schedules as needed
  };
  
  if (!nflTeam || !weeklyOpponents[nflTeam] || !weeklyOpponents[nflTeam][currentWeek + 1]) {
    return 'TBD';
  }
  
  return weeklyOpponents[nflTeam][currentWeek + 1];
}

function calculateROSOutlook(stats: any[], byeWeek: number | null, currentWeek: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (stats.length === 0) return 'average';
  
  const avgPoints = stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / stats.length;
  const recentForm = stats.slice(0, 3).reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / Math.min(3, stats.length);
  
  // Consider bye week impact
  const byeWeekPenalty = (byeWeek && byeWeek > currentWeek) ? 0.9 : 1.0;
  const adjustedScore = (avgPoints * 0.6 + recentForm * 0.4) * byeWeekPenalty;
  
  if (adjustedScore >= 15) return 'excellent';
  if (adjustedScore >= 10) return 'good';
  if (adjustedScore >= 6) return 'average';
  return 'poor';
}