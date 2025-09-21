import { prisma } from '@/lib/db';

// Roster Management Utilities

export interface RosterAnalysis {
  strengthByPosition: { [position: string]: number };
  depthChart: { [position: string]: PlayerDepth[] };
  weaknesses: string[];
  recommendations: string[];
  totalProjected: number;
  benchStrength: number;
  injuryRisk: number;
  byeWeekIssues: { [week: number]: string[] };
}

export interface PlayerDepth {
  playerId: string;
  playerName: string;
  projectedPoints: number;
  rank: number;
  tier: 'starter' | 'backup' | 'depth' | 'waiver';
  injuryStatus?: string;
  byeWeek?: number;
}

export interface TradeAnalysis {
  givingUp: {
    players: any[];
    totalProjected: number;
    positionImpact: { [position: string]: number };
  };
  receiving: {
    players: any[];
    totalProjected: number;
    positionImpact: { [position: string]: number };
  };
  netGain: number;
  rosterBalance: 'improved' | 'neutral' | 'worse';
  recommendation: string;
}

export interface StartSitRecommendation {
  playerId: string;
  playerName: string;
  position: string;
  action: 'start' | 'sit' | 'flex' | 'consider';
  reason: string;
  confidence: number;
  projectedPoints: number;
  alternativeOptions?: string[];
}

/**
 * Analyze a team's roster strength and weaknesses
 */
export async function analyzeRoster(
  teamId: string, 
  week: number = 15, 
  season: number = 2024
): Promise<RosterAnalysis> {
  try {
    // Get team roster with projections
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId },
      include: {
        player: {
          include: {
            projections: {
              where: {
                week,
                season
              },
              orderBy: {
                confidence: 'desc'
              },
              take: 1
            }
          }
        }
      }
    });

    const strengthByPosition: { [position: string]: number } = {};
    const depthChart: { [position: string]: PlayerDepth[] } = {};
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const byeWeekIssues: { [week: number]: string[] } = {};

    // Initialize position groups
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
    positions.forEach(pos => {
      strengthByPosition[pos] = 0;
      depthChart[pos] = [];
    });

    // Analyze each position
    for (const position of positions) {
      const positionPlayers = roster
        .filter(rp => rp.player.position === position)
        .map(rp => ({
          playerId: rp.playerId,
          playerName: rp.player.name,
          projectedPoints: Number(rp.player.projections[0]?.projectedPoints || 0),
          injuryStatus: rp.player.injuryStatus || undefined,
          byeWeek: rp.player.byeWeek || undefined,
          rank: 0,
          tier: 'depth' as 'starter' | 'backup' | 'depth' | 'waiver'
        }))
        .sort((a, b) => b.projectedPoints - a.projectedPoints);

      // Assign ranks and tiers
      positionPlayers.forEach((player, index) => {
        player.rank = index + 1;
        if (index === 0) (player as any).tier = 'starter';
        else if (index === 1) (player as any).tier = 'backup';
        else (player as any).tier = 'depth';
      });

      depthChart[position] = positionPlayers;
      
      // Calculate position strength (top 2 players average)
      const topPlayers = positionPlayers.slice(0, 2);
      strengthByPosition[position] = topPlayers.length > 0 
        ? topPlayers.reduce((sum, p) => sum + p.projectedPoints, 0) / topPlayers.length 
        : 0;

      // Identify weaknesses
      if (positionPlayers.length === 0) {
        weaknesses.push(`No ${position} players on roster`);
      } else if (positionPlayers.length === 1) {
        weaknesses.push(`Lack of depth at ${position}`);
      } else if (strengthByPosition[position] < getPositionThreshold(position)) {
        weaknesses.push(`Below-average production at ${position}`);
      }

      // Check bye week issues
      positionPlayers.forEach(player => {
        if (player.byeWeek) {
          if (!byeWeekIssues[player.byeWeek]) {
            byeWeekIssues[player.byeWeek] = [];
          }
          byeWeekIssues[player.byeWeek].push(`${player.playerName} (${position})`);
        }
      });
    }

    // Generate recommendations
    Object.entries(strengthByPosition).forEach(([position, strength]) => {
      const threshold = getPositionThreshold(position);
      if (strength < threshold * 0.8) {
        recommendations.push(`Consider upgrading ${position} - current strength: ${strength.toFixed(1)}`);
      }
    });

    // Check for bye week conflicts
    Object.entries(byeWeekIssues).forEach(([week, players]) => {
      if (players.length > 1) {
        recommendations.push(`Week ${week} bye week conflict: ${players.join(', ')}`);
      }
    });

    // Calculate total metrics
    const starters = roster.filter(rp => 
      rp.position !== 'BENCH' && 
      rp.position !== 'IR' && 
      rp.position !== 'TAXI'
    );
    
    const bench = roster.filter(rp => rp.position === 'BENCH');
    
    const totalProjected = starters.reduce((sum, rp) => 
      sum + Number(rp.player.projections[0]?.projectedPoints || 0), 0
    );
    
    const benchStrength = bench.length > 0 
      ? bench.reduce((sum, rp) => 
          sum + Number(rp.player.projections[0]?.projectedPoints || 0), 0
        ) / bench.length 
      : 0;

    // Calculate injury risk
    const injuredPlayers = roster.filter(rp => 
      rp.player.injuryStatus && 
      !['Healthy', 'Probable'].includes(rp.player.injuryStatus)
    );
    const injuryRisk = (injuredPlayers.length / roster.length) * 100;

    return {
      strengthByPosition,
      depthChart,
      weaknesses,
      recommendations,
      totalProjected: Math.round(totalProjected * 10) / 10,
      benchStrength: Math.round(benchStrength * 10) / 10,
      injuryRisk: Math.round(injuryRisk * 10) / 10,
      byeWeekIssues
    };

  } catch (error) {
    console.error('Error analyzing roster:', error);
    throw new Error('Failed to analyze roster');
  }
}

