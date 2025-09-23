/**
 * Sleeper Fantasy Football API Integration
 * Free, no authentication required
 * Documentation: https://docs.sleeper.com/
 */

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string;
  number: number;
  status: string;
  fantasy_positions: string[];
  age: number;
  years_exp: number;
  college: string;
  height: string;
  weight: string;
  injury_status: string | null;
  injury_body_part: string | null;
  injury_notes: string | null;
  search_rank: number;
  depth_chart_position: string | null;
  depth_chart_order: number | null;
}

export interface SleeperTrendingPlayer {
  player_id: string;
  count: number;
}

export interface SleeperNFLState {
  week: number;
  season: string;
  season_type: string;
  season_start_date: string;
  leg: number;
  league_season: string;
  league_create_season: string;
  display_week: number;
}

export interface SleeperStats {
  [key: string]: number;
}

export interface SleeperProjection {
  [playerId: string]: {
    stats: SleeperStats;
    points: {
      ppr: number;
      std: number;
      half_ppr: number;
    };
  };
}

class SleeperAPI {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private async fetchWithCache<T>(url: string): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sleeper API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Sleeper API fetch error:', error);
      throw error;
    }
  }

  /**
   * Get all NFL players
   * Updates daily at 5 AM ET
   */
  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    return this.fetchWithCache<Record<string, SleeperPlayer>>(
      `${SLEEPER_BASE_URL}/players/nfl`
    );
  }

  /**
   * Get trending players (adds/drops)
   * @param type - 'add' or 'drop'
   * @param hours - lookback hours (24 or 48)
   * @param limit - number of results
   */
  async getTrendingPlayers(
    type: 'add' | 'drop' = 'add',
    hours: 24 | 48 = 24,
    limit: number = 25
  ): Promise<SleeperTrendingPlayer[]> {
    const url = `${SLEEPER_BASE_URL}/players/nfl/trending/${type}?lookback_hours=${hours}&limit=${limit}`;
    return this.fetchWithCache<SleeperTrendingPlayer[]>(url);
  }

  /**
   * Get current NFL state (week, season info)
   */
  async getNFLState(): Promise<SleeperNFLState> {
    return this.fetchWithCache<SleeperNFLState>(
      `${SLEEPER_BASE_URL}/state/nfl`
    );
  }

  /**
   * Get player stats for a specific week
   * @param season - Year (e.g., "2024")
   * @param week - Week number (1-18)
   * @param seasonType - 'regular', 'post', or 'pre'
   */
  async getPlayerStats(
    season: string,
    week: number,
    seasonType: 'regular' | 'post' | 'pre' = 'regular'
  ): Promise<Record<string, SleeperStats>> {
    return this.fetchWithCache<Record<string, SleeperStats>>(
      `${SLEEPER_BASE_URL}/stats/nfl/${seasonType}/${season}/${week}`
    );
  }

  /**
   * Get player projections for a specific week
   * @param season - Year (e.g., "2024")
   * @param week - Week number (1-18)
   * @param seasonType - 'regular', 'post', or 'pre'
   */
  async getPlayerProjections(
    season: string,
    week: number,
    seasonType: 'regular' | 'post' | 'pre' = 'regular'
  ): Promise<SleeperProjection> {
    return this.fetchWithCache<SleeperProjection>(
      `${SLEEPER_BASE_URL}/projections/nfl/${seasonType}/${season}/${week}`
    );
  }

  /**
   * Search for a player by name
   */
  async searchPlayer(name: string): Promise<SleeperPlayer[]> {
    const allPlayers = await this.getAllPlayers();
    const searchTerm = name.toLowerCase();
    
    return Object.values(allPlayers)
      .filter(player => 
        player.full_name?.toLowerCase().includes(searchTerm) ||
        player.last_name?.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
      .slice(0, 10);
  }

  /**
   * Get injury report
   */
  async getInjuryReport(): Promise<SleeperPlayer[]> {
    const allPlayers = await this.getAllPlayers();
    
    return Object.values(allPlayers)
      .filter(player => 
        player.injury_status && 
        player.injury_status !== 'Healthy' &&
        player.fantasy_positions?.length > 0
      )
      .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999));
  }

  /**
   * Convert Sleeper player to our database format
   */
  convertToDbPlayer(sleeperPlayer: SleeperPlayer): any {
    return {
      sleeperPlayerId: sleeperPlayer.player_id,
      name: sleeperPlayer.full_name,
      firstName: sleeperPlayer.first_name,
      lastName: sleeperPlayer.last_name,
      position: this.mapPosition(sleeperPlayer.position),
      nflTeam: sleeperPlayer.team,
      team: sleeperPlayer.team,
      jerseyNumber: sleeperPlayer.number,
      height: sleeperPlayer.height,
      weight: sleeperPlayer.weight,
      age: sleeperPlayer.age,
      experience: sleeperPlayer.years_exp,
      college: sleeperPlayer.college,
      status: this.mapStatus(sleeperPlayer.status),
      injuryStatus: sleeperPlayer.injury_status,
      injuryDetails: sleeperPlayer.injury_notes,
      isFantasyRelevant: sleeperPlayer.fantasy_positions?.length > 0,
      isActive: sleeperPlayer.status === 'Active'
    };
  }

  private mapPosition(position: string): string {
    const positionMap: Record<string, string> = {
      'QB': 'QB',
      'RB': 'RB',
      'FB': 'RB',
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      'DEF': 'DST',
      'LB': 'LB',
      'DB': 'DB',
      'DL': 'DL',
      'CB': 'CB',
      'S': 'S'
    };
    return positionMap[position] || position;
  }

  private mapStatus(status: string): string {
    if (status === 'Active') return 'active';
    if (status === 'Inactive') return 'inactive';
    if (status === 'Injured Reserve') return 'ir';
    if (status === 'Practice Squad') return 'practice_squad';
    return status.toLowerCase();
  }

  /**
   * Calculate fantasy points from stats
   */
  calculateFantasyPoints(
    stats: SleeperStats,
    scoring: 'ppr' | 'half_ppr' | 'standard' = 'ppr'
  ): number {
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

    // Receiving
    points += (stats.rec_yd || 0) * 0.1;
    points += (stats.rec_td || 0) * 6;
    points += (stats.rec_2pt || 0) * 2;

    // Receptions (PPR scoring)
    if (scoring === 'ppr') {
      points += (stats.rec || 0) * 1;
    } else if (scoring === 'half_ppr') {
      points += (stats.rec || 0) * 0.5;
    }

    // Kicking
    points += (stats.xpm || 0) * 1;
    points += (stats.fgm || 0) * 3; // Basic, could be more complex based on distance

    // Defense/Special Teams (simplified)
    points += (stats.def_td || 0) * 6;
    points += (stats.st_td || 0) * 6;
    points += (stats.int || 0) * 2;
    points += (stats.fum_rec || 0) * 2;
    points += (stats.sack || 0) * 1;

    // Fumbles lost
    points += (stats.fum_lost || 0) * -2;

    return Math.round(points * 100) / 100;
  }
}

// Export singleton instance
export const sleeperAPI = new SleeperAPI();

// Export default for convenience
export default sleeperAPI;