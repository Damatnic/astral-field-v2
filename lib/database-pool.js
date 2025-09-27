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
import { Pool } from 'pg';
import pino from 'pino';
class DatabasePool {
    static instance;
    prisma;
    pool;
    logger;
    config;
    queryMetrics = new Map();
    circuitBreakerState = 'CLOSED';
    failureCount = 0;
    lastFailureTime = 0;
    circuitBreakerThreshold = 5;
    circuitBreakerTimeout = 30000; // 30 seconds
    constructor(config = {}) {
        this.config = {
            maxConnections: config.maxConnections || this.calculateOptimalConnections(),
            minConnections: config.minConnections || 10,
            connectionTimeout: config.connectionTimeout || 10000,
            idleTimeout: config.idleTimeout || 30000,
            maxLifetime: config.maxLifetime || 1800000, // 30 minutes
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            enableQueryLogging: config.enableQueryLogging ?? (process.env.NODE_ENV === 'development'),
            enableSlowQueryLogging: config.enableSlowQueryLogging ?? true,
            slowQueryThreshold: config.slowQueryThreshold || 100 // ms
        };
        this.logger = pino({
            name: 'DatabasePool',
            level: process.env.LOG_LEVEL || 'info'
        });
        this.initializePool();
        this.initializePrisma();
        this.setupHealthChecks();
    }
    static getInstance(config) {
        if (!DatabasePool.instance) {
            DatabasePool.instance = new DatabasePool(config);
        }
        return DatabasePool.instance;
    }
    calculateOptimalConnections() {
        // Phoenix's connection formula: ((core_count * 2) + effective_spindle_count)
        // For cloud environments, we use a conservative approach
        const cpuCount = require('os').cpus().length;
        const baseConnections = Math.max((cpuCount * 2) + 4, 20);
        // Scale based on environment
        const environmentMultiplier = process.env.NODE_ENV === 'production' ? 2 : 1;
        return Math.min(baseConnections * environmentMultiplier, 200);
    }
    initializePool() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // Connection pool configuration
            max: this.config.maxConnections,
            min: this.config.minConnections,
            // Timeouts and lifecycle
            acquireTimeoutMillis: this.config.connectionTimeout,
            idleTimeoutMillis: this.config.idleTimeout,
            maxLifetimeMillis: this.config.maxLifetime,
            // Performance optimizations
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
            statement_timeout: 30000,
            query_timeout: 25000,
            application_name: 'astralfield-phoenix',
            // Connection quality
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        // Pool event handlers
        this.pool.on('connect', (client) => {
            this.logger.debug('New database connection established');
            // Set connection-specific optimizations
            client.query(`
        SET statement_timeout = '30s';
        SET lock_timeout = '25s';
        SET idle_in_transaction_session_timeout = '60s';
        SET search_path = public;
      `).catch(err => {
                this.logger.warn('Failed to set connection optimizations:', err);
            });
        });
        this.pool.on('error', (err) => {
            this.logger.error('Database pool error:', err);
            this.recordFailure();
        });
        this.pool.on('remove', () => {
            this.logger.debug('Database connection removed from pool');
        });
    }
    initializePrisma() {
        this.prisma = new PrismaClient({
            log: this.config.enableQueryLogging
                ? [
                    { level: 'query', emit: 'event' },
                    { level: 'error', emit: 'event' },
                    { level: 'warn', emit: 'event' },
                ]
                : [{ level: 'error', emit: 'event' }],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            },
            errorFormat: 'pretty',
        });
        // Query performance monitoring middleware
        this.prisma.$use(async (params, next) => {
            const startTime = Date.now();
            const queryKey = `${params.model || 'raw'}.${params.action}`;
            try {
                const result = await next(params);
                const duration = Date.now() - startTime;
                this.recordQueryMetrics(queryKey, duration);
                // Log slow queries
                if (this.config.enableSlowQueryLogging && duration > this.config.slowQueryThreshold) {
                    this.logger.warn('Slow query detected', {
                        model: params.model,
                        action: params.action,
                        duration: `${duration}ms`,
                        args: this.sanitizeArgs(params.args)
                    });
                }
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                this.recordQueryMetrics(queryKey, duration, true);
                this.logger.error('Query execution failed', {
                    model: params.model,
                    action: params.action,
                    duration: `${duration}ms`,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
        });
        // Prisma event handlers
        if (this.config.enableQueryLogging) {
            this.prisma.$on('query', (e) => {
                if (e.duration > this.config.slowQueryThreshold) {
                    this.logger.debug('Query executed', {
                        query: e.query.substring(0, 200) + (e.query.length > 200 ? '...' : ''),
                        duration: `${e.duration}ms`,
                        params: e.params
                    });
                }
            });
        }
        this.prisma.$on('error', (e) => {
            this.logger.error('Prisma error:', e);
            this.recordFailure();
        });
    }
    setupHealthChecks() {
        // Periodic health check
        setInterval(async () => {
            try {
                await this.healthCheck();
                // Reset circuit breaker if we're in HALF_OPEN state
                if (this.circuitBreakerState === 'HALF_OPEN') {
                    this.circuitBreakerState = 'CLOSED';
                    this.failureCount = 0;
                    this.logger.info('Circuit breaker reset to CLOSED state');
                }
            }
            catch (error) {
                this.logger.warn('Health check failed:', error);
                this.recordFailure();
            }
        }, 30000); // Check every 30 seconds
        // Cleanup old metrics
        setInterval(() => {
            this.cleanupMetrics();
        }, 300000); // Cleanup every 5 minutes
    }
    // Public API
    getPrisma() {
        if (this.circuitBreakerState === 'OPEN') {
            throw new Error('Database circuit breaker is OPEN - service temporarily unavailable');
        }
        return this.prisma;
    }
    async getConnection() {
        if (this.circuitBreakerState === 'OPEN') {
            throw new Error('Database circuit breaker is OPEN - service temporarily unavailable');
        }
        return await this.executeWithRetry(async () => {
            return await this.pool.connect();
        });
    }
    async executeQuery(query, params = [], retries = this.config.retryAttempts) {
        if (this.circuitBreakerState === 'OPEN') {
            throw new Error('Database circuit breaker is OPEN - service temporarily unavailable');
        }
        return await this.executeWithRetry(async () => {
            const client = await this.pool.connect();
            try {
                const startTime = Date.now();
                const result = await client.query(query, params);
                const duration = Date.now() - startTime;
                this.recordQueryMetrics('raw.query', duration);
                if (duration > this.config.slowQueryThreshold) {
                    this.logger.warn('Slow raw query detected', {
                        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
                        duration: `${duration}ms`,
                        paramCount: params.length
                    });
                }
                return result.rows;
            }
            finally {
                client.release();
            }
        }, retries);
    }
    async transaction(operations, timeout = 30000) {
        if (this.circuitBreakerState === 'OPEN') {
            throw new Error('Database circuit breaker is OPEN - service temporarily unavailable');
        }
        return await this.executeWithRetry(async () => {
            return await this.prisma.$transaction(operations, {
                timeout,
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
            });
        });
    }
    async healthCheck() {
        try {
            // Test Prisma connection
            await this.prisma.$queryRaw `SELECT 1 as health_check`;
            // Test pool connection
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        }
        catch (error) {
            this.logger.error('Health check failed:', error);
            throw error;
        }
    }
    getMetrics() {
        const allDurations = Array.from(this.queryMetrics.values()).flat();
        const totalQueries = allDurations.length;
        if (totalQueries === 0) {
            return {
                totalQueries: 0,
                slowQueries: 0,
                avgExecutionTime: 0,
                p95ExecutionTime: 0,
                errorRate: 0
            };
        }
        const slowQueries = allDurations.filter(d => d > this.config.slowQueryThreshold).length;
        const avgExecutionTime = allDurations.reduce((a, b) => a + b, 0) / totalQueries;
        const sorted = allDurations.sort((a, b) => a - b);
        const p95ExecutionTime = sorted[Math.floor(totalQueries * 0.95)];
        return {
            totalQueries,
            slowQueries,
            avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
            p95ExecutionTime,
            errorRate: 0 // Error rate would need additional tracking
        };
    }
    getPoolStats() {
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            maxConnections: this.config.maxConnections,
            circuitBreakerState: this.circuitBreakerState,
            failureCount: this.failureCount
        };
    }
    async disconnect() {
        this.logger.info('Shutting down database connections...');
        try {
            await this.prisma.$disconnect();
            await this.pool.end();
            this.logger.info('Database connections closed successfully');
        }
        catch (error) {
            this.logger.error('Error during database shutdown:', error);
            throw error;
        }
    }
    // Private helper methods
    async executeWithRetry(operation, maxRetries = this.config.retryAttempts, attempt = 1) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt >= maxRetries) {
                this.recordFailure();
                throw error;
            }
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            this.logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.executeWithRetry(operation, maxRetries, attempt + 1);
        }
    }
    recordQueryMetrics(queryKey, duration, isError = false) {
        if (!this.queryMetrics.has(queryKey)) {
            this.queryMetrics.set(queryKey, []);
        }
        const durations = this.queryMetrics.get(queryKey);
        durations.push(duration);
        // Keep only last 1000 measurements per query type
        if (durations.length > 1000) {
            durations.shift();
        }
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.circuitBreakerThreshold) {
            this.circuitBreakerState = 'OPEN';
            this.logger.error(`Circuit breaker opened after ${this.failureCount} failures`);
            // Attempt to reset circuit breaker after timeout
            setTimeout(() => {
                if (this.circuitBreakerState === 'OPEN') {
                    this.circuitBreakerState = 'HALF_OPEN';
                    this.logger.info('Circuit breaker moved to HALF_OPEN state');
                }
            }, this.circuitBreakerTimeout);
        }
    }
    cleanupMetrics() {
        // Remove old metrics to prevent memory leaks
        for (const [key, durations] of this.queryMetrics.entries()) {
            if (durations.length > 500) {
                this.queryMetrics.set(key, durations.slice(-500));
            }
        }
    }
    sanitizeArgs(args) {
        // Remove sensitive data from logs
        if (!args)
            return args;
        const sensitive = ['password', 'token', 'secret', 'key'];
        const sanitized = { ...args };
        for (const field of sensitive) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
}
// Export singleton instance
export const dbPool = DatabasePool.getInstance();
export const prisma = dbPool.getPrisma();
// Export for testing and advanced usage
export { DatabasePool };
// Graceful shutdown handler
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database connections...');
    try {
        await dbPool.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database connections...');
    try {
        await dbPool.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});
//# sourceMappingURL=database-pool.js.map