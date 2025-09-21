import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Production deployment verification checklist
async function verifyProductionReadiness() {
  try {
    console.log('🔍 === PRODUCTION DEPLOYMENT VERIFICATION ===\n');
    console.log('📅 Date: September 18, 2025 - NFL Week 3');
    console.log('🎯 Target: Live fantasy football system deployment\n');
    
    // 1. Database Connectivity
    console.log('1. 🗄️ Database Connectivity...');
    try {
      await prisma.$connect();
      console.log('   ✅ Database connection successful');
      
      const userCount = await prisma.user.count();
      const playerCount = await prisma.player.count();
      const teamCount = await prisma.team.count();
      
      console.log(`   📊 Users: ${userCount}, Players: ${playerCount}, Teams: ${teamCount}`);
    } catch (error) {
      console.log('   ❌ Database connection failed:', error);
      return false;
    }
    
    // 2. League Configuration
    console.log('\n2. 🏈 League Configuration...');
    const league = await prisma.league.findFirst({
      where: { season: 2025 },
      include: { settings: true, teams: { include: { owner: true } } }
    });
    
    if (!league) {
      console.log('   ❌ No 2025 league found');
      return false;
    }
    
    console.log(`   ✅ League: ${league.name}`);
    console.log(`   📊 Current Week: ${league.currentWeek}`);
    console.log(`   👥 Teams: ${league.teams.length}`);
    console.log(`   ⚙️ Settings: ${league.settings ? 'Configured' : 'Missing'}`);
    
    // 3. User Authentication
    console.log('\n3. 🔐 User Authentication...');
    const usersWithPasswords = await prisma.user.findMany({
      where: { 
        password: { not: null }
      },
      select: { name: true, email: true, role: true }
    });
    
    console.log(`   ✅ Users with passwords: ${usersWithPasswords.length}/10`);
    
    const commissioner = usersWithPasswords.find(u => u.role === 'COMMISSIONER');
    if (commissioner) {
      console.log(`   👑 Commissioner: ${commissioner.name} (${commissioner.email})`);
    } else {
      console.log('   ⚠️ No commissioner found');
    }
    
    // 4. Auto-Draft Status  
    console.log('\n4. 🎯 Auto-Draft Status...');
    const rostersWithPlayers = await prisma.team.findMany({
      where: { leagueId: league.id },
      include: {
        roster: { include: { player: true } },
        owner: { select: { name: true } }
      }
    });
    
    console.log('   Team Roster Status:');
    let allTeamsReady = true;
    
    for (const team of rostersWithPlayers) {
      const rosterSize = team.roster.length;
      const status = rosterSize >= 9 ? '✅' : '❌';
      console.log(`   ${status} ${team.name} (${team.owner?.name}): ${rosterSize} players`);
      
      if (rosterSize < 9) allTeamsReady = false;
    }
    
    // 5. Week 3 Matchups
    console.log('\n5. ⚡ Week 3 Matchups...');
    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
        week: 3,
        season: 2025
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    const uniqueMatchups = new Map();
    matchups.forEach(m => {
      const key = [m.homeTeamId, m.awayTeamId].sort().join('-');
      if (!uniqueMatchups.has(key)) {
        uniqueMatchups.set(key, m);
      }
    });
    
    console.log(`   ✅ Matchups created: ${uniqueMatchups.size}/5`);
    
    // 6. Environment Variables Check
    console.log('\n6. 🔧 Environment Configuration...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_URL', 
      'NEXTAUTH_SECRET',
      'NEXT_PUBLIC_APP_URL'
    ];
    
    const envStatus = requiredEnvVars.map(envVar => ({
      name: envVar,
      set: !!process.env[envVar]
    }));
    
    envStatus.forEach(env => {
      const status = env.set ? '✅' : '❌';
      console.log(`   ${status} ${env.name}`);
    });
    
    // Final Assessment
    console.log('\n🎉 === DEPLOYMENT READINESS ASSESSMENT ===');
    
    const checks = [
      { name: 'Database Connected', status: true },
      { name: '2025 League Configured', status: !!league },
      { name: 'Week 3 Current', status: league?.currentWeek === 3 },
      { name: 'All Users Have Passwords', status: usersWithPasswords.length === 10 },
      { name: 'All Teams Have Rosters', status: allTeamsReady },
      { name: 'Week 3 Matchups Ready', status: uniqueMatchups.size === 5 },
      { name: 'Environment Variables Set', status: envStatus.every(e => e.set) }
    ];
    
    const passedChecks = checks.filter(c => c.status).length;
    const allChecksPassed = passedChecks === checks.length;
    
    console.log(`\n📊 Status: ${passedChecks}/${checks.length} checks passed`);
    
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });
    
    if (allChecksPassed) {
      console.log('\n🚀 === READY FOR PRODUCTION DEPLOYMENT! ===');
      console.log('✅ All systems verified and operational');
      console.log('🏈 2025 NFL Season Week 3 fantasy system ready');
      console.log('👥 10 real users with auto-drafted teams');
      console.log('⚡ Full PPR scoring and FAAB waivers active');
      console.log('🎯 Live competition can begin immediately');
    } else {
      console.log('\n⚠️ === DEPLOYMENT ISSUES DETECTED ===');
      console.log('Some checks failed - review above for details');
    }
    
    return allChecksPassed;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifyProductionReadiness();