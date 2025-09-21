import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface OptimizationCriteria {
  strategy: 'high_ceiling' | 'high_floor' | 'balanced' | 'boom_bust';
  prioritizeMatchups: boolean;
  avoidInjured: boolean;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  customWeights?: {
    projected: number;
    recent: number;
    matchup: number;
    consistency: number;
  };
}

interface PlayerScore {
  playerId: string;
  position: string;
  score: number;
  projectedPoints: number;
  recentForm: number;
  matchupRating: number;
  consistencyScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { criteria, week }: { criteria: OptimizationCriteria; week?: number } = await request.json();
    
    if (!criteria) {
      return NextResponse.json({
        success: false,
        error: 'Optimization criteria required'
      }, { status: 400 });
    }

    // Get user's team and available players
    const team = await prisma.team.findFirst({
      where: { ownerId: user.id },
      include: {
        league: {
          select: {
            id: true,
            scoringSettings: true,
            rosterSettings: true
          }
        },
        roster: {
          include: {
            player: {
              include: {
                stats: {
                  where: {
                    season: new Date().getFullYear().toString(),
                    isProjection: false
                  },
                  orderBy: { week: 'desc' },
                  take: 5 // Last 5 weeks
                },
                projections: {
                  where: {
                    season: new Date().getFullYear().toString(),
                    week: week || getCurrentWeek()
                  },
                  orderBy: { confidence: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({
        success: false,
        error: 'Team not found'
      }, { status: 404 });
    }

    // Score all available players
    const playerScores = await Promise.all(
      team.roster.map(async (rosterPlayer) => {
        const player = rosterPlayer.player;
        const recentStats = player.stats.slice(0, 3); // Last 3 weeks
        const projection = player.projections[0];
        
        return await calculatePlayerScore(player, recentStats, projection, criteria);
      })
    );

    // Generate optimal lineup based on league settings
    const rosterSettings = team.league.rosterSettings as any;
    const optimalLineup = generateOptimalLineup(playerScores, rosterSettings, criteria);
    
    // Calculate lineup projections and risk assessment
    const lineupAnalysis = analyzeLineup(optimalLineup, criteria);

    return NextResponse.json({
      success: true,
      data: {
        optimalLineup,
        analysis: lineupAnalysis,
        alternatives: generateAlternativeLineups(playerScores, rosterSettings, criteria),
        playerScores: playerScores.sort((a, b) => b.score - a.score),
        metadata: {
          week: week || getCurrentWeek(),
          strategy: criteria.strategy,
          totalProjected: optimalLineup.reduce((sum, p) => sum + p.projectedPoints, 0),
          confidenceScore: calculateConfidenceScore(optimalLineup)
        }
      }
    });

  } catch (error) {
    handleComponentError(error as Error, 'lineup-optimize');
    return NextResponse.json({
      success: false,
      error: 'Failed to optimize lineup'
    }, { status: 500 });
  }
}

async function calculatePlayerScore(
  player: any,
  recentStats: any[],
  projection: any,
  criteria: OptimizationCriteria
): Promise<PlayerScore> {
  const projectedPoints = projection?.projectedPoints || 0;
  
  // Calculate recent form (average of last 3 weeks)
  const recentForm = recentStats.length > 0
    ? recentStats.reduce((sum, stat) => sum + (stat.fantasyPoints || 0), 0) / recentStats.length
    : 0;

  // Calculate consistency (coefficient of variation)
  const allRecentPoints = recentStats.map(stat => stat.fantasyPoints || 0);
  const mean = allRecentPoints.reduce((sum, p) => sum + p, 0) / allRecentPoints.length;
  const variance = allRecentPoints.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / allRecentPoints.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = mean > 0 ? Math.max(0, 100 - ((stdDev / mean) * 100)) : 0;

  // Get matchup rating (simplified - would integrate with actual matchup data)
  const matchupRating = await getMatchupRating(player.nflTeam, player.position);

  // Apply strategy weights
  const weights = getStrategyWeights(criteria.strategy, criteria.customWeights);
  
  let score = 0;
  score += projectedPoints * weights.projected;
  score += recentForm * weights.recent;
  score += matchupRating * weights.matchup;
  score += (consistencyScore / 100) * projectedPoints * weights.consistency;

  // Risk assessment
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  const explanation: string[] = [];

  if (player.injuryStatus && player.injuryStatus !== 'HEALTHY') {
    if (criteria.avoidInjured) {
      score *= 0.5; // Significant penalty
      riskLevel = 'high';
      explanation.push(`Injury concern: ${player.injuryStatus}`);
    }
  }

  if (consistencyScore < 30) {
    riskLevel = 'high';
    explanation.push('High volatility player');
  } else if (consistencyScore > 70) {
    riskLevel = 'low';
    explanation.push('Consistent performer');
  }

  if (recentForm > projectedPoints * 1.2) {
    explanation.push('Above projection recently');
  } else if (recentForm < projectedPoints * 0.8) {
    explanation.push('Below projection recently');
  }

  return {
    playerId: player.id,
    position: player.position,
    score,
    projectedPoints,
    recentForm,
    matchupRating,
    consistencyScore,
    riskLevel,
    explanation
  };
}

function getStrategyWeights(strategy: string, customWeights?: any) {
  const defaultWeights = {
    high_ceiling: { projected: 0.3, recent: 0.3, matchup: 0.3, consistency: 0.1 },
    high_floor: { projected: 0.2, recent: 0.2, matchup: 0.2, consistency: 0.4 },
    balanced: { projected: 0.35, recent: 0.25, matchup: 0.25, consistency: 0.15 },
    boom_bust: { projected: 0.5, recent: 0.3, matchup: 0.2, consistency: 0.0 }
  };

  return customWeights || defaultWeights[strategy] || defaultWeights.balanced;
}

async function getMatchupRating(nflTeam: string, position: string): Promise<number> {
  // Simplified matchup rating - in production would use real defensive rankings
  const defensiveRankings: { [key: string]: { [pos: string]: number } } = {
    'DAL': { QB: 85, RB: 70, WR: 60, TE: 75 },
    'NYG': { QB: 75, RB: 80, WR: 70, TE: 65 },
    // Add more teams...
  };

  return defensiveRankings[nflTeam]?.[position] || 75; // Default to average
}

function generateOptimalLineup(
  playerScores: PlayerScore[],
  rosterSettings: any,
  criteria: OptimizationCriteria
): PlayerScore[] {
  const lineup: PlayerScore[] = [];
  const usedPlayers = new Set<string>();

  // Define standard positions
  const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DST'];
  
  for (const positionSlot of positions) {
    let candidates = playerScores.filter(p => 
      !usedPlayers.has(p.playerId) && 
      (p.position === positionSlot || 
       (positionSlot === 'FLEX' && ['RB', 'WR', 'TE'].includes(p.position)))
    );

    // Apply risk filtering
    if (criteria.riskTolerance === 'conservative') {
      candidates = candidates.filter(p => p.riskLevel !== 'high');
    } else if (criteria.riskTolerance === 'moderate') {
      candidates = candidates.filter(p => p.riskLevel !== 'high' || p.score > 20);
    }

    // Select best available player
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0) {
      const selected = candidates[0];
      lineup.push(selected);
      usedPlayers.add(selected.playerId);
    }
  }

  return lineup;
}

function analyzeLineup(lineup: PlayerScore[], criteria: OptimizationCriteria) {
  const totalProjected = lineup.reduce((sum, p) => sum + p.projectedPoints, 0);
  const averageConsistency = lineup.reduce((sum, p) => sum + p.consistencyScore, 0) / lineup.length;
  const highRiskPlayers = lineup.filter(p => p.riskLevel === 'high').length;
  
  let riskAssessment = 'Low';
  if (highRiskPlayers > 2) riskAssessment = 'High';
  else if (highRiskPlayers > 0) riskAssessment = 'Medium';

  return {
    totalProjected: Math.round(totalProjected * 10) / 10,
    averageConsistency: Math.round(averageConsistency),
    riskAssessment,
    ceiling: Math.round((totalProjected * 1.3) * 10) / 10,
    floor: Math.round((totalProjected * 0.7) * 10) / 10,
    recommendedFor: getRecommendedScenarios(lineup, criteria),
    warnings: generateWarnings(lineup)
  };
}

function generateAlternativeLineups(
  playerScores: PlayerScore[],
  rosterSettings: any,
  criteria: OptimizationCriteria
) {
  // Generate 2 alternative lineups with slightly different strategies
  const alternatives = [];
  
  // Conservative alternative
  const conservativeCriteria = { ...criteria, riskTolerance: 'conservative' as const };
  const conservativeLineup = generateOptimalLineup(playerScores, rosterSettings, conservativeCriteria);
  alternatives.push({
    name: 'Conservative',
    lineup: conservativeLineup,
    analysis: analyzeLineup(conservativeLineup, conservativeCriteria)
  });

  // Aggressive alternative
  const aggressiveCriteria = { ...criteria, riskTolerance: 'aggressive' as const };
  const aggressiveLineup = generateOptimalLineup(playerScores, rosterSettings, aggressiveCriteria);
  alternatives.push({
    name: 'High Risk/Reward',
    lineup: aggressiveLineup,
    analysis: analyzeLineup(aggressiveLineup, aggressiveCriteria)
  });

  return alternatives;
}

function calculateConfidenceScore(lineup: PlayerScore[]): number {
  const avgConsistency = lineup.reduce((sum, p) => sum + p.consistencyScore, 0) / lineup.length;
  const avgProjection = lineup.reduce((sum, p) => sum + p.projectedPoints, 0) / lineup.length;
  const riskPenalty = lineup.filter(p => p.riskLevel === 'high').length * 10;
  
  return Math.max(0, Math.min(100, avgConsistency + (avgProjection * 2) - riskPenalty));
}

function getRecommendedScenarios(lineup: PlayerScore[], criteria: OptimizationCriteria): string[] {
  const scenarios = [];
  const totalProjected = lineup.reduce((sum, p) => sum + p.projectedPoints, 0);
  const highCeilingPlayers = lineup.filter(p => p.score > 20).length;
  
  if (totalProjected > 130) scenarios.push('High-scoring week expected');
  if (highCeilingPlayers > 5) scenarios.push('Tournament/DFS style');
  if (criteria.strategy === 'high_floor') scenarios.push('Safe cash game play');
  
  return scenarios;
}

function generateWarnings(lineup: PlayerScore[]): string[] {
  const warnings = [];
  const injuredPlayers = lineup.filter(p => p.explanation.some(e => e.includes('Injury')));
  const volatilePlayers = lineup.filter(p => p.riskLevel === 'high');
  
  if (injuredPlayers.length > 0) {
    warnings.push(`${injuredPlayers.length} player(s) with injury concerns`);
  }
  
  if (volatilePlayers.length > 3) {
    warnings.push('High volatility lineup - consider safer alternatives');
  }
  
  return warnings;
}

function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}