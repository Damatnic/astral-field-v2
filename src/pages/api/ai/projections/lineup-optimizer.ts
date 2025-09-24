import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { aiProjectionEngine } from '@/lib/ai/player-projections';

interface LineupOptimizationRequest {
  teamId: string;
  week: number;
  season?: number;
  strategy?: 'balanced' | 'high_ceiling' | 'high_floor' | 'contrarian';
}

interface OptimizedLineup {
  QB: string[];
  RB: string[];
  WR: string[];
  TE: string[];
  FLEX: string[];
  K: string[];
  DEF: string[];
  bench: string[];
  totalProjectedPoints: number;
  confidence: number;
  insights: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { teamId, week, season = new Date().getFullYear(), strategy = 'balanced' } = req.body as LineupOptimizationRequest;

    if (!teamId || !week) {
      return res.status(400).json({ error: 'Team ID and week are required' });
    }

    // Verify user owns this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        roster: {
          include: {
            player: true
          }
        },
        league: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!team || team.ownerId !== session.user.id) {
      return res.status(403).json({ error: 'You do not own this team' });
    }

    // Get projections for all players on roster
    const projectionPromises = team.roster
      .filter(rosterSpot => rosterSpot.player)
      .map(async (rosterSpot) => {
        const projection = await aiProjectionEngine.generateProjections(
          rosterSpot.playerId!,
          week,
          season
        );
        return {
          ...projection,
          player: rosterSpot.player,
          position: rosterSpot.player?.position
        };
      });

    const projections = await Promise.all(projectionPromises);

    // Sort projections by position and projected points
    const positionGroups = groupByPosition(projections);
    
    // Optimize lineup based on strategy
    const optimizedLineup = optimizeLineup(positionGroups, team.league.settings, strategy);

    // Calculate total projected points
    const totalProjectedPoints = calculateTotalPoints(optimizedLineup, projections);
    
    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(optimizedLineup, projections);

    // Generate lineup insights
    const insights = generateLineupInsights(optimizedLineup, projections, strategy);

    const response: OptimizedLineup = {
      ...optimizedLineup,
      totalProjectedPoints: Math.round(totalProjectedPoints * 10) / 10,
      confidence: overallConfidence,
      insights
    };

    return res.status(200).json({
      success: true,
      optimizedLineup: response,
      week,
      season,
      strategy
    });

  } catch (error) {
    console.error('Error optimizing lineup:', error);
    return res.status(500).json({
      error: 'Failed to optimize lineup'
    });
  }
}

function groupByPosition(projections: any[]): { [key: string]: any[] } {
  const groups: { [key: string]: any[] } = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
    DEF: []
  };

  projections.forEach(proj => {
    const position = proj.position;
    if (groups[position]) {
      groups[position].push(proj);
    }
  });

  // Sort each position by projected points (descending)
  Object.keys(groups).forEach(pos => {
    groups[pos].sort((a, b) => b.projectedPoints - a.projectedPoints);
  });

  return groups;
}

function optimizeLineup(
  positionGroups: { [key: string]: any[] },
  leagueSettings: any,
  strategy: string
): Omit<OptimizedLineup, 'totalProjectedPoints' | 'confidence' | 'insights'> {
  const lineup: any = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    FLEX: [],
    K: [],
    DEF: [],
    bench: []
  };

  // Get roster requirements from league settings
  const requirements = leagueSettings?.rosterRequirements || {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DEF: 1
  };

  const usedPlayerIds = new Set<string>();

  // Fill required positions first
  Object.keys(requirements).forEach(position => {
    if (position === 'FLEX') return; // Handle FLEX last
    
    const count = requirements[position];
    const available = positionGroups[position] || [];
    
    for (let i = 0; i < count && i < available.length; i++) {
      const player = selectPlayerByStrategy(available, strategy, i, usedPlayerIds);
      if (player) {
        lineup[position].push(player.playerId);
        usedPlayerIds.add(player.playerId);
      }
    }
  });

  // Fill FLEX position
  if (requirements.FLEX > 0) {
    const flexEligible = [
      ...positionGroups.RB.filter(p => !usedPlayerIds.has(p.playerId)),
      ...positionGroups.WR.filter(p => !usedPlayerIds.has(p.playerId)),
      ...positionGroups.TE.filter(p => !usedPlayerIds.has(p.playerId))
    ];
    
    flexEligible.sort((a, b) => b.projectedPoints - a.projectedPoints);
    
    for (let i = 0; i < requirements.FLEX && i < flexEligible.length; i++) {
      const player = selectPlayerByStrategy(flexEligible, strategy, i, usedPlayerIds);
      if (player) {
        lineup.FLEX.push(player.playerId);
        usedPlayerIds.add(player.playerId);
      }
    }
  }

  // Add remaining players to bench
  Object.values(positionGroups).forEach(players => {
    players.forEach(player => {
      if (!usedPlayerIds.has(player.playerId)) {
        lineup.bench.push(player.playerId);
      }
    });
  });

  return lineup;
}

