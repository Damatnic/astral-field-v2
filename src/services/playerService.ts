import { Player, PlayerStats, PlayerProjection } from '@/types/player';

// Real NFL player data interface
export interface NFLPlayer {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
  team: string;
  jerseyNumber?: number;
  height?: string;
  weight?: number;
  age?: number;
  experience?: number;
  college?: string;
  stats: PlayerStats;
  projections: PlayerProjection;
  status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'suspended';
  injuryDetails?: string;
  byeWeek: number;
  adp: number;
  ownership: number;
  trending: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

// Enhanced player data with social features
export interface EnhancedPlayer extends NFLPlayer {
  likes: number;
  notes: number;
  isWatched: boolean;
  leagueOwnership: number;
  opponent: string;
  gameTime?: string;
  weather?: string;
  draftKingsId?: string;
  fanDuelId?: string;
}

class PlayerService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Get all active NFL players
  async getAllPlayers(): Promise<EnhancedPlayer[]> {
    const cacheKey = 'all_players';
    const cached = this.getFromCache<EnhancedPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const players = await response.json();
      this.setCache(cacheKey, players);
      return players;
    } catch (error) {
      console.error('Error fetching players:', error);
      // Return fallback data
      return this.getFallbackPlayers();
    }
  }

  // Get players by position
  async getPlayersByPosition(position: string): Promise<EnhancedPlayer[]> {
    const cacheKey = `players_${position}`;
    const cached = this.getFromCache<EnhancedPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players?position=${position}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const players = await response.json();
      this.setCache(cacheKey, players);
      return players;
    } catch (error) {
      console.error('Error fetching players by position:', error);
      const allPlayers = await this.getAllPlayers();
      return allPlayers.filter(player => player.position === position);
    }
  }

  // Get players by team
  async getPlayersByTeam(team: string): Promise<EnhancedPlayer[]> {
    const cacheKey = `players_team_${team}`;
    const cached = this.getFromCache<EnhancedPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players?team=${team}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const players = await response.json();
      this.setCache(cacheKey, players);
      return players;
    } catch (error) {
      console.error('Error fetching players by team:', error);
      const allPlayers = await this.getAllPlayers();
      return allPlayers.filter(player => player.team === team);
    }
  }

  // Search players by name
  async searchPlayers(query: string): Promise<EnhancedPlayer[]> {
    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = this.getFromCache<EnhancedPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const players = await response.json();
      this.setCache(cacheKey, players);
      return players;
    } catch (error) {
      console.error('Error searching players:', error);
      const allPlayers = await this.getAllPlayers();
      return allPlayers.filter(player => 
        player.name.toLowerCase().includes(query.toLowerCase()) ||
        player.team.toLowerCase().includes(query.toLowerCase()) ||
        player.position.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  // Get single player details
  async getPlayer(id: string): Promise<EnhancedPlayer | null> {
    const cacheKey = `player_${id}`;
    const cached = this.getFromCache<EnhancedPlayer>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const player = await response.json();
      this.setCache(cacheKey, player);
      return player;
    } catch (error) {
      console.error('Error fetching player:', error);
      return null;
    }
  }

  // Get live player updates
  async getLiveUpdates(): Promise<Partial<EnhancedPlayer>[]> {
    try {
      const response = await fetch(`${this.baseUrl}/players/live-updates`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching live updates:', error);
      return [];
    }
  }

  // Update player social data
  async updatePlayerSocial(
    playerId: string, 
    action: 'like' | 'unlike' | 'watch' | 'unwatch',
    userId?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/players/${playerId}/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, userId }),
      });
      
      if (response.ok) {
        // Invalidate cache for this player
        this.cache.delete(`player_${playerId}`);
        this.cache.delete('all_players');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating player social data:', error);
      return false;
    }
  }

  // Get trending players
  async getTrendingPlayers(limit: number = 10): Promise<EnhancedPlayer[]> {
    const cacheKey = `trending_${limit}`;
    const cached = this.getFromCache<EnhancedPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players/trending?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const players = await response.json();
      this.setCache(cacheKey, players);
      return players;
    } catch (error) {
      console.error('Error fetching trending players:', error);
      const allPlayers = await this.getAllPlayers();
      return allPlayers
        .filter(player => player.trending === 'up')
        .slice(0, limit);
    }
  }

  // Get sleeper picks
  async getSleeperPicks(limit: number = 10): Promise<EnhancedPlayer[]> {
    const cacheKey = `sleepers_${limit}`;
    const cached = this.getFromCache<EnhancedPlayer[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/players/sleepers?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const players = await response.json();
      this.setCache(cacheKey, players);
      return players;
    } catch (error) {
      console.error('Error fetching sleeper picks:', error);
      const allPlayers = await this.getAllPlayers();
      return allPlayers
        .filter(player => 
          player.projections.fantasyPoints > 15 && 
          player.ownership < 50
        )
        .slice(0, limit);
    }
  }

  // Fallback player data for offline/error scenarios
  private getFallbackPlayers(): EnhancedPlayer[] {
    return [
      {
        id: '1',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        jerseyNumber: 23,
        height: '5-11',
        weight: 205,
        age: 28,
        experience: 7,
        college: 'Stanford',
        stats: {
          rushingYards: 1459,
          rushingTDs: 14,
          receptions: 67,
          receivingYards: 564,
          receivingTDs: 7,
          fantasyPoints: 312.5,
          gamesPlayed: 16
        },
        projections: {
          fantasyPoints: 22.1,
          rushingYards: 85,
          rushingTDs: 0.9,
          receptions: 4.2,
          receivingYards: 35,
          receivingTDs: 0.4
        },
        status: 'healthy',
        byeWeek: 9,
        adp: 1.2,
        ownership: 99.8,
        trending: 'up',
        lastUpdated: new Date(),
        likes: 124,
        notes: 3,
        isWatched: false,
        leagueOwnership: 87,
        opponent: '@ SEA'
      },
      {
        id: '2',
        name: 'Cooper Kupp',
        position: 'WR',
        team: 'LAR',
        jerseyNumber: 10,
        height: '6-2',
        weight: 208,
        age: 31,
        experience: 8,
        college: 'Eastern Washington',
        stats: {
          receptions: 105,
          receivingYards: 1947,
          receivingTDs: 16,
          fantasyPoints: 298.7,
          gamesPlayed: 17
        },
        projections: {
          fantasyPoints: 19.3,
          receptions: 6.2,
          receivingYards: 82,
          receivingTDs: 0.9,
          rushingYards: 0,
          rushingTDs: 0
        },
        status: 'healthy',
        byeWeek: 6,
        adp: 3.1,
        ownership: 97.5,
        trending: 'up',
        lastUpdated: new Date(),
        likes: 89,
        notes: 7,
        isWatched: true,
        leagueOwnership: 72,
        opponent: 'vs ARI'
      },
      {
        id: '3',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        jerseyNumber: 17,
        height: '6-5',
        weight: 237,
        age: 28,
        experience: 7,
        college: 'Wyoming',
        stats: {
          passingYards: 4306,
          passingTDs: 35,
          interceptions: 14,
          rushingYards: 524,
          rushingTDs: 15,
          fantasyPoints: 289.4,
          gamesPlayed: 17
        },
        projections: {
          fantasyPoints: 23.5,
          passingYards: 268,
          passingTDs: 2.1,
          interceptions: 0.8,
          rushingYards: 31,
          rushingTDs: 0.9
        },
        status: 'healthy',
        byeWeek: 12,
        adp: 2.8,
        ownership: 94.2,
        trending: 'stable',
        lastUpdated: new Date(),
        likes: 156,
        notes: 12,
        isWatched: true,
        leagueOwnership: 94,
        opponent: 'vs MIA'
      },
      {
        id: '4',
        name: 'Travis Kelce',
        position: 'TE',
        team: 'KC',
        jerseyNumber: 87,
        height: '6-5',
        weight: 250,
        age: 35,
        experience: 12,
        college: 'Cincinnati',
        stats: {
          receptions: 93,
          receivingYards: 984,
          receivingTDs: 5,
          fantasyPoints: 267.3,
          gamesPlayed: 17
        },
        projections: {
          fantasyPoints: 15.8,
          receptions: 5.5,
          receivingYards: 58,
          receivingTDs: 0.3,
          rushingYards: 0,
          rushingTDs: 0
        },
        status: 'questionable',
        injuryDetails: 'Ankle',
        byeWeek: 10,
        adp: 8.5,
        ownership: 89.1,
        trending: 'down',
        lastUpdated: new Date(),
        likes: 67,
        notes: 5,
        isWatched: false,
        leagueOwnership: 45,
        opponent: 'vs DEN'
      },
      {
        id: '5',
        name: 'Derrick Henry',
        position: 'RB',
        team: 'TEN',
        jerseyNumber: 22,
        height: '6-3',
        weight: 247,
        age: 30,
        experience: 9,
        college: 'Alabama',
        stats: {
          rushingYards: 1167,
          rushingTDs: 12,
          receptions: 33,
          receivingYards: 214,
          receivingTDs: 1,
          fantasyPoints: 245.8,
          gamesPlayed: 16
        },
        projections: {
          fantasyPoints: 17.2,
          rushingYards: 95,
          rushingTDs: 0.7,
          receptions: 2.1,
          receivingYards: 13,
          receivingTDs: 0.1
        },
        status: 'healthy',
        byeWeek: 7,
        adp: 12.3,
        ownership: 87.6,
        trending: 'up',
        lastUpdated: new Date(),
        likes: 78,
        notes: 2,
        isWatched: true,
        leagueOwnership: 63,
        opponent: '@ JAX'
      },
      {
        id: '6',
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        jerseyNumber: 10,
        height: '5-10',
        weight: 185,
        age: 30,
        experience: 9,
        college: 'West Alabama',
        stats: {
          receptions: 119,
          receivingYards: 1799,
          receivingTDs: 13,
          rushingYards: 36,
          rushingTDs: 1,
          fantasyPoints: 278.9,
          gamesPlayed: 17
        },
        projections: {
          fantasyPoints: 18.6,
          receptions: 7.0,
          receivingYards: 106,
          receivingTDs: 0.8,
          rushingYards: 2,
          rushingTDs: 0.1
        },
        status: 'healthy',
        byeWeek: 6,
        adp: 4.7,
        ownership: 96.3,
        trending: 'stable',
        lastUpdated: new Date(),
        likes: 102,
        notes: 9,
        isWatched: false,
        leagueOwnership: 81,
        opponent: '@ BUF'
      }
    ];
  }

  // Clear all cached data
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const playerService = new PlayerService();