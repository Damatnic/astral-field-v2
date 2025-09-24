#!/usr/bin/env tsx

/**
 * Waiver Scheduler Initialization Script
 * 
 * This script initializes the automated waiver processing scheduler.
 * Run this after deployment to ensure waiver automation is active.
 */

import { waiverScheduler } from '../src/lib/cron/waiver-scheduler';

async function initializeWaiverScheduler() {
  console.log('🚀 Initializing waiver scheduler...');
  
  try {
    // Initialize the scheduler
    await waiverScheduler.initialize();
    
    // Get status
    const activeJobs = waiverScheduler.getActiveJobs();
    
    console.log(`✅ Waiver scheduler initialized successfully!`);
    console.log(`📊 Active automation jobs: ${activeJobs.length}`);
    
    if (activeJobs.length > 0) {
      console.log('\n📋 Active waiver automation schedules:');
      activeJobs.forEach((job, index) => {
        console.log(`  ${index + 1}. League: ${job.leagueId}`);
        console.log(`     Schedule: ${job.cronPattern} (${job.timezone})`);
        console.log(`     Status: ${job.isRunning ? '🟢 Running' : '🔴 Stopped'}`);
      });
    } else {
      console.log('ℹ️  No leagues have waiver automation enabled');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize waiver scheduler:', error);
    process.exit(1);
  }
}

// Auto-run if called directly
if (require.main === module) {
  initializeWaiverScheduler()
    .then(() => {
      console.log('\n🎉 Waiver scheduler initialization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}