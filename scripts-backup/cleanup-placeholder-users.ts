import { prisma } from '../src/lib/db';

async function cleanupPlaceholderUsers() {
  console.log('🧹 Starting cleanup of placeholder users...');
  
  // List of placeholder user emails to remove
  const placeholderEmails = [
    'alex.johnson@astralfield.com',
    'sarah.chen@astralfield.com',
    'mike.wilson@astralfield.com',
    'emily.davis@astralfield.com',
    'ryan.martinez@astralfield.com',
    'jessica.brown@astralfield.com',
    'david.lee@astralfield.com',
    'amanda.taylor@astralfield.com',
    'chris.anderson@astralfield.com',
    'lisa.garcia@astralfield.com',
    'kevin.rodriguez@astralfield.com',
    'michelle.thompson@astralfield.com',
    'daniel.white@astralfield.com',
    'stephanie.moore@astralfield.com',
    'brandon.jackson@astralfield.com'
  ];

  try {
    // First, get all placeholder users
    const placeholderUsers = await prisma.user.findMany({
      where: {
        email: {
          in: placeholderEmails
        }
      }
    });

    console.log(`Found ${placeholderUsers.length} placeholder users to remove`);

    if (placeholderUsers.length === 0) {
      console.log('✅ No placeholder users found to remove');
      return;
    }

    // Delete related data first (due to foreign key constraints)
    console.log('🗑️ Removing user-related data...');

    // Delete team memberships
    await prisma.teamMember.deleteMany({
      where: {
        userId: {
          in: placeholderUsers.map(u => u.id)
        }
      }
    });

    // Delete messages (user field is now optional, so set to null)
    await prisma.message.updateMany({
      where: {
        userId: {
          in: placeholderUsers.map(u => u.id)
        }
      },
      data: {
        userId: null
      }
    });

    // Delete teams owned by placeholder users
    await prisma.team.deleteMany({
      where: {
        ownerId: {
          in: placeholderUsers.map(u => u.id)
        }
      }
    });

    // Delete leagues owned by placeholder users (but preserve D'Amato Dynasty League)
    await prisma.league.deleteMany({
      where: {
        ownerId: {
          in: placeholderUsers.map(u => u.id)
        },
        name: {
          not: "D'Amato Dynasty League"
        }
      }
    });

    // Finally, delete the placeholder users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          in: placeholderEmails
        }
      }
    });

    console.log(`✅ Successfully removed ${deletedUsers.count} placeholder users`);
    console.log('✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

cleanupPlaceholderUsers()
  .then(() => {
    console.log('🎉 Placeholder user cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });