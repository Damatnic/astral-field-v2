#!/usr/bin/env tsx

/**
 * ESPN Player Sync Script
 * Syncs all NFL players from ESPN API to the database
 */

import { DataSyncService } from '../src/lib/services/data-sync';

async function syncPlayers() {
  console.log('🏈 ESPN Player Sync Starting...');
  console.log('===============================\n');

  try {
    const syncService = new DataSyncService();
    
    console.log('📥 Syncing all NFL players from ESPN...');
    await syncService.syncAllPlayers();
    
    console.log('\n🎉 Player sync completed successfully!');
    console.log('✨ Your database now has up-to-date NFL player data from ESPN');
    
  } catch (error) {
    console.error('❌ Player sync failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  syncPlayers().catch(console.error);
}