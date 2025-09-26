import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create D'Amato Dynasty League users
  console.log('👥 Creating D\'Amato Dynasty League users...');
  const dynastyPassword = await bcrypt.hash('Dynasty2025!', 10);
  
  const dynastyUsers = [
    { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: UserRole.COMMISSIONER },
    { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: UserRole.PLAYER },
    { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: UserRole.PLAYER },
    { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: UserRole.PLAYER },
    { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: UserRole.PLAYER },
    { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: UserRole.PLAYER },
    { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: UserRole.PLAYER },
    { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: UserRole.PLAYER },
    { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: UserRole.PLAYER },
    { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: UserRole.PLAYER }
  ];

  console.log('Creating Dynasty League users with password "Dynasty2025!"...');
  
  for (const userData of dynastyUsers) {
    const user = await prisma.users.upsert({
      where: { email: userData.email },
      update: {
        hashedPassword: dynastyPassword,
        name: userData.name,
        teamName: userData.team,
        role: userData.role
      },
      create: {
        id: `user_${userData.email.split('@')[0]}`,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        teamName: userData.team,
        hashedPassword: dynastyPassword,
        isAdmin: userData.role === UserRole.COMMISSIONER,
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: true
      },
    });
    
    console.log(`✓ Created/updated user: ${userData.name} (${userData.email})`);
  }

  // Create admin user
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@astralfield.com' },
    update: {
      hashedPassword: dynastyPassword
    },
    create: {
      id: 'admin_user',
      email: 'admin@astralfield.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      teamName: 'Admin Team',
      hashedPassword: dynastyPassword,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      onboardingCompleted: true
    }
  });

  console.log('✓ Created/updated admin user');

  console.log('🎉 Database seeded successfully!');
  console.log('📧 Dynasty League user credentials: all use password "Dynasty2025!"');
  console.log(`📊 Total users created: ${dynastyUsers.length + 1}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });