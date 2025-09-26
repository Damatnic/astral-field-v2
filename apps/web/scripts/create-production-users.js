const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
];

async function createProductionUsers() {
  console.log('🏈 Creating D\'Amato Dynasty League Users for Production...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL found, skipping user creation');
    return;
  }
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    const hashedPassword = await bcrypt.hash('Dynasty2025!', 10);
    
    for (const member of DAMATO_DYNASTY_MEMBERS) {
      console.log(`Creating ${member.name}...`);
      
      try {
        // Use upsert to handle existing users gracefully
        await prisma.user.upsert({
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
        
        console.log(`  ✅ Ready: ${member.email}`);
      } catch (userError) {
        console.log(`  ⚠️  Issue with ${member.email}:`, userError.message);
      }
    }
    
    console.log('\n🎉 User setup completed!');
    console.log('Password for all accounts: Dynasty2025!');
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    // Don't fail the build, just log the error
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if called directly, not when required
if (require.main === module) {
  createProductionUsers().catch(error => {
    console.error('Script failed:', error);
    process.exit(0); // Don't fail the build
  });
}

module.exports = { createProductionUsers };