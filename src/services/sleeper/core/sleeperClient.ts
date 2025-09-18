// Core Sleeper API Client
// Handles all HTTP requests to the Sleeper API with error handling and rate limiting

export class SleeperClient {
  private baseURL = 'https://api.sleeper.app/v1';
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly RATE_LIMIT = 1000; // 1000 requests per minute
  private readonly RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

  constructor() {
    // Reset rate limit counter every minute
    setInterval(() => {
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }, this.RATE_WINDOW);
  }

  /**
   * Check if we're within rate limits
   */
  private checkRateLimit(): boolean {
    return this.requestCount < this.RATE_LIMIT;
  }

  /**
   * Make a request to the Sleeper API with rate limiting and error handling
   */
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Check rate limit
    if (!this.checkRateLimit()) {
      const waitTime = this.RATE_WINDOW - (Date.now() - this.lastResetTime);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    const url = `${this.baseURL}${endpoint}`;
    this.requestCount++;

    try {const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AstralField/2.1.0 (D\'Amato Dynasty League)',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[SleeperClient] Success: ${endpoint} (${this.requestCount}/${this.RATE_LIMIT})`);
      return data;
    } catch (error) {
      handleComponentError(error as Error, 'sleeperClient');
      throw error;
    }
  }

  // Core API methods
  async getNFLState() {
    return this.makeRequest('/state/nfl');
  }

  async getAllPlayers() {
    return this.makeRequest('/players/nfl');
  }

  async getTrendingPlayers(type: 'add' | 'drop', lookbackHours = 24, limit = 25) {
    return this.makeRequest(`/players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`);
  }

  async getLeague(leagueId: string) {
    return this.makeRequest(`/league/${leagueId}`);
  }

  async getLeagueRosters(leagueId: string) {
    return this.makeRequest(`/league/${leagueId}/rosters`);
  }

  async getLeagueUsers(leagueId: string) {
    return this.makeRequest(`/league/${leagueId}/users`);
  }

  async getMatchups(leagueId: string, week: number) {
    return this.makeRequest(`/league/${leagueId}/matchups/${week}`);
  }

  async getTransactions(leagueId: string, round: number) {
    return this.makeRequest(`/league/${leagueId}/transactions/${round}`);
  }

  async getDraft(draftId: string) {
    return this.makeRequest(`/draft/${draftId}`);
  }

  async getDraftPicks(draftId: string) {
    return this.makeRequest(`/draft/${draftId}/picks`);
  }

  // Utility methods
  getRateLimitStatus() {
    return {
      requestCount: this.requestCount,
      limit: this.RATE_LIMIT,
      remaining: this.RATE_LIMIT - this.requestCount,
      resetTime: new Date(this.lastResetTime + this.RATE_WINDOW),
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getNFLState();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const sleeperClient = new SleeperClient();