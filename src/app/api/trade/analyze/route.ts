import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Return available trade analysis endpoints and current user info
    return NextResponse.json({
      success: true,
      data: {
        message: 'Trade analyzer ready',
        userId: user.id,
        endpoints: {
          analyze: '/api/trade/analyze (POST)',
          description: 'Analyzes proposed trades with comprehensive metrics'
        },
        requiredParameters: {
          tradeItems: 'Array of trade items',
          teamIds: 'Array of 2 team IDs',
          leagueId: 'League ID for analysis',
          scoring: 'Optional: standard/ppr (default: standard)',
          timeframe: 'Optional: season/playoffs (default: season)'
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Trade analyzer service unavailable' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      tradeItems, 
      teamIds, 
      leagueId,
      scoring = 'standard',
      timeframe = 'season' 
    } = await request.json();

    if (!tradeItems || !Array.isArray(tradeItems) || tradeItems.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'tradeItems array is required' 
      }, { status: 400 });
    }

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length !== 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'teamIds array with exactly 2 team IDs is required' 
      }, { status: 400 });
    }

    if (!leagueId) {
      return NextResponse.json({ 
        success: false, 
        error: 'leagueId is required' 
      }, { status: 400 });
    }

    // Verify user has access to analyze this league
    const leagueMember = await prisma.leagueMember.findFirst({
      where: {
        userId: user.id,
        leagueId: leagueId
      }
    });

    if (!leagueMember) {
      return NextResponse.json({
        success: false,
        error: 'Access denied - not a league member'
      }, { status: 403 });
    }

    // Get teams with current rosters (fixed schema reference)
    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        leagueId: leagueId
      },
      include: {
        roster: {
          include: {
            player: {
              include: {
                playerStats: {
                  where: {
                    season: new Date().getFullYear(),
                    isProjected: false
                  },
                  orderBy: {
                    week: 'desc'
                  },
                  take: 10
                },
                projections: {
                  where: {
                    season: new Date().getFullYear(),
                    week: getCurrentWeek()
                  },
                  orderBy: {
                    confidence: 'desc'
                  },
                  take: 1
                }
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (teams.length !== 2) {
      return NextResponse.json({
        success: false,
        error: 'Teams not found in specified league'
      }, { status: 404 });
    }

    // Extract player IDs from trade items
    const playerIds = tradeItems
      .filter(item => item.playerId && item.itemType === 'PLAYER')
      .map(item => item.playerId);

    // Get detailed player analysis
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds }
      },
      include: {
        playerStats: {
          where: {
            season: new Date().getFullYear(),
            isProjected: false
          },
          orderBy: {
            week: 'desc'
          },
          take: 17 // Full season
        },
        projections: {
          where: {
            season: new Date().getFullYear(),
            week: {
              gte: getCurrentWeek(),
              lte: 17
            }
          },
          orderBy: [
            { week: 'asc' },
            { confidence: 'desc' }
          ]
        },
        playerNews: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 3
        }
      }
    });

    // Calculate comprehensive player analysis
    const playerAnalysis = players.map(player => {
      const seasonStats = player.playerStats;
      const recentStats = seasonStats.slice(0, 5);
      
      const totalPoints = seasonStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0);
      const avgPoints = seasonStats.length > 0 ? totalPoints / seasonStats.length : 0;
      
      const recentPoints = recentStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0);
      const recentAvg = recentStats.length > 0 ? recentPoints / recentStats.length : 0;
      
      // Rest of season projections
      const rosProjections = player.projections.slice(0, 17 - getCurrentWeek());
      const rosProjectedTotal = rosProjections.reduce((sum, proj) => sum + (proj.projectedPoints?.toNumber() || 0), 0);
      
      // Calculate various metrics
      const metrics = calculatePlayerMetrics(player, seasonStats, rosProjections);
      
      return {
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        status: player.status,
        injuryStatus: player.injuryStatus,
        byeWeek: player.byeWeek,
        
        performance: {
          seasonTotal: totalPoints,
          seasonAverage: avgPoints,
          recentAverage: recentAvg,
          gamesPlayed: seasonStats.length,
          highGame: Math.max(...seasonStats.map(stat => stat.fantasyPoints?.toNumber() || 0)),
          lowGame: seasonStats.length > 0 ? Math.min(...seasonStats.map(stat => stat.fantasyPoints?.toNumber() || 0)) : 0
        },
        
        projections: {
          restOfSeason: rosProjectedTotal,
          averageROS: rosProjections.length > 0 ? rosProjectedTotal / rosProjections.length : 0,
          weeksRemaining: rosProjections.length
        },
        
        metrics: metrics,
        
        rankings: {
          positionRank: calculatePositionRank(player.position, avgPoints),
          tradeValue: calculateTradeValue(avgPoints, recentAvg, rosProjectedTotal, metrics.consistency, player.position)
        },
        
        riskFactors: assessRiskFactors(player, seasonStats, rosProjections)
      };
    });

    // Analyze the actual trade
    const tradeAnalysis = analyzeTradeItems(tradeItems, playerAnalysis, teams);
    
    // Calculate team impacts
    const teamImpacts = calculateTeamImpacts(tradeItems, teams, playerAnalysis);
    
    // Generate overall recommendation
    const recommendation = generateDetailedRecommendation(tradeAnalysis, teamImpacts, playerAnalysis);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalPlayers: playerAnalysis.length,
          totalValue: tradeAnalysis.totalValue,
          fairnessScore: tradeAnalysis.fairnessScore,
          riskLevel: tradeAnalysis.riskLevel
        },
        players: playerAnalysis,
        tradeBreakdown: tradeAnalysis,
        teamImpacts: teamImpacts,
        recommendation: recommendation,
        metadata: {
          analyzedAt: new Date().toISOString(),
          timeframe: timeframe,
          scoring: scoring,
          currentWeek: getCurrentWeek()
        }
      }
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, error: 'Trade analysis failed' },
      { status: 500 }
    );
  }
}

