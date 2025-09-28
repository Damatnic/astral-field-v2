import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTeamsSimple(): Promise<void> {
  try {
    console.log('🏈 CREATING TEAMS WITH MINIMAL FIELDS...\n')
    
    // Get the existing league
    const league = await prisma.league.findFirst()
    if (!league) {
      console.error('❌ No league found!')
      return
    }
    
    console.log(`📍 Using League: ${league.name} (${league.id})`)
    
    // Get users who need teams (excluding the one who already has a team)
    const usersNeedingTeams = [
      { id: 'cmg2fbpia000058b28wxmshv3', name: 'Test User', teamName: "Test User's Team" },
      { id: 'cmg2fcd4e000110xngzz3sg7b', name: 'Nick Hartley', teamName: "Hartley's Heroes" },
      { id: 'cmg2fcd5h000210xn8n4kunhf', name: 'Jack McCaigue', teamName: "McCaigue Mayhem" },
      { id: 'cmg2fcd6l000310xnr5ld296d', name: 'Larry McCaigue', teamName: "Larry Legends" },
      { id: 'cmg2fcd7r000410xn7n16mryo', name: 'Renee McCaigue', teamName: "Renee's Reign" },
      { id: 'cmg2fcd8x000510xn79uhanxt', name: 'Jon Kornbeck', teamName: "Kornbeck Crushers" },
      { id: 'cmg2fcdaa000610xn55ol8j6z', name: 'David Jarvey', teamName: "Jarvey's Juggernauts" },
      { id: 'cmg2fcdbg000710xnhgxfrhgn', name: 'Kaity Lorbecki', teamName: "Lorbecki Lions" },
      { id: 'cmg2fcdck000810xno7bacts7', name: 'Cason Minor', teamName: "Minor Miracles" },
      { id: 'cmg2fcddo000910xniwoeznyc', name: 'Brittany Bergum', teamName: "Bergum Blitz" }
    ]
    
    console.log(`\n🔧 Creating ${usersNeedingTeams.length} teams...`)
    
    const createdTeams = []
    
    for (const user of usersNeedingTeams) {
      console.log(`Creating: ${user.teamName} for ${user.name}`)
      
      try {
        const newTeam = await prisma.team.create({
          data: {
            name: user.teamName,
            ownerId: user.id,
            leagueId: league.id
          }
        })
        
        createdTeams.push(newTeam)
        console.log(`✅ Created: ${newTeam.name} (${newTeam.id})`)
        
      } catch (error) {
        console.error(`❌ Failed to create team for ${user.name}:`, error)
      }
    }
    
    console.log(`\n🎉 SUCCESSFULLY CREATED ${createdTeams.length} NEW TEAMS!`)
    
    // Verify by counting total teams
    const totalTeams = await prisma.team.count()
    console.log(`📊 Total teams in database: ${totalTeams}`)
    
    if (totalTeams >= 11) {
      console.log('🎉 SUCCESS: All 11 users should now have teams!')
    }
    
  } catch (error) {
    console.error('❌ Error creating teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTeamsSimple().catch(console.error)