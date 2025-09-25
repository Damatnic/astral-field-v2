import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRostersCompletely() {
  try {
    console.log('🏈 Starting complete roster fix...\n');
    
    // Get all teams
    const teams = await prisma.team.findMany({
      include: {
        owner: true,
        league: true
      }
    });
    
    console.log(`Found ${teams.length} teams to fix\n`);
    
    // Clear all existing roster data
    console.log('🗑️ Clearing all existing roster data...');
    await prisma.roster.deleteMany({});
    console.log('✅ All old roster data cleared\n');
    
    // Sample players for each position (realistic fantasy players)
    const playerTemplates = {
      QB: [
        { name: 'Patrick Mahomes', team: 'KC', bye: 6 },
        { name: 'Josh Allen', team: 'BUF', bye: 13 },
        { name: 'Jalen Hurts', team: 'PHI', bye: 10 },
        { name: 'Dak Prescott', team: 'DAL', bye: 7 }
      ],
      RB: [
        { name: 'Christian McCaffrey', team: 'SF', bye: 9 },
        { name: 'Austin Ekeler', team: 'LAC', bye: 5 },
        { name: 'Nick Chubb', team: 'CLE', bye: 5 },
        { name: 'Derrick Henry', team: 'TEN', bye: 7 },
        { name: 'Tony Pollard', team: 'DAL', bye: 7 },
        { name: 'Josh Jacobs', team: 'LV', bye: 13 }
      ],
      WR: [
        { name: 'Tyreek Hill', team: 'MIA', bye: 10 },
        { name: 'Justin Jefferson', team: 'MIN', bye: 13 },
        { name: 'Stefon Diggs', team: 'BUF', bye: 13 },
        { name: 'CeeDee Lamb', team: 'DAL', bye: 7 },
        { name: 'A.J. Brown', team: 'PHI', bye: 10 },
        { name: 'Davante Adams', team: 'LV', bye: 13 }
      ],
      TE: [
        { name: 'Travis Kelce', team: 'KC', bye: 6 },
        { name: 'Mark Andrews', team: 'BAL', bye: 13 },
        { name: 'T.J. Hockenson', team: 'MIN', bye: 13 }
      ],
      DEF: [
        { name: 'San Francisco 49ers', team: 'SF', bye: 9 },
        { name: 'Buffalo Bills', team: 'BUF', bye: 13 },
        { name: 'Dallas Cowboys', team: 'DAL', bye: 7 }
      ],
      K: [
        { name: 'Justin Tucker', team: 'BAL', bye: 13 },
        { name: 'Harrison Butker', team: 'KC', bye: 6 },
        { name: 'Daniel Carlson', team: 'LV', bye: 13 }
      ]
    };
    
    // Create rosters for each team
    for (const team of teams) {
      console.log(`\n📝 Creating roster for ${team.name}...`);
      
      const rosterSpots = [];
      
      // Add 2 QBs
      for (let i = 0; i < 2; i++) {
        const qb = playerTemplates.QB[i % playerTemplates.QB.length];
        rosterSpots.push({
          teamId: team.id,
          position: 'QB',
          playerName: qb.name,
          playerTeam: qb.team,
          byeWeek: qb.bye,
          isStarter: i === 0,
          positionRank: i + 1,
          projectedPoints: 20 - i * 2
        });
      }
      
      // Add 4 RBs
      for (let i = 0; i < 4; i++) {
        const rb = playerTemplates.RB[i % playerTemplates.RB.length];
        rosterSpots.push({
          teamId: team.id,
          position: 'RB',
          playerName: rb.name,
          playerTeam: rb.team,
          byeWeek: rb.bye,
          isStarter: i < 2,
          positionRank: i + 1,
          projectedPoints: 15 - i * 2
        });
      }
      
      // Add 6 WRs
      for (let i = 0; i < 6; i++) {
        const wr = playerTemplates.WR[i % playerTemplates.WR.length];
        rosterSpots.push({
          teamId: team.id,
          position: 'WR',
          playerName: wr.name,
          playerTeam: wr.team,
          byeWeek: wr.bye,
          isStarter: i < 3,
          positionRank: i + 1,
          projectedPoints: 12 - i
        });
      }
      
      // Add 2 TEs
      for (let i = 0; i < 2; i++) {
        const te = playerTemplates.TE[i % playerTemplates.TE.length];
        rosterSpots.push({
          teamId: team.id,
          position: 'TE',
          playerName: te.name,
          playerTeam: te.team,
          byeWeek: te.bye,
          isStarter: i === 0,
          positionRank: i + 1,
          projectedPoints: 8 - i * 2
        });
      }
      
      // Add 1 DEF
      const def = playerTemplates.DEF[0];
      rosterSpots.push({
        teamId: team.id,
        position: 'DEF',
        playerName: def.name,
        playerTeam: def.team,
        byeWeek: def.bye,
        isStarter: true,
        positionRank: 1,
        projectedPoints: 7
      });
      
      // Add 1 K
      const k = playerTemplates.K[0];
      rosterSpots.push({
        teamId: team.id,
        position: 'K',
        playerName: k.name,
        playerTeam: k.team,
        byeWeek: k.bye,
        isStarter: true,
        positionRank: 1,
        projectedPoints: 8
      });
      
      // Create all roster entries
      await prisma.roster.createMany({
        data: rosterSpots
      });
      
      console.log(`✅ Created ${rosterSpots.length} players for ${team.name}`);
      console.log(`   Starters: ${rosterSpots.filter(p => p.isStarter).length}`);
      console.log(`   Bench: ${rosterSpots.filter(p => !p.isStarter).length}`);
    }
    
    // Verify the rosters
    console.log('\n📊 Verification:');
    for (const team of teams) {
      const roster = await prisma.roster.findMany({
        where: { teamId: team.id }
      });
      
      const byPosition = roster.reduce((acc, player) => {
        acc[player.position] = (acc[player.position] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`\n${team.name}:`);
      console.log(`  Total players: ${roster.length}`);
      console.log(`  QB: ${byPosition.QB || 0}, RB: ${byPosition.RB || 0}, WR: ${byPosition.WR || 0}`);
      console.log(`  TE: ${byPosition.TE || 0}, DEF: ${byPosition.DEF || 0}, K: ${byPosition.K || 0}`);
      console.log(`  Starters: ${roster.filter(p => p.isStarter).length}`);
    }
    
    console.log('\n✨ Roster fix complete! All teams now have 16 players.');
    
  } catch (error) {
    console.error('❌ Error fixing rosters:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRostersCompletely();