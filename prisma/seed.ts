#!/usr/bin/env tsx

import { prisma } from '../src/lib/db'

async function main() {
  try {
    console.log('🚀 AstralField v2.1 Basic Database Seeding')
    console.log('=========================================')

    // Test database connection
    try {
      await prisma.$connect()
      console.log('✅ Database connected successfully')
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw new Error('Database connection required for seeding')
    }

    // Basic seeding - create demo users if they don't exist
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      console.log('Creating demo users...')
      
      await prisma.user.createMany({
        data: [
          {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@astralfield.com',
            role: 'ADMIN'
          },
          {
            id: 'commissioner-1',
            name: 'Commissioner John',
            email: 'commissioner@astralfield.com',
            role: 'COMMISSIONER'
          },
          {
            id: 'player-1',
            name: 'Player Mike',
            email: 'player@astralfield.com',
            role: 'PLAYER'
          }
        ],
        skipDuplicates: true
      })
      
      console.log('✅ Demo users created')
    } else {
      console.log(`✅ Found ${userCount} existing users`)
    }

    console.log('\n🎉 Basic seeding completed successfully!')
    console.log('=======================================')
    console.log('\n💡 Next steps:')
    console.log('  1. Start the application: npm run dev')
    console.log('  2. Visit http://localhost:3000')
    console.log('  3. Login to see your application')
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
