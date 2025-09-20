#!/usr/bin/env tsx

/**
 * Complete Data Sync Script
 * Imports all NFL players, stats, projections, and league data
 */

import { comprehensiveSyncService } from '../src/services/sleeper/comprehensive-sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// D'Amato Dynasty League ID (you'll need to get the real one from Sleeper)
// For now, using a placeholder
const SLEEPER_LEAGUE_ID = '1049897825665253376'; // Example ID

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('    ASTRAL FIELD - COMPLETE DATA SYNC      ');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    // Step 1: Import all NFL players
    console.log('📥 Step 1: Importing NFL Players...');
    const playerCount = await comprehensiveSyncService.syncAllPlayers();
    console.log(`   ✓ ${playerCount} players processed\n`);
    
    // Step 2: Import current week stats
    console.log('📊 Step 2: Importing Current Week Stats...');
    await comprehensiveSyncService.syncWeekStats();
    console.log('   ✓ Stats imported\n');
    
    // Step 3: Import projections
    console.log('🔮 Step 3: Importing Player Projections...');
    await comprehensiveSyncService.syncProjections();
    console.log('   ✓ Projections imported\n');
    
    // Step 4: Sync league data if available
    console.log('🏆 Step 4: Syncing League Data...');
    try {
      await comprehensiveSyncService.syncLeague(SLEEPER_LEAGUE_ID);
      await comprehensiveSyncService.syncMatchups(SLEEPER_LEAGUE_ID);
      console.log('   ✓ League data synced\n');
    } catch (error) {
      console.log('   ⚠ League sync skipped (league ID may need updating)\n');
    }
    
    // Step 5: Verify data
    console.log('✅ Step 5: Verifying Data...');
    const players = await prisma.player.count();
    const stats = await prisma.playerStats.count();
    const projections = await prisma.playerProjection.count();
    const teams = await prisma.team.count();
    const users = await prisma.user.count();
    
    console.log(`   Players: ${players}`);
    console.log(`   Stats Records: ${stats}`);
    console.log(`   Projections: ${projections}`);
    console.log(`   Teams: ${teams}`);
    console.log(`   Users: ${users}`);
    
    console.log('\n═══════════════════════════════════════════');
    console.log('     ✅ DATA SYNC COMPLETED SUCCESSFULLY    ');
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
main().catch(console.error);