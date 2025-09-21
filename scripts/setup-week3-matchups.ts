import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupWeek3Matchups() {
  try {
    console.log('⚡ Setting up Week 3 matchups for 2025 NFL season...\n');
    
    const league = await prisma.league.findFirst({
      where: { season: 2025 },
      include: { 
        teams: {
          include: {
            owner: { select: { name: true, email: true } }
          },
          orderBy: { name: 'asc' }
        }
      }
    });
    
    if (!league || league.teams.length !== 10) {
      console.log('❌ League not found or incorrect team count');
      return;
    }
    
    console.log(`🏈 League: ${league.name}`);
    console.log(`👥 Teams: ${league.teams.length}`);
    
    // Check if Week 3 matchups already exist
    const existingMatchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
        week: 3,
        season: 2025
      }
    });
    
    if (existingMatchups.length > 0) {
      console.log('✅ Week 3 matchups already exist');
      
      // Display existing matchups
      console.log('\n🏆 Week 3 Matchups:');
      const matchupPairs = new Map();
      
      for (const matchup of existingMatchups) {
        if (!matchupPairs.has(matchup.homeTeamId)) {
          const homeTeam = league.teams.find(t => t.id === matchup.homeTeamId);
          const awayTeam = league.teams.find(t => t.id === matchup.awayTeamId);
          
          if (homeTeam && awayTeam) {
            matchupPairs.set(matchup.homeTeamId, {
              home: homeTeam,
              away: awayTeam
            });
          }
        }
      }
      
      let matchupNumber = 1;
      for (const [_, pair] of matchupPairs) {
        console.log(`${matchupNumber}. ${pair.home.name} (${pair.home.owner?.name}) vs ${pair.away.name} (${pair.away.owner?.name})`);
        matchupNumber++;
      }
      
      return;
    }
    
    // Create Week 3 matchups (5 games for 10 teams)
    console.log('🎲 Creating Week 3 matchups...');
    
    // Shuffle teams for random matchups
    const teams = [...league.teams];
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
    
    const matchups = [];
    
    // Create 5 matchups (10 teams / 2)
    for (let i = 0; i < teams.length; i += 2) {
      const homeTeam = teams[i];
      const awayTeam = teams[i + 1];
      
      // Create matchup for home team
      const homeMatchup = await prisma.matchup.create({
        data: {
          leagueId: league.id,
          week: 3,
          season: 2025,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeScore: 0,
          awayScore: 0,
          isComplete: false
        }
      });
      
      // Create matchup for away team
      await prisma.matchup.create({
        data: {
          leagueId: league.id,
          week: 3,
          season: 2025,
          homeTeamId: awayTeam.id,
          awayTeamId: homeTeam.id,
          homeScore: 0,
          awayScore: 0,
          isComplete: false
        }
      });
      
      matchups.push({
        home: homeTeam,
        away: awayTeam
      });
    }
    
    console.log('\n🏆 Week 3 Matchups Created:');
    matchups.forEach((matchup, index) => {
      console.log(`${index + 1}. ${matchup.home.name} (${matchup.home.owner?.name}) vs ${matchup.away.name} (${matchup.away.owner?.name})`);
    });
    
    // Verify league is ready for Week 3
    console.log('\n🔍 Verifying Week 3 readiness...');
    
    const teamRosterCounts = await Promise.all(
      league.teams.map(async (team) => {
        const rosterCount = await prisma.rosterPlayer.count({
          where: { teamId: team.id }
        });
        return { team: team.name, owner: team.owner?.name, rosterSize: rosterCount };
      })
    );
    
    console.log('\n👥 Team Roster Status:');
    teamRosterCounts.forEach(team => {
      const status = team.rosterSize >= 9 ? '✅' : '⚠️';
      console.log(`${status} ${team.team} (${team.owner}): ${team.rosterSize} players`);
    });
    
    const allTeamsReady = teamRosterCounts.every(team => team.rosterSize >= 9);
    
    if (allTeamsReady) {
      console.log('\n🎉 All teams ready for Week 3 competition!');
      console.log('📊 League Status: ✅ READY FOR LIVE PLAY');
    } else {
      console.log('\n⚠️ Some teams may need additional players');
    }
    
  } catch (error) {
    console.error('❌ Error setting up Week 3 matchups:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupWeek3Matchups();