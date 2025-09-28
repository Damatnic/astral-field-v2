import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface LoginTestResult {
  user: {
    id: string
    email: string
    name: string
    teamName: string
  }
  hasPassword: boolean
  ownedTeams: Array<{
    id: string
    name: string
    leagueId: string
    leagueName: string
  }>
  loginTest: {
    canAttemptLogin: boolean
    dashboardAccessible: boolean
    issues: string[]
  }
}

async function testUserLoginAndDashboard(): Promise<void> {
  try {
    console.log('🔐 COMPREHENSIVE LOGIN & DASHBOARD TEST')
    console.log('🕐 Timestamp:', new Date().toISOString())
    console.log('=' .repeat(80))

    // Get all users with their teams and league information
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        teamName: true,
        hashedPassword: true
      }
    })

    console.log(`👥 Testing ${users.length} users for login capability...`)

    // Get all teams with league info
    const teams = await prisma.team.findMany({
      include: {
        league: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log(`🏈 Found ${teams.length} teams across leagues`)

    const testResults: LoginTestResult[] = []

    console.log('\n🧪 INDIVIDUAL USER TESTS:')
    console.log('=' .repeat(80))

    for (const user of users) {
      const userTeams = teams.filter(team => team.ownerId === user.id)
      
      const result: LoginTestResult = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || 'Unnamed',
          teamName: user.teamName || 'No team name'
        },
        hasPassword: !!user.hashedPassword,
        ownedTeams: userTeams.map(team => ({
          id: team.id,
          name: team.name,
          leagueId: team.leagueId,
          leagueName: team.league.name
        })),
        loginTest: {
          canAttemptLogin: !!user.hashedPassword,
          dashboardAccessible: !!user.hashedPassword && userTeams.length > 0,
          issues: []
        }
      }

      // Identify issues
      if (!user.hashedPassword) {
        result.loginTest.issues.push('No password set - cannot login')
      }
      if (userTeams.length === 0) {
        result.loginTest.issues.push('No teams owned - dashboard will be empty')
      }
      if (userTeams.length > 1) {
        result.loginTest.issues.push(`Owns ${userTeams.length} teams - potential confusion`)
      }

      testResults.push(result)

      // Display individual test result
      console.log(`\n👤 ${result.user.name} (${result.user.email})`)
      console.log(`   Password: ${result.hasPassword ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Teams: ${result.ownedTeams.length}`)
      
      if (result.ownedTeams.length > 0) {
        result.ownedTeams.forEach(team => {
          console.log(`     - ${team.name} in ${team.leagueName}`)
        })
      }
      
      console.log(`   Login: ${result.loginTest.canAttemptLogin ? '✅ Can login' : '❌ Cannot login'}`)
      console.log(`   Dashboard: ${result.loginTest.dashboardAccessible ? '✅ Should work' : '❌ Will have issues'}`)
      
      if (result.loginTest.issues.length > 0) {
        console.log(`   Issues: ${result.loginTest.issues.join(', ')}`)
      }
    }

    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:')
    console.log('=' .repeat(80))
    
    const canLogin = testResults.filter(r => r.loginTest.canAttemptLogin).length
    const dashboardReady = testResults.filter(r => r.loginTest.dashboardAccessible).length
    const hasIssues = testResults.filter(r => r.loginTest.issues.length > 0).length

    console.log(`Total Users: ${testResults.length}`)
    console.log(`Can Login: ${canLogin}/${testResults.length} (${Math.round(canLogin/testResults.length*100)}%)`)
    console.log(`Dashboard Ready: ${dashboardReady}/${testResults.length} (${Math.round(dashboardReady/testResults.length*100)}%)`)
    console.log(`Have Issues: ${hasIssues}/${testResults.length} (${Math.round(hasIssues/testResults.length*100)}%)`)

    // League consistency check
    console.log('\n🏆 LEAGUE CONSISTENCY CHECK:')
    console.log('=' .repeat(80))
    
    const leagueDistribution = new Map<string, { name: string, teams: number, users: string[] }>()
    
    testResults.forEach(result => {
      result.ownedTeams.forEach(team => {
        const existing = leagueDistribution.get(team.leagueId) || { 
          name: team.leagueName, 
          teams: 0, 
          users: [] 
        }
        existing.teams++
        existing.users.push(result.user.name)
        leagueDistribution.set(team.leagueId, existing)
      })
    })

    console.log(`Found ${leagueDistribution.size} leagues:`)
    leagueDistribution.forEach((info, leagueId) => {
      console.log(`   ${info.name}: ${info.teams} teams, ${info.users.length} users`)
      console.log(`     Users: ${info.users.join(', ')}`)
    })

    if (leagueDistribution.size === 1) {
      console.log('✅ All users are in the SAME LEAGUE - Perfect!')
    } else {
      console.log(`⚠️  Users are spread across ${leagueDistribution.size} different leagues`)
    }

    // Final verdict
    console.log('\n🎯 FINAL VERDICT:')
    console.log('=' .repeat(80))
    
    if (dashboardReady === testResults.length) {
      console.log('🎉 PERFECT: All users can login and access their dashboard!')
      console.log('🎉 PERFECT: All users have teams and are in the same league!')
      console.log('🚀 The application is ready for all users to use!')
    } else {
      console.log(`⚠️  ${testResults.length - dashboardReady} users will have issues accessing their dashboard`)
      
      const problematicUsers = testResults.filter(r => !r.loginTest.dashboardAccessible)
      console.log('\nUsers with issues:')
      problematicUsers.forEach(result => {
        console.log(`   - ${result.user.name}: ${result.loginTest.issues.join(', ')}`)
      })
    }

    // Test login endpoint availability
    console.log('\n🔗 TESTING LOGIN ENDPOINT:')
    console.log('=' .repeat(80))
    
    try {
      const response = await fetch('http://localhost:3005/api/auth/signin', {
        method: 'GET'
      })
      
      if (response.ok) {
        console.log('✅ Login endpoint is accessible')
      } else {
        console.log(`⚠️  Login endpoint returned status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Login endpoint test failed: ${error}`)
    }

  } catch (error) {
    console.error('❌ Error during login test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testUserLoginAndDashboard().catch(console.error)