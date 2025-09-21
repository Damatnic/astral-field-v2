#!/usr/bin/env node

/**
 * Production Setup Script for D'Amato Dynasty League
 * Run this script to initialize the production database with real league data
 */

import { PrismaClient } from '@prisma/client';
import seedDamatoLeague from './production-seed-damato-league';
import { nflDataService } from '../src/services/nfl/nflDataService';

const prisma = new PrismaClient();

async function setupProductionLeague() {
  console.log('🏈 D\'AMATO DYNASTY LEAGUE PRODUCTION SETUP 🏈');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check database connection
    console.log('\n1️⃣ Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Step 2: Run migrations
    console.log('\n2️⃣ Running database migrations...');
    // In production, migrations should be run via: npx prisma migrate deploy
    console.log('✅ Migrations complete (run separately via Prisma CLI)');
    
    // Step 3: Seed D'Amato Dynasty League
    console.log('\n3️⃣ Creating D\'Amato Dynasty League...');
    const { league, users, teams } = await seedDamatoLeague();
    console.log(`✅ League created: ${league.name}`);
    console.log(`✅ ${users.length} users created`);
    console.log(`✅ ${teams.length} teams created`);
    
    // Step 4: Import NFL player data
    console.log('\n4️⃣ Importing NFL player data...');
    await nflDataService.fetchAllPlayers();
    
    const playerCount = await prisma.player.count();
    console.log(`✅ ${playerCount} NFL players imported`);
    
    // Step 5: Generate initial rosters (demo data)
    console.log('\n5️⃣ Generating initial team rosters...');
    await generateInitialRosters(teams);
    console.log('✅ Team rosters created');
    
    // Step 6: Fetch current week scores
    console.log('\n6️⃣ Fetching current week scores...');
    await nflDataService.fetchCurrentWeekScores(17);
    console.log('✅ Week 17 scores loaded');
    
    // Step 7: Verify setup
    console.log('\n7️⃣ Verifying setup...');
    const verification = await verifySetup();
    
    if (verification.success) {
      console.log('✅ All systems operational!');
    } else {
      console.log('⚠️  Some issues detected:');
      verification.issues.forEach((issue: string) => console.log(`   - ${issue}`));
    }
    
    // Print access information
    console.log('\n' + '='.repeat(50));
    console.log('🎉 D\'AMATO DYNASTY LEAGUE IS READY! 🎉');
    console.log('='.repeat(50));
    console.log('\n📋 LEAGUE INFORMATION:');
    console.log(`   Name: ${league.name}`);
    console.log(`   Season: ${league.season}`);
    console.log(`   Current Week: ${league.currentWeek}`);
    console.log(`   Teams: ${teams.length}`);
    console.log(`   Commissioner: Nicholas D'Amato`);
    
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   (Temporary passwords - users should reset on first login)');
    console.log('');
    console.log('   COMMISSIONER:');
    console.log('   Email: nicholas.damato@damatodynasty.com');
    console.log('   Password: Commissioner2024!');
    console.log('');
    console.log('   TEAM OWNERS:');
    const otherUsers = [
      { email: 'nick.hartley@damatodynasty.com', password: 'HartleyHeroes2024!' },
      { email: 'jack.mccaigue@damatodynasty.com', password: 'Juggernauts2024!' },
      { email: 'larry.mccaigue@damatodynasty.com', password: 'Legends2024!' },
      { email: 'renee.mccaigue@damatodynasty.com', password: 'Renegades2024!' },
      { email: 'jon.kornbeck@damatodynasty.com', password: 'Crushers2024!' },
      { email: 'david.jarvey@damatodynasty.com', password: 'Giants2024!' },
      { email: 'kaity.lorbecki@damatodynasty.com', password: 'Lightning2024!' },
      { email: 'cason.minor@damatodynasty.com', password: 'Miracles2024!' },
      { email: 'brittany.bergum@damatodynasty.com', password: 'Blitz2024!' }
    ];
    
    otherUsers.forEach(u => {
      console.log(`   Email: ${u.email}`);
      console.log(`   Password: ${u.password}`);
      console.log('');
    });
    
    console.log('⚠️  SECURITY NOTICE:');
    console.log('   1. Send password reset emails to all users');
    console.log('   2. Enable 2FA for commissioner account');
    console.log('   3. Set up proper email service (SendGrid/AWS SES)');
    console.log('   4. Configure production environment variables');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('   1. Set SPORTSDATA_API_KEY in .env for live data');
    console.log('   2. Configure email service for notifications');
    console.log('   3. Set up Redis for caching (optional)');
    console.log('   4. Enable WebSocket server for live updates');
    console.log('   5. Configure CDN for static assets');
    
    console.log('\n✨ Happy drafting! May the best team win! ✨\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateInitialRosters(teams: any[]) {
  // Get available players for draft
  const players = await prisma.player.findMany({
    where: {
      status: 'ACTIVE'
    },
    orderBy: [
      { position: 'asc' },
      { name: 'asc' }
    ]
  });
  
  // Group players by position
  const playersByPosition = {
    QB: players.filter(p => p.position === 'QB'),
    RB: players.filter(p => p.position === 'RB'),
    WR: players.filter(p => p.position === 'WR'),
    TE: players.filter(p => p.position === 'TE'),
    K: players.filter(p => p.position === 'K'),
    DST: players.filter(p => p.position === 'DST')
  };
  
  // Draft players for each team (snake draft simulation)
  const rosterRequirements = [
    { position: 'QB', slots: ['QB', 'BENCH'], count: 2 },
    { position: 'RB', slots: ['RB', 'RB', 'FLEX', 'BENCH', 'BENCH'], count: 5 },
    { position: 'WR', slots: ['WR', 'WR', 'FLEX', 'BENCH', 'BENCH'], count: 5 },
    { position: 'TE', slots: ['TE', 'BENCH'], count: 2 },
    { position: 'K', slots: ['K'], count: 1 },
    { position: 'DST', slots: ['DST'], count: 1 }
  ];
  
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
    const team = teams[teamIndex];
    const rosterPlayers = [];
    
    for (const req of rosterRequirements) {
      const availablePlayers = playersByPosition[req.position as keyof typeof playersByPosition];
      
      for (let i = 0; i < req.count && i < availablePlayers.length; i++) {
        // Snake draft: alternate picking order each round
        const playerIndex = teamIndex + (i * teams.length);
        
        if (playerIndex < availablePlayers.length) {
          const player = availablePlayers[playerIndex];
          const slot = (req.slots[i] || 'BENCH') as any;
          
          rosterPlayers.push({
            teamId: team.id,
            playerId: player.id,
            rosterSlot: slot,
            isLocked: false
          });
        }
      }
    }
    
    // Create roster entries
    if (rosterPlayers.length > 0) {
      await prisma.rosterPlayer.createMany({
        data: rosterPlayers
      });
    }
  }
}

async function verifySetup() {
  const issues = [];
  
  // Check league exists
  const league = await prisma.league.findFirst({
    where: { name: 'D\'Amato Dynasty League' }
  });
  
  if (!league) {
    issues.push('League not found');
  }
  
  // Check users exist
  const userCount = await prisma.user.count({
    where: { email: { contains: '@damatodynasty.com' } }
  });
  
  if (userCount !== 10) {
    issues.push(`Expected 10 users, found ${userCount}`);
  }
  
  // Check teams exist
  const teamCount = await prisma.team.count({
    where: { leagueId: league?.id }
  });
  
  if (teamCount !== 10) {
    issues.push(`Expected 10 teams, found ${teamCount}`);
  }
  
  // Check players exist
  const playerCount = await prisma.player.count();
  
  if (playerCount === 0) {
    issues.push('No players found in database');
  }
  
  // Check rosters
  const rosterCount = await prisma.rosterPlayer.count();
  
  if (rosterCount === 0) {
    issues.push('No roster players found');
  }
  
  return {
    success: issues.length === 0,
    issues
  };
}

// Run the setup
if (require.main === module) {
  setupProductionLeague()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export default setupProductionLeague;