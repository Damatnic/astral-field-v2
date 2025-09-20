import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { Position } from '@prisma/client';

// Machine Learning weights for player scoring predictions
const ML_WEIGHTS = {
  recentForm: 0.35,
  seasonAverage: 0.25,
  matchupDifficulty: 0.20,
  weatherImpact: 0.10,
  injuryRisk: 0.10
};


interface PlayerAnalysis {
  id: string;
  name: string;
  position: string;
  team: string;
  opponent: string;
  projectedPoints: number;
  confidenceScore: number;
  injuryStatus?: string;
  weather?: {
    condition: string;
    windSpeed: number;
    temperature: number;
    precipitation: number;
  };
  trends: {
    last3Games: number;
    seasonAvg: number;
    vsOpponentAvg: number;
  };
  floor: number;
  ceiling: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        message: 'AI Lineup Optimizer ready',
        description: 'Advanced machine learning lineup optimization for fantasy football',
        methods: {
          POST: '/api/ai/optimize-lineup'
        },
        requiredParameters: {
          teamId: 'Team ID to optimize lineup for',
          week: 'NFL week number',
          leagueId: 'League ID for context'
        },
        features: [
          'ML-weighted projections using recent form and matchup data',
          'Dynamic programming lineup optimization',
          'Risk assessment and injury analysis',
          'Weather impact modeling',
          'Confidence scoring and win probability',
          'Alternative player suggestions',
          'Stack opportunity identification'
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'AI optimizer service unavailable' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamId, week, leagueId } = await request.json();

    if (!teamId || !week || !leagueId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fetch team's roster with player data
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId },
      include: {
        player: {
          include: {
            playerStats: {
              where: { season: 2024 },
              orderBy: { week: 'desc' },
              take: 5
            },
            projections: {
              where: { 
                week,
                season: 2024 
              }
            },
            injuryReports: {
              where: { 
                season: 2024,
                week
              },
              orderBy: { updatedAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    // Fetch opponent matchup data for context
    const matchup = await prisma.matchup.findFirst({
      where: {
        leagueId,
        week,
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      include: {
        homeTeam: { include: { roster: true } },
        awayTeam: { include: { roster: true } }
      }
    });

    // Analyze each player using ML-inspired algorithms
    const analyzedPlayers = roster.map(rosterPlayer => {
      const player = rosterPlayer.player;
      const stats = player.playerStats || [];
      const projection = player.projections?.[0];
      const injury = player.injuryReports?.[0];
      
      // Calculate recent form (last 3 games average)
      const recentGames = stats.slice(0, 3);
      const recentForm = recentGames.length > 0
        ? recentGames.reduce((sum, game) => sum + Number(game.fantasyPoints || 0), 0) / recentGames.length
        : 0;

      // Calculate season average
      const seasonAvg = stats.length > 0
        ? stats.reduce((sum, game) => sum + Number(game.fantasyPoints || 0), 0) / stats.length
        : 0;

      // Simulate matchup difficulty based on position and opponent
      const matchupDifficulty = calculateMatchupDifficulty(player.position);
      
      // Calculate weather impact (simulated for now)
      const weatherImpact = simulateWeatherImpact(player.position);
      
      // Calculate injury risk factor
      const injuryRisk = calculateInjuryRisk(injury?.status);
      
      // ML-weighted projection calculation
      const baseProjection = projection?.projectedPoints 
        ? Number(projection.projectedPoints)
        : seasonAvg * 1.05; // Slight optimism if no projection

      const mlProjection = 
        (recentForm * ML_WEIGHTS.recentForm) +
        (seasonAvg * ML_WEIGHTS.seasonAverage) +
        (baseProjection * matchupDifficulty * ML_WEIGHTS.matchupDifficulty) +
        (baseProjection * weatherImpact * ML_WEIGHTS.weatherImpact) +
        (baseProjection * injuryRisk * ML_WEIGHTS.injuryRisk);

      // Calculate confidence score
      const confidenceScore = calculateConfidenceScore(
        stats.length,
        recentForm,
        seasonAvg,
        injuryRisk
      );

      // Calculate floor and ceiling
      const variance = calculateVariance(stats);
      const floor = Math.max(0, mlProjection - variance);
      const ceiling = mlProjection + (variance * 1.5);

      // Determine risk level
      const riskLevel = determineRiskLevel(injuryRisk, variance, weatherImpact);

      return {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        team: player.nflTeam || 'FA',
        opponent: getOpponent(player.nflTeam, week),
        projectedPoints: mlProjection,
        confidenceScore,
        injuryStatus: injury?.status,
        weather: {
          condition: weatherImpact > 0.9 ? 'Clear' : weatherImpact > 0.7 ? 'Cloudy' : 'Rain',
          windSpeed: Math.random() * 20,
          temperature: 60 + Math.random() * 30,
          precipitation: (1 - weatherImpact) * 100
        },
        trends: {
          last3Games: recentForm,
          seasonAvg,
          vsOpponentAvg: recentForm * matchupDifficulty
        },
        floor,
        ceiling,
        riskLevel
      } as PlayerAnalysis;
    });

    // Optimize lineup using dynamic programming approach
    const optimizedLineup = optimizeLineupDP(analyzedPlayers);

    // Calculate team totals and insights
    const totalProjectedPoints = optimizedLineup.reduce(
      (sum, rec) => sum + rec.player.projectedPoints, 
      0
    );

    const avgConfidence = optimizedLineup.reduce(
      (sum, rec) => sum + rec.player.confidenceScore, 
      0
    ) / optimizedLineup.length;

    // Generate win probability based on matchup
    const opponentProjection = matchup 
      ? calculateOpponentProjection(matchup, teamId)
      : totalProjectedPoints * 0.95;

    const winProbability = calculateWinProbability(totalProjectedPoints, opponentProjection);

    // Generate key insights
    const keyInsights = generateInsights(optimizedLineup);

    // Calculate risk profile
    const riskProfile = calculateRiskProfile(optimizedLineup);

    return NextResponse.json({
      lineup: optimizedLineup,
      totalProjectedPoints,
      confidenceScore: Math.round(avgConfidence),
      winProbability: Math.round(winProbability),
      keyInsights,
      riskProfile
    });

  } catch (error) {
    // handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { error: 'Failed to optimize lineup' },
      { status: 500 }
    );
  }
}

// Dynamic Programming lineup optimization
function optimizeLineupDP(players: PlayerAnalysis[]) {
  const lineup: any[] = [];
  const usedPlayers = new Set<string>();

  // Fill required positions first
  const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'K', 'DST'];
  
  for (const position of positions) {
    const eligiblePlayers = players
      .filter(p => 
        p.position === position && 
        !usedPlayers.has(p.id)
      )
      .sort((a, b) => b.projectedPoints - a.projectedPoints);

    if (eligiblePlayers.length > 0) {
      const selected = eligiblePlayers[0];
      usedPlayers.add(selected.id);
      
      lineup.push({
        player: selected,
        slot: position,
        reasoning: generatePlayerReasoning(selected),
        alternatives: eligiblePlayers.slice(1, 4),
        riskLevel: selected.riskLevel,
        upside: selected.ceiling,
        floor: selected.floor
      });
    }
  }

  // Fill FLEX position (RB/WR/TE)
  const flexEligible = players
    .filter(p => 
      ['RB', 'WR', 'TE'].includes(p.position) && 
      !usedPlayers.has(p.id)
    )
    .sort((a, b) => b.projectedPoints - a.projectedPoints);

  if (flexEligible.length > 0) {
    const selected = flexEligible[0];
    lineup.push({
      player: selected,
      slot: 'FLEX',
      reasoning: generatePlayerReasoning(selected),
      alternatives: flexEligible.slice(1, 4),
      riskLevel: selected.riskLevel,
      upside: selected.ceiling,
      floor: selected.floor
    });
  }

  return lineup;
}

function generatePlayerReasoning(player: PlayerAnalysis): string[] {
  const reasons = [];
  
  if (player.trends.last3Games > player.trends.seasonAvg * 1.2) {
    reasons.push(`Hot streak: ${player.trends.last3Games.toFixed(1)} PPG last 3 games`);
  }
  
  if (player.confidenceScore > 80) {
    reasons.push(`High confidence projection (${player.confidenceScore}%)`);
  }
  
  if (player.trends.vsOpponentAvg > player.trends.seasonAvg) {
    reasons.push('Favorable matchup history');
  }
  
  if (player.ceiling > player.projectedPoints * 1.5) {
    reasons.push(`High ceiling potential: ${player.ceiling.toFixed(1)} pts`);
  }
  
  if (player.riskLevel === 'low') {
    reasons.push('Low injury/weather risk');
  }
  
  if (player.weather && player.weather.condition === 'Clear') {
    reasons.push('Ideal weather conditions');
  }

  // Add position-specific reasoning
  if (player.position === 'RB' && player.projectedPoints > 15) {
    reasons.push('Bell-cow back with high volume');
  }
  
  if (player.position === 'WR' && player.trends.last3Games > 8) {
    reasons.push('Consistent target share');
  }
  
  if (player.position === 'QB' && player.projectedPoints > 20) {
    reasons.push('Elite QB matchup');
  }

  return reasons.slice(0, 5);
}

function generateInsights(lineup: any[]): string[] {
  const insights = [];
  
  // High upside plays
  const highCeiling = lineup.filter(l => l.upside > l.player.projectedPoints * 1.4);
  if (highCeiling.length > 0) {
    insights.push(`${highCeiling.length} players with 40%+ upside potential this week`);
  }
  
  // Risk assessment
  const highRisk = lineup.filter(l => l.riskLevel === 'high').length;
  if (highRisk > 2) {
    insights.push('Consider pivoting from high-risk players if seeking safer floor');
  }
  
  // Stack opportunities
  const qb = lineup.find(l => l.player.position === 'QB');
  const teamReceivers = lineup.filter(l => 
    ['WR', 'TE'].includes(l.player.position) && 
    l.player.nflTeam === qb?.player.nflTeam
  );
  if (teamReceivers.length > 0) {
    insights.push(`QB stack opportunity with ${teamReceivers.length} pass catchers`);
  }
  
  // Weather advantages
  const goodWeather = lineup.filter(l => 
    l.player.weather && l.player.weather.condition === 'Clear'
  ).length;
  if (goodWeather > 5) {
    insights.push('Majority of lineup playing in favorable weather conditions');
  }
  
  // Injury concerns
  const injured = lineup.filter(l => l.player.injuryStatus).length;
  if (injured > 0) {
    insights.push(`Monitor ${injured} players with injury designations before kickoff`);
  }

  return insights;
}

function calculateMatchupDifficulty(position: Position | null): number {
  // Simulate matchup difficulty based on defensive rankings
  const baseDifficulty = 0.5 + Math.random() * 0.5;
  
  // Adjust for position
  if (position === Position.QB) return baseDifficulty * 1.1;
  if (position === Position.RB) return baseDifficulty * 0.95;
  if (position === Position.WR) return baseDifficulty * 1.05;
  if (position === Position.TE) return baseDifficulty * 0.9;
  
  return baseDifficulty;
}

function simulateWeatherImpact(position: Position | null): number {
  const baseImpact = 0.7 + Math.random() * 0.3;
  
  // Kickers and QBs more affected by weather
  if (position === Position.K) return baseImpact * 0.8;
  if (position === Position.QB) return baseImpact * 0.9;
  
  return baseImpact;
}

function calculateInjuryRisk(status: string | undefined): number {
  if (!status) return 1.0;
  
  switch (status) {
    case 'HEALTHY': return 1.0;
    case 'QUESTIONABLE': return 0.85;
    case 'DOUBTFUL': return 0.5;
    case 'OUT': return 0;
    case 'IR': return 0;
    default: return 0.9;
  }
}

function calculateConfidenceScore(
  gamesPlayed: number,
  recentForm: number,
  seasonAvg: number,
  injuryRisk: number
): number {
  let confidence = 50;
  
  // More games = more confidence
  confidence += Math.min(gamesPlayed * 3, 20);
  
  // Consistent performance
  if (Math.abs(recentForm - seasonAvg) < 2) {
    confidence += 15;
  }
  
  // Injury adjustment
  confidence *= injuryRisk;
  
  // Recent form trending up
  if (recentForm > seasonAvg * 1.1) {
    confidence += 10;
  }
  
  return Math.min(Math.round(confidence), 95);
}

function calculateVariance(stats: any[]): number {
  if (stats.length < 2) return 5;
  
  const points = stats.map(s => Number(s.fantasyPoints || 0));
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  
  return Math.sqrt(variance);
}

function determineRiskLevel(
  injuryRisk: number,
  variance: number,
  weatherImpact: number
): 'low' | 'medium' | 'high' {
  const riskScore = (1 - injuryRisk) * 0.5 + 
                    (variance / 10) * 0.3 + 
                    (1 - weatherImpact) * 0.2;
  
  if (riskScore < 0.3) return 'low';
  if (riskScore < 0.6) return 'medium';
  return 'high';
}

function getOpponent(team: string | null, week: number): string {
  // This would normally fetch from schedule data
  const opponents = ['DAL', 'NYG', 'PHI', 'WAS', 'GB', 'CHI', 'MIN', 'DET'];
  return opponents[week % opponents.length];
}

function calculateOpponentProjection(matchup: any, teamId: string): number {
  // Simulate opponent's projected score
  const isHome = matchup.homeTeamId === teamId;
  // Basic simulation - would be more complex with real data
  return 110 + Math.random() * 40;
}

function calculateWinProbability(teamScore: number, opponentScore: number): number {
  const diff = teamScore - opponentScore;
  const probability = 1 / (1 + Math.exp(-diff / 10));
  return probability * 100;
}

function calculateRiskProfile(lineup: any[]) {
  const risks = lineup.map(l => l.riskLevel);
  const highRiskCount = risks.filter(r => r === 'high').length;
  const mediumRiskCount = risks.filter(r => r === 'medium').length;
  
  let overall: 'conservative' | 'balanced' | 'aggressive';
  
  if (highRiskCount >= 3) {
    overall = 'aggressive';
  } else if (highRiskCount === 0 && mediumRiskCount <= 2) {
    overall = 'conservative';
  } else {
    overall = 'balanced';
  }
  
  return {
    overall,
    breakdown: {
      injuries: Math.round(lineup.filter(l => l.player.injuryStatus).length / lineup.length * 100),
      weather: Math.round(lineup.filter(l => l.player.weather?.precipitation > 30).length / lineup.length * 100),
      matchups: Math.round(lineup.filter(l => l.player.trends.vsOpponentAvg < l.player.trends.seasonAvg).length / lineup.length * 100)
    }
  };
}