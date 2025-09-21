import cron from 'node-cron';
import { sleeperLeagueService } from '../services/leagues';
import { sleeperPlayerService } from '../services/players';
import { sleeperStatsService } from '../services/stats';
import { sleeperTransactionService } from '../services/transactions';
import { prisma } from '@/lib/prisma';

interface JobConfig {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  averageRunTime: number;
}

interface JobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: string;
  data?: any;
}

export class SleeperJobManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobConfigs: Map<string, JobConfig> = new Map();
  private jobHistory: JobResult[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Define all job configurations
    const jobConfigs: JobConfig[] = [
      {
        name: 'sync-active-leagues',
        schedule: '*/15 * * * *', // Every 15 minutes
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'sync-player-database',
        schedule: '0 2 * * *', // Daily at 2 AM
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'sync-trending-players',
        schedule: '*/30 * * * *', // Every 30 minutes
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'process-waiver-claims',
        schedule: '0 3 * * 3', // Wednesday at 3 AM (typical waiver processing time)
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'cleanup-old-data',
        schedule: '0 1 * * 0', // Sunday at 1 AM
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'sync-live-scoring',
        schedule: '*/5 * * * *', // Every 5 minutes during game days
        enabled: false, // Enabled dynamically during game days
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'update-player-news',
        schedule: '*/10 * * * *', // Every 10 minutes
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      },
      {
        name: 'backup-critical-data',
        schedule: '0 4 * * *', // Daily at 4 AM
        enabled: true,
        runCount: 0,
        errorCount: 0,
        averageRunTime: 0
      }
    ];

    // Initialize job configurations
    jobConfigs.forEach(config => {
      this.jobConfigs.set(config.name, config);
      this.scheduleJob(config);
    });

    console.log(`Initialized ${jobConfigs.length} background jobs`);
  }

  private scheduleJob(config: JobConfig): void {
    if (!config.enabled) {
      return;
    }

    const task = cron.schedule(config.schedule, async () => {
      await this.executeJob(config.name);
    }, {
      scheduled: true,
      timezone: "America/New_York" // Adjust based on your needs
    });

    this.jobs.set(config.name, task);
    
    // Calculate next run time
    config.nextRun = this.getNextRunTime(config.schedule);
    
    console.log(`Scheduled job: ${config.name} - Next run: ${config.nextRun}`);
  }

  private async executeJob(jobName: string): Promise<JobResult> {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      throw new Error(`Job configuration not found: ${jobName}`);
    }

    const startTime = new Date();
    let result: JobResult = {
      jobName,
      startTime,
      endTime: startTime,
      duration: 0,
      success: false
    };

    try {
      console.log(`Starting job: ${jobName}`);
      
      // Execute the specific job
      const jobData = await this.runJobLogic(jobName);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      result = {
        jobName,
        startTime,
        endTime,
        duration,
        success: true,
        data: jobData
      };

      // Update job statistics
      config.runCount++;
      config.lastRun = endTime;
      config.nextRun = this.getNextRunTime(config.schedule);
      config.averageRunTime = this.calculateAverageRunTime(config, duration);

      console.log(`Completed job: ${jobName} in ${duration}ms`);
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      result = {
        jobName,
        startTime,
        endTime,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      config.errorCount++;
      config.lastRun = endTime;
      config.nextRun = this.getNextRunTime(config.schedule);

      console.error(`Job failed: ${jobName} - ${result.error}`);
    }

    // Store job result
    this.addJobResult(result);
    
    // Log to database
    await this.logJobExecution(result);

    return result;
  }

  private async runJobLogic(jobName: string): Promise<any> {
    switch (jobName) {
      case 'sync-active-leagues':
        return await this.syncActiveLeagues();
        
      case 'sync-player-database':
        return await this.syncPlayerDatabase();
        
      case 'sync-trending-players':
        return await this.syncTrendingPlayers();
        
      case 'process-waiver-claims':
        return await this.processWaiverClaims();
        
      case 'cleanup-old-data':
        return await this.cleanupOldData();
        
      case 'sync-live-scoring':
        return await this.syncLiveScoring();
        
      case 'update-player-news':
        return await this.updatePlayerNews();
        
      case 'backup-critical-data':
        return await this.backupCriticalData();
        
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  // Job implementations

  private async syncActiveLeagues(): Promise<any> {
    const result = await sleeperLeagueService.syncAllActiveLeagues();
    return {
      leaguesSynced: result.leagues,
      errors: result.errors.length,
      errorDetails: result.errors.slice(0, 5) // First 5 errors for logging
    };
  }

  private async syncPlayerDatabase(): Promise<any> {
    const result = await sleeperPlayerService.syncAllPlayers();
    return {
      totalPlayers: result.total,
      updated: result.updated,
      created: result.created,
      errors: result.errors
    };
  }

  private async syncTrendingPlayers(): Promise<any> {
    const result = await sleeperPlayerService.syncTrendingPlayers();
    return {
      trendingPlayers: result.length,
      positions: [...new Set(result.map(p => p.position))]
    };
  }

  private async processWaiverClaims(): Promise<any> {
    // Get all active leagues
    const leagues = await prisma.sleeperLeague.findMany({
      where: { status: 'in_season' },
      select: { id: true }
    });

    const results = [];
    for (const league of leagues) {
      try {
        const result = await sleeperTransactionService.processWaiverClaims(league.id);
        results.push({ leagueId: league.id, ...result });
      } catch (error) {
        results.push({ 
          leagueId: league.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return {
      leaguesProcessed: results.length,
      totalClaims: results.reduce((sum, r) => sum + (r.processed || 0), 0),
      successfulClaims: results.reduce((sum, r) => sum + (r.successful || 0), 0),
      failedClaims: results.reduce((sum, r) => sum + (r.failed || 0), 0)
    };
  }

  private async cleanupOldData(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Clean up old scoring updates
    const deletedScoringUpdates = await prisma.sleeperScoringUpdate.deleteMany({
      where: {
        processed: true,
        createdAt: { lt: oneWeekAgo }
      }
    });

    // Clean up old sync logs
    const deletedSyncLogs = await prisma.sleeperSyncLog.deleteMany({
      where: {
        startedAt: { lt: thirtyDaysAgo }
      }
    });

    // Clean up old webhook events
    const deletedWebhookEvents = await prisma.sleeperWebhookEvent.deleteMany({
      where: {
        processed: true,
        createdAt: { lt: oneWeekAgo }
      }
    });

    // Clean up expired pending trades
    const deletedPendingTrades = await prisma.sleeperPendingTrade.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    return {
      deletedScoringUpdates: deletedScoringUpdates.count,
      deletedSyncLogs: deletedSyncLogs.count,
      deletedWebhookEvents: deletedWebhookEvents.count,
      deletedPendingTrades: deletedPendingTrades.count
    };
  }

  private async syncLiveScoring(): Promise<any> {
    // Only run during game days (Thursday, Sunday, Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (![0, 1, 4].includes(dayOfWeek)) {
      return { skipped: true, reason: 'Not a game day' };
    }

    // Get all active leagues
    const leagues = await prisma.sleeperLeague.findMany({
      where: { status: 'in_season' },
      select: { id: true }
    });

    const results = [];
    for (const league of leagues) {
      try {
        const result = await sleeperStatsService.syncLiveScoring(league.id);
        results.push({ leagueId: league.id, ...result });
      } catch (error) {
        results.push({ 
          leagueId: league.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return {
      leaguesProcessed: results.length,
      totalPlayers: results.reduce((sum, r) => sum + (r.players || 0), 0),
      totalMatchups: results.reduce((sum, r) => sum + (r.matchups || 0), 0)
    };
  }

  private async updatePlayerNews(): Promise<any> {
    // This would integrate with news APIs or scraping services
    // For now, return a placeholder
    return {
      newsItemsProcessed: 0,
      playersUpdated: 0,
      injuryUpdates: 0
    };
  }

  private async backupCriticalData(): Promise<any> {
    // Export critical data for backup
    const leagues = await prisma.sleeperLeague.count();
    const users = await prisma.sleeperUser.count();
    const players = await prisma.sleeperPlayer.count();
    const transactions = await prisma.sleeperTransaction.count({
      where: {
        created: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    return {
      totalLeagues: leagues,
      totalUsers: users,
      totalPlayers: players,
      recentTransactions: transactions,
      backupTimestamp: new Date().toISOString()
    };
  }

  // Job management methods

  async enableJob(jobName: string): Promise<void> {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (!config.enabled) {
      config.enabled = true;
      this.scheduleJob(config);
      console.log(`Enabled job: ${jobName}`);
    }
  }

  async disableJob(jobName: string): Promise<void> {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (config.enabled) {
      config.enabled = false;
      const task = this.jobs.get(jobName);
      if (task) {
        task.stop();
        this.jobs.delete(jobName);
      }
      console.log(`Disabled job: ${jobName}`);
    }
  }

  async runJobNow(jobName: string): Promise<JobResult> {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      throw new Error(`Job not found: ${jobName}`);
    }

    return await this.executeJob(jobName);
  }

  getJobStatus(jobName?: string): JobConfig | JobConfig[] {
    if (jobName) {
      const config = this.jobConfigs.get(jobName);
      if (!config) {
        throw new Error(`Job not found: ${jobName}`);
      }
      return config;
    }

    return Array.from(this.jobConfigs.values());
  }

  getJobHistory(jobName?: string, limit = 50): JobResult[] {
    let history = this.jobHistory;
    
    if (jobName) {
      history = history.filter(result => result.jobName === jobName);
    }

    return history
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // Utility methods

  private getNextRunTime(schedule: string): Date {
    // This is a simplified implementation
    // In a real implementation, you'd use a cron parser library
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60000); // Simplified: +1 minute
    return nextRun;
  }

  private calculateAverageRunTime(config: JobConfig, newRunTime: number): number {
    if (config.runCount === 1) {
      return newRunTime;
    }
    
    return Math.round((config.averageRunTime * (config.runCount - 1) + newRunTime) / config.runCount);
  }

  private addJobResult(result: JobResult): void {
    this.jobHistory.push(result);
    
    // Keep only the most recent results
    if (this.jobHistory.length > this.maxHistorySize) {
      this.jobHistory = this.jobHistory.slice(-this.maxHistorySize);
    }
  }

  private async logJobExecution(result: JobResult): Promise<void> {
    try {
      await prisma.sleeperJobLog.create({
        data: {
          jobName: result.jobName,
          startTime: result.startTime,
          endTime: result.endTime,
          duration: result.duration,
          success: result.success,
          error: result.error,
          data: result.data || {}
        }
      });
    } catch (error) {
      console.error('Failed to log job execution:', error);
    }
  }

  // Lifecycle methods

  async start(): Promise<void> {
    console.log('Starting Sleeper job manager...');
    
    // Enable live scoring during game days
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    if ([0, 1, 4].includes(dayOfWeek)) { // Sunday, Monday, Thursday
      await this.enableJob('sync-live-scoring');
    }
    
    console.log('Sleeper job manager started');
  }

  async stop(): Promise<void> {
    console.log('Stopping Sleeper job manager...');
    
    // Stop all scheduled jobs
    for (const [jobName, task] of this.jobs.entries()) {
      task.stop();
      console.log(`Stopped job: ${jobName}`);
    }
    
    this.jobs.clear();
    console.log('Sleeper job manager stopped');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
}

// Singleton instance
export const sleeperJobManager = new SleeperJobManager();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  sleeperJobManager.start().catch(console.error);
}