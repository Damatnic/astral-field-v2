/**
 * Player Data Synchronization Service
 * Handles syncing Sleeper player data with our database
 * 
 * Features:
 * - Bulk player import from Sleeper API
 * - Intelligent filtering for fantasy-relevant players
 * - Position and status mapping to our schema
 * - Fantasy scoring calculations
 * - Historical stats tracking
 * - Injury status monitoring
 */

import { PrismaClient, Position, PlayerStatus } from '@prisma/client';
import { SleeperApiService } from './sleeperApiService';
import { NFLStateService } from './nflStateService';
import { SleeperPlayer, PlayerStats } from '@/types/sleeper';
import { withRetry, ErrorHandler, SleeperApiError } from './errorHandler';

const prisma = new PrismaClient();

// Position mapping from Sleeper to our schema
const SLEEPER_POSITION_MAP: Record<string, Position> = {
  'QB': Position.QB,
  'RB': Position.RB,
  'WR': Position.WR,
  'TE': Position.TE,
  'K': Position.K,
  'DEF': Position.DST,
  'DL': Position.DL,
  'LB': Position.LB,
  'DB': Position.DB,
  'CB': Position.CB,
  'S': Position.S
};

// Status mapping from Sleeper to our schema
const SLEEPER_STATUS_MAP: Record<string, PlayerStatus> = {
  'Active': PlayerStatus.ACTIVE,
  'Inactive': PlayerStatus.OUT,
  'Injured Reserve': PlayerStatus.INJURED_RESERVE,
  'Physically Unable to Perform': PlayerStatus.PUP,
  'Practice Squad': PlayerStatus.PRACTICE_SQUAD
};

// Injury status mapping
const INJURY_STATUS_MAP: Record<string, PlayerStatus> = {
  'Questionable': PlayerStatus.QUESTIONABLE,
  'Doubtful': PlayerStatus.DOUBTFUL,
  'Out': PlayerStatus.OUT,
  'IR': PlayerStatus.INJURED_RESERVE,
  'PUP': PlayerStatus.PUP,
  'Suspended': PlayerStatus.SUSPENDED,
  'COV': PlayerStatus.OUT // COVID list
};

export interface SyncOptions {
  forceFullSync?: boolean;
  syncStats?: boolean;
  syncProjections?: boolean;
  batchSize?: number;
}

export interface SyncResult {
  totalPlayers: number;
  syncedPlayers: number;
  skippedPlayers: number;
  errorCount: number;
  duration: number;
  errors: string[];
}

export class PlayerSyncService {
  private sleeperApi: SleeperApiService;
  private nflState: NFLStateService;
  private isRunning: boolean = false;

  constructor() {
    this.sleeperApi = new SleeperApiService();
    this.nflState = new NFLStateService();
  }

  /**
   * Sync all players from Sleeper API to our database
   */
  async syncAllPlayers(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Player sync is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();const result: SyncResult = {
      totalPlayers: 0,
      syncedPlayers: 0,
      skippedPlayers: 0,
      errorCount: 0,
      duration: 0,
      errors: []
    };

    try {
      // Fetch all players from Sleeper
      const allPlayers = await withRetry(
        () => this.sleeperApi.getAllPlayers(),
        undefined,
        'Fetching all players from Sleeper'
      );

      const playerEntries = Object.entries(allPlayers);
      result.totalPlayers = playerEntries.length;// Process players in batches
      const batchSize = options.batchSize || 100;
      const batches = this.chunkArray(playerEntries, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} players)`);
        
        await this.processBatch(batch, result);
        
        // Small delay between batches to prevent overwhelming the database
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Sync current season stats if requested
      if (options.syncStats) {
        await this.syncCurrentSeasonStats();
      }

      // Sync projections if requested
      if (options.syncProjections) {
        await this.syncCurrentWeekProjections();
      }

      result.duration = Date.now() - startTime;
      
      console.log(`✅ Player sync complete:`, {
        synced: result.syncedPlayers,
        skipped: result.skippedPlayers,
        errors: result.errorCount,
        duration: `${(result.duration / 1000).toFixed(2)}s`
      });
      
      return result;
      
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errorCount++;
      
      const sleeperError = ErrorHandler.createSleeperError(
        error,
        '/players/nfl',
        'Player sync failed'
      );
      
      result.errors.push(sleeperError.message);
      
      console.error('❌ Player synchronization failed:', sleeperError.toJSON());
      throw sleeperError;
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a batch of players
   */
  private async processBatch(
    batch: Array<[string, SleeperPlayer]>,
    result: SyncResult
  ): Promise<void> {
    const promises = batch.map(async ([playerId, playerData]) => {
      try {
        const success = await this.syncPlayer(playerId, playerData);
        if (success) {
          result.syncedPlayers++;
        } else {
          result.skippedPlayers++;
        }
      } catch (error) {
        result.errorCount++;
        const errorMessage = `Failed to sync player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        handleComponentError(errorMessage as Error, 'playerSyncService');
      }
    });

    await Promise.all(promises);
  }

  /**
   * Sync a single player to the database
   */
  private async syncPlayer(sleeperPlayerId: string, playerData: SleeperPlayer): Promise<boolean> {
    // Only sync fantasy-relevant players
    if (!this.isFantasyRelevant(playerData)) {
      return false;
    }

    const position = SLEEPER_POSITION_MAP[playerData.position || ''];
    if (!position) {
      return false;
    }

    // Determine player status
    const status = this.determinePlayerStatus(playerData);
    const fullName = this.getPlayerName(playerData);
    
    if (!fullName) {
      return false;
    }

    try {
      await prisma.player.upsert({
        where: {
          nflId: `sleeper_${sleeperPlayerId}`
        },
        update: {
          name: fullName,
          position,
          nflTeam: playerData.team || 'FA',
          status,
          yearsExperience: playerData.years_exp || 0,
          isRookie: (playerData.years_exp || 0) === 0,
          updatedAt: new Date()
          // Store Sleeper-specific data in metadata
          // metadata: this.buildPlayerMetadata(sleeperPlayerId, playerData)
        },
        create: {
          nflId: `sleeper_${sleeperPlayerId}`,
          name: fullName,
          position,
          nflTeam: playerData.team || 'FA',
          status,
          yearsExperience: playerData.years_exp || 0,
          isRookie: (playerData.years_exp || 0) === 0
          // metadata: this.buildPlayerMetadata(sleeperPlayerId, playerData)
        }
      });

      return true;
      
    } catch (error) {
      handleComponentError(error as Error, 'playerSyncService');
      return false;
    }
  }

  /**
   * Determine if a player is fantasy-relevant
   */
  private isFantasyRelevant(player: SleeperPlayer): boolean {
    // Include active players in fantasy positions
    const fantasyPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    
    // Must have a valid position
    if (!player.position || !fantasyPositions.includes(player.position)) {
      return false;
    }

    // Must not be inactive or retired
    if (player.status === 'Inactive') {
      return false;
    }

    // Include players with teams or recent NFL experience
    if (player.team || (player.years_exp && player.years_exp > 0)) {
      return true;
    }

    // Include rookies who might be drafted
    if (player.years_exp === 0 && player.college) {
      return true;
    }

    return false;
  }

  /**
   * Determine player status based on Sleeper data
   */
  private determinePlayerStatus(player: SleeperPlayer): PlayerStatus {
    // Check injury status first
    if (player.injury_status) {
      const injuryStatus = INJURY_STATUS_MAP[player.injury_status.toUpperCase()];
      if (injuryStatus) {
        return injuryStatus;
      }
    }

    // Check general status
    if (player.status) {
      const generalStatus = SLEEPER_STATUS_MAP[player.status];
      if (generalStatus) {
        return generalStatus;
      }
    }

    // Default to active
    return PlayerStatus.ACTIVE;
  }

  /**
   * Get clean player name
   */
  private getPlayerName(player: SleeperPlayer): string {
    if (player.full_name) {
      return player.full_name.trim();
    }

    const firstName = player.first_name?.trim() || '';
    const lastName = player.last_name?.trim() || '';
    
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Build player metadata object
   */
  private buildPlayerMetadata(sleeperPlayerId: string, playerData: SleeperPlayer): any {
    return {
      sleeper: {
        player_id: sleeperPlayerId,
        age: playerData.age,
        height: playerData.height,
        weight: playerData.weight,
        college: playerData.college,
        birth_date: playerData.birth_date,
        injury_status: playerData.injury_status,
        injury_body_part: playerData.injury_body_part,
        injury_notes: playerData.injury_notes,
        news_updated: playerData.news_updated,
        fantasy_data_id: playerData.fantasy_data_id,
        yahoo_id: playerData.yahoo_id,
        rotowire_id: playerData.rotowire_id,
        search_full_name: playerData.search_full_name
      },
      lastSyncAt: new Date().toISOString()
    };
  }

  /**
   * Sync current season player stats
   */
  async syncCurrentSeasonStats(): Promise<void> {try {
      const currentSeason = await this.nflState.getCurrentSeason();
      const stats = await this.sleeperApi.getPlayerStats(currentSeason);
      
      let processedCount = 0;
      const errors: string[] = [];

      for (const [sleeperPlayerId, playerStats] of Object.entries(stats)) {
        try {
          await this.updatePlayerSeasonStats(sleeperPlayerId, playerStats, parseInt(currentSeason));
          processedCount++;
        } catch (error) {
          const errorMsg = `Failed to update stats for ${sleeperPlayerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          handleComponentError(errorMsg as Error, 'playerSyncService');
        }
      }if (errors.length > 0) {}
      
    } catch (error) {
      handleComponentError(error as Error, 'playerSyncService');
      throw ErrorHandler.createSleeperError(error, undefined, 'Season stats sync failed');
    }
  }

  /**
   * Sync current week projections
   */
  async syncCurrentWeekProjections(): Promise<void> {try {
      const currentSeason = await this.nflState.getCurrentSeason();
      const currentWeek = await this.nflState.getCurrentWeek();
      
      const projections = await this.sleeperApi.getPlayerProjections(currentSeason, currentWeek);
      
      let processedCount = 0;
      
      for (const [sleeperPlayerId, projectionStats] of Object.entries(projections)) {
        try {
          await this.updatePlayerProjections(sleeperPlayerId, projectionStats, parseInt(currentSeason), currentWeek);
          processedCount++;
        } catch (error) {
          handleComponentError(error as Error, 'playerSyncService');
        }
      }} catch (error) {
      handleComponentError(error as Error, 'playerSyncService');
      throw ErrorHandler.createSleeperError(error, undefined, 'Projections sync failed');
    }
  }

  /**
   * Update player season stats
   */
  private async updatePlayerSeasonStats(
    sleeperPlayerId: string,
    playerStats: PlayerStats,
    season: number
  ): Promise<void> {
    const player = await prisma.player.findUnique({
      where: { nflId: `sleeper_${sleeperPlayerId}` },
      select: { id: true }
    });

    if (!player) return;

    // Calculate fantasy points using PPR scoring
    const fantasyPoints = this.calculateFantasyPoints(playerStats);

    // Update player's season average
    await prisma.player.update({
      where: { id: player.id },
      data: { 
        // averagePoints: playerStats.pts_ppr || fantasyPoints,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update player projections
   */
  private async updatePlayerProjections(
    sleeperPlayerId: string,
    projectionStats: PlayerStats,
    season: number,
    week: number
  ): Promise<void> {
    const player = await prisma.player.findUnique({
      where: { nflId: `sleeper_${sleeperPlayerId}` },
      select: { id: true }
    });

    if (!player) return;

    // Calculate projected fantasy points
    const projectedPoints = this.calculateFantasyPoints(projectionStats);

    // Store as a projection record
    // await prisma.playerProjection.upsert({
    //   where: {
    //     playerId_week_season: {
    //       playerId: player.id,
    //       week,
    //       season
    //     }
    //   },
    //   update: {
    //     projectedPoints,
    //     confidence: 75, // Default confidence for Sleeper projections
    //     source: 'SLEEPER',
    //     updatedAt: new Date()
    //   },
    //   create: {
    //     playerId: player.id,
    //     week,
    //     season,
    //     projectedPoints,
    //     confidence: 75,
    //     source: 'SLEEPER'
    //   }
    // });
  }

  /**
   * Calculate fantasy points from Sleeper stats
   */
  private calculateFantasyPoints(stats: PlayerStats): number {
    // Use PPR scoring if available, otherwise calculate manually
    if (stats.pts_ppr) {
      return stats.pts_ppr;
    }

    let points = 0;

    // Passing
    points += (stats.pass_yd || 0) * 0.04;
    points += (stats.pass_td || 0) * 4;
    points += (stats.pass_int || 0) * -2;
    points += (stats.pass_2pt || 0) * 2;

    // Rushing
    points += (stats.rush_yd || 0) * 0.1;
    points += (stats.rush_td || 0) * 6;
    points += (stats.rush_2pt || 0) * 2;

    // Receiving (PPR)
    points += (stats.rec_yd || 0) * 0.1;
    points += (stats.rec_td || 0) * 6;
    points += (stats.rec || 0) * 1; // PPR
    points += (stats.rec_2pt || 0) * 2;

    // Fumbles
    points += (stats.fum_lost || 0) * -2;

    // Kicking
    points += (stats.fgm_0_19 || 0) * 3;
    points += (stats.fgm_20_29 || 0) * 3;
    points += (stats.fgm_30_39 || 0) * 3;
    points += (stats.fgm_40_49 || 0) * 4;
    points += (stats.fgm_50p || 0) * 5;
    points += (stats.xpm || 0) * 1;

    // Defense
    points += (stats.def_int || 0) * 2;
    points += (stats.def_fr || 0) * 2;
    points += (stats.def_sack || 0) * 1;
    points += (stats.def_safe || 0) * 2;
    points += (stats.def_td || 0) * 6;

    // Defense points allowed (simplified)
    if (stats.def_pa !== undefined) {
      if (stats.def_pa === 0) points += 10;
      else if (stats.def_pa <= 6) points += 7;
      else if (stats.def_pa <= 13) points += 4;
      else if (stats.def_pa <= 20) points += 1;
      else if (stats.def_pa <= 27) points += 0;
      else points -= 1;
    }

    return Math.round(points * 100) / 100;
  }

  /**
   * Sync specific week stats
   */
  async syncWeekStats(season: string, week: number): Promise<SyncResult> {const startTime = Date.now();
    const result: SyncResult = {
      totalPlayers: 0,
      syncedPlayers: 0,
      skippedPlayers: 0,
      errorCount: 0,
      duration: 0,
      errors: []
    };

    try {
      const stats = await this.sleeperApi.getPlayerStats(season, week);
      const statEntries = Object.entries(stats);
      result.totalPlayers = statEntries.length;

      for (const [sleeperPlayerId, playerStats] of statEntries) {
        try {
          const success = await this.updatePlayerWeekStats(sleeperPlayerId, playerStats, parseInt(season), week);
          if (success) {
            result.syncedPlayers++;
          } else {
            result.skippedPlayers++;
          }
        } catch (error) {
          result.errorCount++;
          const errorMsg = `Failed to sync week stats for ${sleeperPlayerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
        }
      }

      result.duration = Date.now() - startTime;
      
      console.log(`✅ Week ${week} stats sync complete:`, {
        synced: result.syncedPlayers,
        skipped: result.skippedPlayers,
        errors: result.errorCount,
        duration: `${(result.duration / 1000).toFixed(2)}s`
      });

      return result;
      
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errorCount++;
      
      const sleeperError = ErrorHandler.createSleeperError(
        error,
        `/stats/nfl/regular/${season}/${week}`,
        `Week ${week} stats sync failed`
      );
      
      result.errors.push(sleeperError.message);
      console.error('❌ Week stats sync failed:', sleeperError.toJSON());
      throw sleeperError;
    }
  }

  /**
   * Update player weekly stats
   */
  private async updatePlayerWeekStats(
    sleeperPlayerId: string,
    playerStats: PlayerStats,
    season: number,
    week: number
  ): Promise<boolean> {
    const player = await prisma.player.findUnique({
      where: { nflId: `sleeper_${sleeperPlayerId}` },
      select: { id: true }
    });

    if (!player) return false;

    // Calculate fantasy points
    const fantasyPoints = this.calculateFantasyPoints(playerStats);

    try {
      await prisma.playerStats.upsert({
        where: {
          playerId_week_season: {
            playerId: player.id,
            week,
            season
          }
        },
        update: {
          stats: playerStats as any,
          fantasyPoints,
          updatedAt: new Date()
        },
        create: {
          playerId: player.id,
          week,
          season,
          stats: playerStats as any,
          fantasyPoints,
          isProjected: false
        }
      });

      return true;
    } catch (error) {
      handleComponentError(error as Error, 'playerSyncService');
      return false;
    }
  }

  /**
   * Utility function to chunk array into batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isRunning: boolean;
    lastSync?: Date;
    playerCount?: number;
  } {
    return {
      isRunning: this.isRunning
      // You could add more status info here by querying the database
    };
  }

  /**
   * Force stop sync (emergency use only)
   */
  forceStop(): void {
    this.isRunning = false;}
}

// Export singleton instance
export const playerSyncService = new PlayerSyncService();