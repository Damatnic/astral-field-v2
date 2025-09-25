/**
 * Live Score Processor
 * Handles real-time scoring calculations and updates
 */

import { prisma } from '@/lib/prisma';
import { broadcastScoringUpdate, broadcastToLeague } from '@/lib/socket/server';
import { notificationService } from '@/lib/notifications/notification-service';

export interface PlayerGameData {
  playerId: string;
  week: number;
  opponent: string;
  gameTime: Date;
  gameStatus: 'PRE' | 'LIVE' | 'FINAL' | 'POSTPONED';
  stats: PlayerStats;
  projectedStats?: PlayerStats;
}

export interface PlayerStats {
  passingYards?: number;
  passingTDs?: number;
  passingINTs?: number;
  rushingYards?: number;
  rushingTDs?: number;
  receivingYards?: number;
  receivingTDs?: number;
  receptions?: number;
  fumblesLost?: number;
  kickingFGs?: number;
  kickingXPs?: number;
  kickingFGsMissed?: number;
  defenseINTs?: number;
  defenseFumbles?: number;
  defenseSacks?: number;
  defenseTDs?: number;
  defenseSafeties?: number;
  pointsAllowed?: number;
}

export interface ScoringSettings {
  passingYards: number;
  passingTDs: number;
  passingINTs: number;
  rushingYards: number;
  rushingTDs: number;
  receivingYards: number;
  receivingTDs: number;
  receptions: number;
  fumblesLost: number;
  ppr: number; // Points per reception
}

export interface MatchupScore {
  teamId: string;
  totalPoints: number;
  projectedPoints: number;
  playerScores: {
    playerId: string;
    actualPoints: number;
    projectedPoints: number;
    position: string;
    isLocked: boolean;
  }[];
}

export class LiveScoreProcessor {
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly defaultScoringSettings: ScoringSettings = {
    passingYards: 0.04,      // 1 point per 25 yards
    passingTDs: 4,
    passingINTs: -2,
    rushingYards: 0.1,       // 1 point per 10 yards
    rushingTDs: 6,
    receivingYards: 0.1,     // 1 point per 10 yards
    receivingTDs: 6,
    receptions: 1,           // PPR
    fumblesLost: -2,
    ppr: 1
  };

  /**
   * Start live scoring for a league
   */
  async startLiveScoring(leagueId: string): Promise<void> {
    // Stop existing interval if running
    this.stopLiveScoring(leagueId);

    // Start new interval for real-time updates (every 30 seconds during games)
    const interval = setInterval(async () => {
      try {
        await this.processLiveScores(leagueId);
      } catch (error) {
        console.error(`Live scoring error for league ${leagueId}:`, error);
      }
    }, 30000); // 30 seconds

    this.updateIntervals.set(leagueId, interval);
    console.log(`Started live scoring for league ${leagueId}`);
  }

  /**
   * Stop live scoring for a league
   */
  stopLiveScoring(leagueId: string): void {
    const interval = this.updateIntervals.get(leagueId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(leagueId);
      console.log(`Stopped live scoring for league ${leagueId}`);
    }
  }

  /**
   * Process live scores for a league
   */
  async processLiveScores(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          settings: true,
          teams: {
            include: {
              roster: {
                include: {
                  player: {
                    include: {
                      stats: {
                        where: {
                          season: new Date().getFullYear(),
                          week: { gte: 1, lte: 18 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          matchups: {
            where: {
              week: { gte: 1, lte: 18 }
            }
          }
        }
      });

      if (!league) return;

      const currentWeek = league.currentWeek || this.getCurrentNFLWeek();
      
      // Get current matchups
      const currentMatchups = league.matchups.filter(m => m.week === currentWeek);
      
      // Update scores for each team
      const teamScores = new Map<string, MatchupScore>();
      
      for (const team of league.teams) {
        const score = await this.calculateTeamScore(
          team,
          currentWeek,
          league.settings?.scoringType || 'PPR'
        );
        teamScores.set(team.id, score);
      }

      // Update matchup scores in database
      await this.updateMatchupScores(currentMatchups, teamScores);

      // Broadcast updates to all league members
      broadcastScoringUpdate(leagueId, currentWeek, {
        week: currentWeek,
        teamScores: Array.from(teamScores.entries()).map(([teamId, score]) => ({
          teamId,
          ...score
        })),
        lastUpdated: new Date()
      });

      // Check for game state changes and send notifications
      await this.checkForGameStateChanges(leagueId, currentWeek, teamScores);

    } catch (error) {
      console.error('Error processing live scores:', error);
      throw error;
    }
  }

  /**
   * Calculate team score for current week
   */
  private async calculateTeamScore(
    team: any,
    week: number,
    scoringType: string
  ): Promise<MatchupScore> {
    const scoringSettings = this.getScoringSettings(scoringType);
    let totalPoints = 0;
    let projectedPoints = 0;
    const playerScores = [];

    // Get starting lineup positions
    const startingPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'];

    for (const rosterEntry of team.roster) {
      const player = rosterEntry.player;
      const isStarter = startingPositions.includes(rosterEntry.position);
      
      // Skip bench players for scoring
      if (rosterEntry.position === 'BENCH') continue;

      // Get player's stats for this week
      const weekStats = player.stats.find((s: any) => s.week === week);
      const actualPoints = weekStats ? this.calculatePlayerPoints(weekStats, scoringSettings) : 0;
      
      // Get projected points (could be from external API or database)
      const projected = player.projectedPoints || 0;

      playerScores.push({
        playerId: player.id,
        actualPoints,
        projectedPoints: projected,
        position: rosterEntry.position,
        isLocked: rosterEntry.isLocked || this.isPlayerLocked(player, week)
      });

      if (isStarter) {
        totalPoints += actualPoints;
        projectedPoints += projected;
      }
    }

    return {
      teamId: team.id,
      totalPoints,
      projectedPoints,
      playerScores
    };
  }

  /**
   * Calculate fantasy points for a player based on stats
   */
  private calculatePlayerPoints(stats: any, settings: ScoringSettings): number {
    let points = 0;

    // Passing stats
    if (stats.passingYards) points += stats.passingYards * settings.passingYards;
    if (stats.passingTDs) points += stats.passingTDs * settings.passingTDs;
    if (stats.passingINTs) points += stats.passingINTs * settings.passingINTs;

    // Rushing stats
    if (stats.rushingYards) points += stats.rushingYards * settings.rushingYards;
    if (stats.rushingTDs) points += stats.rushingTDs * settings.rushingTDs;

    // Receiving stats
    if (stats.receivingYards) points += stats.receivingYards * settings.receivingYards;
    if (stats.receivingTDs) points += stats.receivingTDs * settings.receivingTDs;
    if (stats.receptions) points += stats.receptions * settings.receptions;

    // Negative points
    if (stats.fumblesLost) points += stats.fumblesLost * settings.fumblesLost;

    // Kicking (simplified)
    if (stats.kickingFGs) points += stats.kickingFGs * 3;
    if (stats.kickingXPs) points += stats.kickingXPs * 1;
    if (stats.kickingFGsMissed) points += stats.kickingFGsMissed * -1;

    // Defense (simplified)
    if (stats.defenseINTs) points += stats.defenseINTs * 2;
    if (stats.defenseFumbles) points += stats.defenseFumbles * 2;
    if (stats.defenseSacks) points += stats.defenseSacks * 1;
    if (stats.defenseTDs) points += stats.defenseTDs * 6;
    if (stats.defenseSafeties) points += stats.defenseSafeties * 2;

    // Points allowed (defense)
    if (stats.pointsAllowed !== undefined) {
      if (stats.pointsAllowed === 0) points += 10;
      else if (stats.pointsAllowed <= 6) points += 7;
      else if (stats.pointsAllowed <= 13) points += 4;
      else if (stats.pointsAllowed <= 20) points += 1;
      else if (stats.pointsAllowed <= 27) points += 0;
      else if (stats.pointsAllowed <= 34) points -= 1;
      else points -= 4;
    }

    return Math.round(points * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get scoring settings based on league type
   */
  private getScoringSettings(scoringType: string): ScoringSettings {
    const settings = { ...this.defaultScoringSettings };
    
    switch (scoringType) {
      case 'STANDARD':
        settings.receptions = 0;
        settings.ppr = 0;
        break;
      case 'HALF_PPR':
        settings.receptions = 0.5;
        settings.ppr = 0.5;
        break;
      case 'PPR':
        settings.receptions = 1;
        settings.ppr = 1;
        break;
      default:
        // Use default PPR settings
        break;
    }

    return settings;
  }

  /**
   * Update matchup scores in database
   */
  private async updateMatchupScores(
    matchups: any[],
    teamScores: Map<string, MatchupScore>
  ): Promise<void> {
    for (const matchup of matchups) {
      const team1Score = teamScores.get(matchup.team1Id);
      const team2Score = teamScores.get(matchup.team2Id);

      if (team1Score && team2Score) {
        await prisma.matchup.update({
          where: { id: matchup.id },
          data: {
            team1Score: team1Score.totalPoints,
            team2Score: team2Score.totalPoints,
            team1Projected: team1Score.projectedPoints,
            team2Projected: team2Score.projectedPoints,
            lastUpdated: new Date()
          }
        });
      }
    }
  }

  /**
   * Check for significant game state changes and send notifications
   */
  private async checkForGameStateChanges(
    leagueId: string,
    week: number,
    teamScores: Map<string, MatchupScore>
  ): Promise<void> {
    // Check for close games (within 10 points)
    const matchups = await prisma.matchup.findMany({
      where: { leagueId, week },
      include: {
        team1: { include: { owner: true } },
        team2: { include: { owner: true } }
      }
    });

    for (const matchup of matchups) {
      const team1Score = teamScores.get(matchup.team1Id);
      const team2Score = teamScores.get(matchup.team2Id);

      if (!team1Score || !team2Score) continue;

      const difference = Math.abs(team1Score.totalPoints - team2Score.totalPoints);
      
      // Notify for close games (within 10 points)
      if (difference <= 10 && difference > 0) {
        broadcastToLeague(leagueId, 'scoring:closeGame', {
          matchupId: matchup.id,
          team1: { name: matchup.team1.name, score: team1Score.totalPoints },
          team2: { name: matchup.team2.name, score: team2Score.totalPoints },
          difference
        });
      }

      // Check for big performances (30+ points by a single player)
      const bigPerformances = [
        ...team1Score.playerScores.filter(p => p.actualPoints >= 30),
        ...team2Score.playerScores.filter(p => p.actualPoints >= 30)
      ];

      for (const performance of bigPerformances) {
        broadcastToLeague(leagueId, 'scoring:bigPerformance', {
          playerId: performance.playerId,
          points: performance.actualPoints,
          week
        });
      }
    }
  }

  /**
   * Check if a player is locked (game started or finished)
   */
  private isPlayerLocked(player: any, week: number): boolean {
    // In a real implementation, this would check game start times
    // For now, assume all players are unlocked until Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Lock all players on Tuesday (waiver processing day)
    return dayOfWeek === 2;
  }

  /**
   * Get current NFL week
   */
  private getCurrentNFLWeek(): number {
    // Simplified calculation - in production would use NFL schedule API
    const now = new Date();
    const seasonStart = new Date('2024-09-05'); // Approximate NFL season start
    const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    return Math.min(18, Math.max(1, diffWeeks));
  }

  /**
   * Simulate live player data (in production, would fetch from NFL API)
   */
  async simulatePlayerData(playerId: string, week: number): Promise<PlayerGameData | null> {
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) return null;

    // Generate realistic stats based on position
    const stats = this.generateRealisticStats(player.position);

    return {
      playerId,
      week,
      opponent: 'OPP',
      gameTime: new Date(),
      gameStatus: 'LIVE',
      stats,
      projectedStats: {
        ...stats,
        // Add some variance to projections
        passingYards: stats.passingYards ? stats.passingYards * 1.1 : undefined,
        rushingYards: stats.rushingYards ? stats.rushingYards * 0.9 : undefined
      }
    };
  }

  /**
   * Generate realistic stats for testing
   */
  private generateRealisticStats(position: string): PlayerStats {
    const stats: PlayerStats = {};

    switch (position) {
      case 'QB':
        stats.passingYards = Math.floor(Math.random() * 150) + 150; // 150-300
        stats.passingTDs = Math.floor(Math.random() * 3) + 1; // 1-3
        stats.passingINTs = Math.random() > 0.7 ? 1 : 0;
        stats.rushingYards = Math.floor(Math.random() * 30); // 0-30
        break;
      
      case 'RB':
        stats.rushingYards = Math.floor(Math.random() * 80) + 20; // 20-100
        stats.rushingTDs = Math.random() > 0.6 ? 1 : 0;
        stats.receivingYards = Math.floor(Math.random() * 40); // 0-40
        stats.receptions = Math.floor(Math.random() * 5) + 1; // 1-5
        break;

      case 'WR':
        stats.receivingYards = Math.floor(Math.random() * 80) + 20; // 20-100
        stats.receivingTDs = Math.random() > 0.7 ? 1 : 0;
        stats.receptions = Math.floor(Math.random() * 6) + 3; // 3-8
        break;

      case 'TE':
        stats.receivingYards = Math.floor(Math.random() * 60) + 10; // 10-70
        stats.receivingTDs = Math.random() > 0.8 ? 1 : 0;
        stats.receptions = Math.floor(Math.random() * 5) + 2; // 2-6
        break;

      case 'K':
        stats.kickingFGs = Math.floor(Math.random() * 3) + 1; // 1-3
        stats.kickingXPs = Math.floor(Math.random() * 4) + 1; // 1-4
        break;

      case 'DEF':
        stats.defenseINTs = Math.floor(Math.random() * 2); // 0-1
        stats.defenseSacks = Math.floor(Math.random() * 4) + 1; // 1-4
        stats.pointsAllowed = Math.floor(Math.random() * 28) + 7; // 7-35
        break;
    }

    return stats;
  }

  /**
   * Get live scores for a specific league and week
   */
  async getLiveScores(leagueId: string, week?: number): Promise<any> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        settings: true
      }
    });

    if (!league) throw new Error('League not found');

    const targetWeek = week || league.currentWeek || this.getCurrentNFLWeek();

    // Get matchups for the week
    const matchups = await prisma.matchup.findMany({
      where: { leagueId, week: targetWeek },
      include: {
        team1: {
          include: {
            roster: {
              include: {
                player: {
                  include: {
                    stats: {
                      where: { week: targetWeek }
                    }
                  }
                }
              }
            }
          }
        },
        team2: {
          include: {
            roster: {
              include: {
                player: {
                  include: {
                    stats: {
                      where: { week: targetWeek }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return {
      week: targetWeek,
      matchups: await Promise.all(matchups.map(async (matchup) => {
        const team1Score = await this.calculateTeamScore(matchup.team1, targetWeek, league.settings?.scoringType || 'PPR');
        const team2Score = await this.calculateTeamScore(matchup.team2, targetWeek, league.settings?.scoringType || 'PPR');

        return {
          id: matchup.id,
          team1: {
            id: matchup.team1.id,
            name: matchup.team1.name,
            score: team1Score.totalPoints,
            projected: team1Score.projectedPoints,
            players: team1Score.playerScores
          },
          team2: {
            id: matchup.team2.id,
            name: matchup.team2.name,
            score: team2Score.totalPoints,
            projected: team2Score.projectedPoints,
            players: team2Score.playerScores
          }
        };
      })),
      lastUpdated: new Date()
    };
  }
}

export const liveScoreProcessor = new LiveScoreProcessor();