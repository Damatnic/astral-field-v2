require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatchups() {
  try {
    // Check matchups
    const matchups = await prisma.matchup.findMany({
      include: {
        homeTeam: { 
          select: { 
            id: true, 
            name: true, 
            owner: { select: { name: true, email: true } }
          } 
        },
        awayTeam: { 
          select: { 
            id: true, 
            name: true, 
            owner: { select: { name: true, email: true } }
          } 
        },
        league: {
          select: { id: true, name: true, currentWeek: true }
        }
      },
      orderBy: { week: 'desc' },
      take: 10
    });
    
    console.log('Recent Matchups found:', matchups.length);
    matchups.forEach(matchup => {
      console.log(`Week ${matchup.week}: ${matchup.homeTeam.name} vs ${matchup.awayTeam.name}`);
      console.log(`  Home: ${matchup.homeTeam.owner.name} (${matchup.homeScore || 0} pts)`);
      console.log(`  Away: ${matchup.awayTeam.owner.name} (${matchup.awayScore || 0} pts)`);
      console.log(`  Status: ${matchup.status} | League: ${matchup.league.name}`);
      console.log('---');
    });
    
    // Check current week info
    const leagues = await prisma.league.findMany({
      select: { id: true, name: true, currentWeek: true, season: true }
    });
    console.log('\nLeague Info:');
    leagues.forEach(league => {
      console.log(`${league.name}: Week ${league.currentWeek}, Season ${league.season}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMatchups();