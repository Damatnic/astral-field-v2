import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The 10 correct emails for our league members
const correctEmails = [
  'nicholas@astralfield.com',
  'nick@astralfield.com', 
  'jack@astralfield.com',
  'larry@astralfield.com',
  'renee@astralfield.com',
  'jon@astralfield.com',
  'david@astralfield.com',
  'kaity@astralfield.com',
  'cason@astralfield.com',
  'brittany@astralfield.com'
];

async function cleanupDuplicateTeams() {
  console.log('🧹 Starting cleanup of duplicate teams...');
  
  // Find the D'Amato Dynasty League
  const league = await prisma.league.findFirst({
    where: { name: "D'Amato Dynasty League" },
    include: {
      teams: {
        include: {
          owner: true
        }
      }
    }
  });

  if (!league) {
    console.error('❌ League not found!');
    return;
  }

  console.log(`📊 Found league: ${league.name} with ${league.teams.length} teams`);

  // Separate teams into correct and duplicate
  const correctTeams: any[] = [];
  const duplicateTeams: any[] = [];

  for (const team of league.teams) {
    if (correctEmails.includes(team.owner.email)) {
      // This is a correct team
      correctTeams.push(team);
      console.log(`✅ Keeping: ${team.name} (${team.owner.email})`);
    } else {
      // This is a duplicate/old team
      duplicateTeams.push(team);
      console.log(`🗑️ Marking for deletion: ${team.name} (${team.owner.email})`);
    }
  }

  console.log(`\n📊 Analysis:`);
  console.log(`   Correct teams: ${correctTeams.length}`);
  console.log(`   Duplicate teams: ${duplicateTeams.length}`);

  if (correctTeams.length !== 10) {
    console.error(`❌ Expected 10 correct teams, found ${correctTeams.length}`);
    return;
  }

  if (duplicateTeams.length === 0) {
    console.log('✅ No duplicate teams found! League is clean.');
    return;
  }

  // Delete duplicate teams
  console.log(`\n🗑️ Deleting ${duplicateTeams.length} duplicate teams...`);
  
  for (const team of duplicateTeams) {
    try {
      // First, delete any related data (roster entries, etc.)
      await prisma.rosterPlayer.deleteMany({
        where: { teamId: team.id }
      });
      
      // Then delete the team
      await prisma.team.delete({
        where: { id: team.id }
      });
      
      console.log(`✅ Deleted: ${team.name} (${team.owner.email})`);
    } catch (error) {
      console.error(`❌ Error deleting ${team.name}:`, error);
    }
  }

  // Verify the cleanup
  const updatedLeague = await prisma.league.findFirst({
    where: { name: "D'Amato Dynasty League" },
    include: {
      teams: {
        include: {
          owner: true
        }
      }
    }
  });

  console.log(`\n🎉 Cleanup complete!`);
  console.log(`📊 Final team count: ${updatedLeague?.teams.length}`);
  
  if (updatedLeague?.teams.length === 10) {
    console.log('✅ Perfect! League now has exactly 10 teams.');
    
    // List the final teams
    console.log('\n🏆 Final D\'Amato Dynasty League Teams:');
    updatedLeague.teams
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.name} - ${team.owner.name} (${team.owner.email})`);
      });
  } else {
    console.error(`❌ Something went wrong! Expected 10 teams, have ${updatedLeague?.teams.length}`);
  }
}

cleanupDuplicateTeams()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });