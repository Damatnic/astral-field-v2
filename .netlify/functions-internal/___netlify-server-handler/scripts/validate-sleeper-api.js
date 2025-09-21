// Validate Sleeper API Integration
// Simple script to test basic API connectivity and data quality

const https = require('https');

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function validateSleeperAPI() {
  console.log('🏈 VALIDATING SLEEPER API INTEGRATION');
  console.log('=====================================\n');

  // Test 1: NFL State
  console.log('1️⃣ Testing NFL State API...');
  try {
    const nflState = await fetchJSON('https://api.sleeper.app/v1/state/nfl');
    console.log(`   ✅ Current Season: ${nflState.season}`);
    console.log(`   ✅ Current Week: ${nflState.week}`);
    console.log(`   ✅ Season Type: ${nflState.season_type}`);
    console.log(`   ✅ Has Scores: ${nflState.season_has_scores}\n`);
  } catch (error) {
    console.log(`   ❌ NFL State Error: ${error.message}\n`);
    return false;
  }

  // Test 2: Player Data Sample
  console.log('2️⃣ Testing Player Data API (sample)...');
  try {
    const allPlayers = await fetchJSON('https://api.sleeper.app/v1/players/nfl');
    const playerArray = Object.values(allPlayers);
    const fantasyPlayers = playerArray.filter(p => 
      p.fantasy_positions && 
      p.fantasy_positions.length > 0 && 
      p.active === true
    );
    
    console.log(`   ✅ Total Players: ${playerArray.length}`);
    console.log(`   ✅ Fantasy Relevant: ${fantasyPlayers.length}`);
    
    // Sample some key players for validation
    const samplePlayers = fantasyPlayers
      .filter(p => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
      .slice(0, 5);
    
    console.log('   📊 Sample Fantasy Players:');
    samplePlayers.forEach(player => {
      console.log(`      ${player.first_name} ${player.last_name} (${player.position}) - ${player.team || 'FA'}`);
    });
    console.log('');
  } catch (error) {
    console.log(`   ❌ Player Data Error: ${error.message}\n`);
    return false;
  }

  // Test 3: Trending Players
  console.log('3️⃣ Testing Trending Players API...');
  try {
    const trendingAdds = await fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=10');
    console.log(`   ✅ Trending Adds (24h): ${trendingAdds.length} players`);
    
    if (trendingAdds.length > 0) {
      console.log('   🔥 Top Trending Adds:');
      trendingAdds.slice(0, 3).forEach(trend => {
        console.log(`      Player ${trend.player_id}: ${trend.count} adds`);
      });
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Trending Players Error: ${error.message}\n`);
    return false;
  }

  // Performance Test
  console.log('4️⃣ Testing API Performance...');
  const startTime = Date.now();
  try {
    await Promise.all([
      fetchJSON('https://api.sleeper.app/v1/state/nfl'),
      fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/add?limit=5'),
      fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/drop?limit=5')
    ]);
    const endTime = Date.now();
    console.log(`   ✅ Concurrent API calls completed in ${endTime - startTime}ms\n`);
  } catch (error) {
    console.log(`   ❌ Performance Test Error: ${error.message}\n`);
    return false;
  }

  console.log('🎉 ALL TESTS PASSED! Sleeper API is ready for integration.\n');
  
  console.log('📋 NEXT STEPS:');
  console.log('1. Implement player sync service');
  console.log('2. Create caching layer for large datasets');
  console.log('3. Set up real-time polling for game day');
  console.log('4. Import D\'Amato Dynasty League data');
  
  return true;
}

// Run validation
if (require.main === module) {
  validateSleeperAPI()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { validateSleeperAPI };