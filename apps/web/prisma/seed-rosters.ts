import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedFullRosters() {
  console.log('🌱 Seeding full team rosters...')
  
  const teams = await prisma.team.findMany({
    include: { roster: true }
  })
  
  console.log(`Found ${teams.length} teams`)
  
  let totalAdded = 0
  
  for (const team of teams) {
    const currentSize = team.roster.length
    const targetSize = 16 // Standard roster size
    
    if (currentSize >= targetSize) {
      console.log(`✓ ${team.name} already has ${currentSize} players (target: ${targetSize})`)
      continue
    }
    
    const needed = targetSize - currentSize
    console.log(`  ${team.name} needs ${needed} more players (currently ${currentSize})`)
    
    // Get available players not on any roster
    const availablePlayers = await prisma.player.findMany({
      where: {
        roster: { none: {} },
        isFantasyRelevant: true
      },
      take: needed,
      orderBy: { rank: 'asc' }
    })
    
    if (availablePlayers.length === 0) {
      console.log(`  ⚠️  No available players found for ${team.name}`)
      continue
    }
    
    // Add to bench
    for (const player of availablePlayers) {
      await prisma.rosterPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          position: 'BENCH',
          isStarter: false
        }
      })
      
      totalAdded++
      console.log(`    + Added ${player.name} (${player.position}) to bench`)
    }
    
    console.log(`  ✓ Added ${availablePlayers.length} players to ${team.name}`)
  }
  
  console.log(`\n✅ Roster seeding complete!`)
  console.log(`   - ${totalAdded} total players added across all teams`)
  
  // Print final roster sizes
  console.log(`\n📊 Final roster sizes:`)
  const updatedTeams = await prisma.team.findMany({
    include: { roster: true }
  })
  
  for (const team of updatedTeams) {
    console.log(`   - ${team.name}: ${team.roster.length} players`)
  }
}

seedFullRosters()
  .catch((error) => {
    console.error('❌ Error seeding rosters:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

