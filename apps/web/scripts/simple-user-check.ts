import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function simpleUserCheck(): Promise<void> {
  try {
    console.log('🔍 SIMPLE USER CHECK STARTING...\n')
    
    // Get basic user count
    const userCount = await prisma.user.count()
    console.log(`📊 Total Users: ${userCount}`)
    
    // Get users with basic info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        role: true,
        teamName: true
      }
    })
    
    console.log('\n👥 USER LIST:')
    console.log('=' .repeat(80))
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Unnamed'} (${user.email})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Password: ${user.hashedPassword ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Team Name: ${user.teamName || 'None'}`)
      console.log('')
    })
    
    // Get team count
    const teamCount = await prisma.team.count()
    console.log(`🏈 Total Teams: ${teamCount}`)
    
    // Get basic team info
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        leagueId: true
      }
    })
    
    console.log('\n🏈 TEAM LIST:')
    console.log('=' .repeat(80))
    
    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`)
      console.log(`   ID: ${team.id}`)
      console.log(`   Owner: ${team.ownerId}`)
      console.log(`   League: ${team.leagueId}`)
      console.log('')
    })
    
    // Get league count
    const leagueCount = await prisma.league.count()
    console.log(`🏆 Total Leagues: ${leagueCount}`)
    
    // Get basic league info
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        currentWeek: true
      }
    })
    
    console.log('\n🏆 LEAGUE LIST:')
    console.log('=' .repeat(80))
    
    leagues.forEach((league, index) => {
      console.log(`${index + 1}. ${league.name}`)
      console.log(`   ID: ${league.id}`)
      console.log(`   Status: ${league.status}`)
      console.log(`   Current Week: ${league.currentWeek}`)
      console.log('')
    })
    
    // Check relationships
    console.log('\n🔗 RELATIONSHIP ANALYSIS:')
    console.log('=' .repeat(80))
    
    // Check which users own which teams
    for (const user of users) {
      const ownedTeams = teams.filter(team => team.ownerId === user.id)
      console.log(`👤 ${user.name || user.email} owns ${ownedTeams.length} teams:`)
      if (ownedTeams.length > 0) {
        ownedTeams.forEach(team => {
          console.log(`   - ${team.name} (League: ${team.leagueId})`)
        })
      } else {
        console.log('   ⚠️  NO TEAMS OWNED')
      }
      console.log('')
    }
    
    // Check league distribution
    const leagueDistribution = new Map<string, number>()
    teams.forEach(team => {
      const count = leagueDistribution.get(team.leagueId) || 0
      leagueDistribution.set(team.leagueId, count + 1)
    })
    
    console.log('📊 TEAMS PER LEAGUE:')
    leagueDistribution.forEach((count, leagueId) => {
      const league = leagues.find(l => l.id === leagueId)
      console.log(`   ${league?.name || leagueId}: ${count} teams`)
    })
    
  } catch (error) {
    console.error('❌ Error during check:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleUserCheck().catch(console.error)