/**
 * Generate start/sit recommendations for a specific week
 */
export async function generateStartSitRecommendations(
  teamId: string,
  week: number = 15,
  season: number = 2024
): Promise<StartSitRecommendation[]> {
  try {
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId },
      include: {
        player: {
          include: {
            projections: {
              where: { week, season },
              orderBy: { confidence: 'desc' },
              take: 1
            },
            playerStats: {
              where: { season, week: { lte: week } },
              orderBy: { week: 'desc' },
              take: 3 // Last 3 games for trend analysis
            }
          }
        }
      }
    });

    const recommendations: StartSitRecommendation[] = [];

    // Group by position for comparison
    const positionGroups: { [position: string]: any[] } = {};
    roster.forEach(rp => {
      const position = rp.player.position;
      if (!positionGroups[position]) {
        positionGroups[position] = [];
      }
      positionGroups[position].push(rp);
    });

    // Generate recommendations for each position
    Object.entries(positionGroups).forEach(([position, players]) => {
      const sortedPlayers = players
        .map(rp => ({
          ...rp,
          projectedPoints: Number(rp.player.projections[0]?.projectedPoints || 0),
          avgRecent: calculateRecentAverage(rp.player.stats),
          trend: calculateTrend(rp.player.stats)
        }))
        .sort((a, b) => b.projectedPoints - a.projectedPoints);

      sortedPlayers.forEach((player, index) => {
        let action: 'start' | 'sit' | 'flex' | 'consider' = 'sit';
        let reason = '';
        let confidence = 0.5;

        const isInjured = player.player.injuryStatus && 
          !['Healthy', 'Probable'].includes(player.player.injuryStatus);
        const isByeWeek = player.player.byeWeek === week;

        if (isByeWeek) {
          action = 'sit';
          reason = 'Player is on bye week';
          confidence = 1.0;
        } else if (isInjured) {
          action = 'sit';
          reason = `Injury concern: ${player.player.injuryStatus}`;
          confidence = 0.9;
        } else if (index === 0 && player.projectedPoints > getPositionThreshold(position)) {
          action = 'start';
          reason = `Top projected ${position} with ${player.projectedPoints.toFixed(1)} points`;
          confidence = 0.9;
        } else if (index === 0) {
          action = 'start';
          reason = `Best available ${position} option`;
          confidence = 0.7;
        } else if (index === 1 && ['RB', 'WR', 'TE'].includes(position)) {
          action = 'flex';
          reason = `Strong FLEX candidate with ${player.projectedPoints.toFixed(1)} points`;
          confidence = 0.6;
        } else if (player.projectedPoints > player.avgRecent * 1.2) {
          action = 'consider';
          reason = 'Projected to outperform recent average';
          confidence = 0.6;
        } else {
          action = 'sit';
          reason = index === 1 ? 'Solid backup option' : 'Deep bench player';
          confidence = 0.8;
        }

        // Find alternative options for starters
        let alternativeOptions: string[] = [];
        if (action === 'start' || action === 'flex') {
          const alternatives = sortedPlayers
            .filter((_, i) => i !== index && i < 3)
            .map(alt => alt.player.name);
          alternativeOptions = alternatives;
        }

        recommendations.push({
          playerId: player.playerId,
          playerName: player.player.name,
          position,
          action,
          reason,
          confidence,
          projectedPoints: player.projectedPoints,
          alternativeOptions: alternativeOptions.length > 0 ? alternativeOptions : undefined
        });
      });
    });

    return recommendations.sort((a, b) => {
      const actionOrder = { start: 0, flex: 1, consider: 2, sit: 3 };
      return actionOrder[a.action] - actionOrder[b.action];
    });

  } catch (error) {
    console.error('Error generating start/sit recommendations:', error);
    throw new Error('Failed to generate recommendations');
  }
}

/**
 * Analyze a potential trade
 */
export async function analyzeTradeImpact(
  teamId: string,
  givingUpPlayerIds: string[],
  receivingPlayerIds: string[],
  week: number = 15
): Promise<TradeAnalysis> {
  try {
    // Get players being given up
    const givingUpPlayers = await prisma.player.findMany({
      where: { id: { in: givingUpPlayerIds } },
      include: {
        projections: {
          where: { week, season: 2024 },
          take: 1,
          orderBy: { confidence: 'desc' }
        }
      }
    });

    // Get players being received
    const receivingPlayers = await prisma.player.findMany({
      where: { id: { in: receivingPlayerIds } },
      include: {
        projections: {
          where: { week, season: 2024 },
          take: 1,
          orderBy: { confidence: 'desc' }
        }
      }
    });

    // Calculate giving up impact
    const givingUpTotal = givingUpPlayers.reduce((sum, player) => 
      sum + Number(player.projections[0]?.projectedPoints || 0), 0
    );

    const givingUpByPosition: { [position: string]: number } = {};
    givingUpPlayers.forEach(player => {
      const pos = player.position;
      givingUpByPosition[pos] = (givingUpByPosition[pos] || 0) + 
        Number(player.projections[0]?.projectedPoints || 0);
    });

    // Calculate receiving impact
    const receivingTotal = receivingPlayers.reduce((sum, player) => 
      sum + Number(player.projections[0]?.projectedPoints || 0), 0
    );

    const receivingByPosition: { [position: string]: number } = {};
    receivingPlayers.forEach(player => {
      const pos = player.position;
      receivingByPosition[pos] = (receivingByPosition[pos] || 0) + 
        Number(player.projections[0]?.projectedPoints || 0);
    });

    const netGain = receivingTotal - givingUpTotal;
    
    let rosterBalance: 'improved' | 'neutral' | 'worse' = 'neutral';
    if (netGain > 2) rosterBalance = 'improved';
    else if (netGain < -2) rosterBalance = 'worse';

    // Generate recommendation
    let recommendation = '';
    if (netGain > 5) {
      recommendation = 'Excellent trade - significant point upgrade';
    } else if (netGain > 2) {
      recommendation = 'Good trade - solid point improvement';
    } else if (netGain > -2) {
      recommendation = 'Neutral trade - consider other factors';
    } else if (netGain > -5) {
      recommendation = 'Poor trade - losing projected points';
    } else {
      recommendation = 'Terrible trade - major point downgrade';
    }

    return {
      givingUp: {
        players: givingUpPlayers,
        totalProjected: Math.round(givingUpTotal * 10) / 10,
        positionImpact: givingUpByPosition
      },
      receiving: {
        players: receivingPlayers,
        totalProjected: Math.round(receivingTotal * 10) / 10,
        positionImpact: receivingByPosition
      },
      netGain: Math.round(netGain * 10) / 10,
      rosterBalance,
      recommendation
    };

  } catch (error) {
    console.error('Error analyzing trade:', error);
    throw new Error('Failed to analyze trade');
  }
}

// Helper Functions

function getPositionThreshold(position: string): number {
  // Average weekly points thresholds for fantasy relevance
  const thresholds: { [position: string]: number } = {
    QB: 18,
    RB: 12,
    WR: 10,
    TE: 8,
    K: 8,
    DST: 8
  };
  return thresholds[position] || 5;
}

function calculateRecentAverage(stats: any[]): number {
  if (stats.length === 0) return 0;
  const total = stats.reduce((sum, stat) => sum + Number(stat.fantasyPoints || 0), 0);
  return total / stats.length;
}

function calculateTrend(stats: any[]): 'up' | 'down' | 'stable' {
  if (stats.length < 2) return 'stable';
  
  const recent = Number(stats[0]?.fantasyPoints || 0);
  const previous = Number(stats[1]?.fantasyPoints || 0);
  
  if (recent > previous * 1.1) return 'up';
  if (recent < previous * 0.9) return 'down';
  return 'stable';
}

/**
 * Get optimal FLEX options from RB/WR/TE
 */
export async function getFlexOptions(
  teamId: string, 
  week: number = 15,
  excludeStarters: string[] = []
): Promise<any[]> {
  try {
    const flexEligible = await prisma.rosterPlayer.findMany({
      where: {
        teamId,
        playerId: { notIn: excludeStarters },
        player: {
          position: { in: ['RB', 'WR', 'TE'] }
        }
      },
      include: {
        player: {
          include: {
            projections: {
              where: { week, season: 2024 },
              take: 1,
              orderBy: { confidence: 'desc' }
            }
          }
        }
      }
    });

    return flexEligible
      .map(rp => ({
        ...rp,
        projectedPoints: Number(rp.player.projections[0]?.projectedPoints || 0)
      }))
      .sort((a, b) => b.projectedPoints - a.projectedPoints);

  } catch (error) {
    console.error('Error getting FLEX options:', error);
    return [];
  }
}