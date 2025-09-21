# D'Amato Dynasty League - Sleeper API Migration Plan

## Executive Summary

This comprehensive plan outlines the migration of the D'Amato Dynasty League platform from mock data and SportsData.io to the free Sleeper API. The migration will enhance data accuracy, reduce API costs, and provide access to real-time fantasy football data including live scoring, player tracking, and league management features.

## Current State Analysis

### Existing Data Sources
- **Primary**: SportsData.io (paid service requiring API key)
- **Fallback**: ESPN API (limited data, used when SportsData unavailable)
- **Development**: Static mock data for top fantasy players
- **Database**: PostgreSQL with Prisma ORM

### Current Architecture
- NFLDataService handles player data fetching and scoring
- Mock data in `src/data/mockPlayers.ts` (deprecated)
- Database schema supports comprehensive player stats and league management
- Fantasy scoring calculations built into the service layer

### Sleeper API Advantages
- **Free**: No API key required for basic endpoints
- **Comprehensive**: Complete NFL player database with real-time updates
- **Live Scoring**: Real-time game stats and fantasy points
- **League Management**: Full league import/export capabilities
- **Rate Limiting**: 1000 calls/minute (generous for our needs)
- **Trending Data**: Player ownership and trending information

---

## PHASE 1: Foundation & Research (Days 1-2)

### Objectives
- Establish Sleeper API service architecture
- Document all required endpoints
- Create robust error handling and caching
- Build type-safe API interfaces

### Implementation Tasks

#### 1.1 Sleeper API Service Architecture

**File**: `src/services/sleeper/sleeperApiService.ts`

```typescript
/**
 * Sleeper API Service - Primary data source for NFL and fantasy data
 * Documentation: https://docs.sleeper.app/
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { Redis } from 'ioredis';

// Sleeper API Configuration
const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';
const RATE_LIMIT_PER_MINUTE = 1000;
const CACHE_TTL = {
  PLAYERS: 3600, // 1 hour - players don't change often
  STATE: 300,    // 5 minutes - NFL state (week, season)
  STATS: 60,     // 1 minute - live stats during games
  TRENDING: 600  // 10 minutes - trending players
};

export class SleeperApiService {
  private client: AxiosInstance;
  private redis?: Redis;
  private requestCount: number = 0;
  private resetTime: number = Date.now() + 60000;

  constructor() {
    this.client = axios.create({
      baseURL: SLEEPER_BASE_URL,
      timeout: 10000,
      headers: {
        'User-Agent': 'AstralField/1.0 (damato-dynasty-league)',
        'Accept': 'application/json'
      }
    });

    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for rate limiting and error handling
   */
  private setupInterceptors() {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limited - wait and retry
          await this.waitForRateLimit();
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }

  /**
   * Enforce rate limiting (1000 requests per minute)
   */
  private async enforceRateLimit() {
    const now = Date.now();
    
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }

    if (this.requestCount >= RATE_LIMIT_PER_MINUTE) {
      const waitTime = this.resetTime - now;
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    this.requestCount++;
  }

  /**
   * Wait for rate limit to reset
   */
  private async waitForRateLimit() {
    const waitTime = this.resetTime - Date.now();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Generic cached request method
   */
  private async cachedRequest<T>(
    endpoint: string, 
    cacheKey: string, 
    ttl: number,
    validator: z.ZodSchema<T>
  ): Promise<T> {
    // Try cache first
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          return validator.parse(parsed);
        } catch (error) {
          console.warn(`Cache parse error for ${cacheKey}:`, error);
        }
      }
    }

    // Make API request
    const response = await this.client.get(endpoint);
    const validated = validator.parse(response.data);

    // Cache the result
    if (this.redis) {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(validated));
    }

    return validated;
  }
}
```

#### 1.2 Sleeper Data Type Definitions

**File**: `src/types/sleeper.ts`

```typescript
/**
 * Sleeper API Type Definitions
 * Based on official Sleeper API documentation
 */

import { z } from 'zod';

// NFL State Schema
export const NFLStateSchema = z.object({
  week: z.number(),
  season_type: z.enum(['pre', 'regular', 'post']),
  season: z.string(),
  previous_season: z.string(),
  leg: z.number(),
  season_start_date: z.string(),
  season_end_date: z.string(),
  week_start_date: z.string(),
  week_end_date: z.string()
});

export type NFLState = z.infer<typeof NFLStateSchema>;

// Player Schema
export const SleeperPlayerSchema = z.object({
  player_id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  full_name: z.string().nullable(),
  position: z.string().nullable(),
  team: z.string().nullable(),
  age: z.number().nullable(),
  height: z.string().nullable(),
  weight: z.string().nullable(),
  years_exp: z.number().nullable(),
  college: z.string().nullable(),
  status: z.enum(['Active', 'Inactive', 'Injured Reserve', 'Physically Unable to Perform', 'Practice Squad']).nullable(),
  injury_status: z.string().nullable(),
  injury_body_part: z.string().nullable(),
  injury_notes: z.string().nullable(),
  news_updated: z.number().nullable(),
  fantasy_data_id: z.number().nullable(),
  stats_id: z.string().nullable(),
  rotowire_id: z.number().nullable(),
  sportradar_id: z.string().nullable(),
  yahoo_id: z.number().nullable(),
  search_full_name: z.string().nullable(),
  birth_date: z.string().nullable()
});

export type SleeperPlayer = z.infer<typeof SleeperPlayerSchema>;

// Player Stats Schema
export const PlayerStatsSchema = z.object({
  pts_ppr: z.number().optional(),
  pts_std: z.number().optional(),
  pts_half_ppr: z.number().optional(),
  gms_active: z.number().optional(),
  pass_yd: z.number().optional(),
  pass_td: z.number().optional(),
  pass_int: z.number().optional(),
  pass_cmp: z.number().optional(),
  pass_att: z.number().optional(),
  rush_yd: z.number().optional(),
  rush_td: z.number().optional(),
  rush_att: z.number().optional(),
  rec: z.number().optional(),
  rec_yd: z.number().optional(),
  rec_td: z.number().optional(),
  rec_tgt: z.number().optional(),
  fum_lost: z.number().optional()
});

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

// League Schema
export const SleeperLeagueSchema = z.object({
  total_rosters: z.number(),
  status: z.enum(['pre_draft', 'drafting', 'in_season', 'complete']),
  sport: z.literal('nfl'),
  settings: z.object({
    max_keepers: z.number().optional(),
    draft_rounds: z.number().optional(),
    trade_deadline: z.number().optional(),
    playoff_week_start: z.number().optional(),
    num_teams: z.number(),
    playoff_teams: z.number().optional(),
    playoff_type: z.number().optional(),
    playoff_round_type: z.number().optional(),
    leg: z.number(),
    waiver_type: z.number().optional(),
    waiver_clear_days: z.number().optional(),
    waiver_day_of_week: z.number().optional(),
    start_week: z.number(),
    playoff_seed_type: z.number().optional(),
    reserve_slots: z.number().optional(),
    offseason_adds: z.number().optional()
  }),
  season_type: z.enum(['regular', 'post']),
  season: z.string(),
  scoring_settings: z.record(z.number()),
  roster_positions: z.array(z.string()),
  previous_league_id: z.string().nullable(),
  name: z.string(),
  league_id: z.string(),
  draft_id: z.string().nullable(),
  avatar: z.string().nullable()
});

export type SleeperLeague = z.infer<typeof SleeperLeagueSchema>;

// Trending Players Schema
export const TrendingPlayersSchema = z.object({
  count: z.number()
}).catchall(z.unknown());

export type TrendingPlayers = z.infer<typeof TrendingPlayersSchema>;
```

#### 1.3 Error Handling and Retry Logic

**File**: `src/services/sleeper/errorHandler.ts`

```typescript
/**
 * Sleeper API Error Handling and Retry Logic
 */

export class SleeperApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'SleeperApiError';
  }
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        throw new SleeperApiError(
          `Operation failed after ${config.maxRetries + 1} attempts: ${lastError.message}`,
          undefined,
          undefined,
          lastError
        );
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.exponentialBase, attempt),
        config.maxDelay
      );
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### Success Metrics for Phase 1
- ✅ Sleeper API service successfully fetches NFL state
- ✅ Type validation passes for all API responses
- ✅ Rate limiting prevents API abuse
- ✅ Error handling gracefully manages failures
- ✅ Caching reduces redundant API calls

### Testing Strategy
```typescript
// Test file: __tests__/services/sleeper/sleeperApiService.test.ts
describe('SleeperApiService', () => {
  it('should fetch NFL state without errors', async () => {
    const service = new SleeperApiService();
    const state = await service.getNFLState();
    expect(state).toHaveProperty('week');
    expect(state).toHaveProperty('season');
  });

  it('should handle rate limiting gracefully', async () => {
    // Mock 1000+ rapid requests to test rate limiting
  });

  it('should retry failed requests with exponential backoff', async () => {
    // Mock network failures and verify retry behavior
  });
});
```

---

## PHASE 2: Core Data Integration (Days 3-4)

### Objectives
- Replace all mock data with Sleeper API data
- Implement comprehensive player database sync
- Create NFL state management system
- Build player ID mapping for cross-platform compatibility

### Implementation Tasks

#### 2.1 Enhanced Sleeper API Service with Player Management

**Extension to**: `src/services/sleeper/sleeperApiService.ts`

```typescript
export class SleeperApiService {
  // ... previous code ...

  /**
   * Get current NFL state (season, week, etc.)
   */
  async getNFLState(): Promise<NFLState> {
    return this.cachedRequest(
      '/state/nfl',
      'sleeper:nfl:state',
      CACHE_TTL.STATE,
      NFLStateSchema
    );
  }

  /**
   * Get all NFL players
   */
  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    return this.cachedRequest(
      '/players/nfl',
      'sleeper:players:all',
      CACHE_TTL.PLAYERS,
      z.record(SleeperPlayerSchema)
    );
  }

  /**
   * Get trending players (add/drop)
   */
  async getTrendingPlayers(
    type: 'add' | 'drop' = 'add',
    lookback_hours: number = 24,
    limit: number = 25
  ): Promise<TrendingPlayers[]> {
    const endpoint = `/players/nfl/trending/${type}`;
    const params = new URLSearchParams({
      lookback_hours: lookback_hours.toString(),
      limit: limit.toString()
    });

    return this.cachedRequest(
      `${endpoint}?${params}`,
      `sleeper:trending:${type}:${lookback_hours}:${limit}`,
      CACHE_TTL.TRENDING,
      z.array(TrendingPlayersSchema)
    );
  }

  /**
   * Get player stats for a specific week/season
   */
  async getPlayerStats(
    season: string,
    week?: number
  ): Promise<Record<string, PlayerStats>> {
    const endpoint = week 
      ? `/stats/nfl/regular/${season}/${week}`
      : `/stats/nfl/regular/${season}`;
    
    const cacheKey = week
      ? `sleeper:stats:${season}:${week}`
      : `sleeper:stats:${season}:season`;

    return this.cachedRequest(
      endpoint,
      cacheKey,
      CACHE_TTL.STATS,
      z.record(PlayerStatsSchema)
    );
  }

  /**
   * Get projections for players
   */
  async getPlayerProjections(
    season: string,
    week: number
  ): Promise<Record<string, PlayerStats>> {
    const endpoint = `/projections/nfl/regular/${season}/${week}`;
    
    return this.cachedRequest(
      endpoint,
      `sleeper:projections:${season}:${week}`,
      CACHE_TTL.STATS,
      z.record(PlayerStatsSchema)
    );
  }

  /**
   * Get specific league information
   */
  async getLeague(leagueId: string): Promise<SleeperLeague> {
    return this.cachedRequest(
      `/league/${leagueId}`,
      `sleeper:league:${leagueId}`,
      300, // 5 minutes cache for league data
      SleeperLeagueSchema
    );
  }

  /**
   * Get league rosters
   */
  async getLeagueRosters(leagueId: string): Promise<any[]> {
    const response = await this.client.get(`/league/${leagueId}/rosters`);
    return response.data;
  }

  /**
   * Get league users
   */
  async getLeagueUsers(leagueId: string): Promise<any[]> {
    const response = await this.client.get(`/league/${leagueId}/users`);
    return response.data;
  }
}
```

#### 2.2 Player Data Synchronization Service

**File**: `src/services/sleeper/playerSyncService.ts`

```typescript
/**
 * Player Data Synchronization Service
 * Handles syncing Sleeper player data with our database
 */

import { PrismaClient, Position, PlayerStatus } from '@prisma/client';
import { SleeperApiService } from './sleeperApiService';
import { SleeperPlayer } from '@/types/sleeper';

const prisma = new PrismaClient();

// Position mapping from Sleeper to our schema
const SLEEPER_POSITION_MAP: Record<string, Position> = {
  'QB': Position.QB,
  'RB': Position.RB,
  'WR': Position.WR,
  'TE': Position.TE,
  'K': Position.K,
  'DEF': Position.DST,
  'DL': Position.DL,
  'LB': Position.LB,
  'DB': Position.DB,
  'CB': Position.CB,
  'S': Position.S
};

// Status mapping from Sleeper to our schema
const SLEEPER_STATUS_MAP: Record<string, PlayerStatus> = {
  'Active': PlayerStatus.ACTIVE,
  'Inactive': PlayerStatus.INACTIVE,
  'Injured Reserve': PlayerStatus.INJURED_RESERVE,
  'Physically Unable to Perform': PlayerStatus.PUP,
  'Practice Squad': PlayerStatus.PRACTICE_SQUAD
};

export class PlayerSyncService {
  private sleeperApi: SleeperApiService;

  constructor() {
    this.sleeperApi = new SleeperApiService();
  }

