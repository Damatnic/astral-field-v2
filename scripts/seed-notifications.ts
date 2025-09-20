import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedNotifications() {
  try {
    console.log('🔔 Seeding notifications...');
    
    // Get all users
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log('No users found. Please run user seed script first.');
      return;
    }
    
    // Get the D'Amato Dynasty League
    const league = await prisma.league.findFirst({
      where: { name: "D'Amato Dynasty League" }
    });
    
    if (!league) {
      console.log('League not found. Please run league seed script first.');
      return;
    }
    
    // Create various notification types for each user
    for (const user of users) {
      const notifications = [];
      
      // Trade notification
      notifications.push({
        userId: user.id,
        leagueId: league.id,
        type: 'TRADE' as const,
        title: 'Trade Proposal Received',
        message: 'You have received a new trade proposal. Review it in your team dashboard.',
        isRead: false,
        metadata: {
          tradeId: 'sample-trade-1'
        }
      });
      
      // Waiver notification  
      notifications.push({
        userId: user.id,
        leagueId: league.id,
        type: 'WAIVER' as const,
        title: 'Waiver Claim Processed',
        message: 'Your waiver claim has been successfully processed.',
        isRead: Math.random() > 0.5,
        metadata: {
          playerId: 'sample-player-1',
          result: 'success'
        }
      });
      
      // Lineup notification
      notifications.push({
        userId: user.id,
        leagueId: league.id,
        type: 'LINEUP' as const,
        title: 'Lineup Reminder',
        message: 'Don\'t forget to set your lineup for Week 15!',
        isRead: Math.random() > 0.3,
        metadata: {
          week: 15
        }
      });
      
      // System notification
      notifications.push({
        userId: user.id,
        leagueId: league.id,
        type: 'SYSTEM' as const,
        title: 'League Settings Updated',
        message: 'The commissioner has updated the league scoring settings.',
        isRead: Math.random() > 0.7,
        metadata: {
          changeType: 'scoring'
        }
      });
      
      // Create notifications with staggered timestamps
      for (let i = 0; i < notifications.length; i++) {
        const hoursAgo = Math.floor(Math.random() * 72); // Random time within last 3 days
        await prisma.notification.create({
          data: {
            ...notifications[i],
            createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
          }
        });
      }
      
      console.log(`✅ Created ${notifications.length} notifications for ${user.name}`);
    }
    
    // Add some league-wide announcements
    const commissionerId = league.commissionerId;
    if (commissionerId) {
      await prisma.notification.create({
        data: {
          userId: commissionerId,
          leagueId: league.id,
          type: 'SYSTEM',
          title: 'Commissioner Action Required',
          message: '3 trades are pending your review.',
          isRead: false,
          metadata: {
            actionType: 'trade_review',
            count: 3
          }
        }
      });
      console.log('✅ Created commissioner notification');
    }
    
    const totalNotifications = await prisma.notification.count();
    console.log(`\n📊 Total notifications in database: ${totalNotifications}`);
    
    console.log('\n✨ Notification seeding complete!');
    
  } catch (error) {
    console.error('Error seeding notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedNotifications().catch(console.error);