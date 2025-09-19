import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Optimal 2025 NFL Season Week 3 League Configuration
const OPTIMAL_LEAGUE_CONFIG = {
  // Current week should be 3 for September 18, 2025
  currentWeek: 3,
  
  // PPR Scoring optimized for competitive play
  scoringSystem: {
    passing: {
      yards: 0.04,          // 1 point per 25 yards (standard)
      touchdowns: 4,        // 4 points per passing TD
      interceptions: -2,    // -2 for interceptions
      twoPointConversions: 2
    },
    rushing: {
      yards: 0.1,           // 1 point per 10 yards (standard)
      touchdowns: 6,        // 6 points per rushing TD
      twoPointConversions: 2
    },
    receiving: {
      yards: 0.1,           // 1 point per 10 yards (standard)
      receptions: 1.0,      // Full PPR (1 point per reception)
      touchdowns: 6,        // 6 points per receiving TD
      twoPointConversions: 2
    },
    kicking: {
      fieldGoalsMade: 3,    // 3 points per field goal
      extraPointsMade: 1,   // 1 point per XP
      fieldGoalsMissed: -1, // -1 for missed FG
      extraPointsMissed: -1 // -1 for missed XP
    },
    defense: {
      sacks: 1,             // 1 point per sack
      interceptions: 2,     // 2 points per INT
      fumblesRecovered: 2,  // 2 points per fumble recovery
      safeties: 2,          // 2 points per safety
      touchdowns: 6,        // 6 points per defensive TD
      pointsAllowed0: 10,   // Shutout bonus
      pointsAllowed1to6: 7,
      pointsAllowed7to13: 4,
      pointsAllowed14to20: 1,
      pointsAllowed21to27: 0,
      pointsAllowed28to34: -1,
      pointsAllowed35Plus: -4
    }
  },
  
  // Standard competitive roster format
  rosterSlots: {
    QB: 1,      // 1 Quarterback
    RB: 2,      // 2 Running Backs
    WR: 2,      // 2 Wide Receivers
    TE: 1,      // 1 Tight End
    FLEX: 1,    // 1 Flex (RB/WR/TE)
    K: 1,       // 1 Kicker
    DST: 1,     // 1 Defense/Special Teams
    BENCH: 6,   // 6 Bench spots
    IR: 1       // 1 IR spot for injured players
  },
  
  // FAAB waiver system for competitive fairness
  waiverMode: 'FAAB',
  
  // Standard playoff format
  playoffWeeks: [15, 16, 17], // Weeks 15-17 for playoffs
  
  // Trade deadline before playoffs
  tradeDeadline: new Date('2025-11-20T00:00:00.000Z') // Week 12
};

async function optimizeLeagueSettings() {
  try {
    console.log('🔧 Optimizing league settings for 2025 NFL Season Week 3...\n');
    
    const league = await prisma.league.findFirst({
      where: { season: 2025 },
      include: { settings: true }
    });
    
    if (!league) {
      console.log('❌ No 2025 season league found');
      return;
    }
    
    console.log(`🏈 Optimizing: ${league.name}`);
    
    // Update league to current week
    if (league.currentWeek !== OPTIMAL_LEAGUE_CONFIG.currentWeek) {
      await prisma.league.update({
        where: { id: league.id },
        data: { currentWeek: OPTIMAL_LEAGUE_CONFIG.currentWeek }
      });
      console.log(`📊 Updated current week to ${OPTIMAL_LEAGUE_CONFIG.currentWeek}`);
    }
    
    // Update league settings
    if (league.settings) {
      // Check if we need to update scoring to full PPR
      const currentScoring = league.settings.scoringSystem as any;
      const needsUpdate = currentScoring.receiving?.receptions !== 1.0;
      
      if (needsUpdate) {
        await prisma.settings.update({
          where: { id: league.settings.id },
          data: {
            scoringSystem: OPTIMAL_LEAGUE_CONFIG.scoringSystem,
            rosterSlots: OPTIMAL_LEAGUE_CONFIG.rosterSlots
          }
        });
        console.log('✅ Updated scoring system to full PPR (1.0 points per reception)');
        console.log('✅ Updated roster slots to include IR spot');
      } else {
        console.log('✅ Scoring system already optimized');
      }
    }
    
    // Verify final configuration
    const updatedLeague = await prisma.league.findFirst({
      where: { season: 2025 },
      include: { settings: true }
    });
    
    console.log('\n🎯 Final League Configuration:');
    console.log(`📅 Season: ${updatedLeague?.season}`);
    console.log(`📊 Current Week: ${updatedLeague?.currentWeek} (NFL Week 3)`);
    console.log(`🏆 Active: ${updatedLeague?.isActive}`);
    
    const settings = updatedLeague?.settings;
    if (settings) {
      const scoring = settings.scoringSystem as any;
      console.log('\n🎯 Scoring Highlights:');
      console.log(`- PPR: ${scoring.receiving?.receptions || 0} points per reception`);
      console.log(`- Passing TDs: ${scoring.passing?.touchdowns || 0} points`);
      console.log(`- Rushing TDs: ${scoring.rushing?.touchdowns || 0} points`);
      console.log(`- Receiving TDs: ${scoring.receiving?.touchdowns || 0} points`);
      
      const roster = settings.rosterSlots as any;
      console.log('\n🏈 Roster Format:');
      console.log(`${roster.QB}QB • ${roster.RB}RB • ${roster.WR}WR • ${roster.TE}TE • ${roster.FLEX}FLEX • ${roster.K}K • ${roster.DST}DST • ${roster.BENCH}BENCH • ${roster.IR || 0}IR`);
      
      console.log(`\n🔄 Waiver System: ${settings.waiverMode}`);
      console.log(`🏁 Playoff Weeks: ${JSON.stringify(settings.playoffWeeks)}`);
    }
    
    console.log('\n✅ League settings optimized for competitive Week 3 play!');
    
  } catch (error) {
    console.error('❌ Error optimizing league settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

optimizeLeagueSettings();