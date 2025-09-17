import { prisma } from '../src/lib/db';

async function fixDuplicateUsers() {
  console.log('🔧 Fixing duplicate Nicholas D\'Amato users...');
  
  try {
    // Find both Nicholas D'Amato users
    const nicholasUsers = await prisma.user.findMany({
      where: {
        name: "Nicholas D'Amato"
      },
      select: {
        id: true,
        email: true,
        role: true,
        teams: { select: { id: true } },
        commissionedLeagues: { select: { id: true } }
      }
    });

    console.log(`Found ${nicholasUsers.length} Nicholas D'Amato users:`);
    nicholasUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.role} - Teams: ${user.teams.length}, Leagues: ${user.commissionedLeagues.length}`);
    });

    if (nicholasUsers.length !== 2) {
      console.log('❌ Expected exactly 2 users, found different number');
      return;
    }

    // Keep the one with teams and leagues (nicholas.damato@astralfield.com)
    // Remove the one without (nicholas@astralfield.com)
    const userToKeep = nicholasUsers.find(u => u.teams.length > 0 || u.commissionedLeagues.length > 0);
    const userToRemove = nicholasUsers.find(u => u.teams.length === 0 && u.commissionedLeagues.length === 0);

    if (!userToKeep || !userToRemove) {
      console.log('❌ Could not determine which user to keep/remove');
      return;
    }

    console.log(`🗑️ Removing user: ${userToRemove.email}`);
    console.log(`✅ Keeping user: ${userToKeep.email}`);

    // Remove the duplicate user
    await prisma.user.delete({
      where: {
        id: userToRemove.id
      }
    });

    console.log('✅ Successfully removed duplicate user!');

  } catch (error) {
    console.error('❌ Error fixing duplicate users:', error);
    throw error;
  }
}

fixDuplicateUsers()
  .then(() => {
    console.log('🎉 Duplicate user fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });