import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const prisma = new PrismaClient();

async function checkLeagues() {
  const leagues = await prisma.league.findMany();
  console.log('Leagues in database:');
  leagues.forEach(l => console.log('-', l.name, '(ID:', l.id + ')'));
  await prisma.$disconnect();
}

checkLeagues().catch(console.error);