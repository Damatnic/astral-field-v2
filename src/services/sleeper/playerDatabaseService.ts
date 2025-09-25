// Player Database Integration Service
// Syncs Sleeper API player data with our database

import { sleeperPlayerService } from './playerService';
import { prisma as db } from '@/lib/prisma';

import { handleComponentError } from '@/lib/error-handling';
export interface DatabaseSyncResult {
  playersProcessed: number;
  playersCreated: number;
  playersUpdated: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

export class SleeperPlayerDatabaseService {
  /**
   * Sync all fantasy players from Sleeper to database
   */
  async syncFantasyPlayersToDatabase(batchSize = 100): Promise<DatabaseSyncResult> {
    const startTime = Date.now();
    const result: DatabaseSyncResult = {
      playersProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    try {// Get all fantasy players from Sleeper
      const fantasyPlayers = await sleeperPlayerService.getFantasyPlayers();// Process players in batches
      for (let i = 0; i < fantasyPlayers.length; i += batchSize) {
        const batch = fantasyPlayers.slice(i, i + batchSize);
        
        try {
          await this.processBatch(batch, result);
          console.log(`[PlayerDatabaseService] Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(fantasyPlayers.length/batchSize)}`);
        } catch (error: any) {
          const errorMsg = `Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`;
          result.errors.push(errorMsg);
          handleComponentError(new Error('[PlayerDatabaseService] ${errorMsg}'), 'playerDatabaseService');
        }
      }

      result.duration = Date.now() - startTime;return result;
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
      result.duration = Date.now() - startTime;
      handleComponentError(error as Error, 'playerDatabaseService');
      return result;
    }
  }

  /**
   * Process a batch of players
   */
  private async processBatch(players: any[], result: DatabaseSyncResult): Promise<void> {
    for (const player of players) {
      try {
        const dbPlayer = await this.upsertPlayer(player);
        
        if (dbPlayer.isNew) {
          result.playersCreated++;
        } else {
          result.playersUpdated++;
        }
        
        result.playersProcessed++;
      } catch (error: any) {
        result.errors.push(`Player ${player.id} (${player.name}): ${error.message}`);
      }
    }
  }

  /**
   * Insert or update a single player
   */
  private async upsertPlayer(sleeperPlayer: any): Promise<{ isNew: boolean; player: any }> {
    try {
      // Check if player exists
      const existingPlayer = await db.player.findUnique({
        where: { sleeperPlayerId: sleeperPlayer.id }
      });

      const playerData = {
        espnId: `sleeper_${sleeperPlayer.id}`, // Required field
        sleeperPlayerId: sleeperPlayer.id,
        name: sleeperPlayer.name,
        firstName: sleeperPlayer.firstName,
        lastName: sleeperPlayer.lastName,
        position: sleeperPlayer.position,
        nflTeam: sleeperPlayer.nflTeam,
        age: sleeperPlayer.age,
        status: sleeperPlayer.status,
        injuryStatus: sleeperPlayer.injuryStatus,
        experience: sleeperPlayer.yearsExperience,
        height: sleeperPlayer.height,
        weight: sleeperPlayer.weight,
        college: sleeperPlayer.college,
        searchRank: sleeperPlayer.searchRank,
        isFantasyRelevant: Boolean(sleeperPlayer.fantasy_positions?.length > 0),
        isActive: sleeperPlayer.status === 'Active' || sleeperPlayer.status !== 'Inactive',
        lastUpdated: new Date(),
      };

      if (existingPlayer) {
        // Update existing player
        const updatedPlayer = await db.player.update({
          where: { id: existingPlayer.id },
          data: playerData,
        });
        
        return { isNew: false, player: updatedPlayer };
      } else {
        // Create new player
        const newPlayer = await db.player.create({
          data: playerData,
        });
        
        return { isNew: true, player: newPlayer };
      }
    } catch (error: any) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }

  /**
   * Sync dynasty targets specifically
   */
  async syncDynastyTargets(): Promise<DatabaseSyncResult> {
    const startTime = Date.now();
    const result: DatabaseSyncResult = {
      playersProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    try {const dynastyTargets = await sleeperPlayerService.getDynastyTargets();for (const player of dynastyTargets) {
        try {
          // Mark as dynasty target in database
          await db.player.updateMany({
            where: { sleeperPlayerId: player.id },
            data: { 
              isDynastyTarget: true,
              dynastyRank: player.searchRank || null,
              lastUpdated: new Date(),
            },
          });
          
          result.playersUpdated++;
          result.playersProcessed++;
        } catch (error: any) {
          result.errors.push(`Dynasty target ${player.id}: ${error.message}`);
        }
      }

      result.duration = Date.now() - startTime;return result;
    } catch (error: any) {
      result.errors.push(`Dynasty sync failed: ${error.message}`);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Clean up old/inactive players
   */
  async cleanupInactivePlayers(): Promise<{ removed: number; deactivated: number }> {
    try {// Get current fantasy players from Sleeper
      const currentPlayers = await sleeperPlayerService.getFantasyPlayers();
      const currentPlayerIds = new Set(currentPlayers.map(p => p.id));

      // Find database players that are no longer in Sleeper fantasy data
      const dbPlayers = await db.player.findMany({
        where: { isFantasyRelevant: true },
        select: { id: true, sleeperPlayerId: true, name: true },
      });

      let deactivated = 0;
      let removed = 0;

      for (const dbPlayer of dbPlayers) {
        if (dbPlayer.sleeperPlayerId && !currentPlayerIds.has(dbPlayer.sleeperPlayerId)) {
          // Player no longer fantasy relevant
          await db.player.update({
            where: { id: dbPlayer.id },
            data: { 
              isFantasyRelevant: false,
              isActive: false,
              lastUpdated: new Date(),
            },
          });
          deactivated++;}
      }

      // Optionally remove very old records (players not updated in 6+ months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const oldPlayers = await db.player.deleteMany({
        where: {
          
          // AND: [
          //   { lastUpdated: { lt: sixMonthsAgo } },
          //   { isFantasyRelevant: false },
          //   { isActive: false },
          // ],
          // Use updatedAt instead
          updatedAt: { lt: sixMonthsAgo },
        },
      });

      removed = oldPlayers.count;return { removed, deactivated };
    } catch (error: any) {
      handleComponentError(error as Error, 'playerDatabaseService');
      return { removed: 0, deactivated: 0 };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalPlayers: number;
    fantasyRelevant: number;
    dynastyTargets: number;
    lastSyncTime: Date | null;
    needsSync: boolean;
  }> {
    try {
      const stats = await db.player.aggregate({
        _count: {
          id: true,
        },
        where: {},
      });

      const fantasyStats = await db.player.aggregate({
        _count: {
          id: true,
        },
        where: { isFantasyRelevant: true },
      });

      const dynastyStats = await db.player.aggregate({
        _count: {
          id: true,
        },
        where: { isDynastyTarget: true },
      });

      // Find most recent update
      const lastSync = await db.player.findFirst({
        orderBy: { lastUpdated: 'desc' },
        select: { lastUpdated: true },
      });

      // Consider sync needed if no players or last sync > 24 hours ago
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const needsSync = !lastSync || lastSync.lastUpdated < oneDayAgo;

      return {
        totalPlayers: stats._count.id,
        fantasyRelevant: fantasyStats._count.id,
        dynastyTargets: dynastyStats._count.id,
        lastSyncTime: lastSync?.updatedAt || null,
        needsSync,
      };
    } catch (error: any) {
      handleComponentError(error as Error, 'playerDatabaseService');
      return {
        totalPlayers: 0,
        fantasyRelevant: 0,
        dynastyTargets: 0,
        lastSyncTime: null,
        needsSync: true,
      };
    }
  }

  /**
   * Force full resync (clears and rebuilds all player data)
   */
  async fullResync(): Promise<DatabaseSyncResult> {
    const startTime = Date.now();try {
      // Clear existing playersawait db.player.deleteMany({});

      // Perform full sync
      const result = await this.syncFantasyPlayersToDatabase();
      
      // Add dynasty targets
      await this.syncDynastyTargets();return result;
    } catch (error: any) {
      handleComponentError(error as Error, 'playerDatabaseService');
      return {
        playersProcessed: 0,
        playersCreated: 0,
        playersUpdated: 0,
        errors: [`Full resync failed: ${error.message}`],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Singleton instance
export const sleeperPlayerDatabaseService = new SleeperPlayerDatabaseService();

export default SleeperPlayerDatabaseService;