/**
 * Trade Value Calculator
 * Advanced trade analysis and fairness evaluation
 */

import { prisma } from '@/lib/prisma';

export interface PlayerValue {
  playerId: string;
  name: string;
  position: string;
  team: string;
  totalValue: number;
  components: {
    performanceValue: number;
    scarcityValue: number;
    consistencyValue: number;
    scheduleValue: number;
    injuryRiskValue: number;
  };
}

export interface TradeAnalysis {
  givingValue: number;
  receivingValue: number;
  valueDifference: number;
  fairnessScore: number; // -100 to +100
  givingPlayers: PlayerValue[];
  receivingPlayers: PlayerValue[];
  recommendation: 'ACCEPT' | 'REJECT' | 'CONSIDER' | 'NEGOTIATE';
  reasoning: string[];
  positionalImpact: {
    position: string;
    before: number;
    after: number;
    change: number;
  }[];
}

export class TradeValueCalculator {
  private readonly positionScarcity = {
    QB: 0.8,  // Less scarce
    RB: 1.3,  // Most scarce
    WR: 1.1,  // Moderately scarce
    TE: 1.2,  // Scarce at top tier
    K: 0.5,   // Not scarce
    DEF: 0.6  // Not scarce
  };

  private readonly tierBreakpoints = {
    QB: [30, 24, 20, 16, 12],
    RB: [25, 20, 16, 12, 8],
    WR: [22, 18, 14, 10, 6],
    TE: [18, 14, 10, 6, 3],
    K: [12, 10, 8, 6, 4],
    DEF: [12, 10, 8, 6, 4]
  };

  /**
   * Analyze a trade proposal
   */
  async analyzeTrade(
    fromTeamId: string,
    toTeamId: string,
    givingPlayerIds: string[],
    receivingPlayerIds: string[],
    leagueId: string
  ): Promise<TradeAnalysis> {
    try {
      // Get league context
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: { settings: true }
      });

      const currentWeek = league?.currentWeek || 1;
      const scoringType = league?.settings?.scoringType || 'PPR';

      // Get player details and calculate values
      const [givingPlayers, receivingPlayers] = await Promise.all([
        this.getPlayerValues(givingPlayerIds, currentWeek, scoringType),
        this.getPlayerValues(receivingPlayerIds, currentWeek, scoringType)
      ]);

      // Calculate total values
      const givingValue = givingPlayers.reduce((sum, p) => sum + p.totalValue, 0);
      const receivingValue = receivingPlayers.reduce((sum, p) => sum + p.totalValue, 0);
      const valueDifference = receivingValue - givingValue;

      // Calculate fairness score (-100 to +100)
      const fairnessScore = this.calculateFairnessScore(givingValue, receivingValue);

      // Analyze positional impact
      const positionalImpact = await this.analyzePositionalImpact(
        fromTeamId,
        givingPlayers,
        receivingPlayers
      );

      // Generate recommendation
      const { recommendation, reasoning } = this.generateRecommendation(
        fairnessScore,
        positionalImpact,
        givingPlayers,
        receivingPlayers
      );

