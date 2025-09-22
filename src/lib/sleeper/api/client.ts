// import { Redis } from '@vercel/kv';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface RateLimiterOptions {
  tokensPerInterval: number;
  interval: 'second' | 'minute' | 'hour';
  fireImmediately?: boolean;
}

class RateLimiter {
  private tokens: number;
  private capacity: number;
  private fillRate: number;
  private lastRefill: number;

  constructor(options: RateLimiterOptions) {
    this.capacity = options.tokensPerInterval;
    this.tokens = this.capacity;
    this.fillRate = this.calculateFillRate(options.interval, options.tokensPerInterval);
    this.lastRefill = Date.now();
  }

  private calculateFillRate(interval: string, tokens: number): number {
    const intervals = {
      second: 1000,
      minute: 60000,
      hour: 3600000
    };
    return tokens / intervals[interval];
  }

  async removeTokens(count: number): Promise<void> {
    await this.refill();
    
    if (this.tokens < count) {
      const waitTime = Math.ceil((count - this.tokens) / this.fillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      await this.removeTokens(count);
    } else {
      this.tokens -= count;
    }
  }

  private async refill(): Promise<void> {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.fillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

class PQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private concurrency: number;

  constructor(options: { concurrency: number }) {
    this.concurrency = options.concurrency;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const fn = this.queue.shift()!;
    
    try {
      await fn();
    } finally {
      this.running--;
      this.process();
    }
  }
}

export class SleeperAPIError extends Error {
  public status: number;
  public code?: string;

  constructor(response: Response, message?: string) {
    super(message || `Sleeper API error: ${response.status} ${response.statusText}`);
    this.name = 'SleeperAPIError';
    this.status = response.status;
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function retryWrapper<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error instanceof SleeperAPIError && error.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWrapper(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export class SleeperAPIClient {
  private baseURL = 'https://api.sleeper.app/v1';
  private queue: PQueue;
  private rateLimiter: RateLimiter;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    this.queue = new PQueue({ concurrency: 10 });
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 1000,
      interval: 'minute',
      fireImmediately: true
    });
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.queue.add(async () => {
      await this.rateLimiter.removeTokens(1);
      
      const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      return retryWrapper(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

        try {
          const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: options.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': generateRequestId(),
              'User-Agent': 'AstralField-Fantasy-Platform/1.0',
              ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
            next: { 
              revalidate: this.getCacheDuration(endpoint),
              tags: this.getCacheTags(endpoint)
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new SleeperAPIError(response);
          }

          const data = await response.json();
          this.setCache(cacheKey, data, this.getCacheDuration(endpoint));
          
          return data;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000
    });
  }

  private getCacheDuration(endpoint: string): number {
    if (endpoint.includes('/players/')) return 3600; // 1 hour
    if (endpoint.includes('/stats/')) return 300; // 5 minutes
    if (endpoint.includes('/projections/')) return 1800; // 30 minutes
    if (endpoint.includes('/trending/')) return 600; // 10 minutes
    if (endpoint.includes('/league/') && endpoint.includes('/rosters')) return 900; // 15 minutes
    if (endpoint.includes('/league/') && endpoint.includes('/matchups')) return 60; // 1 minute
    if (endpoint.includes('/user/')) return 1800; // 30 minutes
    return 300; // 5 minutes default
  }

  private getCacheTags(endpoint: string): string[] {
    const tags = ['sleeper'];
    
    if (endpoint.includes('/players/')) tags.push('players');
    if (endpoint.includes('/stats/')) tags.push('stats');
    if (endpoint.includes('/projections/')) tags.push('projections');
    if (endpoint.includes('/league/')) {
      tags.push('league');
      const leagueId = endpoint.match(/\/league\/([^\/]+)/)?.[1];
      if (leagueId) tags.push(`league-${leagueId}`);
    }
    if (endpoint.includes('/user/')) tags.push('user');
    if (endpoint.includes('/draft/')) tags.push('draft');
    
    return tags;
  }

  // Convenience methods for common endpoints
  async getUser(username: string): Promise<any> {
    return this.request(`/user/${username}`);
  }

  async getUserLeagues(username: string, sport = 'nfl', season = '2024'): Promise<any[]> {
    return this.request(`/user/${username}/leagues/${sport}/${season}`);
  }

  async getLeague(leagueId: string): Promise<any> {
    return this.request(`/league/${leagueId}`);
  }

  async getLeagueRosters(leagueId: string): Promise<any[]> {
    return this.request(`/league/${leagueId}/rosters`);
  }

  async getLeagueUsers(leagueId: string): Promise<any[]> {
    return this.request(`/league/${leagueId}/users`);
  }

  async getLeagueMatchups(leagueId: string, week: number): Promise<any[]> {
    return this.request(`/league/${leagueId}/matchups/${week}`);
  }

  async getLeagueTransactions(leagueId: string, round?: number): Promise<any[]> {
    const endpoint = round 
      ? `/league/${leagueId}/transactions/${round}`
      : `/league/${leagueId}/transactions`;
    return this.request(endpoint);
  }

  async getLeagueTradedPicks(leagueId: string): Promise<any[]> {
    return this.request(`/league/${leagueId}/traded_picks`);
  }

  async getLeagueWinnersBracket(leagueId: string): Promise<any[]> {
    return this.request(`/league/${leagueId}/winners_bracket`);
  }

  async getLeagueLosersBracket(leagueId: string): Promise<any[]> {
    return this.request(`/league/${leagueId}/losers_bracket`);
  }

  async getDraft(draftId: string): Promise<any> {
    return this.request(`/draft/${draftId}`);
  }

  async getDraftPicks(draftId: string): Promise<any[]> {
    return this.request(`/draft/${draftId}/picks`);
  }

  async getDraftTradedPicks(draftId: string): Promise<any[]> {
    return this.request(`/draft/${draftId}/traded_picks`);
  }

  async getPlayers(sport = 'nfl'): Promise<Record<string, any>> {
    return this.request(`/players/${sport}`);
  }

  async getTrendingPlayers(sport = 'nfl', type = 'add', hours = 24): Promise<any> {
    return this.request(`/players/${sport}/trending/${type}?lookback_hours=${hours}`);
  }

  async getStats(sport = 'nfl', season = '2024', week?: number): Promise<Record<string, any>> {
    const endpoint = week 
      ? `/stats/${sport}/regular/${season}/${week}`
      : `/stats/${sport}/regular/${season}`;
    return this.request(endpoint);
  }

  async getProjections(sport = 'nfl', season = '2024', week?: number): Promise<Record<string, any>> {
    const endpoint = week 
      ? `/projections/${sport}/regular/${season}/${week}`
      : `/projections/${sport}/regular/${season}`;
    return this.request(endpoint);
  }

  async getNFLState(): Promise<any> {
    return this.request('/state/nfl');
  }

  // Player stats and projections
  async getPlayerStats(playerId: string, season = '2024', week?: number): Promise<any> {
    const endpoint = week 
      ? `/stats/nfl/player/${playerId}/${season}/${week}`
      : `/stats/nfl/player/${playerId}/${season}`;
    return this.request(endpoint);
  }

  async getPlayerProjections(playerId: string, season = '2024', week?: number): Promise<any> {
    const endpoint = week 
      ? `/projections/nfl/player/${playerId}/${season}/${week}`
      : `/projections/nfl/player/${playerId}/${season}`;
    return this.request(endpoint);
  }

  // Draft-related methods (duplicate removed)

  async getDraftTradingBlock(draftId: string): Promise<any[]> {
    return this.request(`/draft/${draftId}/traded_picks`);
  }

  // Batch operations for better performance
  async batchRequest<T>(requests: Array<{ endpoint: string; options?: RequestOptions }>): Promise<T[]> {
    const promises = requests.map(({ endpoint, options }) => 
      this.request<T>(endpoint, options)
    );
    return Promise.all(promises);
  }

  // Clear cache for specific tags
  clearCache(tags?: string[]): void {
    if (!tags) {
      this.cache.clear();
      return;
    }

    for (const [key] of this.cache) {
      const keyTags = this.getCacheTags(key);
      if (tags.some(tag => keyTags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/state/nfl');
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const sleeperClient = new SleeperAPIClient();