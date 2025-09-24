import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTestLeagueForWeek4() {
  console.log('🏈 Updating test league for NFL Week 4...');

  try {
    // Get the test league
    const testLeague = await prisma.league.findFirst({
      where: {
        OR: [
          {
            name: {
              contains: 'Test'
            }
          },
          {
            name: {
              contains: 'test'
            }
          }
        ]
      },
      include: {
        teams: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!testLeague) {
      console.log('❌ Test league not found');
      return;
    }

    console.log(`✅ Found test league: ${testLeague.name} with ${testLeague.teams.length} teams`);

    // Update league to Week 4
    await prisma.league.update({
      where: { id: testLeague.id },
      data: {
        currentWeek: 4,
        season: '2024'
      }
    });

    console.log('📅 Updated league to Week 4');

    // Update all player projections for Week 4
    const currentWeek = 4;
    const currentSeason = 2024;

    // Sample player updates for Week 4 (current NFL week)
    const playerUpdates = [
      // QBs
      { name: 'Josh Allen', position: 'QB', team: 'BUF', projection: 22.5, status: 'ACTIVE' },
      { name: 'Lamar Jackson', position: 'QB', team: 'BAL', projection: 21.8, status: 'ACTIVE' },
      { name: 'Jalen Hurts', position: 'QB', team: 'PHI', projection: 20.9, status: 'ACTIVE' },
      { name: 'Joe Burrow', position: 'QB', team: 'CIN', projection: 19.7, status: 'ACTIVE' },
      
      // RBs
      { name: 'Christian McCaffrey', position: 'RB', team: 'SF', projection: 18.5, status: 'ACTIVE' },
      { name: 'Austin Ekeler', position: 'RB', team: 'LAC', projection: 16.8, status: 'ACTIVE' },
      { name: 'Dalvin Cook', position: 'RB', team: 'MIN', projection: 15.2, status: 'ACTIVE' },
      { name: 'Alvin Kamara', position: 'RB', team: 'NO', projection: 14.9, status: 'ACTIVE' },
      { name: 'Derrick Henry', position: 'RB', team: 'TEN', projection: 14.1, status: 'ACTIVE' },
      
      // WRs
      { name: 'Cooper Kupp', position: 'WR', team: 'LAR', projection: 16.8, status: 'ACTIVE' },
      { name: 'Stefon Diggs', position: 'WR', team: 'BUF', projection: 15.9, status: 'ACTIVE' },
      { name: 'Tyreek Hill', position: 'WR', team: 'MIA', projection: 15.4, status: 'ACTIVE' },
      { name: 'Davante Adams', position: 'WR', team: 'LV', projection: 14.7, status: 'ACTIVE' },
      { name: 'Mike Evans', position: 'WR', team: 'TB', projection: 13.8, status: 'ACTIVE' },
      { name: 'Keenan Allen', position: 'WR', team: 'LAC', projection: 13.2, status: 'ACTIVE' },
      
      // TEs
      { name: 'Travis Kelce', position: 'TE', team: 'KC', projection: 14.2, status: 'ACTIVE' },
      { name: 'Mark Andrews', position: 'TE', team: 'BAL', projection: 11.8, status: 'ACTIVE' },
      { name: 'George Kittle', position: 'TE', team: 'SF', projection: 10.5, status: 'ACTIVE' },
      { name: 'T.J. Hockenson', position: 'TE', team: 'MIN', projection: 9.7, status: 'ACTIVE' },
      
      // K
      { name: 'Justin Tucker', position: 'K', team: 'BAL', projection: 9.2, status: 'ACTIVE' },
      { name: 'Daniel Carlson', position: 'K', team: 'LV', projection: 8.8, status: 'ACTIVE' },
      
      // DST
      { name: 'Bills DST', position: 'DST', team: 'BUF', projection: 8.5, status: 'ACTIVE' },
      { name: 'Eagles DST', position: 'DST', team: 'PHI', projection: 7.8, status: 'ACTIVE' }
    ];

    console.log('🔄 Updating player projections...');

    for (const playerUpdate of playerUpdates) {
      try {
        // Find or create player
        let player = await prisma.player.findFirst({
          where: {
            name: playerUpdate.name,
            position: playerUpdate.position
          }
        });

        if (!player) {
          // Create new player
          player = await prisma.player.create({
            data: {
              name: playerUpdate.name,
              position: playerUpdate.position,
              team: playerUpdate.team,
              status: playerUpdate.status,
              isActive: true
            }
          });
          console.log(`➕ Created player: ${player.name}`);
        } else {
          // Update existing player
          await prisma.player.update({
            where: { id: player.id },
            data: {
              team: playerUpdate.team,
              status: playerUpdate.status,
              isActive: true
            }
          });
        }

        // Update or create projection for Week 4
        await prisma.playerProjection.upsert({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week: currentWeek,
              season: currentSeason
            }
          },
          update: {
            projectedPoints: playerUpdate.projection,
            confidence: 0.85,
            updatedAt: new Date()
          },
          create: {
            playerId: player.id,
            week: currentWeek,
            season: currentSeason,
            projectedPoints: playerUpdate.projection,
            confidence: 0.85,
            source: 'AI_MODEL'
          }
        });

      } catch (error) {
        console.error(`❌ Error updating player ${playerUpdate.name}:`, error);
      }
    }

    // Update matchups for Week 4
    console.log('🏟️ Setting up Week 4 matchups...');

    // Clear existing Week 4 matchups
    await prisma.matchup.deleteMany({
      where: {
        leagueId: testLeague.id,
        week: currentWeek,
        season: currentSeason
      }
    });

    // Create new matchups for Week 4
    const teams = testLeague.teams;
    const matchups = [];

    // Create 5 matchups for 10 teams
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        matchups.push({
          leagueId: testLeague.id,
          week: currentWeek,
          season: currentSeason,
          homeTeamId: teams[i].id,
          awayTeamId: teams[i + 1].id,
          status: 'UPCOMING'
        });
      }
    }

    for (const matchup of matchups) {
      await prisma.matchup.create({
        data: matchup
      });
    }

    console.log(`✅ Created ${matchups.length} matchups for Week 4`);

    // Update team records and standings
    console.log('📊 Updating team standings...');

    for (const team of teams) {
      // Calculate current record (this is simplified)
      const wins = Math.floor(Math.random() * 4); // 0-3 wins for week 4
      const losses = 3 - wins;
      const pointsFor = 350 + Math.random() * 100; // Random points for simulation
      const pointsAgainst = 320 + Math.random() * 120;

      await prisma.teamSeason.upsert({
        where: {
          teamId_season: {
            teamId: team.id,
            season: currentSeason
          }
        },
        update: {
          wins,
          losses,
          ties: 0,
          pointsFor: Math.round(pointsFor),
          pointsAgainst: Math.round(pointsAgainst),
          streak: Math.random() > 0.5 ? 'W1' : 'L1',
          lastUpdated: new Date()
        },
        create: {
          teamId: team.id,
          leagueId: testLeague.id,
          season: currentSeason,
          wins,
          losses,
          ties: 0,
          pointsFor: Math.round(pointsFor),
          pointsAgainst: Math.round(pointsAgainst),
          playoffSeed: 0,
          divisionRank: 0,
          streak: Math.random() > 0.5 ? 'W1' : 'L1'
        }
      });
    }

    // Ensure all test users have complete profiles
    console.log('👤 Updating user profiles...');

    const testUsers = teams.map(team => team.owner).filter(Boolean);
    
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      if (!user) continue;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name || `Test User ${i + 1}`,
          email: user.email || `testuser${i + 1}@astralfield.com`,
          image: user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 1}`,
          isActive: true,
          onboardingCompleted: true,
          lastLoginAt: new Date()
        }
      });

      // Ensure user has preferences set
      await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: {
          theme: 'system',
          notifications: {
            trades: true,
            waivers: true,
            games: true,
            achievements: true
          },
          favoriteTeam: ['BUF', 'KC', 'PHI', 'SF', 'BAL', 'CIN', 'LAC', 'MIN', 'NO', 'TB'][i] || 'BUF'
        },
        create: {
          userId: user.id,
          theme: 'system',
          notifications: {
            trades: true,
            waivers: true,
            games: true,
            achievements: true
          },
          favoriteTeam: ['BUF', 'KC', 'PHI', 'SF', 'BAL', 'CIN', 'LAC', 'MIN', 'NO', 'TB'][i] || 'BUF'
        }
      });
    }

    // Add some recent activity for realism
    console.log('📝 Adding recent league activity...');

    for (let i = 0; i < 5; i++) {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];
      const activities = [
        'Set lineup for Week 4',
        'Claimed player from waivers',
        'Proposed a trade',
        'Updated team name',
        'Added player to watch list'
      ];

      await prisma.leagueActivity.create({
        data: {
          leagueId: testLeague.id,
          teamId: randomTeam.id,
          userId: randomTeam.userId,
          type: 'LINEUP_SET',
          description: activities[Math.floor(Math.random() * activities.length)],
          metadata: {
            week: currentWeek,
            season: currentSeason
          }
        }
      });
    }

    console.log('🎉 Test league successfully updated for Week 4!');
    console.log('\n📋 Summary:');
    console.log(`   League: ${testLeague.name}`);
    console.log(`   Teams: ${teams.length}`);
    console.log(`   Current Week: ${currentWeek}`);
    console.log(`   Season: ${currentSeason}`);
    console.log(`   Players Updated: ${playerUpdates.length}`);
    console.log(`   Matchups Created: ${matchups.length}`);
    console.log('   ✅ All user profiles updated and active');

  } catch (error) {
    console.error('❌ Error updating test league:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateTestLeagueForWeek4();