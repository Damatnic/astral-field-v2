/**
 * Vortex Analytics Data Seeding Script
 * Populates the database with comprehensive fantasy football analytics data
 */

import { PrismaClient } from '@prisma/client';
import { seedVortexData } from '../apps/web/src/lib/analytics/data-seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Vortex Analytics data seeding...');
  
  try {
    // Seed comprehensive analytics data
    await seedVortexData();
    
    console.log('✅ Vortex Analytics data seeding completed successfully!');
    console.log('📊 Analytics dashboard is now ready with weeks 1-3 data');
    console.log('🔗 Visit /analytics/vortex to view the dashboard');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();