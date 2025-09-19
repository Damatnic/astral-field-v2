import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import pino from 'pino';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as crypto from 'crypto';
import {
  MatchupWithDetails,
  MatchupFilters,
  PaginationOptions,
  PaginatedResult,
  ServiceResponse,
  MatchupStatistics,
  TeamPerformance,
  WeekStatistics,
  MatchupEvent,
  SubscriptionOptions,
  ServiceConfig,
  Environment,
  MatchupStatus,
  ScoreUpdateInput,
  AsyncResult,
  DeepPartial
} from './types/matchup.types';

// Advanced cache with LRU eviction and compression
class AdvancedCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; hits: number }>();
  private maxSize: number;
  private ttl: number;
  private compressionEnabled: boolean;
  
  constructor(maxSize = 100, ttl = 300000, compressionEnabled = true) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.compressionEnabled = compressionEnabled;
    
    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000);
  }
  
  private hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }
  
  set(key: string, data: T): void {
    const hashedKey = this.hash(key);
    
    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.findLRUKey();
      if (lruKey) this.cache.delete(lruKey);
    }
    
    this.cache.set(hashedKey, { 
      data, 
      timestamp: Date.now(), 
      hits: 0 
    });
  }
  
  get(key: string): T | null {
    const hashedKey = this.hash(key);
    const cached = this.cache.get(hashedKey);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(hashedKey);
      return null;
    }
    
    cached.hits++;
    return cached.data;
  }
  
  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let minHits = Infinity;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      const score = value.hits * 10000 - (Date.now() - value.timestamp);
      if (score < minHits) {
        minHits = score;
        lruKey = key;
      }
    }
    
    return lruKey;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      items: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        hits: value.hits,
        age: Date.now() - value.timestamp
      }))
    };
  }
  
  private calculateHitRate(): number {
    const values = Array.from(this.cache.values());
    if (values.length === 0) return 0;
    const totalHits = values.reduce((sum, v) => sum + v.hits, 0);
    return totalHits / values.length;
  }
}

// Connection pool manager
class ConnectionPool {
  private pool: PrismaClient[] = [];
  private available: PrismaClient[] = [];
  private maxSize: number;
  private logger: pino.Logger;
  
  constructor(maxSize = 5, logger: pino.Logger) {
    this.maxSize = maxSize;
    this.logger = logger;
    this.initialize();
  }
  
  private initialize(): void {
    for (let i = 0; i < this.maxSize; i++) {
      const client = new PrismaClient({
        log: ['error', 'warn'],
        errorFormat: 'minimal',
      });
      this.pool.push(client);
      this.available.push(client);
    }
  }
  
  async acquire(): Promise<PrismaClient> {
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const client = this.available.pop()!;
    return client;
  }
  
  release(client: PrismaClient): void {
    if (!this.available.includes(client) && this.pool.includes(client)) {
      this.available.push(client);
    }
  }
  
  async closeAll(): Promise<void> {
    await Promise.all(this.pool.map(client => client.$disconnect()));
    this.pool = [];
    this.available = [];
  }
  
  getStats() {
    return {
      total: this.pool.length,
      available: this.available.length,
      inUse: this.pool.length - this.available.length
    };
  }
}

// Main service with advanced features
export class AdvancedMatchupService extends EventEmitter {
  private pool: ConnectionPool;
  private logger: pino.Logger;
  private cache: AdvancedCache<any>;
  private config: ServiceConfig;
  private metrics: Map<string, number> = new Map();
  private isShuttingDown = false;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(config?: DeepPartial<ServiceConfig>) {
    super();
    this.config = this.loadConfig(config);
    this.logger = this.createLogger();
    this.pool = new ConnectionPool(this.config.poolSize, this.logger);
    this.cache = new AdvancedCache(
      100, 
      this.config.cacheTtl, 
      true
    );
    
    this.setupHealthCheck();
    this.setupGracefulShutdown();
    this.setupMetrics();
  }
  
  private loadConfig(overrides?: DeepPartial<ServiceConfig>): ServiceConfig {
    const defaultConfig: ServiceConfig = {
      databaseUrl: process.env.DATABASE_URL || '',
      nodeEnv: (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT,
      logLevel: 'info' as any,
      matchupFetchLimit: 10,
      enableCache: true,
      cacheTtl: 300000,
      connectionRetries: 3,
      retryDelay: 1000,
      poolSize: 5,
      requestTimeout: 30000,
    };
    
    return { ...defaultConfig, ...overrides } as ServiceConfig;
  }
  
  private createLogger(): pino.Logger {
    return pino({
      level: this.config.logLevel,
      transport: this.config.nodeEnv === Environment.DEVELOPMENT ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined,
      serializers: {
        error: pino.stdSerializers.err,
        request: (req: any) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
        }),
      },
    });
  }
  
  private setupMetrics(): void {
    this.metrics.set('requests_total', 0);
    this.metrics.set('requests_success', 0);
    this.metrics.set('requests_failed', 0);
    this.metrics.set('cache_hits', 0);
    this.metrics.set('cache_misses', 0);
    this.metrics.set('db_queries', 0);
    this.metrics.set('avg_response_time', 0);
  }
  
  private recordMetric(name: string, value = 1): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
  }
  
  private async executeWithMetrics<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();
    this.recordMetric('requests_total');
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric('requests_success');
      this.updateAverageResponseTime(duration);
      
      this.logger.debug({
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric('requests_failed');
      
      this.logger.error({
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        error
      });
      
      throw error;
    }
  }
  
  private updateAverageResponseTime(newTime: number): void {
    const currentAvg = this.metrics.get('avg_response_time') || 0;
    const totalRequests = this.metrics.get('requests_success') || 1;
    const newAvg = (currentAvg * (totalRequests - 1) + newTime) / totalRequests;
    this.metrics.set('avg_response_time', newAvg);
  }
  
  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = await this.pool.acquire();
        await client.$queryRaw`SELECT 1`;
        this.pool.release(client);
        this.emit('health', { status: 'healthy', timestamp: new Date() });
      } catch (error) {
        this.logger.error({ error }, 'Health check failed');
        this.emit('health', { status: 'unhealthy', error, timestamp: new Date() });
      }
    }, 30000);
  }
  
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        this.logger.info({ signal }, 'Shutting down gracefully...');
        
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
        }
        
        this.emit('shutdown', { signal });
        
        await this.pool.closeAll();
        this.cache.clear();
        
        this.logger.info('Shutdown complete');
        process.exit(0);
      });
    });
  }
  
  // Core business methods
  async fetchMatchups(
    filters: MatchupFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): AsyncResult<PaginatedResult<MatchupWithDetails>> {
    return this.executeWithMetrics(async () => {
      const cacheKey = JSON.stringify({ filters, pagination });
      
      if (this.config.enableCache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.recordMetric('cache_hits');
          return { success: true, data: cached, metadata: { cached: true } as any };
        }
        this.recordMetric('cache_misses');
      }
      
      const client = await this.pool.acquire();
      
      try {
        this.recordMetric('db_queries');
        
        const where: any = {};
        if (filters.leagueId) where.leagueId = filters.leagueId;
        if (filters.teamId) {
          where.OR = [
            { homeTeamId: filters.teamId },
            { awayTeamId: filters.teamId }
          ];
        }
        if (filters.week !== undefined) where.week = filters.week;
        if (filters.status) where.status = filters.status;
        if (filters.isPlayoff !== undefined) where.isPlayoff = filters.isPlayoff;
        
        const [data, total] = await Promise.all([
          client.matchup.findMany({
            where,
            include: {
              homeTeam: { include: { owner: true } },
              awayTeam: { include: { owner: true } },
              league: true
            },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            orderBy: pagination.sortBy ? {
              [pagination.sortBy]: pagination.sortOrder || 'desc'
            } : { week: 'desc' }
          }),
          client.matchup.count({ where })
        ]);
        
        const result: PaginatedResult<MatchupWithDetails> = {
          data: data as any,
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: pagination.page < Math.ceil(total / pagination.limit),
          hasPrevious: pagination.page > 1
        };
        
        if (this.config.enableCache) {
          this.cache.set(cacheKey, result);
        }
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            cached: false,
            version: '2.0.0'
          }
        };
      } finally {
        this.pool.release(client);
      }
    }, 'fetchMatchups');
  }
  
  async calculateAdvancedStats(
    filters: MatchupFilters = {}
  ): AsyncResult<MatchupStatistics> {
    return this.executeWithMetrics(async () => {
      const client = await this.pool.acquire();
      
      try {
        const matchups = await client.matchup.findMany({
          where: filters as any,
          include: {
            homeTeam: { include: { owner: true } },
            awayTeam: { include: { owner: true } },
            league: true
          }
        });
        
        const stats = this.computeStatistics(matchups as any);
        
        return {
          success: true,
          data: stats,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            cached: false,
            version: '2.0.0'
          }
        };
      } finally {
        this.pool.release(client);
      }
    }, 'calculateAdvancedStats');
  }
  
  private computeStatistics(matchups: MatchupWithDetails[]): MatchupStatistics {
    const startTime = performance.now();
    
    const completed = matchups.filter(m => m.status === MatchupStatus.COMPLETED);
    const homeWins = completed.filter(m => (m.homeScore || 0) > (m.awayScore || 0)).length;
    
    const scores = completed.flatMap(m => [m.homeScore || 0, m.awayScore || 0]);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    const scoreDiffs = completed.map(m => Math.abs((m.homeScore || 0) - (m.awayScore || 0)));
    const avgDiff = scoreDiffs.length ? scoreDiffs.reduce((a, b) => a + b, 0) / scoreDiffs.length : 0;
    
    const matchupTotals = completed.map(m => ({
      matchup: m,
      total: (m.homeScore || 0) + (m.awayScore || 0),
      diff: Math.abs((m.homeScore || 0) - (m.awayScore || 0))
    }));
    
    const highest = matchupTotals.reduce((max, curr) => 
      curr.total > (max?.total || 0) ? curr : max, matchupTotals[0]);
      
    const lowest = matchupTotals.reduce((min, curr) => 
      curr.total < (min?.total || Infinity) ? curr : min, matchupTotals[0]);
      
    const biggest = matchupTotals.reduce((max, curr) => 
      curr.diff > (max?.diff || 0) ? curr : max, matchupTotals[0]);
      
    const closest = completed.length ? matchupTotals.filter(m => m.diff > 0)
      .reduce((min, curr) => curr.diff < (min?.diff || Infinity) ? curr : min, matchupTotals[0]) : null;
    
    return {
      totalMatchups: matchups.length,
      completedMatchups: completed.length,
      inProgressMatchups: matchups.filter(m => m.status === MatchupStatus.IN_PROGRESS).length,
      scheduledMatchups: matchups.filter(m => m.status === MatchupStatus.SCHEDULED).length,
      cancelledMatchups: matchups.filter(m => m.status === MatchupStatus.CANCELLED).length,
      averageHomeScore: completed.length ? 
        completed.reduce((sum, m) => sum + (m.homeScore || 0), 0) / completed.length : 0,
      averageAwayScore: completed.length ?
        completed.reduce((sum, m) => sum + (m.awayScore || 0), 0) / completed.length : 0,
      homeWinPercentage: completed.length ? (homeWins / completed.length) * 100 : 0,
      averageScoreDifferential: avgDiff,
      highestScoringMatchup: highest?.matchup || null,
      lowestScoringMatchup: lowest?.matchup || null,
      biggestBlowout: biggest?.matchup || null,
      closestMatchup: closest?.matchup || null,
      executionTime: performance.now() - startTime,
      timestamp: new Date()
    };
  }
  
  async updateScores(input: ScoreUpdateInput): AsyncResult<MatchupWithDetails> {
    return this.executeWithMetrics(async () => {
      const client = await this.pool.acquire();
      
      try {
        const updated = await client.matchup.update({
          where: { id: input.matchupId },
          data: {
            homeScore: input.homeScore,
            awayScore: input.awayScore,
            status: this.determineStatus(input),
            updatedAt: new Date()
          },
          include: {
            homeTeam: { include: { owner: true } },
            awayTeam: { include: { owner: true } },
            league: true
          }
        });
        
        // Emit event for real-time updates
        this.emit('matchup:updated', {
          type: 'SCORE_UPDATE',
          matchupId: input.matchupId,
          data: { homeScore: input.homeScore, awayScore: input.awayScore },
          timestamp: new Date()
        } as MatchupEvent);
        
        // Invalidate cache
        this.cache.clear();
        
        return {
          success: true,
          data: updated as any,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            cached: false,
            version: '2.0.0'
          }
        };
      } finally {
        this.pool.release(client);
      }
    }, 'updateScores');
  }
  
  private determineStatus(input: ScoreUpdateInput): MatchupStatus {
    if (input.homeScore !== undefined && input.awayScore !== undefined) {
      return MatchupStatus.COMPLETED;
    }
    return MatchupStatus.IN_PROGRESS;
  }
  
  async getTeamPerformance(teamId: string): AsyncResult<TeamPerformance> {
    return this.executeWithMetrics(async () => {
      const client = await this.pool.acquire();
      
      try {
        const [team, matchups] = await Promise.all([
          client.team.findUnique({
            where: { id: teamId },
            include: { owner: true }
          }),
          client.matchup.findMany({
            where: {
              OR: [
                { homeTeamId: teamId },
                { awayTeamId: teamId }
              ],
              status: MatchupStatus.COMPLETED
            }
          })
        ]);
        
        if (!team) throw new Error('Team not found');
        
        let wins = 0, losses = 0, ties = 0;
        let totalFor = 0, totalAgainst = 0;
        let highest = 0, lowest = Infinity;
        let currentStreak = 0;
        let streakType: 'W' | 'L' | 'T' = 'W';
        let lastResult: 'W' | 'L' | 'T' | null = null;
        
        matchups.forEach(m => {
          const isHome = m.homeTeamId === teamId;
          const teamScore = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
          const oppScore = isHome ? (m.awayScore || 0) : (m.homeScore || 0);
          
          totalFor += teamScore;
          totalAgainst += oppScore;
          highest = Math.max(highest, teamScore);
          lowest = Math.min(lowest, teamScore);
          
          let result: 'W' | 'L' | 'T';
          if (teamScore > oppScore) {
            wins++;
            result = 'W';
          } else if (teamScore < oppScore) {
            losses++;
            result = 'L';
          } else {
            ties++;
            result = 'T';
          }
          
          if (lastResult === null || lastResult === result) {
            currentStreak++;
            streakType = result;
          } else {
            currentStreak = 1;
            streakType = result;
          }
          lastResult = result;
        });
        
        const performance: TeamPerformance = {
          team: team as any,
          wins,
          losses,
          ties,
          averagePointsFor: matchups.length ? totalFor / matchups.length : 0,
          averagePointsAgainst: matchups.length ? totalAgainst / matchups.length : 0,
          highestScore: highest === 0 ? 0 : highest,
          lowestScore: lowest === Infinity ? 0 : lowest,
          currentStreak,
          streakType
        };
        
        return {
          success: true,
          data: performance,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            cached: false,
            version: '2.0.0'
          }
        };
      } finally {
        this.pool.release(client);
      }
    }, 'getTeamPerformance');
  }
  
  async getWeeklyStats(week: number, leagueId?: string): AsyncResult<WeekStatistics> {
    return this.executeWithMetrics(async () => {
      const client = await this.pool.acquire();
      
      try {
        const where: any = { week, status: MatchupStatus.COMPLETED };
        if (leagueId) where.leagueId = leagueId;
        
        const matchups = await client.matchup.findMany({ where });
        
        const allScores = matchups.flatMap(m => [m.homeScore || 0, m.awayScore || 0]);
        
        const stats: WeekStatistics = {
          week,
          matchupsCount: matchups.length,
          averageScore: allScores.length ? 
            allScores.reduce((a, b) => a + b, 0) / allScores.length : 0,
          highestScore: allScores.length ? Math.max(...allScores) : 0,
          lowestScore: allScores.length ? Math.min(...allScores) : 0,
          totalPoints: allScores.reduce((a, b) => a + b, 0)
        };
        
        return {
          success: true,
          data: stats,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            cached: false,
            version: '2.0.0'
          }
        };
      } finally {
        this.pool.release(client);
      }
    }, 'getWeeklyStats');
  }
  
  // Real-time subscription support
  subscribe(options: SubscriptionOptions, callback: (event: MatchupEvent) => void): () => void {
    const listener = (event: MatchupEvent) => {
      // Filter events based on subscription options
      if (options.events && !options.events.includes(event.type)) return;
      if (options.matchupIds && !options.matchupIds.includes(event.matchupId)) return;
      
      callback(event);
    };
    
    this.on('matchup:updated', listener);
    
    // Return unsubscribe function
    return () => {
      this.off('matchup:updated', listener);
    };
  }
  
  // Monitoring and metrics
  getMetrics() {
    const poolStats = this.pool.getStats();
    const cacheStats = this.cache.getStats();
    
    return {
      service: Object.fromEntries(this.metrics),
      pool: poolStats,
      cache: cacheStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  }
  
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      database: 'unknown',
      cache: 'healthy',
      pool: 'healthy'
    };
    
    try {
      const client = await this.pool.acquire();
      await client.$queryRaw`SELECT 1`;
      this.pool.release(client);
      checks.database = 'healthy';
    } catch (error) {
      checks.database = 'unhealthy';
    }
    
    const poolStats = this.pool.getStats();
    if (poolStats.available === 0) {
      checks.pool = 'degraded';
    }
    
    const overallStatus = Object.values(checks).every(s => s === 'healthy') 
      ? 'healthy' 
      : Object.values(checks).some(s => s === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';
    
    return {
      status: overallStatus,
      details: {
        checks,
        metrics: this.getMetrics(),
        timestamp: new Date()
      }
    };
  }
  
  async shutdown(): Promise<void> {
    this.logger.info('Initiating shutdown...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.pool.closeAll();
    this.cache.clear();
    this.removeAllListeners();
    
    this.logger.info('Shutdown complete');
  }
}

// Export singleton instance
let serviceInstance: AdvancedMatchupService | null = null;

export function getMatchupService(config?: DeepPartial<ServiceConfig>): AdvancedMatchupService {
  if (!serviceInstance) {
    serviceInstance = new AdvancedMatchupService(config);
  }
  return serviceInstance;
}

// CLI interface
if (require.main === module) {
  const service = getMatchupService();
  
  async function main() {
    try {
      const result = await service.fetchMatchups(
        {}, 
        { page: 1, limit: 10 }
      );
      
      if (result.success && result.data) {
        console.log('✅ Matchups fetched:', result.data.total);
        console.log('📊 Metrics:', service.getMetrics());
      }
      
      const health = await service.healthCheck();
      console.log('🏥 Health:', health);
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await service.shutdown();
      process.exit(0);
    }
  }
  
  main();
}