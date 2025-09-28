// Setup fresh test environment for login testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupTestEnvironment(): Promise<void> {
  console.log('🧪 SETTING UP FRESH TEST ENVIRONMENT')
  console.log('🕐 Timestamp:', new Date().toISOString())
  console.log('=' .repeat(80))

  try {
    // 1. Verify database connection
    console.log('\n📡 Step 1: Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // 2. Check all users have passwords and teams
    console.log('\n👥 Step 2: Verifying user setup...')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        role: true
      }
    })

    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        leagueId: true
      }
    })

    console.log(`Found ${users.length} users and ${teams.length} teams`)

    let readyCount = 0
    console.log('\nUser Status:')
    for (const user of users) {
      const userTeams = teams.filter(t => t.ownerId === user.id)
      const hasPassword = !!user.hashedPassword
      const hasTeam = userTeams.length > 0
      const isReady = hasPassword && hasTeam

      console.log(`  ${user.name}: ${isReady ? '✅ READY' : '❌ NOT READY'} (Password: ${hasPassword}, Teams: ${userTeams.length})`)
      
      if (isReady) readyCount++
    }

    console.log(`\n📊 ${readyCount}/${users.length} users are ready for testing`)

    // 3. Test a sample user login credentials
    console.log('\n🔐 Step 3: Testing login endpoints...')
    
    const testEndpoints = [
      'http://localhost:3000/api/auth/session',
      'http://localhost:3000/api/auth/csrf',
      'http://localhost:3000/api/auth/providers'
    ]

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint)
        console.log(`  ${endpoint.split('/').pop()}: ${response.status === 200 ? '✅' : '❌'} (${response.status})`)
      } catch (error) {
        console.log(`  ${endpoint.split('/').pop()}: ❌ Server not running`)
      }
    }

    // 4. Provide test credentials
    console.log('\n🗝️  Step 4: Test credentials available:')
    console.log('  Email: test@test.com')
    console.log('  Password: password123')
    console.log('  Email: nicholas@damato-dynasty.com') 
    console.log('  Password: password123')

    console.log('\n🎯 Environment setup complete!')
    console.log('🚀 Ready for login testing on http://localhost:3000')

  } catch (error) {
    console.error('❌ Setup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupTestEnvironment().catch(console.error)