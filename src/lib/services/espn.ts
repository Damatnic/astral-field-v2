/**
 * ESPN API Service - Free, No Authentication Required
 * Provides comprehensive NFL data including players, scores, and news
 */

interface ESPNPlayer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: {
    abbreviation: string;
    displayName: string;
  };
  jersey?: string;
  height?: { display: string };
  weight?: { display: string };
  age?: number;
  experience?: { years: number };
  college?: { name: string };
  headshot?: { href: string };
  injuries?: Array<{
    status: string;
    details: string;
  }>;
}

interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  color: string;
  alternateColor: string;
  logo: string;
}

export class ESPNService {
  private baseURL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private fantasyURL = 'https://fantasy.espn.com/apis/v3/games/ffl';
  
  // Cache for 5 minutes to reduce API calls
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTime = 5 * 60 * 1000;
  
  private async fetchWithCache(url: string): Promise<any> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return cached.data;
    }
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Failed to fetch from ESPN: ${url}`, error);
      throw error;
    }
  }
  
  /**
   * Get current NFL week
   */
  async getCurrentWeek(): Promise<number> {
    const data = await this.fetchWithCache(`${this.baseURL}/scoreboard`);
    return data.week?.number || 1;
  }
  
  /**
   * Get current season year
   */
  async getCurrentSeason(): Promise<string> {
    const data = await this.fetchWithCache(`${this.baseURL}/scoreboard`);
    return data.season?.year?.toString() || '2024';
  }
  
  /**
   * Get live scoreboard for current week
   */
  async getScoreboard(week?: number): Promise<any> {
    const url = week 
      ? `${this.baseURL}/scoreboard?week=${week}`
      : `${this.baseURL}/scoreboard`;
    return this.fetchWithCache(url);
  }
  
  /**
   * Get all NFL teams
   */
  async getTeams(): Promise<ESPNTeam[]> {
    const data = await this.fetchWithCache(`${this.baseURL}/teams`);
    return data.sports?.[0]?.leagues?.[0]?.teams?.map((t: any) => t.team) || [];
  }
  
  /**
   * Get team roster with all players
   */
  async getTeamRoster(teamId: string): Promise<{ team: any; athletes: ESPNPlayer[] }> {
    const data = await this.fetchWithCache(`${this.baseURL}/teams/${teamId}/roster`);
    const allAthletes: ESPNPlayer[] = [];
    
    // ESPN structure: athletes array contains position groups
    if (data.athletes) {
      for (const positionGroup of data.athletes) {
        if (positionGroup.items) {
          allAthletes.push(...positionGroup.items);
        }
      }
    }
    
    return {
      team: data.team,
      athletes: allAthletes
    };
  }
  
  /**
   * Get detailed player information
   */
  async getPlayerInfo(playerId: string): Promise<ESPNPlayer> {
    const data = await this.fetchWithCache(`${this.baseURL}/athletes/${playerId}`);
    return data.athlete;
  }
  
  /**
   * Get player statistics
   */
  async getPlayerStats(playerId: string, season?: string): Promise<any> {
    const url = season 
      ? `${this.baseURL}/athletes/${playerId}/stats?season=${season}`
      : `${this.baseURL}/athletes/${playerId}/stats`;
    return this.fetchWithCache(url);
  }
  
  /**
   * Get NFL news
   */
  async getNews(limit: number = 20): Promise<any[]> {
    const data = await this.fetchWithCache(`${this.baseURL}/news?limit=${limit}`);
    return data.articles || [];
  }
  
  /**
   * Get league standings
   */
  async getStandings(): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/standings`);
  }
  
  /**
   * Get injury report
   */
  async getInjuries(): Promise<any[]> {
    const teams = await this.getTeams();
    const injuries: any[] = [];
    
    for (const team of teams.slice(0, 5)) { // Limit to prevent rate limiting
      try {
        const { athletes } = await this.getTeamRoster(team.id);
        const injured = athletes.filter((player: ESPNPlayer) => 
          player.injuries && player.injuries.length > 0
        );
        injuries.push(...injured.map(player => ({
          ...player,
          team: team.abbreviation
        })));
      } catch (error) {
        console.error(`Failed to get injuries for team ${team.id}:`, error);
      }
    }
    
    return injuries;
  }
  
  /**
   * Get games for a specific week
   */
  async getGames(week: number, season?: string): Promise<any[]> {
    const url = season 
      ? `${this.baseURL}/scoreboard?week=${week}&season=${season}`
      : `${this.baseURL}/scoreboard?week=${week}`;
    
    const data = await this.fetchWithCache(url);
    return data.events || [];
  }
  
  /**
   * Search for players by name
   */
  async searchPlayers(query: string): Promise<ESPNPlayer[]> {
    // ESPN doesn't have a direct search API, so we'll search through team rosters
    const teams = await this.getTeams();
    const allPlayers: ESPNPlayer[] = [];
    
    for (const team of teams.slice(0, 10)) { // Limit search to prevent rate limiting
      try {
        const { athletes } = await this.getTeamRoster(team.id);
        const matchingPlayers = athletes.filter((player: ESPNPlayer) =>
          player.fullName.toLowerCase().includes(query.toLowerCase())
        );
        allPlayers.push(...matchingPlayers);
      } catch (error) {
        console.error(`Failed to search players in team ${team.id}:`, error);
      }
    }
    
    return allPlayers.slice(0, 50); // Return top 50 matches
  }
  
  /**
   * Get all players from all teams (for bulk sync)
   */
  async getAllPlayers(): Promise<ESPNPlayer[]> {
    const teams = await this.getTeams();
    const allPlayers: ESPNPlayer[] = [];
    
    console.log(`Fetching players from ${teams.length} NFL teams...`);
    
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      try {
        console.log(`Fetching roster for ${team.abbreviation} (${i + 1}/${teams.length})`);
        const { athletes } = await this.getTeamRoster(team.id);
        
        const playersWithTeam = athletes.map((player: ESPNPlayer) => ({
          ...player,
          nflTeam: team.abbreviation
        }));
        
        allPlayers.push(...playersWithTeam);
        
        // Add delay to prevent rate limiting
        if (i < teams.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to fetch roster for team ${team.abbreviation}:`, error);
      }
    }
    
    console.log(`Successfully fetched ${allPlayers.length} total players`);
    return allPlayers;
  }
  
  /**
   * Calculate fantasy points based on stats
   */
  calculateFantasyPoints(stats: any, scoringType: 'standard' | 'ppr' | 'half-ppr' = 'ppr'): number {
    let points = 0;
    
    // Passing stats
    if (stats.passing) {
      points += (stats.passing.yards || 0) * 0.04; // 1 point per 25 yards
      points += (stats.passing.touchdowns || 0) * 4;
      points += (stats.passing.interceptions || 0) * -2;
    }
    
    // Rushing stats
    if (stats.rushing) {
      points += (stats.rushing.yards || 0) * 0.1; // 1 point per 10 yards
      points += (stats.rushing.touchdowns || 0) * 6;
      points += (stats.rushing.fumbles || 0) * -2;
    }
    
    // Receiving stats
    if (stats.receiving) {
      points += (stats.receiving.yards || 0) * 0.1; // 1 point per 10 yards
      points += (stats.receiving.touchdowns || 0) * 6;
      
      // PPR scoring
      if (scoringType === 'ppr') {
        points += (stats.receiving.receptions || 0) * 1;
      } else if (scoringType === 'half-ppr') {
        points += (stats.receiving.receptions || 0) * 0.5;
      }
    }
    
    // Kicking stats
    if (stats.kicking) {
      points += (stats.kicking.fieldGoalsMade || 0) * 3;
      points += (stats.kicking.extraPointsMade || 0) * 1;
      points += (stats.kicking.fieldGoalsMissed || 0) * -1;
    }
    
    // Defense stats
    if (stats.defensive) {
      points += (stats.defensive.sacks || 0) * 1;
      points += (stats.defensive.interceptions || 0) * 2;
      points += (stats.defensive.fumblesRecovered || 0) * 2;
      points += (stats.defensive.touchdowns || 0) * 6;
      points += (stats.defensive.safeties || 0) * 2;
      
      // Points allowed (for team defense)
      const pointsAllowed = stats.defensive.pointsAllowed || 0;
      if (pointsAllowed === 0) points += 10;
      else if (pointsAllowed <= 6) points += 7;
      else if (pointsAllowed <= 13) points += 4;
      else if (pointsAllowed <= 20) points += 1;
      else if (pointsAllowed <= 27) points += 0;
      else if (pointsAllowed <= 34) points -= 1;
      else points -= 4;
    }
    
    return Math.round(points * 100) / 100; // Round to 2 decimal places
  }
}