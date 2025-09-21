import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeagueSettings() {
  try {
    console.log('🔍 Checking current league settings for 2025 season...\n');
    
    const league = await prisma.league.findFirst({
      where: { season: 2025 },
      include: { 
        settings: true,
        teams: {
          select: {
            id: true,
            name: true,
            owner: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });
    
    if (!league) {
      console.log('❌ No 2025 season league found');
      return;
    }
    
    console.log(`✅ Found League: ${league.name}`);
    console.log(`📅 Season: ${league.season}`);
    console.log(`📊 Current Week: ${league.currentWeek}`);
    console.log(`👥 Teams: ${league.teams.length}`);
    console.log(`🏆 Active: ${league.isActive}\n`);
    
    if (league.settings) {
      console.log('⚙️ League Settings:');
      console.log('🏈 Roster Slots:', JSON.stringify(league.settings.rosterSlots, null, 2));
      console.log('🎯 Scoring System:', JSON.stringify(league.settings.scoringSystem, null, 2));
      console.log('🔄 Waiver Mode:', league.settings.waiverMode);
      console.log('🏁 Playoff Weeks:', JSON.stringify(league.settings.playoffWeeks, null, 2));
      
      if (league.settings.tradeDeadline) {
        console.log('📈 Trade Deadline:', league.settings.tradeDeadline);
      }
    } else {
      console.log('❌ No league settings found');
    }
    
    console.log('\n👥 Teams:');
    league.teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name} - ${team.owner?.name} (${team.owner?.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking league settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeagueSettings();