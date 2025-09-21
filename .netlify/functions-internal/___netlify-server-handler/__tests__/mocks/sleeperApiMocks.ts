/**
 * Sleeper API Mocking Utilities
 * 
 * Comprehensive mocking system for Sleeper API responses, error scenarios,
 * and various testing conditions including rate limiting, network failures,
 * and data inconsistencies.
 * 
 * Features:
 * - Complete API response mocking with realistic data
 * - Error scenario simulation (rate limits, network failures, invalid data)
 * - Configurable delays and response patterns
 * - State management for testing different conditions
 * - Support for Jest, Vitest, and other testing frameworks
 */

import { jest } from '@jest/globals';
import { 
  SleeperPlayer, 
  SleeperLeague, 
  SleeperRoster, 
  SleeperUser, 
  SleeperTransaction, 
  SleeperMatchup, 
  PlayerStats,
  TrendingPlayers,
  NFLState 
} from '@/types/sleeper';
import { TestDataFactories } from '../factories/testDataFactories';

export interface MockConfig {
  enableNetworkDelay?: boolean;
  averageDelay?: number;
  errorRate?: number;
  rateLimitSimulation?: boolean;
  maxRequestsPerMinute?: number;
  includeInconsistentData?: boolean;
  cacheSimulation?: boolean;
}

export interface MockState {
  requestCount: number;
  lastResetTime: number;
  cachedResponses: Map<string, { data: any; timestamp: number }>;
  errorScenarios: Map<string, string[]>;
}

export class SleeperApiMocks {
  private static config: MockConfig = {
    enableNetworkDelay: true,
    averageDelay: 100,
    errorRate: 0.02, // 2% error rate
    rateLimitSimulation: true,
    maxRequestsPerMinute: 1000,
    includeInconsistentData: false,
    cacheSimulation: true
  };

  private static state: MockState = {
    requestCount: 0,
    lastResetTime: Date.now(),
    cachedResponses: new Map(),
    errorScenarios: new Map()
  };

  private static testData = TestDataFactories.createDamatoDynastyScenario();

  /**
   * Configure mock behavior
   */
  static configure(config: Partial<MockConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset mock state
   */
  static reset(): void {
    this.state = {
      requestCount: 0,
      lastResetTime: Date.now(),
      cachedResponses: new Map(),
      errorScenarios: new Map()
    };
    this.testData = TestDataFactories.createDamatoDynastyScenario();
  }

  /**
   * Set specific error scenarios for testing
   */
  static setErrorScenario(endpoint: string, errors: string[]): void {
    this.state.errorScenarios.set(endpoint, errors);
  }

  /**
   * Simulate network delay
   */
  private static async simulateDelay(): Promise<void> {
    if (!this.config.enableNetworkDelay) return;
    
    const delay = this.config.averageDelay! + (Math.random() - 0.5) * 50;
    await new Promise(resolve => setTimeout(resolve, Math.max(10, delay)));
  }

  /**
   * Check rate limiting
   */
  private static checkRateLimit(): void {
    if (!this.config.rateLimitSimulation) return;

    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    if (now - this.state.lastResetTime > timeWindow) {
      this.state.requestCount = 0;
      this.state.lastResetTime = now;
    }

    this.state.requestCount++;

    if (this.state.requestCount > this.config.maxRequestsPerMinute!) {
      throw new Error('Rate limit exceeded');
    }
  }

  /**
   * Check for error scenarios
   */
  private static checkErrorScenarios(endpoint: string): void {
    // Check for specific error scenarios
    const errors = this.state.errorScenarios.get(endpoint);
    if (errors && errors.length > 0) {
      const error = errors.shift();
      if (error) {
        throw new Error(error);
      }
    }

    // Random error simulation
    if (Math.random() < this.config.errorRate!) {
      const errorTypes = [
        'Network timeout',
        'Server error',
        'Invalid response format',
        'Service temporarily unavailable'
      ];
      throw new Error(errorTypes[Math.floor(Math.random() * errorTypes.length)]);
    }
  }

  /**
   * Get cached response if available
   */
  private static getCachedResponse(cacheKey: string): any {
    if (!this.config.cacheSimulation) return null;

    const cached = this.state.cachedResponses.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minute cache
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached response
   */
  private static setCachedResponse(cacheKey: string, data: any): void {
    if (this.config.cacheSimulation) {
      this.state.cachedResponses.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Mock NFL State endpoint
   */
  static async mockGetNFLState(): Promise<NFLState> {
    const endpoint = '/state/nfl';
    const cacheKey = 'nfl_state';
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = this.testData.nflState;
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock Get All Players endpoint
   */
  static async mockGetAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    const endpoint = '/players/nfl';
    const cacheKey = 'all_players';
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    let response = this.testData.players;

    // Inject inconsistent data if configured
    if (this.config.includeInconsistentData) {
      const inconsistentPlayer: SleeperPlayer = {
        ...Object.values(response)[0],
        player_id: 'inconsistent_1',
        first_name: null,
        last_name: null,
        full_name: '', // Empty name
        position: 'INVALID', // Invalid position
        team: 'XXX', // Invalid team
        age: -5 // Invalid age
      };
      response = { ...response, 'inconsistent_1': inconsistentPlayer };
    }

    this.setCachedResponse(cacheKey, response);
    return response;
  }

  /**
   * Mock Trending Players endpoint
   */
  static async mockGetTrendingPlayers(
    type: 'add' | 'drop' = 'add',
    lookback_hours: number = 24,
    limit: number = 25
  ): Promise<TrendingPlayers[]> {
    const endpoint = `/players/nfl/trending/${type}`;
    const cacheKey = `trending_${type}_${lookback_hours}_${limit}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = TestDataFactories.createTrendingPlayers(limit);
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock Player Stats endpoint
   */
  static async mockGetPlayerStats(
    season: string,
    week?: number
  ): Promise<Record<string, PlayerStats>> {
    const endpoint = week 
      ? `/stats/nfl/regular/${season}/${week}`
      : `/stats/nfl/regular/${season}`;
    const cacheKey = `stats_${season}_${week || 'season'}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    // Generate stats for a subset of players
    const playerIds = Object.keys(this.testData.players).slice(0, 50);
    const stats: Record<string, PlayerStats> = {};
    
    for (const playerId of playerIds) {
      const player = this.testData.players[playerId];
      stats[playerId] = TestDataFactories.createPlayerStats(playerId, player.position || 'RB');
    }

    this.setCachedResponse(cacheKey, stats);
    return stats;
  }

  /**
   * Mock Player Projections endpoint
   */
  static async mockGetPlayerProjections(
    season: string,
    week: number
  ): Promise<Record<string, PlayerStats>> {
    const endpoint = `/projections/nfl/regular/${season}/${week}`;
    const cacheKey = `projections_${season}_${week}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    // Generate projections (similar to stats but slightly different values)
    const playerIds = Object.keys(this.testData.players).slice(0, 50);
    const projections: Record<string, PlayerStats> = {};
    
    for (const playerId of playerIds) {
      const player = this.testData.players[playerId];
      const baseStats = TestDataFactories.createPlayerStats(playerId, player.position || 'RB');
      
      // Modify stats slightly for projections
      projections[playerId] = {
        ...baseStats,
        pts_ppr: (baseStats.pts_ppr || 0) * (0.9 + Math.random() * 0.2), // ±10% variance
        pass_yd: baseStats.pass_yd ? Math.round(baseStats.pass_yd * (0.9 + Math.random() * 0.2)) : undefined,
        rush_yd: baseStats.rush_yd ? Math.round(baseStats.rush_yd * (0.9 + Math.random() * 0.2)) : undefined,
        rec_yd: baseStats.rec_yd ? Math.round(baseStats.rec_yd * (0.9 + Math.random() * 0.2)) : undefined
      };
    }

    this.setCachedResponse(cacheKey, projections);
    return projections;
  }

  /**
   * Mock League endpoint
   */
  static async mockGetLeague(leagueId: string): Promise<SleeperLeague> {
    const endpoint = `/league/${leagueId}`;
    const cacheKey = `league_${leagueId}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = { ...this.testData.league, league_id: leagueId };
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock League Rosters endpoint
   */
  static async mockGetLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const endpoint = `/league/${leagueId}/rosters`;
    const cacheKey = `rosters_${leagueId}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = this.testData.rosters.map(roster => ({
      ...roster,
      league_id: leagueId
    }));
    
    this.setCachedResponse(cacheKey, response);
    return response;
  }

  /**
   * Mock League Users endpoint
   */
  static async mockGetLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const endpoint = `/league/${leagueId}/users`;
    const cacheKey = `users_${leagueId}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = this.testData.users;
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock League Matchups endpoint
   */
  static async mockGetLeagueMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    const endpoint = `/league/${leagueId}/matchups/${week}`;
    const cacheKey = `matchups_${leagueId}_${week}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = this.testData.matchups;
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock League Transactions endpoint
   */
  static async mockGetLeagueTransactions(
    leagueId: string, 
    round: number = 1
  ): Promise<SleeperTransaction[]> {
    const endpoint = `/league/${leagueId}/transactions/${round}`;
    const cacheKey = `transactions_${leagueId}_${round}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = this.testData.transactions;
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock User Leagues endpoint
   */
  static async mockGetUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
    const endpoint = `/user/${userId}/leagues/nfl/${season}`;
    const cacheKey = `user_leagues_${userId}_${season}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = [this.testData.league];
    this.setCachedResponse(cacheKey, response);
    
    return response;
  }

  /**
   * Mock User endpoint
   */
  static async mockGetUser(userId: string): Promise<SleeperUser> {
    const endpoint = `/user/${userId}`;
    const cacheKey = `user_${userId}`;
    
    await this.simulateDelay();
    this.checkRateLimit();
    this.checkErrorScenarios(endpoint);

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const user = this.testData.users.find(u => u.user_id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    this.setCachedResponse(cacheKey, user);
    return user;
  }

  /**
   * Setup all mocks for Jest
   */
  static setupJestMocks(): void {
    // Mock the SleeperApiService methods
    const mockMethods = {
      getNFLState: jest.fn().mockImplementation(() => this.mockGetNFLState()),
      getAllPlayers: jest.fn().mockImplementation(() => this.mockGetAllPlayers()),
      getTrendingPlayers: jest.fn().mockImplementation((type, lookback, limit) => 
        this.mockGetTrendingPlayers(type, lookback, limit)
      ),
      getPlayerStats: jest.fn().mockImplementation((season, week) => 
        this.mockGetPlayerStats(season, week)
      ),
      getPlayerProjections: jest.fn().mockImplementation((season, week) => 
        this.mockGetPlayerProjections(season, week)
      ),
      getLeague: jest.fn().mockImplementation((leagueId) => 
        this.mockGetLeague(leagueId)
      ),
      getLeagueRosters: jest.fn().mockImplementation((leagueId) => 
        this.mockGetLeagueRosters(leagueId)
      ),
      getLeagueUsers: jest.fn().mockImplementation((leagueId) => 
        this.mockGetLeagueUsers(leagueId)
      ),
      getLeagueMatchups: jest.fn().mockImplementation((leagueId, week) => 
        this.mockGetLeagueMatchups(leagueId, week)
      ),
      getLeagueTransactions: jest.fn().mockImplementation((leagueId, round) => 
        this.mockGetLeagueTransactions(leagueId, round)
      ),
      getUserLeagues: jest.fn().mockImplementation((userId, season) => 
        this.mockGetUserLeagues(userId, season)
      ),
      getUser: jest.fn().mockImplementation((userId) => 
        this.mockGetUser(userId)
      ),
      healthCheck: jest.fn().mockImplementation(async () => ({
        healthy: true,
        latency: 50 + Math.random() * 100
      })),
      getUsageStats: jest.fn().mockImplementation(() => ({
        requestCount: this.state.requestCount,
        resetTime: this.state.lastResetTime + 60000,
        remainingRequests: Math.max(0, this.config.maxRequestsPerMinute! - this.state.requestCount),
        cacheSize: this.state.cachedResponses.size
      })),
      clearCache: jest.fn().mockImplementation(async () => {
        this.state.cachedResponses.clear();
      })
    };

    // Store the mocks for access in tests
    (this as any).mockMethods = mockMethods;
  }

  /**
   * Create error scenarios for testing
   */
  static createErrorScenarios(): {
    networkTimeout: () => void;
    rateLimitExceeded: () => void;
    serverError: () => void;
    invalidData: () => void;
    intermittentFailures: () => void;
  } {
    return {
      networkTimeout: () => {
        this.setErrorScenario('/state/nfl', ['Network timeout']);
        this.configure({ averageDelay: 10000 }); // 10 second delay
      },
      
      rateLimitExceeded: () => {
        this.configure({ 
          rateLimitSimulation: true, 
          maxRequestsPerMinute: 5 // Very low limit for testing
        });
      },
      
      serverError: () => {
        this.setErrorScenario('/players/nfl', ['Internal server error', 'Service unavailable']);
      },
      
      invalidData: () => {
        this.configure({ includeInconsistentData: true });
      },
      
      intermittentFailures: () => {
        this.configure({ errorRate: 0.3 }); // 30% error rate
      }
    };
  }

  /**
   * Get mock statistics for testing validation
   */
  static getMockStats(): {
    totalRequests: number;
    cacheHits: number;
    cacheSize: number;
    errorCount: number;
    lastResetTime: number;
  } {
    return {
      totalRequests: this.state.requestCount,
      cacheHits: 0, // Would need to track this separately
      cacheSize: this.state.cachedResponses.size,
      errorCount: 0, // Would need to track this separately
      lastResetTime: this.state.lastResetTime
    };
  }

  /**
   * Simulate specific test scenarios
   */
  static simulateScenario(scenario: 'game_day' | 'bye_week' | 'trade_deadline' | 'playoffs'): void {
    switch (scenario) {
      case 'game_day':
        this.testData.nflState = TestDataFactories.createNFLState({
          season_type: 'regular',
          week: 5
        });
        break;
        
      case 'bye_week':
        // Modify some players to be on bye week teams
        const byeTeams = ['KC', 'PHI', 'SF', 'DAL'];
        Object.values(this.testData.players).slice(0, 20).forEach(player => {
          player.team = byeTeams[Math.floor(Math.random() * byeTeams.length)];
        });
        break;
        
      case 'trade_deadline':
        this.testData.league.settings.trade_deadline = this.testData.nflState.week;
        break;
        
      case 'playoffs':
        this.testData.nflState = TestDataFactories.createNFLState({
          season_type: 'post',
          week: 19
        });
        break;
    }
  }
}