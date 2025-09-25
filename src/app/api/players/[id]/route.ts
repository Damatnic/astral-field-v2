import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { getPlayerByIdOptimized } from '@/lib/db/optimized-queries';
import { redisCache, fantasyKeys } from '@/lib/redis-cache';
import { CACHE_TAGS } from '@/lib/cache';
import { getCacheHeaders } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// GET /api/players/[id] - Get individual player details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playerId = params.id;
    const { searchParams } = new URL(request.url);
    const includeNews = searchParams.get('includeNews') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeProjections = searchParams.get('includeProjections') === 'true';

    // Create cache key
    const cacheKey = fantasyKeys.player(playerId);

    // Try to get from cache first
    const cached = await redisCache.get(cacheKey, [CACHE_TAGS.PLAYERS]);

    let player;

    if (cached) {
      console.log('✅ Player cache hit');
      player = cached;
    } else {
      console.log('❌ Player cache miss, fetching from database');
      
      player = await getPlayerByIdOptimized(playerId);

      if (!player) {
        return NextResponse.json(
          { success: false, message: 'Player not found' },
          { status: 404 }
        );
      }

      // Cache the result
      await redisCache.set(
        cacheKey,
        player,
        1800, // 30 minutes
        [CACHE_TAGS.PLAYERS]
      );
    }

    // Transform player data with enhanced social features
    const seasonStats = player.stats || [];
    const totalPoints = seasonStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0);
    const averagePoints = seasonStats.length > 0 ? totalPoints / seasonStats.length : 0;
    const projection = player.projections?.[0];
    const isRostered = player.rosters && player.rosters.length > 0;

    // Calculate advanced metrics
    const recentGames = seasonStats.slice(0, 5);
    const consistency = calculateConsistency(seasonStats);
    const trend = calculateTrend(seasonStats);
    const ceiling = calculateCeiling(seasonStats, projection);
    const floor = calculateFloor(seasonStats, projection);

    // Enhanced player response
    const enhancedPlayer = {
      id: player.id,
      name: player.name,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      team: player.nflTeam,
      jerseyNumber: player.jerseyNumber,
      height: player.height,
      weight: player.weight,
      age: player.age,
      experience: player.experience,
      college: player.college,
      byeWeek: player.byeWeek,
      status: player.status,
      injuryStatus: player.injuryStatus,
      injuryDetails: player.injuryDetails,
      
      // Season statistics
      stats: {
        totalPoints,
        averagePoints,
        gamesPlayed: seasonStats.length,
        trend,
        consistency,
        recentForm: recentGames.length > 0 
          ? recentGames.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recentGames.length 
          : 0
      },

      // Projections
      projections: {
        fantasyPoints: projection?.projectedPoints?.toNumber() || 0,
        confidence: projection?.confidence || 0,
        source: projection?.source || 'SYSTEM',
        ceiling,
        floor,
        lastUpdated: projection?.updatedAt
      },

      // Fantasy data
      fantasy: {
        adp: player.adp || 0,
        ownership: calculateOwnership(player),
        trending: trend,
        rank: player.searchRank,
        tier: calculateTier(player.position, player.searchRank),
        valueBasedDrafting: calculateVBD(averagePoints, player.position),
        strengthOfSchedule: 0 // TODO: Calculate from matchups
      },

      // Game context
      game: {
        opponent: getUpcomingOpponent(player.nflTeam),
        isHome: true, // TODO: Calculate from schedule
        gameTime: getGameTime(player.nflTeam),
        weather: null, // TODO: Fetch weather data
        spread: null, // TODO: Fetch betting data
        overUnder: null,
        impliedTotal: null
      },

      // Social features
      social: {
        likes: player.likes || 0,
        notes: player.notes || 0,
        isWatched: player.watchedBy?.some(w => w.userId === user.id) || false,
        leagueOwnership: calculateLeagueOwnership(player, user.id),
        recentActivity: []
      },

      // DFS data
      dfs: {
        salary: {
          draftkings: player.draftKingsSalary,
          fanduel: player.fanDuelSalary,
          superdraft: player.superDraftSalary
        },
        ownership: {
          draftkings: player.draftKingsOwnership,
          fanduel: player.fanDuelOwnership
        },
        value: calculateDFSValue(projection?.projectedPoints?.toNumber() || 0, player.draftKingsSalary),
        ceiling,
        floor
      },

      // Advanced metrics
      advanced: {
        targetShare: calculateTargetShare(player, seasonStats),
        snapShare: calculateSnapShare(player, seasonStats),
        redZoneTargets: calculateRedZoneTargets(seasonStats),
        goalLineCarries: calculateGoalLineCarries(seasonStats),
        pprPoints: calculatePPRPoints(seasonStats),
        halfPprPoints: calculateHalfPPRPoints(seasonStats),
        standardPoints: totalPoints,
        boom: calculateBoomRate(seasonStats),
        bust: calculateBustRate(seasonStats)
      },

      // Recent games
      recentGames: recentGames.map(stat => ({
        week: stat.week,
        opponent: stat.opponent,
        points: stat.fantasyPoints?.toNumber() || 0,
        stats: stat.stats,
        gameId: stat.gameId,
        date: stat.gameDate
      })),

      // News (if requested)
      news: includeNews ? (player.news || []).map(news => ({
        id: news.id,
        headline: news.headline,
        content: news.content,
        source: news.source,
        timestamp: news.timestamp,
        impact: news.impact,
        category: news.category
      })) : [],

      // Roster information
      isRostered,
      rosterInfo: isRostered && player.rosters ? {
        teamId: player.rosters[0].team.id,
        teamName: player.rosters[0].team.name,
        ownerName: player.rosters[0].team.owner.name,
        rosterSlot: player.rosters[0].rosterSlot
      } : null,

      lastUpdated: new Date().toISOString()
    };

    const headers = getCacheHeaders('static');
    return NextResponse.json(enhancedPlayer, { headers });

  } catch (error) {
    handleComponentError(error as Error, 'player-details-api');
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

// POST /api/players/[id] - Update player social data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playerId = params.id;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!['like', 'unlike', 'watch', 'unwatch', 'note'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    // TODO: Update social data in database
    // For now, just invalidate cache
    await redisCache.invalidateByTag(CACHE_TAGS.PLAYERS);

    return NextResponse.json({
      success: true,
      action,
      playerId,
      userId: user.id
    });

  } catch (error) {
    handleComponentError(error as Error, 'player-social-update');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateConsistency(stats: any[]): number {
  if (stats.length < 3) return 0;
  
  const points = stats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const standardDeviation = Math.sqrt(variance);
  
  return Math.max(0, 100 - (standardDeviation * 5));
}

function calculateTrend(stats: any[]): 'up' | 'down' | 'stable' {
  if (stats.length < 4) return 'stable';
  
  const recent = stats.slice(0, 2);
  const older = stats.slice(2, 4);
  
  if (recent.length >= 2 && older.length >= 2) {
    const recentAvg = recent.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'up';
    if (recentAvg < olderAvg * 0.9) return 'down';
  }
  
  return 'stable';
}

function calculateCeiling(stats: any[], projection: any): number {
  const points = stats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const max = Math.max(...points, 0);
  const projected = projection?.projectedPoints?.toNumber() || 0;
  
  return Math.max(max, projected * 1.5);
}

function calculateFloor(stats: any[], projection: any): number {
  const points = stats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const min = Math.min(...points.filter(p => p > 0), 0);
  const projected = projection?.projectedPoints?.toNumber() || 0;
  
  return Math.max(0, Math.min(min, projected * 0.5));
}

function calculateOwnership(player: any): number {
  // TODO: Calculate real ownership percentage
  return Math.random() * 100;
}

function calculateTier(position: string, rank?: number): number {
  if (!rank) return 5;
  
  const tierBreakpoints = {
    'QB': [6, 12, 18, 24],
    'RB': [12, 24, 36, 48],
    'WR': [18, 36, 54, 72],
    'TE': [6, 12, 18, 24]
  };
  
  const breakpoints = tierBreakpoints[position as keyof typeof tierBreakpoints] || [12, 24, 36, 48];
  
  for (let i = 0; i < breakpoints.length; i++) {
    if (rank <= breakpoints[i]) {
      return i + 1;
    }
  }
  
  return 5;
}

function calculateVBD(averagePoints: number, position: string): number {
  // Value Based Drafting calculation
  const replacementLevels = {
    'QB': 12,
    'RB': 15,
    'WR': 18,
    'TE': 8
  };
  
  const replacement = replacementLevels[position as keyof typeof replacementLevels] || 10;
  return Math.max(0, averagePoints - replacement);
}

function calculateLeagueOwnership(player: any, userId: string): number {
  // TODO: Calculate ownership within user's leagues
  return Math.random() * 100;
}

function calculateDFSValue(projectedPoints: number, salary?: number): number {
  if (!salary || salary === 0) return 0;
  return (projectedPoints * 1000) / salary;
}

function calculateTargetShare(player: any, stats: any[]): number {
  // TODO: Calculate target share for receivers
  return 0;
}

function calculateSnapShare(player: any, stats: any[]): number {
  // TODO: Calculate snap share
  return 0;
}

function calculateRedZoneTargets(stats: any[]): number {
  // TODO: Calculate red zone targets
  return 0;
}

function calculateGoalLineCarries(stats: any[]): number {
  // TODO: Calculate goal line carries
  return 0;
}

function calculatePPRPoints(stats: any[]): number {
  return stats.reduce((sum, stat) => {
    const points = stat.fantasyPoints?.toNumber() || 0;
    const receptions = stat.stats?.receptions || 0;
    return sum + points + receptions;
  }, 0);
}

function calculateHalfPPRPoints(stats: any[]): number {
  return stats.reduce((sum, stat) => {
    const points = stat.fantasyPoints?.toNumber() || 0;
    const receptions = stat.stats?.receptions || 0;
    return sum + points + (receptions * 0.5);
  }, 0);
}

function calculateBoomRate(stats: any[]): number {
  if (stats.length === 0) return 0;
  const booms = stats.filter(stat => (stat.fantasyPoints?.toNumber() || 0) >= 20).length;
  return (booms / stats.length) * 100;
}

function calculateBustRate(stats: any[]): number {
  if (stats.length === 0) return 0;
  const busts = stats.filter(stat => (stat.fantasyPoints?.toNumber() || 0) < 5).length;
  return (busts / stats.length) * 100;
}

function getUpcomingOpponent(nflTeam: string | null): string {
  // TODO: Get real upcoming opponent
  return 'TBD';
}

function getGameTime(nflTeam: string | null): string {
  // TODO: Get real game time
  return '1:00 PM ET';
}