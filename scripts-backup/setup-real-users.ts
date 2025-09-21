/**
 * Real User Setup Script - 2025 NFL Season Week 3
 * Creates 10 real user accounts and league setup
 */

import * as dotenv from 'dotenv';
import { PrismaClient, UserRole } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Real league members for 2025 season
const REAL_USERS = [
  {
    name: "Nicholas D'Amato",
    email: "nicholas.damato@astralfield.com",
    role: UserRole.ADMIN,
    isCommissioner: true,
    teamName: "Astral Dominators",
    avatar: "👑",
    profileId: "nicholas-damato"
  },
  {
    name: "Nick Hartley", 
    email: "nick.hartley@astralfield.com",
    role: UserRole.PLAYER,
    teamName: "Hartley Heroes",
    avatar: "⚡",
    profileId: "nick-hartley"
  },
  {
    name: "Jack McCaigue",
    email: "jack.mccaigue@astralfield.com", 
    role: UserRole.PLAYER,
    teamName: "Jack's Giants",
    avatar: "🏈",
    profileId: "jack-mccaigue"
  },
  {
    name: "Larry McCaigue",
    email: "larry.mccaigue@astralfield.com",
    role: UserRole.PLAYER, 
    teamName: "Larry's Legends",
    avatar: "🔥",
    profileId: "larry-mccaigue"
  },
  {
    name: "Renee McCaigue",
    email: "renee.mccaigue@astralfield.com",
    role: UserRole.PLAYER,
    teamName: "Renee's Rockets",
    avatar: "🚀",
    profileId: "renee-mccaigue"
  },
  {
    name: "Jon Kornbeck", 
    email: "jon.kornbeck@astralfield.com",
    role: UserRole.PLAYER,
    teamName: "Kornbeck Crushers",
    avatar: "💥",
    profileId: "jon-kornbeck"
  },
  {
    name: "David Jarvey",
    email: "david.jarvey@astralfield.com",
    role: UserRole.PLAYER,
    teamName: "Jarvey's Juggernauts", 
    avatar: "⚔️",
    profileId: "david-jarvey"
  },
  {
    name: "Kaity Lorbecki",
    email: "kaity.lorbecki@astralfield.com",
    role: UserRole.PLAYER,
    teamName: "Kaity's Killers",
    avatar: "💜",
    profileId: "kaity-lorbecki"
  },
  {
    name: "Cason Minor",
    email: "cason.minor@astralfield.com", 
    role: UserRole.PLAYER,
    teamName: "Minor Miracles",
    avatar: "🌟",
    profileId: "cason-minor"
  },
  {
    name: "Brittany Bergum",
    email: "brittany.bergum@astralfield.com",
    role: UserRole.PLAYER,
    teamName: "Bergum's Beasts",
    avatar: "🔥",
    profileId: "brittany-bergum"
  }
];

// 2025 NFL Season Configuration
const NFL_2025_CONFIG = {
  currentWeek: 3,
  season: 2025,
  leagueName: "Astral Field Championship League 2025",
  leagueSize: 10,
  rosterConfig: {
    QB: 1,
    RB: 2, 
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DST: 1,
    BENCH: 6
  }
};

async function clearMockData() {
  console.log('🧹 Clearing existing mock data...');
  
  // Clear in dependency order to avoid foreign key constraints
  await prisma.lineupHistory.deleteMany({});
  await prisma.tradeVote.deleteMany({});
  await prisma.trade.deleteMany({});
  await prisma.waiverClaim.deleteMany({});
  await prisma.rosterPlayer.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.leagueMember.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.league.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.player.deleteMany({});
  
  console.log('✅ Mock data cleared successfully');
}

async function createRealUsers() {
  console.log('👥 Creating real user accounts...');
  
  const createdUsers = [];
  
  for (const userData of REAL_USERS) {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        teamName: userData.teamName,
        avatar: userData.avatar,
        profileId: userData.profileId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.name} (${user.email})`);
  }
  
  return createdUsers;
}

async function createChampionshipLeague(users: any[]) {
  console.log('🏆 Creating Championship League...');
  
  // Find commissioner (Nicholas D'Amato)
  const commissioner = users.find(u => u.role === UserRole.ADMIN);
  
  const league = await prisma.league.create({
    data: {
      name: NFL_2025_CONFIG.leagueName,
      description: "Official Astral Field Championship League for the 2025 NFL Season",
      season: NFL_2025_CONFIG.season,
      currentWeek: NFL_2025_CONFIG.currentWeek,
      isActive: true,
      commissionerId: commissioner.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        create: {
          rosterSlots: NFL_2025_CONFIG.rosterConfig,
          scoringSystem: {
            passing: {
              yards: 0.04,    // 4 points per passing touchdown
              touchdowns: 4,  // 4 points per passing touchdown  
              interceptions: -2,
              twoPointConversions: 2
            },
            rushing: {
              yards: 0.1,     // 10 yards per point
              touchdowns: 6,  // 6 points per rushing touchdown
              twoPointConversions: 2
            },
            receiving: {
              yards: 0.1,     // 10 yards per point
              touchdowns: 6,  // 6 points per receiving touchdown
              receptions: 0.5, // 0.5 PPR (Point Per Reception)
              twoPointConversions: 2
            },
            kicking: {
              fieldGoalsMade: 3,
              fieldGoalsMissed: -1,
              extraPointsMade: 1,
              extraPointsMissed: -1
            },
            defense: {
              sacks: 1,
              interceptions: 2,
              fumblesRecovered: 2,
              safeties: 2,
              touchdowns: 6,
              pointsAllowed0: 10,
              pointsAllowed1to6: 7,
              pointsAllowed7to13: 4,
              pointsAllowed14to20: 1,
              pointsAllowed21to27: 0,
              pointsAllowed28to34: -1,
              pointsAllowed35Plus: -4
            }
          },
          waiverMode: 'FAAB',
          tradeDeadline: new Date('2025-11-20'),
          playoffWeeks: [15, 16, 17]
        }
      }
    }
  });
  
  // Create league memberships for all users
  for (const user of users) {
    await prisma.leagueMember.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        role: user.id === commissioner.id ? 'COMMISSIONER' : 'OWNER'
      }
    });
    
    // Create team for each user
    await prisma.team.create({
      data: {
        name: user.teamName,
        leagueId: league.id,
        ownerId: user.id,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        waiverPriority: Math.floor(Math.random() * 10) + 1,
        faabBudget: 100,
        faabSpent: 0
      }
    });
  }
  
  console.log(`✅ Created league: ${league.name}`);
  console.log(`✅ Added all ${users.length} members to league`);
  
  return league;
}

async function main() {
  try {
    console.log('🚀 Starting Real User Setup for 2025 NFL Season Week 3...\n');
    
    // Clear existing mock data
    await clearMockData();
    
    // Create real users  
    const users = await createRealUsers();
    
    // Create championship league
    const league = await createChampionshipLeague(users);
    
    console.log('\n🎉 Setup Complete!');
    console.log(`📊 League ID: ${league.id}`);
    console.log(`👑 Commissioner: Nicholas D'Amato (Admin)`);
    console.log(`🏈 Season: 2025, Week ${NFL_2025_CONFIG.currentWeek}`);
    console.log(`👥 Members: ${users.length} players`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main as setupRealUsers, REAL_USERS, NFL_2025_CONFIG };