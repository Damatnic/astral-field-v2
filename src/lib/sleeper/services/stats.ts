import { sleeperClient } from '../api/client';
import { sleeperWebSocket } from '../api/websocket';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

interface SleeperScoringUpdate {
  week: number;
  season: string;
  type: 'nfl_game_stats' | 'projections';
  player_id: string;
  stats: Record<string, number>;
  fantasy_points?: Record<string, number>;
  timestamp: number;
}

interface FantasyPointsCalculation {
  playerId: string;
  week: number;
  season: string;
  stats: Record<string, number>;
  points: Record<string, number>;
  totalPoints: number;
}

interface LiveScoringConfig {
  leagueId: string;
  week: number;
  updateInterval: number;
  enableWebSocket: boolean;
  scoringSettings: Record<string, number>;
}

interface PlayerGameStats {
  player_id: string;
  season: string;
  season_type: string;
  week: number;
  game_id: string;
  team: string;
  opponent: string;
  stats: Record<string, number>;
  fantasy_points_default: number;
  fantasy_points_ppr: number;
  fantasy_points_half_ppr: number;
  last_updated: string;
}

interface ProjectedStats {
  player_id: string;
  season: string;
  week: number;
  projected_stats: Record<string, number>;
  projected_points_default: number;
  projected_points_ppr: number;
  projected_points_half_ppr: number;
  confidence: number;
  last_updated: string;
}

export class SleeperStatsService extends EventEmitter {
  private activeScoringConfigs: Map<string, LiveScoringConfig> = new Map();
  private scoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastUpdateTimestamps: Map<string, number> = new Map();

  constructor() {
    super();
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    sleeperWebSocket.on('scoreUpdate', this.handleWebSocketScoreUpdate.bind(this));
    sleeperWebSocket.on('connected', this.resubscribeToActiveLeagues.bind(this));
  }

  private async handleWebSocketScoreUpdate(data: SleeperScoringUpdate): Promise<void> {
    try {
      this.emit('liveScoreUpdate', data);
      
      // Process the scoring update
      await this.processScoringUpdate(data);
      
      // Update affected matchups
      if (data.player_id) {
        await this.updateMatchupScores(data.player_id, data.week, data.season);
      }
    } catch (error) {
      console.error('Error handling WebSocket score update:', error);
      this.emit('scoreUpdateError', error);
    }
  }

  private async resubscribeToActiveLeagues(): Promise<void> {
    for (const config of this.activeScoringConfigs.values()) {
      sleeperWebSocket.subscribeToScoring(config.leagueId, config.week);
    }
  }

  async syncLiveScoring(leagueId: string, week?: number): Promise<{
    players: number;
    matchups: number;
    lastUpdate: Date;
  }> {
    try {
      const currentWeek = week || await this.getCurrentWeek();
      const currentSeason = new Date().getFullYear().toString();
      
      console.log(`Starting live scoring sync for league ${leagueId}, week ${currentWeek}`);

      // Get league details for scoring settings
      const league = await prisma.sleeperLeague.findUnique({
        where: { id: leagueId },
        select: { 
          scoringSettings: true,
          sleeperRosters: {
            select: {
              rosterId: true,
              players: true
            }
          }
        }
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      // Get all players in the league
      const allPlayers = new Set<string>();
      league.sleeperRosters.forEach(roster => {
        roster.players.forEach((playerId: string) => allPlayers.add(playerId));
      });

      let playerCount = 0;
      let matchupCount = 0;

      // Sync stats for all league players in batches
      const playerBatches = this.createBatches(Array.from(allPlayers), 50);
      
      for (const batch of playerBatches) {
        const statsPromises = batch.map(playerId => 
          this.syncPlayerStats(playerId, currentWeek, currentSeason)
        );
        
        await Promise.allSettled(statsPromises);
        playerCount += batch.length;
        
        // Small delay between batches to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update matchup scores
      const matchups = await prisma.sleeperMatchup.findMany({
        where: {
          leagueId,
          week: currentWeek
        }
      });

      for (const matchup of matchups) {
        const updatedPoints = await this.calculateMatchupPoints(
          matchup.starters as string[],
          league.scoringSettings as Record<string, number>,
          currentWeek,
          currentSeason
        );

        await prisma.sleeperMatchup.update({
          where: {
            leagueId_week_rosterId: {
              leagueId,
              week: currentWeek,
              rosterId: matchup.rosterId
            }
          },
          data: {
            points: updatedPoints,
            syncedAt: new Date()
          }
        });
        matchupCount++;
      }

      const lastUpdate = new Date();
      this.lastUpdateTimestamps.set(leagueId, lastUpdate.getTime());

      console.log(`Live scoring sync completed: ${playerCount} players, ${matchupCount} matchups`);

      return {
        players: playerCount,
        matchups: matchupCount,
        lastUpdate
      };
    } catch (error) {
      console.error(`Error syncing live scoring for league ${leagueId}:`, error);
      throw error;
    }
  }

  async startLiveScoring(config: LiveScoringConfig): Promise<void> {
    const configKey = `${config.leagueId}:${config.week}`;
    
    // Store configuration
    this.activeScoringConfigs.set(configKey, config);
    
    // Subscribe to WebSocket updates if enabled
    if (config.enableWebSocket) {
      sleeperWebSocket.subscribeToScoring(config.leagueId, config.week);
    }
    
    // Start periodic updates
    const interval = setInterval(async () => {
      try {
        await this.syncLiveScoring(config.leagueId, config.week);
        this.emit('scoringUpdate', { leagueId: config.leagueId, week: config.week });
      } catch (error) {
        this.emit('scoringError', { leagueId: config.leagueId, week: config.week, error });
      }
    }, config.updateInterval);
    
    this.scoringIntervals.set(configKey, interval);
    
    // Initial sync
    await this.syncLiveScoring(config.leagueId, config.week);
  }

  async stopLiveScoring(leagueId: string, week: number): Promise<void> {
    const configKey = `${leagueId}:${week}`;
    
    // Clear interval
    const interval = this.scoringIntervals.get(configKey);
    if (interval) {
      clearInterval(interval);
      this.scoringIntervals.delete(configKey);
    }
    
    // Unsubscribe from WebSocket
    sleeperWebSocket.unsubscribeFromScoring(leagueId, week);
    
    // Remove configuration
    this.activeScoringConfigs.delete(configKey);
  }

  async calculateFantasyPoints(
    playerId: string,
    stats: Record<string, number>,
    scoringSettings: Record<string, number>
  ): Promise<number> {
    let totalPoints = 0;
    
    // Standard scoring categories with default values
    const defaultScoring = {
      'pass_yd': 0.04,
      'pass_td': 4,
      'pass_int': -2,
      'rush_yd': 0.1,
      'rush_td': 6,
      'rec': 0, // PPR leagues set this to 1
      'rec_yd': 0.1,
      'rec_td': 6,
      'fum_lost': -2,
      'fum_rec_td': 6,
      'def_int': 2,
      'def_fum_rec': 2,
      'def_td': 6,
      'def_sack': 1,
      'def_safety': 2,
      'def_pa': 0, // Points allowed scoring
      'def_ya': 0, // Yards allowed scoring
      'xpm': 1,
      'fgm_0_19': 3,
      'fgm_20_29': 3,
      'fgm_30_39': 3,
      'fgm_40_49': 4,
      'fgm_50p': 5,
      'fgmiss': -1
    };
    
    // Merge with league-specific scoring
    const scoring = { ...defaultScoring, ...scoringSettings };
    
    // Calculate points for each stat
    for (const [statType, value] of Object.entries(stats)) {
      if (scoring[statType] && value) {
        totalPoints += value * scoring[statType];
      }
    }
    
    // Handle special defense scoring (points/yards allowed)
    if (stats.def_pa !== undefined) {
      totalPoints += this.calculateDefensePointsAllowed(stats.def_pa, scoring);
    }
    
    if (stats.def_ya !== undefined) {
      totalPoints += this.calculateDefenseYardsAllowed(stats.def_ya, scoring);
    }
    
    return Math.round(totalPoints * 100) / 100; // Round to 2 decimal places
  }

  private calculateDefensePointsAllowed(pointsAllowed: number, scoring: Record<string, number>): number {
    // Standard defense points allowed scoring
    if (pointsAllowed === 0) return scoring.def_pa_0 || 10;
    if (pointsAllowed <= 6) return scoring.def_pa_1_6 || 7;
    if (pointsAllowed <= 13) return scoring.def_pa_7_13 || 4;
    if (pointsAllowed <= 20) return scoring.def_pa_14_20 || 1;
    if (pointsAllowed <= 27) return scoring.def_pa_21_27 || 0;
    if (pointsAllowed <= 34) return scoring.def_pa_28_34 || -1;
    return scoring.def_pa_35p || -4;
  }

  private calculateDefenseYardsAllowed(yardsAllowed: number, scoring: Record<string, number>): number {
    // Standard defense yards allowed scoring
    if (yardsAllowed < 100) return scoring.def_ya_0_99 || 10;
    if (yardsAllowed <= 199) return scoring.def_ya_100_199 || 7;
    if (yardsAllowed <= 299) return scoring.def_ya_200_299 || 4;
    if (yardsAllowed <= 399) return scoring.def_ya_300_399 || 1;
    if (yardsAllowed <= 449) return scoring.def_ya_400_449 || 0;
    if (yardsAllowed <= 499) return scoring.def_ya_450_499 || -1;
    return scoring.def_ya_500p || -4;
  }

  async syncPlayerStats(playerId: string, week: number, season: string): Promise<PlayerGameStats | null> {
    try {
      const stats = await sleeperClient.getPlayerStats(playerId, season, week);
      
      if (!stats) {
        return null;
      }

      // Store in database
      await prisma.sleeperPlayerStat.upsert({
        where: {
          playerId_season_week: {
            playerId,
            season,
            week
          }
        },
        update: {
          stats: stats.stats || {},
          fantasyPointsDefault: stats.fantasy_points_default || 0,
          fantasyPointsPpr: stats.fantasy_points_ppr || 0,
          fantasyPointsHalfPpr: stats.fantasy_points_half_ppr || 0,
          lastUpdated: new Date(stats.last_updated || new Date()),
          syncedAt: new Date()
        },
        create: {
          playerId,
          season,
          week,
          gameId: stats.game_id || '',
          team: stats.team || '',
          opponent: stats.opponent || '',
          stats: stats.stats || {},
          fantasyPointsDefault: stats.fantasy_points_default || 0,
          fantasyPointsPpr: stats.fantasy_points_ppr || 0,
          fantasyPointsHalfPpr: stats.fantasy_points_half_ppr || 0,
          lastUpdated: new Date(stats.last_updated || new Date())
        }
      });

      return stats;
    } catch (error) {
      console.error(`Error syncing stats for player ${playerId}:`, error);
      return null;
    }
  }

  async syncProjectedStats(playerId: string, week: number, season: string): Promise<ProjectedStats | null> {
    try {
      const projections = await sleeperClient.getPlayerProjections(playerId, season, week);
      
      if (!projections) {
        return null;
      }

      // Store in database
      await prisma.sleeperPlayerProjection.upsert({
        where: {
          playerId_season_week: {
            playerId,
            season,
            week
          }
        },
        update: {
          projectedStats: projections.projected_stats || {},
          projectedPointsDefault: projections.projected_points_default || 0,
          projectedPointsPpr: projections.projected_points_ppr || 0,
          projectedPointsHalfPpr: projections.projected_points_half_ppr || 0,
          confidence: projections.confidence || 0,
          lastUpdated: new Date(projections.last_updated || new Date()),
          syncedAt: new Date()
        },
        create: {
          playerId,
          season,
          week,
          projectedStats: projections.projected_stats || {},
          projectedPointsDefault: projections.projected_points_default || 0,
          projectedPointsPpr: projections.projected_points_ppr || 0,
          projectedPointsHalfPpr: projections.projected_points_half_ppr || 0,
          confidence: projections.confidence || 0,
          lastUpdated: new Date(projections.last_updated || new Date())
        }
      });

      return projections;
    } catch (error) {
      console.error(`Error syncing projections for player ${playerId}:`, error);
      return null;
    }
  }

  private async calculateMatchupPoints(
    starterIds: string[],
    scoringSettings: Record<string, number>,
    week: number,
    season: string
  ): Promise<number> {
    let totalPoints = 0;

    for (const playerId of starterIds) {
      const playerStats = await prisma.sleeperPlayerStat.findUnique({
        where: {
          playerId_season_week: {
            playerId,
            season,
            week
          }
        }
      });

      if (playerStats) {
        const points = await this.calculateFantasyPoints(
          playerId,
          playerStats.stats as Record<string, number>,
          scoringSettings
        );
        totalPoints += points;
      }
    }

    return Math.round(totalPoints * 100) / 100;
  }

  private async updateMatchupScores(playerId: string, week: number, season: string): Promise<void> {
    // Find all matchups that include this player
    const matchups = await prisma.sleeperMatchup.findMany({
      where: {
        week,
        starters: {
          has: playerId
        }
      },
      include: {
        league: {
          select: {
            scoringSettings: true
          }
        }
      }
    });

    // Update each affected matchup
    for (const matchup of matchups) {
      const updatedPoints = await this.calculateMatchupPoints(
        matchup.starters as string[],
        matchup.league.scoringSettings as Record<string, number>,
        week,
        season
      );

      await prisma.sleeperMatchup.update({
        where: {
          leagueId_week_rosterId: {
            leagueId: matchup.leagueId,
            week: matchup.week,
            rosterId: matchup.rosterId
          }
        },
        data: {
          points: updatedPoints,
          syncedAt: new Date()
        }
      });

      // Emit real-time update event
      this.emit('matchupScoreUpdate', {
        leagueId: matchup.leagueId,
        week: matchup.week,
        rosterId: matchup.rosterId,
        points: updatedPoints,
        playerId
      });
    }
  }

  private async processScoringUpdate(update: SleeperScoringUpdate): Promise<void> {
    // Store the raw scoring update
    await prisma.sleeperScoringUpdate.create({
      data: {
        playerId: update.player_id,
        week: update.week,
        season: update.season,
        type: update.type,
        stats: update.stats,
        fantasyPoints: update.fantasy_points || {},
        timestamp: new Date(update.timestamp)
      }
    });

    // Update player stats if this is a game stats update
    if (update.type === 'nfl_game_stats') {
      await this.syncPlayerStats(update.player_id, update.week, update.season);
    }
  }

  async getPlayerScoring(
    playerId: string,
    week: number,
    season: string,
    scoringSettings?: Record<string, number>
  ): Promise<FantasyPointsCalculation | null> {
    const playerStats = await prisma.sleeperPlayerStat.findUnique({
      where: {
        playerId_season_week: {
          playerId,
          season,
          week
        }
      }
    });

    if (!playerStats) {
      return null;
    }

    const stats = playerStats.stats as Record<string, number>;
    let points: Record<string, number> = {};
    let totalPoints = 0;

    if (scoringSettings) {
      // Calculate custom scoring
      totalPoints = await this.calculateFantasyPoints(playerId, stats, scoringSettings);
      
      // Break down points by category
      for (const [statType, value] of Object.entries(stats)) {
        if (scoringSettings[statType] && value) {
          points[statType] = value * scoringSettings[statType];
        }
      }
    } else {
      // Use default scoring from stored data
      totalPoints = playerStats.fantasyPointsDefault;
    }

    return {
      playerId,
      week,
      season,
      stats,
      points,
      totalPoints
    };
  }

  async getLeagueScoring(leagueId: string, week: number): Promise<any[]> {
    const matchups = await prisma.sleeperMatchup.findMany({
      where: {
        leagueId,
        week
      },
      include: {
        roster: {
          include: {
            owner: true
          }
        }
      },
      orderBy: {
        points: 'desc'
      }
    });

    return matchups.map(matchup => ({
      rosterId: matchup.rosterId,
      owner: matchup.roster.owner,
      points: matchup.points,
      projectedPoints: matchup.projectedPoints,
      starters: matchup.starters,
      startersPoints: matchup.startersPoints,
      lastUpdated: matchup.syncedAt
    }));
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async getCurrentWeek(): Promise<number> {
    try {
      const nflState = await sleeperClient.getNFLState();
      return nflState.week || 1;
    } catch (error) {
      console.warn('Could not get current NFL week, defaulting to 1');
      return 1;
    }
  }

  // Utility methods for scoring management
  getActiveScoringConfigs(): LiveScoringConfig[] {
    return Array.from(this.activeScoringConfigs.values());
  }

  getLastUpdateTimestamp(leagueId: string): number | null {
    return this.lastUpdateTimestamps.get(leagueId) || null;
  }

  async stopAllLiveScoring(): Promise<void> {
    for (const [configKey, config] of this.activeScoringConfigs.entries()) {
      const [leagueId, week] = configKey.split(':');
      await this.stopLiveScoring(leagueId, parseInt(week));
    }
  }
}

// Singleton instance
export const sleeperStatsService = new SleeperStatsService();