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
];

async function createSimpleUsers() {
  console.log('🏈 Creating D\'Amato Dynasty League Users...\n');
  
  try {
    const hashedPassword = await bcrypt.hash('Dynasty2025!', 10);
    
    for (const member of DAMATO_DYNASTY_MEMBERS) {
      console.log(`Creating ${member.name}...`);
      
      // Use upsert to handle existing users gracefully
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
      
      console.log(`  ✅ Ready: ${member.email}`);
    }
    
    console.log('\n🎉 All users created successfully!');
    console.log('\nUsers can now sign in with:');
    console.log('  Email: [member email]@damato-dynasty.com');
    console.log('  Password: Dynasty2025!');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSimpleUsers().catch(console.error);