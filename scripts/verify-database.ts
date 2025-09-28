import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Verifying Fantasy Football Database...\n');

  try {
    // Check users
    const userCount = await prisma.user.count();
    console.log(`👥 Users: ${userCount}`);

    // Check league
    const leagueCount = await prisma.league.count();
    const league = await prisma.league.findFirst();
    console.log(`🏆 Leagues: ${leagueCount}`);
    console.log(`   Current Week: ${league?.currentWeek}`);

    // Check teams
    const teamCount = await prisma.team.count();
    console.log(`🎽 Teams: ${teamCount}`);

    // Check players
    const playerCount = await prisma.player.count();
    console.log(`🏃‍♂️ Players: ${playerCount}`);

    // Check completed matchups
    const completedMatchups = await prisma.matchup.count({
      where: { isComplete: true }
    });
    console.log(`⚔️ Completed Matchups: ${completedMatchups}`);

    // Check pending matchups (Week 4)
    const pendingMatchups = await prisma.matchup.count({
      where: { isComplete: false }
    });
    console.log(`📅 Week 4 Matchups: ${pendingMatchups}`);

    // Check player stats
    const statsCount = await prisma.playerStats.count();
    console.log(`📊 Player Stats Records: ${statsCount}`);

    // Check roster assignments
    const rosterCount = await prisma.rosterPlayer.count();
    console.log(`📋 Roster Assignments: ${rosterCount}`);

    // Check trades
    const tradeCount = await prisma.tradeProposal.count();
    console.log(`💱 Trade Proposals: ${tradeCount}`);

    // Check chat messages
    const messageCount = await prisma.chatMessage.count();
    console.log(`💬 Chat Messages: ${messageCount}`);

    // Show current standings
    console.log('\n🏆 CURRENT STANDINGS:');
    const teams = await prisma.team.findMany({
      include: {
        owner: true
      },
      orderBy: [
        { wins: 'desc' },
        { losses: 'asc' }
      ]
    });

    teams.forEach((team, index) => {
      const record = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`;
      console.log(`${index + 1}. ${team.name} (${team.owner.name}) - ${record}`);
    });

    // Show sample week 4 matchups
    console.log('\n📅 WEEK 4 MATCHUPS:');
    const week4Matchups = await prisma.matchup.findMany({
      where: {
        week: 4,
        isComplete: false
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    week4Matchups.forEach(matchup => {
      console.log(`• ${matchup.homeTeam.name} vs ${matchup.awayTeam.name}`);
    });

    // Show one team's roster as example
    console.log('\n🎽 SAMPLE ROSTER (D\'Amato Dynasty):');
    const sampleTeam = await prisma.team.findFirst({
      where: { name: "D'Amato Dynasty" },
      include: {
        roster: {
          include: {
            player: true
          },
          orderBy: [
            { position: 'asc' },
            { isStarter: 'desc' }
          ]
        }
      }
    });

    if (sampleTeam) {
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'BENCH'];
      positions.forEach(pos => {
        const players = sampleTeam.roster.filter(r => r.position === pos);
        if (players.length > 0) {
          console.log(`${pos}: ${players.map(p => p.player.name).join(', ')}`);
        }
      });
    }

    console.log('\n✅ Database verification complete!');

  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();