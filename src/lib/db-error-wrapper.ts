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

// Enhanced Prisma client with error tracking
class TrackedPrismaClient extends PrismaClient {
  private operationMetrics: Map<string, DBMetrics> = new Map();
  private activeConnections = 0;
  private slowQueryThreshold = 1000; // 1 second
  private criticalQueryThreshold = 5000; // 5 seconds

  constructor(options?: Prisma.PrismaClientOptions) {
    super({
      ...options,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' }
      ]
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Temporarily disable event listeners to fix TypeScript issues
    // TODO: Implement proper Prisma event type handling
    
    // Performance monitoring middleware
    this.$use(async (params, next) => {
      const start = Date.now();
      const operationName = `${params.model}.${params.action}`;
      
      try {
        const result = await next(params);
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
                model: params.model,
                action: params.action
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
              model: params.model,
              action: params.action
            }
          }
        );

        this.updateOperationMetrics(operationName, duration, true);
        throw error;
      }
    });
  }

  private updateOperationMetrics(target: string, duration: number, isError: boolean) {
    const existing = this.operationMetrics.get(target) || {
      operationCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0,
      errorRate: 0,
      slowQueryCount: 0
    };

    existing.operationCount++;
    existing.totalDuration += duration;
    existing.averageDuration = existing.totalDuration / existing.operationCount;
    
    if (isError) {
      existing.errorCount++;
    }
    
    existing.errorRate = (existing.errorCount / existing.operationCount) * 100;

    this.operationMetrics.set(target, existing);
  }

  private updateSlowQueryMetrics(target: string, duration: number) {
    const existing = this.operationMetrics.get(target);
    if (existing) {
      existing.slowQueryCount++;
      this.operationMetrics.set(target, existing);
    }
  }

  // Enhanced query execution with error tracking
  async executeWithTracking<T>(
    operation: () => Promise<T>,
    context: DBOperationContext
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = `${context.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.activeConnections++;
      
      // Log operation start
      logger.debug({
        database: {
          operationId,
          operation: context.operation,
          model: context.model,
          method: context.method,
          userId: context.userId,
          requestId: context.requestId
        }
      }, 'Database operation started');

      const result = await operation();
      const duration = Date.now() - startTime;

      // Log successful operation
      logPerformance(`db_${context.operation}`, duration, {
        operationId,
        model: context.model,
        method: context.method,
        success: true
      });

      // Update metrics
      this.updateOperationMetrics(context.operation, duration, false);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const dbError = this.enhanceDatabaseError(error as Error, context, duration);

      // Log error with context
      logError(dbError, {
        operationId,
        operation: context.operation,
        model: context.model,
        method: context.method,
        duration,
        userId: context.userId,
        requestId: context.requestId
      });

      // Capture error for monitoring
      captureError(dbError, ErrorCategory.DATABASE_ERROR, {
        component: 'database',
        action: context.operation,
        userId: context.userId,
        requestId: context.requestId,
        metadata: {
          ...context.metadata,
          operationId,
          duration,
          model: context.model,
          method: context.method
        }
      });

      // Update error metrics
      this.updateOperationMetrics(context.operation, duration, true);

      throw dbError;

    } finally {
      this.activeConnections--;
    }
  }

  private enhanceDatabaseError(error: Error, context: DBOperationContext, duration: number): Error {
    const message = error.message;
    
    // Enhance Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleKnownPrismaError(error, context, duration);
    }
    
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return createDatabaseError(
        'Unknown database error occurred',
        error
      );
    }
    
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      const criticalError = createDatabaseError(
        'Critical database engine error',
        error
      );
      criticalError.severity = ErrorSeverity.CRITICAL;
      return criticalError;
    }
    
    if (error instanceof Prisma.PrismaClientInitializationError) {
      const criticalError = createDatabaseError(
        'Database connection initialization failed',
        error
      );
      criticalError.severity = ErrorSeverity.CRITICAL;
      return criticalError;
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      const validationError = createDatabaseError(
        'Database query validation failed',
        error
      );
      validationError.severity = ErrorSeverity.LOW;
      return validationError;
    }

    // Generic database error
    return createDatabaseError(
      'Database operation failed',
      error
    );
  }

  private handleKnownPrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    context: DBOperationContext,
    duration: number
  ): Error {
    const { code, meta } = error;
    
    switch (code) {
      case 'P2000':
        return createDatabaseError('Value too long for column', error);
      
      case 'P2001':
        return createDatabaseError('Record not found', error);
      
      case 'P2002':
        return createDatabaseError(
          `Unique constraint violation: ${meta?.target || 'unknown field'}`,
          error
        );
      
      case 'P2003':
        return createDatabaseError('Foreign key constraint violation', error);
      
      case 'P2004':
        return createDatabaseError('Database constraint violation', error);
      
      case 'P2005':
        return createDatabaseError('Invalid value for field', error);
      
      case 'P2006':
        return createDatabaseError('Invalid value provided', error);
      
      case 'P2007':
        return createDatabaseError('Data validation error', error);
      
      case 'P2008':
        return createDatabaseError('Query parsing failed', error);
      
      case 'P2009':
        return createDatabaseError('Query validation failed', error);
      
      case 'P2010':
        const criticalError = createDatabaseError('Raw query failed', error);
        criticalError.severity = ErrorSeverity.HIGH;
        return criticalError;
      
      case 'P2011':
        return createDatabaseError('Null constraint violation', error);
      
      case 'P2012':
        return createDatabaseError('Missing required value', error);
      
      case 'P2013':
        return createDatabaseError('Missing required argument', error);
      
      case 'P2014':
        return createDatabaseError('Relation violation', error);
      
      case 'P2015':
        return createDatabaseError('Related record not found', error);
      
      case 'P2016':
        return createDatabaseError('Query interpretation error', error);
      
      case 'P2017':
        return createDatabaseError('Records not connected', error);
      
      case 'P2018':
        return createDatabaseError('Required connected records not found', error);
      
      case 'P2019':
        return createDatabaseError('Input error', error);
      
      case 'P2020':
        return createDatabaseError('Value out of range', error);
      
      case 'P2021':
        return createDatabaseError('Table does not exist', error);
      
      case 'P2022':
        return createDatabaseError('Column does not exist', error);
      
      case 'P2023':
        return createDatabaseError('Inconsistent column data', error);
      
      case 'P2024':
        const timeoutError = createDatabaseError(
          `Connection timeout after ${duration}ms`,
          error
        );
        timeoutError.severity = ErrorSeverity.HIGH;
        return timeoutError;
      
      case 'P2025':
        return createDatabaseError('Record not found for operation', error);
      
      case 'P2026':
        return createDatabaseError('Unsupported feature', error);
      
      case 'P2027':
        const connectionError = createDatabaseError(
          'Multiple database errors occurred',
          error
        );
        connectionError.severity = ErrorSeverity.HIGH;
        return connectionError;
      
      default:
        return createDatabaseError(
          `Database error ${code}: ${error.message}`,
          error
        );
    }
  }

  // Get database metrics
  getMetrics(): Map<string, DBMetrics> {
    // Add connection count to each metric
    this.operationMetrics.forEach((metric) => {
      metric.connectionCount = this.activeConnections;
    });
    
    return new Map(this.operationMetrics);
  }

  // Clear metrics (useful for testing or periodic resets)
  clearMetrics(): void {
    this.operationMetrics.clear();
  }

  // Get health status
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      activeConnections: number;
      totalOperations: number;
      averageErrorRate: number;
      averageDuration: number;
    };
  } {
    let totalOperations = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    this.operationMetrics.forEach((metric) => {
      totalOperations += metric.operationCount;
      totalErrors += metric.errorCount;
      totalDuration += metric.totalDuration;
    });

    const averageErrorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
    const averageDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (averageErrorRate > 10 || averageDuration > this.criticalQueryThreshold) {
      status = 'unhealthy';
    } else if (averageErrorRate > 5 || averageDuration > this.slowQueryThreshold) {
      status = 'degraded';
    }

    return {
      status,
      metrics: {
        activeConnections: this.activeConnections,
        totalOperations,
        averageErrorRate,
        averageDuration
      }
    };
  }
}

// Create tracked Prisma instance
export const trackedPrisma = new TrackedPrismaClient();

// Utility wrapper for database operations
export async function withDBErrorTracking<T>(
  operation: () => Promise<T>,
  context: Partial<DBOperationContext>
): Promise<T> {
  const fullContext: DBOperationContext = {
    operation: 'unknown',
    ...context
  };

  return trackedPrisma.executeWithTracking(operation, fullContext);
}

// Model-specific operation wrappers
export const trackedDB = {
  // User operations
  user: {
    findMany: (args?: Prisma.UserFindManyArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.user.findMany(args),
        { operation: 'user.findMany', model: 'User', method: 'findMany', ...context }
      ),
    
    findUnique: (args: Prisma.UserFindUniqueArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.user.findUnique(args),
        { operation: 'user.findUnique', model: 'User', method: 'findUnique', ...context }
      ),
    
    create: (args: Prisma.UserCreateArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.user.create(args),
        { operation: 'user.create', model: 'User', method: 'create', ...context }
      ),
    
    update: (args: Prisma.UserUpdateArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.user.update(args),
        { operation: 'user.update', model: 'User', method: 'update', ...context }
      ),
    
    delete: (args: Prisma.UserDeleteArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.user.delete(args),
        { operation: 'user.delete', model: 'User', method: 'delete', ...context }
      )
  },

  // League operations
  league: {
    findMany: (args?: Prisma.LeagueFindManyArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.league.findMany(args),
        { operation: 'league.findMany', model: 'League', method: 'findMany', ...context }
      ),
    
    findUnique: (args: Prisma.LeagueFindUniqueArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.league.findUnique(args),
        { operation: 'league.findUnique', model: 'League', method: 'findUnique', ...context }
      ),
    
    create: (args: Prisma.LeagueCreateArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.league.create(args),
        { operation: 'league.create', model: 'League', method: 'create', ...context }
      ),
    
    update: (args: Prisma.LeagueUpdateArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.league.update(args),
        { operation: 'league.update', model: 'League', method: 'update', ...context }
      )
  },

  // Team operations
  team: {
    findMany: (args?: Prisma.TeamFindManyArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.team.findMany(args),
        { operation: 'team.findMany', model: 'Team', method: 'findMany', ...context }
      ),
    
    findUnique: (args: Prisma.TeamFindUniqueArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.team.findUnique(args),
        { operation: 'team.findUnique', model: 'Team', method: 'findUnique', ...context }
      ),
    
    update: (args: Prisma.TeamUpdateArgs, context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.team.update(args),
        { operation: 'team.update', model: 'Team', method: 'update', ...context }
      )
  },

  // Generic operations for other models
  raw: {
    query: (sql: string, values?: any[], context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.$queryRaw`${sql}`,
        { operation: 'raw.query', method: 'queryRaw', ...context }
      ),
    
    execute: (sql: string, values?: any[], context?: Partial<DBOperationContext>) =>
      withDBErrorTracking(
        () => trackedPrisma.$executeRaw`${sql}`,
        { operation: 'raw.execute', method: 'executeRaw', ...context }
      )
  },

  // Transaction wrapper
  transaction: <T>(
    operations: (prisma: TrackedPrismaClient) => Promise<T>,
    context?: Partial<DBOperationContext>
  ): Promise<T> =>
    withDBErrorTracking(
      () => trackedPrisma.$transaction(operations),
      { operation: 'transaction', method: 'transaction', ...context }
    )
};

export default trackedDB;