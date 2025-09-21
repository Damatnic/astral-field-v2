import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface LeagueMember {
  name: string;
  email: string;
  teamName: string;
  role: UserRole;
}

const DAMATO_DYNASTY_MEMBERS: LeagueMember[] = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: UserRole.COMMISSIONER },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: UserRole.PLAYER },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: UserRole.PLAYER },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: UserRole.PLAYER },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: UserRole.PLAYER },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: UserRole.PLAYER },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: UserRole.PLAYER },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: UserRole.PLAYER },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: UserRole.PLAYER },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: UserRole.PLAYER }
];

async function seedDamatoUsers() {
  console.log('🏈 Seeding D\'Amato Dynasty League Users...\n');
  
  try {
    // First, create or get the league
    let league = await prisma.league.findFirst({
      where: { name: "D'Amato Dynasty League" }
    });
    
    if (!league) {
      console.log('Creating D\'Amato Dynasty League...');
      league = await prisma.league.create({
        data: {
          name: "D'Amato Dynasty League",
          sleeperLeagueId: "damato-dynasty-2025",
          season: 2025,
          settings: {
            maxTeams: 10,
            scoringType: "PPR",
            playoffTeams: 6,
            tradeDeadline: 10,
            waiverType: "FAAB",
            waiverBudget: 100
          }
        }
      });
      console.log('✅ League created');
    }
    
    // Create users and teams
    for (const member of DAMATO_DYNASTY_MEMBERS) {
      console.log(`\nProcessing ${member.name}...`);
      
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: member.email }
      });
      
      if (!user) {
        // Hash a default password (should be changed on first login)
        const hashedPassword = await bcrypt.hash('Dynasty2025!', 10);
        
        // Create user
        user = await prisma.user.create({
          data: {
            email: member.email,
            password: hashedPassword,
            name: member.name,
            role: member.role,
            teamName: member.teamName
          }
        });
        console.log(`  ✅ User created: ${member.email}`);
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: member.name,
            role: member.role,
            teamName: member.teamName
          }
        });
        console.log(`  ✅ User updated: ${member.email}`);
      }
      
      // Check if team exists
      let team = await prisma.team.findFirst({
        where: {
          ownerId: user.id,
          leagueId: league.id
        }
      });
      
      if (!team) {
        // Create team
        team = await prisma.team.create({
          data: {
            name: member.teamName,
            ownerId: user.id,
            leagueId: league.id,
            faabBudget: 100,
            waiverPriority: DAMATO_DYNASTY_MEMBERS.indexOf(member) + 1
          }
        });
        console.log(`  ✅ Team created: ${member.teamName}`);
      }
      
      // Check if league membership exists
      const membership = await prisma.leagueMember.findUnique({
        where: {
          userId_leagueId: {
            userId: user.id,
            leagueId: league.id
          }
        }
      });
      
      if (!membership) {
        // Create league membership
        await prisma.leagueMember.create({
          data: {
            userId: user.id,
            leagueId: league.id,
            role: member.role === UserRole.COMMISSIONER ? 'COMMISSIONER' : 'OWNER'
          }
        });
        console.log(`  ✅ League membership created`);
      }
    }
    
    // Set the commissioner
    const commissioner = await prisma.user.findUnique({
      where: { email: "nicholas@damato-dynasty.com" }
    });
    
    if (commissioner) {
      await prisma.league.update({
        where: { id: league.id },
        data: {
          commissionerId: commissioner.id
        }
      });
      console.log('\n✅ Commissioner set: Nicholas D\'Amato');
    }
    
    console.log('\n🎉 D\'Amato Dynasty League setup complete!');
    console.log('\nUsers can login with:');
    console.log('  Email: [firstname]@damato-dynasty.com');
    console.log('  Password: Dynasty2025!');
    console.log('\n⚠️  Users should change their password on first login');
    
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDamatoUsers()
  .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });