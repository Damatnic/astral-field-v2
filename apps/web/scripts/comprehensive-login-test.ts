import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface UserAnalysis {
  id: string
  email: string
  name: string
  hasPassword: boolean
  teamCount: number
  teams: Array<{
    id: string
    name: string
    leagueId: string
    leagueName: string
    isOwner: boolean
  }>
  leagueIds: string[]
  uniqueLeagues: number
}

async function analyzeUserDatabase(): Promise<UserAnalysis[]> {
  console.log('🔍 COMPREHENSIVE USER ANALYSIS STARTING...\n')
  
  // Get all users with their relationships
  const users = await prisma.user.findMany({
    include: {
      teams: {
        include: {
          league: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  console.log(`📊 FOUND ${users.length} TOTAL USERS`)
  console.log('=' .repeat(80))

  const analysis: UserAnalysis[] = []

  for (const user of users) {
    // Get all teams owned by this user
    const allTeams = user.teams.map(team => ({
      id: team.id,
      name: team.name,
      leagueId: team.leagueId,
      leagueName: team.league.name,
      isOwner: team.ownerId === user.id
    }))

    // Get unique leagues
    const leagueIds = [...new Set(allTeams.map(team => team.leagueId))]

    const userAnalysis: UserAnalysis = {
      id: user.id,
      email: user.email,
      name: user.name || 'Unknown',
      hasPassword: !!user.hashedPassword,
      teamCount: allTeams.length,
      teams: allTeams,
      leagueIds,
      uniqueLeagues: leagueIds.length
    }

    analysis.push(userAnalysis)

    // Display user info
    console.log(`👤 USER: ${user.name || 'Unnamed'} (${user.email})`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Password: ${userAnalysis.hasPassword ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Teams: ${userAnalysis.teamCount}`)
    console.log(`   Leagues: ${userAnalysis.uniqueLeagues}`)
    
    if (allTeams.length > 0) {
      console.log('   Team Details:')
      allTeams.forEach(team => {
        console.log(`     - ${team.name} (${team.isOwner ? 'Owner' : 'Member'}) in ${team.leagueName}`)
      })
    } else {
      console.log('   ⚠️  NO TEAMS ASSIGNED')
    }
    console.log('')
  }

  return analysis
}

async function checkLeagueConsistency(analysis: UserAnalysis[]): Promise<void> {
  console.log('🏆 LEAGUE CONSISTENCY CHECK')
  console.log('=' .repeat(80))

  // Get all unique leagues from users
  const allLeagueIds = [...new Set(analysis.flatMap(user => user.leagueIds))]
  console.log(`Found ${allLeagueIds.length} unique leagues across all users`)

  if (allLeagueIds.length === 0) {
    console.log('❌ NO LEAGUES FOUND - ALL USERS ARE ORPHANED')
    return
  }

  if (allLeagueIds.length === 1) {
    console.log(`✅ ALL USERS ARE IN THE SAME LEAGUE: ${allLeagueIds[0]}`)
  } else {
    console.log(`⚠️  USERS ARE SPREAD ACROSS ${allLeagueIds.length} DIFFERENT LEAGUES`)
    
    for (const leagueId of allLeagueIds) {
      const usersInLeague = analysis.filter(user => user.leagueIds.includes(leagueId))
      console.log(`   League ${leagueId}: ${usersInLeague.length} users`)
    }
  }

  // Get detailed league information
  const leagues = await prisma.league.findMany({
    where: {
      id: {
        in: allLeagueIds
      }
    },
    include: {
      teams: {
        include: {
          owner: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  })

  console.log('\n📋 LEAGUE DETAILS:')
  for (const league of leagues) {
    console.log(`\n🏆 ${league.name} (ID: ${league.id})`)
    console.log(`   Teams: ${league.teams.length}`)
    console.log(`   Status: ${league.status}`)
    console.log(`   Current Week: ${league.currentWeek}`)
    
    if (league.teams.length > 0) {
      console.log('   Team List:')
      league.teams.forEach(team => {
        console.log(`     - ${team.name} (Owner: ${team.owner.name || team.owner.email})`)
      })
    }
  }
}

async function testLoginCapabilities(analysis: UserAnalysis[]): Promise<void> {
  console.log('\n🔐 LOGIN CAPABILITY TEST')
  console.log('=' .repeat(80))

  const usersWithPasswords = analysis.filter(user => user.hasPassword)
  const usersWithoutPasswords = analysis.filter(user => !user.hasPassword)

  console.log(`✅ Users who CAN login: ${usersWithPasswords.length}`)
  console.log(`❌ Users who CANNOT login: ${usersWithoutPasswords.length}`)

  if (usersWithoutPasswords.length > 0) {
    console.log('\n⚠️  USERS WITHOUT PASSWORDS (cannot login):')
    usersWithoutPasswords.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`)
    })
  }

  if (usersWithPasswords.length > 0) {
    console.log('\n✅ USERS WITH LOGIN CAPABILITY:')
    usersWithPasswords.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.teamCount} teams`)
    })
  }
}

async function identifyProblems(analysis: UserAnalysis[]): Promise<string[]> {
  const problems: string[] = []

  // Check for users without passwords
  const usersWithoutPasswords = analysis.filter(user => !user.hasPassword)
  if (usersWithoutPasswords.length > 0) {
    problems.push(`${usersWithoutPasswords.length} users cannot login (no password)`)
  }

  // Check for users without teams
  const usersWithoutTeams = analysis.filter(user => user.teamCount === 0)
  if (usersWithoutTeams.length > 0) {
    problems.push(`${usersWithoutTeams.length} users have no teams assigned`)
  }

  // Check for league consistency
  const allLeagueIds = [...new Set(analysis.flatMap(user => user.leagueIds))]
  if (allLeagueIds.length > 1) {
    problems.push(`Users are spread across ${allLeagueIds.length} different leagues`)
  }
  if (allLeagueIds.length === 0) {
    problems.push('No leagues found - all users are orphaned')
  }

  return problems
}

async function generateRecommendations(problems: string[]): Promise<void> {
  if (problems.length === 0) {
    console.log('\n🎉 NO PROBLEMS FOUND - ALL USERS CAN LOGIN AND ACCESS THEIR TEAMS!')
    return
  }

  console.log('\n🔧 PROBLEMS IDENTIFIED:')
  console.log('=' .repeat(80))
  problems.forEach((problem, index) => {
    console.log(`${index + 1}. ${problem}`)
  })

  console.log('\n💡 RECOMMENDED FIXES:')
  console.log('=' .repeat(80))
  
  if (problems.some(p => p.includes('cannot login'))) {
    console.log('1. Create passwords for users without them:')
    console.log('   - Use registration API to set passwords')
    console.log('   - Or update hashedPassword directly in database')
  }
  
  if (problems.some(p => p.includes('no teams'))) {
    console.log('2. Assign teams to users without them:')
    console.log('   - Create teams for orphaned users')
    console.log('   - Or assign them to existing teams')
  }
  
  if (problems.some(p => p.includes('different leagues'))) {
    console.log('3. Consolidate users into single league:')
    console.log('   - Move all teams to primary league')
    console.log('   - Or create new league for all users')
  }
}

async function main(): Promise<void> {
  try {
    console.log('🚀 STARTING COMPREHENSIVE USER LOGIN ANALYSIS')
    console.log('🕐 Timestamp:', new Date().toISOString())
    console.log('=' .repeat(80))

    // Step 1: Analyze all users
    const analysis = await analyzeUserDatabase()

    // Step 2: Check league consistency
    await checkLeagueConsistency(analysis)

    // Step 3: Test login capabilities
    await testLoginCapabilities(analysis)

    // Step 4: Identify problems
    const problems = await identifyProblems(analysis)

    // Step 5: Generate recommendations
    await generateRecommendations(problems)

    console.log('\n📊 SUMMARY STATISTICS:')
    console.log('=' .repeat(80))
    console.log(`Total Users: ${analysis.length}`)
    console.log(`Users with Passwords: ${analysis.filter(u => u.hasPassword).length}`)
    console.log(`Users with Teams: ${analysis.filter(u => u.teamCount > 0).length}`)
    console.log(`Users in Leagues: ${analysis.filter(u => u.uniqueLeagues > 0).length}`)
    console.log(`Total Problems: ${problems.length}`)

  } catch (error) {
    console.error('❌ Error during analysis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)