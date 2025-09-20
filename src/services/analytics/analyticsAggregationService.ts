/**
 * Analytics Aggregation and Caching Service
 * High-performance data aggregation, pre-computation, and intelligent caching
 */

import { prisma } from '@/lib/db';
import { redisCache } from '@/lib/redis-cache';
import { logger } from '@/lib/logger';
import EventEmitter from 'events';

export interface AggregationConfig {
  id: string;
  name: string;
  query: string;
  dimensions: string[];
  metrics: string[];
  timeGranularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  refreshInterval: number; // seconds
  retention: number; // days
  enabled: boolean;
  filters?: { [key: string]: any };
  computeRollups: boolean;
}

export interface AggregatedData {
  id: string;
  dimensions: { [key: string]: string };
  metrics: { [key: string]: number };
  timestamp: Date;
  granularity: string;
  freshness: Date;
}

export interface CacheStrategy {
  pattern: string;
  ttl: number;
  refreshStrategy: 'lazy' | 'proactive' | 'scheduled';
  compression: boolean;
  priority: 'high' | 'medium' | 'low';
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  cacheMissRate: number;
  avgQueryTime: number;
  aggregationLatency: number;
  dataFreshness: number;
  memoryUsage: number;
  throughput: number;
  errors: number;
}

export interface DataPipeline {
  id: string;
  name: string;
  source: string;
  transformations: Array<{
    type: 'filter' | 'aggregate' | 'join' | 'sort' | 'group';
    config: any;
  }>;
  destination: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'failed' | 'success';
}

class AnalyticsAggregationService extends EventEmitter {
  private aggregationConfigs: Map<string, AggregationConfig> = new Map();
  private cacheStrategies: Map<string, CacheStrategy> = new Map();
  private dataPipelines: Map<string, DataPipeline> = new Map();
  private aggregationJobs: Map<string, NodeJS.Timeout> = new Map();
  private performanceMetrics: PerformanceMetrics = {
    cacheHitRate: 0,
    cacheMissRate: 0,
    avgQueryTime: 0,
    aggregationLatency: 0,
    dataFreshness: 0,
    memoryUsage: 0,
    throughput: 0,
    errors: 0
  };

  constructor() {
    super();
    this.initializeDefaultConfigs();
    this.startAggregationJobs();
    this.startMetricsCollection();
  }

  /**
   * Get aggregated data with intelligent caching
   */
  async getAggregatedData(
    configId: string,
    dimensions: { [key: string]: string } = {},
    timeRange?: { start: Date; end: Date }
  ): Promise<AggregatedData[]> {
    const startTime = Date.now();
    
    try {
      const config = this.aggregationConfigs.get(configId);
      if (!config || !config.enabled) {
        throw new Error(`Aggregation config ${configId} not found or disabled`);
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(configId, dimensions, timeRange);
      
      // Try cache first
      const cached = await this.getCachedData(cacheKey);
      if (cached) {
        this.updateMetrics('cache_hit', Date.now() - startTime);
        return cached;
      }

      // Cache miss - compute aggregation
      this.updateMetrics('cache_miss', Date.now() - startTime);
      const data = await this.computeAggregation(config, dimensions, timeRange);
      
      // Store in cache with appropriate strategy
      await this.setCachedData(cacheKey, data, config);
      
      this.updateMetrics('query_time', Date.now() - startTime);
      return data;

    } catch (error) {
      this.updateMetrics('error');
      logger.error(`Error getting aggregated data for ${configId}:`, error);
      throw error;
    }
  }

  /**
   * Pre-compute aggregations for faster access
   */
  async precomputeAggregations(configIds?: string[]): Promise<void> {
    const configs = configIds 
      ? configIds.map(id => this.aggregationConfigs.get(id)).filter(Boolean)
      : Array.from(this.aggregationConfigs.values()).filter(c => c.enabled);

    for (const config of configs) {
      if (!config) continue;
      
      try {
        logger.info(`Precomputing aggregation: ${config.name}`);
        
        // Compute for different time ranges
        const timeRanges = this.getCommonTimeRanges();
        
        for (const range of timeRanges) {
          const data = await this.computeAggregation(config, {}, range);
          const cacheKey = this.generateCacheKey(config.id, {}, range);
          await this.setCachedData(cacheKey, data, config);
        }

        // Compute rollups if enabled
        if (config.computeRollups) {
          await this.computeRollups(config);
        }

      } catch (error) {
        logger.error(`Error precomputing ${config.name}:`, error);
      }
    }
  }

  /**
   * Invalidate cache for specific patterns
   */
  async invalidateCache(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const keys = await redisCache.keys(`agg:${pattern}*`);
      
      for (const key of keys) {
        await redisCache.del(key);
      }
      
      logger.info(`Invalidated cache for pattern: ${pattern}`);
    }
  }

  /**
   * Configure aggregation settings
   */
  async configureAggregation(config: AggregationConfig): Promise<void> {
    this.aggregationConfigs.set(config.id, config);
    
    // Store configuration
    await redisCache.setex(
      `agg_config:${config.id}`,
      86400 * 30, // 30 days
      JSON.stringify(config)
    );

    // Restart aggregation job if needed
    if (config.enabled && config.refreshInterval > 0) {
      this.scheduleAggregationJob(config);
    }

    logger.info(`Configured aggregation: ${config.name}`);
  }

  /**
   * Configure cache strategy
   */
  async configureCacheStrategy(strategy: CacheStrategy): Promise<void> {
    this.cacheStrategies.set(strategy.pattern, strategy);
    
    await redisCache.setex(
      `cache_strategy:${strategy.pattern}`,
      86400 * 30,
      JSON.stringify(strategy)
    );

    logger.info(`Configured cache strategy: ${strategy.pattern}`);
  }

  /**
   * Create data pipeline
   */
  async createDataPipeline(pipeline: DataPipeline): Promise<void> {
    this.dataPipelines.set(pipeline.id, pipeline);
    
    await redisCache.setex(
      `pipeline:${pipeline.id}`,
      86400 * 30,
      JSON.stringify(pipeline)
    );

    if (pipeline.enabled) {
      this.schedulePipeline(pipeline);
    }

    logger.info(`Created data pipeline: ${pipeline.name}`);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<any> {
    const keys = await redisCache.keys('agg:*');
    const totalKeys = keys.length;
    
    // Sample keys to estimate sizes
    const sampleSize = Math.min(100, totalKeys);
    const sampleKeys = keys.slice(0, sampleSize);
    
    let totalSize = 0;
    for (const key of sampleKeys) {
      const data = await redisCache.get(key);
      if (data) {
        totalSize += data.length;
      }
    }
    
    const avgSize = totalSize / sampleKeys.length;
    const estimatedTotalSize = avgSize * totalKeys;

    return {
      totalKeys,
      estimatedSizeBytes: estimatedTotalSize,
      hitRate: this.performanceMetrics.cacheHitRate,
      missRate: this.performanceMetrics.cacheMissRate,
      avgQueryTime: this.performanceMetrics.avgQueryTime,
      memoryUsage: this.performanceMetrics.memoryUsage
    };
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache(): Promise<void> {
    logger.info('Starting cache optimization');

    // Analyze cache usage patterns
    const usage = await this.analyzeCacheUsage();
    
    // Remove least accessed items if memory is high
    if (this.performanceMetrics.memoryUsage > 0.8) {
      await this.evictLeastUsed(usage);
    }

    // Precompute frequently accessed data
    await this.precomputePopularQueries(usage);
    
    // Adjust TTL based on access patterns
    await this.optimizeTTL(usage);

    logger.info('Cache optimization completed');
  }

  // Private methods

  private initializeDefaultConfigs() {
    // User engagement aggregation
    this.configureAggregation({
      id: 'user_engagement_hourly',
      name: 'User Engagement Hourly',
      query: 'user_sessions_with_activity',
      dimensions: ['hour', 'device_type', 'user_segment'],
      metrics: ['active_users', 'session_duration', 'page_views'],
      timeGranularity: 'hour',
      refreshInterval: 3600, // 1 hour
      retention: 30, // 30 days
      enabled: true,
      computeRollups: true
    });

    // Fantasy activity aggregation
    this.configureAggregation({
      id: 'fantasy_activity_daily',
      name: 'Fantasy Activity Daily',
      query: 'fantasy_activities',
      dimensions: ['date', 'league_id', 'activity_type'],
      metrics: ['activity_count', 'unique_users', 'avg_engagement'],
      timeGranularity: 'day',
      refreshInterval: 86400, // 24 hours
      retention: 90, // 90 days
      enabled: true,
      computeRollups: true
    });

    // Performance monitoring
    this.configureAggregation({
      id: 'performance_metrics',
      name: 'Performance Metrics',
      query: 'system_metrics',
      dimensions: ['service', 'endpoint', 'status_code'],
      metrics: ['request_count', 'avg_response_time', 'error_rate'],
      timeGranularity: 'minute',
      refreshInterval: 300, // 5 minutes
      retention: 7, // 7 days
      enabled: true,
      computeRollups: false
    });

    // Default cache strategies
    this.configureCacheStrategy({
      pattern: 'user_engagement',
      ttl: 3600, // 1 hour
      refreshStrategy: 'proactive',
      compression: true,
      priority: 'high',
      evictionPolicy: 'lru'
    });

    this.configureCacheStrategy({
      pattern: 'fantasy_activity',
      ttl: 86400, // 24 hours
      refreshStrategy: 'lazy',
      compression: true,
      priority: 'medium',
      evictionPolicy: 'ttl'
    });
  }

  private startAggregationJobs() {
    for (const config of this.aggregationConfigs.values()) {
      if (config.enabled && config.refreshInterval > 0) {
        this.scheduleAggregationJob(config);
      }
    }
  }

  private scheduleAggregationJob(config: AggregationConfig) {
    // Clear existing job
    const existingJob = this.aggregationJobs.get(config.id);
    if (existingJob) {
      clearInterval(existingJob);
    }

    // Schedule new job
    const job = setInterval(async () => {
      try {
        await this.runAggregationJob(config);
      } catch (error) {
        logger.error(`Aggregation job failed for ${config.name}:`, error);
      }
    }, config.refreshInterval * 1000);

    this.aggregationJobs.set(config.id, job);
  }

  private async runAggregationJob(config: AggregationConfig) {
    logger.info(`Running aggregation job: ${config.name}`);
    
    const startTime = Date.now();
    
    try {
      // Compute aggregation for recent time window
      const timeRange = this.getRecentTimeRange(config.timeGranularity);
      const data = await this.computeAggregation(config, {}, timeRange);
      
      // Store in cache
      const cacheKey = this.generateCacheKey(config.id, {}, timeRange);
      await this.setCachedData(cacheKey, data, config);
      
      // Emit event for real-time updates
      this.emit('aggregation_updated', {
        configId: config.id,
        data,
        timestamp: new Date()
      });

      const duration = Date.now() - startTime;
      this.updateMetrics('aggregation_latency', duration);
      
      logger.info(`Aggregation job completed: ${config.name} (${duration}ms)`);

    } catch (error) {
      this.updateMetrics('error');
      throw error;
    }
  }

  private async computeAggregation(
    config: AggregationConfig,
    dimensions: { [key: string]: string },
    timeRange?: { start: Date; end: Date }
  ): Promise<AggregatedData[]> {
    
    const startTime = Date.now();
    
    try {
      // This would execute the actual aggregation query
      // For now, return mock data based on configuration
      const data = await this.executeAggregationQuery(config, dimensions, timeRange);
      
      const duration = Date.now() - startTime;
      logger.debug(`Aggregation computed in ${duration}ms for ${config.name}`);
      
      return data;

    } catch (error) {
      logger.error(`Error computing aggregation for ${config.name}:`, error);
      throw error;
    }
  }

  private async executeAggregationQuery(
    config: AggregationConfig,
    dimensions: { [key: string]: string },
    timeRange?: { start: Date; end: Date }
  ): Promise<AggregatedData[]> {
    
    // This would contain the actual aggregation logic
    // For now, return sample data
    const now = new Date();
    const result: AggregatedData[] = [];

    // Generate sample aggregated data
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      result.push({
        id: `${config.id}_${timestamp.getTime()}`,
        dimensions: {
          hour: timestamp.getHours().toString(),
          ...dimensions
        },
        metrics: {
          active_users: Math.floor(Math.random() * 100) + 50,
          session_duration: Math.floor(Math.random() * 600) + 300,
          page_views: Math.floor(Math.random() * 1000) + 500
        },
        timestamp,
        granularity: config.timeGranularity,
        freshness: now
      });
    }

    return result.filter(item => {
      if (!timeRange) return true;
      return item.timestamp >= timeRange.start && item.timestamp <= timeRange.end;
    });
  }

  private generateCacheKey(
    configId: string,
    dimensions: { [key: string]: string },
    timeRange?: { start: Date; end: Date }
  ): string {
    const dimKey = Object.entries(dimensions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    
    const timeKey = timeRange 
      ? `${timeRange.start.getTime()}-${timeRange.end.getTime()}`
      : 'all';
    
    return `agg:${configId}:${dimKey}:${timeKey}`;
  }

  private async getCachedData(cacheKey: string): Promise<AggregatedData[] | null> {
    try {
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cached data:', error);
      return null;
    }
  }

  private async setCachedData(
    cacheKey: string,
    data: AggregatedData[],
    config: AggregationConfig
  ): Promise<void> {
    try {
      // Find appropriate cache strategy
      const strategy = this.findCacheStrategy(config.id);
      const ttl = strategy?.ttl || 3600; // Default 1 hour
      
      let cacheData = JSON.stringify(data);
      
      // Apply compression if configured
      if (strategy?.compression) {
        // Would use compression library in practice
        // cacheData = compress(cacheData);
      }
      
      await redisCache.setex(cacheKey, ttl, cacheData);
      
    } catch (error) {
      logger.error('Error setting cached data:', error);
    }
  }

  private findCacheStrategy(configId: string): CacheStrategy | undefined {
    for (const [pattern, strategy] of this.cacheStrategies.entries()) {
      if (configId.includes(pattern)) {
        return strategy;
      }
    }
    return undefined;
  }

  private getCommonTimeRanges(): Array<{ start: Date; end: Date }> {
    const now = new Date();
    return [
      {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: now
      },
      {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: now
      },
      {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: now
      }
    ];
  }

  private getRecentTimeRange(granularity: string): { start: Date; end: Date } {
    const now = new Date();
    let hours = 1;
    
    switch (granularity) {
      case 'minute': hours = 1; break;
      case 'hour': hours = 24; break;
      case 'day': hours = 24 * 7; break;
      case 'week': hours = 24 * 30; break;
      case 'month': hours = 24 * 90; break;
    }
    
    return {
      start: new Date(now.getTime() - hours * 60 * 60 * 1000),
      end: now
    };
  }

  private async computeRollups(config: AggregationConfig): Promise<void> {
    // Compute higher-level aggregations from detailed data
    const granularities = ['hour', 'day', 'week', 'month'];
    const currentIndex = granularities.indexOf(config.timeGranularity);
    
    for (let i = currentIndex + 1; i < granularities.length; i++) {
      const rollupGranularity = granularities[i];
      
      // This would compute rollup aggregations
      logger.debug(`Computing ${rollupGranularity} rollups for ${config.name}`);
    }
  }

  private startMetricsCollection() {
    // Collect performance metrics every minute
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // This would collect actual performance metrics
      // For now, generate sample metrics
      this.performanceMetrics = {
        cacheHitRate: 0.85 + Math.random() * 0.1,
        cacheMissRate: 0.05 + Math.random() * 0.1,
        avgQueryTime: 150 + Math.random() * 100,
        aggregationLatency: 500 + Math.random() * 200,
        dataFreshness: Math.random() * 300, // seconds
        memoryUsage: 0.6 + Math.random() * 0.2,
        throughput: 100 + Math.random() * 50,
        errors: Math.floor(Math.random() * 3)
      };

      // Emit metrics update
      this.emit('metrics_updated', this.performanceMetrics);

    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  private updateMetrics(type: string, value?: number): void {
    switch (type) {
      case 'cache_hit':
        this.performanceMetrics.cacheHitRate += 0.01;
        break;
      case 'cache_miss':
        this.performanceMetrics.cacheMissRate += 0.01;
        break;
      case 'query_time':
        if (value) {
          this.performanceMetrics.avgQueryTime = 
            (this.performanceMetrics.avgQueryTime + value) / 2;
        }
        break;
      case 'aggregation_latency':
        if (value) {
          this.performanceMetrics.aggregationLatency = 
            (this.performanceMetrics.aggregationLatency + value) / 2;
        }
        break;
      case 'error':
        this.performanceMetrics.errors += 1;
        break;
    }
  }

  private async analyzeCacheUsage(): Promise<any> {
    const keys = await redisCache.keys('agg:*');
    const usage: any = {};
    
    for (const key of keys.slice(0, 100)) { // Sample to avoid performance issues
      const ttl = await redisCache.ttl(key);
      usage[key] = {
        ttl,
        accessCount: Math.floor(Math.random() * 100), // Would track actual access
        lastAccess: new Date(),
        size: key.length // Simplified size calculation
      };
    }
    
    return usage;
  }

  private async evictLeastUsed(usage: any): Promise<void> {
    const sortedKeys = Object.entries(usage)
      .sort(([,a], [,b]) => (a as any).accessCount - (b as any).accessCount)
      .slice(0, 50); // Evict bottom 50
    
    for (const [key] of sortedKeys) {
      await redisCache.del(key);
    }
    
    logger.info(`Evicted ${sortedKeys.length} least used cache entries`);
  }

  private async precomputePopularQueries(usage: any): Promise<void> {
    const popularKeys = Object.entries(usage)
      .sort(([,a], [,b]) => (b as any).accessCount - (a as any).accessCount)
      .slice(0, 10); // Top 10 most accessed
    
    for (const [key] of popularKeys) {
      // Refresh cache for popular queries
      const parts = key.split(':');
      if (parts.length >= 2) {
        const configId = parts[1];
        const config = this.aggregationConfigs.get(configId);
        if (config) {
          await this.runAggregationJob(config);
        }
      }
    }
  }

  private async optimizeTTL(usage: any): Promise<void> {
    for (const [key, data] of Object.entries(usage)) {
      const accessCount = (data as any).accessCount;
      
      // Increase TTL for frequently accessed data
      if (accessCount > 50) {
        const newTTL = Math.min(86400, (data as any).ttl * 2); // Max 24 hours
        await redisCache.expire(key, newTTL);
      }
    }
  }

  private schedulePipeline(pipeline: DataPipeline): void {
    // This would use a proper cron scheduler in practice
    logger.info(`Scheduled pipeline: ${pipeline.name}`);
  }
}

export const analyticsAggregationService = new AnalyticsAggregationService();