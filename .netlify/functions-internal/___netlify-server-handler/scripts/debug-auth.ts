import { login, getAllUsers } from '../src/lib/auth';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugAuth() {
  console.log('🔍 Debugging authentication system...\n');
  
  try {
    // First check if password field exists
    console.log('1. Checking password field in database...');
    const userWithPassword = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        password: true
      }
    });
    
    console.log('Sample user data:', {
      id: userWithPassword?.id,
      name: userWithPassword?.name,
      email: userWithPassword?.email,
      hasPassword: !!userWithPassword?.password,
      passwordLength: userWithPassword?.password?.length
    });

    // Test raw login function
    console.log('\n2. Testing login function directly...');
    try {
      const result = await login({
        email: 'nicholas.damato@astralfield.com',
        password: 'player123!'
      });
      
      console.log('Login result:', result);
    } catch (error: any) {
      console.error('Login error:', error.message);
      console.error('Stack trace:', error.stack);
    }

    console.log('\n3. Testing password verification separately...');
    const bcrypt = require('bcryptjs');
    const testPassword = 'player123!';
    const hashedPassword = userWithPassword?.password;
    
    if (hashedPassword) {
      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      console.log('Direct bcrypt comparison:', isValid);
    } else {
      console.log('No hashed password found');
    }

  } catch (error: any) {
    console.error('Debug error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth().catch(console.error);