const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function setAllPasswords() {
  try {
    console.log('🔐 Setting passwords for all D\'Amato Dynasty League users...\n');
    
    // Get users without passwords
    const usersWithoutPasswords = await prisma.user.findMany({
      where: {
        password: null
      },
      include: {
        teams: {
          include: {
            league: true
          }
        }
      }
    });
    
    console.log(`Found ${usersWithoutPasswords.length} users without passwords:\n`);
    
    // Default password for all users: "Dynasty2025!"
    const defaultPassword = "Dynasty2025!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    let updatedCount = 0;
    
    for (const user of usersWithoutPasswords) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        
        const teamInfo = user.teams.length > 0 ? 
          `${user.teams[0].name} (${user.teams[0].league.name})` : 
          'No team';
        
        console.log(`✅ ${user.email} - ${user.name}`);
        console.log(`   Team: ${teamInfo}`);
        console.log(`   Password set to: ${defaultPassword}\n`);
        
        updatedCount++;
      } catch (error) {
        console.log(`❌ Failed to update ${user.email}: ${error.message}\n`);
      }
    }
    
    console.log('📊 RESULTS:');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Failed to update: ${usersWithoutPasswords.length - updatedCount} users`);
    console.log(`\n🔑 Default password for all accounts: "${defaultPassword}"`);
    
    // Also update the current week to 3 for the 2025 season
    console.log('\n🏈 Updating NFL season to Week 3 of 2025...');
    
    const league = await prisma.league.findFirst({
      where: { name: "D'Amato Dynasty League" }
    });
    
    if (league) {
      await prisma.league.update({
        where: { id: league.id },
        data: { 
          currentWeek: 3,
          season: 2025
        }
      });
      console.log('✅ Updated league to Week 3 of 2025 season');
    }
    
    console.log('\n🎉 All setup complete! Users can now login with their credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAllPasswords();