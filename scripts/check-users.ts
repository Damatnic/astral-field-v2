import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('🔍 Checking D\'Amato Dynasty League Users...\n');
  
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: '@damato-dynasty.com'
        }
      },
      select: {
        email: true,
        name: true,
        role: true,
        teamName: true
      }
    });
    
    console.log(`Found ${users.length} D'Amato Dynasty League users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Team: ${user.teamName}`);
      console.log(`   Role: ${user.role}\n`);
    });
    
    if (users.length === 10) {
      console.log('✅ All 10 league members are in the database!');
    } else {
      console.log(`⚠️  Only ${users.length} out of 10 members found.`);
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers().catch(console.error);
