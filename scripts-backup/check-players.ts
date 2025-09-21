#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

async function checkPlayers() {
  const prisma = new PrismaClient();
  
  try {
    const playerCount = await prisma.player.count();
    console.log(`✅ Players in database: ${playerCount}`);
    
    // Get some sample players
    const samplePlayers = await prisma.player.findMany({
      take: 5,
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 Sample players:');
    samplePlayers.forEach(player => {
      console.log(`   ${player.name} (${player.position}) - ${player.nflTeam}`);
    });
    
  } catch (error) {
    console.error('Error checking players:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayers();