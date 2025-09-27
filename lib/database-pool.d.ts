/**
 * Phoenix Database Pool Manager
 * High-performance connection pooling and query optimization for Astral Field
 *
 * Features:
 * - Advanced connection pooling with automatic scaling
 * - Query performance monitoring and optimization
 * - Automatic retry and circuit breaker patterns
 * - Connection health monitoring
 * - Memory leak prevention
 * - Production-ready error handling
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PoolClient } from 'pg';
interface DatabaseConfig {
    maxConnections?: number;
    minConnections?: number;
    connectionTimeout?: number;
    idleTimeout?: number;
    maxLifetime?: number;
    retryAttempts?: number;
    retryDelay?: number;
    enableQueryLogging?: boolean;
    enableSlowQueryLogging?: boolean;
    slowQueryThreshold?: number;
}
interface QueryMetrics {
    totalQueries: number;
    slowQueries: number;
    avgExecutionTime: number;
    p95ExecutionTime: number;
    errorRate: number;
}
declare class DatabasePool {
    private static instance;
    private prisma;
    private pool;
    private logger;
    private config;
    private queryMetrics;
    private circuitBreakerState;
    private failureCount;
    private lastFailureTime;
    private readonly circuitBreakerThreshold;
    private readonly circuitBreakerTimeout;
    private constructor();
    static getInstance(config?: DatabaseConfig): DatabasePool;
    private calculateOptimalConnections;
    private initializePool;
    private initializePrisma;
    private setupHealthChecks;
    getPrisma(): PrismaClient;
    getConnection(): Promise<PoolClient>;
    executeQuery<T>(query: string, params?: any[], retries?: number): Promise<T>;
    transaction<T>(operations: (prisma: PrismaClient) => Promise<T>, timeout?: number): Promise<T>;
    healthCheck(): Promise<boolean>;
    getMetrics(): QueryMetrics;
    getPoolStats(): {
        totalCount: number;
        idleCount: number;
        waitingCount: number;
        maxConnections: number;
        circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN";
        failureCount: number;
    };
    disconnect(): Promise<void>;
    private executeWithRetry;
    private recordQueryMetrics;
    private recordFailure;
    private cleanupMetrics;
    private sanitizeArgs;
}
export declare const dbPool: DatabasePool;
export declare const prisma: PrismaClient<Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { DatabasePool };
//# sourceMappingURL=database-pool.d.ts.map