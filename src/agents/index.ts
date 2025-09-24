// Agent system for automated platform tasks
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';

export class SeedingAgent {
  private name = 'SeedingAgent';
  
  async run(): Promise<void> {
    try {
      // Check if database needs seeding
      const userCount = await prisma.user.count();
      const playerCount = await prisma.player.count();
      
      if (userCount === 0) {
        console.log('[SeedingAgent] Database appears empty, needs initial seeding');
        // Initial seeding would be handled by scripts
      }
      
      if (playerCount === 0) {
        console.log('[SeedingAgent] No players found, needs player data import');
        // Player import would be handled by Sleeper sync
      }
      
      console.log(`[SeedingAgent] Database check complete - Users: ${userCount}, Players: ${playerCount}`);
    } catch (error) {
      handleComponentError(error as Error, this.name);
    }
  }
}

export class VerifierAgent {
  private name = 'VerifierAgent';
  
  async run(): Promise<void> {
    try {
      // Verify critical data integrity
      const issues: string[] = [];
      
      // Check for teams without owners (ownerId is required, so we check for empty string instead)
      const orphanedTeams = await prisma.team.count({
        where: { ownerId: '' }
      });
      if (orphanedTeams > 0) {
        issues.push(`Found ${orphanedTeams} teams without owners`);
      }
      
      // Check for active leagues
      const activeLeagues = await prisma.league.count({
        where: { isActive: true }
      });
      if (activeLeagues === 0) {
        issues.push('No active leagues found');
      }
      
      // Check for incomplete matchups
      const incompleteMatchups = await prisma.matchup.count({
        where: {
          isComplete: false,
          week: { lt: await this.getCurrentWeek() }
        }
      });
      if (incompleteMatchups > 0) {
        issues.push(`Found ${incompleteMatchups} incomplete past matchups`);
      }
      
      if (issues.length > 0) {
        console.log(`[VerifierAgent] Data integrity issues found:`, issues);
      } else {
        console.log('[VerifierAgent] All data integrity checks passed');
      }
    } catch (error) {
      handleComponentError(error as Error, this.name);
    }
  }
  
  private async getCurrentWeek(): Promise<number> {
    const league = await prisma.league.findFirst({
      where: { isActive: true },
      select: { currentWeek: true }
    });
    return league?.currentWeek || 1;
  }
}

export class NotifierAgent {
  private name = 'NotifierAgent';
  
  async run(): Promise<void> {
    try {
      // Check for notifications that need to be sent
      const pendingNotifications = await prisma.notificationDelivery.count({
        where: {
          readAt: null,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      
      if (pendingNotifications > 0) {
        console.log(`[NotifierAgent] Found ${pendingNotifications} pending notifications`);
        
        // Process notifications
        const notifications = await prisma.notification.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          take: 100
        });
        
        for (const notification of notifications) {
          // Mark as processed (actual sending would require email/push service)
          // Mark as processed in delivery record
          await prisma.notificationDelivery.updateMany({
            where: { notificationId: notification.id },
            data: { readAt: new Date() }
          });
        }
        
        console.log(`[NotifierAgent] Processed ${notifications.length} notifications`);
      } else {
        console.log('[NotifierAgent] No pending notifications');
      }
    } catch (error) {
      handleComponentError(error as Error, this.name);
    }
  }
}

export class FallbackAgent {
  private name = 'FallbackAgent';
  
  async run(): Promise<void> {
    try {
      // Handle fallback scenarios for failed operations
      
      // Check for rejected trades that need cleanup
      const rejectedTrades = await prisma.tradeProposal.count({
        where: {
          status: 'rejected',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
          }
        }
      });
      
      if (rejectedTrades > 0) {
        console.log(`[FallbackAgent] Found ${rejectedTrades} rejected trades to cleanup`);
        
        // Clean up rejected trades older than 7 days
        await prisma.tradeProposal.deleteMany({
          where: {
            status: 'rejected',
            createdAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        });
      }
      
      // Check for expired sessions
      const expiredSessions = await prisma.session.count({
        where: {
          expires: { lt: new Date() }
        }
      });
      
      if (expiredSessions > 0) {
        console.log(`[FallbackAgent] Cleaning up ${expiredSessions} expired sessions`);
        
        await prisma.session.deleteMany({
          where: {
            expires: { lt: new Date() }
          }
        });
      }
      
      console.log('[FallbackAgent] Fallback cleanup complete');
    } catch (error) {
      handleComponentError(error as Error, this.name);
    }
  }
}

// Export default agents
export const agents = {
  SeedingAgent,
  VerifierAgent,
  NotifierAgent,
  FallbackAgent
};

export default agents;