/**
 * Comprehensive Error Handling and Fallback System for Live Scoring
 * Provides robust error handling, recovery mechanisms, and fallback data
 */

import { prisma as db } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';

export interface ErrorContext {
  service: string;
  operation: string;
  leagueId?: string;
  week?: number;
  additionalInfo?: Record<string, any>;
}

export interface FallbackData {
  liveScores: any | null;
  gameStatus: any | null;
  timestamp: Date;
  source: 'cache' | 'database' | 'mock' | 'none';
  isStale: boolean;
  reliability: 'high' | 'medium' | 'low' | 'none';
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'cache' | 'mock' | 'skip';
  delay?: number;
  maxAttempts?: number;
  description: string;
}

export class ScoringErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();
  private circuitBreakers: Map<string, { isOpen: boolean; failures: number; lastFailure: Date }> = new Map();
  
  private readonly MAX_ERRORS_PER_SERVICE = 5;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private readonly ERROR_WINDOW = 600000; // 10 minutes

  /**
   * Handle errors with context-aware recovery
   */
  async handleError(error: Error, context: ErrorContext): Promise<RecoveryAction> {
    const errorKey = `${context.service}:${context.operation}`;
    
    // Log the error
    this.logError(error, context);
    
    // Update error tracking
    this.updateErrorTracking(errorKey);
    
    // Check circuit breaker
    if (this.isCircuitOpen(errorKey)) {
      return {
        type: 'fallback',
        description: 'Service circuit breaker is open, using fallback data'
      };
    }
    
    // Determine recovery action based on error type and context
    return this.determineRecoveryAction(error, context, errorKey);
  }

  /**
   * Get fallback data for a league
   */
  async getFallbackData(leagueId: string, week?: number): Promise<FallbackData> {
    try {
      // Try cache first
      const cachedData = await this.getCachedData(leagueId, week);
      if (cachedData) {
        return cachedData;
      }

      // Try database
      const dbData = await this.getDatabaseFallback(leagueId, week);
      if (dbData) {
        return dbData;
      }

      // Generate mock data as last resort
      return this.generateMockData(leagueId, week);

    } catch (error) {
      handleComponentError(error as Error, 'scoringErrorHandler');
      return this.generateEmptyFallback();
    }
  }

  /**
   * Attempt service recovery
   */
  async attemptRecovery(service: string, operation: string): Promise<boolean> {
    const errorKey = `${service}:${operation}`;
    
    try {
      // Reset circuit breaker if enough time has passed
      if (this.shouldResetCircuitBreaker(errorKey)) {
        this.resetCircuitBreaker(errorKey);
      }

      // Clear error count if in different time window
      if (this.shouldResetErrorCount(errorKey)) {
        this.errorCounts.delete(errorKey);
      }

      return true;

    } catch (error) {
      handleComponentError(error as Error, 'scoringErrorHandler');
      return false;
    }
  }

  /**
   * Check service health
   */
  getServiceHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      errorCount: number;
      circuitOpen: boolean;
      lastError: Date | null;
    }>;
  } {
    const services: Record<string, any> = {};
    let healthyServices = 0;
    let totalServices = 0;

    // Analyze each service
    for (const [key, errorCount] of this.errorCounts.entries()) {
      totalServices++;
      const [service] = key.split(':');
      const circuitBreaker = this.circuitBreakers.get(key);
      const lastError = this.lastErrors.get(key);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (circuitBreaker?.isOpen) {
        status = 'unhealthy';
      } else if (errorCount > this.MAX_ERRORS_PER_SERVICE / 2) {
        status = 'degraded';
      } else {
        healthyServices++;
      }

      if (!services[service]) {
        services[service] = {
          status,
          errorCount,
          circuitOpen: circuitBreaker?.isOpen || false,
          lastError
        };
      } else {
        // Aggregate if multiple operations for same service
        services[service].errorCount += errorCount;
        if (status === 'unhealthy' || services[service].status === 'unhealthy') {
          services[service].status = 'unhealthy';
        } else if (status === 'degraded') {
          services[service].status = 'degraded';
        }
      }
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const healthPercentage = totalServices > 0 ? healthyServices / totalServices : 1;
    
    if (healthPercentage < 0.5) {
      overall = 'unhealthy';
    } else if (healthPercentage < 0.8) {
      overall = 'degraded';
    }

    return { overall, services };
  }

  /**
   * Private helper methods
   */
  private logError(error: Error, context: ErrorContext): void {
    console.error(`🚨 Scoring Error [${context.service}:${context.operation}]:`, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  private updateErrorTracking(errorKey: string): void {
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
    this.lastErrors.set(errorKey, new Date());

    // Check if circuit breaker should be opened
    if (count + 1 >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuitBreaker(errorKey);
    }
  }

  private isCircuitOpen(errorKey: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(errorKey);
    return circuitBreaker?.isOpen || false;
  }

  private openCircuitBreaker(errorKey: string): void {
    this.circuitBreakers.set(errorKey, {
      isOpen: true,
      failures: this.errorCounts.get(errorKey) || 0,
      lastFailure: new Date()
    });
    
    console.warn(`⚠️ Circuit breaker opened for ${errorKey}`);
  }

  private resetCircuitBreaker(errorKey: string): void {
    this.circuitBreakers.delete(errorKey);
    console.log(`✅ Circuit breaker reset for ${errorKey}`);
  }

  private shouldResetCircuitBreaker(errorKey: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(errorKey);
    if (!circuitBreaker?.isOpen) return false;

    const timeSinceFailure = Date.now() - circuitBreaker.lastFailure.getTime();
    return timeSinceFailure > this.CIRCUIT_BREAKER_TIMEOUT;
  }

  private shouldResetErrorCount(errorKey: string): boolean {
    const lastError = this.lastErrors.get(errorKey);
    if (!lastError) return false;

    const timeSinceError = Date.now() - lastError.getTime();
    return timeSinceError > this.ERROR_WINDOW;
  }

  private determineRecoveryAction(error: Error, context: ErrorContext, errorKey: string): RecoveryAction {
    const errorCount = this.errorCounts.get(errorKey) || 0;

    // Network/API errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      if (errorCount < 3) {
        return {
          type: 'retry',
          delay: Math.min(1000 * Math.pow(2, errorCount), 10000), // Exponential backoff
          maxAttempts: 3,
          description: 'Network error, retrying with backoff'
        };
      } else {
        return {
          type: 'fallback',
          description: 'Network consistently failing, using fallback data'
        };
      }
    }

    // Database errors
    if (error.message.includes('database') || error.message.includes('prisma')) {
      return {
        type: 'cache',
        description: 'Database error, using cached data'
      };
    }

    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return {
        type: 'retry',
        delay: 60000, // 1 minute
        maxAttempts: 2,
        description: 'Rate limited, waiting before retry'
      };
    }

    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('401')) {
      return {
        type: 'fallback',
        description: 'Authentication error, using cached data'
      };
    }

    // Unknown errors
    return {
      type: 'fallback',
      description: 'Unknown error, using fallback mechanisms'
    };
  }

  private async getCachedData(leagueId: string, week?: number): Promise<FallbackData | null> {
    try {
      // This would integrate with your caching system
      // For now, return null to continue to next fallback
      return null;
    } catch (error) {
      handleComponentError(error as Error, 'scoringErrorHandler');
      return null;
    }
  }

  private async getDatabaseFallback(leagueId: string, week?: number): Promise<FallbackData | null> {
    try {
      const league = await db.league.findUnique({
        where: { id: leagueId },
        select: { currentWeek: true, season: true }
      });

      if (!league) return null;

      const targetWeek = week || league.currentWeek || 1;

      const matchups = await db.matchup.findMany({
        where: {
          leagueId,
          week: targetWeek
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } }
        }
      });

      const liveScores = {
        leagueId,
        week: targetWeek,
        season: league.season,
        matchups: matchups.map(m => ({
          matchupId: m.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeTeamName: m.homeTeam.name,
          awayTeamName: m.awayTeam.name,
          homeScore: Number(m.homeScore) || 0,
          awayScore: Number(m.awayScore) || 0,
          homeProjectedScore: Number(m.homeScore) || 0,
          awayProjectedScore: Number(m.awayScore) || 0,
          isComplete: m.isComplete,
          playerScores: []
        })),
        lastUpdated: new Date().toISOString(),
        isLive: false,
        nextUpdate: new Date(Date.now() + 300000).toISOString()
      };

      return {
        liveScores,
        gameStatus: null,
        timestamp: new Date(),
        source: 'database',
        isStale: true,
        reliability: 'medium'
      };

    } catch (error) {
      handleComponentError(error as Error, 'scoringErrorHandler');
      return null;
    }
  }

  private generateMockData(leagueId: string, week?: number): FallbackData {
    const mockLiveScores = {
      leagueId,
      week: week || 1,
      season: 2024,
      matchups: [
        {
          matchupId: 'mock-1',
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeTeamName: 'Team A',
          awayTeamName: 'Team B',
          homeScore: 0,
          awayScore: 0,
          homeProjectedScore: 0,
          awayProjectedScore: 0,
          isComplete: false,
          playerScores: []
        }
      ],
      lastUpdated: new Date().toISOString(),
      isLive: false,
      nextUpdate: new Date(Date.now() + 300000).toISOString()
    };

    return {
      liveScores: mockLiveScores,
      gameStatus: null,
      timestamp: new Date(),
      source: 'mock',
      isStale: true,
      reliability: 'low'
    };
  }

  private generateEmptyFallback(): FallbackData {
    return {
      liveScores: null,
      gameStatus: null,
      timestamp: new Date(),
      source: 'none',
      isStale: true,
      reliability: 'none'
    };
  }

  /**
   * Clear all error tracking (useful for testing)
   */
  clearErrorTracking(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
    this.circuitBreakers.clear();
  }
}

// Export singleton instance
export const scoringErrorHandler = new ScoringErrorHandler();

export default ScoringErrorHandler;