/**
 * Vortex Analytics Engine - Elite Data Processing Pipeline
 * Comprehensive fantasy football analytics with real-time streaming capabilities
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { weatherService } from '../services/weather-service';
import { injuryService } from '../services/injury-service';
import { scheduleService } from '../services/schedule-service';

// Types for Analytics Engine
export interface PlayerPerformanceData {
  playerId: string;
  week: number;
  season: number;
  fantasyPoints: number;
  projectedPoints: number;
  stats: {
    passingYards?: number;
    passingTds?: number;
    interceptions?: number;
    rushingYards?: number;
    rushingTds?: number;
    fumbles?: number;
    receptions?: number;
    receivingYards?: number;
    receivingTds?: number;
    targets?: number;
    snapPercentage?: number;
    redZoneTargets?: number;
    goalLineCarries?: number;
  };
}

export interface TeamAnalytics {
  teamId: string;
  week: number;
  totalPoints: number;
  projectedPoints: number;
  benchPoints: number;
  optimalPoints: number;
  rank: number;
  playerPerformances: PlayerPerformanceData[];
}

export interface MatchupPrediction {
  matchupId: string;
  homeTeamProjection: number;
  awayTeamProjection: number;
  winProbability: number;
  volatility: number;
  keyPlayers: string[];
  confidenceLevel: number;
}

export interface WaiverRecommendation {
  playerId: string;
  priorityLevel: number;
  reasonsToAdd: string[];
  emergingPlayer: boolean;
  breakoutCandidate: boolean;
  expectedOwnership: number;
  faabRecommendation: number;
}

export class VortexAnalyticsEngine {
  private prisma: PrismaClient;
  private redis: Redis;
  private isProcessing: boolean = false;

  constructor(prisma: PrismaClient, redis?: Redis) {
    this.prisma = prisma;
    this.redis = redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Main processing pipeline for weekly analytics
   */
  async processWeeklyAnalytics(week: number, season: number = 2025): Promise<void> {
    if (this.isProcessing) {
      console.log('Analytics processing already in progress...');
      return;
    }

    this.isProcessing = true;
    try {
      // Process in parallel for maximum performance
      await Promise.all([
        this.processPlayerAnalytics(week, season),
        this.processTeamAnalytics(week, season),
        this.processMatchupAnalytics(week, season),
        this.processWaiverWireAnalytics(week, season),
        this.processLeagueAnalytics(week, season)
      ]);

      // Update derived analytics
      await this.updatePlayerConsistency(season);
      await this.updateStrengthOfSchedule(week, season);
      
      // Cache results for fast retrieval
      await this.cacheAnalyticsResults(week, season);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('❌ Analytics processing error:', error);

      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual player performance analytics
   */
  async processPlayerAnalytics(week: number, season: number): Promise<void> {
    const players = await this.prisma.player.findMany({
      where: { isFantasyRelevant: true },
      include: {
        stats: {
          where: { week, season },
          take: 1
        },
        projections: {
          where: { week, season },
          take: 1
        }
      }
    });

    const analyticsData = await Promise.all(
      players.map(async (player) => {
        const currentWeekStats = player.stats[0];
        const projection = player.projections[0];
        
        if (!currentWeekStats) return null;

        // Calculate advanced metrics
        const historicalStats = await this.getPlayerHistoricalStats(player.id, week, season);
        const consistency = this.calculateConsistencyScore(historicalStats);
        const trend = this.calculateTrendScore(historicalStats);
        const volume = this.calculateVolumeScore(currentWeekStats);
        const efficiency = this.calculateEfficiencyScore(currentWeekStats);

        // Parse stats JSON
        const stats = JSON.parse(currentWeekStats.stats || '{}');

        return {
          playerId: player.id,
          week,
          season,
          fantasyPoints: currentWeekStats.fantasyPoints,
          projectedPoints: projection?.projectedPoints || 0,
          target: stats.targets || 0,
          receptions: stats.receptions || 0,
          rushingYards: stats.rushingYards || 0,
          passingYards: stats.passingYards || 0,
          touchdowns: (stats.passingTds || 0) + (stats.rushingTds || 0) + (stats.receivingTds || 0),
          snapPercentage: stats.snapPercentage || 0,
          redZoneTargets: stats.redZoneTargets || 0,
          goalLineCarries: stats.goalLineCarries || 0,
          ownership: await this.calculateOwnership(player.id),
          consistencyScore: consistency,
          volumeScore: volume,
          efficiencyScore: efficiency,
          trendScore: trend
        };
      })
    );

    // Filter out null results and batch insert
    const validAnalytics = analyticsData.filter(Boolean);
    
    for (const analytics of validAnalytics) {
      if (analytics) {
        await this.prisma.playerWeeklyAnalytics.upsert({
          where: {
            playerId_week_season: {
              playerId: analytics.playerId,
              week: analytics.week,
              season: analytics.season
            }
          },
          update: analytics,
          create: analytics
        });
      }
    }
  }

  /**
   * Process team-level analytics and scoring trends
   */
  async processTeamAnalytics(week: number, season: number): Promise<void> {
    const teams = await this.prisma.team.findMany({
      include: {
        roster: {
          include: {
            player: {
              include: {
                stats: {
                  where: { week, season }
                }
              }
            }
          }
        }
      }
    });

    for (const team of teams) {
      // Calculate team metrics
      const teamMetrics = await this.calculateTeamMetrics(team, week, season);
      const movingAverage = await this.calculateMovingAverage(team.id, week, season);
      const rank = await this.calculateTeamRank(team.id, week, season);

      await this.prisma.weeklyTeamStats.upsert({
        where: {
          teamId_week_season: {
            teamId: team.id,
            week,
            season
          }
        },
        update: {
          totalPoints: teamMetrics.totalPoints,
          projectedPoints: teamMetrics.projectedPoints,
          benchPoints: teamMetrics.benchPoints,
          optimalPoints: teamMetrics.optimalPoints,
          rank,
          movingAverage
        },
        create: {
          teamId: team.id,
          week,
          season,
          totalPoints: teamMetrics.totalPoints,
          projectedPoints: teamMetrics.projectedPoints,
          benchPoints: teamMetrics.benchPoints,
          optimalPoints: teamMetrics.optimalPoints,
          rank,
          movingAverage
        }
      });
    }
  }

  /**
   * Process matchup predictions and head-to-head analysis
   */
  async processMatchupAnalytics(week: number, season: number): Promise<void> {
    const matchups = await this.prisma.matchup.findMany({
      where: { week, season },
      include: {
        homeTeam: {
          include: {
            roster: {
              include: {
                player: true
              }
            }
          }
        },
        awayTeam: {
          include: {
            roster: {
              include: {
                player: true
              }
            }
          }
        }
      }
    });

    for (const matchup of matchups) {
      const analytics = await this.calculateMatchupAnalytics(matchup, week, season);
      
      await this.prisma.matchupAnalytics.upsert({
        where: {
          matchupId_week_season: {
            matchupId: matchup.id,
            week,
            season
          }
        },
        update: analytics,
        create: {
          matchupId: matchup.id,
          week,
          season,
          ...analytics
        }
      });
    }
  }

  /**
   * Process waiver wire recommendations and pickup analytics
   */
  async processWaiverWireAnalytics(week: number, season: number): Promise<void> {
    const availablePlayers = await this.getAvailablePlayers();
    
    for (const player of availablePlayers) {
      const analytics = await this.calculateWaiverWireAnalytics(player, week, season);
      
      await this.prisma.waiverWireAnalytics.upsert({
        where: {
          playerId_week_season: {
            playerId: player.id,
            week,
            season
          }
        },
        update: analytics,
        create: {
          playerId: player.id,
          week,
          season,
          ...analytics
        }
      });
    }
  }

  /**
   * Process league-wide statistics and power rankings
   */
  async processLeagueAnalytics(week: number, season: number): Promise<void> {
    const leagues = await this.prisma.league.findMany({
      include: {
        teams: {
          include: {
            weeklyStats: {
              where: { week, season }
            }
          }
        }
      }
    });

    for (const league of leagues) {
      const analytics = await this.calculateLeagueAnalytics(league, week, season);
      
      await this.prisma.leagueAnalytics.upsert({
        where: {
          leagueId_week_season: {
            leagueId: league.id,
            week,
            season
          }
        },
        update: analytics,
        create: {
          leagueId: league.id,
          week,
          season,
          ...analytics
        }
      });
    }
  }

  /**
   * Calculate advanced player consistency metrics
   */
  async updatePlayerConsistency(season: number): Promise<void> {
    const players = await this.prisma.player.findMany({
      where: { isFantasyRelevant: true },
      include: {
        weeklyAnalytics: {
          where: { season }
        }
      }
    });

    for (const player of players) {
      if (player.weeklyAnalytics.length === 0) continue;

      const points = player.weeklyAnalytics.map(w => w.fantasyPoints);
      const consistency = this.calculateDetailedConsistency(points);

      await this.prisma.playerConsistency.upsert({
        where: {
          playerId_season: {
            playerId: player.id,
            season
          }
        },
        update: consistency,
        create: {
          playerId: player.id,
          season,
          ...consistency
        }
      });
    }
  }

  /**
   * Update strength of schedule calculations
   */
  async updateStrengthOfSchedule(week: number, season: number): Promise<void> {
    const teams = await this.prisma.team.findMany();

    for (const team of teams) {
      const sosData = await this.calculateStrengthOfSchedule(team.id, week, season);
      
      await this.prisma.strengthOfSchedule.upsert({
        where: {
          teamId_week_season: {
            teamId: team.id,
            week,
            season
          }
        },
        update: sosData,
        create: {
          teamId: team.id,
          week,
          season,
          ...sosData
        }
      });
    }
  }

  /**
   * Cache analytics results for high-performance queries
   */
  async cacheAnalyticsResults(week: number, season: number): Promise<void> {
    try {
      // Cache key analytics data with TTL
      const cacheKeys = {
        playerAnalytics: `analytics:players:${season}:${week}`,
        teamAnalytics: `analytics:teams:${season}:${week}`,
        matchupAnalytics: `analytics:matchups:${season}:${week}`,
        leagueAnalytics: `analytics:league:${season}:${week}`,
        waiverAnalytics: `analytics:waivers:${season}:${week}`
      };

      // Fetch and cache data
      const [players, teams, matchups, leagues, waivers] = await Promise.all([
        this.prisma.playerWeeklyAnalytics.findMany({ where: { week, season } }),
        this.prisma.weeklyTeamStats.findMany({ where: { week, season } }),
        this.prisma.matchupAnalytics.findMany({ where: { week, season } }),
        this.prisma.leagueAnalytics.findMany({ where: { week, season } }),
        this.prisma.waiverWireAnalytics.findMany({ where: { week, season } })
      ]);

      // Cache with 1 hour TTL
      const cachePromises = [
        this.redis.setex(cacheKeys.playerAnalytics, 3600, JSON.stringify(players)),
        this.redis.setex(cacheKeys.teamAnalytics, 3600, JSON.stringify(teams)),
        this.redis.setex(cacheKeys.matchupAnalytics, 3600, JSON.stringify(matchups)),
        this.redis.setex(cacheKeys.leagueAnalytics, 3600, JSON.stringify(leagues)),
        this.redis.setex(cacheKeys.waiverAnalytics, 3600, JSON.stringify(waivers))
      ];

      await Promise.all(cachePromises);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('❌ Cache error:', error);

      }
      // Continue without caching if Redis is unavailable
    }
  }

  // Helper methods for calculations
  private async getPlayerHistoricalStats(playerId: string, currentWeek: number, season: number) {
    return this.prisma.playerStats.findMany({
      where: {
        playerId,
        season,
        week: { lt: currentWeek }
      },
      orderBy: { week: 'desc' },
      take: 5 // Last 5 weeks
    });
  }

  private calculateConsistencyScore(historicalStats: any[]): number {
    if (historicalStats.length < 2) return 0;
    
    const points = historicalStats.map(s => s.fantasyPoints);
    const average = points.reduce((a, b) => a + b, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / points.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower coefficient of variation = higher consistency
    return average > 0 ? Math.max(0, 1 - (standardDeviation / average)) : 0;
  }

  private calculateTrendScore(historicalStats: any[]): number {
    if (historicalStats.length < 3) return 0;
    
    const recentPoints = historicalStats.slice(0, 3).map(s => s.fantasyPoints);
    const olderPoints = historicalStats.slice(3).map(s => s.fantasyPoints);
    
    const recentAvg = recentPoints.reduce((a, b) => a + b, 0) / recentPoints.length;
    const olderAvg = olderPoints.length > 0 
      ? olderPoints.reduce((a, b) => a + b, 0) / olderPoints.length 
      : recentAvg;
    
    // Normalize trend score between -1 and 1
    return olderAvg > 0 ? Math.max(-1, Math.min(1, (recentAvg - olderAvg) / olderAvg)) : 0;
  }

  private calculateVolumeScore(stats: any): number {
    const parsedStats = JSON.parse(stats.stats || '{}');
    
    const touches = (parsedStats.rushingAttempts || 0) + (parsedStats.targets || 0);
    const snapPercentage = parsedStats.snapPercentage || 0;
    
    // Normalize volume score (higher touches and snap % = higher score)
    return Math.min(1, (touches * 0.1) + (snapPercentage * 0.01));
  }

  private calculateEfficiencyScore(stats: any): number {
    const parsedStats = JSON.parse(stats.stats || '{}');
    const fantasyPoints = stats.fantasyPoints;
    
    const touches = (parsedStats.rushingAttempts || 0) + (parsedStats.targets || 0);
    
    if (touches === 0) return 0;
    
    const pointsPerTouch = fantasyPoints / touches;
    
    // Normalize efficiency score (more points per touch = higher score)
    return Math.min(1, pointsPerTouch / 2); // Assuming 2 points per touch is excellent
  }

  private async calculateOwnership(playerId: string): Promise<number> {
    const totalTeams = await this.prisma.team.count();
    const ownedByTeams = await this.prisma.rosterPlayer.count({
      where: { playerId }
    });
    
    return totalTeams > 0 ? (ownedByTeams / totalTeams) * 100 : 0;
  }

  private async calculateTeamMetrics(team: any, week: number, season: number) {
    let totalPoints = 0;
    let projectedPoints = 0;
    let benchPoints = 0;
    let optimalPoints = 0;

    // Calculate starting lineup points
    const starters = team.roster.filter((rp: any) => rp.isStarter);
    const bench = team.roster.filter((rp: any) => !rp.isStarter);

    for (const rosterPlayer of starters) {
      const playerStats = rosterPlayer.player.stats[0];
      if (playerStats) {
        totalPoints += playerStats.fantasyPoints;
      }
    }

    for (const rosterPlayer of bench) {
      const playerStats = rosterPlayer.player.stats[0];
      if (playerStats) {
        benchPoints += playerStats.fantasyPoints;
      }
    }

    // Calculate optimal lineup (best possible score)
    const allPlayerPoints = team.roster
      .map((rp: any) => rp.player.stats[0]?.fantasyPoints || 0)
      .sort((a: number, b: number) => b - a);
    
    optimalPoints = allPlayerPoints.slice(0, 9).reduce((sum: number, points: number) => sum + points, 0);

    return {
      totalPoints,
      projectedPoints,
      benchPoints,
      optimalPoints
    };
  }

  private async calculateMovingAverage(teamId: string, week: number, season: number): Promise<number> {
    const recentWeeks = await this.prisma.weeklyTeamStats.findMany({
      where: {
        teamId,
        season,
        week: { lt: week }
      },
      orderBy: { week: 'desc' },
      take: 3
    });

    if (recentWeeks.length === 0) return 0;

    const totalPoints = recentWeeks.reduce((sum, w) => sum + w.totalPoints, 0);
    return totalPoints / recentWeeks.length;
  }

  private async calculateTeamRank(teamId: string, week: number, season: number): Promise<number> {
    const allTeamStats = await this.prisma.weeklyTeamStats.findMany({
      where: { week, season },
      orderBy: { totalPoints: 'desc' }
    });

    const teamIndex = allTeamStats.findIndex(stat => stat.teamId === teamId);
    return teamIndex + 1; // 1-based ranking
  }

  private async calculateMatchupAnalytics(matchup: any, week: number, season: number) {
    // Calculate team projections based on roster strength
    const homeProjection = await this.calculateTeamProjection(matchup.homeTeam, week, season);
    const awayProjection = await this.calculateTeamProjection(matchup.awayTeam, week, season);
    
    // Calculate win probability using logistic function
    const scoreDifference = homeProjection - awayProjection;
    const winProbability = 1 / (1 + Math.exp(-scoreDifference / 20)); // Sigmoid function
    
    // Calculate volatility based on player variance
    const homeVolatility = await this.calculateTeamVolatility(matchup.homeTeam);
    const awayVolatility = await this.calculateTeamVolatility(matchup.awayTeam);
    const volatility = (homeVolatility + awayVolatility) / 2;
    
    // Identify key players
    const keyPlayers = await this.identifyKeyPlayers(matchup.homeTeam, matchup.awayTeam);
    
    return {
      homeTeamProjection: homeProjection,
      awayTeamProjection: awayProjection,
      winProbability,
      volatility,
      keyPlayers: JSON.stringify(keyPlayers),
      weatherImpact: await this.calculateWeatherImpact(matchup.homeTeam, week, season),
      injuryRisk: await this.calculateInjuryRisk(matchup.homeTeam, matchup.awayTeam),
      confidenceLevel: Math.max(0.3, 1 - volatility) // Higher volatility = lower confidence
    };
  }

  private async calculateTeamProjection(team: any, week: number, season: number): Promise<number> {
    let totalProjection = 0;
    
    for (const rosterPlayer of team.roster) {
      if (rosterPlayer.isStarter) {
        const projection = await this.prisma.playerProjection.findFirst({
          where: {
            playerId: rosterPlayer.player.id,
            week,
            season
          }
        });
        
        if (projection) {
          totalProjection += projection.projectedPoints;
        }
      }
    }
    
    return totalProjection;
  }

  private async calculateTeamVolatility(team: any): Promise<number> {
    let totalVolatility = 0;
    let playerCount = 0;
    
    for (const rosterPlayer of team.roster) {
      if (rosterPlayer.isStarter) {
        const consistency = await this.prisma.playerConsistency.findFirst({
          where: {
            playerId: rosterPlayer.player.id,
            season: 2025
          }
        });
        
        if (consistency) {
          totalVolatility += consistency.standardDeviation;
          playerCount++;
        }
      }
    }
    
    return playerCount > 0 ? totalVolatility / playerCount : 0;
  }

  private async identifyKeyPlayers(homeTeam: any, awayTeam: any): Promise<string[]> {
    const keyPlayers: string[] = [];
    
    // Find highest projected players from both teams
    const allPlayers = [...homeTeam.roster, ...awayTeam.roster]
      .filter((rp: any) => rp.isStarter)
      .map((rp: any) => rp.player.id);
    
    // Return top 6 players (simplified - would use projections in real implementation)
    return allPlayers.slice(0, 6);
  }

  private async calculateWaiverWireAnalytics(player: any, week: number, season: number) {
    // Calculate add/drop percentages (simplified - would use historical data)
    const addPercentage = Math.random() * 20; // Placeholder
    const dropPercentage = Math.random() * 10; // Placeholder
    
    // Determine player categories
    const recentStats = await this.prisma.playerStats.findMany({
      where: {
        playerId: player.id,
        season,
        week: { lte: week }
      },
      orderBy: { week: 'desc' },
      take: 3
    });
    
    const isEmerging = recentStats.length >= 2 && 
      recentStats[0]?.fantasyPoints > (recentStats[1]?.fantasyPoints || 0) * 1.5;
    
    const isBreakout = recentStats.length >= 3 &&
      recentStats.slice(0, 2).every((stat, index) => 
        stat.fantasyPoints > (recentStats[index + 1]?.fantasyPoints || 0)
      );
    
    return {
      addPercentage,
      dropPercentage,
      faabSpent: Math.floor(addPercentage * 2), // Rough estimate
      emergingPlayer: isEmerging,
      breakoutCandidate: isBreakout,
      sleeper: player.adp > 150 && isEmerging,
      injuryReplacement: await injuryService.isInjuryReplacement(player.id, player.nflTeam || ''),
      streamingOption: ['DST', 'K'].includes(player.position),
      priorityLevel: isBreakout ? 5 : isEmerging ? 4 : Math.floor(addPercentage / 5) + 1,
      reasonsToAdd: JSON.stringify([
        isEmerging && 'Emerging player',
        isBreakout && 'Breakout candidate',
        addPercentage > 15 && 'High add percentage'
      ].filter(Boolean)),
      expectedOwnership: Math.min(100, addPercentage * 3),
      upcomingSchedule: JSON.stringify(
        await scheduleService.getUpcomingSchedule(
          player.id,
          player.name,
          player.nflTeam || '',
          player.position,
          week
        )
      )
    };
  }

  private async calculateLeagueAnalytics(league: any, week: number, season: number) {
    const teamStats = league.teams.flatMap((team: any) => team.weeklyStats);
    
    if (teamStats.length === 0) {
      return {
        averageScore: 0,
        highScore: 0,
        lowScore: 0,
        scoringVariance: 0,
        competitiveBalance: 0,
        parity: 0,
        playoffRace: JSON.stringify({}),
        strengthOfSchedule: JSON.stringify({}),
        powerRankings: JSON.stringify([]),
        trendsAnalysis: JSON.stringify({})
      };
    }
    
    const scores = teamStats.map((stat: any) => stat.totalPoints);
    const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const highScore = Math.max(...scores);
    const lowScore = Math.min(...scores);
    
    // Calculate variance
    const variance = scores.reduce((sum: number, score: number) => 
      sum + Math.pow(score - averageScore, 2), 0) / scores.length;
    
    // Calculate competitive balance (lower variance = more balanced)
    const competitiveBalance = Math.max(0, 1 - (Math.sqrt(variance) / averageScore));
    
    return {
      averageScore,
      highScore,
      lowScore,
      scoringVariance: variance,
      competitiveBalance,
      parity: competitiveBalance, // Simplified
      playoffRace: JSON.stringify(await this.calculatePlayoffProbabilities(league, week, season)),
      strengthOfSchedule: JSON.stringify(await this.calculateLeagueSOS(league, week, season)),
      powerRankings: JSON.stringify(await this.calculatePowerRankings(league, week, season)),
      trendsAnalysis: JSON.stringify(await this.calculateTrendsAnalysis(league, week, season))
    };
  }

  private calculateDetailedConsistency(points: number[]) {
    if (points.length === 0) {
      return {
        weekCount: 0,
        totalPoints: 0,
        averagePoints: 0,
        standardDeviation: 0,
        coefficient: 0,
        floorScore: 0,
        ceilingScore: 0,
        busts: 0,
        booms: 0,
        reliability: 0
      };
    }
    
    const weekCount = points.length;
    const totalPoints = points.reduce((a, b) => a + b, 0);
    const averagePoints = totalPoints / weekCount;
    
    const variance = points.reduce((sum, p) => sum + Math.pow(p - averagePoints, 2), 0) / weekCount;
    const standardDeviation = Math.sqrt(variance);
    const coefficient = averagePoints > 0 ? standardDeviation / averagePoints : 0;
    
    const sortedPoints = [...points].sort((a, b) => a - b);
    const floorIndex = Math.floor(weekCount * 0.1); // 10th percentile
    const ceilingIndex = Math.floor(weekCount * 0.9); // 90th percentile
    
    const floorScore = sortedPoints[floorIndex] || 0;
    const ceilingScore = sortedPoints[ceilingIndex] || 0;
    
    // Count busts (< 50% of average) and booms (> 150% of average)
    const busts = points.filter(p => p < averagePoints * 0.5).length;
    const booms = points.filter(p => p > averagePoints * 1.5).length;
    
    // Reliability: percentage of games within 80%-120% of average
    const reliable = points.filter(p => p >= averagePoints * 0.8 && p <= averagePoints * 1.2).length;
    const reliability = reliable / weekCount;
    
    return {
      weekCount,
      totalPoints,
      averagePoints,
      standardDeviation,
      coefficient,
      floorScore,
      ceilingScore,
      busts,
      booms,
      reliability
    };
  }

  private async calculateStrengthOfSchedule(teamId: string, week: number, season: number) {
    // Get all matchups for this team
    const matchups = await this.prisma.matchup.findMany({
      where: {
        season,
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
    
    // Calculate played and remaining SOS
    const playedMatchups = matchups.filter(m => m.week < week);
    const remainingMatchups = matchups.filter(m => m.week >= week);
    
    // Simplified SOS calculation (would use opponent strength in real implementation)
    const playedSOS = playedMatchups.length > 0 ? Math.random() * 0.4 + 0.3 : 0;
    const remainingSOS = remainingMatchups.length > 0 ? Math.random() * 0.4 + 0.3 : 0;
    
    return {
      remainingSOS,
      playedSOS,
      positionSOS: JSON.stringify(await scheduleService.getPositionSOS('ALL', week)),
      fantasyPlayoffs: await this.calculatePlayoffScheduleDifficulty(teamId, season),
      easyMatchups: remainingMatchups.filter(() => Math.random() > 0.7).length,
      hardMatchups: remainingMatchups.filter(() => Math.random() > 0.7).length
    };
  }

  private async getAvailablePlayers() {
    // Get players not on any roster (simplified)
    const rosteredPlayerIds = await this.prisma.rosterPlayer.findMany({
      select: { playerId: true }
    });
    
    const rosteredIds = rosteredPlayerIds.map(rp => rp.playerId);
    
    return this.prisma.player.findMany({
      where: {
        isFantasyRelevant: true,
        id: { notIn: rosteredIds }
      },
      take: 100 // Limit for performance
    });
  }

  /**
   * Get cached analytics data for fast retrieval
   */
  async getCachedAnalytics(type: string, week: number, season: number) {
    try {
      const cacheKey = `analytics:${type}:${season}:${week}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('Cache retrieval error:', error);

      }
      return null;
    }
  }

  /**
   * Stream real-time events for live updates
   */
  async processRealTimeEvent(eventType: string, entityType: string, entityId: string, data: any) {
    const impact = this.calculateEventImpact(eventType, data);
    
    await this.prisma.realTimeEvents.create({
      data: {
        eventType,
        entityType,
        entityId,
        data: JSON.stringify(data),
        impact,
        confidence: 1.0,
        processed: false
      }
    });

    // Trigger real-time processing if high impact
    if (impact > 0.7) {
      await this.processHighImpactEvent(eventType, entityId, data);
    }
  }

  private calculateEventImpact(eventType: string, data: any): number {
    switch (eventType) {
      case 'SCORE_UPDATE':
        return Math.min(1, (data.fantasyPoints || 0) / 30); // Normalize to 30 points max
      case 'INJURY':
        return data.severity === 'HIGH' ? 0.9 : data.severity === 'MEDIUM' ? 0.6 : 0.3;
      case 'TRADE':
        return 0.8; // Trades always have high impact
      case 'WAIVER_CLAIM':
        return 0.4;
      default:
        return 0.1;
    }
  }

  private async processHighImpactEvent(eventType: string, entityId: string, data: any) {
    // Trigger immediate analytics refresh for affected entities
    // Implementation would trigger specific analytics updates
  }

  /**
   * Calculate weather impact for matchup
   */
  private async calculateWeatherImpact(team: any, week: number, season: number): Promise<number> {
    let totalImpact = 0;
    let playerCount = 0;

    for (const rosterPlayer of team.roster) {
      if (rosterPlayer.isStarter && rosterPlayer.player.nflTeam) {
        const impact = await weatherService.getWeatherImpact(
          rosterPlayer.player.nflTeam,
          week,
          season
        );
        totalImpact += impact;
        playerCount++;
      }
    }

    return playerCount > 0 ? totalImpact / playerCount : 0;
  }

  /**
   * Calculate injury risk for matchup
   */
  private async calculateInjuryRisk(homeTeam: any, awayTeam: any): Promise<number> {
    let totalRisk = 0;
    let playerCount = 0;

    const allPlayers = [...homeTeam.roster, ...awayTeam.roster];

    for (const rosterPlayer of allPlayers) {
      if (rosterPlayer.isStarter) {
        const risk = await injuryService.calculateInjuryRisk(
          rosterPlayer.player.id,
          rosterPlayer.player.position,
          rosterPlayer.player.age
        );
        totalRisk += risk.overallRisk;
        playerCount++;
      }
    }

    return playerCount > 0 ? totalRisk / playerCount : 0;
  }

  /**
   * Calculate playoff probabilities for league
   */
  private async calculatePlayoffProbabilities(league: any, week: number, season: number) {
    const teams = league.teams;
    const probabilities: Record<string, number> = {};

    for (const team of teams) {
      // Get team's current record
      const wins = await this.prisma.matchup.count({
        where: {
          season,
          week: { lt: week },
          OR: [
            { homeTeamId: team.id, homeScore: { gt: this.prisma.matchup.fields.awayScore } },
            { awayTeamId: team.id, awayScore: { gt: this.prisma.matchup.fields.homeScore } }
          ]
        }
      });

      const losses = await this.prisma.matchup.count({
        where: {
          season,
          week: { lt: week },
          OR: [
            { homeTeamId: team.id, homeScore: { lt: this.prisma.matchup.fields.awayScore } },
            { awayTeamId: team.id, awayScore: { lt: this.prisma.matchup.fields.homeScore } }
          ]
        }
      });

      const totalGames = wins + losses;
      const winPercentage = totalGames > 0 ? wins / totalGames : 0.5;

      // Simple playoff probability based on current record
      // In production, would simulate remaining games
      probabilities[team.id] = Math.min(1, Math.max(0, winPercentage * 1.2));
    }

    return probabilities;
  }

  /**
   * Calculate league-wide strength of schedule
   */
  private async calculateLeagueSOS(league: any, week: number, season: number) {
    const sosData: Record<string, any> = {};

    for (const team of league.teams) {
      const sos = await scheduleService.calculateSOS(team.id, team.name, week);
      sosData[team.id] = sos;
    }

    return sosData;
  }

  /**
   * Calculate power rankings for league
   */
  private async calculatePowerRankings(league: any, week: number, season: number) {
    const rankings = [];

    for (const team of league.teams) {
      // Get team stats
      const stats = await this.prisma.weeklyTeamStats.findMany({
        where: {
          teamId: team.id,
          season,
          week: { lte: week }
        }
      });

      if (stats.length === 0) continue;

      // Calculate power score
      const avgPoints = stats.reduce((sum, s) => sum + s.totalPoints, 0) / stats.length;
      const recentForm = stats.slice(-3).reduce((sum, s) => sum + s.totalPoints, 0) / Math.min(3, stats.length);
      const consistency = this.calculateConsistencyScore(stats.map(s => ({ fantasyPoints: s.totalPoints })));

      const powerScore = (avgPoints * 0.4) + (recentForm * 0.4) + (consistency * 20);

      rankings.push({
        teamId: team.id,
        teamName: team.name,
        powerScore: Math.round(powerScore * 10) / 10,
        avgPoints: Math.round(avgPoints * 10) / 10,
        recentForm: Math.round(recentForm * 10) / 10,
        consistency: Math.round(consistency * 100) / 100
      });
    }

    // Sort by power score
    rankings.sort((a, b) => b.powerScore - a.powerScore);

    // Add rank
    rankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    return rankings;
  }

  /**
   * Calculate trends analysis for league
   */
  private async calculateTrendsAnalysis(league: any, week: number, season: number) {
    const trends: any = {
      hotTeams: [],
      coldTeams: [],
      risingPlayers: [],
      fallingPlayers: [],
      breakoutCandidates: []
    };

    // Analyze team trends
    for (const team of league.teams) {
      const recentStats = await this.prisma.weeklyTeamStats.findMany({
        where: {
          teamId: team.id,
          season,
          week: { lte: week }
        },
        orderBy: { week: 'desc' },
        take: 3
      });

      if (recentStats.length >= 2) {
        const recentAvg = recentStats.reduce((sum, s) => sum + s.totalPoints, 0) / recentStats.length;
        const olderStats = await this.prisma.weeklyTeamStats.findMany({
          where: {
            teamId: team.id,
            season,
            week: { lt: week - 2 }
          },
          orderBy: { week: 'desc' },
          take: 3
        });

        if (olderStats.length > 0) {
          const olderAvg = olderStats.reduce((sum, s) => sum + s.totalPoints, 0) / olderStats.length;
          const trend = (recentAvg - olderAvg) / olderAvg;

          if (trend > 0.15) {
            trends.hotTeams.push({ teamId: team.id, teamName: team.name, trend });
          } else if (trend < -0.15) {
            trends.coldTeams.push({ teamId: team.id, teamName: team.name, trend });
          }
        }
      }
    }

    return trends;
  }

  /**
   * Calculate playoff schedule difficulty
   */
  private async calculatePlayoffScheduleDifficulty(teamId: string, season: number): Promise<number> {
    // Get weeks 15-17 matchups (fantasy playoffs)
    const playoffMatchups = await this.prisma.matchup.findMany({
      where: {
        season,
        week: { gte: 15, lte: 17 },
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (playoffMatchups.length === 0) return 0.5;

    let totalDifficulty = 0;

    for (const matchup of playoffMatchups) {
      // Get opponent
      const opponent = matchup.homeTeamId === teamId ? matchup.awayTeam : matchup.homeTeam;

      // Calculate opponent strength (simplified)
      const opponentStats = await this.prisma.weeklyTeamStats.findMany({
        where: {
          teamId: opponent.id,
          season
        }
      });

      if (opponentStats.length > 0) {
        const avgPoints = opponentStats.reduce((sum, s) => sum + s.totalPoints, 0) / opponentStats.length;
        // Normalize to 0-1 scale (assuming 100-150 points is average)
        const difficulty = Math.min(1, Math.max(0, (avgPoints - 100) / 50));
        totalDifficulty += difficulty;
      }
    }

    return totalDifficulty / playoffMatchups.length;
  }
}

export default VortexAnalyticsEngine;