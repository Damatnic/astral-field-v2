/**
 * Phoenix Query Optimizer
 * High-performance query patterns for Astral Field sports application
 *
 * Features:
 * - Optimized queries for sub-50ms latency
 * - Intelligent caching integration
 * - N+1 query elimination
 * - Database connection pooling
 * - Real-time data optimization
 * - Sports-specific query patterns
 * - Performance monitoring and analytics
 */
interface QueryConfig {
    enableCaching?: boolean;
    cacheEnabled?: boolean;
    cacheTTL?: number;
    enableLogging?: boolean;
    maxRetries?: number;
    timeout?: number;
}
interface PaginationOptions {
    page?: number;
    limit?: number;
    cursor?: string;
}
interface PlayerSearchFilters {
    position?: string[];
    team?: string[];
    status?: string;
    search?: string;
    minRank?: number;
    maxRank?: number;
    isRookie?: boolean;
    isFantasyRelevant?: boolean;
}
interface QueryPerformanceMetrics {
    queryName: string;
    executionTime: number;
    cacheHit: boolean;
    recordCount: number;
    timestamp: Date;
}
declare class QueryOptimizer {
    private static instance;
    private prisma;
    private logger;
    private defaultConfig;
    private metrics;
    private constructor();
    static getInstance(config?: QueryConfig): QueryOptimizer;
    /**
     * Optimized league dashboard - Single transaction, multiple parallel queries
     * Target: <50ms execution time
     */
    getLeagueDashboard(leagueId: string, userId: string, config?: QueryConfig): Promise<any>;
    /**
     * High-performance player search with intelligent caching
     * Target: <25ms execution time
     */
    searchPlayers(filters: PlayerSearchFilters, pagination?: PaginationOptions, config?: QueryConfig): Promise<any>;
    /**
     * Lightning-fast live scoring updates
     * Target: <30ms execution time
     */
    updateLiveScores(leagueId: string, week: number): Promise<any>;
    /**
     * Ultra-fast draft board updates
     * Target: <20ms execution time
     */
    getDraftBoard(draftId: string, config?: QueryConfig): Promise<any>;
    /**
     * Make draft pick with optimized updates
     * Target: <40ms execution time
     */
    makeDraftPick(draftId: string, teamId: string, playerId: string, timeUsed?: number): Promise<any>;
    private executeWithCache;
    private recordMetrics;
    getMetrics(): QueryPerformanceMetrics[];
    getAverageExecutionTime(queryName?: string): number;
    getCacheHitRate(queryName?: string): number;
    clearMetrics(): void;
}
export declare const queryOptimizer: QueryOptimizer;
export { QueryOptimizer };
export type { PlayerSearchFilters, PaginationOptions, QueryPerformanceMetrics };
//# sourceMappingURL=query-optimizer.d.ts.map