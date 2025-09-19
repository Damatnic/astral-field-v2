import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Seeding test data for 100% functionality...\n');
  
  try {
    // 1. Create test league with ID "1"
    console.log('Creating test league...');
    const league = await prisma.league.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        name: 'Test Championship League',
        description: 'Test league for API endpoints',
        commissionerId: null, // Will be set later
        season: 2025,
        currentWeek: 3,
        isActive: true
      }
    });
    
    // 2. Create test user with proper password
    console.log('Creating test users...');
    const hashedPassword = await bcrypt.hash('player123!', 10);
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: { password: hashedPassword },
      create: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'PLAYER',
        password: hashedPassword,
        avatar: '🧪'
      }
    });
    
    // 3. Create test team with ID "1"
    console.log('Creating test team...');
    const team = await prisma.team.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        name: 'Test Team Alpha',
        ownerId: testUser.id,
        leagueId: league.id,
        wins: 2,
        losses: 1,
        ties: 0,
        pointsFor: 325.5,
        pointsAgainst: 310.2,
        waiverPriority: 5,
        faabBudget: 100,
        faabSpent: 15,
        draftPosition: 1
      }
    });
    
    // 4. Create another team for matchups and trades
    console.log('Creating opponent team...');
    
    // Create a second user for the second team
    const testUser2 = await prisma.user.upsert({
      where: { email: 'test2@example.com' },
      update: { password: hashedPassword },
      create: {
        email: 'test2@example.com',
        name: 'Test User 2',
        role: 'PLAYER',
        password: hashedPassword,
        avatar: '⚡'
      }
    });
    
    const team2 = await prisma.team.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        name: 'Test Team Beta',
        ownerId: testUser2.id,
        leagueId: league.id,
        wins: 1,
        losses: 2,
        ties: 0,
        pointsFor: 298.3,
        pointsAgainst: 315.7,
        waiverPriority: 8,
        faabBudget: 100,
        faabSpent: 30,
        draftPosition: 2
      }
    });
    
    // 5. Update league commissioner
    await prisma.league.update({
      where: { id: league.id },
      data: { commissionerId: testUser.id }
    });
    
    // 6. Create test matchup
    console.log('Creating test matchup...');
    
    // First check if matchup exists
    const existingMatchup = await prisma.matchup.findFirst({
      where: {
        leagueId: league.id,
        week: 3,
        homeTeamId: team.id,
        awayTeamId: team2.id
      }
    });
    
    const matchup = existingMatchup || await prisma.matchup.create({
      data: {
        homeTeamId: team.id,
        awayTeamId: team2.id,
        leagueId: league.id,
        week: 3,
        season: 2025,
        homeScore: 125.5,
        awayScore: 118.3,
        isComplete: false
      }
    });
    
    // 7. Create test draft with ID "1"
    console.log('Creating test draft...');
    const draft = await prisma.draft.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        leagueId: league.id,
        status: 'IN_PROGRESS',
        type: 'SNAKE',
        rounds: 16,
        pickTimeLimit: 90,
        currentRound: 1,
        currentPick: 1,
        scheduledStart: new Date('2025-08-25'),
        startedAt: new Date('2025-08-25')
      }
    });
    
    // 8. Create test trade with ID "1"
    console.log('Creating test trade...');
    const trade = await prisma.trade.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        leagueId: league.id,
        proposerId: testUser.id,
        teamId: team.id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        notes: 'Test trade for API endpoints'
      }
    });
    
    // 9. Create some test players
    console.log('Creating test players...');
    
    // Check if players with these Sleeper IDs already exist
    const existingMahomes = await prisma.player.findUnique({
      where: { sleeperPlayerId: '4046' }
    });
    
    const existingMcCaffrey = await prisma.player.findUnique({
      where: { sleeperPlayerId: '4034' }
    });
    
    const existingHill = await prisma.player.findUnique({
      where: { sleeperPlayerId: '6068' }
    });
    
    // Use existing player IDs or create new ones
    const player1Id = existingMahomes?.id || 'player-1';
    const player2Id = existingMcCaffrey?.id || 'player-2';
    const player3Id = existingHill?.id || 'player-3';
    
    // Only create players if they don't exist
    if (!existingMahomes) {
      await prisma.player.create({
        data: {
          id: player1Id,
          name: 'Patrick Mahomes',
          firstName: 'Patrick',
          lastName: 'Mahomes',
          position: 'QB',
          nflTeam: 'KC',
          status: 'ACTIVE',
          injuryStatus: 'HEALTHY',
          byeWeek: 6,
          sleeperPlayerId: '4046',
          age: 28,
          yearsExperience: 7
        }
      });
      console.log('  Created Patrick Mahomes');
    } else {
      console.log('  Patrick Mahomes already exists');
    }
    
    if (!existingMcCaffrey) {
      await prisma.player.create({
        data: {
          id: player2Id,
          name: 'Christian McCaffrey',
          firstName: 'Christian',
          lastName: 'McCaffrey',
          position: 'RB',
          nflTeam: 'SF',
          status: 'ACTIVE',
          injuryStatus: 'HEALTHY',
          byeWeek: 9,
          sleeperPlayerId: '4034',
          age: 28,
          yearsExperience: 7
        }
      });
      console.log('  Created Christian McCaffrey');
    } else {
      console.log('  Christian McCaffrey already exists');
    }
    
    if (!existingHill) {
      await prisma.player.create({
        data: {
          id: player3Id,
          name: 'Tyreek Hill',
          firstName: 'Tyreek',
          lastName: 'Hill',
          position: 'WR',
          nflTeam: 'MIA',
          status: 'ACTIVE',
          injuryStatus: 'HEALTHY',
          byeWeek: 10,
          sleeperPlayerId: '6068',
          age: 30,
          yearsExperience: 8
        }
      });
      console.log('  Created Tyreek Hill');
    } else {
      console.log('  Tyreek Hill already exists');
    }
    
    // 10. Add players to rosters
    console.log('Adding players to team rosters...');
    await prisma.rosterPlayer.upsert({
      where: {
        teamId_playerId: {
          teamId: team.id,
          playerId: player1Id
        }
      },
      update: {},
      create: {
        teamId: team.id,
        playerId: player1Id,
        position: 'QB',
        rosterSlot: 'QB',
        acquisitionType: 'DRAFT',
        acquisitionDate: new Date('2025-08-25')
      }
    });
    
    await prisma.rosterPlayer.upsert({
      where: {
        teamId_playerId: {
          teamId: team.id,
          playerId: player2Id
        }
      },
      update: {},
      create: {
        teamId: team.id,
        playerId: player2Id,
        position: 'RB',
        rosterSlot: 'RB',
        acquisitionType: 'DRAFT',
        acquisitionDate: new Date('2025-08-25')
      }
    });
    
    // 11. Create notification preferences
    console.log('Creating notification preferences...');
    await prisma.notificationPreferences.upsert({
      where: { userId: testUser.id },
      update: {},
      create: {
        userId: testUser.id,
        emailEnabled: true,
        pushEnabled: false,
        lineupReminders: true,
        waiversProcessed: true,
        gameUpdates: true,
        weeklyRecap: false,
        injuryAlerts: true,
        tradeOffers: true
      }
    });
    
    console.log('\n✅ Test data seeded successfully!');
    console.log('📊 Created:');
    console.log('  - 1 League (ID: 1)');
    console.log('  - 2 Teams (IDs: 1, 2)');
    console.log('  - 2 Test Users');
    console.log('  - 1 Matchup');
    console.log('  - 1 Draft (ID: 1)');
    console.log('  - 1 Trade (ID: 1)');
    console.log('  - 3 Players');
    console.log('  - Roster assignments');
    console.log('  - Notification preferences');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData().catch(console.error);