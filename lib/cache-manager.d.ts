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
interface CacheConfig {
    redis?: {
        url?: string;
        cluster?: boolean;
        nodes?: string[];
        compression?: boolean;
        maxRetries?: number;
    };
    memory?: {
        maxSize?: number;
        ttl?: number;
        checkPeriod?: number;
    };
    compression?: {
        enabled?: boolean;
        threshold?: number;
    };
    monitoring?: {
        enabled?: boolean;
        logInterval?: number;
    };
}
interface CacheMetrics {
    l1Hits: number;
    l1Misses: number;
    l2Hits: number;
    l2Misses: number;
    totalRequests: number;
    avgResponseTime: number;
    compressionRatio: number;
    errorRate: number;
}
type CacheKey = string;
type TTL = number;
declare class CacheManager {
    private static instance;
    private redis;
    private memoryCache;
    private hotCache;
    private logger;
    private config;
    private metrics;
    private isRedisHealthy;
    private lastHealthCheck;
    private compressionEnabled;
    private constructor();
    static getInstance(config?: CacheConfig): CacheManager;
    private initializeMetrics;
    private initializeRedis;
    private initializeMemoryCache;
    private setupMonitoring;
    get<T>(key: CacheKey): Promise<T | null>;
    set<T>(key: CacheKey, value: T, ttl?: TTL): Promise<void>;
    del(key: CacheKey): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    cachePlayerStats(playerId: string, week: number, season: string, stats: any): Promise<void>;
    getPlayerStats(playerId: string, week: number, season: string): Promise<any>;
    cacheLeagueStandings(leagueId: string, standings: any): Promise<void>;
    getLeagueStandings(leagueId: string): Promise<any>;
    cacheLiveScores(leagueId: string, week: number, scores: any): Promise<void>;
    getLiveScores(leagueId: string, week: number): Promise<any>;
    cachePlayerRankings(position: string, rankings: any): Promise<void>;
    getPlayerRankings(position: string): Promise<any>;
    cacheDraftBoard(draftId: string, board: any): Promise<void>;
    getDraftBoard(draftId: string): Promise<any>;
    cacheUserSession(sessionId: string, sessionData: any): Promise<void>;
    getUserSession(sessionId: string): Promise<any>;
    cacheUserAuthData(email: string, userData: any): Promise<void>;
    getUserAuthData(email: string): Promise<any>;
    cachePasswordVerification(passwordHash: string, password: string, isValid: boolean): Promise<void>;
    getPasswordVerification(passwordHash: string, password: string): Promise<boolean | null>;
    cacheJWTToken(tokenId: string, tokenData: any): Promise<void>;
    getJWTToken(tokenId: string): Promise<any>;
    cacheLoginAttempt(clientIP: string, email: string, success: boolean): Promise<void>;
    getLoginAttempts(clientIP: string, email: string): Promise<any[]>;
    cacheSessionMetrics(sessionId: string, metrics: any): Promise<void>;
    getSessionMetrics(sessionId: string): Promise<any>;
    invalidatePlayerData(playerId: string): Promise<void>;
    invalidateLeagueData(leagueId: string): Promise<void>;
    invalidateDraftData(draftId: string): Promise<void>;
    invalidateWeekData(week: number): Promise<void>;
    invalidateUserAuthData(email: string): Promise<void>;
    invalidateUserSession(sessionId: string): Promise<void>;
    invalidateAllSessions(userId: string): Promise<void>;
    private getFromRedis;
    private setInRedis;
    private updateResponseTime;
    private performHealthCheck;
    private logMetrics;
    private resetMetrics;
    getMetrics(): CacheMetrics;
    getCacheStats(): {
        memory: {
            size: any;
            calculatedSize: any;
            max: any;
            maxSize: any;
        };
        hot: {
            keys: any;
            stats: any;
        };
        redis: {
            healthy: boolean;
            status: "close" | "end" | "connect" | "wait" | "reconnecting" | "connecting" | "ready" | "disconnecting";
        };
        compression: {
            enabled: boolean;
            threshold: number | undefined;
            ratio: number;
        };
    };
    flushAll(): Promise<void>;
    setex(key: string, seconds: number, value: string): Promise<void>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    lpush(key: string, ...values: string[]): Promise<number>;
    ltrim(key: string, start: number, stop: number): Promise<string>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    disconnect(): Promise<void>;
}
export declare const cacheManager: CacheManager;
export { CacheManager };
//# sourceMappingURL=cache-manager.d.ts.map