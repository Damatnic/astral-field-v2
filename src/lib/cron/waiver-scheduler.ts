import * as cron from 'node-cron';
import { prisma } from '@/lib/prisma';

interface WaiverJob {
  leagueId: string;
  cronPattern: string;
  timezone: string;
  task: cron.ScheduledTask;
}

class WaiverScheduler {
  private jobs: Map<string, WaiverJob> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing waiver scheduler...');
    
    // Load all leagues with auto-processing enabled
    const leagues = await prisma.league.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });

    for (const league of leagues) {
      const settings = league.settings as any;
      const waiverSettings = settings?.waiverSettings;
      
      if (waiverSettings?.autoProcess) {
        await this.scheduleWaiverProcessing(league.id, waiverSettings);
      }
    }

    this.isInitialized = true;
    console.log(`Waiver scheduler initialized with ${this.jobs.size} active jobs`);
  }

  async scheduleWaiverProcessing(leagueId: string, waiverSettings: any) {
    try {
      // Remove existing job if it exists
      this.removeJob(leagueId);

      const waiverDay = waiverSettings.waiverDay || 3; // Wednesday
      const waiverTime = waiverSettings.waiverTime || '12:00';
      const timezone = waiverSettings.timezone || 'America/New_York';

      // Convert to cron pattern
      const [hour, minute] = waiverTime.split(':').map(Number);
      const cronPattern = `${minute} ${hour} * * ${waiverDay}`;

      // Create scheduled task
      const task = cron.schedule(cronPattern, async () => {
        await this.processLeagueWaivers(leagueId);
      }, {
        timezone
      });

      // Store job reference
      this.jobs.set(leagueId, {
        leagueId,
        cronPattern,
        timezone,
        task
      });

      console.log(`Scheduled waiver processing for league ${leagueId}: ${cronPattern} (${timezone})`);

      // Log to database
      await this.logScheduledJob(leagueId, cronPattern, timezone);

    } catch (error) {
      console.error(`Failed to schedule waivers for league ${leagueId}:`, error);
    }
  }

  async processLeagueWaivers(leagueId: string) {
    try {
      console.log(`Processing waivers for league ${leagueId}...`);

      // Get league details
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          name: true,
          currentWeek: true,
          settings: true
        }
      });

      if (!league) {
        console.error(`League ${leagueId} not found`);
        return;
      }

      // Check if there are pending waiver claims
      const pendingClaims = await prisma.transaction.count({
        where: {
          leagueId,
          type: 'waiver',
          status: 'pending'
        }
      });

      if (pendingClaims === 0) {
        console.log(`No pending waiver claims for league ${leagueId}`);
        return;
      }

      // Process waivers by calling the existing API logic
      const result = await this.executeWaiverProcessing(leagueId, league.currentWeek);

      // Log processing result
      await this.logWaiverProcessingResult(leagueId, result);

      console.log(`Waiver processing complete for league ${leagueId}: ${result.processed} processed, ${result.failed} failed`);

    } catch (error) {
      console.error(`Error processing waivers for league ${leagueId}:`, error);
      
      // Log error to database
      await this.logWaiverProcessingError(leagueId, error);
    }
  }

  private async executeWaiverProcessing(leagueId: string, week?: number) {
    // Import the waiver processing logic to avoid duplication
    const { processWaiverClaims } = await import('@/lib/waivers/processor');
    return await processWaiverClaims(leagueId, week);
  }

  async updateSchedule(leagueId: string, waiverSettings: any) {
    console.log(`Updating waiver schedule for league ${leagueId}`);
    await this.scheduleWaiverProcessing(leagueId, waiverSettings);
  }

  removeJob(leagueId: string) {
    const job = this.jobs.get(leagueId);
    if (job) {
      job.task.stop();
      job.task.destroy();
      this.jobs.delete(leagueId);
      console.log(`Removed waiver job for league ${leagueId}`);
    }
  }

  async removeAllJobs() {
    for (const [leagueId] of this.jobs) {
      this.removeJob(leagueId);
    }
    this.isInitialized = false;
    console.log('All waiver jobs removed');
  }

  getActiveJobs() {
    const jobs = [];
    for (const [leagueId, job] of this.jobs) {
      jobs.push({
        leagueId,
        cronPattern: job.cronPattern,
        timezone: job.timezone,
        isRunning: true // Assume running if in the map
      });
    }
    return jobs;
  }

  async getJobStatus(leagueId: string) {
    const job = this.jobs.get(leagueId);
    if (!job) {
      return { exists: false };
    }

    // Get next execution time
    const task = job.task as any;
    const nextDate = task.nextDate ? task.nextDate().toDate() : null;

    return {
      exists: true,
      cronPattern: job.cronPattern,
      timezone: job.timezone,
      isRunning: true,
      nextExecution: nextDate?.toISOString(),
      status: 'scheduled'
    };
  }

  private async logScheduledJob(leagueId: string, cronPattern: string, timezone: string) {
    try {
      await prisma.jobExecution.create({
        data: {
          jobName: `waiver-processing-${leagueId}`,
          jobType: 'waiver_processing',
          status: 'pending',
          scheduledFor: this.calculateNextRun(cronPattern, timezone),
          metadata: { 
            leagueId,
            cronPattern,
            timezone
          },
          leagueId: leagueId
        }
      });
    } catch (error) {
      console.error('Failed to log scheduled job:', error);
    }
  }

  private async logWaiverProcessingResult(leagueId: string, result: any) {
    try {
      await prisma.jobExecution.create({
        data: {
          jobName: `waiver-${leagueId}-${Date.now()}`,
          jobType: 'waiver_processing',
          status: 'completed',
          result,
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 0,
          metadata: {
            leagueId,
            processedClaims: result.processed,
            failedClaims: result.failed
          },
          leagueId: leagueId
        }
      });
    } catch (error) {
      console.error('Failed to log waiver processing result:', error);
    }
  }

  private async logWaiverProcessingError(leagueId: string, error: any) {
    try {
      await prisma.jobExecution.create({
        data: {
          jobName: `waiver-error-${leagueId}-${Date.now()}`,
          jobType: 'waiver_processing',
          status: 'failed',
          error: error.message,
          startedAt: new Date(),
          completedAt: new Date(),
          metadata: { leagueId, stackTrace: error.stack },
          leagueId: leagueId
        }
      });
    } catch (dbError) {
      console.error('Failed to log waiver processing error:', dbError);
    }
  }

  private calculateNextRun(cronPattern: string, timezone: string): Date {
    // Simple next run calculation - in production, use a proper cron parser
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek;
  }
}

// Export singleton instance
export const waiverScheduler = new WaiverScheduler();

// Auto-initialize on import in production
if (process.env.NODE_ENV === 'production') {
  waiverScheduler.initialize().catch(console.error);
}