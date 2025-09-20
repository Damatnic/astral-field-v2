import { getPlayerProjection } from '@/services/sleeper/projections';

// Position peak ages and decline curves
const POSITION_CURVES = {
  QB: {
    peakAge: 28,
    primeStart: 25,
    primeEnd: 32,
    declineRate: 0.05, // 5% per year after peak
    cliffAge: 36
  },
  RB: {
    peakAge: 24,
    primeStart: 22,
    primeEnd: 27,
    declineRate: 0.15, // 15% per year after peak - steeper decline
    cliffAge: 30
  },
  WR: {
    peakAge: 26,
    primeStart: 24,
    primeEnd: 29,
    declineRate: 0.08, // 8% per year after peak
    cliffAge: 32
  },
  TE: {
    peakAge: 27,
    primeStart: 25,
    primeEnd: 30,
    declineRate: 0.07, // 7% per year after peak
    cliffAge: 33
  }
};

// Dynasty trade value chart (baseline values out of 100)
const BASELINE_VALUES = {
  QB: {
    elite: 85,    // Mahomes, Allen tier
    QB1: 65,      // Top 12 QB
    QB2: 40,      // QB 13-24
    backup: 15    // QB25+
  },
  RB: {
    elite: 100,   // CMC, Bijan tier
    RB1: 75,      // Top 12 RB
    RB2: 50,      // RB 13-24
    RB3: 25,      // RB 25-36
    backup: 10    // RB37+
  },
  WR: {
    elite: 95,    // Jefferson, Chase tier
    WR1: 70,      // Top 12 WR
    WR2: 45,      // WR 13-24
    WR3: 25,      // WR 25-36
    backup: 10    // WR37+
  },
  TE: {
    elite: 80,    // Kelce, Andrews tier
    TE1: 55,      // Top 12 TE
    TE2: 25,      // TE 13-24
    backup: 5     // TE25+
  }
};

interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nflTeam: string;
  sleeperId?: string;
  currentRank?: number;
  injuryHistory?: string[];
  contractYears?: number;
}

interface DynastyValue {
  currentValue: number;
  futureValue: number;
  totalValue: number;
  peakValue: number;
  ageMultiplier: number;
  trendDirection: 'up' | 'stable' | 'down';
  tradeValue: number; // 1-10 scale for easy comparison
  tier: string;
  analysis: string[];
}

/**
 * Calculate comprehensive dynasty value for a player
 */
export async function calculateDynastyValue(player: Player): Promise<DynastyValue> {
  const positionCurve = POSITION_CURVES[player.position as keyof typeof POSITION_CURVES];
  
  if (!positionCurve) {
    return getDefaultValue(player);
  }

  // Get base value based on current ranking/projection
  const baseValue = await getBaseValue(player);
  
  // Calculate age multiplier
  const ageMultiplier = calculateAgeMultiplier(player.age, positionCurve);
  
  // Calculate future value projection
  const futureValue = calculateFutureValue(player, baseValue, positionCurve);
  
  // Apply situation modifiers
  const situationMultiplier = getSituationMultiplier(player);
  
  // Calculate final values
  const currentValue = Math.round(baseValue * situationMultiplier);
  const totalValue = Math.round((currentValue + futureValue) / 2);
  const peakValue = Math.round(baseValue * 1.2); // Potential peak if everything goes right
  
  // Determine trend
  const trendDirection = getTrendDirection(player.age, positionCurve);
  
  // Convert to 1-10 trade value scale
  const tradeValue = Math.min(10, Math.max(1, Math.round(totalValue / 10)));
  
  // Determine tier
  const tier = getTier(totalValue, player.position);
  
  // Generate analysis insights
  const analysis = generateAnalysis(player, ageMultiplier, situationMultiplier, trendDirection);
  
  return {
    currentValue,
    futureValue,
    totalValue,
    peakValue,
    ageMultiplier,
    trendDirection,
    tradeValue,
    tier,
    analysis
  };
}

/**
 * Get base value from current performance/projections
 */
async function getBaseValue(player: Player): Promise<number> {
  // Try to get projection if we have Sleeper ID
  if (player.sleeperId) {
    const projection = await getPlayerProjection(player.sleeperId);
    // Convert projection to dynasty value (rough conversion)
    return Math.min(100, projection * 5);
  }
  
  // Use ranking if available
  if (player.currentRank) {
    return getRankBasedValue(player.position, player.currentRank);
  }
  
  // Default to mid-tier value
  return 50;
}

/**
 * Get value based on positional ranking
 */
function getRankBasedValue(position: string, rank: number): number {
  const values = BASELINE_VALUES[position as keyof typeof BASELINE_VALUES];
  
  if (!values) return 50;
  
  if (rank <= 3) return values.elite;
  if (rank <= 12) return values[position + '1' as keyof typeof values] || 60;
  if (rank <= 24) return values[position + '2' as keyof typeof values] || 40;
  if (rank <= 36) return values[position + '3' as keyof typeof values] || 25;
  return values.backup;
}

/**
 * Calculate age-based value multiplier
 */
function calculateAgeMultiplier(age: number, curve: typeof POSITION_CURVES.QB): number {
  // Too young (rookies get slight discount for uncertainty)
  if (age < curve.primeStart - 2) {
    return 0.85;
  }
  
  // Ascending to prime
  if (age < curve.primeStart) {
    return 0.9 + ((curve.primeStart - age) * 0.05);
  }
  
  // In prime years
  if (age >= curve.primeStart && age <= curve.primeEnd) {
    return 1.0;
  }
  
  // Post-prime decline
  if (age > curve.primeEnd && age < curve.cliffAge) {
    const yearsPastPrime = age - curve.primeEnd;
    return Math.max(0.3, 1 - (yearsPastPrime * curve.declineRate));
  }
  
  // Past the cliff
  if (age >= curve.cliffAge) {
    return 0.2;
  }
  
  return 0.5;
}

/**
 * Project future value based on age curve
 */
function calculateFutureValue(
  player: Player, 
  baseValue: number, 
  curve: typeof POSITION_CURVES.QB
): number {
  const yearsToDecline = Math.max(0, curve.primeEnd - player.age);
  const futureMultiplier = yearsToDecline > 3 ? 1.1 : yearsToDecline > 0 ? 1.0 : 0.7;
  
  return Math.round(baseValue * futureMultiplier * calculateAgeMultiplier(player.age + 2, curve));
}

/**
 * Get situation-based multiplier (team, opportunity, etc.)
 */
function getSituationMultiplier(player: Player): number {
  let multiplier = 1.0;
  
  // Good teams get a slight boost
  const goodTeams = ['KC', 'BUF', 'SF', 'PHI', 'DAL', 'CIN', 'MIA'];
  const badTeams = ['ARI', 'CAR', 'NYG', 'WAS', 'NE', 'TEN'];
  
  if (goodTeams.includes(player.nflTeam)) {
    multiplier += 0.1;
  } else if (badTeams.includes(player.nflTeam)) {
    multiplier -= 0.1;
  }
  
  // Injury history penalty
  if (player.injuryHistory && player.injuryHistory.length > 2) {
    multiplier -= 0.15;
  } else if (player.injuryHistory && player.injuryHistory.length > 0) {
    multiplier -= 0.05;
  }
  
  // Contract years (if available)
  if (player.contractYears && player.contractYears <= 1) {
    multiplier -= 0.05; // Uncertainty discount
  }
  
  return Math.max(0.7, Math.min(1.3, multiplier));
}

/**
 * Determine value trend direction
 */
function getTrendDirection(age: number, curve: typeof POSITION_CURVES.QB): 'up' | 'stable' | 'down' {
  if (age < curve.primeStart) return 'up';
  if (age <= curve.primeEnd) return 'stable';
  return 'down';
}

/**
 * Get dynasty tier based on total value
 */
function getTier(value: number, position: string): string {
  if (value >= 90) return `Elite ${position}1`;
  if (value >= 75) return `High-End ${position}1`;
  if (value >= 60) return `Solid ${position}1`;
  if (value >= 45) return `${position}2`;
  if (value >= 30) return `${position}3`;
  if (value >= 15) return `Depth/Handcuff`;
  return 'Roster Bubble';
}

/**
 * Generate analysis insights
 */
function generateAnalysis(
  player: Player, 
  ageMultiplier: number, 
  situationMultiplier: number, 
  trend: 'up' | 'stable' | 'down'
): string[] {
  const insights: string[] = [];
  const curve = POSITION_CURVES[player.position as keyof typeof POSITION_CURVES];
  
  // Age analysis
  if (player.age < curve.primeStart) {
    insights.push(`${player.age} years old - Still ascending to prime years`);
  } else if (player.age <= curve.primeEnd) {
    insights.push(`${player.age} years old - Currently in prime (${curve.primeStart}-${curve.primeEnd})`);
  } else if (player.age < curve.cliffAge) {
    insights.push(`${player.age} years old - Past prime but still productive`);
  } else {
    insights.push(`${player.age} years old - Significant age concerns`);
  }
  
  // Position-specific insights
  if (player.position === 'RB' && player.age >= 27) {
    insights.push('⚠️ Running backs decline rapidly after 27');
  } else if (player.position === 'QB' && player.age <= 25) {
    insights.push('📈 Quarterbacks typically improve into late 20s');
  } else if (player.position === 'WR' && player.age <= 24) {
    insights.push('🎯 Year 3 breakout potential for young receivers');
  } else if (player.position === 'TE' && player.age <= 25) {
    insights.push('🏈 Tight ends often break out in years 3-5');
  }
  
  // Situation analysis
  if (situationMultiplier > 1.05) {
    insights.push('✅ Excellent team situation enhances value');
  } else if (situationMultiplier < 0.95) {
    insights.push('⚠️ Poor team situation or injury concerns limit value');
  }
  
  // Trend analysis
  if (trend === 'up') {
    insights.push('📈 Value trending upward - BUY candidate');
  } else if (trend === 'down') {
    insights.push('📉 Value trending downward - SELL candidate');
  } else {
    insights.push('➡️ Value stable - HOLD');
  }
  
  return insights;
}

/**
 * Get default value for unknown positions
 */
function getDefaultValue(player: Player): DynastyValue {
  return {
    currentValue: 25,
    futureValue: 20,
    totalValue: 22,
    peakValue: 30,
    ageMultiplier: 1.0,
    trendDirection: 'stable',
    tradeValue: 3,
    tier: 'Unknown',
    analysis: [`${player.position} position not fully supported`]
  };
}

/**
 * Compare two players for trade analysis
 */
export function comparePlayerValues(player1: DynastyValue, player2: DynastyValue): {
  winner: 1 | 2 | 0;
  margin: number;
  analysis: string;
} {
  const diff = player1.totalValue - player2.totalValue;
  const margin = Math.abs(diff);
  
  if (margin < 5) {
    return {
      winner: 0,
      margin,
      analysis: 'Trade is relatively even'
    };
  }
  
  return {
    winner: diff > 0 ? 1 : 2,
    margin,
    analysis: `Player ${diff > 0 ? 1 : 2} wins by ${margin} points (${Math.round(margin / player2.totalValue * 100)}%)`
  };
}

/**
 * Calculate team value for multiple players
 */
export async function calculateTeamValue(players: Player[]): Promise<number> {
  const values = await Promise.all(players.map(p => calculateDynastyValue(p)));
  return values.reduce((sum, v) => sum + v.totalValue, 0);
}

/**
 * Analyze a complete trade
 */
export async function analyzeCompleteTrade(
  team1Players: Player[],
  team2Players: Player[]
): Promise<{
  team1Value: number;
  team2Value: number;
  fairness: number;
  winner: 'team1' | 'team2' | 'even';
  recommendation: 'ACCEPT' | 'DECLINE' | 'CONSIDER';
  analysis: string[];
}> {
  const team1Value = await calculateTeamValue(team1Players);
  const team2Value = await calculateTeamValue(team2Players);
  
  const fairness = Math.min(team1Value, team2Value) / Math.max(team1Value, team2Value) * 100;
  const difference = Math.abs(team1Value - team2Value);
  const percentDiff = (difference / Math.max(team1Value, team2Value)) * 100;
  
  let winner: 'team1' | 'team2' | 'even' = 'even';
  let recommendation: 'ACCEPT' | 'DECLINE' | 'CONSIDER' = 'CONSIDER';
  const analysis: string[] = [];
  
  if (percentDiff < 10) {
    winner = 'even';
    recommendation = 'ACCEPT';
    analysis.push('✅ Trade is very balanced');
  } else if (percentDiff < 25) {
    winner = team1Value > team2Value ? 'team1' : 'team2';
    recommendation = 'CONSIDER';
    analysis.push(`⚠️ ${winner === 'team1' ? 'Team 1' : 'Team 2'} wins by ${Math.round(percentDiff)}%`);
    analysis.push('Trade is somewhat uneven but not unreasonable');
  } else {
    winner = team1Value > team2Value ? 'team1' : 'team2';
    recommendation = 'DECLINE';
    analysis.push(`❌ ${winner === 'team1' ? 'Team 1' : 'Team 2'} wins by ${Math.round(percentDiff)}%`);
    analysis.push('Trade appears significantly imbalanced');
  }
  
  // Add position analysis
  const team1Positions = team1Players.map(p => p.position);
  const team2Positions = team2Players.map(p => p.position);
  
  if (team1Positions.includes('RB') && !team2Positions.includes('RB')) {
    analysis.push('Team 1 giving up RB depth');
  }
  if (team2Positions.includes('RB') && !team1Positions.includes('RB')) {
    analysis.push('Team 2 giving up RB depth');
  }
  
  // Age analysis
  const team1AvgAge = team1Players.reduce((sum, p) => sum + p.age, 0) / team1Players.length;
  const team2AvgAge = team2Players.reduce((sum, p) => sum + p.age, 0) / team2Players.length;
  
  if (Math.abs(team1AvgAge - team2AvgAge) > 2) {
    if (team1AvgAge < team2AvgAge) {
      analysis.push('Team 1 getting younger (better for dynasty)');
    } else {
      analysis.push('Team 2 getting younger (better for dynasty)');
    }
  }
  
  return {
    team1Value,
    team2Value,
    fairness,
    winner,
    recommendation,
    analysis
  };
}