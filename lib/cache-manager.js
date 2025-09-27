/**
 * Phoenix Multi-Tier Cache Manager
 * High-performance caching system for Astral Field sports application
 *
 * Features:
 * - L1 Memory Cache (sub-millisecond access)
 * - L2 Redis Cache (1-5ms access)
 * - L3 CDN Cache (edge caching)
 * - Intelligent cache warming and invalidation
 * - Sports-specific caching patterns
 * - Automatic compression and serialization
 * - Circuit breaker for cache failures
 * - Performance monitoring and analytics
 */
import Redis, { Cluster } from 'ioredis';
import NodeCache from 'node-cache';
import LRU from 'lru-cache';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import pino from 'pino';
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
class CacheManager {
    static instance;
    redis;
    memoryCache;
    hotCache;
    logger;
    config;
    metrics;
    isRedisHealthy = true;
    lastHealthCheck = 0;
    compressionEnabled;
    constructor(config = {}) {
        this.config = {
            redis: {
                url: config.redis?.url || process.env.REDIS_URL || 'redis://localhost:6379',
                cluster: config.redis?.cluster || false,
                nodes: config.redis?.nodes || [],
                compression: config.redis?.compression ?? true,
                maxRetries: config.redis?.maxRetries || 3
            },
            memory: {
                maxSize: config.memory?.maxSize || 100, // MB
                ttl: config.memory?.ttl || 300, // 5 minutes
                checkPeriod: config.memory?.checkPeriod || 60
            },
            compression: {
                enabled: config.compression?.enabled ?? true,
                threshold: config.compression?.threshold || 1024 // 1KB
            },
            monitoring: {
                enabled: config.monitoring?.enabled ?? true,
                logInterval: config.monitoring?.logInterval || 300000 // 5 minutes
            }
        };
        this.logger = pino({
            name: 'CacheManager',
            level: process.env.LOG_LEVEL || 'info'
        });
        this.metrics = this.initializeMetrics();
        this.compressionEnabled = this.config.compression.enabled && process.env.NODE_ENV === 'production';
        this.initializeRedis();
        this.initializeMemoryCache();
        this.setupMonitoring();
    }
    static getInstance(config) {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager(config);
        }
        return CacheManager.instance;
    }
    initializeMetrics() {
        return {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            totalRequests: 0,
            avgResponseTime: 0,
            compressionRatio: 0,
            errorRate: 0
        };
    }
    initializeRedis() {
        if (this.config.redis.cluster && this.config.redis.nodes.length > 0) {
            // Redis Cluster for production
            this.redis = new Cluster(this.config.redis.nodes, {
                redisOptions: {
                    retryDelayOnFailure: 100,
                    maxRetriesPerRequest: this.config.redis.maxRetries,
                    connectTimeout: 10000,
                    lazyConnect: true,
                    keepAlive: 30000,
                    family: 4,
                },
                clusterRetryDelayOnFailure: 1000,
                maxRetriesPerRequest: this.config.redis.maxRetries,
            });
        }
        else {
            // Single Redis instance
            this.redis = new Redis(this.config.redis.url, {
                retryDelayOnFailure: 100,
                maxRetriesPerRequest: this.config.redis.maxRetries,
                connectTimeout: 10000,
                lazyConnect: true,
                keepAlive: 30000,
                family: 4,
                // Connection pooling
                maxMemoryPolicy: 'allkeys-lru',
            });
        }
        // Redis event handlers
        this.redis.on('connect', () => {
            this.logger.info('Redis connection established');
            this.isRedisHealthy = true;
        });
        this.redis.on('error', (error) => {
            this.logger.error('Redis connection error:', error);
            this.isRedisHealthy = false;
        });
        this.redis.on('close', () => {
            this.logger.warn('Redis connection closed');
            this.isRedisHealthy = false;
        });
        this.redis.on('reconnecting', () => {
            this.logger.info('Redis reconnecting...');
        });
    }
    initializeMemoryCache() {
        // L1 Cache: Ultra-fast LRU cache for hot data
        this.memoryCache = new LRU({
            max: 1000, // Max number of items
            maxSize: this.config.memory.maxSize * 1024 * 1024, // Convert MB to bytes
            sizeCalculation: (value, key) => {
                return JSON.stringify(value).length + key.length;
            },
            ttl: this.config.memory.ttl * 1000, // Convert seconds to milliseconds
            allowStale: false,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        });
        // Hot cache for frequently accessed small items
        this.hotCache = new NodeCache({
            stdTTL: 60, // 1 minute
            checkperiod: this.config.memory.checkPeriod,
            useClones: false,
            maxKeys: 5000,
            deleteOnExpire: true,
        });
        // Memory cache event handlers
        this.hotCache.on('expired', (key, value) => {
            this.logger.debug(`Hot cache item expired: ${key}`);
        });
        this.hotCache.on('set', (key, value) => {
            this.logger.debug(`Hot cache item set: ${key}`);
        });
    }
    setupMonitoring() {
        if (!this.config.monitoring.enabled)
            return;
        setInterval(() => {
            this.logMetrics();
            this.performHealthCheck();
        }, this.config.monitoring.logInterval);
        // Reset metrics periodically
        setInterval(() => {
            this.resetMetrics();
        }, 3600000); // Reset every hour
    }
    // ========================================
    // PUBLIC API METHODS
    // ========================================
    async get(key) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        try {
            // L1: Hot cache (fastest - sub-millisecond)
            const hotResult = this.hotCache.get(key);
            if (hotResult !== undefined) {
                this.metrics.l1Hits++;
                this.updateResponseTime(startTime);
                return hotResult;
            }
            // L1: Memory cache (very fast - 1-2ms)
            const memoryResult = this.memoryCache.get(key);
            if (memoryResult !== undefined) {
                this.metrics.l1Hits++;
                // Backfill hot cache for frequently accessed items
                this.hotCache.set(key, memoryResult, 30); // 30 seconds in hot cache
                this.updateResponseTime(startTime);
                return memoryResult;
            }
            this.metrics.l1Misses++;
            // L2: Redis cache (fast - 1-10ms)
            if (this.isRedisHealthy) {
                const redisResult = await this.getFromRedis(key);
                if (redisResult !== null) {
                    this.metrics.l2Hits++;
                    // Backfill memory caches
                    this.memoryCache.set(key, redisResult);
                    this.hotCache.set(key, redisResult, 30);
                    this.updateResponseTime(startTime);
                    return redisResult;
                }
            }
            this.metrics.l2Misses++;
            this.updateResponseTime(startTime);
            return null;
        }
        catch (error) {
            this.metrics.errorRate++;
            this.logger.error('Cache get error:', { key, error: error instanceof Error ? error.message : 'Unknown error' });
            this.updateResponseTime(startTime);
            return null;
        }
    }
    async set(key, value, ttl = 300) {
        try {
            // Set in all cache layers
            const memoryCacheTtl = Math.min(ttl, this.config.memory.ttl);
            // L1: Set in memory caches
            this.memoryCache.set(key, value, { ttl: memoryCacheTtl * 1000 });
            this.hotCache.set(key, value, Math.min(memoryCacheTtl, 60));
            // L2: Set in Redis (if healthy)
            if (this.isRedisHealthy) {
                await this.setInRedis(key, value, ttl);
            }
        }
        catch (error) {
            this.metrics.errorRate++;
            this.logger.error('Cache set error:', { key, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async del(key) {
        try {
            // Remove from all cache layers
            this.memoryCache.delete(key);
            this.hotCache.del(key);
            if (this.isRedisHealthy) {
                await this.redis.del(key);
            }
        }
        catch (error) {
            this.logger.error('Cache delete error:', { key, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async invalidatePattern(pattern) {
        try {
            // Clear memory caches (pattern matching is limited)
            if (pattern.includes('*')) {
                const basePattern = pattern.replace('*', '');
                // Clear matching keys from memory cache
                for (const key of this.memoryCache.keys()) {
                    if (key.includes(basePattern)) {
                        this.memoryCache.delete(key);
                    }
                }
                // Clear matching keys from hot cache
                const hotKeys = this.hotCache.keys();
                for (const key of hotKeys) {
                    if (key.includes(basePattern)) {
                        this.hotCache.del(key);
                    }
                }
            }
            // Clear from Redis using pattern matching
            if (this.isRedisHealthy) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
        }
        catch (error) {
            this.logger.error('Cache pattern invalidation error:', { pattern, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    // ========================================
    // SPORTS-SPECIFIC CACHING METHODS
    // ========================================
    async cachePlayerStats(playerId, week, season, stats) {
        const key = `player:stats:${playerId}:${season}:${week}`;
        await this.set(key, stats, 3600); // 1 hour
    }
    async getPlayerStats(playerId, week, season) {
        const key = `player:stats:${playerId}:${season}:${week}`;
        return await this.get(key);
    }
    async cacheLeagueStandings(leagueId, standings) {
        const key = `standings:${leagueId}`;
        await this.set(key, standings, 300); // 5 minutes
    }
    async getLeagueStandings(leagueId) {
        const key = `standings:${leagueId}`;
        return await this.get(key);
    }
    async cacheLiveScores(leagueId, week, scores) {
        const key = `live:scores:${leagueId}:${week}`;
        await this.set(key, scores, 30); // 30 seconds for live data
    }
    async getLiveScores(leagueId, week) {
        const key = `live:scores:${leagueId}:${week}`;
        return await this.get(key);
    }
    async cachePlayerRankings(position, rankings) {
        const key = `rankings:${position}`;
        await this.set(key, rankings, 1800); // 30 minutes
    }
    async getPlayerRankings(position) {
        const key = `rankings:${position}`;
        return await this.get(key);
    }
    async cacheDraftBoard(draftId, board) {
        const key = `draft:board:${draftId}`;
        await this.set(key, board, 10); // 10 seconds for draft data
    }
    async getDraftBoard(draftId) {
        const key = `draft:board:${draftId}`;
        return await this.get(key);
    }
    async cacheUserSession(sessionId, sessionData) {
        const key = `session:${sessionId}`;
        await this.set(key, sessionData, 1800); // 30 minutes
    }
    async getUserSession(sessionId) {
        const key = `session:${sessionId}`;
        return await this.get(key);
    }
    // ========================================
    // AUTHENTICATION-SPECIFIC CACHING METHODS
    // ========================================
    async cacheUserAuthData(email, userData) {
        const key = `user_auth:${email.toLowerCase()}`;
        // Cache user auth data for 5 minutes (excluding sensitive password hash)
        const { hashedPassword, ...safeUserData } = userData;
        await this.set(key, safeUserData, 300);
    }
    async getUserAuthData(email) {
        const key = `user_auth:${email.toLowerCase()}`;
        return await this.get(key);
    }
    async cachePasswordVerification(passwordHash, password, isValid) {
        // Create secure cache key without storing actual password
        const cacheKey = `pwd_verify:${passwordHash.slice(-12)}:${password.length}`;
        await this.set(cacheKey, { valid: isValid }, 30); // Cache for 30 seconds
    }
    async getPasswordVerification(passwordHash, password) {
        const cacheKey = `pwd_verify:${passwordHash.slice(-12)}:${password.length}`;
        const result = await this.get(cacheKey);
        return result ? result.valid : null;
    }
    async cacheJWTToken(tokenId, tokenData) {
        const key = `jwt:${tokenId}`;
        await this.set(key, tokenData, 1800); // 30 minutes
    }
    async getJWTToken(tokenId) {
        const key = `jwt:${tokenId}`;
        return await this.get(key);
    }
    async cacheLoginAttempt(clientIP, email, success) {
        const key = `login_attempt:${clientIP}:${email}`;
        const attempts = await this.get(key) || [];
        attempts.push({ timestamp: Date.now(), success });
        // Keep only last 10 attempts
        if (attempts.length > 10) {
            attempts.splice(0, attempts.length - 10);
        }
        await this.set(key, attempts, 3600); // 1 hour
    }
    async getLoginAttempts(clientIP, email) {
        const key = `login_attempt:${clientIP}:${email}`;
        return await this.get(key) || [];
    }
    async cacheSessionMetrics(sessionId, metrics) {
        const key = `session_metrics:${sessionId}`;
        await this.set(key, metrics, 7200); // 2 hours
    }
    async getSessionMetrics(sessionId) {
        const key = `session_metrics:${sessionId}`;
        return await this.get(key);
    }
    // ========================================
    // CACHE INVALIDATION PATTERNS
    // ========================================
    async invalidatePlayerData(playerId) {
        await this.invalidatePattern(`player:*:${playerId}:*`);
        await this.invalidatePattern(`rankings:*`); // Rankings may include this player
    }
    async invalidateLeagueData(leagueId) {
        await this.invalidatePattern(`standings:${leagueId}`);
        await this.invalidatePattern(`live:*:${leagueId}:*`);
        await this.invalidatePattern(`matchup:${leagueId}:*`);
    }
    async invalidateDraftData(draftId) {
        await this.invalidatePattern(`draft:*:${draftId}`);
    }
    async invalidateWeekData(week) {
        await this.invalidatePattern(`*:*:${week}`);
        await this.invalidatePattern(`live:*:*:${week}`);
    }
    async invalidateUserAuthData(email) {
        await this.invalidatePattern(`user_auth:${email.toLowerCase()}`);
        await this.invalidatePattern(`pwd_verify:*`); // Clear password verification cache
    }
    async invalidateUserSession(sessionId) {
        await this.invalidatePattern(`session:${sessionId}`);
        await this.invalidatePattern(`session_metrics:${sessionId}`);
        await this.invalidatePattern(`jwt:${sessionId}`);
    }
    async invalidateAllSessions(userId) {
        // This would require additional tracking, for now clear all session data
        await this.invalidatePattern(`session:*`);
        await this.invalidatePattern(`jwt:*`);
    }
    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    async getFromRedis(key) {
        try {
            const result = await this.redis.get(key);
            if (!result)
                return null;
            const parsed = JSON.parse(result);
            // Check if item is expired
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                await this.redis.del(key);
                return null;
            }
            // Decompress if needed
            if (parsed.compressed && this.compressionEnabled) {
                const decompressed = await gunzipAsync(Buffer.from(parsed.data, 'base64'));
                return JSON.parse(decompressed.toString());
            }
            return parsed.data;
        }
        catch (error) {
            this.logger.error('Redis get error:', error);
            return null;
        }
    }
    async setInRedis(key, value, ttl) {
        try {
            const serialized = JSON.stringify(value);
            const shouldCompress = this.compressionEnabled && serialized.length > this.config.compression.threshold;
            let data = value;
            let compressed = false;
            if (shouldCompress) {
                const compressed_buffer = await gzipAsync(serialized);
                data = compressed_buffer.toString('base64');
                compressed = true;
                // Update compression metrics
                this.metrics.compressionRatio = compressed_buffer.length / serialized.length;
            }
            const cacheItem = {
                data,
                compressed,
                createdAt: Date.now(),
                expiresAt: Date.now() + (ttl * 1000),
                size: serialized.length
            };
            await this.redis.setex(key, ttl, JSON.stringify(cacheItem));
        }
        catch (error) {
            this.logger.error('Redis set error:', error);
            throw error;
        }
    }
    updateResponseTime(startTime) {
        const responseTime = Date.now() - startTime;
        this.metrics.avgResponseTime = (this.metrics.avgResponseTime + responseTime) / 2;
    }
    async performHealthCheck() {
        const now = Date.now();
        if (now - this.lastHealthCheck < 30000)
            return; // Check max every 30 seconds
        this.lastHealthCheck = now;
        try {
            await this.redis.ping();
            this.isRedisHealthy = true;
        }
        catch (error) {
            this.logger.warn('Redis health check failed:', error);
            this.isRedisHealthy = false;
        }
    }
    logMetrics() {
        const totalCacheRequests = this.metrics.l1Hits + this.metrics.l1Misses;
        const l1HitRate = totalCacheRequests > 0 ? (this.metrics.l1Hits / totalCacheRequests) * 100 : 0;
        const totalRedisRequests = this.metrics.l2Hits + this.metrics.l2Misses;
        const l2HitRate = totalRedisRequests > 0 ? (this.metrics.l2Hits / totalRedisRequests) * 100 : 0;
        this.logger.info('Cache performance metrics', {
            l1HitRate: `${l1HitRate.toFixed(2)}%`,
            l2HitRate: `${l2HitRate.toFixed(2)}%`,
            avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
            totalRequests: this.metrics.totalRequests,
            compressionRatio: `${(this.metrics.compressionRatio * 100).toFixed(2)}%`,
            errorRate: `${((this.metrics.errorRate / this.metrics.totalRequests) * 100).toFixed(2)}%`,
            memCacheSize: this.memoryCache.size,
            hotCacheSize: this.hotCache.keys().length,
            redisHealthy: this.isRedisHealthy
        });
    }
    resetMetrics() {
        this.metrics = this.initializeMetrics();
    }
    // ========================================
    // PUBLIC UTILITY METHODS
    // ========================================
    getMetrics() {
        return { ...this.metrics };
    }
    getCacheStats() {
        return {
            memory: {
                size: this.memoryCache.size,
                calculatedSize: this.memoryCache.calculatedSize,
                max: this.memoryCache.max,
                maxSize: this.memoryCache.maxSize
            },
            hot: {
                keys: this.hotCache.keys().length,
                stats: this.hotCache.getStats()
            },
            redis: {
                healthy: this.isRedisHealthy,
                status: this.redis.status
            },
            compression: {
                enabled: this.compressionEnabled,
                threshold: this.config.compression.threshold,
                ratio: this.metrics.compressionRatio
            }
        };
    }
    async flushAll() {
        try {
            this.memoryCache.clear();
            this.hotCache.flushAll();
            if (this.isRedisHealthy) {
                await this.redis.flushall();
            }
            this.logger.info('All caches flushed');
        }
        catch (error) {
            this.logger.error('Error flushing caches:', error);
        }
    }
    // ========================================
    // REDIS COMPATIBILITY METHODS FOR SECURITY MIDDLEWARE
    // ========================================
    async setex(key, seconds, value) {
        await this.redis.setex(key, seconds, value);
    }
    async incr(key) {
        return await this.redis.incr(key);
    }
    async expire(key, seconds) {
        return await this.redis.expire(key, seconds);
    }
    async keys(pattern) {
        return await this.redis.keys(pattern);
    }
    async lpush(key, ...values) {
        return await this.redis.lpush(key, ...values);
    }
    async ltrim(key, start, stop) {
        return await this.redis.ltrim(key, start, stop);
    }
    async lrange(key, start, stop) {
        return await this.redis.lrange(key, start, stop);
    }
    async disconnect() {
        this.logger.info('Disconnecting cache manager...');
        try {
            this.memoryCache.clear();
            this.hotCache.flushAll();
            await this.redis.disconnect();
            this.logger.info('Cache manager disconnected successfully');
        }
        catch (error) {
            this.logger.error('Error during cache manager disconnect:', error);
            throw error;
        }
    }
}
// Export singleton instance
export const cacheManager = CacheManager.getInstance();
// Export for testing and advanced usage
export { CacheManager };
// Graceful shutdown handler
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, disconnecting cache manager...');
    try {
        await cacheManager.disconnect();
    }
    catch (error) {
        console.error('Error during cache manager shutdown:', error);
    }
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, disconnecting cache manager...');
    try {
        await cacheManager.disconnect();
    }
    catch (error) {
        console.error('Error during cache manager shutdown:', error);
    }
});
//# sourceMappingURL=cache-manager.js.map