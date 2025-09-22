/**
 * Database Error Tracking Wrapper
 * Comprehensive error tracking and monitoring for database operations
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger, logError, logPerformance, logDatabaseQuery } from './logger';
import { captureError, ErrorCategory, ErrorSeverity } from './error-tracking';
import { createDatabaseError } from './api-error-middleware';

// Database operation context
interface DBOperationContext {
  operation: string;
  model?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Database metrics
interface DBMetrics {
  operationCount: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
  errorRate: number;
  slowQueryCount: number;
  connectionCount?: number;
}

// Create base Prisma client
const basePrisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' }
  ]
});

// Enhanced Prisma client with error tracking using Prisma v6 extensions
class TrackedPrismaClient {
  private operationMetrics: Map<string, DBMetrics> = new Map();
  private activeConnections = 0;
  private slowQueryThreshold = 1000; // 1 second
  private criticalQueryThreshold = 5000; // 5 seconds
  public client: ReturnType<typeof this.createExtendedClient>;

  constructor(options?: Prisma.PrismaClientOptions) {
    this.client = this.createExtendedClient();
  }

  private createExtendedClient() {
    return basePrisma.$extends({
      name: 'TrackedPrismaClient',
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }) => {
            const start = Date.now();
            const operationName = `${model}.${operation}`;
            
            try {
              const result = await query(args);
              const duration = Date.now() - start;
              
              // Track slow queries
              if (duration > this.slowQueryThreshold) {
                const severity = duration > this.criticalQueryThreshold 
                  ? ErrorSeverity.HIGH 
                  : ErrorSeverity.MEDIUM;

                captureError(
                  new Error(`Slow database query detected`),
                  ErrorCategory.PERFORMANCE_ERROR,
                  {
                    component: 'database',
                    metadata: {
                      operation: operationName,
                      duration,
                      model,
                      action: operation
                    }
                  }
                );

                this.updateSlowQueryMetrics(operationName, duration);
              }

              // Update performance metrics
              this.updateOperationMetrics(operationName, duration, false);
              
              return result;
            } catch (error) {
              const duration = Date.now() - start;
              
              logError(error as Error, {
                context: 'prisma_operation',
                operation: operationName,
                duration
              });

              captureError(
                error as Error,
                ErrorCategory.DATABASE_ERROR,
                {
                  component: 'prisma',
                  metadata: {
                    operation: operationName,
                    duration,
                    model,
                    action: operation
                  }
                }
              );

              this.updateOperationMetrics(operationName, duration, true);
              throw error;
            }
          }
        }
      }
    });
  }

  private updateSlowQueryMetrics(operation: string, duration: number) {
    const metrics = this.operationMetrics.get(operation) || this.createEmptyMetrics();
    metrics.slowQueryCount++;
    this.operationMetrics.set(operation, metrics);
    
    // Log slow query
    logger.warn({
      operation,
      duration,
      threshold: this.slowQueryThreshold,
      metrics
    }, `Slow database query detected: ${operation}`);
  }

  private updateOperationMetrics(operation: string, duration: number, isError: boolean) {
    const metrics = this.operationMetrics.get(operation) || this.createEmptyMetrics();
    
    metrics.operationCount++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.operationCount;
    
    if (isError) {
      metrics.errorCount++;
    }
    
    metrics.errorRate = metrics.errorCount / metrics.operationCount;
    
    this.operationMetrics.set(operation, metrics);
    
    // Log performance metrics periodically
    if (metrics.operationCount % 100 === 0) {
      logPerformance('database_operation', metrics.averageDuration, {
        operation,
        metrics
      });
    }
  }

  private createEmptyMetrics(): DBMetrics {
    return {
      operationCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0,
      errorRate: 0,
      slowQueryCount: 0,
      connectionCount: this.activeConnections
    };
  }

  // Database health check
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    message?: string;
  }> {
    const start = Date.now();
    
    try {
      await basePrisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      const latency = Date.now() - start;
      
      logError(error as Error, {
        context: 'database_health_check',
        latency
      });
      
      return {
        healthy: false,
        latency,
        message: (error as Error).message
      };
    }
  }

  // Connection management
  async connect(context?: DBOperationContext): Promise<void> {
    try {
      await basePrisma.$connect();
      this.activeConnections++;
      
      logger.info({
        context,
        activeConnections: this.activeConnections
      }, 'Database connection established');
    } catch (error) {
      logError(error as Error, {
        context: 'database_connection',
        ...context
      });
      
      throw createDatabaseError(
        'Failed to connect to database',
        error as Error
      );
    }
  }

  async disconnect(context?: DBOperationContext): Promise<void> {
    try {
      await basePrisma.$disconnect();
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      
      logger.info({
        context,
        activeConnections: this.activeConnections
      }, 'Database connection closed');
    } catch (error) {
      logError(error as Error, {
        context: 'database_disconnection',
        ...context
      });
    }
  }

  // Transaction wrapper with error tracking
  async transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
      context?: DBOperationContext;
    }
  ): Promise<T> {
    const start = Date.now();
    const context = options?.context;
    
    try {
      const result = await basePrisma.$transaction(fn, {
        maxWait: options?.maxWait,
        timeout: options?.timeout,
        isolationLevel: options?.isolationLevel
      });
      
      const duration = Date.now() - start;
      
      logPerformance('database_transaction', duration, {
        context
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logError(error as Error, {
        context: 'database_transaction',
        duration,
        ...context
      });
      
      captureError(
        error as Error,
        ErrorCategory.DATABASE_ERROR,
        {
          component: 'database_transaction',
          metadata: {
            duration,
            ...context
          }
        }
      );
      
      throw createDatabaseError(
        'Transaction failed',
        error as Error
      );
    }
  }

  // Retry mechanism for transient failures
  async withRetry<T>(
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      context?: DBOperationContext;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    const context = options?.context;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          if (attempt < maxRetries) {
            logger.warn({
              error,
              attempt,
              maxRetries,
              context
            }, `Database operation failed, retrying in ${retryDelay}ms`);
            
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }
        }
        
        // Non-retryable error or max retries reached
        break;
      }
    }
    
    // All retries failed
    captureError(
      lastError!,
      ErrorCategory.DATABASE_ERROR,
      {
        component: 'database_retry',
        metadata: {
          maxRetries,
          ...context
        }
      }
    );
    
    throw createDatabaseError(
      'Database operation failed after retries',
      lastError!
    );
  }

  private isRetryableError(error: any): boolean {
    // Check for common retryable database errors
    const retryableErrors = [
      'P1001', // Can't reach database server
      'P1002', // Database server timeout
      'P2024', // Connection pool timeout
      'P2034', // Write conflict
    ];
    
    if (error?.code && retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check for network/connection errors
    const message = error?.message?.toLowerCase() || '';
    const retryablePatterns = [
      'connection',
      'timeout',
      'econnrefused',
      'enotfound',
      'socket hang up'
    ];
    
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  // Get metrics for monitoring
  getMetrics(): Map<string, DBMetrics> {
    return new Map(this.operationMetrics);
  }

  clearMetrics(): void {
    this.operationMetrics.clear();
  }

  // Get the underlying Prisma client (for direct access when needed)
  get prisma() {
    return this.client;
  }
}

// Create singleton instance
let trackedPrismaClient: TrackedPrismaClient | null = null;

export function getTrackedPrismaClient(): TrackedPrismaClient {
  if (!trackedPrismaClient) {
    trackedPrismaClient = new TrackedPrismaClient();
  }
  return trackedPrismaClient;
}

// Export the wrapped client for use
export const prismaWithTracking = getTrackedPrismaClient();

// Export types
export type { DBOperationContext, DBMetrics };

// Re-export Prisma types
export { Prisma };