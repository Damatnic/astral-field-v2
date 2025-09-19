import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const prisma = new PrismaClient();

async function checkPositions() {
  const counts = await prisma.player.groupBy({
    by: ['position'],
    _count: { position: true }
  });
  console.log('Player counts by position:');
  counts.forEach(c => console.log(c.position, ':', c._count.position));
  await prisma.$disconnect();
}

checkPositions().catch(console.error);