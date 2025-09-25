import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/cache/redis-client';

export interface PlayerProjection {
  playerId: string;
  week: number;
  projectedPoints: number;
  confidence: number; // 0-100
  factors: ProjectionFactors;
  insights: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'start' | 'sit' | 'flex' | 'bench';
}

export interface ProjectionFactors {
  recentPerformance: number;
  matchupDifficulty: number;
  homeAwayFactor: number;
  weatherImpact: number;
  injuryStatus: number;
  restDays: number;
  historicalTrends: number;
  teamGameScript: number;
  redZoneOpportunities: number;
  snapCountTrend: number;
}

export interface TeamDefenseRanking {
  teamId: string;
  vsQB: number;
  vsRB: number;
  vsWR: number;
  vsTE: number;
  vsK: number;
}

export class AIProjectionEngine {
  private readonly PROJECTION_CACHE_TTL = 3600; // 1 hour
  private readonly MIN_GAMES_FOR_PROJECTION = 3;
  
  async generateProjections(
    playerId: string, 
    week: number, 
    season: number = new Date().getFullYear()
  ): Promise<PlayerProjection> {
    const cacheKey = `ai:projection:${playerId}:${season}:${week}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch player data
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        stats: {
          where: {
            season: season.toString(),
            week: { lte: week - 1 }
          },
          orderBy: { week: 'desc' },
          take: 10
        },
        team: true
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Calculate projection factors
    const factors = await this.calculateProjectionFactors(player, week, season);
    
    // Generate base projection
    const baseProjection = this.calculateBaseProjection(player, factors);
    
    // Apply ML adjustments
    const adjustedProjection = this.applyMLAdjustments(baseProjection, factors, player);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(player, factors);
    
    // Generate insights
    const insights = this.generateInsights(player, factors, adjustedProjection);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(factors, player);
    
    // Make start/sit recommendation
    const recommendation = this.makeRecommendation(adjustedProjection, confidence, riskLevel);

    const projection: PlayerProjection = {
      playerId,
      week,
      projectedPoints: Math.round(adjustedProjection * 10) / 10,
      confidence,
      factors,
      insights,
      riskLevel,
      recommendation
    };

    // Cache the projection
    await redis.setex(cacheKey, this.PROJECTION_CACHE_TTL, JSON.stringify(projection));

    return projection;
  }

  private async calculateProjectionFactors(
    player: any, 
    week: number, 
    season: number
  ): Promise<ProjectionFactors> {
    // Recent performance (last 3 games)
    const recentGames = player.stats.slice(0, 3);
    const recentPerformance = recentGames.length > 0
      ? recentGames.reduce((sum: number, game: any) => sum + game.fantasyPoints, 0) / recentGames.length
      : 0;

    // Get upcoming opponent
    const upcomingGame = await this.getUpcomingGame(player.teamId, week, season);
    const opponentDefenseRank = await this.getDefenseRanking(upcomingGame?.opponentId);
    
    // Calculate matchup difficulty (1-10, 10 being hardest)
    const matchupDifficulty = this.calculateMatchupDifficulty(
      player.position,
      opponentDefenseRank
    );

    // Home/Away factor
    const homeAwayFactor = upcomingGame?.isHome ? 1.05 : 0.95;

    // Weather impact (simplified - would integrate weather API)
    const weatherImpact = await this.getWeatherImpact(upcomingGame);

    // Injury status
    const injuryStatus = player.injuryStatus === 'HEALTHY' ? 1.0 :
                        player.injuryStatus === 'QUESTIONABLE' ? 0.85 :
                        player.injuryStatus === 'DOUBTFUL' ? 0.5 : 0;

    // Rest days
    const restDays = this.calculateRestDays(player.stats[0]?.gameDate, upcomingGame?.gameDate);
    
    // Historical performance vs opponent
    const historicalTrends = await this.getHistoricalTrends(
      player.id,
      upcomingGame?.opponentId,
      season
    );

    // Expected game script
    const teamGameScript = await this.predictGameScript(
      player.teamId,
      upcomingGame?.opponentId
    );

    // Red zone opportunities
    const redZoneOpportunities = this.calculateRedZoneOpportunities(player);

    // Snap count trend
    const snapCountTrend = this.analyzeSnapCountTrend(player.stats);

    return {
      recentPerformance,
      matchupDifficulty,
      homeAwayFactor,
      weatherImpact,
      injuryStatus,
      restDays,
      historicalTrends,
      teamGameScript,
      redZoneOpportunities,
      snapCountTrend
    };
  }

  private calculateBaseProjection(player: any, factors: ProjectionFactors): number {
    // Start with recent performance as baseline
    let projection = factors.recentPerformance;

    // Apply position-specific calculations
    switch (player.position) {
      case 'QB':
        projection = this.projectQB(player, factors);
        break;
      case 'RB':
        projection = this.projectRB(player, factors);
        break;
      case 'WR':
        projection = this.projectWR(player, factors);
        break;
      case 'TE':
        projection = this.projectTE(player, factors);
        break;
      case 'K':
        projection = this.projectK(player, factors);
        break;
      case 'DEF':
        projection = this.projectDEF(player, factors);
        break;
    }

    return projection;
  }

  private projectQB(player: any, factors: ProjectionFactors): number {
    const avgStats = this.calculateAverageStats(player.stats, 'QB');
    
    let projection = 0;
    
    // Passing yards (0.04 points per yard)
    projection += (avgStats.passingYards * 0.04) * factors.matchupDifficulty;
    
    // Passing TDs (4 points each)
    projection += (avgStats.passingTDs * 4) * factors.teamGameScript;
    
    // Interceptions (-2 points each)
    projection -= avgStats.interceptions * 2;
    
    // Rushing yards (0.1 points per yard)
    projection += (avgStats.rushingYards * 0.1);
    
    // Rushing TDs (6 points each)
    projection += (avgStats.rushingTDs * 6);

    // Apply factors
    projection *= factors.homeAwayFactor;
    projection *= factors.weatherImpact;
    projection *= factors.injuryStatus;

    return projection;
  }

  private projectRB(player: any, factors: ProjectionFactors): number {
    const avgStats = this.calculateAverageStats(player.stats, 'RB');
    
    let projection = 0;
    
    // Rushing yards (0.1 points per yard)
    projection += (avgStats.rushingYards * 0.1) * factors.matchupDifficulty;
    
    // Rushing TDs (6 points each)
    projection += (avgStats.rushingTDs * 6) * factors.redZoneOpportunities;
    
    // Receptions (1 point PPR)
    projection += avgStats.receptions * 1;
    
    // Receiving yards (0.1 points per yard)
    projection += (avgStats.receivingYards * 0.1);
    
    // Receiving TDs (6 points each)
    projection += (avgStats.receivingTDs * 6);

    // Apply factors
    projection *= factors.teamGameScript; // RBs benefit from positive game script
    projection *= factors.snapCountTrend;
    projection *= factors.injuryStatus;

    return projection;
  }

  private projectWR(player: any, factors: ProjectionFactors): number {
    const avgStats = this.calculateAverageStats(player.stats, 'WR');
    
    let projection = 0;
    
    // Receptions (1 point PPR)
    projection += avgStats.receptions * 1;
    
    // Receiving yards (0.1 points per yard)
    projection += (avgStats.receivingYards * 0.1) * factors.matchupDifficulty;
    
    // Receiving TDs (6 points each)
    projection += (avgStats.receivingTDs * 6) * factors.redZoneOpportunities;
    
    // Bonus for big plays
    if (avgStats.receivingYards > 100) {
      projection += 3; // Bonus points
    }

    // Apply factors
    projection *= factors.homeAwayFactor;
    projection *= factors.snapCountTrend;
    projection *= factors.injuryStatus;
    
    // WRs negatively affected by bad weather
    projection *= (factors.weatherImpact * 0.9);

    return projection;
  }

  private projectTE(player: any, factors: ProjectionFactors): number {
    const avgStats = this.calculateAverageStats(player.stats, 'TE');
    
    let projection = 0;
    
    // Receptions (1 point PPR)
    projection += avgStats.receptions * 1;
    
    // Receiving yards (0.1 points per yard)
    projection += (avgStats.receivingYards * 0.1) * factors.matchupDifficulty;
    
    // Receiving TDs (6 points each)
    projection += (avgStats.receivingTDs * 6) * factors.redZoneOpportunities * 1.2; // TEs get RZ boost

    // Apply factors
    projection *= factors.snapCountTrend;
    projection *= factors.injuryStatus;

    return projection;
  }

  private projectK(player: any, factors: ProjectionFactors): number {
    const avgStats = this.calculateAverageStats(player.stats, 'K');
    
    let projection = 0;
    
    // Field goals made (3 points for <40 yards, 4 for 40-49, 5 for 50+)
    projection += avgStats.fieldGoalsMade * 3.5; // Average
    
    // Extra points (1 point each)
    projection += avgStats.extraPointsMade * 1;

    // Team scoring affects kicker opportunities
    projection *= factors.teamGameScript;
    projection *= factors.weatherImpact; // Weather heavily affects kickers

    return projection;
  }

  private projectDEF(player: any, factors: ProjectionFactors): number {
    const avgStats = this.calculateAverageStats(player.stats, 'DEF');
    
    let projection = 10; // Base points for DEF
    
    // Points allowed (negative correlation)
    projection -= avgStats.pointsAllowed * 0.5;
    
    // Sacks (1 point each)
    projection += avgStats.sacks * 1;
    
    // Interceptions (2 points each)
    projection += avgStats.interceptions * 2;
    
    // Fumble recoveries (2 points each)
    projection += avgStats.fumbleRecoveries * 2;
    
    // Defensive TDs (6 points each)
    projection += avgStats.defensiveTDs * 6;

    // Apply matchup difficulty (inverted for defense)
    projection *= (2 - factors.matchupDifficulty);

    return Math.max(0, projection); // DEF can't go negative
  }

  private applyMLAdjustments(
    baseProjection: number, 
    factors: ProjectionFactors, 
    player: any
  ): number {
    let adjusted = baseProjection;

    // Trend analysis
    const trend = this.analyzeTrend(player.stats);
    if (trend === 'ascending') {
      adjusted *= 1.1;
    } else if (trend === 'descending') {
      adjusted *= 0.9;
    }

    // Consistency factor
    const consistency = this.calculateConsistency(player.stats);
    if (consistency < 0.3) {
      // High variance player
      adjusted *= 0.95; // Slightly lower projection for volatility
    }

    // Breakout/bust potential
    const breakoutPotential = this.assessBreakoutPotential(player, factors);
    if (breakoutPotential > 0.7) {
      adjusted *= 1.15;
    }

    return adjusted;
  }

  private calculateConfidence(player: any, factors: ProjectionFactors): number {
    let confidence = 50; // Base confidence

    // More games = higher confidence
    if (player.stats.length >= 8) confidence += 20;
    else if (player.stats.length >= 5) confidence += 10;
    else if (player.stats.length < 3) confidence -= 20;

    // Injury concerns reduce confidence
    if (factors.injuryStatus < 1) confidence -= 15;

    // Consistent players increase confidence
    const consistency = this.calculateConsistency(player.stats);
    confidence += consistency * 20;

    // Weather impact reduces confidence
    if (factors.weatherImpact < 0.8) confidence -= 10;

    // Home games slightly increase confidence
    if (factors.homeAwayFactor > 1) confidence += 5;

    return Math.max(0, Math.min(100, confidence));
  }

  private generateInsights(
    player: any, 
    factors: ProjectionFactors, 
    projection: number
  ): string[] {
    const insights: string[] = [];

    // Performance trend
    const trend = this.analyzeTrend(player.stats);
    if (trend === 'ascending') {
      insights.push('📈 On an upward trend over last 3 games');
    } else if (trend === 'descending') {
      insights.push('📉 Performance declining recently');
    }

    // Matchup insight
    if (factors.matchupDifficulty > 0.7) {
      insights.push('⚠️ Tough matchup against top-10 defense');
    } else if (factors.matchupDifficulty < 0.3) {
      insights.push('✅ Favorable matchup against bottom-10 defense');
    }

    // Home/away
    if (factors.homeAwayFactor > 1) {
      insights.push('🏠 Playing at home (+5% boost)');
    }

    // Injury
    if (factors.injuryStatus < 1) {
      insights.push('🤕 Injury concern may limit production');
    }

    // Red zone
    if (factors.redZoneOpportunities > 0.7) {
      insights.push('🎯 High red zone involvement expected');
    }

    // Game script
    if (factors.teamGameScript > 0.7) {
      insights.push('📊 Positive game script projected');
    }

    return insights;
  }

  private assessRiskLevel(factors: ProjectionFactors, player: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Injury risk
    if (factors.injuryStatus < 0.9) riskScore += 30;
    if (factors.injuryStatus < 0.7) riskScore += 20;

    // Consistency risk
    const consistency = this.calculateConsistency(player.stats);
    if (consistency < 0.3) riskScore += 25;

    // Matchup risk
    if (factors.matchupDifficulty > 0.7) riskScore += 20;

    // Snap count risk
    if (factors.snapCountTrend < 0.5) riskScore += 25;

    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private makeRecommendation(
    projection: number, 
    confidence: number, 
    riskLevel: string
  ): 'start' | 'sit' | 'flex' | 'bench' {
    // High projection + high confidence = START
    if (projection >= 15 && confidence >= 70) return 'start';
    
    // Good projection but some risk = FLEX
    if (projection >= 10 && confidence >= 50) return 'flex';
    
    // Low projection or high risk = SIT/BENCH
    if (projection < 8 || riskLevel === 'high') return 'bench';
    
    // Default to sit for borderline cases
    return 'sit';
  }

  // Helper methods
  private calculateAverageStats(stats: any[], position: string): any {
    if (stats.length === 0) {
      return this.getDefaultStats(position);
    }

    const totals = stats.reduce((acc, game) => {
      Object.keys(game).forEach(key => {
        if (typeof game[key] === 'number') {
          acc[key] = (acc[key] || 0) + game[key];
        }
      });
      return acc;
    }, {});

    const averages: any = {};
    Object.keys(totals).forEach(key => {
      averages[key] = totals[key] / stats.length;
    });

    return averages;
  }

  private getDefaultStats(position: string): any {
    const defaults: any = {
      QB: { passingYards: 250, passingTDs: 1.5, interceptions: 1, rushingYards: 15, rushingTDs: 0.2 },
      RB: { rushingYards: 60, rushingTDs: 0.4, receptions: 3, receivingYards: 20, receivingTDs: 0.1 },
      WR: { receptions: 5, receivingYards: 60, receivingTDs: 0.4 },
      TE: { receptions: 4, receivingYards: 40, receivingTDs: 0.3 },
      K: { fieldGoalsMade: 1.5, extraPointsMade: 2.5 },
      DEF: { pointsAllowed: 20, sacks: 2, interceptions: 1, fumbleRecoveries: 0.5, defensiveTDs: 0.1 }
    };
    return defaults[position] || {};
  }

  private calculateConsistency(stats: any[]): number {
    if (stats.length < 2) return 0.5;

    const points = stats.map(s => s.fantasyPoints);
    const mean = points.reduce((a, b) => a + b, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize to 0-1 (lower is more consistent)
    const coefficientOfVariation = stdDev / mean;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private analyzeTrend(stats: any[]): 'ascending' | 'descending' | 'stable' {
    if (stats.length < 3) return 'stable';

    const recentPoints = stats.slice(0, 3).map(s => s.fantasyPoints);
    const olderPoints = stats.slice(3, 6).map(s => s.fantasyPoints);

    const recentAvg = recentPoints.reduce((a, b) => a + b, 0) / recentPoints.length;
    const olderAvg = olderPoints.length > 0
      ? olderPoints.reduce((a, b) => a + b, 0) / olderPoints.length
      : recentAvg;

    if (recentAvg > olderAvg * 1.15) return 'ascending';
    if (recentAvg < olderAvg * 0.85) return 'descending';
    return 'stable';
  }

  private assessBreakoutPotential(player: any, factors: ProjectionFactors): number {
    let potential = 0.5; // Base potential

    // Young players have higher breakout potential
    if (player.experience && player.experience <= 2) potential += 0.2;

    // Increasing snap count suggests breakout
    if (factors.snapCountTrend > 0.7) potential += 0.15;

    // Good matchup increases breakout chance
    if (factors.matchupDifficulty < 0.3) potential += 0.15;

    // Recent improvement trend
    const trend = this.analyzeTrend(player.stats);
    if (trend === 'ascending') potential += 0.2;

    return Math.min(1, potential);
  }

  private calculateRestDays(lastGameDate: Date | undefined, nextGameDate: Date | undefined): number {
    if (!lastGameDate || !nextGameDate) return 1;

    const diffTime = Math.abs(nextGameDate.getTime() - lastGameDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Normalize: 7 days = 1.0, more = better, less = worse
    return Math.min(1.2, diffDays / 7);
  }

  private async getUpcomingGame(teamId: string, week: number, season: number): Promise<any> {
    // Simplified - would fetch actual game data
    return {
      opponentId: 'team_123',
      isHome: Math.random() > 0.5,
      gameDate: new Date(),
      weather: 'clear'
    };
  }

  private async getDefenseRanking(teamId: string | undefined): Promise<TeamDefenseRanking> {
    // Simplified - would calculate actual rankings
    return {
      teamId: teamId || 'unknown',
      vsQB: Math.random(),
      vsRB: Math.random(),
      vsWR: Math.random(),
      vsTE: Math.random(),
      vsK: Math.random()
    };
  }

  private calculateMatchupDifficulty(position: string, defenseRank: TeamDefenseRanking): number {
    const positionMap: { [key: string]: keyof TeamDefenseRanking } = {
      QB: 'vsQB',
      RB: 'vsRB',
      WR: 'vsWR',
      TE: 'vsTE',
      K: 'vsK'
    };

    const key = positionMap[position];
    return key ? (defenseRank[key] as number) : 0.5;
  }

  private async getWeatherImpact(game: any): Promise<number> {
    if (!game) return 1;

    // Simplified weather impact
    const weatherConditions: { [key: string]: number } = {
      clear: 1.0,
      cloudy: 0.98,
      rain: 0.85,
      snow: 0.75,
      wind: 0.80,
      dome: 1.0
    };

    return weatherConditions[game.weather] || 0.9;
  }

  private async getHistoricalTrends(
    playerId: string, 
    opponentId: string | undefined, 
    season: number
  ): Promise<number> {
    // Simplified - would analyze actual historical performance
    return 1 + (Math.random() * 0.4 - 0.2); // Random between 0.8 and 1.2
  }

  private async predictGameScript(teamId: string, opponentId: string | undefined): Promise<number> {
    // Simplified game script prediction
    // 1.0 = positive (winning), 0.5 = neutral, 0 = negative (losing)
    return Math.random();
  }

  private calculateRedZoneOpportunities(player: any): number {
    // Analyze red zone involvement from recent games
    const recentGames = player.stats.slice(0, 5);
    if (recentGames.length === 0) return 0.5;

    const avgRedZoneTargets = recentGames.reduce((sum: number, game: any) => 
      sum + (game.redZoneTargets || 0), 0) / recentGames.length;

    // Normalize to 0-1 scale
    return Math.min(1, avgRedZoneTargets / 3);
  }

  private analyzeSnapCountTrend(stats: any[]): number {
    if (stats.length < 2) return 0.5;

    const recentSnaps = stats.slice(0, 3).map(s => s.snapCount || 50);
    const olderSnaps = stats.slice(3, 6).map(s => s.snapCount || 50);

    const recentAvg = recentSnaps.reduce((a, b) => a + b, 0) / recentSnaps.length;
    const olderAvg = olderSnaps.length > 0
      ? olderSnaps.reduce((a, b) => a + b, 0) / olderSnaps.length
      : recentAvg;

    // Calculate trend (0-1, where 1 is strongly increasing)
    return Math.min(1, Math.max(0, 0.5 + (recentAvg - olderAvg) / 100));
  }
}

export const aiProjectionEngine = new AIProjectionEngine();