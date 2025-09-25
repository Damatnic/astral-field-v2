/**
 * Scoring Orchestrator Service
 * Manages automatic activation of real-time scoring during NFL games
 * 
 * Features:
 * - Automatic start/stop based on NFL game schedule
 * - Intelligent timing based on game status
 * - Resource management and optimization
 * - Error handling and recovery
 */

import { sleeperRealTimeScoringService } from '@/services/sleeper/realTimeScoringService';
import { nflStateService } from '@/services/sleeper/nflStateService';
import { prisma as db } from '@/lib/prisma';
import { handleComponentError } from '@/lib/error-handling';

export interface ScoringConfiguration {
  enabled: boolean;
  gameTimeInterval: number;     // Interval during games (ms)
  nonGameTimeInterval: number;  // Interval during non-game times (ms)
  autoStart: boolean;           // Automatically start during game times
  autoStop: boolean;            // Automatically stop during non-game times
  minUpdateInterval: number;    // Minimum time between updates (ms)
  maxUpdateInterval: number;    // Maximum time between updates (ms)
}

export interface ScoringStatus {
  isActive: boolean;
  isAutoMode: boolean;
  currentInterval: number;
  lastUpdate: Date | null;
  nextUpdate: Date | null;
  gamesActive: boolean;
  activeLeagues: string[];
  errors: string[];
}

export class ScoringOrchestrator {
  private config: ScoringConfiguration;
  private isRunning = false;
  private currentInterval: NodeJS.Timeout | null = null;
  private lastCheck: number = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private status: ScoringStatus;

  constructor(config: Partial<ScoringConfiguration> = {}) {
    this.config = {
      enabled: true,
      gameTimeInterval: 60000,      // 1 minute during games
      nonGameTimeInterval: 300000,  // 5 minutes during non-game times
      autoStart: true,
      autoStop: true,
      minUpdateInterval: 30000,     // 30 seconds minimum
      maxUpdateInterval: 900000,    // 15 minutes maximum
      ...config
    };

    this.status = {
      isActive: false,
      isAutoMode: true,
      currentInterval: this.config.nonGameTimeInterval,
      lastUpdate: null,
      nextUpdate: null,
      gamesActive: false,
      activeLeagues: [],
      errors: []
    };

    this.startScheduler();
  }

  /**
   * Start the scoring orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      this.isRunning = true;
      this.status.isActive = true;
      
      console.log('🎯 Starting Scoring Orchestrator');
      
      // Initial check
      await this.performScheduledCheck();
      
      // Start periodic checks
      this.startScheduler();
      
    } catch (error) {
      handleComponentError(error as Error, 'scoringOrchestrator');
      this.status.errors.push(`Start error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Stop the scoring orchestrator
   */
  stop(): void {
    console.log('🛑 Stopping Scoring Orchestrator');
    
    this.isRunning = false;
    this.status.isActive = false;
    
    // Clear timers
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Stop real-time scoring service
    sleeperRealTimeScoringService.stopRealTimeUpdates();
  }

