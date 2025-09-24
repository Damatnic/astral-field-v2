import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { notificationService } from './notification-service';

const prisma = new PrismaClient();

export class NotificationScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  // Schedule all notification jobs for a league
  async scheduleLeagueNotifications(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          settings: true
        }
      });

      if (!league) {
        throw new Error('League not found');
      }

      // Schedule lineup reminders (Sundays at 11:30 AM ET)
      this.scheduleLineupReminders(leagueId);

      // Schedule waiver processing (Wednesdays at 12:00 AM ET)
      this.scheduleWaiverReminders(leagueId);

      // Schedule draft reminders if league is in draft phase
      if (league.status === 'DRAFTING') {
        this.scheduleDraftReminders(leagueId);
      }

      // Schedule scoring update checks during game days
      this.scheduleScoringNotifications(leagueId);

      console.log(`Scheduled notifications for league ${leagueId}`);
    } catch (error) {
      console.error('Error scheduling league notifications:', error);
    }
  }

  // Lineup reminders - Sundays at 11:30 AM ET (30 min before kickoff)
  private scheduleLineupReminders(leagueId: string): void {
    const taskId = `lineup_reminder_${leagueId}`;
    
    const task = cron.schedule('30 11 * * 0', async () => {
      try {
        await this.sendLineupReminders(leagueId);
      } catch (error) {
        console.error('Error sending lineup reminders:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.tasks.set(taskId, task);
  }

  // Waiver reminders - Tuesdays at 11:00 PM ET (1 hour before processing)
  private scheduleWaiverReminders(leagueId: string): void {
    const taskId = `waiver_reminder_${leagueId}`;
    
    const task = cron.schedule('0 23 * * 2', async () => {
      try {
        await this.sendWaiverReminders(leagueId);
      } catch (error) {
        console.error('Error sending waiver reminders:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.tasks.set(taskId, task);
  }

  // Draft reminders - 10 minutes before each pick
  private scheduleDraftReminders(leagueId: string): void {
    const taskId = `draft_reminder_${leagueId}`;
    
    // Check every minute during draft for upcoming picks
    const task = cron.schedule('* * * * *', async () => {
      try {
        await this.checkUpcomingDraftPicks(leagueId);
      } catch (error) {
        console.error('Error checking draft picks:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.tasks.set(taskId, task);
  }

  // Scoring notifications - Sundays, Mondays, Thursdays during games
  private scheduleScoringNotifications(leagueId: string): void {
    const taskId = `scoring_notifications_${leagueId}`;
    
    // Check for close games every 15 minutes during game times
    const task = cron.schedule('*/15 13-23 * * 0,1,4', async () => {
      try {
        await this.checkCloseGames(leagueId);
      } catch (error) {
        console.error('Error checking close games:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.tasks.set(taskId, task);
  }

  // Send lineup reminders to teams with incomplete lineups
  private async sendLineupReminders(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { currentWeek: true }
      });

      if (!league) return;

      const teams = await prisma.team.findMany({
        where: { leagueId },
        include: {
          owner: true,
          lineups: {
            where: { week: league.currentWeek },
            include: {
              slots: {
                include: {
                  player: true
                }
              }
            }
          }
        }
      });

      for (const team of teams) {
        const lineup = team.lineups[0];
        if (!lineup) continue;

        // Count empty starting slots (excluding bench and IR)
        const startingSlots = lineup.slots.filter(slot => 
          !slot.position.includes('BENCH') && !slot.position.includes('IR')
        );
        const emptySlots = startingSlots.filter(slot => !slot.player).length;

        if (emptySlots > 0) {
          await notificationService.notifyLineupReminder(
            team.ownerId,
            leagueId,
            emptySlots
          );
        }
      }
    } catch (error) {
      console.error('Error sending lineup reminders:', error);
    }
  }

  // Send waiver reminders to teams with pending claims
  private async sendWaiverReminders(leagueId: string): Promise<void> {
    try {
      const pendingWaivers = await prisma.waiverClaim.findMany({
        where: {
          leagueId,
          status: 'PENDING'
        },
        include: {
          team: {
            include: {
              owner: true
            }
          }
        },
        distinct: ['teamId']
      });

      for (const waiver of pendingWaivers) {
        const payload = {
          title: '📋 Waiver Reminder',
          body: 'Waivers process in 1 hour - Review your claims',
          icon: '/icons/waiver-icon-192.png',
          data: {
            type: 'waivers',
            leagueId,
            action: 'view_waivers'
          },
          actions: [
            { action: 'waivers', title: 'View Claims' }
          ]
        };

        await notificationService.sendNotification(
          [{ userId: waiver.team.ownerId, leagueId }],
          payload,
          notificationService.NOTIFICATION_TYPES.WAIVER_PROCESSED
        );
      }
    } catch (error) {
      console.error('Error sending waiver reminders:', error);
    }
  }

  // Check for upcoming draft picks and send reminders
  private async checkUpcomingDraftPicks(leagueId: string): Promise<void> {
    try {
      const draft = await prisma.draft.findUnique({
        where: { leagueId },
        include: {
          picks: {
            where: {
              playerId: null // Unpicked
            },
            orderBy: {
              pickNumber: 'asc'
            },
            take: 1,
            include: {
              team: {
                include: {
                  owner: true
                }
              }
            }
          }
        }
      });

      if (!draft || draft.picks.length === 0) return;

      const currentPick = draft.picks[0];
      const pickDeadline = new Date(currentPick.pickDeadline);
      const now = new Date();
      const minutesUntilDeadline = Math.floor((pickDeadline.getTime() - now.getTime()) / (1000 * 60));

      // Send reminder 10 minutes before deadline
      if (minutesUntilDeadline === 10) {
        await notificationService.notifyDraftTurn(
          currentPick.team.ownerId,
          leagueId,
          currentPick.pickNumber,
          10
        );
      }
      // Send urgent reminder 2 minutes before deadline
      else if (minutesUntilDeadline === 2) {
        const payload = {
          title: '⚠️ URGENT: Draft Pick',
          body: `Pick #${currentPick.pickNumber} - Only 2 minutes left!`,
          icon: '/icons/draft-icon-192.png',
          badge: '/icons/badge-72.png',
          data: {
            type: 'draft',
            leagueId,
            pickNumber: currentPick.pickNumber,
            action: 'make_pick'
          },
          requireInteraction: true
        };

        await notificationService.sendNotification(
          [{ userId: currentPick.team.ownerId, leagueId }],
          payload,
          notificationService.NOTIFICATION_TYPES.DRAFT_YOUR_TURN,
          'high'
        );
      }
    } catch (error) {
      console.error('Error checking upcoming draft picks:', error);
    }
  }

  // Check for close games and send notifications
  private async checkCloseGames(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { currentWeek: true }
      });

      if (!league) return;

      const matchups = await prisma.matchup.findMany({
        where: {
          leagueId,
          week: league.currentWeek
        },
        include: {
          team1: {
            include: {
              owner: true
            }
          },
          team2: {
            include: {
              owner: true
            }
          }
        }
      });

      for (const matchup of matchups) {
        const scoreDiff = Math.abs(matchup.team1Score - matchup.team2Score);
        
        // Only notify for close games (within 15 points) and active games
        if (scoreDiff <= 15 && scoreDiff > 0) {
          // Notify team 1
          await notificationService.notifyScoreUpdate(
            matchup.team1.ownerId,
            leagueId,
            matchup.team1Score,
            matchup.team2Score,
            league.currentWeek
          );

          // Notify team 2
          await notificationService.notifyScoreUpdate(
            matchup.team2.ownerId,
            leagueId,
            matchup.team2Score,
            matchup.team1Score,
            league.currentWeek
          );
        }
      }
    } catch (error) {
      console.error('Error checking close games:', error);
    }
  }

  // Schedule trade deadline reminder
  async scheduleTradeDeadlineReminder(leagueId: string, deadlineWeek: number): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { startDate: true }
      });

      if (!league) return;

      // Calculate trade deadline date (Tuesday of deadline week at 11:59 PM)
      const deadlineDate = new Date(league.startDate);
      deadlineDate.setDate(deadlineDate.getDate() + ((deadlineWeek - 1) * 7) + 2); // Tuesday of deadline week
      deadlineDate.setHours(23, 59, 0, 0);

      // Schedule reminder 24 hours before deadline
      const reminderDate = new Date(deadlineDate.getTime() - (24 * 60 * 60 * 1000));
      
      const taskId = `trade_deadline_${leagueId}`;
      const cronExpression = `${reminderDate.getMinutes()} ${reminderDate.getHours()} ${reminderDate.getDate()} ${reminderDate.getMonth() + 1} *`;
      
      const task = cron.schedule(cronExpression, async () => {
        try {
          const payload = {
            title: '⏰ Trade Deadline Reminder',
            body: 'Trade deadline is in 24 hours - Submit any final trades',
            icon: '/icons/trade-icon-192.png',
            data: {
              type: 'trade',
              leagueId,
              action: 'view_trades'
            },
            actions: [
              { action: 'trades', title: 'View Trades' }
            ]
          };

          await notificationService.sendLeagueNotification(
            leagueId,
            payload,
            notificationService.NOTIFICATION_TYPES.LEAGUE_UPDATE
          );

          // Remove the task after execution
          this.stopTask(taskId);
        } catch (error) {
          console.error('Error sending trade deadline reminder:', error);
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });

      this.tasks.set(taskId, task);
    } catch (error) {
      console.error('Error scheduling trade deadline reminder:', error);
    }
  }

  // Stop specific notification task
  stopTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.stop();
      this.tasks.delete(taskId);
    }
  }

  // Stop all tasks for a league
  stopLeagueNotifications(leagueId: string): void {
    const leagueTaskIds = Array.from(this.tasks.keys()).filter(id => id.includes(leagueId));
    
    for (const taskId of leagueTaskIds) {
      this.stopTask(taskId);
    }
  }

  // Stop all notification tasks
  stopAllTasks(): void {
    for (const [taskId, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();
  }

  // Get active tasks
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export const notificationScheduler = new NotificationScheduler();