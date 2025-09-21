/**
 * Sleeper API Error Handling and Retry Logic
 * Provides comprehensive error handling, circuit breaker pattern, and retry mechanisms
 */

export class SleeperApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public originalError?: any,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'SleeperApiError';
  }

  isRetryable(): boolean {
    // Don't retry on client errors (4xx) except rate limiting
    if (this.statusCode && this.statusCode >= 400 && this.statusCode < 500) {
      return this.statusCode === 429; // Only retry on rate limits
    }
    
    // Retry on server errors (5xx) and network errors
    return this.retryable;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      retryable: this.retryable,
      stack: this.stack
    };
  }
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitterFactor: 0.1
};

/**
 * Circuit Breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeoutMs: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';} else {
        throw new SleeperApiError(
          'Circuit breaker is OPEN - service temporarily unavailable',
          503,
          undefined,
          undefined,
          false
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';}
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';}
}

/**
 * Retry function with exponential backoff and jitter
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (error instanceof SleeperApiError && !error.isRetryable()) {
        throw error;
      }
      
      if (attempt === config.maxRetries) {
        const finalError = new SleeperApiError(
          `${context || 'Operation'} failed after ${config.maxRetries + 1} attempts: ${lastError.message}`,
          error instanceof SleeperApiError ? error.statusCode : undefined,
          error instanceof SleeperApiError ? error.endpoint : undefined,
          lastError,
          false
        );
        
        console.error('❌ Final retry attempt failed:', finalError.toJSON());
        throw finalError;
      }
      
      const baseDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt);
      const jitter = baseDelay * config.jitterFactor * Math.random();
      const delay = Math.min(baseDelay + jitter, config.maxDelay);
      
      console.log(`⚠️ ${context || 'Operation'} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, {
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries: config.maxRetries + 1
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Error classification and handling strategies
 */
export class ErrorHandler {
  static classify(error: any): {
    type: 'network' | 'rate_limit' | 'client' | 'server' | 'timeout' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    shouldRetry: boolean;
    shouldCircuitBreak: boolean;
  } {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        type: 'network',
        severity: 'high',
        shouldRetry: true,
        shouldCircuitBreak: true
      };
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        severity: 'medium',
        shouldRetry: true,
        shouldCircuitBreak: false
      };
    }

    const status = error.response?.status || error.statusCode;
    
    if (status === 429) {
      return {
        type: 'rate_limit',
        severity: 'low',
        shouldRetry: true,
        shouldCircuitBreak: false
      };
    }

    if (status >= 400 && status < 500) {
      return {
        type: 'client',
        severity: status === 404 ? 'low' : 'medium',
        shouldRetry: false,
        shouldCircuitBreak: false
      };
    }

    if (status >= 500) {
      return {
        type: 'server',
        severity: 'high',
        shouldRetry: true,
        shouldCircuitBreak: true
      };
    }

    return {
      type: 'unknown',
      severity: 'medium',
      shouldRetry: true,
      shouldCircuitBreak: false
    };
  }

  static createSleeperError(
    error: any, 
    endpoint?: string, 
    context?: string
  ): SleeperApiError {
    const classification = this.classify(error);
    
    let message = error.message || 'Unknown error occurred';
    if (context) {
      message = `${context}: ${message}`;
    }

    return new SleeperApiError(
      message,
      error.response?.status || error.statusCode,
      endpoint,
      error,
      classification.shouldRetry
    );
  }

  static shouldAlert(error: SleeperApiError): boolean {
    const classification = this.classify(error.originalError);
    return classification.severity === 'critical' || classification.severity === 'high';
  }

  static getRecoveryStrategy(error: SleeperApiError): {
    action: 'retry' | 'fallback' | 'fail';
    delay?: number;
    fallbackData?: any;
  } {
    const classification = this.classify(error.originalError);

    switch (classification.type) {
      case 'rate_limit':
        return {
          action: 'retry',
          delay: 60000 // Wait 1 minute for rate limit reset
        };

      case 'network':
      case 'timeout':
        return {
          action: 'retry',
          delay: 5000 // Wait 5 seconds for network issues
        };

      case 'server':
        return {
          action: 'retry',
          delay: 10000 // Wait 10 seconds for server issues
        };

      case 'client':
        if (error.statusCode === 404) {
          return {
            action: 'fallback',
            fallbackData: null
          };
        }
        return { action: 'fail' };

      default:
        return { action: 'retry', delay: 2000 };
    }
  }
}

/**
 * Fallback data provider for when Sleeper API is unavailable
 */
export class FallbackDataProvider {
  private static readonly FALLBACK_NFL_STATE = {
    week: 17,
    season_type: 'regular' as const,
    season: '2024',
    previous_season: '2023',
    leg: 1,
    season_start_date: '2024-09-05',
    season_end_date: '2025-01-06',
    week_start_date: '2024-12-24',
    week_end_date: '2024-12-30'
  };

  static getNFLState() {return this.FALLBACK_NFL_STATE;
  }

  static getPlayerStats(): Record<string, any> {return {};
  }

  static getTrendingPlayers(): any[] {return [];
  }

  static getLeagueData(leagueId: string) {return {
      league_id: leagueId,
      name: 'Fallback League',
      total_rosters: 10,
      status: 'in_season' as const,
      sport: 'nfl' as const,
      season: '2024',
      season_type: 'regular' as const,
      settings: {
        num_teams: 10,
        leg: 1,
        start_week: 1
      },
      scoring_settings: {},
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'],
      previous_league_id: null,
      draft_id: null,
      avatar: null
    };
  }
}

/**
 * Monitoring and alerting for error patterns
 */
export class ErrorMonitor {
  private errorCounts: Map<string, number> = new Map();
  private errorWindow: Map<string, number[]> = new Map();
  private readonly windowSizeMs = 300000; // 5 minutes
  private readonly alertThreshold = 10; // 10 errors in 5 minutes

  recordError(error: SleeperApiError): void {
    const key = `${error.statusCode || 'unknown'}:${error.endpoint || 'unknown'}`;
    const now = Date.now();

    // Update error count
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // Update error window
    const timestamps = this.errorWindow.get(key) || [];
    timestamps.push(now);
    
    // Remove old timestamps outside window
    const cutoff = now - this.windowSizeMs;
    const recentTimestamps = timestamps.filter(ts => ts > cutoff);
    this.errorWindow.set(key, recentTimestamps);

    // Check if we should alert
    if (recentTimestamps.length >= this.alertThreshold) {
      this.triggerAlert(key, recentTimestamps.length, error);
    }
  }

  private triggerAlert(errorKey: string, count: number, lastError: SleeperApiError): void {
    console.error(`🚨 ALERT: High error rate detected for ${errorKey}`, {
      errorCount: count,
      timeWindow: `${this.windowSizeMs / 1000}s`,
      lastError: lastError.toJSON(),
      timestamp: new Date().toISOString()
    });

    // Here you could integrate with alerting systems like PagerDuty, Slack, etc.
  }

  getErrorStats() {
    const now = Date.now();
    const cutoff = now - this.windowSizeMs;
    
    const stats = Array.from(this.errorWindow.entries()).map(([key, timestamps]) => {
      const recentErrors = timestamps.filter(ts => ts > cutoff).length;
      return {
        errorType: key,
        totalErrors: this.errorCounts.get(key) || 0,
        recentErrors,
        errorRate: recentErrors / (this.windowSizeMs / 60000) // errors per minute
      };
    });

    return {
      windowSizeMinutes: this.windowSizeMs / 60000,
      totalErrorTypes: stats.length,
      stats: stats.sort((a, b) => b.recentErrors - a.recentErrors)
    };
  }

  reset(): void {
    this.errorCounts.clear();
    this.errorWindow.clear();}
}

// Export singleton instances
export const sleeperCircuitBreaker = new CircuitBreaker();
export const sleeperErrorMonitor = new ErrorMonitor();