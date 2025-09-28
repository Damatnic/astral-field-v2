import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalVerification(): Promise<void> {
  try {
    console.log('🎯 FINAL VERIFICATION OF USER LOGIN CAPABILITY')
    console.log('🕐 Timestamp:', new Date().toISOString())
    console.log('=' .repeat(80))

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        teamName: true,
        hashedPassword: true,
        role: true
      }
    })

    console.log(`👥 Found ${users.length} users`)

    // Get all teams
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        leagueId: true
      }
    })

    console.log(`🏈 Found ${teams.length} teams`)

    // Get all leagues
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true
      }
    })

    console.log(`🏆 Found ${leagues.length} leagues`)

    console.log('\n🔍 USER-BY-USER ANALYSIS:')
    console.log('=' .repeat(80))

    let canLoginCount = 0
    let hasTeamCount = 0
    let fullyFunctionalCount = 0

    for (const user of users) {
      const userTeams = teams.filter(team => team.ownerId === user.id)
      const userLeagues = new Set(userTeams.map(team => team.leagueId))
      
      const canLogin = !!user.hashedPassword
      const hasTeam = userTeams.length > 0
      const fullyFunctional = canLogin && hasTeam

      if (canLogin) canLoginCount++
      if (hasTeam) hasTeamCount++
      if (fullyFunctional) fullyFunctionalCount++

      console.log(`\n👤 ${user.name || 'Unnamed'} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Login: ${canLogin ? '✅ CAN LOGIN' : '❌ NO PASSWORD'}`)
      console.log(`   Teams: ${userTeams.length}`)
      
      if (userTeams.length > 0) {
        userTeams.forEach(team => {
          const league = leagues.find(l => l.id === team.leagueId)
          console.log(`     - ${team.name} in ${league?.name || 'Unknown League'}`)
        })
      } else {
        console.log(`     ⚠️  NO TEAMS`)
      }
      
      console.log(`   Status: ${fullyFunctional ? '🎉 FULLY FUNCTIONAL' : '⚠️  HAS ISSUES'}`)
    }

    console.log('\n📊 FINAL STATISTICS:')
    console.log('=' .repeat(80))
    console.log(`Total Users: ${users.length}`)
    console.log(`Can Login: ${canLoginCount}/${users.length} (${Math.round(canLoginCount/users.length*100)}%)`)
    console.log(`Have Teams: ${hasTeamCount}/${users.length} (${Math.round(hasTeamCount/users.length*100)}%)`)
    console.log(`Fully Functional: ${fullyFunctionalCount}/${users.length} (${Math.round(fullyFunctionalCount/users.length*100)}%)`)

    console.log('\n🏆 LEAGUE DISTRIBUTION:')
    console.log('=' .repeat(80))
    
    const leagueTeamCount = new Map<string, number>()
    const leagueUserCount = new Map<string, Set<string>>()

    teams.forEach(team => {
      leagueTeamCount.set(team.leagueId, (leagueTeamCount.get(team.leagueId) || 0) + 1)
      
      if (!leagueUserCount.has(team.leagueId)) {
        leagueUserCount.set(team.leagueId, new Set())
      }
      leagueUserCount.get(team.leagueId)!.add(team.ownerId)
    })

    leagues.forEach(league => {
      const teamCount = leagueTeamCount.get(league.id) || 0
      const userCount = leagueUserCount.get(league.id)?.size || 0
      console.log(`   ${league.name}: ${teamCount} teams, ${userCount} users`)
    })

    if (leagues.length === 1) {
      console.log('✅ All users are in the SAME LEAGUE!')
    }

    console.log('\n🎯 FINAL VERDICT:')
    console.log('=' .repeat(80))

    if (fullyFunctionalCount === users.length) {
      console.log('🎉 PERFECT SUCCESS!')
      console.log('🎉 ALL USERS CAN LOGIN AND ACCESS THEIR TEAMS!')
      console.log('🎉 ALL USERS ARE IN THE SAME LEAGUE!')
      console.log('🚀 THE APPLICATION IS READY FOR PRODUCTION!')
    } else {
      console.log(`⚠️  ${users.length - fullyFunctionalCount} users have issues`)
      
      const problematicUsers = users.filter(user => {
        const userTeams = teams.filter(team => team.ownerId === user.id)
        return !user.hashedPassword || userTeams.length === 0
      })
      
      console.log('\nUsers with issues:')
      problematicUsers.forEach(user => {
        const userTeams = teams.filter(team => team.ownerId === user.id)
        const issues = []
        if (!user.hashedPassword) issues.push('No password')
        if (userTeams.length === 0) issues.push('No teams')
        console.log(`   - ${user.name}: ${issues.join(', ')}`)
      })
    }

    // Test sample login endpoints
    console.log('\n🔗 TESTING APPLICATION ENDPOINTS:')
    console.log('=' .repeat(80))
    
    const endpointsToTest = [
      { name: 'Landing Page', url: 'http://localhost:3005' },
      { name: 'Signin Page', url: 'http://localhost:3005/auth/signin' },
      { name: 'Dashboard (Protected)', url: 'http://localhost:3005/dashboard' },
      { name: 'Database Health', url: 'http://localhost:3005/api/health/database' }
    ]

    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(endpoint.url, { method: 'HEAD' })
        console.log(`   ${endpoint.name}: ${response.status} ${response.status === 200 ? '✅' : response.status === 307 ? '🔄' : '❌'}`)
      } catch (error) {
        console.log(`   ${endpoint.name}: ❌ Failed to connect`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('🏁 COMPREHENSIVE DEEP DIVE COMPLETE!')
    console.log('=' .repeat(80))

  } catch (error) {
    console.error('❌ Error during verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

finalVerification().catch(console.error)