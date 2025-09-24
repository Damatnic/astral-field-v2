import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

// Configure Web Push with VAPID keys (should be in environment variables)
webpush.setVapidDetails(
  'mailto:contact@astralfield.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

export interface NotificationTarget {
  userId: string;
  teamId?: string;
  leagueId?: string;
}

export class NotificationService {
  // Core notification types
  static readonly NOTIFICATION_TYPES = {
    TRADE_PROPOSED: 'trade_proposed',
    TRADE_ACCEPTED: 'trade_accepted',
    TRADE_REJECTED: 'trade_rejected',
    TRADE_COUNTERED: 'trade_countered',
    DRAFT_PICK_MADE: 'draft_pick_made',
    DRAFT_YOUR_TURN: 'draft_your_turn',
    WAIVER_PROCESSED: 'waiver_processed',
    WAIVER_CLAIMED: 'waiver_claimed',
    SCORE_UPDATE: 'score_update',
    MATCHUP_CLOSE: 'matchup_close',
    COMMISSIONER_ACTION: 'commissioner_action',
    LEAGUE_UPDATE: 'league_update',
    PLAYER_NEWS: 'player_news',
    LINEUP_REMINDER: 'lineup_reminder'
  } as const;

  // Store push subscription for a user
  async subscribeToPush(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      await prisma.pushSubscription.upsert({
        where: { userId },
        update: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updatedAt: new Date()
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
    } catch (error) {
      console.error('Error storing push subscription:', error);
      throw error;
    }
  }

  // Remove push subscription
  async unsubscribeFromPush(userId: string): Promise<void> {
    try {
      await prisma.pushSubscription.delete({
        where: { userId }
      });
    } catch (error) {
      console.error('Error removing push subscription:', error);
    }
  }

  // Send notification to specific users
  async sendNotification(
    targets: NotificationTarget[],
    payload: NotificationPayload,
    type: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    try {
      const userIds = targets.map(t => t.userId);
      
      // Get push subscriptions for target users
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId: { in: userIds },
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              notificationSettings: true
            }
          }
        }
      });

      // Filter based on user notification preferences
      const filteredSubscriptions = subscriptions.filter(sub => {
        const settings = sub.user.notificationSettings || {};
        return this.shouldSendNotification(type, settings);
      });

      // Store notification in database
      const notification = await prisma.notification.create({
        data: {
          type,
          title: payload.title,
          body: payload.body,
          data: payload.data ? JSON.stringify(payload.data) : null,
          priority,
          targets: {
            create: targets.map(target => ({
              userId: target.userId,
              teamId: target.teamId,
              leagueId: target.leagueId
            }))
          }
        }
      });

      // Send push notifications
      const pushPromises = filteredSubscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          const options = {
            TTL: 86400, // 24 hours
            urgency: priority === 'high' ? 'high' : 'normal',
            headers: {}
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              ...payload,
              notificationId: notification.id,
              timestamp: Date.now()
            }),
            options
          );

          // Mark as delivered
          await prisma.notificationDelivery.create({
            data: {
              notificationId: notification.id,
              userId: sub.userId,
              status: 'delivered',
              deliveredAt: new Date()
            }
          });

        } catch (pushError) {
          console.error(`Failed to send push to user ${sub.userId}:`, pushError);
          
          // Mark as failed
          await prisma.notificationDelivery.create({
            data: {
              notificationId: notification.id,
              userId: sub.userId,
              status: 'failed',
              error: pushError.message
            }
          });

          // If subscription is no longer valid, deactivate it
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false }
            });
          }
        }
      });

      await Promise.allSettled(pushPromises);

    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to entire league
  async sendLeagueNotification(
    leagueId: string,
    payload: NotificationPayload,
    type: string,
    excludeUserId?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    try {
      // Get all users in the league
      const leagueMembers = await prisma.team.findMany({
        where: { leagueId },
        select: {
          id: true,
          ownerId: true
        }
      });

      const targets: NotificationTarget[] = leagueMembers
        .filter(member => member.ownerId !== excludeUserId)
        .map(member => ({
          userId: member.ownerId,
          teamId: member.id,
          leagueId
        }));

      await this.sendNotification(targets, payload, type, priority);
    } catch (error) {
      console.error('Error sending league notification:', error);
      throw error;
    }
  }

  // Trade-specific notifications
  async notifyTradeProposed(
    tradeId: string,
    proposerName: string,
    recipientUserId: string,
    leagueId: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: '🔄 New Trade Proposal',
      body: `${proposerName} has sent you a trade proposal`,
      icon: '/icons/trade-icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        type: 'trade',
        tradeId,
        leagueId,
        action: 'view_trade'
      },
      actions: [
        { action: 'view', title: 'View Trade' },
        { action: 'accept', title: 'Accept' },
        { action: 'reject', title: 'Reject' }
      ],
      tag: `trade_${tradeId}`,
      requireInteraction: true
    };

    await this.sendNotification(
      [{ userId: recipientUserId, leagueId }],
      payload,
      this.NOTIFICATION_TYPES.TRADE_PROPOSED,
      'high'
    );
  }

  async notifyTradeAccepted(
    tradeId: string,
    acceptorName: string,
    proposerUserId: string,
    leagueId: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: '✅ Trade Accepted',
      body: `${acceptorName} accepted your trade proposal`,
      icon: '/icons/trade-icon-192.png',
      data: {
        type: 'trade',
        tradeId,
        leagueId,
        action: 'view_trade'
      }
    };

    await this.sendNotification(
      [{ userId: proposerUserId, leagueId }],
      payload,
      this.NOTIFICATION_TYPES.TRADE_ACCEPTED
    );
  }

  // Draft notifications
  async notifyDraftTurn(userId: string, leagueId: string, pickNumber: number, timeLimit: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '📋 Your Draft Pick',
      body: `Pick #${pickNumber} - You have ${timeLimit} minutes to make your selection`,
      icon: '/icons/draft-icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        type: 'draft',
        leagueId,
        pickNumber,
        action: 'make_pick'
      },
      actions: [
        { action: 'draft', title: 'Make Pick' }
      ],
      requireInteraction: true
    };

    await this.sendNotification(
      [{ userId, leagueId }],
      payload,
      this.NOTIFICATION_TYPES.DRAFT_YOUR_TURN,
      'high'
    );
  }

  async notifyDraftPick(
    leagueId: string,
    playerName: string,
    teamName: string,
    pickNumber: number,
    excludeUserId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: '📋 Draft Pick Made',
      body: `Pick #${pickNumber}: ${teamName} selected ${playerName}`,
      icon: '/icons/draft-icon-192.png',
      data: {
        type: 'draft',
        leagueId,
        pickNumber,
        action: 'view_draft'
      }
    };

    await this.sendLeagueNotification(
      leagueId,
      payload,
      this.NOTIFICATION_TYPES.DRAFT_PICK_MADE,
      excludeUserId
    );
  }

  // Waiver notifications
  async notifyWaiverProcessed(userId: string, leagueId: string, claimedPlayers: string[], missedPlayers: string[]): Promise<void> {
    const totalClaimed = claimedPlayers.length;
    const totalMissed = missedPlayers.length;
    
    let body = '';
    if (totalClaimed > 0 && totalMissed > 0) {
      body = `${totalClaimed} claim(s) successful, ${totalMissed} missed`;
    } else if (totalClaimed > 0) {
      body = `${totalClaimed} waiver claim(s) successful`;
    } else {
      body = `${totalMissed} waiver claim(s) unsuccessful`;
    }

    const payload: NotificationPayload = {
      title: '📋 Waivers Processed',
      body,
      icon: '/icons/waiver-icon-192.png',
      data: {
        type: 'waivers',
        leagueId,
        claimedPlayers,
        missedPlayers,
        action: 'view_waivers'
      }
    };

    await this.sendNotification(
      [{ userId, leagueId }],
      payload,
      this.NOTIFICATION_TYPES.WAIVER_PROCESSED
    );
  }

  // Scoring notifications
  async notifyScoreUpdate(userId: string, leagueId: string, currentScore: number, opponentScore: number, week: number): Promise<void> {
    const scoreDiff = Math.abs(currentScore - opponentScore);
    const isWinning = currentScore > opponentScore;
    const isClose = scoreDiff < 10;

    if (isClose) {
      const payload: NotificationPayload = {
        title: '🏈 Close Game Alert',
        body: `Week ${week}: You're ${isWinning ? 'winning' : 'trailing'} ${currentScore.toFixed(1)} - ${opponentScore.toFixed(1)}`,
        icon: '/icons/score-icon-192.png',
        data: {
          type: 'scoring',
          leagueId,
          week,
          currentScore,
          opponentScore,
          action: 'view_matchup'
        }
      };

      await this.sendNotification(
        [{ userId, leagueId }],
        payload,
        this.NOTIFICATION_TYPES.MATCHUP_CLOSE
      );
    }
  }

  // Lineup reminder
  async notifyLineupReminder(userId: string, leagueId: string, emptySlots: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '⚠️ Lineup Reminder',
      body: `You have ${emptySlots} empty roster slot${emptySlots > 1 ? 's' : ''} for this week`,
      icon: '/icons/lineup-icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        type: 'lineup',
        leagueId,
        emptySlots,
        action: 'set_lineup'
      },
      actions: [
        { action: 'lineup', title: 'Set Lineup' }
      ],
      requireInteraction: true
    };

    await this.sendNotification(
      [{ userId, leagueId }],
      payload,
      this.NOTIFICATION_TYPES.LINEUP_REMINDER,
      'high'
    );
  }

  // Commissioner notifications
  async notifyCommissionerAction(
    leagueId: string,
    actionType: string,
    details: string,
    commissionerName: string,
    excludeUserId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: '⚖️ Commissioner Action',
      body: `${commissionerName}: ${details}`,
      icon: '/icons/commissioner-icon-192.png',
      data: {
        type: 'commissioner',
        leagueId,
        actionType,
        details,
        action: 'view_league'
      }
    };

    await this.sendLeagueNotification(
      leagueId,
      payload,
      this.NOTIFICATION_TYPES.COMMISSIONER_ACTION,
      excludeUserId
    );
  }

  // Check notification preferences
  private shouldSendNotification(type: string, settings: any): boolean {
    if (!settings) return true; // Default to sending if no preferences set

    const categoryMap = {
      [this.NOTIFICATION_TYPES.TRADE_PROPOSED]: 'trades',
      [this.NOTIFICATION_TYPES.TRADE_ACCEPTED]: 'trades',
      [this.NOTIFICATION_TYPES.TRADE_REJECTED]: 'trades',
      [this.NOTIFICATION_TYPES.TRADE_COUNTERED]: 'trades',
      [this.NOTIFICATION_TYPES.DRAFT_PICK_MADE]: 'draft',
      [this.NOTIFICATION_TYPES.DRAFT_YOUR_TURN]: 'draft',
      [this.NOTIFICATION_TYPES.WAIVER_PROCESSED]: 'waivers',
      [this.NOTIFICATION_TYPES.WAIVER_CLAIMED]: 'waivers',
      [this.NOTIFICATION_TYPES.SCORE_UPDATE]: 'scoring',
      [this.NOTIFICATION_TYPES.MATCHUP_CLOSE]: 'scoring',
      [this.NOTIFICATION_TYPES.COMMISSIONER_ACTION]: 'league',
      [this.NOTIFICATION_TYPES.LEAGUE_UPDATE]: 'league',
      [this.NOTIFICATION_TYPES.PLAYER_NEWS]: 'news',
      [this.NOTIFICATION_TYPES.LINEUP_REMINDER]: 'lineup'
    };

    const category = categoryMap[type];
    return category ? settings[category] !== false : true;
  }

  // Get user notification history
  async getNotificationHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          targets: {
            some: {
              userId
            }
          }
        },
        include: {
          delivery: {
            where: { userId },
            select: {
              status: true,
              deliveredAt: true,
              readAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notificationDelivery.updateMany({
        where: {
          notificationId,
          userId
        },
        data: {
          readAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();