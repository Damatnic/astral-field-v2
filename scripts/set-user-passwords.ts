import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setUserPasswords() {
  try {
    console.log('🔐 Setting passwords for all users...');
    
    // Hash the default password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Update all users with the hashed password
    const result = await prisma.user.updateMany({
      where: {
        hashedPassword: null
      },
      data: {
        hashedPassword: hashedPassword
      }
    });
    
    console.log(`✅ Updated ${result.count} users with passwords`);
    
    // Verify the update
    const users = await prisma.user.findMany({
      select: {
        email: true,
        hashedPassword: true
      }
    });
    
    console.log('\n📊 User password status:');
    for (const user of users) {
      console.log(`  ${user.email}: ${user.hashedPassword ? '✓ Has password' : '✗ No password'}`);
    }
    
    console.log('\n✨ All users can now login with password: password123');
    
  } catch (error) {
    console.error('❌ Error setting user passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setUserPasswords();