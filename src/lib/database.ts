/**
 * Enterprise Database Connection Manager for AstralField
 * Handles connection pooling, retries, monitoring, and graceful degradation
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { withRetry } from './error-handling';

// Database connection configuration
interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  logQueries: boolean;
  slowQueryThresholdMs: number;
}

// Connection statistics
interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  uptime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

// Database health status
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthCheck {
  status: HealthStatus;
  details: {
    connection: boolean;
    responseTime: number;
    activeConnections: number;
    queuedConnections: number;
    lastError?: string;
  };
}

class DatabaseManager {
  private prisma: PrismaClient | null = null;
  private config: DatabaseConfig;
  private stats: ConnectionStats;
  private startTime: number;
  private queryTimes: number[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionPool: Set<PrismaClient> = new Set();

  constructor() {
    this.startTime = Date.now();
    this.config = this.getConfig();
    this.stats = this.initializeStats();
    // Don't auto-initialize during construction to avoid build-time database connections
    // Initialization happens on first database access
  }

  private getConfig(): DatabaseConfig {
    return {
      url: process.env.DATABASE_URL || '',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      queryTimeoutMs: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
      retryDelayMs: parseInt(process.env.DB_RETRY_DELAY || '1000'),
      logQueries: process.env.DB_LOG_QUERIES === 'true',
      slowQueryThresholdMs: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
    };
  }

  private initializeStats(): ConnectionStats {
    return {
      totalConnections: 0,
      activeConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      avgQueryTime: 0,
      uptime: 0,
    };
  }

  private initializeSync(): void {
    try {
      logger.info('Initializing database connection pool...');
      
      // Create main Prisma client with optimized settings (no connection testing)
      this.prisma = new PrismaClient({
        log: this.config.logQueries 
          ? [
              { level: 'query', emit: 'event' },
              { level: 'error', emit: 'event' },
              { level: 'warn', emit: 'event' },
            ]
          : [],
        datasources: {
          db: {
            url: this.config.url,
          },
        },
      });

      // Set up query logging and monitoring
      if (this.config.logQueries) {
        this.setupQueryLogging();
      }

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      logger.info('Database connection pool initialized successfully');

    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize database connection pool');
      throw error;
    }
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing database connection pool...');
      
      // Create main Prisma client with optimized settings
      this.prisma = new PrismaClient({
        log: this.config.logQueries 
          ? [
              { level: 'query', emit: 'event' },
              { level: 'error', emit: 'event' },
              { level: 'warn', emit: 'event' },
            ]
          : [],
        datasources: {
          db: {
            url: this.config.url,
          },
        },
      });

      // Set up query logging and monitoring
      if (this.config.logQueries) {
        this.setupQueryLogging();
      }

      // Test initial connection
      await this.testConnection();

      // Start health check monitoring
      this.startHealthChecking();

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      logger.info('Database connection pool initialized successfully');

    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize database connection pool');
      throw error;
    }
  }

  private setupQueryLogging(): void {
    if (!this.prisma) return;

    this.prisma.$on('query', (event: any) => {
      const duration = event.duration;
      this.recordQueryTime(duration);
      
      if (duration > this.config.slowQueryThresholdMs) {
        this.stats.slowQueries++;
        logger.warn({ duration, query: event.query.substring(0, 200) }, 'Slow query detected');
      }

      if (this.config.logQueries) {
        logger.debug({ duration, query: event.query.substring(0, 200) }, 'Database query');
      }
    });

    this.prisma.$on('error', (event: any) => {
      this.stats.failedQueries++;
      this.stats.lastError = event.message;
      this.stats.lastErrorTime = new Date();
      
      logger.error({ message: event.message }, 'Database error');
    });

    this.prisma.$on('warn', (event: any) => {
      logger.warn({ message: event.message }, 'Database warning');
    });
  }

  private recordQueryTime(duration: number): void {
    this.stats.totalQueries++;
    this.queryTimes.push(duration);

    // Keep only last 1000 query times for average calculation
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }

    // Update average query time
    this.stats.avgQueryTime = this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;
  }

  private async testConnection(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    const startTime = Date.now();
    await this.prisma.$queryRaw`SELECT 1 as test`;
    const responseTime = Date.now() - startTime;

    logger.info('Database connection test successful');
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error({ error }, 'Health check failed');
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    let connectionWorking = false;

    try {
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1 as health_check`;
        connectionWorking = true;
      }
    } catch (error) {
      logger.warn({ error }, 'Database health check failed');
    }

    const responseTime = Date.now() - startTime;
    this.stats.uptime = Date.now() - this.startTime;

    const health: HealthCheck = {
      status: this.determineHealthStatus(connectionWorking, responseTime),
      details: {
        connection: connectionWorking,
        responseTime,
        activeConnections: this.stats.activeConnections,
        queuedConnections: 0, // Prisma doesn't expose this directly
        lastError: this.stats.lastError,
      },
    };

    return health;
  }

  private determineHealthStatus(connectionWorking: boolean, responseTime: number): HealthStatus {
    if (!connectionWorking) {
      return 'unhealthy';
    }

    if (responseTime > 5000 || this.stats.failedQueries > 10) {
      return 'degraded';
    }

    return 'healthy';
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      logger.info('Shutting down database connections...');
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.prisma) {
        await this.prisma.$disconnect();
        this.prisma = null;
      }

      // Close any additional connections in the pool
      for (const client of this.connectionPool) {
        await client.$disconnect();
      }
      this.connectionPool.clear();

      logger.info('Database connections closed');
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('beforeExit', shutdown);
  }

  /**
   * Get the main Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      // Lazy initialization - only initialize when actually needed
      this.initializeSync();
    }
    return this.prisma!;
  }

  /**
   * Execute a database operation with retry logic
   */
  async executeWithRetry<T>(
    operation: (client: PrismaClient) => Promise<T>,
    context?: string
  ): Promise<T> {
    const client = this.getClient();
    
    return withRetry(
      () => operation(client),
      {
        maxAttempts: this.config.retryAttempts,
        delay: this.config.retryDelayMs,
        shouldRetry: (error) => {
          // Retry on connection errors, but not on application logic errors
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            const retryableCodes = ['P1001', 'P1008', 'P1017']; // Connection errors
            return retryableCodes.includes(error.code);
          }
          return error instanceof Prisma.PrismaClientUnknownRequestError;
        },
      }
    );
  }

  /**
   * Execute a transaction with retry logic
   */
  async executeTransaction<T>(
    operations: (client: Prisma.TransactionClient) => Promise<T>,
    options?: {
      timeout?: number;
      maxWait?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    const client = this.getClient();
    
    return this.executeWithRetry(async () => {
      return client.$transaction(operations, options);
    }, 'transaction');
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<HealthCheck> {
    return this.performHealthCheck();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    this.queryTimes = [];
  }

  /**
   * Force disconnect and reconnect
   */
  async reconnect(): Promise<void> {
    logger.info('Forcing database reconnection...');
    
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    await this.initialize();
  }

  /**
   * Check if database is ready
   */
  async isReady(): Promise<boolean> {
    try {
      if (!this.prisma) return false;
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a dedicated client for long-running operations
   */
  async getDedicatedClient(): Promise<PrismaClient> {
    const client = new PrismaClient({
      datasources: {
        db: {
          url: this.config.url,
        },
      },
    });

    this.connectionPool.add(client);
    this.stats.totalConnections++;

    return client;
  }

  /**
   * Release a dedicated client
   */
  async releaseDedicatedClient(client: PrismaClient): Promise<void> {
    await client.$disconnect();
    this.connectionPool.delete(client);
  }

  /**
   * Execute raw SQL query with monitoring
   */
  async executeRawQuery<T = any>(
    query: string,
    params?: any[]
  ): Promise<T> {
    const client = this.getClient();
    const startTime = Date.now();

    try {
      const result = await client.$queryRawUnsafe<T>(query, ...(params || []));
      this.recordQueryTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.failedQueries++;
      logger.error({ query: query.substring(0, 200), error }, 'Raw query failed');
      throw error;
    }
  }

  /**
   * Bulk operations with batching
   */
  async bulkOperation<T>(
    items: T[],
    operation: (batch: T[], client: PrismaClient) => Promise<any>,
    batchSize: number = 100
  ): Promise<any[]> {
    const results: any[] = [];
    const client = this.getClient();

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        const result = await operation(batch, client);
        results.push(result);
      } catch (error) {
        logger.error({ 
          batchIndex: Math.floor(i / batchSize),
          batchSize: batch.length,
          error 
        }, 'Bulk operation batch failed');
        throw error;
      }
    }

    return results;
  }
}

// Export singleton instance
export const database = new DatabaseManager();

// Export types and utilities
export type { ConnectionStats, HealthCheck, HealthStatus };

// Convenience function to get Prisma client
export const getPrismaClient = (): PrismaClient => database.getClient();

// Health check endpoint helper
export const checkDatabaseHealth = (): Promise<HealthCheck> => database.getHealth();

// Migration runner
export async function runMigrations(): Promise<void> {
  const client = database.getClient();
  
  try {
    logger.info('Running database migrations...');
    
    // This would typically use Prisma CLI, but we can check migration status
    const migrations = await client.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `;
    
    logger.info(`Found ${migrations.length} completed migrations`);
    
  } catch (error) {
    logger.error({ error }, 'Migration check failed');
    throw error;
  }
}

// Database seeding utility
export async function seedDatabase(): Promise<void> {
  const client = database.getClient();
  
  try {
    logger.info('Seeding database...');
    
    // Check if data already exists
    const userCount = await client.user.count();
    if (userCount > 0) {
      logger.info('Database already contains data, skipping seed');
      return;
    }

    // Run seeding operations
    await database.executeTransaction(async (tx) => {
      // Add your seeding logic here
      logger.info('Database seeded successfully');
    });
    
  } catch (error) {
    logger.error({ error }, 'Database seeding failed');
    throw error;
  }
}

export default database;