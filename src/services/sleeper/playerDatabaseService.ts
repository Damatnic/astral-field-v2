// Player Database Integration Service
// Syncs Sleeper API player data with our database

import { sleeperPlayerService } from './playerService';
import { prisma as db } from '@/lib/db';

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

    try {
      console.log('[PlayerDatabaseService] Starting fantasy player sync...');
      
      // Get all fantasy players from Sleeper
      const fantasyPlayers = await sleeperPlayerService.getFantasyPlayers();
      console.log(`[PlayerDatabaseService] Retrieved ${fantasyPlayers.length} fantasy players from Sleeper`);

      // Process players in batches
      for (let i = 0; i < fantasyPlayers.length; i += batchSize) {
        const batch = fantasyPlayers.slice(i, i + batchSize);
        
        try {
          await this.processBatch(batch, result);
          console.log(`[PlayerDatabaseService] Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(fantasyPlayers.length/batchSize)}`);
        } catch (error: any) {
          const errorMsg = `Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`[PlayerDatabaseService] ${errorMsg}`);
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`[PlayerDatabaseService] Sync completed in ${result.duration}ms`);
      console.log(`[PlayerDatabaseService] Created: ${result.playersCreated}, Updated: ${result.playersUpdated}, Errors: ${result.errors.length}`);

      return result;
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
      result.duration = Date.now() - startTime;
      console.error('[PlayerDatabaseService] Sync failed:', error);
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
        sleeperPlayerId: sleeperPlayer.id,
        name: sleeperPlayer.name,
        firstName: sleeperPlayer.firstName,
        lastName: sleeperPlayer.lastName,
        position: sleeperPlayer.position,
        nflTeam: sleeperPlayer.nflTeam,
        age: sleeperPlayer.age,
        status: sleeperPlayer.status,
        injuryStatus: sleeperPlayer.injuryStatus,
        yearsExperience: sleeperPlayer.yearsExperience,
        height: sleeperPlayer.height,
        weight: sleeperPlayer.weight,
        college: sleeperPlayer.college,
        searchRank: sleeperPlayer.searchRank,
        isFantasyRelevant: sleeperPlayer.isFantasyRelevant,
        isActive: sleeperPlayer.isActive,
        fantasyPositions: sleeperPlayer.fantasyPositions || [],
        depthChartPosition: sleeperPlayer.depthChartPosition,
        depthChartOrder: sleeperPlayer.depthChartOrder,
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

    try {
      console.log('[PlayerDatabaseService] Starting dynasty targets sync...');
      
      const dynastyTargets = await sleeperPlayerService.getDynastyTargets();
      console.log(`[PlayerDatabaseService] Retrieved ${dynastyTargets.length} dynasty targets`);

      for (const player of dynastyTargets) {
        try {
          // Mark as dynasty target in database
          await db.player.updateMany({
            where: { sleeperPlayerId: player.id },
            data: { 
              isDynastyTarget: true,
              dynastyRank: player.searchRank,
              lastUpdated: new Date(),
            },
          });
          
          result.playersUpdated++;
          result.playersProcessed++;
        } catch (error: any) {
          result.errors.push(`Dynasty target ${player.id}: ${error.message}`);
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`[PlayerDatabaseService] Dynasty sync completed: ${result.playersUpdated} players marked`);

      return result;
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
    try {
      console.log('[PlayerDatabaseService] Starting cleanup of inactive players...');
      
      // Get current fantasy players from Sleeper
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
          deactivated++;
          console.log(`[PlayerDatabaseService] Deactivated: ${dbPlayer.name}`);
        }
      }

      // Optionally remove very old records (players not updated in 6+ months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const oldPlayers = await db.player.deleteMany({
        where: {
          AND: [
            { lastUpdated: { lt: sixMonthsAgo } },
            { isFantasyRelevant: false },
            { isActive: false },
          ],
        },
      });

      removed = oldPlayers.count;

      console.log(`[PlayerDatabaseService] Cleanup completed: ${deactivated} deactivated, ${removed} removed`);
      return { removed, deactivated };
    } catch (error: any) {
      console.error('[PlayerDatabaseService] Cleanup failed:', error);
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
        lastSyncTime: lastSync?.lastUpdated || null,
        needsSync,
      };
    } catch (error: any) {
      console.error('[PlayerDatabaseService] Stats query failed:', error);
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
    const startTime = Date.now();
    console.log('[PlayerDatabaseService] Starting FULL RESYNC - this will rebuild all player data...');

    try {
      // Clear existing players
      console.log('[PlayerDatabaseService] Clearing existing player data...');
      await db.player.deleteMany({});

      // Perform full sync
      const result = await this.syncFantasyPlayersToDatabase();
      
      // Add dynasty targets
      await this.syncDynastyTargets();

      console.log('[PlayerDatabaseService] Full resync completed!');
      return result;
    } catch (error: any) {
      console.error('[PlayerDatabaseService] Full resync failed:', error);
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