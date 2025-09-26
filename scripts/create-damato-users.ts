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

async function createDamatoUsers() {
  console.log('🏈 Creating D\'Amato Dynasty League Users...\n');
  
  try {
    const hashedPassword = await bcrypt.hash('Dynasty2025!', 10);
    
    for (const member of DAMATO_DYNASTY_MEMBERS) {
      console.log(`Creating ${member.name}...`);
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: member.email }
      });
      
      if (existingUser) {
        console.log(`  ✅ User already exists: ${member.email}`);
        continue;
      }
      
      // Create user
      await prisma.user.create({
        data: {
          email: member.email,
          hashedPassword,
          name: member.name,
          role: member.role,
          teamName: member.teamName
        }
      });
      
      console.log(`  ✅ Created: ${member.email} - Password: Dynasty2025!`);
    }
    
    console.log('\n🎉 All users created successfully!');
    console.log('\nYou can now use the quick signin buttons with password: Dynasty2025!');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDamatoUsers().catch(console.error);