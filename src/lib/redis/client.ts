/**
 * Enterprise Redis Client with Connection Pooling and Fallback
 * Handles Redis connection failures gracefully with automatic fallbacks
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../logger';

// Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix?: string;
}

// In-memory cache fallback when Redis is unavailable
class MemoryCacheFallback {
  private cache = new Map<string, { value: any; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval for expired keys
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean every minute
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  set(key: string, value: any, ttlSeconds: number = 3600): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(pattern: string): string[] {
    // Simple pattern matching for fallback
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  exists(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && Date.now() <= item.expiry;
  }

  ttl(key: string): number {
    const item = this.cache.get(key);
    if (!item) return -2; // Key doesn't exist
    
    const remaining = Math.floor((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1; // Expired
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

class EnhancedRedisClient {
  private redis: Redis | null = null;
  private fallback: MemoryCacheFallback;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.fallback = new MemoryCacheFallback();
    this.initializeRedis();
  }

  private getRedisConfig(): RedisConfig {
    // Production Redis configuration (can be Upstash, AWS ElastiCache, etc.)
    if (process.env.REDIS_URL) {
      return {
        host: new URL(process.env.REDIS_URL).hostname,
        port: parseInt(new URL(process.env.REDIS_URL).port) || 6379,
        password: new URL(process.env.REDIS_URL).password || undefined,
        db: 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 1000,
        enableReadyCheck: true,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: 'astral:',
      };
    }

    // Local development Redis configuration
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 1000,
      enableReadyCheck: true,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: 'astral:',
    };
  }

  private initializeRedis(): void {
    try {
      const config = this.getRedisConfig();
      
      this.redis = new Redis({
        ...config,
        retryDelayOnClusterDown: 300,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        showFriendlyErrorStack: process.env.NODE_ENV === 'development',
      });

      this.redis.on('connect', () => {
        logger.info('🔌 Redis connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      });

      this.redis.on('ready', () => {
        logger.info('✅ Redis client ready');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.warn('🔌 Redis connection error, falling back to memory cache', { error: error.message });
        this.scheduleReconnection();
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('🔌 Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis client', { error });
      this.scheduleReconnection();
    }
  }

  private scheduleReconnection(): void {
    if (this.reconnectInterval || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectInterval = setInterval(() => {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.warn('Max Redis reconnection attempts reached, using memory cache only');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
        return;
      }

      this.reconnectAttempts++;
      logger.info(`Redis reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.initializeRedis();
    }, 5000 * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        const serialized = JSON.stringify(value);
        await this.redis.setex(key, ttlSeconds, serialized);
        logger.debug(`✅ Redis SET: ${key} (TTL: ${ttlSeconds}s)`);
        return;
      }
    } catch (error) {
      logger.warn('Redis SET failed, using fallback', { key, error: error.message });
    }

    // Fallback to memory cache
    this.fallback.set(key, value, ttlSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.redis) {
        const result = await this.redis.get(key);
        if (result) {
          const parsed = JSON.parse(result);
          logger.debug(`✅ Redis GET: ${key} (hit)`);
          return parsed as T;
        }
        return null;
      }
    } catch (error) {
      logger.warn('Redis GET failed, using fallback', { key, error: error.message });
    }

    // Fallback to memory cache
    return this.fallback.get(key) as T | null;
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
        logger.debug(`✅ Redis DEL: ${key}`);
      }
    } catch (error) {
      logger.warn('Redis DEL failed, using fallback', { key, error: error.message });
    }

    // Always delete from fallback
    this.fallback.del(key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.isConnected && this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      }
    } catch (error) {
      logger.warn('Redis EXISTS failed, using fallback', { key, error: error.message });
    }

    return this.fallback.exists(key);
  }

  async ttl(key: string): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.ttl(key);
      }
    } catch (error) {
      logger.warn('Redis TTL failed, using fallback', { key, error: error.message });
    }

    return this.fallback.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.keys(pattern);
      }
    } catch (error) {
      logger.warn('Redis KEYS failed, using fallback', { pattern, error: error.message });
    }

    return this.fallback.keys(pattern);
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.expire(key, seconds);
      }
    } catch (error) {
      logger.warn('Redis EXPIRE failed', { key, error: error.message });
    }
    // Note: Memory cache doesn't support changing TTL after set
  }

  async ping(): Promise<boolean> {
    try {
      if (this.isConnected && this.redis) {
        const result = await this.redis.ping();
        return result === 'PONG';
      }
    } catch (error) {
      logger.warn('Redis PING failed', { error: error.message });
    }
    return false;
  }

  getConnectionStatus(): { connected: boolean; usingFallback: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      usingFallback: !this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  async disconnect(): Promise<void> {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    this.fallback.destroy();
    this.isConnected = false;
    logger.info('Redis client disconnected');
  }

  // Batch operations for better performance
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      if (this.isConnected && this.redis) {
        const results = await this.redis.mget(...keys);
        return results.map(result => result ? JSON.parse(result) : null);
      }
    } catch (error) {
      logger.warn('Redis MGET failed, using fallback', { keys, error: error.message });
    }

    // Fallback to individual gets
    return Promise.all(keys.map(key => this.fallback.get(key)));
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        const pipeline = this.redis.pipeline();
        
        keyValuePairs.forEach(({ key, value, ttl = 3600 }) => {
          pipeline.setex(key, ttl, JSON.stringify(value));
        });
        
        await pipeline.exec();
        return;
      }
    } catch (error) {
      logger.warn('Redis MSET failed, using fallback', { error: error.message });
    }

    // Fallback to individual sets
    keyValuePairs.forEach(({ key, value, ttl = 3600 }) => {
      this.fallback.set(key, value, ttl);
    });
  }
}

// Export singleton instance
export const redis = new EnhancedRedisClient();

// Health check function
export async function checkRedisHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
  const connectionStatus = redis.getConnectionStatus();
  const canPing = await redis.ping();

  if (connectionStatus.connected && canPing) {
    return {
      status: 'healthy',
      details: {
        connected: true,
        usingFallback: false,
        reconnectAttempts: connectionStatus.reconnectAttempts,
      }
    };
  }

  if (connectionStatus.usingFallback) {
    return {
      status: 'degraded',
      details: {
        connected: false,
        usingFallback: true,
        reconnectAttempts: connectionStatus.reconnectAttempts,
        message: 'Using memory cache fallback'
      }
    };
  }

  return {
    status: 'unhealthy',
    details: {
      connected: false,
      usingFallback: false,
      reconnectAttempts: connectionStatus.reconnectAttempts,
      message: 'Redis unavailable and fallback failed'
    }
  };
}

export default redis;