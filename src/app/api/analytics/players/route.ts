import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { redisCache, fantasyKeys } from '@/lib/redis-cache';
import { CACHE_TAGS } from '@/lib/cache';
import { getPlayersOptimized } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

// GET /api/analytics/players - Get comprehensive player analytics
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const positions = searchParams.get('positions')?.split(',');
    const teams = searchParams.get('teams')?.split(',');
    const timeframe = searchParams.get('timeframe') || 'season'; // season, recent, week
    const leagueId = searchParams.get('leagueId');

    // Build cache key
    const cacheKey = fantasyKeys.analytics(leagueId || 'global', 'players', timeframe || 'week');
    
    // Try cache first
    const cached = await redisCache.get(cacheKey, [CACHE_TAGS.ANALYTICS]);
    
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch player data for analytics
    const playerData = await getPlayersOptimized({
      position: positions?.[0],
      team: teams?.[0],
      leagueId,
      limit: 1000, // Get more players for analytics
      offset: 0
    });

    const analytics = calculatePlayerAnalytics(playerData.players, { positions, teams, timeframe });

    // Cache for 10 minutes
    await redisCache.set(cacheKey, analytics, 600, [CACHE_TAGS.ANALYTICS]);

    return NextResponse.json(analytics);

  } catch (error) {
    handleComponentError(error as Error, 'player-analytics-api');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculatePlayerAnalytics(players: any[], options: any) {
  const { positions, teams, timeframe } = options;

  // Filter players based on criteria
  let filteredPlayers = players;
  
  if (positions?.length) {
    filteredPlayers = filteredPlayers.filter(p => positions.includes(p.position));
  }
  
  if (teams?.length) {
    filteredPlayers = filteredPlayers.filter(p => teams.includes(p.nflTeam));
  }

  // Calculate basic metrics
  const totalPlayers = filteredPlayers.length;
  
  const projections = filteredPlayers.map(p => {
    const projection = p.projections?.[0];
    return projection?.projectedPoints?.toNumber() || 0;
  }).filter(p => p > 0);

  const avgProjection = projections.length > 0 
    ? projections.reduce((sum, p) => sum + p, 0) / projections.length 
    : 0;

  // Calculate ownership metrics
  const ownerships = filteredPlayers.map(p => calculateOwnership(p)).filter(o => o > 0);
  const avgOwnership = ownerships.length > 0 
    ? ownerships.reduce((sum, o) => sum + o, 0) / ownerships.length 
    : 0;

  // Calculate trends
  const trendingUp = filteredPlayers.filter(p => {
    const stats = p.stats || [];
    return calculateTrend(stats) === 'up';
  }).length;

  const trendingDown = filteredPlayers.filter(p => {
    const stats = p.stats || [];
    return calculateTrend(stats) === 'down';
  }).length;

  // Health concerns
  const healthyConcerns = filteredPlayers.filter(p => 
    p.status !== 'ACTIVE' || p.injuryStatus === 'QUESTIONABLE' || p.injuryStatus === 'DOUBTFUL'
  ).length;

  // High-value targets (good projection, low ownership)
  const highValueTargets = filteredPlayers.filter(p => {
    const projection = p.projections?.[0]?.projectedPoints?.toNumber() || 0;
    const ownership = calculateOwnership(p);
    return projection > 18 && ownership < 70;
  }).length;

  // Position breakdown
  const positionBreakdown = calculatePositionBreakdown(filteredPlayers);

  // Top performers
  const topPerformers = getTopPerformers(filteredPlayers, 10);

  // Sleeper picks
  const sleeperPicks = getSleeperPicks(filteredPlayers, 10);

  // Value plays
  const valuePlays = getValuePlays(filteredPlayers, 10);

  // Bust candidates
  const bustCandidates = getBustCandidates(filteredPlayers, 10);

  // Consistency leaders
  const consistencyLeaders = getConsistencyLeaders(filteredPlayers, 10);

  // Boom/bust analysis
  const boomBustAnalysis = calculateBoomBustAnalysis(filteredPlayers);

  // Positional scarcity
  const positionalScarcity = calculatePositionalScarcity(filteredPlayers);

  // Weekly trends
  const weeklyTrends = calculateWeeklyTrends(filteredPlayers);

  // Injury impact analysis
  const injuryImpact = calculateInjuryImpact(filteredPlayers);

  // Matchup analysis
  const matchupAnalysis = calculateMatchupAnalysis(filteredPlayers);

  return {
    summary: {
      totalPlayers,
      avgProjection: Math.round(avgProjection * 10) / 10,
      avgOwnership: Math.round(avgOwnership * 10) / 10,
      trendingUp,
      trendingDown,
      healthyConcerns,
      highValueTargets
    },
    positionBreakdown,
    insights: {
      topPerformers,
      sleeperPicks,
      valuePlays,
      bustCandidates,
      consistencyLeaders
    },
    analysis: {
      boomBustAnalysis,
      positionalScarcity,
      weeklyTrends,
      injuryImpact,
      matchupAnalysis
    },
    generated: new Date().toISOString(),
    timeframe
  };
}

function calculateOwnership(player: any): number {
  // TODO: Calculate real ownership from league data
  return Math.random() * 100;
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

function calculatePositionBreakdown(players: any[]) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  
  return positions.map(position => {
    const positionPlayers = players.filter(p => p.position === position);
    const count = positionPlayers.length;
    
    if (count === 0) {
      return {
        position,
        count: 0,
        avgProjection: 0,
        avgOwnership: 0,
        topPlayer: null
      };
    }

    const projections = positionPlayers.map(p => {
      const projection = p.projections?.[0];
      return projection?.projectedPoints?.toNumber() || 0;
    });

    const avgProjection = projections.reduce((sum, p) => sum + p, 0) / count;
    const avgOwnership = positionPlayers.reduce((sum, p) => sum + calculateOwnership(p), 0) / count;
    
    const topPlayer = positionPlayers.reduce((top, current) => {
      const currentProjection = current.projections?.[0]?.projectedPoints?.toNumber() || 0;
      const topProjection = top.projections?.[0]?.projectedPoints?.toNumber() || 0;
      return currentProjection > topProjection ? current : top;
    });

    return {
      position,
      count,
      avgProjection: Math.round(avgProjection * 10) / 10,
      avgOwnership: Math.round(avgOwnership * 10) / 10,
      topPlayer: {
        id: topPlayer.id,
        name: topPlayer.name,
        projection: topPlayer.projections?.[0]?.projectedPoints?.toNumber() || 0
      }
    };
  });
}

function getTopPerformers(players: any[], limit: number) {
  return players
    .filter(p => {
      const stats = p.stats || [];
      return stats.length > 0;
    })
    .map(p => {
      const stats = p.stats || [];
      const avgPoints = stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / stats.length;
      return { ...p, avgPoints };
    })
    .sort((a, b) => b.avgPoints - a.avgPoints)
    .slice(0, limit)
    .map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.nflTeam,
      avgPoints: Math.round(p.avgPoints * 10) / 10,
      trend: calculateTrend(p.stats || [])
    }));
}

function getSleeperPicks(players: any[], limit: number) {
  return players
    .filter(p => {
      const projection = p.projections?.[0]?.projectedPoints?.toNumber() || 0;
      const ownership = calculateOwnership(p);
      return projection > 15 && ownership < 50;
    })
    .sort((a, b) => {
      const aProjection = a.projections?.[0]?.projectedPoints?.toNumber() || 0;
      const bProjection = b.projections?.[0]?.projectedPoints?.toNumber() || 0;
      return bProjection - aProjection;
    })
    .slice(0, limit)
    .map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.nflTeam,
      projection: p.projections?.[0]?.projectedPoints?.toNumber() || 0,
      ownership: Math.round(calculateOwnership(p) * 10) / 10
    }));
}

function getValuePlays(players: any[], limit: number) {
  return players
    .filter(p => p.adp && p.projections?.[0])
    .map(p => {
      const projection = p.projections?.[0]?.projectedPoints?.toNumber() || 0;
      const adp = p.adp;
      const value = projection / Math.max(adp, 1); // Avoid division by zero
      return { ...p, value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.nflTeam,
      projection: p.projections?.[0]?.projectedPoints?.toNumber() || 0,
      adp: p.adp,
      value: Math.round(p.value * 100) / 100
    }));
}

function getBustCandidates(players: any[], limit: number) {
  return players
    .filter(p => {
      const adp = p.adp;
      const ownership = calculateOwnership(p);
      return adp < 50 && ownership > 80; // High draft position, high ownership
    })
    .map(p => {
      const stats = p.stats || [];
      const consistency = calculateConsistency(stats);
      return { ...p, consistency };
    })
    .sort((a, b) => a.consistency - b.consistency) // Least consistent first
    .slice(0, limit)
    .map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.nflTeam,
      adp: p.adp,
      consistency: Math.round(p.consistency),
      risk: p.consistency < 50 ? 'high' : p.consistency < 70 ? 'medium' : 'low'
    }));
}