function selectPlayerByStrategy(
  players: any[], 
  strategy: string, 
  index: number,
  usedPlayerIds: Set<string>
): any {
  const available = players.filter(p => !usedPlayerIds.has(p.playerId));
  if (available.length === 0) return null;

  switch (strategy) {
    case 'high_ceiling':
      // Prioritize players with high breakout potential
      available.sort((a, b) => {
        const ceilingA = a.projectedPoints * (1 + (100 - a.confidence) / 100);
        const ceilingB = b.projectedPoints * (1 + (100 - b.confidence) / 100);
        return ceilingB - ceilingA;
      });
      break;

    case 'high_floor':
      // Prioritize consistent, low-risk players
      available.sort((a, b) => {
        const floorA = a.projectedPoints * (a.confidence / 100) * (a.riskLevel === 'low' ? 1.2 : a.riskLevel === 'medium' ? 1 : 0.8);
        const floorB = b.projectedPoints * (b.confidence / 100) * (b.riskLevel === 'low' ? 1.2 : b.riskLevel === 'medium' ? 1 : 0.8);
        return floorB - floorA;
      });
      break;

    case 'contrarian':
      // Mix in some lower-owned, high-upside players
      if (index > 0 && index % 2 === 0) {
        // Every other slot, pick a contrarian play
        available.sort((a, b) => {
          const contrA = (a.projectedPoints / a.confidence) * (a.riskLevel === 'high' ? 1.5 : 1);
          const contrB = (b.projectedPoints / b.confidence) * (b.riskLevel === 'high' ? 1.5 : 1);
          return contrB - contrA;
        });
      }
      break;

    case 'balanced':
    default:
      // Already sorted by projected points
      break;
  }

  return available[0];
}

function calculateTotalPoints(lineup: any, projections: any[]): number {
  let total = 0;
  const projectionMap = new Map(projections.map(p => [p.playerId, p]));

  // Sum up all starting positions (not bench)
  ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'].forEach(position => {
    const playerIds = lineup[position] || [];
    playerIds.forEach((playerId: string) => {
      const projection = projectionMap.get(playerId);
      if (projection) {
        total += projection.projectedPoints;
      }
    });
  });

  return total;
}

function calculateOverallConfidence(lineup: any, projections: any[]): number {
  const projectionMap = new Map(projections.map(p => [p.playerId, p]));
  const confidences: number[] = [];

  ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'].forEach(position => {
    const playerIds = lineup[position] || [];
    playerIds.forEach((playerId: string) => {
      const projection = projectionMap.get(playerId);
      if (projection) {
        confidences.push(projection.confidence);
      }
    });
  });

  if (confidences.length === 0) return 50;
  
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  return Math.round(avgConfidence);
}

function generateLineupInsights(lineup: any, projections: any[], strategy: string): string[] {
  const insights: string[] = [];
  const projectionMap = new Map(projections.map(p => [p.playerId, p]));

  // Strategy insight
  const strategyDescriptions: { [key: string]: string } = {
    balanced: '⚖️ Balanced lineup optimized for consistent scoring',
    high_ceiling: '🚀 High-ceiling lineup with boom potential',
    high_floor: '🛡️ Safe lineup with reliable floor',
    contrarian: '🎲 Contrarian lineup for tournament play'
  };
  insights.push(strategyDescriptions[strategy] || strategyDescriptions.balanced);

  // Check for high-risk plays
  const riskyPlayers = ['QB', 'RB', 'WR', 'TE', 'FLEX'].flatMap(pos => lineup[pos] || [])
    .map((id: string) => projectionMap.get(id))
    .filter(p => p?.riskLevel === 'high');
  
  if (riskyPlayers.length > 0) {
    insights.push(`⚠️ ${riskyPlayers.length} high-risk player(s) in starting lineup`);
  }

  // Check for injured players
  const injuredPlayers = ['QB', 'RB', 'WR', 'TE', 'FLEX'].flatMap(pos => lineup[pos] || [])
    .map((id: string) => projectionMap.get(id))
    .filter(p => p?.factors.injuryStatus < 1);
  
  if (injuredPlayers.length > 0) {
    insights.push(`🤕 ${injuredPlayers.length} player(s) with injury concerns`);
  }

  // Identify top performers
  const topPerformers = projections
    .filter(p => p.recommendation === 'start')
    .slice(0, 3);
  
  if (topPerformers.length > 0) {
    insights.push(`⭐ Top performers projected this week`);
  }

  // Weather concerns
  const weatherImpacted = projections
    .filter(p => p.factors?.weatherImpact < 0.9);
  
  if (weatherImpacted.length > 0) {
    insights.push(`🌧️ ${weatherImpacted.length} player(s) may be affected by weather`);
  }

  return insights;
}