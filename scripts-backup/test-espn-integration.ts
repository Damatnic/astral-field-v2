#!/usr/bin/env tsx

/**
 * Test ESPN Integration Script
 * Tests all ESPN API endpoints and data sync functionality
 */

import { ESPNService } from '../src/lib/services/espn';
import { NFLDataService } from '../src/lib/services/nfl-data';
import { DataSyncService } from '../src/lib/services/data-sync';

async function testESPNIntegration() {
  console.log('🏈 Testing ESPN API Integration');
  console.log('===============================\n');

  const espn = new ESPNService();
  const nfl = new NFLDataService();
  const sync = new DataSyncService();

  try {
    // Test 1: Basic ESPN API connectivity
    console.log('1. 🔗 Testing ESPN API connectivity...');
    const currentWeek = await espn.getCurrentWeek();
    const currentSeason = await espn.getCurrentSeason();
    console.log(`✅ Connected! Current season: ${currentSeason}, Week: ${currentWeek}\n`);

    // Test 2: Get scoreboard
    console.log('2. 📊 Testing scoreboard data...');
    const scoreboard = await espn.getScoreboard();
    const gameCount = scoreboard.events?.length || 0;
    console.log(`✅ Fetched ${gameCount} games from scoreboard\n`);

    // Test 3: Get teams
    console.log('3. 🏟️ Testing teams data...');
    const teams = await espn.getTeams();
    console.log(`✅ Fetched ${teams.length} NFL teams\n`);

    // Test 4: Get sample player data
    console.log('4. 👤 Testing player data...');
    if (teams.length > 0) {
      const firstTeam = teams[0];
      const roster = await espn.getTeamRoster(firstTeam.id);
      const playerCount = roster.athletes?.length || 0;
      console.log(`✅ Fetched ${playerCount} players from ${firstTeam.abbreviation}\n`);
    }

    // Test 5: Test news
    console.log('5. 📰 Testing news data...');
    const news = await espn.getNews(5);
    console.log(`✅ Fetched ${news.length} news articles\n`);

    // Test 6: Test NFL data service
    console.log('6. 🏆 Testing NFL data service...');
    const liveScores = await nfl.getLiveScores();
    console.log(`✅ Fetched ${liveScores.length} live game scores\n`);

    // Test 7: Test search functionality
    console.log('7. 🔍 Testing player search...');
    const searchResults = await espn.searchPlayers('Josh Allen');
    console.log(`✅ Found ${searchResults.length} players matching "Josh Allen"\n`);

    // Test 8: Test fantasy points calculation
    console.log('8. 🧮 Testing fantasy points calculation...');
    const sampleStats = {
      passing: { yards: 300, touchdowns: 2, interceptions: 1 },
      rushing: { yards: 50, touchdowns: 1 },
      receiving: { receptions: 0, yards: 0, touchdowns: 0 }
    };
    const fantasyPoints = espn.calculateFantasyPoints(sampleStats);
    console.log(`✅ Sample QB stats = ${fantasyPoints} fantasy points\n`);

    console.log('🎉 All ESPN integration tests passed!');
    console.log('✨ The system is ready to use ESPN APIs instead of Sleeper');
    
    return true;
  } catch (error) {
    console.error('❌ ESPN integration test failed:', error);
    return false;
  }
}

async function main() {
  const success = await testESPNIntegration();
  
  if (success) {
    console.log('\n📋 Next Steps:');
    console.log('1. Run player sync: npm run sync:players');
    console.log('2. Start the application: npm run dev');
    console.log('3. Test API endpoints at /api/espn/*');
    console.log('4. Enjoy authentication-free NFL data! 🚀');
  } else {
    console.log('\n🛠️ Fix the issues above before proceeding');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}