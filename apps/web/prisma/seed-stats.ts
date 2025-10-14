import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedPlayerStats() {
  console.log('🌱 Seeding player stats and projections...')
  
  // Get all players on rosters
  const rosterPlayers = await prisma.rosterPlayer.findMany({
    include: { player: true }
  })
  
  console.log(`Found ${rosterPlayers.length} roster players`)
  
  let statsCreated = 0
  let projectionsCreated = 0
  
  // Create stats for weeks 1-17 for each player
  for (const rp of rosterPlayers) {
    for (let week = 1; week <= 17; week++) {
      // Generate realistic fantasy points based on position
      const basePoints: Record<string, number> = {
        'QB': 18,
        'RB': 12,
        'WR': 11,
        'TE': 9,
        'K': 8,
        'DEF': 10,
        'DST': 10
      }
      
      const base = basePoints[rp.player.position] || 10
      const variance = (Math.random() - 0.5) * 10
      const fantasyPoints = Math.max(0, base + variance)
      
      // Create or update stats
      await prisma.playerStats.upsert({
        where: {
          playerId_week_season: {
            playerId: rp.playerId,
            week,
            season: 2025
          }
        },
        create: {
          playerId: rp.playerId,
          week,
          season: 2025,
          fantasyPoints: parseFloat(fantasyPoints.toFixed(1)),
          stats: JSON.stringify({})
        },
        update: {
          fantasyPoints: parseFloat(fantasyPoints.toFixed(1))
        }
      })
      
      statsCreated++
      
      // Create projections (slightly different from actual stats)
      const projectedPoints = Math.max(0, fantasyPoints + (Math.random() - 0.5) * 5)
      
      // Check if projection already exists
      const existingProjection = await prisma.playerProjection.findFirst({
        where: {
          playerId: rp.playerId,
          week,
          season: 2025
        }
      })
      
      if (existingProjection) {
        await prisma.playerProjection.update({
          where: { id: existingProjection.id },
          data: {
            projectedPoints: parseFloat(projectedPoints.toFixed(1)),
            confidence: 0.75
          }
        })
      } else {
        await prisma.playerProjection.create({
          data: {
            playerId: rp.playerId,
            week,
            season: 2025,
            projectedPoints: parseFloat(projectedPoints.toFixed(1)),
            confidence: 0.75
          }
        })
      }
      
      projectionsCreated++
    }
    
    console.log(`✓ Created stats for ${rp.player.name} (${rp.player.position})`)
  }
  
  console.log(`\n✅ Seeding complete!`)
  console.log(`   - ${statsCreated} stats created/updated`)
  console.log(`   - ${projectionsCreated} projections created/updated`)
}

seedPlayerStats()
  .catch((error) => {
    console.error('❌ Error seeding stats:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

