// Real-Time Scoring Service
// Provides live scoring updates during NFL games using Sleeper API

import { sleeperClient } from './core/sleeperClient';
import { nflStateService } from './nflStateService';
import { sleeperCache, SleeperCacheManager } from './core/cacheManager';
import { prisma as db } from '@/lib/db';
import { scoringErrorHandler } from '@/services/scoring/errorHandler';

import { handleComponentError } from '@/lib/error-handling';
export interface LiveScoreUpdate {
  leagueId: string;
  week: number;
  season: number;
  matchups: MatchupScore[];
  lastUpdated: string;
  isLive: boolean;
  nextUpdate: string;
}

export interface MatchupScore {
  matchupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeProjectedScore: number;
  awayProjectedScore: number;
  isComplete: boolean;
  playerScores: PlayerScore[];
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  rosterSlot: string;
  actualPoints: number;
  projectedPoints: number;
  isStarting: boolean;
  isLocked: boolean;
  gameStatus: 'not_started' | 'in_progress' | 'final' | 'postponed';
}

export interface ScoringSettings {
  passingYards: number;      // Points per passing yard (typically 0.04)
  passingTDs: number;        // Points per passing TD (typically 4)
  interceptions: number;     // Points per interception (typically -2)
  rushingYards: number;      // Points per rushing yard (typically 0.1)
  rushingTDs: number;        // Points per rushing TD (typically 6)
  receivingYards: number;    // Points per receiving yard (typically 0.1)
  receivingTDs: number;      // Points per receiving TD (typically 6)
  receptions: number;        // Points per reception (0 for standard, 0.5 for half-PPR, 1 for PPR)
  fieldGoals: number;        // Points per field goal (typically 3)
  extraPoints: number;       // Points per extra point (typically 1)
  defenseInterceptions: number; // Points per defensive interception (typically 2)
  defenseTDs: number;        // Points per defensive TD (typically 6)
}

export class SleeperRealTimeScoringService {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;
  private defaultScoringSettings: ScoringSettings = {
    passingYards: 0.04,
    passingTDs: 4,
    interceptions: -2,
    rushingYards: 0.1,
    rushingTDs: 6,
    receivingYards: 0.1,
    receivingTDs: 6,
    receptions: 1, // PPR
    fieldGoals: 3,
    extraPoints: 1,
    defenseInterceptions: 2,
    defenseTDs: 6,
  };

  /**
   * Start real-time scoring updates
   */
  async startRealTimeUpdates(intervalMs = 60000): Promise<void> {
    if (this.updateInterval) {return;
    }// Initial update
    await this.updateAllLeagueScores();

    // Schedule periodic updates
    this.updateInterval = setInterval(async () => {
      if (!this.isUpdating) {
        await this.updateAllLeagueScores();
      }
    }, intervalMs);
  }

