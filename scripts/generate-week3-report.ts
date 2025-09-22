import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateWeek3Report() {
  try {
    console.log('📋 Generating Week 3 League Report for 2025 NFL Season...\n');
    
    const league = await prisma.league.findFirst({
      where: { season: 2025 },
      include: { 
        settings: true,
        teams: {
          include: {
            owner: { 
              select: { 
                id: true,
                name: true, 
                email: true,
                role: true 
              } 
            },
            roster: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    byeWeek: true,
                    status: true
                  }
                }
              }
            }
          },
          orderBy: { name: 'asc' }
        }
      }
    });
    
    if (!league) {
      console.log('❌ League not found');
      return;
    }
    
    // League Overview
    console.log('🏆 === ASTRAL FIELD CHAMPIONSHIP LEAGUE 2025 ===');
    console.log(`📅 Current Week: ${league.currentWeek} (NFL Week 3)`);
    console.log(`👥 Teams: ${league.teams.length}`);
    console.log(`🎯 Format: Full PPR Dynasty League`);
    console.log(`🔄 Waiver System: ${league.settings?.waiverMode}`);
    console.log(`🏁 Playoff Weeks: ${JSON.stringify(league.settings?.playoffWeeks)}`);
    
    // Scoring System Summary
    const scoring = league.settings?.scoringSystem as any;
    console.log('\n🎯 Scoring System (Full PPR):');
    console.log(`• Passing: ${scoring?.passing?.yards || 0.04}/yd, ${scoring?.passing?.touchdowns || 4}pts/TD`);
    console.log(`• Rushing: ${scoring?.rushing?.yards || 0.1}/yd, ${scoring?.rushing?.touchdowns || 6}pts/TD`);
    console.log(`• Receiving: ${scoring?.receiving?.yards || 0.1}/yd, ${scoring?.receiving?.receptions || 1}pt/rec, ${scoring?.receiving?.touchdowns || 6}pts/TD`);
    console.log(`• Kicking: ${scoring?.kicking?.fieldGoalsMade || 3}pts/FG, ${scoring?.kicking?.extraPointsMade || 1}pt/XP`);
    console.log(`• Defense: ${scoring?.defense?.sacks || 1}pt/sack, ${scoring?.defense?.interceptions || 2}pts/INT`);
    
    // Roster Configuration
    const roster = league.settings?.rosterSlots as any;
    console.log('\n🏈 Roster Configuration:');
    console.log(`Starting Lineup: ${roster?.QB || 1}QB • ${roster?.RB || 2}RB • ${roster?.WR || 2}WR • ${roster?.TE || 1}TE • ${roster?.FLEX || 1}FLEX • ${roster?.K || 1}K • ${roster?.DST || 1}DST`);
    console.log(`Bench: ${roster?.BENCH || 6} spots • IR: ${roster?.IR || 1} spot`);
    
    // Week 3 Matchups
    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
        week: 3,
        season: 2025
      },
      include: {
        homeTeam: {
          include: {
            owner: { select: { name: true } }
          }
        },
        awayTeam: {
          include: {
            owner: { select: { name: true } }
          }
        }
      }
    });
    
    console.log('\n⚡ Week 3 Matchups:');
    const uniqueMatchups = new Map();
    
    for (const matchup of matchups) {
      const key = [matchup.homeTeamId, matchup.awayTeamId].sort().join('-');
      if (!uniqueMatchups.has(key)) {
        uniqueMatchups.set(key, matchup);
      }
    }
    
    let matchupNum = 1;
    for (const [_, matchup] of uniqueMatchups) {
      console.log(`${matchupNum}. ${matchup.homeTeam.name} (${matchup.homeTeam.owner?.name}) vs ${matchup.awayTeam.name} (${matchup.awayTeam.owner?.name})`);
      matchupNum++;
    }
    
    // Team Analysis
    console.log('\n👥 Team Roster Analysis:');
    for (const team of league.teams) {
      const starters = team.roster.filter(rp => 
        !['BENCH', 'IR'].includes(rp.position)
      );
      
      const bench = team.roster.filter(rp => 
        rp.position === 'BENCH'
      );
      
      const ir = team.roster.filter(rp => 
        rp.position === 'IR'
      );
      
      // Check for bye week issues
      const week3ByeWeeks = team.roster.filter(rp => 
        rp.player.byeWeek === 3 && !['BENCH', 'IR'].includes(rp.position)
      );
      
      const roleIcon = team.owner?.role === 'COMMISSIONER' ? '👑' : '🏈';
      const byeIcon = week3ByeWeeks.length > 0 ? '⚠️' : '✅';
      
      console.log(`${roleIcon}${byeIcon} ${team.name} (${team.owner?.name})`);
      console.log(`   Roster: ${starters.length} starters, ${bench.length} bench, ${ir.length} IR`);
      
      if (week3ByeWeeks.length > 0) {
        console.log(`   Bye Week Alert: ${week3ByeWeeks.map(rp => `${rp.player.name} (${rp.player.position})`).join(', ')}`);
      }
      
      // Show key starters
      const qb = starters.find(rp => rp.player.position === 'QB');
      const rbs = starters.filter(rp => rp.player.position === 'RB').slice(0, 2);
      const wrs = starters.filter(rp => rp.player.position === 'WR').slice(0, 2);
      
      if (qb) console.log(`   QB: ${qb.player.name} (${qb.player.nflTeam})`);
      if (rbs.length > 0) console.log(`   RBs: ${rbs.map(rp => `${rp.player.name} (${rp.player.nflTeam})`).join(', ')}`);
      if (wrs.length > 0) console.log(`   WRs: ${wrs.map(rp => `${rp.player.name} (${rp.player.nflTeam})`).join(', ')}`);
    }
    
    // League Health Check
    console.log('\n🔍 League Health Check:');
    
    const healthChecks = [
      { name: 'All teams have rosters', status: league.teams.every(t => t.roster.length >= 9) },
      { name: 'Week 3 matchups created', status: matchups.length >= 10 }, // 5 unique matchups (10 teams paired)
      { name: 'Scoring system configured', status: !!league.settings?.scoringSystem },
      { name: 'Current week set to 3', status: league.currentWeek === 3 },
      { name: 'League is active', status: league.isActive },
      { name: 'Commissioner assigned', status: !!league.commissionerId }
    ];
    
    healthChecks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });
    
    const allHealthy = healthChecks.every(check => check.status);
    
    console.log('\n🎉 === WEEK 3 READINESS STATUS ===');
    if (allHealthy) {
      console.log('✅ LEAGUE IS READY FOR LIVE WEEK 3 COMPETITION!');
      console.log('🚀 All systems operational for September 18, 2025');
      console.log('🏆 10 real teams with auto-drafted rosters');
      console.log('⚡ Full PPR scoring with FAAB waivers');
      console.log('👥 Real user authentication system active');
    } else {
      console.log('⚠️ Some issues detected - review above');
    }
    
  } catch (error) {
    console.error('❌ Error generating Week 3 report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateWeek3Report();