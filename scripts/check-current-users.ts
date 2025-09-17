import { prisma } from '../src/lib/db';

async function checkCurrentUsers() {
  console.log('👥 Checking current users in database...');
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            teams: true,
            leagues: true,
            commissionedLeagues: true
          }
        }
      }
    });

    console.log(`\nFound ${users.length} users in database:`);
    console.log('=====================================');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Teams: ${user._count.teams}`);
      console.log(`   Leagues: ${user._count.leagues}`);
      console.log(`   Commissioned leagues: ${user._count.commissionedLeagues}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Also check leagues
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        commissioner: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            teams: true,
            members: true
          }
        }
      }
    });

    console.log(`\nFound ${leagues.length} leagues in database:`);
    console.log('=====================================');
    
    leagues.forEach((league, index) => {
      console.log(`${index + 1}. ${league.name}`);
      console.log(`   Commissioner: ${league.commissioner.name} (${league.commissioner.email})`);
      console.log(`   Teams: ${league._count.teams}`);
      console.log(`   Members: ${league._count.members}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking users:', error);
    throw error;
  }
}

checkCurrentUsers()
  .then(() => {
    console.log('✅ User check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });