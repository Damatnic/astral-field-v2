const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function checkUserPasswords() {
  try {
    console.log('🔍 Checking D\'Amato Dynasty League user accounts...\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      include: {
        teams: {
          include: {
            league: true
          }
        }
      }
    });
    
    console.log(`Found ${users.length} users in database:\n`);
    
    users.forEach((user, index) => {
      const hasPassword = user.password ? '✅ SET' : '❌ MISSING';
      const teamInfo = user.teams.length > 0 ? 
        `${user.teams[0].name} (${user.teams[0].league.name})` : 
        'No team';
      
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Password: ${hasPassword}`);
      console.log(`   Team: ${teamInfo}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });
    
    // Count users with/without passwords
    const usersWithPasswords = users.filter(u => u.password).length;
    const usersWithoutPasswords = users.filter(u => !u.password).length;
    
    console.log('📊 SUMMARY:');
    console.log(`✅ Users with passwords: ${usersWithPasswords}`);
    console.log(`❌ Users without passwords: ${usersWithoutPasswords}`);
    
    if (usersWithoutPasswords > 0) {
      console.log('\n⚠️  Need to set passwords for users without them!');
    } else {
      console.log('\n🎉 All users have passwords set!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPasswords();