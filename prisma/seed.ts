import { PrismaClient, Position, UserRole, DraftStatus, DraftType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// NFL Teams mapping
const nflTeams = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA',
  'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB',
  'TEN', 'WAS'
];

// Sample player data with realistic stats
const samplePlayers = [
  // QBs
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', espnId: '3917792', rank: 1 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', espnId: '3916387', rank: 2 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', espnId: '4040715', rank: 3 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', espnId: '2577417', rank: 4 },
  { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', espnId: '4241479', rank: 5 },
  
  // RBs
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', espnId: '3116385', rank: 1 },
  { name: 'Austin Ekeler', position: 'RB', nflTeam: 'LAC', espnId: '3051392', rank: 2 },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'TEN', espnId: '2979520', rank: 3 },
  { name: 'Nick Chubb', position: 'RB', nflTeam: 'CLE', espnId: '3929628', rank: 4 },
  { name: 'Saquon Barkley', position: 'RB', nflTeam: 'NYG', espnId: '3929630', rank: 5 },
  { name: 'Josh Jacobs', position: 'RB', nflTeam: 'LV', espnId: '4035687', rank: 6 },
  { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', espnId: '4239993', rank: 7 },
  { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', espnId: '3040151', rank: 8 },
  
  // WRs
  { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', espnId: '3045138', rank: 1 },
  { name: 'Stefon Diggs', position: 'WR', nflTeam: 'BUF', espnId: '2976499', rank: 2 },
  { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', espnId: '2980453', rank: 3 },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', espnId: '2976062', rank: 4 },
  { name: 'DeAndre Hopkins', position: 'WR', nflTeam: 'ARI', espnId: '16737', rank: 5 },
  { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', espnId: '16800', rank: 6 },
  { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', espnId: '4035004', rank: 7 },
  { name: 'Ja\'Marr Chase', position: 'WR', nflTeam: 'CIN', espnId: '4426515', rank: 8 },
  { name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', espnId: '4372016', rank: 9 },
  { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', espnId: '4361050', rank: 10 },
  
  // TEs
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', espnId: '15847', rank: 1 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', espnId: '3915511', rank: 2 },
  { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', espnId: '4047365', rank: 3 },
  { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', espnId: '4426444', rank: 4 },
  { name: 'George Kittle', position: 'TE', nflTeam: 'SF', espnId: '3052587', rank: 5 },
  
  // K
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', espnId: '14005', rank: 1 },
  { name: 'Daniel Carlson', position: 'K', nflTeam: 'LV', espnId: '3115293', rank: 2 },
  { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', espnId: '4361259', rank: 3 },
  
  // DEF
  { name: 'Buffalo Bills', position: 'DEF', nflTeam: 'BUF', espnId: 'BUF_DEF', rank: 1 },
  { name: 'San Francisco 49ers', position: 'DEF', nflTeam: 'SF', espnId: 'SF_DEF', rank: 2 },
  { name: 'Philadelphia Eagles', position: 'DEF', nflTeam: 'PHI', espnId: 'PHI_DEF', rank: 3 }
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@astralfield.com' },
      update: {},
      create: {
        email: 'admin@astralfield.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
        teamName: 'Admin Team',
        hashedPassword,
        isAdmin: true,
        onboardingCompleted: true,
        preferences: {
          create: {
            emailNotifications: true,
            pushNotifications: true,
            theme: 'dark',
            timezone: 'America/New_York',
            favoriteTeam: 'SF'
          }
        }
      }
    }),
    prisma.user.upsert({
      where: { email: 'commissioner@test.com' },
      update: {},
      create: {
        email: 'commissioner@test.com',
        name: 'League Commissioner',
        role: UserRole.COMMISSIONER,
        teamName: 'Commissioner United',
        hashedPassword,
        onboardingCompleted: true,
        preferences: {
          create: {
            emailNotifications: true,
            pushNotifications: true,
            theme: 'light',
            timezone: 'America/Chicago',
            favoriteTeam: 'KC'
          }
        }
      }
    }),
    ...Array.from({ length: 8 }, (_, i) => 
      prisma.user.upsert({
        where: { email: `player${i + 1}@test.com` },
        update: {},
        create: {
          email: `player${i + 1}@test.com`,
          name: `Player ${i + 1}`,
          role: UserRole.PLAYER,
          teamName: `Team ${i + 1}`,
          hashedPassword,
          onboardingCompleted: true,
          preferences: {
            create: {
              emailNotifications: true,
              pushNotifications: false,
              theme: i % 2 === 0 ? 'dark' : 'light',
              timezone: 'America/New_York',
              favoriteTeam: nflTeams[Math.floor(Math.random() * nflTeams.length)]
            }
          }
        }
      })
    )
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create league
  console.log('🏈 Creating league...');
  const league = await prisma.league.upsert({
    where: { id: 'test-league-1' },
    update: {},
    create: {
      id: 'test-league-1',
      name: 'AstralField Test League',
      commissionerId: users[1].id, // Commissioner
      currentWeek: 1,
      season: '2024',
      settings: {
        maxTeams: 10,
        playoffTeams: 4,
        playoffWeeks: 3,
        regularSeasonWeeks: 14,
        waiverType: 'faab',
        faabBudget: 1000,
        tradeDeadline: 'week-10',
        rosterLocks: 'game-time'
      },
      scoringSettings: {
        passing: { yards: 0.04, touchdowns: 4, interceptions: -2 },
        rushing: { yards: 0.1, touchdowns: 6 },
        receiving: { yards: 0.1, touchdowns: 6, receptions: 0.5 },
        kicking: { extra_points: 1, field_goals: { '0-39': 3, '40-49': 4, '50+': 5 } },
        defense: { touchdowns: 6, interceptions: 2, fumbles: 2, safeties: 2, sacks: 1 }
      },
      rosterSettings: {
        positions: {
          QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1, BENCH: 6, IR: 1
        },
        maxPerPosition: {
          QB: 4, RB: 8, WR: 8, TE: 4, K: 3, DEF: 3
        }
      },
      draftSettings: {
        type: 'snake',
        rounds: 15,
        timePerPick: 90,
        autopickEnabled: true,
        autodraftRankings: 'espn'
      }
    }
  });

  // Create teams
  console.log('👥 Creating teams...');
  const teams = await Promise.all(
    users.slice(1, 11).map((user, index) => // Skip admin, take 10 users for teams
      prisma.team.upsert({
        where: { id: `team-${user.id}` },
        update: {},
        create: {
          id: `team-${user.id}`,
          name: user.teamName || `Team ${index + 1}`,
          ownerId: user.id,
          leagueId: league.id,
          logo: null,
          waiverPriority: index + 1,
          faabBudget: 1000,
          faabSpent: 0
        }
      })
    )
  );

  console.log(`✅ Created ${teams.length} teams`);

  // Create players
  console.log('🏃 Creating players...');
  const players = await Promise.all(
    samplePlayers.map(playerData =>
      prisma.player.upsert({
        where: { espnId: playerData.espnId },
        update: {},
        create: {
          espnId: playerData.espnId,
          name: playerData.name,
          firstName: playerData.name.split(' ')[0],
          lastName: playerData.name.split(' ').slice(1).join(' '),
          position: playerData.position as Position,
          nflTeam: playerData.nflTeam,
          team: playerData.nflTeam,
          rank: playerData.rank,
          adp: playerData.rank * 1.2 + Math.random() * 5,
          status: 'active',
          isFantasyRelevant: true,
          isActive: true,
          byeWeek: Math.floor(Math.random() * 4) + 6, // Random bye week 6-9
          age: Math.floor(Math.random() * 10) + 22, // Age 22-32
          experience: Math.floor(Math.random() * 12) + 1, // 1-12 years
          jerseyNumber: Math.floor(Math.random() * 99) + 1,
          height: '6\'2"',
          weight: '220 lbs',
          college: 'Test University'
        }
      })
    )
  );

  console.log(`✅ Created ${players.length} players`);

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
📊 Summary:
- Users: ${users.length}
- Teams: ${teams.length}
- Players: ${players.length}
- League: 1

🔑 Test Accounts:
- Admin: admin@astralfield.com (password: password123)
- Commissioner: commissioner@test.com (password: password123)
- Players: player1@test.com - player8@test.com (password: password123)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
