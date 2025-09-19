import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugMatchups() {
  const matchups = await prisma.matchup.findMany({
    where: { season: 2025, week: 3 }
  });
  
  console.log('Total matchup entries:', matchups.length);
  console.log('Expected: 20 (10 teams × 2 entries each)');
  
  await prisma.$disconnect();
}

debugMatchups();