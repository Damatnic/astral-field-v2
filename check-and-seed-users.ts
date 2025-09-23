import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas.damato@test.com", team: "D'Amato Dynasty" },
  { name: "Nick Hartley", email: "nick.hartley@test.com", team: "Hartley's Heroes" },
  { name: "Jack McCaigue", email: "jack.mccaigue@test.com", team: "McCaigue Mayhem" },
  { name: "Larry McCaigue", email: "larry.mccaigue@test.com", team: "Larry Legends" },
  { name: "Renee McCaigue", email: "renee.mccaigue@test.com", team: "Renee's Reign" },
  { name: "Jon Kornbeck", email: "jon.kornbeck@test.com", team: "Kornbeck Crushers" },
  { name: "David Jarvey", email: "david.jarvey@test.com", team: "Jarvey's Juggernauts" },
  { name: "Kaity Lorbecki", email: "kaity.lorbecki@test.com", team: "Lorbecki Lions" },
  { name: "Cason Minor", email: "cason.minor@test.com", team: "Minor Miracles" },
  { name: "Brittany Bergum", email: "brittany.bergum@test.com", team: "Bergum Blitz" }
];

async function checkAndSeedUsers() {
  try {
    // Check current users
    const existingUsers = await prisma.user.findMany();
    console.log(`Found ${existingUsers.length} existing users`);
    
    if (existingUsers.length === 0) {
      console.log('No users found. Seeding test users...');
      
      // Create commissioner user first
      const commissionerData = TEST_USERS.find(u => u.email === 'nicholas.damato@test.com') || TEST_USERS[0];
      const commissioner = await prisma.user.create({
        data: {
          email: commissionerData.email,
          name: commissionerData.name,
          role: 'COMMISSIONER'
        }
      });
      console.log('Created commissioner user');
      
      // Create test league with commissioner
      const league = await prisma.league.create({
        data: {
          id: 'test-league-2025',
          name: 'Test League 2025',
          season: '2025',
          isActive: true,
          commissionerId: commissioner.id,
          settings: {},
          scoringSettings: {},
          rosterSettings: {},
          draftSettings: {}
        }
      });
      console.log('Created test league');
      
      // Create team for commissioner
      await prisma.team.create({
        data: {
          name: commissionerData.team,
          ownerId: commissioner.id,
          leagueId: league.id,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0
        }
      });
      console.log(`Created commissioner team: ${commissionerData.team}`);
      
      // Create remaining users and teams
      for (const userData of TEST_USERS.filter(u => u.email !== commissionerData.email)) {
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            role: 'PLAYER'
          }
        });
        
        await prisma.team.create({
          data: {
            name: userData.team,
            ownerId: user.id,
            leagueId: league.id,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0
          }
        });
        
        console.log(`Created user: ${userData.name} with team: ${userData.team}`);
      }
      
      console.log('Successfully seeded all test users!');
    } else {
      console.log('Users already exist:');
      existingUsers.forEach(user => {
        console.log(`- ${user.name} (${user.email})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeedUsers();