/**
 * Comprehensive Waiver System Test Script
 * Tests all waiver functionality end-to-end
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test configuration
const testConfig = {
  leagueId: process.env.TEST_LEAGUE_ID, // Set this to a test league ID
  testUserId: process.env.TEST_USER_ID, // Set this to a test user ID
  sessionToken: process.env.TEST_SESSION_TOKEN // Set this to a valid session token
};

/**
 * Test suite for waiver system
 */
async function runWaiverTests() {
  console.log('🚀 Starting Waiver System Tests...\n');
  
  try {
    // Test 1: Get waiver wire players
    await testWaiverWire();
    
    // Test 2: Get waiver schedule
    await testWaiverSchedule();
    
    // Test 3: Get FAAB budget information
    await testFAABBudget();
    
    // Test 4: Submit waiver claim (FAAB)
    await testWaiverClaimFAAB();
    
    // Test 5: Submit waiver claim (Priority)
    await testWaiverClaimPriority();
    
    // Test 6: Get user's waiver claims
    await testGetWaiverClaims();
    
    // Test 7: Cancel waiver claim
    await testCancelWaiverClaim();
    
    // Test 8: Process waivers (Commissioner)
    await testProcessWaivers();
    
    // Test 9: Update waiver schedule (Commissioner)
    await testUpdateWaiverSchedule();
    
    console.log('✅ All waiver system tests completed!\n');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

/**
 * Test waiver wire endpoint
 */
async function testWaiverWire() {
  console.log('📋 Testing Waiver Wire...');
  
  const tests = [
    {
      name: 'Get all available players',
      url: `/api/waivers/wire?leagueId=${testConfig.leagueId}&limit=20`
    },
    {
      name: 'Filter by position',
      url: `/api/waivers/wire?leagueId=${testConfig.leagueId}&position=QB&limit=10`
    },
    {
      name: 'Search by name',
      url: `/api/waivers/wire?leagueId=${testConfig.leagueId}&search=mahomes&limit=5`
    },
    {
      name: 'Sort by projected points',
      url: `/api/waivers/wire?leagueId=${testConfig.leagueId}&sortBy=projectedPoints&sortOrder=desc&limit=10`
    }
  ];
  
  for (const test of tests) {
    try {
      const response = await fetch(`${baseUrl}${test.url}`, {
        headers: {
          'Cookie': `session=${testConfig.sessionToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`  ✅ ${test.name}: ${data.players?.length || 0} players found`);
        
        // Validate response structure
        if (data.players && data.players.length > 0) {
          const player = data.players[0];
          const requiredFields = ['id', 'name', 'position', 'nflTeam', 'projectedPoints', 'avgPoints'];
          const missingFields = requiredFields.filter(field => !(field in player));
          
          if (missingFields.length > 0) {
            console.log(`    ⚠️  Missing fields: ${missingFields.join(', ')}`);
          }
        }
      } else {
        console.log(`  ❌ ${test.name}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
  console.log();
}

/**
 * Test waiver schedule endpoint
 */
async function testWaiverSchedule() {
  console.log('📅 Testing Waiver Schedule...');
  
  try {
    const response = await fetch(`${baseUrl}/api/waivers/schedule?leagueId=${testConfig.leagueId}`, {
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('  ✅ Schedule retrieved successfully');
      console.log(`    Next Processing: ${data.schedule.nextProcessing}`);
      console.log(`    Next Deadline: ${data.schedule.nextDeadline}`);
      console.log(`    Waiver Day: ${data.schedule.waiverDay}`);
      console.log(`    Pending Claims: ${data.league.pendingClaims}`);
    } else {
      console.log(`  ❌ Schedule test failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Schedule test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test FAAB budget endpoint
 */
async function testFAABBudget() {
  console.log('💰 Testing FAAB Budget...');
  
  try {
    const response = await fetch(`${baseUrl}/api/waivers/budget?leagueId=${testConfig.leagueId}`, {
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('  ✅ FAAB budget retrieved successfully');
      console.log(`    Total Teams: ${data.standings?.length || 0}`);
      console.log(`    League Total Budget: $${data.statistics?.totalBudget || 0}`);
      console.log(`    League Total Spent: $${data.statistics?.totalSpent || 0}`);
      console.log(`    Recent Transactions: ${data.recentTransactions?.length || 0}`);
    } else if (data.error?.includes('does not use FAAB')) {
      console.log('  ⚠️  League does not use FAAB - this is expected for non-FAAB leagues');
    } else {
      console.log(`  ❌ FAAB budget test failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ FAAB budget test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test FAAB waiver claim
 */
async function testWaiverClaimFAAB() {
  console.log('💸 Testing FAAB Waiver Claim...');
  
  // First get an available player
  try {
    const wireResponse = await fetch(`${baseUrl}/api/waivers/wire?leagueId=${testConfig.leagueId}&limit=1`, {
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const wireData = await wireResponse.json();
    
    if (!wireData.success || !wireData.players || wireData.players.length === 0) {
      console.log('  ⚠️  No available players for test');
      return;
    }
    
    const testPlayer = wireData.players[0];
    
    const claimData = {
      leagueId: testConfig.leagueId,
      playerId: testPlayer.id,
      bidAmount: 5 // $5 bid
    };
    
    const response = await fetch(`${baseUrl}/api/waivers/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${testConfig.sessionToken}`
      },
      body: JSON.stringify(claimData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`  ✅ FAAB claim submitted for ${testPlayer.name} - Bid: $${claimData.bidAmount}`);
    } else {
      console.log(`  ❌ FAAB claim failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ FAAB claim test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test priority waiver claim
 */
async function testWaiverClaimPriority() {
  console.log('🏆 Testing Priority Waiver Claim...');
  
  try {
    // First get an available player
    const wireResponse = await fetch(`${baseUrl}/api/waivers/wire?leagueId=${testConfig.leagueId}&limit=1&offset=1`, {
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const wireData = await wireResponse.json();
    
    if (!wireData.success || !wireData.players || wireData.players.length === 0) {
      console.log('  ⚠️  No available players for test');
      return;
    }
    
    const testPlayer = wireData.players[0];
    
    const claimData = {
      leagueId: testConfig.leagueId,
      playerId: testPlayer.id,
      bidAmount: 0 // No bid for priority system
    };
    
    const response = await fetch(`${baseUrl}/api/waivers/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${testConfig.sessionToken}`
      },
      body: JSON.stringify(claimData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`  ✅ Priority claim submitted for ${testPlayer.name}`);
    } else {
      console.log(`  ❌ Priority claim failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Priority claim test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test getting user's waiver claims
 */
async function testGetWaiverClaims() {
  console.log('📋 Testing Get Waiver Claims...');
  
  try {
    const response = await fetch(`${baseUrl}/api/waivers/claim?leagueId=${testConfig.leagueId}`, {
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`  ✅ Retrieved ${data.data?.length || 0} waiver claims`);
      
      if (data.data && data.data.length > 0) {
        const claim = data.data[0];
        console.log(`    Latest claim: ${claim.player?.name} (${claim.status})`);
      }
    } else {
      console.log(`  ❌ Get claims failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Get claims test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test canceling a waiver claim
 */
async function testCancelWaiverClaim() {
  console.log('❌ Testing Cancel Waiver Claim...');
  
  try {
    // First get pending claims
    const claimsResponse = await fetch(`${baseUrl}/api/waivers/claim?leagueId=${testConfig.leagueId}&status=PENDING`, {
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const claimsData = await claimsResponse.json();
    
    if (!claimsData.success || !claimsData.data || claimsData.data.length === 0) {
      console.log('  ⚠️  No pending claims to cancel');
      return;
    }
    
    const claimToCancel = claimsData.data[0];
    
    const response = await fetch(`${baseUrl}/api/waivers/claim?claimId=${claimToCancel.id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `session=${testConfig.sessionToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`  ✅ Canceled claim for ${claimToCancel.player?.name}`);
    } else {
      console.log(`  ❌ Cancel claim failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Cancel claim test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test processing waivers (Commissioner only)
 */
async function testProcessWaivers() {
  console.log('⚙️ Testing Process Waivers (Commissioner)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/waivers/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${testConfig.sessionToken}`
      },
      body: JSON.stringify({
        leagueId: testConfig.leagueId,
        week: 15
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`  ✅ Processed waivers: ${data.processed} successful, ${data.failed} failed`);
    } else if (data.error?.includes('commissioner')) {
      console.log('  ⚠️  Only commissioner can process waivers - this is expected for non-commissioner users');
    } else {
      console.log(`  ❌ Process waivers failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Process waivers test error: ${error.message}`);
  }
  console.log();
}

/**
 * Test updating waiver schedule (Commissioner only)
 */
async function testUpdateWaiverSchedule() {
  console.log('📅 Testing Update Waiver Schedule (Commissioner)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/waivers/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${testConfig.sessionToken}`
      },
      body: JSON.stringify({
        leagueId: testConfig.leagueId,
        waiverDay: 3, // Wednesday
        waiverTime: '12:00',
        autoProcess: false
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('  ✅ Updated waiver schedule successfully');
    } else if (data.error?.includes('commissioner')) {
      console.log('  ⚠️  Only commissioner can update schedule - this is expected for non-commissioner users');
    } else {
      console.log(`  ❌ Update schedule failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Update schedule test error: ${error.message}`);
  }
  console.log();
}

// Check if required config is present
if (!testConfig.leagueId || !testConfig.sessionToken) {
  console.error('❌ Missing required test configuration:');
  console.error('   TEST_LEAGUE_ID:', testConfig.leagueId ? '✅' : '❌');
  console.error('   TEST_SESSION_TOKEN:', testConfig.sessionToken ? '✅' : '❌');
  console.error('\nPlease set the required environment variables and try again.');
  process.exit(1);
}

// Run the tests
runWaiverTests();