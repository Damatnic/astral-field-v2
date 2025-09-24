#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

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
            name: "Nicholas D'Amato",
            email: 'nicholas.damato@astralfield.com',
          },
          {
            id: 'commissioner-1',
            name: "Nicholas D'Amato",
            email: 'nicholas@astralfield.com',
          },
          {
            id: 'player-1',
            name: 'Nick Hartley',
            email: 'nick.hartley@astralfield.com',
          },
          {
            id: 'player-2',
            name: 'Jack McCaigue',
            email: 'jack.mccaigue@astralfield.com',
          },
          {
            id: 'player-3',
            name: 'Larry McCaigue',
            email: 'larry.mccaigue@astralfield.com',
          },
          {
            id: 'player-4',
            name: 'Renee McCaigue',
            email: 'renee.mccaigue@astralfield.com',
          },
          {
            id: 'player-5',
            name: 'Jon Kornbeck',
            email: 'jon.kornbeck@astralfield.com',
          },
          {
            id: 'player-6',
            name: 'David Jarvey',
            email: 'david.jarvey@astralfield.com',
          },
          {
            id: 'player-7',
            name: 'Kaity Lorbecki',
            email: 'kaity.lorbecki@astralfield.com',
          },
          {
            id: 'player-8',
            name: 'Cason Minor',
            email: 'cason.minor@astralfield.com',
          },
          {
            id: 'player-9',
            name: 'Brittany Bergum',
            email: 'brittany.bergum@astralfield.com',
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
