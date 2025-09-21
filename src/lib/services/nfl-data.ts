/**
 * NFL Data Service - Free APIs for comprehensive NFL data
 * Uses various free NFL APIs for real-time scores and stats
 */

export class NFLDataService {
  private nflApiBase = 'https://api.nfl.com/v1';
  private sportsDataBase = 'https://api.sportsdata.io/v3/nfl';
  
  /**
   * Get live game scores from NFL.com
   */
  async getLiveScores(week?: number): Promise<any[]> {
    try {
      const season = new Date().getFullYear();
      const currentWeek = week || await this.getCurrentWeek();
      
      // NFL.com live scores endpoint
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${currentWeek}&season=${season}`
      );
      
      if (!response.ok) {
        throw new Error(`NFL API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseGameScores(data.events || []);
    } catch (error) {
      console.error('Failed to fetch live scores:', error);
      return [];
    }
  }
  
  /**
   * Get current NFL week
   */
  async getCurrentWeek(): Promise<number> {
    try {
      const response = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
      );
      const data = await response.json();
      return data.week?.number || 1;
    } catch (error) {
      console.error('Failed to get current week:', error);
      return 1;
    }
  }
  
  /**
   * Get team standings
   */
  async getStandings(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings'
      );
      const data = await response.json();
      return data.children || [];
    } catch (error) {
      console.error('Failed to fetch standings:', error);
      return [];
    }
  }
  
  /**
   * Get playoff picture
   */
  async getPlayoffPicture(): Promise<any> {
    try {
      const response = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings?group=playoff'
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch playoff picture:', error);
      return null;
    }
  }
  
  /**
   * Get injury reports from multiple sources
   */
  async getInjuryReport(): Promise<any[]> {
    const injuries: any[] = [];
    
    try {
      // ESPN injury data
      const response = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?category=injuries'
      );
      const data = await response.json();
      
      for (const article of data.articles || []) {
        if (article.headline.toLowerCase().includes('injury') || 
            article.headline.toLowerCase().includes('hurt') ||
            article.headline.toLowerCase().includes('out')) {
          injuries.push({
            player: this.extractPlayerFromHeadline(article.headline),
            headline: article.headline,
            description: article.description,
            source: 'ESPN',
            publishedAt: article.published,
            url: article.links?.web?.href
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch injury report:', error);
    }
    
    return injuries;
  }
  
  /**
   * Get weather data for games
   */
  async getGameWeather(gameId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`
      );
      const data = await response.json();
      return data.gameInfo?.weather;
    } catch (error) {
      console.error('Failed to fetch game weather:', error);
      return null;
    }
  }
  
  /**
   * Get depth charts for all teams
   */
  async getDepthCharts(): Promise<Map<string, any>> {
    const depthCharts = new Map();
    
    try {
      // This would require scraping or alternative APIs
      // For now, return empty map
      console.log('Depth charts require additional implementation');
    } catch (error) {
      console.error('Failed to fetch depth charts:', error);
    }
    
    return depthCharts;
  }
  
  /**
   * Parse game scores from ESPN data
   */
  private parseGameScores(events: any[]): any[] {
    return events.map(event => {
      const game = event.competitions[0];
      const competitors = game.competitors;
      
      return {
        id: event.id,
        date: event.date,
        status: event.status.type.name,
        period: event.status.period,
        clock: event.status.displayClock,
        home: {
          team: competitors.find((c: any) => c.homeAway === 'home')?.team,
          score: competitors.find((c: any) => c.homeAway === 'home')?.score
        },
        away: {
          team: competitors.find((c: any) => c.homeAway === 'away')?.team,
          score: competitors.find((c: any) => c.homeAway === 'away')?.score
        },
        broadcasts: game.broadcasts?.map((b: any) => b.names).flat() || [],
        weather: game.weather,
        odds: game.odds?.[0],
        situation: event.competitions[0].situation
      };
    });
  }
  
  /**
   * Extract player name from news headline
   */
  private extractPlayerFromHeadline(headline: string): string | null {
    // Simple regex to extract player names (First Last format)
    const playerMatch = headline.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/);
    return playerMatch ? playerMatch[1] : null;
  }
  
  /**
   * Get red zone efficiency stats
   */
  async getRedZoneStats(): Promise<any[]> {
    try {
      // This would require additional API endpoints
      console.log('Red zone stats require additional implementation');
      return [];
    } catch (error) {
      console.error('Failed to fetch red zone stats:', error);
      return [];
    }
  }
  
  /**
   * Get turnover stats
   */
  async getTurnoverStats(): Promise<any[]> {
    try {
      // This would require additional API endpoints
      console.log('Turnover stats require additional implementation');
      return [];
    } catch (error) {
      console.error('Failed to fetch turnover stats:', error);
      return [];
    }
  }
}