function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

function calculatePlayerMetrics(player: any, seasonStats: any[], rosProjections: any[]) {
  // Consistency (coefficient of variation)
  const points = seasonStats.map(stat => stat.fantasyPoints?.toNumber() || 0);
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);
  const consistency = mean > 0 ? Math.max(0, 100 - ((stdDev / mean) * 100)) : 0;

  // Trend analysis
  let trend = 'stable';
  if (seasonStats.length >= 6) {
    const recent = seasonStats.slice(0, 3);
    const older = seasonStats.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / older.length;
    
    if (recentAvg > olderAvg * 1.15) trend = 'up';
    else if (recentAvg < olderAvg * 0.85) trend = 'down';
  }

  // Ceiling and floor analysis
  const sortedPoints = [...points].sort((a, b) => b - a);
  const ceiling = sortedPoints.slice(0, Math.max(1, Math.floor(sortedPoints.length * 0.25))).reduce((sum, p) => sum + p, 0) / Math.max(1, Math.floor(sortedPoints.length * 0.25));
  const floor = sortedPoints.slice(-Math.max(1, Math.floor(sortedPoints.length * 0.25))).reduce((sum, p) => sum + p, 0) / Math.max(1, Math.floor(sortedPoints.length * 0.25));

  return {
    consistency: consistency,
    trend: trend,
    ceiling: ceiling,
    floor: floor,
    upside: ceiling - mean,
    volatility: stdDev
  };
}

function calculatePositionRank(position: string, avgPoints: number): number {
  const positionThresholds: { [key: string]: number[] } = {
    'QB': [25, 22, 19, 16, 13, 10], 
    'RB': [20, 17, 14, 11, 8, 5],   
    'WR': [18, 15, 12, 9, 7, 5],   
    'TE': [15, 12, 9, 7, 5, 3],    
    'K': [10, 8, 6, 4, 2, 0],      
    'DST': [12, 9, 7, 5, 3, 1]     
  };

  const thresholds = positionThresholds[position] || [10, 8, 6, 4, 2, 0];
  
  for (let i = 0; i < thresholds.length; i++) {
    if (avgPoints >= thresholds[i]) {
      return i + 1;
    }
  }
  
  return thresholds.length + 1;
}

function calculateTradeValue(avgPoints: number, recentAvg: number, rosProjected: number, consistency: number, position: string): number {
  let value = 0;
  
  // Season performance (35% weight)
  value += avgPoints * 0.35;
  
  // Recent form (25% weight)
  value += recentAvg * 0.25;
  
  // Rest of season projection (30% weight)
  const weeksRemaining = Math.max(1, 17 - getCurrentWeek());
  value += (rosProjected / weeksRemaining) * 0.3;
  
  // Consistency bonus (10% weight)
  value += (consistency / 100) * avgPoints * 0.1;
  
  // Position scarcity and injury risk adjustments
  const adjustments = getPositionAdjustments(position);
  value *= adjustments.scarcity;
  
  return Math.round(value * 10) / 10;
}

function getPositionAdjustments(position: string) {
  const adjustments: { [key: string]: { scarcity: number, risk: number } } = {
    'QB': { scarcity: 1.0, risk: 0.9 },
    'RB': { scarcity: 1.4, risk: 1.2 }, // High value, high injury risk
    'WR': { scarcity: 1.1, risk: 1.0 },
    'TE': { scarcity: 1.3, risk: 0.95 },
    'K': { scarcity: 0.7, risk: 0.8 },
    'DST': { scarcity: 0.8, risk: 0.85 }
  };
  
  return adjustments[position] || { scarcity: 1.0, risk: 1.0 };
}

function assessRiskFactors(player: any, seasonStats: any[], rosProjections: any[]) {
  const risks = [];
  
  // Injury status
  if (player.injuryStatus && player.injuryStatus !== 'HEALTHY') {
    risks.push({
      factor: 'Injury',
      level: player.injuryStatus === 'OUT' ? 'high' : 'medium',
      description: `Currently ${player.injuryStatus.toLowerCase()}`
    });
  }
  
  // Age (if available)
  if (player.age && player.age > 30) {
    risks.push({
      factor: 'Age',
      level: player.age > 32 ? 'high' : 'medium',
      description: `${player.age} years old - decline risk`
    });
  }
  
  // Performance volatility
  if (seasonStats.length >= 5) {
    const points = seasonStats.map(stat => stat.fantasyPoints?.toNumber() || 0);
    const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
    const stdDev = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length);
    const cv = mean > 0 ? (stdDev / mean) : 0;
    
    if (cv > 0.8) {
      risks.push({
        factor: 'Volatility',
        level: 'high',
        description: 'Highly inconsistent week-to-week performance'
      });
    }
  }
  
  // Bye week upcoming
  const currentWeek = getCurrentWeek();
  if (player.byeWeek && player.byeWeek === currentWeek + 1) {
    risks.push({
      factor: 'Bye Week',
      level: 'low',
      description: `Bye week next week (Week ${player.byeWeek})`
    });
  }
  
  return risks;
}

function analyzeTradeItems(tradeItems: any[], playerAnalysis: any[], teams: any[]) {
  const team1Items = tradeItems.filter(item => item.fromTeamId === teams[0].id);
  const team2Items = tradeItems.filter(item => item.fromTeamId === teams[1].id);
  
  const team1Value = calculateTeamTradeValue(team1Items, playerAnalysis);
  const team2Value = calculateTeamTradeValue(team2Items, playerAnalysis);
  
  const totalValue = team1Value + team2Value;
  const valueDifference = Math.abs(team1Value - team2Value);
  const fairnessScore = totalValue > 0 ? Math.max(0, 100 - ((valueDifference / totalValue) * 100)) : 50;
  
  const riskLevel = calculateTradeRiskLevel(tradeItems, playerAnalysis);
  
  return {
    team1: {
      id: teams[0].id,
      name: teams[0].name || teams[0].owner.name,
      giving: team1Items,
      value: team1Value
    },
    team2: {
      id: teams[1].id,
      name: teams[1].name || teams[1].owner.name,
      giving: team2Items,
      value: team2Value
    },
    totalValue,
    valueDifference,
    fairnessScore,
    riskLevel
  };
}

function calculateTeamTradeValue(items: any[], playerAnalysis: any[]) {
  return items.reduce((total, item) => {
    if (item.itemType === 'PLAYER') {
      const player = playerAnalysis.find(p => p.playerId === item.playerId);
      return total + (player?.rankings.tradeValue || 0);
    } else if (item.itemType === 'FAAB_MONEY') {
      // FAAB has diminishing returns
      return total + (item.metadata?.faabAmount || 0) * 0.1;
    } else if (item.itemType === 'DRAFT_PICK') {
      // Draft pick values (simplified)
      const pick = item.metadata?.draftPick;
      if (pick) {
        const round = pick.round || 1;
        const baseValue = Math.max(0, 20 - (round * 3));
        return total + baseValue;
      }
    }
    return total;
  }, 0);
}

function calculateTradeRiskLevel(tradeItems: any[], playerAnalysis: any[]): 'low' | 'medium' | 'high' {
  let riskScore = 0;
  let playerCount = 0;
  
  tradeItems.forEach(item => {
    if (item.itemType === 'PLAYER') {
      const player = playerAnalysis.find(p => p.playerId === item.playerId);
      if (player) {
        playerCount++;
        riskScore += player.riskFactors.length;
        
        // Add risk for high volatility
        if (player.metrics.volatility > 5) riskScore += 1;
        
        // Add risk for declining trend
        if (player.metrics.trend === 'down') riskScore += 1;
      }
    }
  });
  
  const avgRisk = playerCount > 0 ? riskScore / playerCount : 0;
  
  if (avgRisk >= 2) return 'high';
  if (avgRisk >= 1) return 'medium';
  return 'low';
}

function calculateTeamImpacts(tradeItems: any[], teams: any[], playerAnalysis: any[]) {
  return teams.map(team => {
    const givingItems = tradeItems.filter(item => item.fromTeamId === team.id);
    const receivingItems = tradeItems.filter(item => item.toTeamId === team.id);
    
    const givingValue = calculateTeamTradeValue(givingItems, playerAnalysis);
    const receivingValue = calculateTeamTradeValue(receivingItems, playerAnalysis);
    const netValue = receivingValue - givingValue;
    
    // Analyze positional impacts
    const positionalImpact = analyzePositionalImpact(givingItems, receivingItems, playerAnalysis);
    
    return {
      teamId: team.id,
      teamName: team.name || team.owner.name,
      giving: givingItems.length,
      receiving: receivingItems.length,
      valueGiving: givingValue,
      valueReceiving: receivingValue,
      netValue: netValue,
      netImpact: netValue > 5 ? 'positive' : netValue < -5 ? 'negative' : 'neutral',
      positionalImpact: positionalImpact,
      rosterHealthAfter: calculateRosterHealth(team, givingItems, receivingItems, playerAnalysis)
    };
  });
}

function analyzePositionalImpact(giving: any[], receiving: any[], playerAnalysis: any[]) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  
  return positions.map(position => {
    const givingAtPosition = giving.filter(item => {
      if (item.itemType !== 'PLAYER') return false;
      const player = playerAnalysis.find(p => p.playerId === item.playerId);
      return player?.position === position;
    }).length;
    
    const receivingAtPosition = receiving.filter(item => {
      if (item.itemType !== 'PLAYER') return false;
      const player = playerAnalysis.find(p => p.playerId === item.playerId);
      return player?.position === position;
    }).length;
    
    return {
      position,
      giving: givingAtPosition,
      receiving: receivingAtPosition,
      net: receivingAtPosition - givingAtPosition
    };
  });
}

