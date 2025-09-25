import Redis from 'ioredis';

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// Cache key prefixes for organization
export const CACHE_KEYS = {
  // Player data
  PLAYER: 'player',
  PLAYERS_BY_POSITION: 'players:position',
  PLAYER_STATS: 'player:stats',
  PLAYER_PROJECTIONS: 'player:projections',
  
  // League data  
  LEAGUE: 'league',
  LEAGUE_STANDINGS: 'league:standings',
  LEAGUE_SETTINGS: 'league:settings',
  LEAGUE_TEAMS: 'league:teams',
  
  // Team data
  TEAM: 'team',
  TEAM_ROSTER: 'team:roster',
  TEAM_LINEUP: 'team:lineup',
  TEAM_STATS: 'team:stats',
  
  // Scoring data
  LIVE_SCORES: 'scores:live',
  MATCHUP_SCORES: 'matchup:scores',
  WEEK_SCORES: 'scores:week',
  
  // Draft data
  DRAFT_STATE: 'draft:state',
  DRAFT_PICKS: 'draft:picks',
  AVAILABLE_PLAYERS: 'draft:available',
  
  // Trade data
  TRADE_ANALYSIS: 'trade:analysis',
  PLAYER_VALUES: 'player:values',
  
  // Waiver data
  WAIVER_ORDER: 'waivers:order',
  WAIVER_CLAIMS: 'waivers:claims',
  
  // ESPN API responses
  ESPN_PLAYERS: 'espn:players',
  ESPN_GAMES: 'espn:games',
  ESPN_SCHEDULE: 'espn:schedule',
  
  // Session and auth
  SESSION: 'session',
  USER_PERMISSIONS: 'user:permissions'
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  // Short-lived data (1-5 minutes)
  LIVE_SCORES: 60,           // 1 minute during games
  DRAFT_STATE: 30,           // 30 seconds during draft
  USER_SESSION: 300,         // 5 minutes
  
  // Medium-lived data (15 minutes - 1 hour)
  PLAYER_STATS: 900,         // 15 minutes
  TEAM_LINEUP: 900,          // 15 minutes
  MATCHUP_SCORES: 1800,      // 30 minutes
  LEAGUE_STANDINGS: 1800,    // 30 minutes
  TRADE_ANALYSIS: 3600,      // 1 hour
  
  // Long-lived data (1 hour - 1 day)
  PLAYER_INFO: 3600,         // 1 hour
  TEAM_ROSTER: 3600,         // 1 hour
  LEAGUE_SETTINGS: 7200,     // 2 hours
  PLAYER_PROJECTIONS: 21600, // 6 hours
  ESPN_PLAYERS: 86400,       // 1 day
  
  // Very long-lived data (1 day+)
  PLAYER_VALUES: 86400,      // 1 day
  ESPN_SCHEDULE: 604800      // 1 week
} as const;

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Generic get/set methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  // Specialized methods for common operations
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      let value = await this.get<T>(key);
      
      if (value !== null) {
        return value;
      }

      // If not in cache, fetch and set
      value = await fetchFn();
      await this.set(key, value, ttlSeconds);
      
      return value;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error);
      // Fallback to fetch without cache
      return await fetchFn();
    }
  }

  // Player-specific cache methods
  async cachePlayer(playerId: string, playerData: any): Promise<void> {
    const key = `${CACHE_KEYS.PLAYER}:${playerId}`;
    await this.set(key, playerData, CACHE_TTL.PLAYER_INFO);
  }

  async getCachedPlayer(playerId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.PLAYER}:${playerId}`;
    return await this.get(key);
  }

  async cachePlayerStats(playerId: string, week: number, stats: any): Promise<void> {
    const key = `${CACHE_KEYS.PLAYER_STATS}:${playerId}:${week}`;
    await this.set(key, stats, CACHE_TTL.PLAYER_STATS);
  }

  async getCachedPlayerStats(playerId: string, week: number): Promise<any | null> {
    const key = `${CACHE_KEYS.PLAYER_STATS}:${playerId}:${week}`;
    return await this.get(key);
  }

  // League-specific cache methods
  async cacheLeague(leagueId: string, leagueData: any): Promise<void> {
    const key = `${CACHE_KEYS.LEAGUE}:${leagueId}`;
    await this.set(key, leagueData, CACHE_TTL.LEAGUE_SETTINGS);
  }

  async getCachedLeague(leagueId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.LEAGUE}:${leagueId}`;
    return await this.get(key);
  }

  async cacheLeagueStandings(leagueId: string, standings: any): Promise<void> {
    const key = `${CACHE_KEYS.LEAGUE_STANDINGS}:${leagueId}`;
    await this.set(key, standings, CACHE_TTL.LEAGUE_STANDINGS);
  }

  async getCachedLeagueStandings(leagueId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.LEAGUE_STANDINGS}:${leagueId}`;
    return await this.get(key);
  }

  // Team-specific cache methods
  async cacheTeamRoster(teamId: string, roster: any): Promise<void> {
    const key = `${CACHE_KEYS.TEAM_ROSTER}:${teamId}`;
    await this.set(key, roster, CACHE_TTL.TEAM_ROSTER);
  }

  async getCachedTeamRoster(teamId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.TEAM_ROSTER}:${teamId}`;
    return await this.get(key);
  }

  async cacheTeamLineup(teamId: string, week: number, lineup: any): Promise<void> {
    const key = `${CACHE_KEYS.TEAM_LINEUP}:${teamId}:${week}`;
    await this.set(key, lineup, CACHE_TTL.TEAM_LINEUP);
  }

  async getCachedTeamLineup(teamId: string, week: number): Promise<any | null> {
    const key = `${CACHE_KEYS.TEAM_LINEUP}:${teamId}:${week}`;
    return await this.get(key);
  }

  // Live scoring cache methods
  async cacheLiveScores(leagueId: string, week: number, scores: any): Promise<void> {
    const key = `${CACHE_KEYS.LIVE_SCORES}:${leagueId}:${week}`;
    await this.set(key, scores, CACHE_TTL.LIVE_SCORES);
  }

  async getCachedLiveScores(leagueId: string, week: number): Promise<any | null> {
    const key = `${CACHE_KEYS.LIVE_SCORES}:${leagueId}:${week}`;
    return await this.get(key);
  }

  // Draft cache methods
  async cacheDraftState(draftId: string, state: any): Promise<void> {
    const key = `${CACHE_KEYS.DRAFT_STATE}:${draftId}`;
    await this.set(key, state, CACHE_TTL.DRAFT_STATE);
  }

  async getCachedDraftState(draftId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.DRAFT_STATE}:${draftId}`;
    return await this.get(key);
  }

  // ESPN API cache methods
  async cacheESPNPlayers(players: any): Promise<void> {
    const key = CACHE_KEYS.ESPN_PLAYERS;
    await this.set(key, players, CACHE_TTL.ESPN_PLAYERS);
  }

  async getCachedESPNPlayers(): Promise<any | null> {
    return await this.get(CACHE_KEYS.ESPN_PLAYERS);
  }

  async cacheESPNSchedule(week: number, schedule: any): Promise<void> {
    const key = `${CACHE_KEYS.ESPN_SCHEDULE}:${week}`;
    await this.set(key, schedule, CACHE_TTL.ESPN_SCHEDULE);
  }

  async getCachedESPNSchedule(week: number): Promise<any | null> {
    const key = `${CACHE_KEYS.ESPN_SCHEDULE}:${week}`;
    return await this.get(key);
  }

  // Cache invalidation methods
  async invalidatePlayerCache(playerId: string): Promise<void> {
    await this.deletePattern(`${CACHE_KEYS.PLAYER}:${playerId}*`);
    await this.deletePattern(`${CACHE_KEYS.PLAYER_STATS}:${playerId}*`);
  }

  async invalidateTeamCache(teamId: string): Promise<void> {
    await this.deletePattern(`${CACHE_KEYS.TEAM}:${teamId}*`);
    await this.deletePattern(`${CACHE_KEYS.TEAM_ROSTER}:${teamId}*`);
    await this.deletePattern(`${CACHE_KEYS.TEAM_LINEUP}:${teamId}*`);
  }

  async invalidateLeagueCache(leagueId: string): Promise<void> {
    await this.deletePattern(`${CACHE_KEYS.LEAGUE}:${leagueId}*`);
    await this.deletePattern(`${CACHE_KEYS.LEAGUE_STANDINGS}:${leagueId}*`);
    await this.deletePattern(`${CACHE_KEYS.LIVE_SCORES}:${leagueId}*`);
  }

  async invalidateDraftCache(draftId: string): Promise<void> {
    await this.deletePattern(`${CACHE_KEYS.DRAFT_STATE}:${draftId}*`);
    await this.deletePattern(`${CACHE_KEYS.DRAFT_PICKS}:${draftId}*`);
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      return {
        connected: true,
        memory: info
      };
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
      return { connected: false };
    }
  }
}

export const cacheService = CacheService.getInstance();
export { redis };