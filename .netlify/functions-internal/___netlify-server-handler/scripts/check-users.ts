import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  });
  console.log(`Found ${users.length} users in database:`);
  users.forEach((u, i) => console.log(`${i+1}. ${u.name} (${u.email})`));
  await prisma.$disconnect();
}

checkUsers().catch(console.error);