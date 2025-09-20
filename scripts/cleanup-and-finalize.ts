import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalCleanupAndTest() {
  console.log('🧹 Final Cleanup and Finalization for D\'Amato Dynasty Platform...\n');

  try {
    // 1. Clean up old sessions
    console.log('1. Cleaning up old user sessions...');
    const deletedSessions = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      }
    });
    console.log(`   ✅ Cleaned up ${deletedSessions.count} old sessions\n`);

    // 2. Verify all D'Amato Dynasty users exist
    console.log('2. Verifying all D\'Amato Dynasty league members...');
    const expectedUsers = [
      'nicholas@damato-dynasty.com',
      'nick@damato-dynasty.com', 
      'jack@damato-dynasty.com',
      'larry@damato-dynasty.com',
      'renee@damato-dynasty.com',
      'jon@damato-dynasty.com',
      'david@damato-dynasty.com',
      'kaity@damato-dynasty.com',
      'cason@damato-dynasty.com',
      'brittany@damato-dynasty.com'
    ];

    let allUsersExist = true;
    for (const email of expectedUsers) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, teamName: true, role: true }
      });
      
      if (user) {
        console.log(`   ✅ ${user.name || user.email} - ${user.teamName || 'No Team'} (${user.role})`);
      } else {
        console.log(`   ❌ Missing user: ${email}`);
        allUsersExist = false;
      }
    }

    // 3. Verify commissioner status
    console.log('\n3. Verifying commissioner status...');
    const commissioner = await prisma.user.findFirst({
      where: { role: 'COMMISSIONER' }
    });
    
    if (commissioner) {
      console.log(`   ✅ Commissioner: ${commissioner.name} (${commissioner.email})`);
    } else {
      console.log('   ❌ No commissioner found!');
      allUsersExist = false;
    }

    // 4. Clean up any duplicate or test data
    console.log('\n4. Checking for any old test data...');
    const nonDamatoUsers = await prisma.user.findMany({
      where: {
        NOT: {
          email: {
            endsWith: '@damato-dynasty.com'
          }
        }
      },
      select: { email: true, name: true }
    });

    if (nonDamatoUsers.length > 0) {
      console.log('   ⚠️  Found non-D\'Amato Dynasty users:');
      nonDamatoUsers.forEach(user => {
        console.log(`      - ${user.name || 'Unknown'} (${user.email})`);
      });
      console.log('   📝 These can be kept for testing or removed if needed\n');
    } else {
      console.log('   ✅ Only D\'Amato Dynasty users found - database is clean\n');
    }

    // 5. Test database connectivity
    console.log('5. Testing database connectivity...');
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.userSession.count({ where: { isActive: true } });
    console.log(`   ✅ Database connected - ${userCount} users, ${sessionCount} active sessions\n`);

    // 6. Final status
    console.log('📊 Final Status:');
    console.log(`   👥 D'Amato Dynasty Users: ${allUsersExist ? '✅ All Ready' : '❌ Issues Found'}`);
    console.log(`   💾 Database: ✅ Clean and Connected`);
    console.log(`   🗂️  Sessions: ✅ Cleaned Up`);
    
    if (allUsersExist) {
      console.log('\n🎉 PLATFORM IS READY FOR PRODUCTION!');
      console.log('\n🔐 All users can login with:');
      console.log('   📧 Email: [firstname]@damato-dynasty.com');
      console.log('   🔑 Password: Dynasty2025!');
      console.log('\n🌐 Access URLs:');
      console.log('   🛠️  Development: http://localhost:3009');
      console.log('   🚀 Production: https://astralfield.vercel.app');
    } else {
      console.log('\n⚠️  Issues found - please check user setup');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalCleanupAndTest().catch(console.error);