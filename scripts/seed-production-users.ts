import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAMATO_DYNASTY_MEMBERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "PLAYER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "PLAYER" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: "PLAYER" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: "PLAYER" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: "PLAYER" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: "PLAYER" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: "PLAYER" }
] as const;

const PASSWORD = 'Dynasty2025!';

async function seedProductionUsers() {
  console.log('🌱 PRODUCTION SEEDING: Creating D\'Amato Dynasty users...');
  
  try {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const results = [];

    for (const member of DAMATO_DYNASTY_MEMBERS) {
      try {
        const user = await prisma.user.upsert({
          where: { email: member.email },
          update: {
            name: member.name,
            role: member.role,
            teamName: member.teamName
          },
          create: {
            email: member.email,
            hashedPassword,
            name: member.name,
            role: member.role,
            teamName: member.teamName
          }
        });
        
        results.push({
          success: true,
          name: member.name,
          email: member.email,
          team: member.teamName,
          role: member.role
        });
        
        console.log(`✅ ${member.name} (${member.teamName}) - ${member.role}`);
        
      } catch (error: any) {
        results.push({
          success: false,
          name: member.name,
          error: error.message
        });
        console.log(`❌ ${member.name} - Error: ${error.message}`);
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successfully created: ${successful.length}/${DAMATO_DYNASTY_MEMBERS.length} users`);
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length} users`);
      failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }

    return { successful, failed, total: results.length };

  } catch (error) {
    console.error('💥 PRODUCTION SEEDING FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if called directly, not when imported
if (require.main === module) {
  seedProductionUsers()
    .then(({ successful, failed }) => {
      if (failed.length === 0) {
        console.log('\n🎉 PRODUCTION SEEDING COMPLETE: All users ready!');
        process.exit(0);
      } else {
        console.log('\n⚠️ PRODUCTION SEEDING PARTIAL: Some issues occurred');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 CRITICAL ERROR:', error);
      process.exit(1);
    });
}

export { seedProductionUsers };