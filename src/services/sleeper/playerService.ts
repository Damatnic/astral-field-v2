// Sleeper Player Service
// High-level service for managing NFL player data from Sleeper API

import { sleeperClient } from './core/sleeperClient';
import { SleeperDataTransformer } from './core/dataTransformer';
import { sleeperCache, SleeperCacheManager } from './core/cacheManager';

export interface PlayerSearchFilters {
  position?: string[];
  team?: string[];
  status?: string[];
  isFantasyRelevant?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface PlayerStats {
  week: number;
  season: number;
  fantasyPoints: number;
  games: number;
  // Passing
  passAttempts?: number;
  passCompletions?: number;
  passYards?: number;
  passTDs?: number;
  passInterceptions?: number;
  // Rushing
  rushAttempts?: number;
  rushYards?: number;
  rushTDs?: number;
  // Receiving
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  targets?: number;
  // Kicking
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  extraPointsMade?: number;
  extraPointsAttempted?: number;
  // Defense
  sacks?: number;
  interceptions?: number;
  fumbleRecoveries?: number;
  safeties?: number;
  defensiveTDs?: number;
  pointsAllowed?: number;
}

export class SleeperPlayerService {
  /**
   * Get all NFL players from Sleeper API with caching
   */
  async getAllPlayers(forceRefresh = false) {
    const cacheKey = SleeperCacheManager.CACHE_KEYS.ALL_PLAYERS;
    
    if (forceRefresh) {
      await sleeperCache.delete(cacheKey);
    }

    return sleeperCache.getOrSet(
      cacheKey,
      async () => {const playersData = await sleeperClient.getAllPlayers();
        
        // Convert object to array and transform
        const playersArray = Object.values(playersData as Record<string, any>);
        return playersArray.map(player => SleeperDataTransformer.transformPlayer(player as any));
      },
      SleeperCacheManager.TTL.PLAYERS_ALL
    );
  }

  /**
   * Get fantasy-relevant players only
   */
  async getFantasyPlayers(forceRefresh = false) {
    const cacheKey = SleeperCacheManager.CACHE_KEYS.FANTASY_PLAYERS;
    
    if (forceRefresh) {
      await sleeperCache.delete(cacheKey);
    }

    return sleeperCache.getOrSet(
      cacheKey,
      async () => {const allPlayers = await this.getAllPlayers(forceRefresh);
        return allPlayers.filter(player => player.isFantasyRelevant);
      },
      SleeperCacheManager.TTL.PLAYERS_FANTASY
    );
  }

  /**
   * Search players with filters
   */
  async searchPlayers(filters: PlayerSearchFilters = {}) {
    const allPlayers = await this.getFantasyPlayers();
    let results = [...allPlayers];

    // Filter by position
    if (filters.position && filters.position.length > 0) {
      results = results.filter(player => 
        filters.position!.includes(player.position)
      );
    }

    // Filter by team
    if (filters.team && filters.team.length > 0) {
      results = results.filter(player => 
        player.nflTeam && filters.team!.includes(player.nflTeam)
      );
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      results = results.filter(player => 
        filters.status!.includes(player.status)
      );
    }

    // Text search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      results = results.filter(player => 
        player.name.toLowerCase().includes(query) ||
        player.firstName.toLowerCase().includes(query) ||
        player.lastName.toLowerCase().includes(query) ||
        (player.nflTeam && player.nflTeam.toLowerCase().includes(query))
      );
    }

    // Sort by search rank (fantasy relevance)
    results.sort((a, b) => {
      const aRank = a.searchRank || 999999;
      const bRank = b.searchRank || 999999;
      return aRank - bRank;
    });

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    
    return {
      players: results.slice(offset, offset + limit),
      total: results.length,
      offset,
      limit,
      hasMore: offset + limit < results.length,
    };
  }

  /**
   * Get a specific player by ID
   */
  async getPlayer(playerId: string) {
    const allPlayers = await this.getAllPlayers();
    return allPlayers.find(player => player.id === playerId) || null;
  }

  /**
   * Get multiple players by IDs
   */
  async getPlayers(playerIds: string[]) {
    const allPlayers = await this.getAllPlayers();
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    
    return playerIds
      .map(id => playerMap.get(id))
      .filter(player => player !== undefined);
  }

  /**
   * Get trending players (adds/drops)
   */
  async getTrendingPlayers(type: 'add' | 'drop' = 'add', lookbackHours = 24) {
    const cacheKey = type === 'add' 
      ? SleeperCacheManager.CACHE_KEYS.TRENDING_ADDS 
      : SleeperCacheManager.CACHE_KEYS.TRENDING_DROPS;

    return sleeperCache.getOrSet(
      cacheKey,
      async () => {const trendingData = await sleeperClient.getTrendingPlayers(type, lookbackHours, 50);
        
        // Get player details for trending players
        const playerIds = (trendingData as any[]).map((trend: any) => trend.player_id);
        const players = await this.getPlayers(playerIds);
        
        // Combine trending data with player details
        return (trendingData as any[]).map((trend: any) => {
          const player = players.find(p => p.id === trend.player_id);
          return {
            player,
            count: trend.count,
            type,
            playerId: trend.player_id,
          };
        }).filter(item => item.player); // Only include players we found
      },
      SleeperCacheManager.TTL.TRENDING
    );
  }

  /**
   * Get players by position
   */
  async getPlayersByPosition(position: string) {
    const players = await this.getFantasyPlayers();
    return players.filter(player => player.position === position);
  }

  /**
   * Get players by team
   */
  async getPlayersByTeam(team: string) {
    const players = await this.getFantasyPlayers();
    return players.filter(player => player.nflTeam === team);
  }

  /**
   * Get injured players
   */
  async getInjuredPlayers() {
    const players = await this.getFantasyPlayers();
    return players.filter(player => 
      player.injuryStatus && 
      !['ACTIVE', 'HEALTHY'].includes(player.injuryStatus.toUpperCase())
    );
  }

  /**
   * Get free agents (players not on NFL rosters)
   */
  async getFreeAgents() {
    const players = await this.getFantasyPlayers();
    return players.filter(player => !player.nflTeam);
  }

  /**
   * Get rookies (players with 0 years experience)
   */
  async getRookies() {
    const players = await this.getFantasyPlayers();
    return players.filter(player => player.yearsExperience === 0);
  }

  /**
   * Get player stats (would integrate with scoring data from matchups)
   */
  async getPlayerStats(playerId: string, week?: number): Promise<PlayerStats | null> {
    // This would need to be implemented by pulling from Sleeper matchup data
    // For now, return null as this requires league-specific datareturn null;
  }

  /**
   * Calculate fantasy points for a player based on stats
   */
  calculateFantasyPoints(stats: any, scoringSystem = 'ppr'): number {
    return SleeperDataTransformer.calculateFantasyPoints(stats, scoringSystem);
  }

  /**
   * Get D'Amato Dynasty League favorite players (top performers)
   */
  async getDynastyTargets() {
    const fantasyPlayers = await this.getFantasyPlayers();
    
    // Filter for key dynasty positions and high-value players
    const targets = fantasyPlayers.filter(player => {
      // Must be fantasy relevant
      if (!player.isFantasyRelevant) return false;
      
      // Must have good search rank (top 500 overall)
      if (!player.searchRank || player.searchRank > 500) return false;
      
      // Focus on skill positions for dynasty
      const dynastyPositions = ['QB', 'RB', 'WR', 'TE'];
      if (!dynastyPositions.includes(player.position)) return false;
      
      // Must be active
      if (player.status !== 'ACTIVE') return false;
      
      return true;
    });

    // Sort by dynasty value (search rank)
    targets.sort((a, b) => (a.searchRank || 999) - (b.searchRank || 999));
    
    return targets.slice(0, 200); // Top 200 dynasty targets
  }

  /**
   * Clear player cache
   */
  async clearCache() {
    await sleeperCache.delete(SleeperCacheManager.CACHE_KEYS.ALL_PLAYERS);
    await sleeperCache.delete(SleeperCacheManager.CACHE_KEYS.FANTASY_PLAYERS);
    await sleeperCache.delete(SleeperCacheManager.CACHE_KEYS.TRENDING_ADDS);
    await sleeperCache.delete(SleeperCacheManager.CACHE_KEYS.TRENDING_DROPS);}

  /**
   * Get service health and statistics
   */
  async getHealthStats() {
    const cacheStats = sleeperCache.getStats();
    const apiHealth = await sleeperClient.healthCheck();
    const rateLimitStatus = sleeperClient.getRateLimitStatus();

    try {
      const playersCount = await sleeperCache.get(SleeperCacheManager.CACHE_KEYS.ALL_PLAYERS);
      const fantasyCount = await sleeperCache.get(SleeperCacheManager.CACHE_KEYS.FANTASY_PLAYERS);

      return {
        apiHealthy: apiHealth,
        cache: cacheStats,
        rateLimit: rateLimitStatus,
        data: {
          totalPlayers: playersCount ? (playersCount as any[]).length : 0,
          fantasyPlayers: fantasyCount ? (fantasyCount as any[]).length : 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        apiHealthy: apiHealth,
        cache: cacheStats,
        rateLimit: rateLimitStatus,
        data: { totalPlayers: 0, fantasyPlayers: 0 },
        error: (error as Error).message,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

// Singleton instance
export const sleeperPlayerService = new SleeperPlayerService();

export default SleeperPlayerService;