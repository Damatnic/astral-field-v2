const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function getRealIds() {
  try {
    // Get test user
    const user = await prisma.user.findUnique({
      where: { email: 'nicholas@damato-dynasty.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: user.id },
      include: { league: true }
    });
    
    if (!team) {
      console.log('Team not found');
      return;
    }
    
    // Get another team in same league
    const otherTeam = await prisma.team.findFirst({
      where: { 
        leagueId: team.leagueId,
        id: { not: team.id }
      }
    });
    
    console.log('Real IDs for testing:');
    console.log(`User ID: ${user.id}`);
    console.log(`League ID: ${team.leagueId}`);
    console.log(`Team 1 ID: ${team.id}`);
    console.log(`Team 2 ID: ${otherTeam ? otherTeam.id : 'No other team found'}`);
    
    // Check if user is a league member
    const leagueMember = await prisma.leagueMember.findFirst({
      where: {
        userId: user.id,
        leagueId: team.leagueId
      }
    });
    
    console.log(`League member record: ${leagueMember ? 'EXISTS' : 'MISSING'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getRealIds();