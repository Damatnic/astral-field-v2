/**
 * Scoring Scheduler
 * Manages automatic start/stop of live scoring during NFL games
 */

import cron from 'node-cron';
import { liveScoreProcessor } from './live-score-processor';
import { prisma } from '@/lib/prisma';
import { broadcastToLeague } from '@/lib/socket/server';

interface ScoringJob {
  leagueId: string;
  task: cron.ScheduledTask;
  isRunning: boolean;
}

export class ScoringScheduler {
  private jobs: Map<string, ScoringJob> = new Map();

  /**
   * Schedule automatic scoring for a league
   */
  async scheduleAutoScoring(leagueId: string): Promise<void> {
    try {
      // Stop existing job if running
      this.stopAutoScoring(leagueId);

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: { settings: true }
      });

      if (!league) {
        throw new Error('League not found');
      }

      // Schedule scoring to start on Sundays at 1:00 PM ET (NFL games start)
      const startTask = cron.schedule('0 13 * * 0', async () => {
        console.log(`Starting live scoring for league ${leagueId}`);
        await liveScoreProcessor.startLiveScoring(leagueId);
        
        // Notify league members
        broadcastToLeague(leagueId, 'scoring:started', {
          message: 'Live scoring has started for this week'
        });
      }, {
        scheduled: false,
        timezone: 'America/New_York'
      });

      // Schedule scoring to stop on Tuesdays at 2:00 AM ET (after Monday Night Football)
      const stopTask = cron.schedule('0 2 * * 2', async () => {
        console.log(`Stopping live scoring for league ${leagueId}`);
        liveScoreProcessor.stopLiveScoring(leagueId);
        
        // Final score calculation and week completion
        await this.finalizeWeekScores(leagueId);
        
        // Notify league members
        broadcastToLeague(leagueId, 'scoring:finalized', {
          message: 'Week scores have been finalized'
        });
      }, {
        scheduled: false,
        timezone: 'America/New_York'
      });

      // Start the scheduled tasks
      startTask.start();
      stopTask.start();

      this.jobs.set(leagueId, {
        leagueId,
        task: startTask, // Store primary task (could extend to store both)
        isRunning: true
      });

      console.log(`Scheduled auto scoring for league ${leagueId}`);
    } catch (error) {
      console.error(`Error scheduling auto scoring for league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Stop automatic scoring for a league
   */
  stopAutoScoring(leagueId: string): void {
    const job = this.jobs.get(leagueId);
    if (job) {
      job.task.stop();
      job.task.destroy();
      this.jobs.delete(leagueId);
      console.log(`Stopped auto scoring for league ${leagueId}`);
    }
  }

  /**
   * Manually start live scoring for a league
   */
  async startManualScoring(leagueId: string): Promise<void> {
    await liveScoreProcessor.startLiveScoring(leagueId);
    
    broadcastToLeague(leagueId, 'scoring:started', {
      message: 'Live scoring has been manually started'
    });
  }

  /**
   * Manually stop live scoring for a league
   */
  async stopManualScoring(leagueId: string): Promise<void> {
    liveScoreProcessor.stopLiveScoring(leagueId);
    
    broadcastToLeague(leagueId, 'scoring:stopped', {
      message: 'Live scoring has been manually stopped'
    });
  }

  /**
   * Finalize week scores and prepare for next week
   */
  private async finalizeWeekScores(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) return;

      const currentWeek = league.currentWeek || 1;

      // Get final scores
      const finalScores = await liveScoreProcessor.getLiveScores(leagueId, currentWeek);

      // Update all matchups with final scores
      for (const matchup of finalScores.matchups) {
        await prisma.matchup.update({
          where: { id: matchup.id },
          data: {
            team1Score: matchup.team1.score,
            team2Score: matchup.team2.score,
            team1Projected: matchup.team1.projected,
            team2Projected: matchup.team2.projected,
            isComplete: true,
            lastUpdated: new Date()
          }
        });

        // Update team records
        const winner = matchup.team1.score > matchup.team2.score ? matchup.team1.id : matchup.team2.id;
        const loser = matchup.team1.score > matchup.team2.score ? matchup.team2.id : matchup.team1.id;

        if (matchup.team1.score !== matchup.team2.score) {
          // Update winner
          await prisma.team.update({
            where: { id: winner },
            data: {
              wins: { increment: 1 },
              totalPointsFor: { increment: winner === matchup.team1.id ? matchup.team1.score : matchup.team2.score },
              totalPointsAgainst: { increment: winner === matchup.team1.id ? matchup.team2.score : matchup.team1.score }
            }
          });

          // Update loser
          await prisma.team.update({
            where: { id: loser },
            data: {
              losses: { increment: 1 },
              totalPointsFor: { increment: loser === matchup.team1.id ? matchup.team1.score : matchup.team2.score },
              totalPointsAgainst: { increment: loser === matchup.team1.id ? matchup.team2.score : matchup.team1.score }
            }
          });
        } else {
          // Tie game
          await prisma.team.updateMany({
            where: { id: { in: [matchup.team1.id, matchup.team2.id] } },
            data: {
              ties: { increment: 1 }
            }
          });
        }
      }

      // Create notifications for league members
      const teams = await prisma.team.findMany({
        where: { leagueId },
        include: { owner: true }
      });

      for (const team of teams) {
        const teamMatchup = finalScores.matchups.find(m => 
          m.team1.id === team.id || m.team2.id === team.id
        );

        if (teamMatchup) {
          const isTeam1 = teamMatchup.team1.id === team.id;
          const myScore = isTeam1 ? teamMatchup.team1.score : teamMatchup.team2.score;
          const opponentScore = isTeam1 ? teamMatchup.team2.score : teamMatchup.team1.score;
          const opponentName = isTeam1 ? teamMatchup.team2.name : teamMatchup.team1.name;
          
          const won = myScore > opponentScore;
          const tied = myScore === opponentScore;

          let message = '';
          let type = 'MATCHUP_RESULT';

          if (won) {
            message = `You defeated ${opponentName} ${myScore.toFixed(1)} - ${opponentScore.toFixed(1)}`;
          } else if (tied) {
            message = `You tied with ${opponentName} ${myScore.toFixed(1)} - ${opponentScore.toFixed(1)}`;
          } else {
            message = `You lost to ${opponentName} ${opponentScore.toFixed(1)} - ${myScore.toFixed(1)}`;
          }

          await prisma.notification.create({
            data: {
              userId: team.ownerId,
              type,
              title: `Week ${currentWeek} Results`,
              message,
              relatedId: teamMatchup.id
            }
          });
        }
      }

      // Advance to next week (if not end of season)
      if (currentWeek < 18) {
        await prisma.league.update({
          where: { id: leagueId },
          data: { currentWeek: currentWeek + 1 }
        });

        console.log(`Advanced league ${leagueId} to week ${currentWeek + 1}`);
      }

      console.log(`Finalized week ${currentWeek} scores for league ${leagueId}`);
    } catch (error) {
      console.error(`Error finalizing week scores for league ${leagueId}:`, error);
    }
  }

  /**
   * Check if scoring is currently running for a league
   */
  isScoringRunning(leagueId: string): boolean {
    const job = this.jobs.get(leagueId);
    return job ? job.isRunning : false;
  }

  /**
   * Get all active scoring jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Schedule scoring for all active leagues
   */
  async scheduleAllLeagues(): Promise<void> {
    try {
      const activeLeagues = await prisma.league.findMany({
        where: {
          status: 'ACTIVE',
          currentWeek: { gte: 1, lte: 18 }
        }
      });

      for (const league of activeLeagues) {
        await this.scheduleAutoScoring(league.id);
      }

      console.log(`Scheduled auto scoring for ${activeLeagues.length} leagues`);
    } catch (error) {
      console.error('Error scheduling all leagues:', error);
    }
  }

  /**
   * Emergency stop all scoring
   */
  stopAllScoring(): void {
    for (const [leagueId] of this.jobs) {
      this.stopAutoScoring(leagueId);
      liveScoreProcessor.stopLiveScoring(leagueId);
    }
    console.log('Stopped all live scoring');
  }

  /**
   * Get scoring status for all leagues
   */
  getScoringStatus(): { leagueId: string; isRunning: boolean }[] {
    return Array.from(this.jobs.entries()).map(([leagueId, job]) => ({
      leagueId,
      isRunning: job.isRunning
    }));
  }

  /**
   * Schedule Thursday Night Football scoring (starts earlier)
   */
  async scheduleThursdayNightFootball(): Promise<void> {
    // Thursday games typically start at 8:20 PM ET
    const thursdayTask = cron.schedule('20 20 * * 4', async () => {
      console.log('Starting Thursday Night Football scoring');
      
      const activeLeagues = await prisma.league.findMany({
        where: { status: 'ACTIVE' }
      });

      for (const league of activeLeagues) {
        await liveScoreProcessor.startLiveScoring(league.id);
        broadcastToLeague(league.id, 'scoring:tnf_started', {
          message: 'Thursday Night Football has started!'
        });
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('Scheduled Thursday Night Football scoring');
  }

  /**
   * Schedule Monday Night Football extended scoring
   */
  async scheduleMondayNightFootball(): Promise<void> {
    // Monday games typically end around 12:00 AM ET Tuesday
    const mondayTask = cron.schedule('0 0 * * 2', async () => {
      console.log('Monday Night Football ending, preparing for finalization');
      
      // Wait 2 hours for final stats to be confirmed
      setTimeout(async () => {
        const activeLeagues = await prisma.league.findMany({
          where: { status: 'ACTIVE' }
        });

        for (const league of activeLeagues) {
          await this.finalizeWeekScores(league.id);
        }
      }, 2 * 60 * 60 * 1000); // 2 hours
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('Scheduled Monday Night Football finalization');
  }
}

export const scoringScheduler = new ScoringScheduler();