  /**
   * Sync all players from Sleeper API to our database
   */
  async syncAllPlayers(): Promise<void> {
    console.log('🔄 Starting player synchronization from Sleeper API...');
    
    try {
      const allPlayers = await this.sleeperApi.getAllPlayers();
      const playerEntries = Object.entries(allPlayers);
      
      console.log(`📥 Fetched ${playerEntries.length} players from Sleeper`);
      
      let syncedCount = 0;
      let skippedCount = 0;
      
      for (const [playerId, playerData] of playerEntries) {
        try {
          const success = await this.syncPlayer(playerId, playerData);
          if (success) {
            syncedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Error syncing player ${playerId}:`, error);
          skippedCount++;
        }
      }
      
      console.log(`✅ Player sync complete: ${syncedCount} synced, ${skippedCount} skipped`);
      
    } catch (error) {
      console.error('❌ Failed to sync players:', error);
      throw error;
    }
  }

  /**
   * Sync a single player to the database
   */
  private async syncPlayer(sleeperPlayerId: string, playerData: SleeperPlayer): Promise<boolean> {
    // Only sync fantasy-relevant players
    if (!this.isFantasyRelevant(playerData)) {
      return false;
    }

    const position = SLEEPER_POSITION_MAP[playerData.position || ''];
    if (!position) {
      return false;
    }

    const status = SLEEPER_STATUS_MAP[playerData.status || 'Active'] || PlayerStatus.ACTIVE;
    const fullName = playerData.full_name || `${playerData.first_name || ''} ${playerData.last_name || ''}`.trim();
    
    if (!fullName) {
      return false;
    }

    try {
      await prisma.player.upsert({
        where: {
          nflId: `sleeper_${sleeperPlayerId}`
        },
        update: {
          name: fullName,
          position,
          nflTeam: playerData.team || 'FA',
          status,
          yearsExperience: playerData.years_exp || 0,
          isRookie: (playerData.years_exp || 0) === 0,
          updatedAt: new Date(),
          // Store Sleeper-specific data in metadata
          metadata: {
            sleeper: {
              player_id: sleeperPlayerId,
              age: playerData.age,
              height: playerData.height,
              weight: playerData.weight,
              college: playerData.college,
              birth_date: playerData.birth_date,
              injury_status: playerData.injury_status,
              injury_body_part: playerData.injury_body_part,
              injury_notes: playerData.injury_notes,
              news_updated: playerData.news_updated
            }
          }
        },
        create: {
          nflId: `sleeper_${sleeperPlayerId}`,
          name: fullName,
          position,
          nflTeam: playerData.team || 'FA',
          status,
          yearsExperience: playerData.years_exp || 0,
          isRookie: (playerData.years_exp || 0) === 0,
          metadata: {
            sleeper: {
              player_id: sleeperPlayerId,
              age: playerData.age,
              height: playerData.height,
              weight: playerData.weight,
              college: playerData.college,
              birth_date: playerData.birth_date,
              injury_status: playerData.injury_status,
              injury_body_part: playerData.injury_body_part,
              injury_notes: playerData.injury_notes,
              news_updated: playerData.news_updated
            }
          }
        }
      });

      return true;
    } catch (error) {
      console.error(`Failed to upsert player ${fullName}:`, error);
      return false;
    }
  }

  /**
   * Determine if a player is fantasy-relevant
   */
  private isFantasyRelevant(player: SleeperPlayer): boolean {
    // Include active players in fantasy positions
    const fantasyPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    return fantasyPositions.includes(player.position || '') && 
           player.status !== 'Inactive';
  }

  /**
   * Update player stats from Sleeper
   */
  async syncPlayerStats(season: string, week?: number): Promise<void> {
    console.log(`📊 Syncing player stats for ${season}${week ? ` Week ${week}` : ' (season)'}`);
    
    try {
      const stats = await this.sleeperApi.getPlayerStats(season, week);
      let processedCount = 0;

      for (const [sleeperPlayerId, playerStats] of Object.entries(stats)) {
        const player = await prisma.player.findUnique({
          where: { nflId: `sleeper_${sleeperPlayerId}` },
          select: { id: true }
        });

        if (!player) continue;

        // Calculate fantasy points using PPR scoring
        const fantasyPoints = this.calculateFantasyPoints(playerStats);

        if (week) {
          // Weekly stats
          await prisma.playerStats.upsert({
            where: {
              playerId_week_season: {
                playerId: player.id,
                week,
                season: parseInt(season)
              }
            },
            update: {
              stats: playerStats as any,
              fantasyPoints,
              updatedAt: new Date()
            },
            create: {
              playerId: player.id,
              week,
              season: parseInt(season),
              stats: playerStats as any,
              fantasyPoints,
              isProjected: false
            }
          });
        } else {
          // Season stats - update player's average
          await prisma.player.update({
            where: { id: player.id },
            data: { 
              averagePoints: playerStats.pts_ppr || fantasyPoints,
              updatedAt: new Date()
            }
          });
        }

        processedCount++;
      }

      console.log(`✅ Processed ${processedCount} player stat records`);
      
    } catch (error) {
      console.error('❌ Failed to sync player stats:', error);
      throw error;
    }
  }

  /**
   * Calculate fantasy points from Sleeper stats
   */
  private calculateFantasyPoints(stats: any): number {
    // Use PPR scoring if available, otherwise calculate manually
    if (stats.pts_ppr) {
      return stats.pts_ppr;
    }

    let points = 0;

    // Passing
    points += (stats.pass_yd || 0) * 0.04;
    points += (stats.pass_td || 0) * 4;
    points += (stats.pass_int || 0) * -2;

    // Rushing
    points += (stats.rush_yd || 0) * 0.1;
    points += (stats.rush_td || 0) * 6;

    // Receiving (PPR)
    points += (stats.rec_yd || 0) * 0.1;
    points += (stats.rec_td || 0) * 6;
    points += (stats.rec || 0) * 1; // PPR

    // Fumbles
    points += (stats.fum_lost || 0) * -2;

    return Math.round(points * 100) / 100;
  }
}
```

#### 2.3 NFL State Management Service

**File**: `src/services/sleeper/nflStateService.ts`

```typescript
/**
 * NFL State Management Service
 * Tracks current season, week, and game status
 */

import { SleeperApiService } from './sleeperApiService';
import { NFLState } from '@/types/sleeper';

export class NFLStateService {
  private sleeperApi: SleeperApiService;
  private currentState: NFLState | null = null;

  constructor() {
    this.sleeperApi = new SleeperApiService();
  }

  /**
   * Get current NFL state with caching
   */
  async getCurrentState(): Promise<NFLState> {
    if (!this.currentState) {
      this.currentState = await this.sleeperApi.getNFLState();
    }
    return this.currentState;
  }

  /**
   * Refresh state cache
   */
  async refreshState(): Promise<NFLState> {
    this.currentState = await this.sleeperApi.getNFLState();
    return this.currentState;
  }

  /**
   * Get current week number
   */
  async getCurrentWeek(): Promise<number> {
    const state = await this.getCurrentState();
    return state.week;
  }

  /**
   * Get current season
   */
  async getCurrentSeason(): Promise<string> {
    const state = await this.getCurrentState();
    return state.season;
  }

  /**
   * Check if we're in regular season
   */
  async isRegularSeason(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.season_type === 'regular';
  }

  /**
   * Check if we're in playoffs
   */
  async isPlayoffs(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.season_type === 'post';
  }

  /**
   * Get week start/end dates
   */
  async getWeekDates(): Promise<{ start: Date; end: Date }> {
    const state = await this.getCurrentState();
    return {
      start: new Date(state.week_start_date),
      end: new Date(state.week_end_date)
    };
  }
}
```

### Success Metrics for Phase 2
- ✅ All mock data replaced with Sleeper API data
- ✅ Player database contains 2000+ NFL players with accurate positions
- ✅ NFL state correctly tracks current season and week
- ✅ Player stats sync successfully for current season
- ✅ Cross-platform player ID mapping established

### Testing Strategy
```typescript
describe('PlayerSyncService', () => {
  it('should sync all fantasy-relevant players', async () => {
    const service = new PlayerSyncService();
    await service.syncAllPlayers();
    
    const playerCount = await prisma.player.count();
    expect(playerCount).toBeGreaterThan(1500); // Expect significant number of players
  });

  it('should handle player updates correctly', async () => {
    // Test updating existing player data
  });

  it('should calculate fantasy points accurately', async () => {
    // Test fantasy point calculations against known values
  });
});
```

---

## PHASE 3: League Synchronization (Days 5-7)

### Objectives
- Import D'Amato Dynasty League configuration from Sleeper
- Sync team rosters and ownership
- Implement scoring system compatibility
- Build matchup and standings tracking

### Implementation Tasks

#### 3.1 League Import Service

**File**: `src/services/sleeper/leagueImportService.ts`

```typescript
/**
 * League Import Service
 * Handles importing D'Amato Dynasty League from Sleeper
 */

import { PrismaClient } from '@prisma/client';
import { SleeperApiService } from './sleeperApiService';
import { SleeperLeague } from '@/types/sleeper';

const prisma = new PrismaClient();

// D'Amato Dynasty League ID on Sleeper (replace with actual ID)
const DAMATO_LEAGUE_ID = process.env.DAMATO_SLEEPER_LEAGUE_ID || '123456789';

export class LeagueImportService {
  private sleeperApi: SleeperApiService;

  constructor() {
    this.sleeperApi = new SleeperApiService();
  }

  /**
   * Import the D'Amato Dynasty League configuration
   */
  async importDamatoLeague(): Promise<void> {
    console.log('🏈 Importing D\'Amato Dynasty League from Sleeper...');

    try {
      // Get league data
      const sleeperLeague = await this.sleeperApi.getLeague(DAMATO_LEAGUE_ID);
      const rosters = await this.sleeperApi.getLeagueRosters(DAMATO_LEAGUE_ID);
      const users = await this.sleeperApi.getLeagueUsers(DAMATO_LEAGUE_ID);

      // Create or update the league
      const league = await this.createLeague(sleeperLeague);
      
      // Import users and teams
      await this.importUsers(users, league.id);
      await this.importRosters(rosters, league.id);

      console.log('✅ D\'Amato Dynasty League imported successfully');
      
    } catch (error) {
      console.error('❌ Failed to import league:', error);
      throw error;
    }
  }

  /**
   * Create or update league in our database
   */
  private async createLeague(sleeperLeague: SleeperLeague) {
    return await prisma.league.upsert({
      where: {
        id: 'damato-dynasty-2024'
      },
      update: {
        name: sleeperLeague.name,
        season: parseInt(sleeperLeague.season),
        teamCount: sleeperLeague.total_rosters,
        currentWeek: sleeperLeague.settings.start_week,
        updatedAt: new Date(),
        settings: {
          update: {
            rosterSlots: this.convertRosterPositions(sleeperLeague.roster_positions),
            scoringSystem: this.convertScoringSettings(sleeperLeague.scoring_settings),
            waiverMode: this.convertWaiverType(sleeperLeague.settings.waiver_type),
            playoffWeeks: this.generatePlayoffWeeks(sleeperLeague.settings)
          }
        }
      },
      create: {
        id: 'damato-dynasty-2024',
        name: sleeperLeague.name,
        description: 'D\'Amato Dynasty League - Imported from Sleeper',
        season: parseInt(sleeperLeague.season),
        isActive: sleeperLeague.status === 'in_season',
        teamCount: sleeperLeague.total_rosters,
        memberCount: sleeperLeague.total_rosters,
        currentWeek: sleeperLeague.settings.start_week,
        settings: {
          create: {
            rosterSlots: this.convertRosterPositions(sleeperLeague.roster_positions),
            scoringSystem: this.convertScoringSettings(sleeperLeague.scoring_settings),
            waiverMode: this.convertWaiverType(sleeperLeague.settings.waiver_type),
            playoffWeeks: this.generatePlayoffWeeks(sleeperLeague.settings)
          }
        }
      },
      include: {
        settings: true
      }
    });
  }

  /**
   * Convert Sleeper roster positions to our format
   */
  private convertRosterPositions(positions: string[]): any {
    const counts = positions.reduce((acc, pos) => {
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      QB: counts.QB || 1,
      RB: counts.RB || 2,
      WR: counts.WR || 2,
      TE: counts.TE || 1,
      FLEX: counts.FLEX || 1,
      SUPER_FLEX: counts.SUPER_FLEX || 0,
      K: counts.K || 1,
      DST: counts.DEF || 1,
      BENCH: counts.BN || 6,
      IR: counts.IR || 0,
      TAXI: counts.TAXI || 0
    };
  }

  /**
   * Convert Sleeper scoring settings to our format
   */
  private convertScoringSettings(scoring: Record<string, number>): any {
    return {
      passing: {
        yards: scoring.pass_yd || 0.04,
        touchdowns: scoring.pass_td || 4,
        interceptions: scoring.pass_int || -2,
        twoPointConversions: scoring.pass_2pt || 2
      },
      rushing: {
        yards: scoring.rush_yd || 0.1,
        touchdowns: scoring.rush_td || 6,
        twoPointConversions: scoring.rush_2pt || 2
      },
      receiving: {
        yards: scoring.rec_yd || 0.1,
        touchdowns: scoring.rec_td || 6,
        receptions: scoring.rec || 1, // PPR
        twoPointConversions: scoring.rec_2pt || 2
      },
      kicking: {
        fieldGoals: {
          '0-39': scoring.fgm_0_39 || 3,
          '40-49': scoring.fgm_40_49 || 4,
          '50+': scoring.fgm_50p || 5
        },
        extraPoints: scoring.xpm || 1
      },
      defense: {
        touchdowns: scoring.def_td || 6,
        interceptions: scoring.def_int || 2,
        fumbleRecoveries: scoring.def_fr || 2,
        sacks: scoring.def_sack || 1,
        safeties: scoring.def_safe || 2,
        pointsAllowed: {
          '0': scoring.def_pa_0 || 10,
          '1-6': scoring.def_pa_1_6 || 7,
          '7-13': scoring.def_pa_7_13 || 4,
          '14-20': scoring.def_pa_14_20 || 1,
          '21-27': scoring.def_pa_21_27 || 0,
          '28+': scoring.def_pa_28p || -1
        }
      }
    };
  }

  /**
   * Convert waiver type to our enum
   */
  private convertWaiverType(waiverType?: number): string {
    switch (waiverType) {
      case 0: return 'WAIVER_PRIORITY';
      case 1: return 'FAAB';
      case 2: return 'FREE_AGENCY';
      default: return 'WAIVER_PRIORITY';
    }
  }

  /**
   * Generate playoff weeks array
   */
  private generatePlayoffWeeks(settings: any): number[] {
    const startWeek = settings.playoff_week_start || 14;
    const playoffTeams = settings.playoff_teams || 4;
    
    // Calculate playoff weeks based on bracket size
    const rounds = Math.ceil(Math.log2(playoffTeams));
    const weeks = [];
    
    for (let i = 0; i < rounds; i++) {
      weeks.push(startWeek + i);
    }
    
    return weeks;
  }

  /**
   * Import users from Sleeper
   */
  private async importUsers(users: any[], leagueId: string): Promise<void> {
    for (const sleeperUser of users) {
      // Create user if doesn't exist
      const user = await prisma.user.upsert({
        where: {
          email: sleeperUser.user_id + '@sleeper.app' // Generate email from user_id
        },
        update: {
          name: sleeperUser.display_name,
          avatar: sleeperUser.avatar,
          updatedAt: new Date()
        },
        create: {
          email: sleeperUser.user_id + '@sleeper.app',
          name: sleeperUser.display_name,
          avatar: sleeperUser.avatar,
          role: 'USER'
        }
      });

      // Create league membership
      await prisma.leagueMember.upsert({
        where: {
          userId_leagueId: {
            userId: user.id,
            leagueId
          }
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          leagueId,
          role: 'MEMBER'
        }
      });
    }
  }

  /**
   * Import rosters from Sleeper
   */
  private async importRosters(rosters: any[], leagueId: string): Promise<void> {
    for (const sleeperRoster of rosters) {
      // Find the user for this roster
      const sleeperUser = await this.getUserBySleeperUserId(sleeperRoster.owner_id);
      if (!sleeperUser) continue;

      // Create or update team
      const team = await prisma.team.upsert({
        where: {
          ownerId_leagueId: {
            ownerId: sleeperUser.id,
            leagueId
          }
        },
        update: {
          wins: sleeperRoster.settings.wins || 0,
          losses: sleeperRoster.settings.losses || 0,
          ties: sleeperRoster.settings.ties || 0,
          pointsFor: sleeperRoster.settings.fpts || 0,
          pointsAgainst: sleeperRoster.settings.fpts_against || 0,
          waiverPriority: sleeperRoster.settings.waiver_position || 1,
          faabBudget: sleeperRoster.settings.total_budget || 100,
          faabSpent: (sleeperRoster.settings.total_budget || 100) - (sleeperRoster.settings.budget || 100),
          updatedAt: new Date()
        },
        create: {
          name: `${sleeperUser.name}'s Team`,
          leagueId,
          ownerId: sleeperUser.id,
          wins: sleeperRoster.settings.wins || 0,
          losses: sleeperRoster.settings.losses || 0,
          ties: sleeperRoster.settings.ties || 0,
          pointsFor: sleeperRoster.settings.fpts || 0,
          pointsAgainst: sleeperRoster.settings.fpts_against || 0,
          waiverPriority: sleeperRoster.settings.waiver_position || 1,
          faabBudget: sleeperRoster.settings.total_budget || 100,
          faabSpent: (sleeperRoster.settings.total_budget || 100) - (sleeperRoster.settings.budget || 100)
        }
      });

      // Import roster players
      await this.importRosterPlayers(sleeperRoster.players || [], team.id);
    }
  }

  /**
   * Import roster players
   */
  private async importRosterPlayers(playerIds: string[], teamId: string): Promise<void> {
    // Clear existing roster
    await prisma.rosterPlayer.deleteMany({
      where: { teamId }
    });

    // Add current players
    for (const sleeperPlayerId of playerIds) {
      const player = await prisma.player.findUnique({
        where: { nflId: `sleeper_${sleeperPlayerId}` }
      });

      if (player) {
        await prisma.rosterPlayer.create({
          data: {
            teamId,
            playerId: player.id,
            rosterSlot: 'BENCH' // Default to bench, lineup optimization will handle starters
          }
        });
      }
    }
  }

  /**
   * Get user by Sleeper user ID
   */
  private async getUserBySleeperUserId(sleeperUserId: string) {
    return await prisma.user.findUnique({
      where: {
        email: sleeperUserId + '@sleeper.app'
      }
    });
  }
}
```

#### 3.2 Scoring System Compatibility

**File**: `src/services/sleeper/scoringService.ts`

```typescript
/**
 * Scoring Service for Sleeper Integration
 * Handles custom scoring calculations and compatibility
 */

import { PrismaClient } from '@prisma/client';
import { PlayerStats } from '@/types/sleeper';

const prisma = new PrismaClient();

export class ScoringService {
  /**
   * Calculate fantasy points using league-specific scoring
   */
  async calculateFantasyPoints(
    playerStats: PlayerStats,
    leagueId: string
  ): Promise<number> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { settings: true }
    });

    if (!league?.settings) {
      throw new Error(`League ${leagueId} not found or has no scoring settings`);
    }

    const scoring = league.settings.scoringSystem as any;
    let points = 0;

    // Passing points
    if (playerStats.pass_yd) {
      points += playerStats.pass_yd * (scoring.passing?.yards || 0.04);
    }
    if (playerStats.pass_td) {
      points += playerStats.pass_td * (scoring.passing?.touchdowns || 4);
    }
    if (playerStats.pass_int) {
      points += playerStats.pass_int * (scoring.passing?.interceptions || -2);
    }

    // Rushing points
    if (playerStats.rush_yd) {
      points += playerStats.rush_yd * (scoring.rushing?.yards || 0.1);
    }
    if (playerStats.rush_td) {
      points += playerStats.rush_td * (scoring.rushing?.touchdowns || 6);
    }

    // Receiving points
    if (playerStats.rec_yd) {
      points += playerStats.rec_yd * (scoring.receiving?.yards || 0.1);
    }
    if (playerStats.rec_td) {
      points += playerStats.rec_td * (scoring.receiving?.touchdowns || 6);
    }
    if (playerStats.rec) {
      points += playerStats.rec * (scoring.receiving?.receptions || 1); // PPR
    }

    // Fumbles
    if (playerStats.fum_lost) {
      points += playerStats.fum_lost * -2; // Standard fumble penalty
    }

    return Math.round(points * 100) / 100;
  }

  /**
   * Batch calculate fantasy points for multiple players
   */
  async batchCalculatePoints(
    playerStats: Record<string, PlayerStats>,
    leagueId: string
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const [playerId, stats] of Object.entries(playerStats)) {
      try {
        results[playerId] = await this.calculateFantasyPoints(stats, leagueId);
      } catch (error) {
        console.error(`Error calculating points for player ${playerId}:`, error);
        results[playerId] = 0;
      }
    }

    return results;
  }

  /**
   * Update all player scores for a specific week
   */
  async updateWeekScores(
    leagueId: string,
    season: string,
    week: number
  ): Promise<void> {
    console.log(`🔄 Updating scores for League ${leagueId}, Week ${week}`);

    // This would integrate with the Sleeper API to get weekly stats
    // and calculate points based on league scoring settings
    
    // Implementation would fetch stats and apply custom scoring
  }
}
```

### Success Metrics for Phase 3
- ✅ D'Amato Dynasty League successfully imported from Sleeper
- ✅ All team rosters synchronized with current ownership
- ✅ Scoring system matches Sleeper league configuration
- ✅ Historical scores calculated correctly
- ✅ League standings reflect current season state

---

## PHASE 4: Real-Time Features (Days 8-9)

### Objectives
- Implement smart polling for live game updates
- Create WebSocket abstraction for real-time notifications
- Add trending player tracking and alerts
- Build comprehensive notification system

### Implementation Tasks

#### 4.1 Live Scoring Manager

**File**: `src/services/sleeper/liveScoreManager.ts`

```typescript
/**
 * Live Scoring Manager
 * Handles real-time score updates during NFL games
 */

import { SleeperApiService } from './sleeperApiService';
import { NFLStateService } from './nflStateService';
import { ScoringService } from './scoringService';
import { EventEmitter } from 'events';

export interface ScoreUpdate {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  oldScore: number;
  newScore: number;
  scoringPlay: string;
}

export class LiveScoreManager extends EventEmitter {
  private sleeperApi: SleeperApiService;
  private nflState: NFLStateService;
  private scoringService: ScoringService;
  private isPolling: boolean = false;
  private pollingInterval?: NodeJS.Timeout;
  private lastUpdateTime: number = 0;

  constructor() {
    super();
    this.sleeperApi = new SleeperApiService();
    this.nflState = new NFLStateService();
    this.scoringService = new ScoringService();
  }

  /**
   * Start live scoring for game days
   */
  async startLiveScoring(): Promise<void> {
    if (this.isPolling) return;

    console.log('🔴 Starting live scoring updates...');
    
    this.isPolling = true;
    this.lastUpdateTime = Date.now();

    // Check if it's game day
    const isGameDay = await this.isGameDay();
    const pollInterval = isGameDay ? 30000 : 300000; // 30s during games, 5m otherwise

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForUpdates();
      } catch (error) {
        console.error('❌ Error polling for score updates:', error);
        this.emit('error', error);
      }
    }, pollInterval);

    console.log(`✅ Live scoring started (polling every ${pollInterval / 1000}s)`);
  }

  /**
   * Stop live scoring
   */
  stopLiveScoring(): void {
    if (!this.isPolling) return;

    console.log('⏹️ Stopping live scoring updates...');
    
    this.isPolling = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    console.log('✅ Live scoring stopped');
  }

  /**
   * Poll for score updates
   */
  private async pollForUpdates(): Promise<void> {
    const currentWeek = await this.nflState.getCurrentWeek();
    const currentSeason = await this.nflState.getCurrentSeason();

    // Get current stats from Sleeper
    const currentStats = await this.sleeperApi.getPlayerStats(currentSeason, currentWeek);
    
    // Compare with stored stats and emit updates
    await this.processScoreUpdates(currentStats, currentSeason, currentWeek);
    
    this.lastUpdateTime = Date.now();
  }

  /**
   * Process score updates and emit events
   */
  private async processScoreUpdates(
    currentStats: Record<string, any>,
    season: string,
    week: number
  ): Promise<void> {
    const updates: ScoreUpdate[] = [];

    for (const [sleeperPlayerId, stats] of Object.entries(currentStats)) {
      const player = await prisma.player.findUnique({
        where: { nflId: `sleeper_${sleeperPlayerId}` },
        include: {
          stats: {
            where: {
              week,
              season: parseInt(season)
            },
            take: 1
          }
        }
      });

      if (!player) continue;

      const currentScore = stats.pts_ppr || 0;
      const previousScore = player.stats[0]?.fantasyPoints || 0;

      if (Math.abs(currentScore - previousScore) > 0.1) {
        updates.push({
          playerId: player.id,
          playerName: player.name,
          team: player.nflTeam,
          position: player.position,
          oldScore: previousScore,
          newScore: currentScore,
          scoringPlay: this.extractScoringPlay(stats)
        });

        // Update database
        await this.updatePlayerScore(player.id, currentScore, stats, week, parseInt(season));
      }
    }

    if (updates.length > 0) {
      console.log(`📊 ${updates.length} score updates detected`);
      this.emit('scoreUpdates', updates);
    }
  }

  /**
   * Update player score in database
   */
  private async updatePlayerScore(
    playerId: string,
    fantasyPoints: number,
    stats: any,
    week: number,
    season: number
  ): Promise<void> {
    await prisma.playerStats.upsert({
      where: {
        playerId_week_season: {
          playerId,
          week,
          season
        }
      },
      update: {
        fantasyPoints,
        stats: stats as any,
        updatedAt: new Date()
      },
      create: {
        playerId,
        week,
        season,
        fantasyPoints,
        stats: stats as any,
        isProjected: false
      }
    });
  }

  /**
   * Extract scoring play description from stats
   */
  private extractScoringPlay(stats: any): string {
    const plays = [];
    
    if (stats.pass_td) plays.push(`${stats.pass_td} passing TD`);
    if (stats.rush_td) plays.push(`${stats.rush_td} rushing TD`);
    if (stats.rec_td) plays.push(`${stats.rec_td} receiving TD`);
    if (stats.rec) plays.push(`${stats.rec} receptions`);
    
    return plays.join(', ') || 'Statistical update';
  }

  /**
   * Check if today is an NFL game day
   */
  private async isGameDay(): Promise<boolean> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // NFL games typically on Thursday (4), Sunday (0), Monday (1)
    return [0, 1, 4].includes(dayOfWeek);
  }

  /**
   * Get live scores for specific teams
   */
  async getTeamLiveScores(teamIds: string[]): Promise<Record<string, number>> {
    const scores: Record<string, number> = {};

    for (const teamId of teamIds) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          roster: {
            include: {
              player: {
                include: {
                  stats: {
                    where: {
                      week: await this.nflState.getCurrentWeek(),
                      season: parseInt(await this.nflState.getCurrentSeason())
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (team) {
        const totalScore = team.roster.reduce((sum, rosterPlayer) => {
          const playerScore = rosterPlayer.player.stats[0]?.fantasyPoints || 0;
          return sum + playerScore;
        }, 0);

        scores[teamId] = Math.round(totalScore * 100) / 100;
      }
    }

    return scores;
  }
}
```

#### 4.2 Trending Player Service

**File**: `src/services/sleeper/trendingService.ts`

```typescript
/**
 * Trending Player Service
 * Tracks player trends and provides recommendations
 */

import { SleeperApiService } from './sleeperApiService';
import { TrendingPlayers } from '@/types/sleeper';

export interface TrendingPlayerData {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  trendType: 'add' | 'drop';
  trendCount: number;
  recommendation: 'strong_add' | 'add' | 'hold' | 'drop' | 'strong_drop';
  reasoning: string;
}

export class TrendingService {
  private sleeperApi: SleeperApiService;

  constructor() {
    this.sleeperApi = new SleeperApiService();
  }

  /**
   * Get trending players with analysis
   */
  async getTrendingPlayers(
    type: 'add' | 'drop' = 'add',
    hours: number = 24
  ): Promise<TrendingPlayerData[]> {
    console.log(`📈 Fetching trending ${type} players (${hours}h lookback)`);

    const trendingData = await this.sleeperApi.getTrendingPlayers(type, hours, 50);
    const results: TrendingPlayerData[] = [];

    for (const trend of trendingData) {
      const playerId = Object.keys(trend)[0];
      const count = trend.count;

      const player = await prisma.player.findUnique({
        where: { nflId: `sleeper_${playerId}` },
        include: {
          stats: {
            orderBy: { week: 'desc' },
            take: 3
          }
        }
      });

      if (!player) continue;

      const recommendation = this.generateRecommendation(player, count, type);
      const reasoning = this.generateReasoning(player, count, type);

      results.push({
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        team: player.nflTeam,
        trendType: type,
        trendCount: count,
        recommendation,
        reasoning
      });
    }

    return results.sort((a, b) => b.trendCount - a.trendCount);
  }

  /**
   * Generate recommendation based on player data and trends
   */
  private generateRecommendation(
    player: any,
    trendCount: number,
    type: 'add' | 'drop'
  ): TrendingPlayerData['recommendation'] {
    const recentPerformance = this.calculateRecentPerformance(player.stats);
    const positionValue = this.getPositionValue(player.position);

    if (type === 'add') {
      if (trendCount > 1000 && recentPerformance > 15) return 'strong_add';
      if (trendCount > 500 && recentPerformance > 10) return 'add';
      if (recentPerformance > 8) return 'add';
      return 'hold';
    } else {
      if (trendCount > 1000 && recentPerformance < 5) return 'strong_drop';
      if (trendCount > 500 && recentPerformance < 8) return 'drop';
      if (recentPerformance < 6) return 'drop';
      return 'hold';
    }
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(
    player: any,
    trendCount: number,
    type: 'add' | 'drop'
  ): string {
    const recentPerformance = this.calculateRecentPerformance(player.stats);
    const injuryStatus = player.metadata?.sleeper?.injury_status;

    let reasoning = `${trendCount} managers ${type === 'add' ? 'added' : 'dropped'} in last 24h. `;
    
    if (recentPerformance > 15) {
      reasoning += 'Strong recent performance. ';
    } else if (recentPerformance > 10) {
      reasoning += 'Good recent performance. ';
    } else if (recentPerformance < 5) {
      reasoning += 'Poor recent performance. ';
    }

    if (injuryStatus && injuryStatus !== 'Healthy') {
      reasoning += `Injury concern: ${injuryStatus}. `;
    }

    if (player.position === 'RB' && recentPerformance > 12) {
      reasoning += 'RB with scoring upside. ';
    }

    return reasoning.trim();
  }

  /**
   * Calculate recent performance average
   */
  private calculateRecentPerformance(stats: any[]): number {
    if (!stats.length) return 0;
    
    const recentStats = stats.slice(0, 3); // Last 3 games
    const totalPoints = recentStats.reduce((sum, stat) => sum + (stat.fantasyPoints || 0), 0);
    
    return totalPoints / recentStats.length;
  }

  /**
   * Get position value multiplier
   */
  private getPositionValue(position: string): number {
    const values = {
      'QB': 1.2,
      'RB': 1.5,
      'WR': 1.3,
      'TE': 1.1,
      'K': 0.8,
      'DST': 0.9
    };
    
    return values[position as keyof typeof values] || 1.0;
  }

  /**
   * Get personalized trending recommendations for a team
   */
  async getPersonalizedTrends(teamId: string): Promise<TrendingPlayerData[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        roster: {
          include: { player: true }
        }
      }
    });

    if (!team) return [];

    const allTrending = await this.getTrendingPlayers('add', 24);
    const teamPlayerIds = team.roster.map(r => r.player.id);

    // Filter out players already on team and prioritize by team needs
    return allTrending
      .filter(trend => !teamPlayerIds.includes(trend.playerId))
      .slice(0, 10); // Top 10 recommendations
  }
}
```

### Success Metrics for Phase 4
- ✅ Live scoring updates within 30 seconds during games
- ✅ WebSocket connections maintain stable real-time communication
- ✅ Trending player data refreshes every 10 minutes
- ✅ Notification system delivers alerts for roster moves
- ✅ Performance maintains <500ms response times under load

---

## PHASE 5: Testing & Validation (Days 10-11)

### Objectives
- Create comprehensive test suites for all Sleeper integrations
- Validate data accuracy against known values
- Perform load testing for game-day traffic
- Ensure migration completeness and data integrity

### Implementation Tasks

#### 5.1 Comprehensive Test Suite

**File**: `__tests__/services/sleeper/sleeperIntegration.test.ts`

```typescript
/**
 * Comprehensive Sleeper API Integration Tests
 */

import { SleeperApiService } from '@/services/sleeper/sleeperApiService';
import { PlayerSyncService } from '@/services/sleeper/playerSyncService';
import { LiveScoreManager } from '@/services/sleeper/liveScoreManager';
import { TrendingService } from '@/services/sleeper/trendingService';

describe('Sleeper API Integration', () => {
  let sleeperApi: SleeperApiService;
  let playerSync: PlayerSyncService;
  let liveScore: LiveScoreManager;
  let trending: TrendingService;

  beforeAll(() => {
    sleeperApi = new SleeperApiService();
    playerSync = new PlayerSyncService();
    liveScore = new LiveScoreManager();
    trending = new TrendingService();
  });

  describe('API Connectivity', () => {
    it('should fetch NFL state successfully', async () => {
      const state = await sleeperApi.getNFLState();
      
      expect(state).toHaveProperty('week');
      expect(state).toHaveProperty('season');
      expect(state.week).toBeGreaterThan(0);
      expect(state.week).toBeLessThanOrEqual(18);
    }, 30000);

    it('should handle rate limiting gracefully', async () => {
      const promises = Array(10).fill(null).map(() => sleeperApi.getNFLState());
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('week');
      });
    }, 60000);

    it('should retry failed requests', async () => {
      // Test retry mechanism with network simulation
      const mockError = new Error('Network error');
      jest.spyOn(sleeperApi['client'], 'get').mockRejectedValueOnce(mockError);
      
      const state = await sleeperApi.getNFLState();
      expect(state).toHaveProperty('week');
    });
  });

  describe('Player Data Sync', () => {
    it('should sync players from Sleeper API', async () => {
      await playerSync.syncAllPlayers();
      
      const playerCount = await prisma.player.count({
        where: {
          nflId: {
            startsWith: 'sleeper_'
          }
        }
      });
      
      expect(playerCount).toBeGreaterThan(1500);
    }, 300000); // 5 minute timeout for full sync

    it('should calculate fantasy points correctly', async () => {
      const testStats = {
        pass_yd: 300,
        pass_td: 2,
        pass_int: 1,
        rush_yd: 50,
        rush_td: 1,
        rec: 5,
        rec_yd: 80,
        rec_td: 1
      };

      const points = await playerSync['calculateFantasyPoints'](testStats);
      
      // Expected: 300*0.04 + 2*4 + 1*-2 + 50*0.1 + 1*6 + 5*1 + 80*0.1 + 1*6 = 41
      expect(points).toBeCloseTo(41, 1);
    });

    it('should handle player updates correctly', async () => {
      const initialCount = await prisma.player.count();
      
      // Run sync twice
      await playerSync.syncAllPlayers();
      await playerSync.syncAllPlayers();
      
      const finalCount = await prisma.player.count();
      
      // Should not create duplicates
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Live Scoring', () => {
    it('should detect score changes', async () => {
      const updates: any[] = [];
      
      liveScore.on('scoreUpdates', (scoreUpdates) => {
        updates.push(...scoreUpdates);
      });

      await liveScore.startLiveScoring();
      
      // Wait for potential updates
      await new Promise(resolve => setTimeout(resolve, 35000));
      
      liveScore.stopLiveScoring();
      
      // Should have attempted to check for updates
      expect(liveScore['lastUpdateTime']).toBeGreaterThan(0);
    }, 40000);

    it('should calculate team scores correctly', async () => {
      const scores = await liveScore.getTeamLiveScores(['test-team-id']);
      
      expect(scores).toHaveProperty('test-team-id');
      expect(typeof scores['test-team-id']).toBe('number');
    });
  });

  describe('Trending Players', () => {
    it('should fetch trending add players', async () => {
      const trending = await trending.getTrendingPlayers('add', 24);
      
      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeGreaterThan(0);
      
      trending.forEach(player => {
        expect(player).toHaveProperty('playerName');
        expect(player).toHaveProperty('trendType', 'add');
        expect(player).toHaveProperty('recommendation');
      });
    }, 30000);

    it('should generate meaningful recommendations', async () => {
      const trending = await trending.getTrendingPlayers('add', 24);
      
      const strongAdds = trending.filter(p => p.recommendation === 'strong_add');
      
      if (strongAdds.length > 0) {
        expect(strongAdds[0].trendCount).toBeGreaterThan(100);
        expect(strongAdds[0].reasoning).toContain('managers added');
      }
    });
  });
});
```

#### 5.2 Data Validation Tests

**File**: `__tests__/services/sleeper/dataValidation.test.ts`

```typescript
/**
 * Data Validation and Accuracy Tests
 */

describe('Data Validation', () => {
  describe('Player Data Accuracy', () => {
    it('should match known player information', async () => {
      // Test with known players
      const players = await sleeperApi.getAllPlayers();
      
      // Josh Allen should exist and have correct info
      const joshAllen = Object.values(players).find(p => 
        p.full_name?.includes('Josh Allen') && p.position === 'QB'
      );
      
      expect(joshAllen).toBeDefined();
      expect(joshAllen?.position).toBe('QB');
      expect(joshAllen?.team).toBe('BUF');
    });

    it('should have consistent position mappings', async () => {
      const players = await sleeperApi.getAllPlayers();
      const positions = new Set(Object.values(players).map(p => p.position).filter(Boolean));
      
      // Should only contain valid NFL positions
      const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB', 'CB', 'S'];
      
      positions.forEach(position => {
        expect(validPositions).toContain(position);
      });
    });
  });

  describe('Scoring Accuracy', () => {
    it('should calculate PPR scores correctly', async () => {
      const testCases = [
        {
          stats: { pass_yd: 250, pass_td: 2, rec: 8, rec_yd: 100, rec_td: 1 },
          expected: 10 + 8 + 8 + 10 + 6 // 42 points
        },
        {
          stats: { rush_yd: 120, rush_td: 2, fum_lost: 1 },
          expected: 12 + 12 - 2 // 22 points
        }
      ];

      for (const testCase of testCases) {
        const points = await scoringService.calculateFantasyPoints(
          testCase.stats,
          'damato-dynasty-2024'
        );
        
        expect(points).toBeCloseTo(testCase.expected, 1);
      }
    });
  });

  describe('League Sync Validation', () => {
    it('should preserve team relationships', async () => {
      const teams = await prisma.team.findMany({
        include: {
          owner: true,
          roster: {
            include: { player: true }
          }
        }
      });

      teams.forEach(team => {
        expect(team.owner).toBeDefined();
        expect(team.roster.length).toBeGreaterThan(0);
        
        team.roster.forEach(rosterPlayer => {
          expect(rosterPlayer.player).toBeDefined();
          expect(rosterPlayer.player.nflId).toMatch(/^sleeper_/);
        });
      });
    });
  });
});
```

#### 5.3 Performance Testing

**File**: `__tests__/performance/sleeperLoad.test.ts`

```typescript
/**
 * Performance and Load Testing
 */

describe('Performance Tests', () => {
  describe('API Response Times', () => {
    it('should fetch player data within acceptable time', async () => {
      const startTime = Date.now();
      
      await sleeperApi.getAllPlayers();
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // 5 second max
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(20).fill(null).map(() => sleeperApi.getNFLState());
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Database Performance', () => {
    it('should sync large player datasets efficiently', async () => {
      const startTime = Date.now();
      
      await playerSync.syncAllPlayers();
      
      const endTime = Date.now();
      const syncTime = endTime - startTime;
      
      expect(syncTime).toBeLessThan(180000); // 3 minute max for full sync
    });

    it('should calculate team scores quickly', async () => {
      const teamIds = Array(10).fill(null).map((_, i) => `team-${i}`);
      
      const startTime = Date.now();
      
      await liveScore.getTeamLiveScores(teamIds);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(1000); // 1 second max
    });
  });
});
```

### Migration Verification Checklist

#### Data Integrity Checks
- [ ] All players from Sleeper API successfully imported
- [ ] Player positions correctly mapped to our schema
- [ ] Team rosters match Sleeper league configuration
- [ ] Historical scores maintained during migration
- [ ] League settings accurately reflect Sleeper configuration

#### Functional Verification
- [ ] Live scoring updates work during games
- [ ] Trending players refresh correctly
- [ ] WebSocket connections remain stable
- [ ] API rate limiting prevents abuse
- [ ] Error handling gracefully manages failures

#### Performance Validation
- [ ] Page load times remain under 2 seconds
- [ ] API responses complete within 5 seconds
- [ ] Database queries execute under 500ms
- [ ] Concurrent user handling scales appropriately
- [ ] Memory usage stays within acceptable limits

### Rollback Procedures

#### Emergency Rollback Plan
1. **Immediate Actions**
   - Switch environment variable to disable Sleeper integration
   - Revert to SportsData.io or mock data temporarily
   - Notify users of temporary service degradation

2. **Database Rollback**
   ```sql
   -- Backup current state
   CREATE TABLE players_backup AS SELECT * FROM players;
   
   -- Restore from pre-migration backup
   DELETE FROM players WHERE nfl_id LIKE 'sleeper_%';
   INSERT INTO players SELECT * FROM players_pre_migration_backup;
   ```

3. **Service Restoration**
   - Restart application services
   - Verify core functionality
   - Monitor error rates and performance
   - Gradually re-enable features

#### Partial Rollback Options
- **Player Data Only**: Revert player sync while keeping league structure
- **Live Scoring Only**: Disable real-time updates while keeping static data
- **API Integration Only**: Switch back to previous data sources

---

## Implementation Timeline

### Week 1: Foundation (Days 1-2)
**Day 1:**
- Set up Sleeper API service architecture
- Create type definitions and schemas
- Implement basic error handling and retry logic
- **Deliverable**: Working Sleeper API connection with type safety

**Day 2:**
- Build caching layer with Redis integration
- Implement rate limiting and request management
- Create comprehensive error handling system
- **Deliverable**: Production-ready API service foundation

### Week 1: Core Integration (Days 3-4)
**Day 3:**
- Replace mock data with Sleeper player database
- Implement NFL state management
- Build player ID mapping system
- **Deliverable**: Complete player data migration

**Day 4:**
- Create player synchronization service
- Implement fantasy scoring calculations
- Build stats tracking and historical data
- **Deliverable**: Accurate player stats and scoring

### Week 2: League Sync (Days 5-7)
**Day 5:**
- Import D'Amato Dynasty League configuration
- Sync team rosters and ownership data
- Map scoring systems and league rules
- **Deliverable**: League data successfully imported

**Day 6:**
- Implement matchup tracking
- Build standings calculations
- Create roster management integration
- **Deliverable**: Complete league functionality

**Day 7:**
- Validate all league data accuracy
- Test scoring calculations
- Verify roster and transaction history
- **Deliverable**: Fully functional league integration

### Week 2: Real-Time Features (Days 8-9)
**Day 8:**
- Implement live scoring manager
- Create WebSocket abstraction layer
- Build notification system
- **Deliverable**: Real-time score updates

**Day 9:**
- Add trending player tracking
- Implement smart polling optimization
- Create personalized recommendations
- **Deliverable**: Complete real-time feature set

### Week 2: Testing & Launch (Days 10-11)
**Day 10:**
- Execute comprehensive test suite
- Perform load testing and optimization
- Validate data accuracy against known values
- **Deliverable**: Tested and validated system

**Day 11:**
- Final migration verification
- User acceptance testing
- Performance monitoring setup
- **Deliverable**: Production-ready Sleeper integration

---

## Success Metrics & KPIs

### Technical Metrics
- **API Response Time**: <2 seconds average
- **Database Query Performance**: <500ms for complex queries
- **Uptime**: 99.9% availability during NFL season
- **Data Accuracy**: 99.5% accuracy vs. official NFL stats
- **Real-time Latency**: <30 seconds for live score updates

### User Experience Metrics
- **Page Load Speed**: <3 seconds for dashboard
- **Feature Adoption**: 80% of users utilize new Sleeper features
- **Error Rate**: <0.1% user-facing errors
- **User Satisfaction**: >4.5/5 rating for new features

### Business Metrics
- **Cost Reduction**: 100% elimination of SportsData.io fees
- **Data Completeness**: 95% of NFL players with complete profiles
- **Feature Parity**: 100% of existing features maintained
- **Scalability**: Support for 10x user growth without performance degradation

---

## Risk Mitigation

### Technical Risks
1. **Sleeper API Rate Limiting**
   - *Mitigation*: Implement intelligent caching and request batching
   - *Fallback*: Secondary data sources for critical functions

2. **Data Format Changes**
   - *Mitigation*: Robust type validation and schema versioning
   - *Fallback*: Graceful degradation with cached data

3. **Service Outages**
   - *Mitigation*: Circuit breaker pattern and health monitoring
   - *Fallback*: Automatic failover to backup data sources

### Business Risks
1. **User Disruption During Migration**
   - *Mitigation*: Phased rollout with feature flags
   - *Fallback*: Instant rollback capabilities

2. **Data Loss or Corruption**
   - *Mitigation*: Comprehensive backups before each migration step
   - *Fallback*: Point-in-time recovery procedures

---

## Conclusion

This comprehensive migration plan provides a structured approach to transitioning the D'Amato Dynasty League from mock data and paid APIs to the free, feature-rich Sleeper API. The phased implementation ensures minimal disruption while maximizing the benefits of real-time data, enhanced features, and cost savings.

The plan prioritizes data integrity, performance, and user experience while providing robust testing and rollback procedures. Upon completion, the platform will offer superior functionality with real-time scoring, trending player insights, and comprehensive league management—all powered by Sleeper's reliable and free API infrastructure.

**Key Benefits Achieved:**
- 100% cost reduction from eliminating SportsData.io fees
- Real-time score updates and live game tracking  
- Access to trending player data and recommendations
- Complete NFL player database with injury tracking
- Scalable architecture supporting future growth
- Enhanced user experience with faster, more accurate data

The migration positions the D'Amato Dynasty League platform as a cutting-edge fantasy football experience, leveraging the best available data sources while maintaining the reliability and performance standards users expect.