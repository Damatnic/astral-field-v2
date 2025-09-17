// League Synchronization Service
// Syncs existing league data with Sleeper API player data

import { sleeperPlayerService } from './playerService';
import { nflStateService } from './nflStateService';
import { db } from '@/lib/db';

export interface LeagueSyncResult {
  leagueId: string;
  playersProcessed: number;
  playersMapped: number;
  playersNotFound: number;
  rostersUpdated: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

export interface PlayerMapping {
  databasePlayerId: string;
  sleeperPlayerId: string | null;
  playerName: string;
  position: string;
  nflTeam: string | null;
  matchConfidence: 'high' | 'medium' | 'low' | 'none';
  matchMethod: 'exact_name' | 'fuzzy_name' | 'position_team' | 'manual' | 'not_found';
}

export class SleeperLeagueSyncService {
  /**
   * Sync all leagues with Sleeper player data
   */
  async syncAllLeagues(): Promise<LeagueSyncResult[]> {
    try {
      console.log('[LeagueSyncService] Starting sync for all leagues...');
      
      const leagues = await db.league.findMany({
        where: { isActive: true },
        select: { id: true, name: true, season: true },
      });

      const results: LeagueSyncResult[] = [];

      for (const league of leagues) {
        console.log(`[LeagueSyncService] Syncing league: ${league.name} (${league.id})`);
        const result = await this.syncLeague(league.id);
        results.push(result);
      }

      console.log(`[LeagueSyncService] Completed sync for ${leagues.length} leagues`);
      return results;
    } catch (error) {
      console.error('[LeagueSyncService] Failed to sync all leagues:', error);
      throw error;
    }
  }

  /**
   * Sync a specific league with Sleeper data
   */
  async syncLeague(leagueId: string): Promise<LeagueSyncResult> {
    const startTime = Date.now();
    const result: LeagueSyncResult = {
      leagueId,
      playersProcessed: 0,
      playersMapped: 0,
      playersNotFound: 0,
      rostersUpdated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      console.log(`[LeagueSyncService] Starting sync for league ${leagueId}...`);

      // Get all players currently in league rosters
      const rosterPlayers = await db.rosterPlayer.findMany({
        where: {
          team: {
            leagueId: leagueId,
          },
        },
        include: {
          player: true,
          team: {
            select: { id: true, name: true, ownerId: true },
          },
        },
      });

      console.log(`[LeagueSyncService] Found ${rosterPlayers.length} rostered players`);

      // Get all Sleeper fantasy players for mapping
      const sleeperPlayers = await sleeperPlayerService.getFantasyPlayers();
      const sleeperPlayerMap = new Map(sleeperPlayers.map(p => [p.name.toLowerCase(), p]));

      // Process each rostered player
      for (const rosterPlayer of rosterPlayers) {
        try {
          const mapping = await this.mapPlayerToSleeper(rosterPlayer.player, sleeperPlayerMap);
          
          if (mapping.sleeperPlayerId) {
            // Update player with Sleeper data
            await this.updatePlayerWithSleeperData(rosterPlayer.player.id, mapping.sleeperPlayerId);
            result.playersMapped++;
          } else {
            result.playersNotFound++;
            result.errors.push(`Player not found in Sleeper: ${mapping.playerName} (${mapping.position})`);
          }

          result.playersProcessed++;
        } catch (error) {
          result.errors.push(`Failed to process ${rosterPlayer.player.name}: ${error.message}`);
        }
      }

      // Update roster statistics
      result.rostersUpdated = await this.updateRosterStatistics(leagueId);

      result.duration = Date.now() - startTime;
      console.log(`[LeagueSyncService] League sync completed in ${result.duration}ms`);
      console.log(`[LeagueSyncService] Mapped: ${result.playersMapped}, Not found: ${result.playersNotFound}, Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      result.errors.push(`League sync failed: ${error.message}`);
      result.duration = Date.now() - startTime;
      console.error(`[LeagueSyncService] League sync failed:`, error);
      return result;
    }
  }

  /**
   * Map a database player to a Sleeper player
   */
  private async mapPlayerToSleeper(
    dbPlayer: any,
    sleeperPlayerMap: Map<string, any>
  ): Promise<PlayerMapping> {
    const mapping: PlayerMapping = {
      databasePlayerId: dbPlayer.id,
      sleeperPlayerId: null,
      playerName: dbPlayer.name,
      position: dbPlayer.position,
      nflTeam: dbPlayer.nflTeam,
      matchConfidence: 'none',
      matchMethod: 'not_found',
    };

    // Skip if already has Sleeper ID
    if (dbPlayer.sleeperPlayerId) {
      mapping.sleeperPlayerId = dbPlayer.sleeperPlayerId;
      mapping.matchConfidence = 'high';
      mapping.matchMethod = 'exact_name';
      return mapping;
    }

    // Try exact name match
    const nameKey = dbPlayer.name.toLowerCase();
    let sleeperPlayer = sleeperPlayerMap.get(nameKey);

    if (sleeperPlayer) {
      mapping.sleeperPlayerId = sleeperPlayer.id;
      mapping.matchConfidence = 'high';
      mapping.matchMethod = 'exact_name';
      return mapping;
    }

    // Try fuzzy name matching
    sleeperPlayer = this.findPlayerByFuzzyName(dbPlayer.name, sleeperPlayerMap);
    if (sleeperPlayer) {
      mapping.sleeperPlayerId = sleeperPlayer.id;
      mapping.matchConfidence = 'medium';
      mapping.matchMethod = 'fuzzy_name';
      return mapping;
    }

    // Try position + team matching
    if (dbPlayer.nflTeam && dbPlayer.position) {
      sleeperPlayer = this.findPlayerByPositionTeam(
        dbPlayer.position,
        dbPlayer.nflTeam,
        sleeperPlayerMap
      );
      if (sleeperPlayer) {
        mapping.sleeperPlayerId = sleeperPlayer.id;
        mapping.matchConfidence = 'low';
        mapping.matchMethod = 'position_team';
        return mapping;
      }
    }

    console.warn(`[LeagueSyncService] No Sleeper match found for: ${dbPlayer.name} (${dbPlayer.position}) - ${dbPlayer.nflTeam}`);
    return mapping;
  }

  /**
   * Find player using fuzzy name matching
   */
  private findPlayerByFuzzyName(targetName: string, sleeperPlayerMap: Map<string, any>): any | null {
    const targetParts = targetName.toLowerCase().split(' ');
    
    for (const [name, player] of sleeperPlayerMap) {
      const nameParts = name.split(' ');
      
      // Check if last names match
      if (targetParts.length > 1 && nameParts.length > 1) {
        const targetLastName = targetParts[targetParts.length - 1];
        const playerLastName = nameParts[nameParts.length - 1];
        
        if (targetLastName === playerLastName) {
          // Check if first name starts with same letter
          const targetFirstName = targetParts[0];
          const playerFirstName = nameParts[0];
          
          if (targetFirstName[0] === playerFirstName[0]) {
            return player;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Find player by position and team
   */
  private findPlayerByPositionTeam(
    position: string,
    team: string,
    sleeperPlayerMap: Map<string, any>
  ): any | null {
    for (const [, player] of sleeperPlayerMap) {
      if (player.position === position && player.nflTeam === team) {
        return player;
      }
    }
    return null;
  }

  /**
   * Update database player with Sleeper data
   */
  private async updatePlayerWithSleeperData(playerId: string, sleeperPlayerId: string): Promise<void> {
    try {
      // Get fresh Sleeper player data
      const sleeperPlayer = await sleeperPlayerService.getPlayer(sleeperPlayerId);
      
      if (!sleeperPlayer) {
        throw new Error(`Sleeper player ${sleeperPlayerId} not found`);
      }

      // Update database player with Sleeper data
      await db.player.update({
        where: { id: playerId },
        data: {
          sleeperPlayerId: sleeperPlayer.id,
          name: sleeperPlayer.name,
          firstName: sleeperPlayer.firstName,
          lastName: sleeperPlayer.lastName,
          position: sleeperPlayer.position,
          nflTeam: sleeperPlayer.nflTeam,
          age: sleeperPlayer.age,
          status: this.mapPlayerStatus(sleeperPlayer.status),
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
        },
      });

      console.log(`[LeagueSyncService] Updated player: ${sleeperPlayer.name} with Sleeper data`);
    } catch (error) {
      console.error(`[LeagueSyncService] Failed to update player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Map Sleeper player status to database PlayerStatus enum
   */
  private mapPlayerStatus(sleeperStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'ACTIVE',
      'INACTIVE': 'OUT',
      'INJURED_RESERVE': 'INJURED_RESERVE',
      'PUP': 'PUP',
      'SUSPENDED': 'SUSPENDED',
      'RETIRED': 'RETIRED',
      'PRACTICE_SQUAD': 'PRACTICE_SQUAD',
    };

    return statusMap[sleeperStatus] || 'ACTIVE';
  }

  /**
   * Update roster statistics after sync
   */
  private async updateRosterStatistics(leagueId: string): Promise<number> {
    try {
      const teams = await db.team.findMany({
        where: { leagueId },
        include: {
          roster: {
            include: {
              player: true,
            },
          },
        },
      });

      let rostersUpdated = 0;

      for (const team of teams) {
        // Count players by position
        const positionCounts = team.roster.reduce((counts, rosterPlayer) => {
          const position = rosterPlayer.player.position;
          counts[position] = (counts[position] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        // Update team metadata with roster info
        await db.team.update({
          where: { id: team.id },
          data: {
            // Could add roster composition metadata here if needed
            updatedAt: new Date(),
          },
        });

        rostersUpdated++;
      }

      console.log(`[LeagueSyncService] Updated ${rostersUpdated} team rosters`);
      return rostersUpdated;
    } catch (error) {
      console.error('[LeagueSyncService] Failed to update roster statistics:', error);
      return 0;
    }
  }

  /**
   * Get sync status for a league
   */
  async getLeagueSyncStatus(leagueId: string): Promise<{
    leagueId: string;
    totalPlayers: number;
    mappedPlayers: number;
    unmappedPlayers: number;
    lastSyncTime: Date | null;
    needsSync: boolean;
  }> {
    try {
      const rosterPlayers = await db.rosterPlayer.findMany({
        where: {
          team: {
            leagueId: leagueId,
          },
        },
        include: {
          player: true,
        },
      });

      const totalPlayers = rosterPlayers.length;
      const mappedPlayers = rosterPlayers.filter(rp => rp.player.sleeperPlayerId).length;
      const unmappedPlayers = totalPlayers - mappedPlayers;

      // Find most recent sync
      const lastSync = rosterPlayers
        .map(rp => rp.player.lastUpdated)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      // Consider sync needed if <90% mapped or last sync > 24 hours ago
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const mappingPercentage = totalPlayers > 0 ? (mappedPlayers / totalPlayers) : 0;
      const needsSync = mappingPercentage < 0.9 || !lastSync || lastSync < oneDayAgo;

      return {
        leagueId,
        totalPlayers,
        mappedPlayers,
        unmappedPlayers,
        lastSyncTime: lastSync,
        needsSync,
      };
    } catch (error) {
      console.error(`[LeagueSyncService] Failed to get sync status for league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed player mappings for a league
   */
  async getPlayerMappings(leagueId: string): Promise<PlayerMapping[]> {
    try {
      const rosterPlayers = await db.rosterPlayer.findMany({
        where: {
          team: {
            leagueId: leagueId,
          },
        },
        include: {
          player: true,
        },
      });

      const mappings: PlayerMapping[] = rosterPlayers.map(rp => ({
        databasePlayerId: rp.player.id,
        sleeperPlayerId: rp.player.sleeperPlayerId,
        playerName: rp.player.name,
        position: rp.player.position,
        nflTeam: rp.player.nflTeam,
        matchConfidence: rp.player.sleeperPlayerId ? 'high' : 'none',
        matchMethod: rp.player.sleeperPlayerId ? 'exact_name' : 'not_found',
      }));

      return mappings;
    } catch (error) {
      console.error(`[LeagueSyncService] Failed to get player mappings for league ${leagueId}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const sleeperLeagueSyncService = new SleeperLeagueSyncService();

export default SleeperLeagueSyncService;