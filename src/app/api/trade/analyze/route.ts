import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface TradePlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  currentValue: number;
  futureValue: number;
  dynastyValue: number;
  age: number;
  injuryRisk: number;
  consistency: number;
}

interface TradeOffer {
  team1: {
    id: string;
    name: string;
    owner: string;
    record: string;
    projectedRank: number;
  };
  team2: {
    id: string;
    name: string;
    owner: string;
    record: string;
    projectedRank: number;
  };
  team1Gives: TradePlayer[];
  team2Gives: TradePlayer[];
  draftPicks?: {
    team: string;
    round: number;
    year: number;
  }[];
  faabAmount?: number;
}

// Trade value calculation weights
const VALUE_WEIGHTS = {
  current: 0.6,
  future: 0.3,
  dynasty: 0.1
};

// Position value multipliers for scarcity
const POSITION_SCARCITY = {
  QB: 1.2,
  RB: 1.15,
  WR: 1.0,
  TE: 1.1,
  K: 0.7,
  DST: 0.8
};

export async function POST(request: NextRequest) {
  try {
    const { leagueId, trade } = await request.json();

    if (!leagueId || !trade) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fetch league context
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            roster: {
              include: {
                player: {
                  include: {
                    playerStats: {
                      where: { season: 2024 },
                      orderBy: { week: 'desc' },
                      take: 10
                    },
                    projections: {
                      where: { season: 2024 }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    // Calculate trade values
    const team1TotalValue = calculateTotalValue(trade.team1Gives, trade.draftPicks?.filter(p => p.team === trade.team1.id));
    const team2TotalValue = calculateTotalValue(trade.team2Gives, trade.draftPicks?.filter(p => p.team === trade.team2.id));

    // Calculate fairness score
    const fairnessScore = calculateFairnessScore(team1TotalValue, team2TotalValue);

    // Calculate team impacts
    const team1Impact = calculateTeamImpact(
      trade.team1,
      trade.team1Gives,
      trade.team2Gives,
      league
    );

    const team2Impact = calculateTeamImpact(
      trade.team2,
      trade.team2Gives,
      trade.team1Gives,
      league
    );

    // Dynasty projections
    const dynastyImpact = calculateDynastyImpact(trade);

    // Market context
    const marketContext = await analyzeMarketContext(leagueId, trade);

    // Generate recommendations
    const recommendations = generateRecommendations(
      fairnessScore,
      team1Impact,
      team2Impact,
      trade
    );

    // Identify risks
    const risks = identifyRisks(trade, team1Impact, team2Impact);

    return NextResponse.json({
      fairnessScore: Math.round(fairnessScore),
      team1Impact,
      team2Impact,
      dynastyImpact,
      marketContext,
      recommendations,
      risks
    });

  } catch (error) {
    console.error('Trade analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trade' },
      { status: 500 }
    );
  }
}

function calculateTotalValue(
  players: TradePlayer[],
  draftPicks?: { round: number; year: number }[]
): number {
  let totalValue = 0;

  // Calculate player values
  for (const player of players) {
    const positionMultiplier = POSITION_SCARCITY[player.position as keyof typeof POSITION_SCARCITY] || 1.0;
    
    const weightedValue = 
      (player.currentValue * VALUE_WEIGHTS.current) +
      (player.futureValue * VALUE_WEIGHTS.future) +
      (player.dynastyValue * VALUE_WEIGHTS.dynasty);
    
    // Adjust for age (peak value around 24-27)
    const ageMultiplier = calculateAgeMultiplier(player.age, player.position);
    
    // Adjust for injury risk
    const injuryMultiplier = 1 - (player.injuryRisk * 0.3);
    
    // Adjust for consistency
    const consistencyBonus = player.consistency * 0.1;
    
    totalValue += weightedValue * positionMultiplier * ageMultiplier * injuryMultiplier * (1 + consistencyBonus);
  }

  // Calculate draft pick values
  if (draftPicks) {
    for (const pick of draftPicks) {
      const pickValue = calculateDraftPickValue(pick.round, pick.year);
      totalValue += pickValue;
    }
  }

  return totalValue;
}

function calculateFairnessScore(value1: number, value2: number): number {
  const diff = Math.abs(value1 - value2);
  const avg = (value1 + value2) / 2;
  
  if (avg === 0) return 50;
  
  const percentDiff = (diff / avg) * 100;
  
  // Convert percentage difference to fairness score (0-100)
  if (percentDiff <= 5) return 95;
  if (percentDiff <= 10) return 85;
  if (percentDiff <= 15) return 75;
  if (percentDiff <= 20) return 65;
  if (percentDiff <= 30) return 55;
  if (percentDiff <= 40) return 45;
  if (percentDiff <= 50) return 35;
  return Math.max(20, 100 - percentDiff);
}

function calculateTeamImpact(
  team: any,
  playersGiving: TradePlayer[],
  playersReceiving: TradePlayer[],
  league: any
) {
  const currentRoster = league.teams.find((t: any) => t.id === team.id);
  
  // Calculate immediate value change
  const immediateGiven = playersGiving.reduce((sum, p) => sum + p.currentValue, 0);
  const immediateReceived = playersReceiving.reduce((sum, p) => sum + p.currentValue, 0);
  const immediateValue = immediateReceived - immediateGiven;
  
  // Calculate future value change
  const futureGiven = playersGiving.reduce((sum, p) => sum + p.futureValue, 0);
  const futureReceived = playersReceiving.reduce((sum, p) => sum + p.futureValue, 0);
  const futureValue = futureReceived - futureGiven;
  
  // Calculate win probability change
  const currentProjectedPoints = estimateTeamPoints(currentRoster);
  const newProjectedPoints = currentProjectedPoints - immediateGiven + immediateReceived;
  const winProbabilityChange = ((newProjectedPoints - currentProjectedPoints) / currentProjectedPoints) * 50;
  
  // Calculate playoff odds change
  const playoffOddsChange = calculatePlayoffOddsChange(
    team.projectedRank,
    immediateValue,
    league.teams.length
  );
  
  // Calculate position strength changes
  const strengthChanges = calculateStrengthChanges(
    playersGiving,
    playersReceiving
  );
  
  return {
    immediateValue,
    futureValue,
    winProbabilityChange,
    playoffOddsChange,
    strengthChanges
  };
}

function calculateDynastyImpact(trade: TradeOffer) {
  const years = 3;
  const team1YearOverYear = [];
  const team2YearOverYear = [];
  
  for (let year = 0; year < years; year++) {
    // Calculate value degradation/appreciation over time
    const team1Degradation = trade.team1Gives.reduce((sum, p) => {
      const ageImpact = calculateAgeDegradation(p.age + year, p.position);
      return sum + (p.futureValue * ageImpact);
    }, 0);
    
    const team1Appreciation = trade.team2Gives.reduce((sum, p) => {
      const ageImpact = calculateAgeDegradation(p.age + year, p.position);
      return sum + (p.futureValue * ageImpact);
    }, 0);
    
    team1YearOverYear.push(team1Appreciation - team1Degradation);
    
    // Same for team 2
    const team2Degradation = trade.team2Gives.reduce((sum, p) => {
      const ageImpact = calculateAgeDegradation(p.age + year, p.position);
      return sum + (p.futureValue * ageImpact);
    }, 0);
    
    const team2Appreciation = trade.team1Gives.reduce((sum, p) => {
      const ageImpact = calculateAgeDegradation(p.age + year, p.position);
      return sum + (p.futureValue * ageImpact);
    }, 0);
    
    team2YearOverYear.push(team2Appreciation - team2Degradation);
  }
  
  return {
    team1YearOverYear,
    team2YearOverYear
  };
}

async function analyzeMarketContext(leagueId: string, trade: TradeOffer) {
  // Fetch recent trades in the league
  const recentTrades = await prisma.trade.findMany({
    where: {
      leagueId,
      status: 'ACCEPTED',
      processedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    include: {
      items: true
    },
    orderBy: { processedAt: 'desc' },
    take: 5
  });
  
  // Analyze similar trades
  const similarTrades = recentTrades.map(t => ({
    date: t.processedAt?.toLocaleDateString() || 'Unknown',
    description: `${t.items.length} players traded`,
    fairnessScore: 75 + Math.random() * 20 // Simulated score
  }));
  
  // Determine market trend
  const totalGiven = trade.team1Gives.length + trade.team2Gives.length;
  const veteransTraded = [...trade.team1Gives, ...trade.team2Gives].filter(p => p.age > 27).length;
  const rookiesTraded = [...trade.team1Gives, ...trade.team2Gives].filter(p => p.age < 24).length;
  
  let marketTrend: 'buyers' | 'sellers' | 'balanced';
  if (veteransTraded > rookiesTraded * 1.5) {
    marketTrend = 'buyers'; // Teams trading for win-now players
  } else if (rookiesTraded > veteransTraded * 1.5) {
    marketTrend = 'sellers'; // Teams rebuilding
  } else {
    marketTrend = 'balanced';
  }
  
  return {
    similarTrades,
    marketTrend
  };
}

function generateRecommendations(
  fairnessScore: number,
  team1Impact: any,
  team2Impact: any,
  trade: TradeOffer
): string[] {
  const recommendations = [];
  
  // Fairness recommendations
  if (fairnessScore >= 80) {
    recommendations.push('Trade appears fair - both teams benefit appropriately');
  } else if (fairnessScore >= 60) {
    recommendations.push('Consider minor adjustments to balance the trade better');
  } else {
    recommendations.push('Trade is significantly unbalanced - major adjustments recommended');
  }
  
  // Team 1 specific recommendations
  if (team1Impact.immediateValue > 0 && team1Impact.winProbabilityChange > 5) {
    recommendations.push(`Strong win-now move for ${trade.team1.name}`);
  }
  if (team1Impact.futureValue > team1Impact.immediateValue) {
    recommendations.push(`${trade.team1.name} is building for the future - good dynasty move`);
  }
  
  // Position-based recommendations
  const team1StrengthGains = team1Impact.strengthChanges.filter((s: any) => s.change > 10);
  if (team1StrengthGains.length > 0) {
    recommendations.push(`${trade.team1.name} significantly improves at ${team1StrengthGains.map((s: any) => s.position).join(', ')}`);
  }
  
  // Market timing
  if (trade.team1.projectedRank <= 3 && team1Impact.immediateValue > 0) {
    recommendations.push('Good timing for a championship push');
  }
  
  // Age considerations
  const youngPlayers = trade.team2Gives.filter(p => p.age < 25);
  if (youngPlayers.length > 2) {
    recommendations.push(`${trade.team1.name} acquires ${youngPlayers.length} young assets for long-term value`);
  }
  
  return recommendations.slice(0, 5);
}

function identifyRisks(
  trade: TradeOffer,
  team1Impact: any,
  team2Impact: any
): string[] {
  const risks = [];
  
  // Injury risks
  const injuryRisks = [...trade.team1Gives, ...trade.team2Gives].filter(p => p.injuryRisk > 0.5);
  if (injuryRisks.length > 0) {
    risks.push(`${injuryRisks.length} players have elevated injury risk`);
  }
  
  // Age-related risks
  const agingPlayers = [...trade.team1Gives, ...trade.team2Gives].filter(p => p.age > 29);
  if (agingPlayers.length > 0) {
    risks.push(`${agingPlayers.length} players past peak age may decline rapidly`);
  }
  
  // Consistency risks
  const inconsistentPlayers = [...trade.team1Gives, ...trade.team2Gives].filter(p => p.consistency < 0.5);
  if (inconsistentPlayers.length > 0) {
    risks.push(`${inconsistentPlayers.length} players have inconsistent performance history`);
  }
  
  // Position depth risks
  if (team1Impact.strengthChanges.some((s: any) => s.change < -20)) {
    risks.push(`${trade.team1.name} significantly weakens at key positions`);
  }
  if (team2Impact.strengthChanges.some((s: any) => s.change < -20)) {
    risks.push(`${trade.team2.name} significantly weakens at key positions`);
  }
  
  // Dynasty risks
  if (team1Impact.futureValue < -50) {
    risks.push(`${trade.team1.name} sacrifices significant future value`);
  }
  if (team2Impact.futureValue < -50) {
    risks.push(`${trade.team2.name} sacrifices significant future value`);
  }
  
  return risks.slice(0, 5);
}

// Helper functions
function calculateAgeMultiplier(age: number, position: string): number {
  // Different positions peak at different ages
  let peakAge = 26;
  let declineRate = 0.05;
  
  switch (position) {
    case 'RB':
      peakAge = 24;
      declineRate = 0.15;
      break;
    case 'WR':
      peakAge = 27;
      declineRate = 0.08;
      break;
    case 'QB':
      peakAge = 30;
      declineRate = 0.04;
      break;
    case 'TE':
      peakAge = 28;
      declineRate = 0.06;
      break;
  }
  
  if (age <= peakAge) {
    return 1.0 - ((peakAge - age) * 0.02);
  } else {
    return Math.max(0.5, 1.0 - ((age - peakAge) * declineRate));
  }
}

function calculateAgeDegradation(age: number, position: string): number {
  return calculateAgeMultiplier(age, position);
}

function calculateDraftPickValue(round: number, year: number): number {
  const currentYear = new Date().getFullYear();
  const yearDiscount = Math.pow(0.9, year - currentYear);
  
  // Base values by round (approximate)
  const roundValues = [100, 75, 55, 40, 30, 22, 16, 12, 9, 7, 5, 3];
  const baseValue = roundValues[round - 1] || 2;
  
  return baseValue * yearDiscount;
}

function estimateTeamPoints(team: any): number {
  if (!team || !team.roster) return 100;
  
  return team.roster.reduce((sum: number, rosterPlayer: any) => {
    const stats = rosterPlayer.player.playerStats || [];
    const avgPoints = stats.length > 0
      ? stats.reduce((total: number, stat: any) => total + Number(stat.fantasyPoints || 0), 0) / stats.length
      : 0;
    return sum + avgPoints;
  }, 0);
}

function calculatePlayoffOddsChange(
  currentRank: number,
  valueChange: number,
  leagueSize: number
): number {
  const playoffSpots = Math.floor(leagueSize / 2);
  const currentOdds = currentRank <= playoffSpots ? 80 : 40;
  
  // Value change affects playoff odds
  const oddsChange = (valueChange / 100) * 20;
  
  return Math.min(20, Math.max(-20, oddsChange));
}

function calculateStrengthChanges(
  playersGiving: TradePlayer[],
  playersReceiving: TradePlayer[]
): { position: string; change: number }[] {
  const positionChanges = new Map<string, number>();
  
  // Calculate value lost by position
  for (const player of playersGiving) {
    const current = positionChanges.get(player.position) || 0;
    positionChanges.set(player.position, current - player.currentValue);
  }
  
  // Calculate value gained by position
  for (const player of playersReceiving) {
    const current = positionChanges.get(player.position) || 0;
    positionChanges.set(player.position, current + player.currentValue);
  }
  
  // Convert to percentage changes
  const changes = Array.from(positionChanges.entries()).map(([position, change]) => ({
    position,
    change: Math.round((change / 10) * 10) // Normalize to percentage
  }));
  
  return changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}