import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'Dynasty2025!'

const DEMO_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "USER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "USER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "USER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "USER" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: "USER" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: "USER" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: "USER" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: "USER" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: "USER" }
]

async function main() {
  console.log('🏈 Setting up complete D\'Amato Dynasty League...\n')

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10)

  // Step 1: Check if database has the required schema
  console.log('📊 Checking database schema...')
  
  try {
    // Check if User table exists and what fields it has
    const userCount = await prisma.user.count()
    console.log(`✅ User table exists with ${userCount} users`)
    
    // Check for Team table
    try {
      const teamCount = await prisma.team.count()
      console.log(`✅ Team table exists with ${teamCount} teams`)
    } catch (e) {
      console.log('⚠️  Team table not found - will only create users')
    }

    // Check for League table
    try {
      const leagueCount = await prisma.league.count()
      console.log(`✅ League table exists with ${leagueCount} leagues`)
    } catch (e) {
      console.log('⚠️  League table not found')
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error)
    return
  }

  // Step 2: Create or update all users
  console.log('\n👥 Creating/updating users...')
  
  const createdUsers = []
  
  for (const userData of DEMO_USERS) {
    try {
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: userData.email }
      })

      if (user) {
        // Update existing user - only update safe fields
        user = await prisma.user.update({
          where: { email: userData.email },
          data: {
            name: userData.name,
            teamName: userData.teamName,
            role: userData.role as any,
            password: hashedPassword, // Use 'password' field if available
          }
        })
        console.log(`✅ Updated: ${user.name} (${user.email})`)
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            teamName: userData.teamName,
            role: userData.role as any,
            password: hashedPassword,
          }
        })
        console.log(`✨ Created: ${user.name} (${user.email})`)
      }
      
      createdUsers.push(user)
    } catch (error) {
      console.error(`❌ Error with ${userData.email}:`, error instanceof Error ? error.message : String(error))
    }
  }

  console.log(`\n✅ Successfully set up ${createdUsers.length}/${DEMO_USERS.length} users!`)

  // Step 3: Check if we can create a league
  try {
    console.log('\n🏆 Checking league setup...')
    
    const existingLeagues = await prisma.league.findMany({
      where: {
        name: { contains: "D'Amato Dynasty" }
      }
    })

    if (existingLeagues.length > 0) {
      console.log(`✅ Found ${existingLeagues.length} D'Amato Dynasty league(s)`)
      existingLeagues.forEach(league => {
        console.log(`   - ${league.name} (ID: ${league.id})`)
      })
    } else {
      console.log('⚠️  No D\'Amato Dynasty league found')
      console.log('   Note: You may need to create the league through the UI')
    }
  } catch (error) {
    console.log('⚠️  Could not check leagues - this is optional')
  }

  // Step 4: Summary
  console.log('\n' + '='.repeat(60))
  console.log('🎉 SETUP COMPLETE!')
  console.log('='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   • ${createdUsers.length} users ready`)
  console.log(`   • Password for all accounts: ${DEMO_PASSWORD}`)
  console.log(`\n🔐 Login Credentials:`)
  createdUsers.forEach(user => {
    console.log(`   • ${user.email} → ${DEMO_PASSWORD}`)
  })
  console.log('\n🎮 Access the app at: http://localhost:9000')
  console.log('   • Click "Quick Select" to choose your player')
  console.log('   • Or sign in manually with any email above')
  console.log('\n')
}

main()
  .catch((e) => {
    console.error('💥 Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

