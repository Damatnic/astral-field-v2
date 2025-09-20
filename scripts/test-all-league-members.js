const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// All 10 D'Amato Dynasty League Members
const leagueMembers = [
  { email: 'nicholas@astralfield.com', name: "Nicholas D'Amato", role: 'COMMISSIONER', team: "D'Amato Dynasty" },
  { email: 'nick@astralfield.com', name: 'Nick Hartley', role: 'PLAYER', team: 'Hartley Heroes' },
  { email: 'jack@astralfield.com', name: 'Jack McCaigue', role: 'PLAYER', team: 'McCaigue Mayhem' },
  { email: 'larry@astralfield.com', name: 'Larry McCaigue', role: 'PLAYER', team: "Larry's Legends" },
  { email: 'renee@astralfield.com', name: 'Renee McCaigue', role: 'PLAYER', team: "Renee's Reign" },
  { email: 'jon@astralfield.com', name: 'Jon Kornbeck', role: 'PLAYER', team: 'Kornbeck Crushers' },
  { email: 'david@astralfield.com', name: 'David Jarvey', role: 'PLAYER', team: "Jarvey's Juggernauts" },
  { email: 'kaity@astralfield.com', name: 'Kaity Lorbecki', role: 'PLAYER', team: 'Lorbecki Lions' },
  { email: 'cason@astralfield.com', name: 'Cason Minor', role: 'PLAYER', team: 'Minor Miracles' },
  { email: 'brittany@astralfield.com', name: 'Brittany Bergum', role: 'PLAYER', team: 'Bergum Blitz' }
];

const password = 'Astral2025!';

async function testLogin(member) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: member.email,
        password: password
      })
    });

    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      return {
        success: true,
        status: response.status,
        user: data.user,
        token: data.token
      };
    } else {
      return {
        success: false,
        status: response.status,
        error: data.error || 'Login failed',
        data: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testMyTeam(sessionToken) {
  try {
    const response = await fetch(`${BASE_URL}/api/my-team`, {
      method: 'GET',
      headers: {
        'Cookie': `session=${sessionToken}`
      }
    });

    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      return {
        success: true,
        status: response.status,
        team: data.data
      };
    } else {
      return {
        success: false,
        status: response.status,
        error: data.message || 'My-team failed',
        data: data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testAllMembers() {
  console.log('🏈 COMPREHENSIVE D\'AMATO DYNASTY LEAGUE TESTING');
  console.log('=' .repeat(60));
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(60));
  
  const results = {
    total: leagueMembers.length,
    loginSuccess: 0,
    loginFailed: 0,
    teamSuccess: 0,
    teamFailed: 0,
    leagueConsistency: true,
    leagueId: null,
    leagueName: null,
    allResults: []
  };

  for (let i = 0; i < leagueMembers.length; i++) {
    const member = leagueMembers[i];
    console.log(`\n${i + 1}. Testing ${member.name} (${member.email})`);
    console.log(`   Expected Team: ${member.team}`);
    
    // Test Login
    console.log('   🔐 Testing login...');
    const loginResult = await testLogin(member);
    
    if (loginResult.success) {
      console.log(`   ✅ Login successful - Role: ${loginResult.user.role}`);
      results.loginSuccess++;
      
      // Test My-Team API
      console.log('   🏆 Testing my-team API...');
      const teamResult = await testMyTeam(loginResult.token);
      
      if (teamResult.success) {
        const team = teamResult.team;
        console.log(`   ✅ Team loaded: ${team.name}`);
        console.log(`   📊 Record: ${team.wins}-${team.losses}-${team.ties}`);
        console.log(`   🎯 Points For: ${team.pointsFor}`);
        console.log(`   🛡️ League: ${team.league.name}`);
        
        // Check league consistency
        if (!results.leagueId) {
          results.leagueId = team.leagueId;
          results.leagueName = team.league.name;
        } else if (results.leagueId !== team.leagueId) {
          results.leagueConsistency = false;
          console.log(`   ❌ LEAGUE MISMATCH! Expected: ${results.leagueId}, Got: ${team.leagueId}`);
        }
        
        // Verify team name matches expected
        if (team.name !== member.team) {
          console.log(`   ⚠️ Team name mismatch - Expected: ${member.team}, Got: ${team.name}`);
        }
        
        results.teamSuccess++;
      } else {
        console.log(`   ❌ Team API failed: ${teamResult.error}`);
        results.teamFailed++;
      }
    } else {
      console.log(`   ❌ Login failed: ${loginResult.error}`);
      results.loginFailed++;
    }
    
    results.allResults.push({
      member,
      loginResult,
      teamResult: loginResult.success ? await testMyTeam(loginResult.token) : null
    });
  }
  
  // Final Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('=' .repeat(60));
  
  console.log(`\n🔐 LOGIN RESULTS:`);
  console.log(`   ✅ Successful: ${results.loginSuccess}/${results.total}`);
  console.log(`   ❌ Failed: ${results.loginFailed}/${results.total}`);
  console.log(`   📈 Success Rate: ${((results.loginSuccess / results.total) * 100).toFixed(1)}%`);
  
  console.log(`\n🏆 TEAM ACCESS RESULTS:`);
  console.log(`   ✅ Successful: ${results.teamSuccess}/${results.total}`);
  console.log(`   ❌ Failed: ${results.teamFailed}/${results.total}`);
  console.log(`   📈 Success Rate: ${((results.teamSuccess / results.total) * 100).toFixed(1)}%`);
  
  console.log(`\n🏈 LEAGUE CONSISTENCY:`);
  if (results.leagueConsistency) {
    console.log(`   ✅ All teams in same league: ${results.leagueName}`);
    console.log(`   🆔 League ID: ${results.leagueId}`);
  } else {
    console.log(`   ❌ Teams are in different leagues!`);
  }
  
  // Overall Assessment
  const overallSuccess = results.loginSuccess === results.total && 
                        results.teamSuccess === results.total && 
                        results.leagueConsistency;
  
  console.log(`\n🎯 OVERALL ASSESSMENT:`);
  if (overallSuccess) {
    console.log(`   🎉 COMPLETE SUCCESS! All ${results.total} league members can login and access their teams.`);
    console.log(`   ✅ Site is ready for production use by the entire D'Amato Dynasty League.`);
  } else {
    console.log(`   ❌ ISSUES DETECTED! Some members cannot access their teams properly.`);
    console.log(`   🔧 Manual fixes required before production deployment.`);
  }
  
  console.log(`\nTest completed: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(60));
  
  return results;
}

// Export for use in other scripts
if (require.main === module) {
  testAllMembers().catch(console.error);
}

module.exports = { testAllMembers, leagueMembers };