  /**
   * Stop real-time scoring updates
   */
  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;}
  }

  /**
   * Update scores for all active leagues
   */
  async updateAllLeagueScores(): Promise<void> {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    try {
      const leagues = await db.league.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currentWeek: true, season: true },
      });for (const league of leagues) {
        try {
          await this.updateLeagueScores(league.id);
        } catch (error) {
          handleComponentError(error as Error, 'realTimeScoringService');
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update scores for a specific league
   */
  async updateLeagueScores(leagueId: string): Promise<LiveScoreUpdate> {
    try {
      const league = await db.league.findUnique({
        where: { id: leagueId },
        include: {
          teams: {
            include: {
              roster: {
                include: {
                  player: true,
                },
              },
            },
          },
          matchups: {
            where: {
              week: { gt: 0 },
            },
            orderBy: { week: 'desc' },
            take: 1,
          },
        },
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      const currentWeek = league.currentWeek || 1;
      const season = league.season;

      // Get current NFL state for timing
      const nflState = await nflStateService.getCurrentState();
      const isLive = await this.isCurrentlyLive();

      // Calculate matchup scores
      const matchupScores = await this.calculateMatchupScores(league, currentWeek, season);

      // Update database with new scores
      await this.updateMatchupScoresInDatabase(leagueId, currentWeek, matchupScores);

      const liveUpdate: LiveScoreUpdate = {
        leagueId,
        week: currentWeek,
        season,
        matchups: matchupScores,
        lastUpdated: new Date().toISOString(),
        isLive,
        nextUpdate: this.getNextUpdateTime(isLive),
      };

      // Cache the live scores
      await sleeperCache.set(
        `live_scores:${leagueId}:${currentWeek}`,
        liveUpdate,
        isLive ? 60000 : 300000 // 1 min if live, 5 min if not
      );return liveUpdate;
    } catch (error) {
      handleComponentError(error as Error, 'realTimeScoringService');
      throw error;
    }
  }

  /**
   * Calculate scores for all matchups in a league
   */
  private async calculateMatchupScores(
    league: any,
    week: number,
    season: number
  ): Promise<MatchupScore[]> {
    const matchupScores: MatchupScore[] = [];

    // Get current week matchups from database
    const dbMatchups = await db.matchup.findMany({
      where: {
        leagueId: league.id,
        week,
        season,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    for (const dbMatchup of dbMatchups) {
      try {
        const matchupScore = await this.calculateSingleMatchupScore(
          dbMatchup,
          week,
          season
        );
        matchupScores.push(matchupScore);
      } catch (error) {
        handleComponentError(error as Error, 'realTimeScoringService');
      }
    }

    return matchupScores;
  }

  /**
   * Calculate score for a single matchup
   */
  private async calculateSingleMatchupScore(
    dbMatchup: any,
    week: number,
    season: number
  ): Promise<MatchupScore> {
    // Get roster players for both teams
    const homeRoster = await db.rosterPlayer.findMany({
      where: { teamId: dbMatchup.homeTeamId },
      include: { player: true },
    });

    const awayRoster = await db.rosterPlayer.findMany({
      where: { teamId: dbMatchup.awayTeamId },
      include: { player: true },
    });

    // Calculate scores for each team
    const homePlayerScores = await this.calculateTeamPlayerScores(homeRoster, week, season);
    const awayPlayerScores = await this.calculateTeamPlayerScores(awayRoster, week, season);

    const homeScore = homePlayerScores
      .filter(p => p.isStarting)
      .reduce((sum, p) => sum + p.actualPoints, 0);

    const awayScore = awayPlayerScores
      .filter(p => p.isStarting)
      .reduce((sum, p) => sum + p.actualPoints, 0);

    const homeProjectedScore = homePlayerScores
      .filter(p => p.isStarting)
      .reduce((sum, p) => sum + p.projectedPoints, 0);

    const awayProjectedScore = awayPlayerScores
      .filter(p => p.isStarting)
      .reduce((sum, p) => sum + p.projectedPoints, 0);

    return {
      matchupId: dbMatchup.id,
      homeTeamId: dbMatchup.homeTeamId,
      awayTeamId: dbMatchup.awayTeamId,
      homeTeamName: dbMatchup.homeTeam.name,
      awayTeamName: dbMatchup.awayTeam.name,
      homeScore: Math.round(homeScore * 100) / 100,
      awayScore: Math.round(awayScore * 100) / 100,
      homeProjectedScore: Math.round(homeProjectedScore * 100) / 100,
      awayProjectedScore: Math.round(awayProjectedScore * 100) / 100,
      isComplete: await this.isWeekComplete(week, season),
      playerScores: [...homePlayerScores, ...awayPlayerScores],
    };
  }

  /**
   * Calculate scores for all players on a team
   */
  private async calculateTeamPlayerScores(
    rosterPlayers: any[],
    week: number,
    season: number
  ): Promise<PlayerScore[]> {
    const playerScores: PlayerScore[] = [];

    for (const rosterPlayer of rosterPlayers) {
      try {
        const playerScore = await this.calculatePlayerScore(
          rosterPlayer.player,
          rosterPlayer.rosterSlot,
          week,
          season
        );
        playerScores.push(playerScore);
      } catch (error) {
        handleComponentError(error as Error, 'realTimeScoringService');
        
        // Add zero score as fallback
        playerScores.push({
          playerId: rosterPlayer.player.id,
          playerName: rosterPlayer.player.name,
          position: rosterPlayer.player.position,
          nflTeam: rosterPlayer.player.nflTeam,
          rosterSlot: rosterPlayer.rosterSlot,
          actualPoints: 0,
          projectedPoints: 0,
          isStarting: rosterPlayer.rosterSlot !== 'BENCH',
          isLocked: false,
          gameStatus: 'not_started',
        });
      }
    }

    return playerScores;
  }

  /**
   * Calculate individual player score
   */
  private async calculatePlayerScore(
    player: any,
    rosterSlot: string,
    week: number,
    season: number
  ): Promise<PlayerScore> {
    // Get player stats from database
    const playerStats = await db.playerStats.findFirst({
      where: {
        playerId: player.id,
        week,
        season,
      },
    });

    let actualPoints = 0;
    let projectedPoints = 0;

    if (playerStats) {
      actualPoints = Number(playerStats.fantasyPoints) || 0;
      
      // Calculate points using stats if available
      if (playerStats.stats) {
        actualPoints = this.calculateFantasyPoints(playerStats.stats);
      }
    }

    // Get projection if available
    const projection = await db.playerProjection.findFirst({
      where: {
        playerId: player.id,
        week,
        season,
      },
    });

    if (projection) {
      projectedPoints = Number(projection.projectedPoints) || 0;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      nflTeam: player.nflTeam,
      rosterSlot,
      actualPoints: Math.round(actualPoints * 100) / 100,
      projectedPoints: Math.round(projectedPoints * 100) / 100,
      isStarting: rosterSlot !== 'BENCH' && rosterSlot !== 'IR',
      isLocked: await this.isPlayerLocked(player, week),
      gameStatus: await this.getPlayerGameStatus(player, week),
    };
  }

  /**
   * Calculate fantasy points from raw stats
   */
  private calculateFantasyPoints(stats: any): number {
    const settings = this.defaultScoringSettings;
    let points = 0;

    // Passing
    points += (stats.pass_yd || 0) * settings.passingYards;
    points += (stats.pass_td || 0) * settings.passingTDs;
    points += (stats.pass_int || 0) * settings.interceptions;

    // Rushing
    points += (stats.rush_yd || 0) * settings.rushingYards;
    points += (stats.rush_td || 0) * settings.rushingTDs;

    // Receiving
    points += (stats.rec_yd || 0) * settings.receivingYards;
    points += (stats.rec_td || 0) * settings.receivingTDs;
    points += (stats.rec || 0) * settings.receptions;

    // Kicking
    points += (stats.fgm || 0) * settings.fieldGoals;
    points += (stats.xpm || 0) * settings.extraPoints;

    // Defense
    points += (stats.def_int || 0) * settings.defenseInterceptions;
    points += (stats.def_td || 0) * settings.defenseTDs;

    return points;
  }

  /**
   * Update matchup scores in database
   */
  private async updateMatchupScoresInDatabase(
    leagueId: string,
    week: number,
    matchupScores: MatchupScore[]
  ): Promise<void> {
    for (const matchup of matchupScores) {
      try {
        await db.matchup.update({
          where: { id: matchup.matchupId },
          data: {
            homeScore: matchup.homeScore,
            awayScore: matchup.awayScore,
            isComplete: matchup.isComplete,
          },
        });
      } catch (error) {
        handleComponentError(error as Error, 'realTimeScoringService');
      }
    }
  }

  /**
   * Check if scoring is currently live
   */
  private async isCurrentlyLive(): Promise<boolean> {
    try {
      const isScoringPeriod = await nflStateService.isScoringPeriod();
      return isScoringPeriod;
    } catch (error) {
      handleComponentError(error as Error, 'realTimeScoringService');
      return false;
    }
  }

  /**
   * Check if a week is complete
   */
  private async isWeekComplete(week: number, season: number): Promise<boolean> {
    try {
      const nflState = await nflStateService.getCurrentState();
      
      // Week is complete if current NFL week is greater
      if (nflState.week > week) {
        return true;
      }
      
      // Week is complete if it's the same week but we're past Tuesday
      if (nflState.week === week) {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 2 = Tuesday
        return dayOfWeek >= 2; // Tuesday or later
      }
      
      return false;
    } catch (error) {
      handleComponentError(error as Error, 'realTimeScoringService');
      return false;
    }
  }

  /**
   * Check if a player is locked
   */
  private async isPlayerLocked(player: any, week: number): Promise<boolean> {
    // Players are typically locked when their games start
    // This would require game schedule data which we can implement later
    return false;
  }

  /**
   * Get player's game status
   */
  private async getPlayerGameStatus(player: any, week: number): Promise<'not_started' | 'in_progress' | 'final' | 'postponed'> {
    // This would require game schedule data
    // For now, return a default status
    return 'not_started';
  }

  /**
   * Get next update time
   */
  private getNextUpdateTime(isLive: boolean): string {
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + (isLive ? 60000 : 300000)); // 1 min if live, 5 min if not
    return nextUpdate.toISOString();
  }

  /**
   * Get live scores for a league
   */
  async getLiveScores(leagueId: string): Promise<LiveScoreUpdate | null> {
    try {
      const league = await db.league.findUnique({
        where: { id: leagueId },
        select: { currentWeek: true },
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      const currentWeek = league.currentWeek || 1;
      
      // Try to get from cache first
      const cached = await sleeperCache.get<LiveScoreUpdate>(`live_scores:${leagueId}:${currentWeek}`);
      
      if (cached) {
        return cached;
      }

      // If not cached, calculate fresh scores
      return await this.updateLeagueScores(leagueId);
    } catch (error) {
      handleComponentError(error as Error, 'realTimeScoringService');
      
      // Use error handler for recovery
      const recoveryAction = await scoringErrorHandler.handleError(error as Error, {
        service: 'realTimeScoringService',
        operation: 'getLiveScores',
        leagueId
      });

      if (recoveryAction.type === 'fallback') {
        const fallbackData = await scoringErrorHandler.getFallbackData(leagueId);
        return fallbackData.liveScores;
      }

      return null;
    }
  }
}

// Singleton instance
export const sleeperRealTimeScoringService = new SleeperRealTimeScoringService();

export default SleeperRealTimeScoringService;