      return {
        givingValue,
        receivingValue,
        valueDifference,
        fairnessScore,
        givingPlayers,
        receivingPlayers,
        recommendation,
        reasoning,
        positionalImpact
      };
    } catch (error) {
      console.error('Trade analysis error:', error);
      throw new Error('Failed to analyze trade');
    }
  }

  /**
   * Get player values with detailed breakdown
   */
  private async getPlayerValues(
    playerIds: string[],
    currentWeek: number,
    scoringType: string
  ): Promise<PlayerValue[]> {
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      include: {
        stats: {
          where: {
            season: new Date().getFullYear(),
            week: { lte: currentWeek }
          }
        }
      }
    });

    return players.map(player => {
      const performanceValue = this.calculatePerformanceValue(player, scoringType);
      const scarcityValue = this.calculateScarcityValue(player);
      const consistencyValue = this.calculateConsistencyValue(player.stats);
      const scheduleValue = this.calculateScheduleValue(player, currentWeek);
      const injuryRiskValue = this.calculateInjuryRiskValue(player);

      const totalValue = 
        performanceValue * 0.35 +
        scarcityValue * 0.25 +
        consistencyValue * 0.20 +
        scheduleValue * 0.15 +
        injuryRiskValue * 0.05;

      return {
        playerId: player.id,
        name: player.name,
        position: player.position,
        team: player.team || 'FA',
        totalValue,
        components: {
          performanceValue,
          scarcityValue,
          consistencyValue,
          scheduleValue,
          injuryRiskValue
        }
      };
    });
  }

  /**
   * Calculate performance value based on stats and projections
   */
  private calculatePerformanceValue(player: any, scoringType: string): number {
    // Base value on projected points
    let baseValue = player.projectedPoints || 0;

    // Adjust for actual performance if available
    if (player.stats && player.stats.length > 0) {
      const avgPoints = player.stats.reduce((sum: number, stat: any) => 
        sum + (stat.fantasyPoints || 0), 0) / player.stats.length;
      
      // Weight actual performance more heavily than projections
      baseValue = avgPoints * 0.7 + baseValue * 0.3;
    }

    // Adjust for ADP (average draft position)
    const adpMultiplier = Math.max(0.5, Math.min(2.0, 150 / (player.adp || 150)));
    
    // Adjust for position rank
    const rankMultiplier = Math.max(0.5, Math.min(2.0, 50 / (player.positionRank || 50)));

    return baseValue * adpMultiplier * rankMultiplier;
  }

  /**
   * Calculate scarcity value based on position and tier
   */
  private calculateScarcityValue(player: any): number {
    const positionScarcity = this.positionScarcity[player.position] || 1.0;
    
    // Determine tier based on position rank
    const tier = this.getPlayerTier(player.position, player.positionRank || 99);
    const tierMultiplier = Math.max(0.5, 2.0 - (tier * 0.3));

    // Check if player is a starter-quality player
    const starterThreshold = this.getStarterThreshold(player.position);
    const isStarter = (player.positionRank || 99) <= starterThreshold;
    const starterBonus = isStarter ? 1.2 : 1.0;

    return 100 * positionScarcity * tierMultiplier * starterBonus;
  }

  /**
   * Calculate consistency value based on weekly performance
   */
  private calculateConsistencyValue(stats: any[]): number {
    if (!stats || stats.length < 3) {
      return 50; // Neutral value for insufficient data
    }

    const points = stats.map(s => s.fantasyPoints || 0);
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    
    // Calculate standard deviation
    const variance = points.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency value
    const consistencyScore = Math.max(0, 100 - (stdDev * 5));
    
    // Bonus for consistent high scorers
    const highScorerBonus = avg > 15 ? 1.2 : 1.0;
    
    return consistencyScore * highScorerBonus;
  }

  /**
   * Calculate schedule value based on upcoming matchups
   */
  private calculateScheduleValue(player: any, currentWeek: number): number {
    // Simple implementation - in production, would analyze actual opponent defenses
    const remainingWeeks = 17 - currentWeek;
    
    if (remainingWeeks <= 0) return 50;
    
    // Playoff schedule is more valuable
    const playoffWeeks = Math.max(0, Math.min(3, 17 - currentWeek));
    const playoffMultiplier = 1 + (playoffWeeks * 0.1);
    
    // Bye week consideration
    const byeWeekPassed = player.byeWeek && player.byeWeek <= currentWeek;
    const byeWeekBonus = byeWeekPassed ? 1.1 : 1.0;
    
    return 70 * playoffMultiplier * byeWeekBonus;
  }

  /**
   * Calculate injury risk value
   */
  private calculateInjuryRiskValue(player: any): number {
    // In production, would check injury history and current status
    // For now, use position-based risk
    const positionRisk = {
      QB: 0.7,
      RB: 0.5,  // Highest injury risk
      WR: 0.6,
      TE: 0.65,
      K: 0.9,
      DEF: 0.85
    };

    const riskFactor = positionRisk[player.position] || 0.7;
    
    // Age factor (if available)
    // Older players have higher injury risk
    
    return 100 * riskFactor;
  }

  /**
   * Get player tier based on position rank
   */
  private getPlayerTier(position: string, rank: number): number {
    const breakpoints = this.tierBreakpoints[position] || [20, 15, 10, 5, 2];
    
    for (let i = 0; i < breakpoints.length; i++) {
      if (rank <= breakpoints[i]) {
        return i + 1;
      }
    }
    
    return breakpoints.length + 1;
  }

  /**
   * Get starter threshold for position
   */
  private getStarterThreshold(position: string): number {
    const thresholds = {
      QB: 12,
      RB: 24,
      WR: 36,
      TE: 12,
      K: 12,
      DEF: 12
    };
    
    return thresholds[position] || 20;
  }

  /**
   * Calculate fairness score
   */
  private calculateFairnessScore(givingValue: number, receivingValue: number): number {
    if (givingValue === 0 && receivingValue === 0) return 0;
    
    const totalValue = givingValue + receivingValue;
    const difference = receivingValue - givingValue;
    
    // Calculate as percentage, capped at -100 to +100
    const rawScore = (difference / totalValue) * 200;
    return Math.max(-100, Math.min(100, rawScore));
  }

  /**
   * Analyze positional impact of the trade
   */
  private async analyzePositionalImpact(
    teamId: string,
    givingPlayers: PlayerValue[],
    receivingPlayers: PlayerValue[]
  ): Promise<any[]> {
    const currentRoster = await prisma.roster.findMany({
      where: { teamId },
      include: { player: true }
    });

    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const impact = [];

    for (const position of positions) {
      const currentCount = currentRoster.filter(r => r.player.position === position).length;
      const givingCount = givingPlayers.filter(p => p.position === position).length;
      const receivingCount = receivingPlayers.filter(p => p.position === position).length;
      
      const before = currentCount;
      const after = currentCount - givingCount + receivingCount;
      const change = after - before;

      impact.push({
        position,
        before,
        after,
        change
      });
    }

    return impact;
  }

  /**
   * Generate trade recommendation
   */
  private generateRecommendation(
    fairnessScore: number,
    positionalImpact: any[],
    givingPlayers: PlayerValue[],
    receivingPlayers: PlayerValue[]
  ): { recommendation: 'ACCEPT' | 'REJECT' | 'CONSIDER' | 'NEGOTIATE'; reasoning: string[] } {
    const reasoning: string[] = [];
    let points = 0;

    // Fairness analysis
    if (fairnessScore > 20) {
      reasoning.push('Trade significantly favors you (+20% or more value)');
      points += 3;
    } else if (fairnessScore > 5) {
      reasoning.push('Trade slightly favors you');
      points += 1;
    } else if (fairnessScore < -20) {
      reasoning.push('Trade significantly favors opponent (-20% or more value)');
      points -= 3;
    } else if (fairnessScore < -5) {
      reasoning.push('Trade slightly favors opponent');
      points -= 1;
    } else {
      reasoning.push('Trade is relatively fair');
    }

    // Position need analysis
    const criticalPositions = positionalImpact.filter(p => 
      ['QB', 'RB', 'WR', 'TE'].includes(p.position) && p.after < this.getMinimumRequired(p.position)
    );

    if (criticalPositions.length > 0) {
      reasoning.push(`Trade leaves you short at: ${criticalPositions.map(p => p.position).join(', ')}`);
      points -= 2;
    }

    // Star player analysis
    const givingStars = givingPlayers.filter(p => p.totalValue > 150);
    const receivingStars = receivingPlayers.filter(p => p.totalValue > 150);

    if (givingStars.length > receivingStars.length) {
      reasoning.push('You are giving up more star players than receiving');
      points -= 1;
    } else if (receivingStars.length > givingStars.length) {
      reasoning.push('You are receiving more star players');
      points += 1;
    }

    // Depth vs quality trade-off
    if (givingPlayers.length === 1 && receivingPlayers.length > 2) {
      reasoning.push('Trading quality for depth - good if you need roster flexibility');
      points += 0.5;
    } else if (receivingPlayers.length === 1 && givingPlayers.length > 2) {
      reasoning.push('Trading depth for quality - good if consolidating talent');
      points += 0.5;
    }

    // Generate recommendation
    let recommendation: 'ACCEPT' | 'REJECT' | 'CONSIDER' | 'NEGOTIATE';
    
    if (points >= 3) {
      recommendation = 'ACCEPT';
    } else if (points <= -3) {
      recommendation = 'REJECT';
    } else if (points >= 0) {
      recommendation = 'CONSIDER';
    } else {
      recommendation = 'NEGOTIATE';
    }

    return { recommendation, reasoning };
  }

  /**
   * Get minimum required players for position
   */
  private getMinimumRequired(position: string): number {
    const requirements = {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      K: 1,
      DEF: 1
    };
    
    return requirements[position] || 1;
  }

  /**
   * Compare two trades
   */
  async compareTrades(
    trade1: TradeAnalysis,
    trade2: TradeAnalysis
  ): Promise<{
    better: 1 | 2;
    reason: string;
    comparison: {
      metric: string;
      trade1Value: number;
      trade2Value: number;
      winner: 1 | 2;
    }[];
  }> {
    const comparison = [];
    let trade1Points = 0;
    let trade2Points = 0;

    // Compare fairness
    const fairness1 = Math.abs(trade1.fairnessScore);
    const fairness2 = Math.abs(trade2.fairnessScore);
    
    if (fairness1 < fairness2) {
      trade1Points++;
      comparison.push({
        metric: 'Fairness',
        trade1Value: fairness1,
        trade2Value: fairness2,
        winner: 1
      });
    } else {
      trade2Points++;
      comparison.push({
        metric: 'Fairness',
        trade1Value: fairness1,
        trade2Value: fairness2,
        winner: 2
      });
    }

    // Compare value gained
    if (trade1.valueDifference > trade2.valueDifference) {
      trade1Points += 2;
      comparison.push({
        metric: 'Value Gained',
        trade1Value: trade1.valueDifference,
        trade2Value: trade2.valueDifference,
        winner: 1
      });
    } else {
      trade2Points += 2;
      comparison.push({
        metric: 'Value Gained',
        trade1Value: trade1.valueDifference,
        trade2Value: trade2.valueDifference,
        winner: 2
      });
    }

    // Determine winner
    const better = trade1Points > trade2Points ? 1 : 2;
    const reason = better === 1
      ? `Trade 1 provides better value (+${trade1.valueDifference.toFixed(1)} vs +${trade2.valueDifference.toFixed(1)})`
      : `Trade 2 provides better value (+${trade2.valueDifference.toFixed(1)} vs +${trade1.valueDifference.toFixed(1)})`;

    return {
      better,
      reason,
      comparison
    };
  }
}

export const tradeValueCalculator = new TradeValueCalculator();