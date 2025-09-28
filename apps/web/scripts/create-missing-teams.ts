import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createMissingTeams(): Promise<void> {
  try {
    console.log('🏈 CREATING MISSING TEAMS FOR ORPHANED USERS...\n')
    
    // Get the existing league
    const league = await prisma.league.findFirst()
    if (!league) {
      console.error('❌ No league found! Cannot create teams.')
      return
    }
    
    console.log(`📍 Using League: ${league.name} (${league.id})`)
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        teamName: true
      }
    })
    
    console.log(`👥 Found ${users.length} users`)
    
    // Get existing teams
    const existingTeams = await prisma.team.findMany({
      select: {
        ownerId: true,
        name: true
      }
    })
    
    console.log(`🏈 Found ${existingTeams.length} existing teams`)
    
    // Find users without teams
    const usersWithoutTeams = users.filter(user => 
      !existingTeams.some(team => team.ownerId === user.id)
    )
    
    console.log(`\n⚠️  Found ${usersWithoutTeams.length} users without teams:`)
    usersWithoutTeams.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email} (${user.teamName || 'No team name'})`)
    })
    
    if (usersWithoutTeams.length === 0) {
      console.log('✅ All users already have teams!')
      return
    }
    
    console.log(`\n🔧 Creating ${usersWithoutTeams.length} new teams...`)
    
    // Create teams for users without them
    const createdTeams = []
    
    for (const user of usersWithoutTeams) {
      const teamName = user.teamName || `${user.name || user.email.split('@')[0]}'s Team`
      
      console.log(`Creating team: ${teamName} for ${user.name || user.email}`)
      
      try {
        const newTeam = await prisma.team.create({
          data: {
            id: `team_${user.id}_${Date.now()}`, // Unique ID
            name: teamName,
            ownerId: user.id,
            leagueId: league.id,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            standing: 0,
            waiverPriority: 10,
            faabBudget: 1000,
            faabSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        createdTeams.push(newTeam)
        console.log(`✅ Created: ${newTeam.name} (${newTeam.id})`)
        
      } catch (error) {
        console.error(`❌ Failed to create team for ${user.name}: ${error}`)
      }
    }
    
    console.log(`\n🎉 SUCCESSFULLY CREATED ${createdTeams.length} NEW TEAMS!`)
    
    // Verify the results
    console.log('\n🔍 VERIFICATION - Final team count per user:')
    console.log('=' .repeat(80))
    
    const allTeamsNow = await prisma.team.findMany({
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    console.log(`📊 Total teams now: ${allTeamsNow.length}`)
    
    allTeamsNow.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`)
      console.log(`   Owner: ${team.users.name || team.users.email}`)
      console.log(`   League: ${team.leagueId}`)
      console.log('')
    })
    
    // Check if we now have all users with teams
    const usersStillWithoutTeams = users.filter(user => 
      !allTeamsNow.some(team => team.ownerId === user.id)
    )
    
    if (usersStillWithoutTeams.length === 0) {
      console.log('🎉 SUCCESS: ALL USERS NOW HAVE TEAMS!')
    } else {
      console.log(`⚠️  Still ${usersStillWithoutTeams.length} users without teams:`)
      usersStillWithoutTeams.forEach(user => {
        console.log(`   - ${user.name || user.email}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error creating teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMissingTeams().catch(console.error)