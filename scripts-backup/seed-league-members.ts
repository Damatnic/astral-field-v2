import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const leagueMembers = [
  {
    email: 'nicholas@astralfield.com',
    name: "Nicholas D'Amato",
    role: UserRole.COMMISSIONER,
    teamName: "D'Amato Dynasty"
  },
  {
    email: 'nick@astralfield.com',
    name: 'Nick Hartley',
    role: UserRole.PLAYER,
    teamName: 'Hartley Heroes'
  },
  {
    email: 'jack@astralfield.com',
    name: 'Jack McCaigue',
    role: UserRole.PLAYER,
    teamName: 'McCaigue Mayhem'
  },
  {
    email: 'larry@astralfield.com',
    name: 'Larry McCaigue',
    role: UserRole.PLAYER,
    teamName: "Larry's Legends"
  },
  {
    email: 'renee@astralfield.com',
    name: 'Renee McCaigue',
    role: UserRole.PLAYER,
    teamName: "Renee's Reign"
  },
  {
    email: 'jon@astralfield.com',
    name: 'Jon Kornbeck',
    role: UserRole.PLAYER,
    teamName: 'Kornbeck Crushers'
  },
  {
    email: 'david@astralfield.com',
    name: 'David Jarvey',
    role: UserRole.PLAYER,
    teamName: "Jarvey's Juggernauts"
  },
  {
    email: 'kaity@astralfield.com',
    name: 'Kaity Lorbecki',
    role: UserRole.PLAYER,
    teamName: 'Lorbecki Lions'
  },
  {
    email: 'cason@astralfield.com',
    name: 'Cason Minor',
    role: UserRole.PLAYER,
    teamName: 'Minor Miracles'
  },
  {
    email: 'brittany@astralfield.com',
    name: 'Brittany Bergum',
    role: UserRole.PLAYER,
    teamName: 'Bergum Blitz'
  }
];

async function main() {
  console.log('🏈 Seeding D\'Amato Dynasty League Members...');

  // First create or find the league
  let league = await prisma.league.findFirst({
    where: { name: "D'Amato Dynasty League" }
  });

  if (!league) {
    league = await prisma.league.create({
      data: {
        name: "D'Amato Dynasty League",
        season: 2025,
        currentWeek: 15,
        isActive: true,
        description: "D'Amato Dynasty League - 10 Team PPR Dynasty League"
      }
    });
  } else {
    league = await prisma.league.update({
      where: { id: league.id },
      data: {
        season: 2025,
        currentWeek: 15,
        isActive: true
      }
    });
  }

  console.log(`✅ League created/updated: ${league.name} (ID: ${league.id})`);

  // Create users and teams
  for (const [index, member] of leagueMembers.entries()) {
    try {
      // Create or update user
      const user = await prisma.user.upsert({
        where: { email: member.email },
        update: {
          name: member.name,
          role: member.role
        },
        create: {
          email: member.email,
          name: member.name,
          role: member.role
        }
      });

      console.log(`✅ User: ${user.name} (${user.email})`);

      // Create team for user
      const team = await prisma.team.upsert({
        where: { 
          leagueId_ownerId: {
            leagueId: league.id,
            ownerId: user.id
          }
        },
        update: {
          name: member.teamName,
          wins: Math.floor(Math.random() * 10) + 3,
          losses: Math.floor(Math.random() * 8) + 3,
          ties: Math.floor(Math.random() * 2),
          pointsFor: Math.floor(Math.random() * 500) + 1200,
          pointsAgainst: Math.floor(Math.random() * 500) + 1100,
          waiverPriority: index + 1,
          faabBudget: 1000,
          faabSpent: Math.floor(Math.random() * 300)
        },
        create: {
          name: member.teamName,
          leagueId: league.id,
          ownerId: user.id,
          wins: Math.floor(Math.random() * 10) + 3,
          losses: Math.floor(Math.random() * 8) + 3,
          ties: Math.floor(Math.random() * 2),
          pointsFor: Math.floor(Math.random() * 500) + 1200,
          pointsAgainst: Math.floor(Math.random() * 500) + 1100,
          waiverPriority: index + 1,
          faabBudget: 1000,
          faabSpent: Math.floor(Math.random() * 300)
        }
      });

      console.log(`✅ Team: ${team.name} (${team.wins}-${team.losses}-${team.ties})`);
    } catch (error) {
      console.error(`❌ Error creating ${member.name}:`, error);
    }
  }

  // Create some demo accounts too
  const demoUsers = [
    { email: 'demo@astralfield.com', name: 'Demo User', role: UserRole.PLAYER },
    { email: 'admin@astralfield.com', name: 'Admin', role: UserRole.ADMIN }
  ];

  for (const demo of demoUsers) {
    try {
      await prisma.user.upsert({
        where: { email: demo.email },
        update: { name: demo.name, role: demo.role },
        create: {
          email: demo.email,
          name: demo.name,
          role: demo.role
        }
      });
      console.log(`✅ Demo user: ${demo.name}`);
    } catch (error) {
      console.error(`❌ Error creating demo user ${demo.name}:`, error);
    }
  }

  console.log('\n🎉 League seeding completed successfully!');
  
  // Show final stats
  const userCount = await prisma.user.count();
  const teamCount = await prisma.team.count();
  const leagueCount = await prisma.league.count();
  
  console.log(`📊 Final stats:`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Teams: ${teamCount}`);
  console.log(`   Leagues: ${leagueCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });