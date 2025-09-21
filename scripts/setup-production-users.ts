#!/usr/bin/env ts-node

/**
 * Production User Setup Script
 * Creates initial users with hashed passwords for production deployment
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface UserSetup {
  email: string;
  name: string;
  role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER';
  password: string;
  teamName?: string;
}

const PRODUCTION_USERS: UserSetup[] = [
  {
    email: 'admin@astralfield.com',
    name: 'Admin User',
    role: 'ADMIN',
    password: 'AdminPass123!',
    teamName: 'System Admin'
  },
  {
    email: 'commissioner@astralfield.com',
    name: 'League Commissioner',
    role: 'COMMISSIONER',
    password: 'CommishPass123!',
    teamName: 'The Commissioners'
  },
  {
    email: 'player1@astralfield.com',
    name: 'John Doe',
    role: 'PLAYER',
    password: 'Player123!',
    teamName: 'The Champions'
  },
  {
    email: 'player2@astralfield.com',
    name: 'Jane Smith',
    role: 'PLAYER',
    password: 'Player123!',
    teamName: 'Grid Iron Warriors'
  },
  {
    email: 'demo@astralfield.com',
    name: 'Demo User',
    role: 'PLAYER',
    password: 'demo123',
    teamName: 'Demo Team'
  }
];

async function setupProductionUsers() {
  console.log('🚀 Starting Production User Setup...\n');

  try {
    // Check database connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Get or create the default league
    console.log('🏈 Setting up default league...');
    let league = await prisma.league.findFirst({
      where: { name: 'AstralField Fantasy League' }
    });

    if (!league) {
      league = await prisma.league.create({
        data: {
          id: 'astral-league-2024',
          name: 'AstralField Fantasy League',
          season: 2024,
          currentWeek: 1,
          isActive: true,
          description: 'Official AstralField Fantasy Football League'
        }
      });
      console.log('✅ League created:', league.name);
      
      // Create settings for the league
      await prisma.settings.create({
        data: {
          leagueId: league.id,
          rosterSlots: {
            QB: 1,
            RB: 2,
            WR: 2,
            TE: 1,
            FLEX: 1,
            DEF: 1,
            K: 1,
            BENCH: 6
          },
          scoringSystem: {
            passing: { yards: 0.04, td: 4, int: -2 },
            rushing: { yards: 0.1, td: 6 },
            receiving: { yards: 0.1, td: 6, receptions: 1 },
            kicking: { fg0_39: 3, fg40_49: 4, fg50: 5, pat: 1 }
          },
          waiverMode: 'ROLLING',
          tradeDeadline: new Date('2024-11-15'),
          playoffWeeks: [14, 15, 16, 17]
        }
      });
      console.log('✅ League settings created');
    } else {
      console.log('✅ League exists:', league.name);
    }

    // Create users
    console.log('\n👥 Creating production users...');
    
    for (const userData of PRODUCTION_USERS) {
      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email}`);
          
          // Update password if user exists
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await prisma.user.update({
            where: { email: userData.email },
            data: { 
              password: hashedPassword,
              name: userData.name,
              role: userData.role
            }
          });
          console.log(`   ✅ Password updated for ${userData.email}`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            password: hashedPassword,
            avatar: null  // Avatars will be generated client-side
          }
        });

        console.log(`✅ Created user: ${user.email} (${user.role})`);

        // Create team for the user
        if (userData.teamName && league) {
          const team = await prisma.team.create({
            data: {
              name: userData.teamName,
              ownerId: user.id,
              leagueId: league.id,
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
          console.log(`   📋 Created team: ${team.name}`);
        }

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error);
      }
    }

    // Display login credentials
    console.log('\n📝 Login Credentials:');
    console.log('═══════════════════════════════════════════');
    PRODUCTION_USERS.forEach(user => {
      console.log(`${user.role.padEnd(15)} | Email: ${user.email.padEnd(30)} | Password: ${user.password}`);
    });
    console.log('═══════════════════════════════════════════');

    // Create sample matchups
    console.log('\n🏆 Creating sample matchups...');
    const teams = await prisma.team.findMany({
      where: { leagueId: league.id },
      take: 4
    });

    if (teams.length >= 2) {
      const currentWeek = 1;
      
      for (let i = 0; i < teams.length; i += 2) {
        if (teams[i + 1]) {
          await prisma.matchup.create({
            data: {
              leagueId: league.id,
              week: currentWeek,
              homeTeamId: teams[i].id,
              awayTeamId: teams[i + 1].id,
              homeScore: Math.floor(Math.random() * 50) + 70,
              awayScore: Math.floor(Math.random() * 50) + 70,
              isComplete: false
            }
          });
          console.log(`✅ Created matchup: ${teams[i].name} vs ${teams[i + 1].name}`);
        }
      }
    }

    // Test authentication for each user
    console.log('\n🔐 Testing authentication...');
    for (const userData of PRODUCTION_USERS) {
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (user && user.password) {
        const isValid = await bcrypt.compare(userData.password, user.password);
        console.log(`${userData.email}: ${isValid ? '✅ Auth working' : '❌ Auth failed'}`);
      }
    }

    console.log('\n✨ Production setup complete!');
    console.log('\n🌐 Next Steps:');
    console.log('1. Visit https://astral-field-v1.vercel.app/login');
    console.log('2. Use any of the credentials above to log in');
    console.log('3. Admin user can manage all league settings');
    console.log('4. Commissioner can manage teams and matchups');
    console.log('5. Players can manage their own teams');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupProductionUsers()
  .then(() => {
    console.log('\n🎉 All production users are ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });