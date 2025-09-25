import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserTeamAssociations() {
  try {
    console.log('🔍 Checking user-team associations...');
    
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        teams: true
      }
    });
    
    console.log(`Found ${users.length} users`);
    
    // Get all teams
    const teams = await prisma.team.findMany({
      include: {
        owner: true,
        league: true
      }
    });
    
    console.log(`Found ${teams.length} teams`);
    
    // Check if users have teams
    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Has ${user.teams.length} teams as owner`);
      
      if (user.teams.length === 0) {
        // Find a team that matches the user's name or email
        let matchingTeam = teams.find(team => 
          team.name.toLowerCase().includes(user.name?.toLowerCase() || '') ||
          team.name.toLowerCase().includes(user.email.split('@')[0].toLowerCase())
        );
        
        // If no matching team found, assign the first available team without an owner
        if (!matchingTeam) {
          matchingTeam = teams.find(team => !team.ownerId);
        }
        
        if (matchingTeam) {
          console.log(`  ➡️ Assigning team "${matchingTeam.name}" to user ${user.email}`);
          await prisma.team.update({
            where: { id: matchingTeam.id },
            data: { ownerId: user.id }
          });
        } else {
          console.log(`  ⚠️ No available team to assign to user ${user.email}`);
        }
      }
    }
    
    // Verify the associations
    console.log('\n✅ Verification:');
    const updatedUsers = await prisma.user.findMany({
      include: {
        teams: true
      }
    });
    
    for (const user of updatedUsers) {
      const team = user.teams[0];
      if (team) {
        console.log(`  User ${user.email} owns team "${team.name}"`);
      } else {
        console.log(`  ⚠️ User ${user.email} has NO team`);
      }
    }
    
    // Check if teams have owners
    console.log('\n📊 Team ownership status:');
    const teamsAfter = await prisma.team.findMany({
      include: {
        owner: true
      }
    });
    
    for (const team of teamsAfter) {
      if (team.owner) {
        console.log(`  ✅ Team "${team.name}" owned by ${team.owner.email}`);
      } else {
        console.log(`  ❌ Team "${team.name}" has NO owner`);
      }
    }
    
    console.log('\n✨ User-team associations updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing user-team associations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserTeamAssociations();