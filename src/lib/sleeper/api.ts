/**
 * Sleeper API Integration for AstralField
 * Provides free access to NFL player data and stats
 */

interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string;
  age: number;
  height: string;
  weight: string;
  years_exp: number;
  college: string;
  jersey_number: number;
  status: string;
  injury_status: string;
  injury_body_part: string;
  injury_notes: string;
  fantasy_positions: string[];
}

interface SleeperNflState {
  week: number;
  season_type: string;
  season: string;
  leg: number;
  season_start_date: string;
  season_end_date: string;
  previous_season: string;
  display_week: number;
}

class SleeperAPI {
  private baseUrl = 'https://api.sleeper.app/v1';
  private cache = new Map<string, { data: any; expires: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private async get<T>(endpoint: string, useCache = true): Promise<T> {
    const cacheKey = `sleeper:${endpoint}`;
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() < cached.expires) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'User-Agent': 'AstralField/2.1 (Fantasy Football Platform)'
        }
      });

      if (!response.ok) {
        throw new Error(`Sleeper API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (useCache) {
        this.cache.set(cacheKey, {
          data,
          expires: Date.now() + this.cacheTTL
        });
      }

      return data;
    } catch (error) {
      console.error(`Sleeper API error for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get current NFL state (week, season, etc.)
   */
  async getNflState(): Promise<SleeperNflState> {
    return this.get<SleeperNflState>('/state/nfl');
  }

  /**
   * Get all NFL players
   */
  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    return this.get<Record<string, SleeperPlayer>>('/players/nfl');
  }

  /**
   * Get trending players (adds/drops)
   */
  async getTrendingPlayers(type: 'add' | 'drop' = 'add', lookbackHours = 24, limit = 25): Promise<any[]> {
    return this.get(`/players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`);
  }

  /**
   * Get projections for a specific week/season
   * Note: Sleeper doesn't provide projections through their public API
   * This is a placeholder for future implementation with other data sources
   */
  async getProjections(season: string, week: number): Promise<any[]> {
    console.warn('Projections not available through Sleeper API');
    return [];
  }

  /**
   * Sync players from Sleeper to our database
   */
  async syncPlayersToDatabase(): Promise<{
    synced: number;
    updated: number;
    errors: number;
  }> {
    const { prisma } = await import('@/lib/prisma');
    
    const stats = {
      synced: 0,
      updated: 0,
      errors: 0
    };

    try {
      const sleeperPlayers = await this.getAllPlayers();
      const playerIds = Object.keys(sleeperPlayers);

      console.log(`Syncing ${playerIds.length} players from Sleeper...`);

      // Process players in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < playerIds.length; i += batchSize) {
        const batch = playerIds.slice(i, i + batchSize);
        
        try {
          await Promise.all(batch.map(async (playerId) => {
            const sleeperPlayer = sleeperPlayers[playerId];
            
            if (!sleeperPlayer || !sleeperPlayer.full_name) {
              return;
            }

            try {
              const playerData = {
                sleeperPlayerId: playerId,
                name: sleeperPlayer.full_name,
                firstName: sleeperPlayer.first_name || null,
                lastName: sleeperPlayer.last_name || null,
                position: this.normalizePosition(sleeperPlayer.position),
                nflTeam: sleeperPlayer.team || null,
                jerseyNumber: sleeperPlayer.jersey_number || null,
                height: sleeperPlayer.height || null,
                weight: sleeperPlayer.weight || null,
                age: sleeperPlayer.age || null,
                experience: sleeperPlayer.years_exp || null,
                college: sleeperPlayer.college || null,
                status: sleeperPlayer.status || 'active',
                injuryStatus: sleeperPlayer.injury_status || null,
                injuryDetails: sleeperPlayer.injury_notes || null,
                isFantasyRelevant: this.isFantasyRelevant(sleeperPlayer),
                lastUpdated: new Date()
              };

              const existingPlayer = await prisma.player.findUnique({
                where: { sleeperPlayerId: playerId }
              });

              if (existingPlayer) {
                await prisma.player.update({
                  where: { sleeperPlayerId: playerId },
                  data: playerData
                });
                stats.updated++;
              } else {
                // Generate ESPN ID placeholder
                const espnId = `sleeper_${playerId}`;
                await prisma.player.create({
                  data: {
                    ...playerData,
                    espnId
                  }
                });
                stats.synced++;
              }
            } catch (error) {
              console.error(`Error syncing player ${playerId}:`, error);
              stats.errors++;
            }
          }));

          console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(playerIds.length / batchSize)}`);
        } catch (error) {
          console.error('Batch processing error:', error);
          stats.errors += batch.length;
        }
      }

      console.log(`Player sync complete: ${stats.synced} synced, ${stats.updated} updated, ${stats.errors} errors`);
      
    } catch (error) {
      console.error('Player sync failed:', error);
      throw error;
    }

    return stats;
  }

  /**
   * Normalize position from Sleeper format to our format
   */
  private normalizePosition(position: string): string {
    const positionMap: Record<string, string> = {
      'QB': 'QB',
      'RB': 'RB', 
      'FB': 'RB',
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      'DEF': 'DEF',
      'DL': 'DEF',
      'LB': 'DEF',
      'DB': 'DEF',
      'CB': 'DEF',
      'S': 'DEF'
    };

    return positionMap[position] || 'BENCH';
  }

  /**
   * Determine if a player is fantasy relevant
   */
  private isFantasyRelevant(player: SleeperPlayer): boolean {
    const relevantPositions = ['QB', 'RB', 'FB', 'WR', 'TE', 'K', 'DEF'];
    return relevantPositions.includes(player.position) && 
           player.status !== 'Inactive' &&
           player.team !== null;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const sleeperAPI = new SleeperAPI();
export { SleeperAPI };
export type { SleeperPlayer, SleeperNflState };