  /**
   * Get current status
   */
  getStatus(): ScoringStatus {
    return { ...this.status };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScoringConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart with new config if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Force immediate scoring update
   */
  async forceUpdate(leagueId?: string): Promise<void> {
    try {
      if (leagueId) {
        await sleeperRealTimeScoringService.updateLeagueScores(leagueId);
      } else {
        await sleeperRealTimeScoringService.updateAllLeagueScores();
      }
      
      this.status.lastUpdate = new Date();
      this.status.errors = this.status.errors.slice(-5); // Keep only last 5 errors
      
    } catch (error) {
      handleComponentError(error as Error, 'scoringOrchestrator');
      this.status.errors.push(`Force update error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Start the scheduler
   */
  private startScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 2 minutes for schedule changes
    this.checkInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.performScheduledCheck();
      }
    }, 120000); // 2 minutes
  }

  /**
   * Perform scheduled check and adjust scoring frequency
   */
  private async performScheduledCheck(): Promise<void> {
    try {
      const now = Date.now();
      
      // Avoid too frequent checks
      if (now - this.lastCheck < 60000) { // 1 minute minimum
        return;
      }
      
      this.lastCheck = now;
      
      // Get NFL status
      const timingRecommendations = await nflStateService.getTimingRecommendations();
      const isGameDay = await nflStateService.isGameDay();
      const isScoringPeriod = await nflStateService.isScoringPeriod();
      
      // Update status
      this.status.gamesActive = isScoringPeriod;
      
      // Determine appropriate interval
      let targetInterval: number;
      
      if (isScoringPeriod && timingRecommendations.liveScoring === 'active') {
        // Active games - high frequency
        targetInterval = this.config.gameTimeInterval;
      } else if (isGameDay && timingRecommendations.liveScoring === 'reduced') {
        // Game day but not active games - medium frequency
        targetInterval = this.config.gameTimeInterval * 2;
      } else {
        // Non-game times - low frequency
        targetInterval = this.config.nonGameTimeInterval;
      }
      
      // Enforce bounds
      targetInterval = Math.max(this.config.minUpdateInterval, targetInterval);
      targetInterval = Math.min(this.config.maxUpdateInterval, targetInterval);
      
      // Update interval if needed
      if (targetInterval !== this.status.currentInterval) {
        await this.updateScoringInterval(targetInterval);
      }
      
      // Auto start/stop based on configuration
      if (this.config.autoStart && isScoringPeriod && !this.isRealTimeServiceActive()) {
        await this.startRealTimeScoring();
      } else if (this.config.autoStop && !isScoringPeriod && this.isRealTimeServiceActive()) {
        this.stopRealTimeScoring();
      }
      
      // Update active leagues
      await this.updateActiveLeagues();
      
    } catch (error) {
      handleComponentError(error as Error, 'scoringOrchestrator');
      this.status.errors.push(`Scheduled check error: ${(error as Error).message}`);
    }
  }

  /**
   * Update scoring interval
   */
  private async updateScoringInterval(newInterval: number): Promise<void> {
    console.log(`🔄 Updating scoring interval: ${this.status.currentInterval}ms → ${newInterval}ms`);
    
    this.status.currentInterval = newInterval;
    
    // If real-time service is active, restart it with new interval
    if (this.isRealTimeServiceActive()) {
      sleeperRealTimeScoringService.stopRealTimeUpdates();
      await sleeperRealTimeScoringService.startRealTimeUpdates(newInterval);
    }
    
    // Update next update time
    this.status.nextUpdate = new Date(Date.now() + newInterval);
  }

  /**
   * Start real-time scoring
   */
  private async startRealTimeScoring(): Promise<void> {
    console.log('▶️ Starting real-time scoring');
    await sleeperRealTimeScoringService.startRealTimeUpdates(this.status.currentInterval);
    this.status.lastUpdate = new Date();
  }

  /**
   * Stop real-time scoring
   */
  private stopRealTimeScoring(): void {
    console.log('⏹️ Stopping real-time scoring');
    sleeperRealTimeScoringService.stopRealTimeUpdates();
  }

  /**
   * Check if real-time service is active
   */
  private isRealTimeServiceActive(): boolean {
    // This would need to be implemented in the real-time service
    // For now, we'll assume it's active if we have a current interval set
    return this.currentInterval !== null;
  }

  /**
   * Update active leagues list
   */
  private async updateActiveLeagues(): Promise<void> {
    try {
      const activeLeagues = await db.league.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      
      this.status.activeLeagues = activeLeagues.map(l => l.id);
      
    } catch (error) {
      handleComponentError(error as Error, 'scoringOrchestrator');
      this.status.errors.push(`Active leagues update error: ${(error as Error).message}`);
    }
  }

  /**
   * Get recommended scoring frequency based on current conditions
   */
  async getRecommendedFrequency(): Promise<{
    interval: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const timingRecommendations = await nflStateService.getTimingRecommendations();
    const isGameDay = await nflStateService.isGameDay();
    const isScoringPeriod = await nflStateService.isScoringPeriod();
    
    if (isScoringPeriod && timingRecommendations.liveScoring === 'active') {
      return {
        interval: this.config.gameTimeInterval,
        reason: 'Active NFL games in progress',
        priority: 'high'
      };
    } else if (isGameDay && timingRecommendations.liveScoring === 'reduced') {
      return {
        interval: this.config.gameTimeInterval * 2,
        reason: 'NFL game day (games not currently active)',
        priority: 'medium'
      };
    } else {
      return {
        interval: this.config.nonGameTimeInterval,
        reason: 'No NFL games today',
        priority: 'low'
      };
    }
  }

  /**
   * Get health metrics
   */
  getHealthMetrics(): {
    healthy: boolean;
    uptime: number;
    lastCheckAge: number;
    errorRate: number;
    activeServices: string[];
  } {
    const now = Date.now();
    const lastCheckAge = this.lastCheck ? now - this.lastCheck : Infinity;
    const recentErrors = this.status.errors.length;
    
    return {
      healthy: this.isRunning && lastCheckAge < 600000, // 10 minutes
      uptime: this.status.lastUpdate ? now - this.status.lastUpdate.getTime() : 0,
      lastCheckAge,
      errorRate: recentErrors / 10, // Rough error rate
      activeServices: [
        ...(this.isRealTimeServiceActive() ? ['real-time-scoring'] : []),
        ...(this.isRunning ? ['orchestrator'] : [])
      ]
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
  }
}

// Create singleton instance
export const scoringOrchestrator = new ScoringOrchestrator();

// Auto-start if in a production-like environment
if (typeof window === 'undefined') { // Server-side
  scoringOrchestrator.start().catch(error => {
    console.error('Failed to start scoring orchestrator:', error);
  });
}

export default ScoringOrchestrator;