function getConsistencyLeaders(players: any[], limit: number) {
  return players
    .filter(p => {
      const stats = p.stats || [];
      return stats.length >= 5; // Need enough games for meaningful consistency
    })
    .map(p => {
      const stats = p.stats || [];
      const consistency = calculateConsistency(stats);
      return { ...p, consistency };
    })
    .sort((a, b) => b.consistency - a.consistency)
    .slice(0, limit)
    .map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: p.nflTeam,
      consistency: Math.round(p.consistency),
      gamesPlayed: (p.stats || []).length
    }));
}

function calculateConsistency(stats: any[]): number {
  if (stats.length < 3) return 0;
  
  const points = stats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const standardDeviation = Math.sqrt(variance);
  
  return Math.max(0, 100 - (standardDeviation * 5));
}

function calculateBoomBustAnalysis(players: any[]) {
  const playersWithStats = players.filter(p => (p.stats || []).length >= 5);
  
  const boomRates = playersWithStats.map(p => {
    const stats = p.stats || [];
    const booms = stats.filter(s => (s.fantasyPoints?.toNumber() || 0) >= 20).length;
    return (booms / stats.length) * 100;
  });

  const bustRates = playersWithStats.map(p => {
    const stats = p.stats || [];
    const busts = stats.filter(s => (s.fantasyPoints?.toNumber() || 0) < 5).length;
    return (busts / stats.length) * 100;
  });

  const avgBoomRate = boomRates.length > 0 ? boomRates.reduce((sum, r) => sum + r, 0) / boomRates.length : 0;
  const avgBustRate = bustRates.length > 0 ? bustRates.reduce((sum, r) => sum + r, 0) / bustRates.length : 0;

  return {
    avgBoomRate: Math.round(avgBoomRate * 10) / 10,
    avgBustRate: Math.round(avgBustRate * 10) / 10,
    playersAnalyzed: playersWithStats.length
  };
}

function calculatePositionalScarcity(players: any[]) {
  const positions = ['QB', 'RB', 'WR', 'TE'];
  
  return positions.map(position => {
    const positionPlayers = players.filter(p => p.position === position);
    const topTier = positionPlayers
      .filter(p => p.projections?.[0])
      .sort((a, b) => {
        const aProj = a.projections[0].projectedPoints?.toNumber() || 0;
        const bProj = b.projections[0].projectedPoints?.toNumber() || 0;
        return bProj - aProj;
      })
      .slice(0, 12); // Top 12 at each position

    const dropoff = topTier.length >= 12 ? calculateDropoff(topTier) : 0;

    return {
      position,
      totalPlayers: positionPlayers.length,
      scarcityScore: Math.round(dropoff * 10) / 10,
      scarcityLevel: dropoff > 5 ? 'high' : dropoff > 2 ? 'medium' : 'low'
    };
  });
}

function calculateDropoff(topPlayers: any[]): number {
  if (topPlayers.length < 12) return 0;
  
  const top6Avg = topPlayers
    .slice(0, 6)
    .reduce((sum, p) => sum + (p.projections[0].projectedPoints?.toNumber() || 0), 0) / 6;
    
  const next6Avg = topPlayers
    .slice(6, 12)
    .reduce((sum, p) => sum + (p.projections[0].projectedPoints?.toNumber() || 0), 0) / 6;

  return top6Avg - next6Avg;
}

function calculateWeeklyTrends(players: any[]) {
  // Simplified weekly trend analysis
  const currentWeek = getCurrentWeek();
  
  return {
    currentWeek,
    trendingUp: players.filter(p => calculateTrend(p.stats || []) === 'up').length,
    trendingDown: players.filter(p => calculateTrend(p.stats || []) === 'down').length,
    hotStreaks: [], // TODO: Implement hot streak detection
    coldStreaks: [] // TODO: Implement cold streak detection
  };
}

function calculateInjuryImpact(players: any[]) {
  const injured = players.filter(p => p.status !== 'ACTIVE');
  const questionable = players.filter(p => p.injuryStatus === 'QUESTIONABLE');
  
  return {
    totalInjured: injured.length,
    questionable: questionable.length,
    impactByPosition: ['QB', 'RB', 'WR', 'TE'].map(pos => ({
      position: pos,
      injured: injured.filter(p => p.position === pos).length,
      questionable: questionable.filter(p => p.position === pos).length
    }))
  };
}

function calculateMatchupAnalysis(players: any[]) {
  // Simplified matchup analysis
  return {
    favorableMatchups: players.filter(p => Math.random() > 0.7).length, // TODO: Real matchup data
    difficultMatchups: players.filter(p => Math.random() > 0.8).length,
    neutralMatchups: players.length - players.filter(p => Math.random() > 0.75).length
  };
}

function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}