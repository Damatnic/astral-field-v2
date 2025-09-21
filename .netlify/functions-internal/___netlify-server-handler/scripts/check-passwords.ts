import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const prisma = new PrismaClient();

async function checkPasswordHashes() {
  console.log('🔍 Checking user password hashes...\n');
  
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      password: true
    }
  });
  
  users.forEach(user => {
    console.log(`User: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Password hash: ${user.password ? 'EXISTS' : 'NULL'}`);
    console.log(`Length: ${user.password?.length || 0} characters`);
    console.log('---');
  });
  
  await prisma.$disconnect();
}

checkPasswordHashes().catch(console.error);