/**
 * ESPN API Service
 * Provides access to ESPN's free NFL and fantasy football APIs
 */

export class ESPNService {
  private baseURL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private fantasyURL = 'https://fantasy.espn.com/apis/v3/games/ffl';
  
  // Cache for 5 minutes (non-live data)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTime = 5 * 60 * 1000;
  
  // Live scores cache for 30 seconds during game time
  private liveCacheTime = 30 * 1000;
  
  private async fetchWithCache(url: string, useLiveCache = false): Promise<any> {
    const cacheTimeout = useLiveCache ? this.liveCacheTime : this.cacheTime;
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }
      const data = await response.json();
      
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error(`ESPN API fetch failed for ${url}:`, error);

      }
      throw error;
    }
  }
  
  async getCurrentWeek(): Promise<number> {
    const data = await this.fetchWithCache(`${this.baseURL}/scoreboard`);
    return data.week?.number || 4; // Default to week 4 for D'Amato Dynasty
  }
  
  async getScoreboard(): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/scoreboard`, true); // Use live cache
  }
  
  async getLivePlayerStats(playerId: string): Promise<any> {
    try {
      const playerInfo = await this.getPlayerInfo(playerId);
      const scoreboard = await this.getScoreboard();
      
      // Find if player's team is currently playing
      const activeGame = scoreboard.events?.find((event: any) => {
        const competition = event.competitions[0];
        return competition.competitors.some((comp: any) => 
          comp.team.abbreviation === playerInfo.team?.abbreviation
        );
      });
      
      if (activeGame) {
        // Return live stats if game is in progress
        return {
          playerId,
          isLive: true,
          gameStatus: activeGame.status.type.state,
          ...playerInfo
        };
      }
      
      return {
        playerId,
        isLive: false,
        ...playerInfo
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to get live stats for player ${playerId}:`, error);
      }
      return { playerId, isLive: false };
    }
  }
  
  async getTeams(): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/teams`);
  }
  
  async getTeamRoster(teamId: string): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/teams/${teamId}/roster`);
  }
  
  async getPlayerInfo(playerId: string): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/athletes/${playerId}`);
  }
  
  async getPlayerStats(playerId: string): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/athletes/${playerId}/stats`);
  }
  
  async getPlayerStatsByWeek(playerId: string, week: number, season: number = 2024): Promise<any> {
    try {
      const stats = await this.getPlayerStats(playerId);
      
      // ESPN stats are usually seasonal, we need to estimate weekly
      // This would need to be enhanced with actual weekly data if available
      return {
        playerId,
        week,
        season,
        stats: stats,
        source: 'espn'
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to get weekly stats for player ${playerId}, week ${week}:`, error);
      }
      return null;
    }
  }
  
  async getFantasyProjections(playerId: string, week: number): Promise<any> {
    return this.getPlayerProjections(playerId, week);
  }
  
  async getTeamSchedule(teamAbbr: string, week?: number): Promise<any> {
    try {
      const teams = await this.getTeams();
      const team = teams.sports[0].leagues[0].teams.find(
        (t: any) => t.team.abbreviation === teamAbbr
      );
      
      if (!team) {
        throw new Error(`Team ${teamAbbr} not found`);
      }
      
      const schedule = await this.fetchWithCache(
        `${this.baseURL}/teams/${team.team.id}/schedule`
      );
      
      if (week) {
        // Filter to specific week
        return {
          team: team.team,
          week,
          games: schedule.events?.filter((e: any) => e.week?.number === week) || []
        };
      }
      
      return {
        team: team.team,
        schedule: schedule.events || []
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to get schedule for team ${teamAbbr}:`, error);
      }
      return null;
    }
  }
  
  async getNews(): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/news`);
  }
  
  async getStandings(): Promise<any> {
    return this.fetchWithCache(`${this.baseURL}/standings`);
  }
  
  async getInjuries(): Promise<any> {
    const teams = await this.getTeams();
    const injuries: any[] = [];
    
    for (const team of teams.sports[0].leagues[0].teams) {
      try {
        const roster = await this.getTeamRoster(team.team.id);
        const injured = roster.team?.athletes?.filter((a: any) => a.injuries?.length > 0) || [];
        injuries.push(...injured.map((player: any) => ({
          ...player,
          teamName: team.team.displayName,
          teamAbbr: team.team.abbreviation
        })));
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error(`Failed to get injuries for team ${team.team.id}:`, error);

        }
      }
    }
    
    return injuries;
  }
  
  async getWeeklySchedule(week?: number): Promise<any> {
    const currentWeek = week || await this.getCurrentWeek();
    return this.fetchWithCache(`${this.baseURL}/scoreboard?week=${currentWeek}`);
  }
  
  async getPlayerProjections(playerId: string, week?: number): Promise<any> {
    // ESPN doesn't provide projections directly, but we can estimate based on season averages
    const stats = await this.getPlayerStats(playerId);
    const playerInfo = await this.getPlayerInfo(playerId);
    
    return {
      playerId,
      week: week || await this.getCurrentWeek(),
      projectedPoints: this.estimateProjectedPoints(stats, playerInfo),
      source: 'espn_estimated'
    };
  }
  
  private estimateProjectedPoints(stats: any, playerInfo: any): number {
    // Simple projection based on season averages
    const position = playerInfo.position?.abbreviation;
    
    if (!stats?.splits?.categories) return 0;
    
    let projectedPoints = 0;
    
    // Find passing, rushing, receiving stats
    for (const category of stats.splits.categories) {
      for (const type of category.types) {
        if (type.name === 'passing') {
          const passingYards = this.getStatValue(type.statistics, 'passingYards') || 0;
          const passingTDs = this.getStatValue(type.statistics, 'passingTouchdowns') || 0;
          const interceptions = this.getStatValue(type.statistics, 'interceptions') || 0;
          
          projectedPoints += (passingYards * 0.04) + (passingTDs * 4) + (interceptions * -2);
        }
        
        if (type.name === 'rushing') {
          const rushingYards = this.getStatValue(type.statistics, 'rushingYards') || 0;
          const rushingTDs = this.getStatValue(type.statistics, 'rushingTouchdowns') || 0;
          
          projectedPoints += (rushingYards * 0.1) + (rushingTDs * 6);
        }
        
        if (type.name === 'receiving') {
          const receptions = this.getStatValue(type.statistics, 'receptions') || 0;
          const receivingYards = this.getStatValue(type.statistics, 'receivingYards') || 0;
          const receivingTDs = this.getStatValue(type.statistics, 'receivingTouchdowns') || 0;
          
          projectedPoints += (receptions * 0.5) + (receivingYards * 0.1) + (receivingTDs * 6);
        }
      }
    }
    
    return Math.round(projectedPoints * 10) / 10;
  }
  
  private getStatValue(statistics: any[], statName: string): number {
    const stat = statistics?.find(s => s.name === statName);
    return stat ? parseFloat(stat.value) : 0;
  }
}

// NFL Data Service for additional data sources
export class NFLDataService {
  private baseURL = 'https://www.nfl.com/feeds-rs';
  
  async getGameData(week: number, season: number = 2024): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/games/${season}/REG/${week}`
      );
      
      if (!response.ok) {
        // Fallback to ESPN if NFL.com fails
        const espn = new ESPNService();
        return await espn.getWeeklySchedule(week);
      }
      
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('NFL Data API failed, falling back to ESPN:', error);

      }
      const espn = new ESPNService();
      return await espn.getWeeklySchedule(week);
    }
  }
  
  async getLiveScores(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/live-scores`);
      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('NFL live scores failed:', error);

      }
      const espn = new ESPNService();
      return await espn.getScoreboard();
    }
  }
}