function calculateRosterHealth(team: any, giving: any[], receiving: any[], playerAnalysis: any[]) {
  // Fixed roster reference to use correct schema field
  const currentRosterSize = team.roster?.length || 0;
  const netPlayerChange = receiving.filter(i => i.itemType === 'PLAYER').length - 
                         giving.filter(i => i.itemType === 'PLAYER').length;
  
  const newRosterSize = currentRosterSize + netPlayerChange;
  
  return {
    currentSize: currentRosterSize,
    projectedSize: newRosterSize,
    healthScore: Math.min(100, Math.max(0, (newRosterSize / 16) * 100)) // Assuming 16 is optimal
  };
}

function generateDetailedRecommendation(tradeAnalysis: any, teamImpacts: any[], playerAnalysis: any[]) {
  const fairness = tradeAnalysis.fairnessScore;
  const risk = tradeAnalysis.riskLevel;
  
  let verdict: string;
  let confidence: string;
  let reasoning: string[] = [];
  
  // Determine verdict based on fairness
  if (fairness >= 85) {
    verdict = 'ACCEPT';
    confidence = 'high';
    reasoning.push('Values are very well balanced');
  } else if (fairness >= 70) {
    verdict = 'CONSIDER';
    confidence = 'medium';
    reasoning.push('Generally fair trade with acceptable value difference');
  } else if (fairness >= 50) {
    verdict = 'RISKY';
    confidence = 'medium';
    reasoning.push('Significant value imbalance - proceed with caution');
  } else {
    verdict = 'REJECT';
    confidence = 'high';
    reasoning.push('Major value discrepancy detected');
  }
  
  // Add risk considerations
  if (risk === 'high') {
    reasoning.push('High injury or performance risk involved');
    if (verdict === 'ACCEPT') verdict = 'CONSIDER';
  } else if (risk === 'low') {
    reasoning.push('Low risk profile for all players involved');
  }
  
  // Add team-specific insights
  teamImpacts.forEach(impact => {
    if (impact.netImpact === 'positive') {
      reasoning.push(`${impact.teamName} benefits significantly from this trade`);
    } else if (impact.netImpact === 'negative') {
      reasoning.push(`${impact.teamName} gives up more value than they receive`);
    }
  });
  
  return {
    verdict,
    confidence,
    reasoning,
    fairnessScore: fairness,
    riskLevel: risk,
    summary: generateTradeSummary(tradeAnalysis, teamImpacts),
    alternativeConsiderations: generateAlternatives(playerAnalysis)
  };
}

function generateTradeSummary(tradeAnalysis: any, teamImpacts: any[]) {
  const team1 = tradeAnalysis.team1;
  const team2 = tradeAnalysis.team2;
  
  return `${team1.name} trades ${team1.giving.length} asset(s) (value: ${team1.value.toFixed(1)}) for ${team2.name}'s ${team2.giving.length} asset(s) (value: ${team2.value.toFixed(1)}). Fairness score: ${tradeAnalysis.fairnessScore.toFixed(0)}/100.`;
}

function generateAlternatives(playerAnalysis: any[]) {
  // Simplified alternative suggestions
  const suggestions = [];
  
  const highValuePlayers = playerAnalysis.filter(p => p.rankings.tradeValue > 15);
  if (highValuePlayers.length > 0) {
    suggestions.push('Consider adding smaller assets to balance high-value players');
  }
  
  const riskyPlayers = playerAnalysis.filter(p => p.riskFactors.length > 1);
  if (riskyPlayers.length > 0) {
    suggestions.push('High-risk players detected - consider injury insurance');
  }
  
  return suggestions;
}