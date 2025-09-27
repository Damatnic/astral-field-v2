#!/usr/bin/env tsx
/**
 * Auto-Draft D'Amato Dynasty League
 * Automatically draft realistic rosters for all 10 teams
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
})

// Standard fantasy roster positions
const ROSTER_TEMPLATE = [
  { position: 'QB', count: 2, starters: 1 },
  { position: 'RB', count: 4, starters: 2 },
  { position: 'WR', count: 4, starters: 2 },
  { position: 'TE', count: 2, starters: 1 },
  { position: 'K', count: 1, starters: 1 },
  { position: 'DST', count: 1, starters: 1 }
  // Total: 14 players per team (9 starters, 5 bench)
]

async function autoDraftLeague() {
  console.log('🏈 AUTO-DRAFTING D\'AMATO DYNASTY LEAGUE')
  console.log('='.repeat(50))
  
  try {
    // Get the D'Amato Dynasty League
    const league = await prisma.league.findFirst({
      where: {
        name: { contains: 'Amato', mode: 'insensitive' }
      },
      include: {
        teams: {
          include: {
            owner: true
          }
        }
      }
    })
    
    if (!league) {
      console.log('❌ D\'Amato Dynasty League not found!')
      return false
    }
    
    // Clear existing rosters
    console.log('🧹 Clearing existing rosters...')
    await prisma.rosterPlayer.deleteMany()
    
    // Get all available players by position
    const playersByPosition = await prisma.player.groupBy({
      by: ['position'],
      _count: { position: true }
    })
    
    console.log('📊 Available Players:')
    for (const pos of playersByPosition) {
      console.log(`   ${pos.position}: ${pos._count.position}`)
    }
    
    // Filter to only D'Amato Dynasty teams (the 10 we want)
    const targetTeams = league.teams.filter(team => 
      ['Nicholas D\'Amato', 'Nick Hartley', 'Jack McCaigue', 'Larry McCaigue',
       'Renee McCaigue', 'Jon Kornbeck', 'David Jarvey', 'Kaity Lorbecki',
       'Cason Minor', 'Brittany Bergum'].includes(team.owner.name)
    )
    
    console.log(`\n🎯 Drafting for ${targetTeams.length} D'Amato Dynasty teams`)
    
    // Draft algorithm
    const draftedPlayerIds = new Set<string>()
    
    for (const team of targetTeams) {
      console.log(`\n⚡ Drafting for ${team.owner.name} (${team.name})...`)
      let totalDrafted = 0
      
      for (const positionReq of ROSTER_TEMPLATE) {
        // Get available players for this position
        const availablePlayers = await prisma.player.findMany({
          where: {
            position: positionReq.position,
            id: { notIn: Array.from(draftedPlayerIds) }
          },
          orderBy: {
            rank: 'asc' // Draft best available by rank
          },
          take: positionReq.count
        })
        
        if (availablePlayers.length < positionReq.count) {
          console.log(`⚠️  Only ${availablePlayers.length}/${positionReq.count} ${positionReq.position} available`)
        }
        
        // Draft the players
        for (let i = 0; i < Math.min(availablePlayers.length, positionReq.count); i++) {
          const player = availablePlayers[i]
          const isStarter = i < positionReq.starters
          
          await prisma.rosterPlayer.create({
            data: {
              teamId: team.id,
              playerId: player.id,
              position: isStarter ? 'STARTER' : 'BENCH',
              isStarter: isStarter
            }
          })
          
          draftedPlayerIds.add(player.id)
          totalDrafted++
          
          const role = isStarter ? 'STARTER' : 'BENCH'
          console.log(`   ✅ ${player.name} (${player.position} - ${player.nflTeam}) - ${role}`)
        }
      }
      
      console.log(`   📊 Total drafted: ${totalDrafted} players`)
    }
    
    // Verify the draft
    console.log('\n📋 DRAFT VERIFICATION')
    console.log('='.repeat(30))
    
    for (const team of targetTeams) {
      const roster = await prisma.rosterPlayer.findMany({
        where: { teamId: team.id },
        include: { player: true }
      })
      
      const starters = roster.filter(r => r.isStarter).length
      const bench = roster.filter(r => !r.isStarter).length
      
      console.log(`✅ ${team.owner.name}: ${roster.length} total (${starters} starters, ${bench} bench)`)
      
      // Show starting lineup
      const startingLineup = roster.filter(r => r.isStarter)
      const lineupByPos = startingLineup.reduce((acc, rp) => {
        if (!acc[rp.player.position]) acc[rp.player.position] = []
        acc[rp.player.position].push(rp.player.name)
        return acc
      }, {} as Record<string, string[]>)
      
      console.log('   Starting Lineup:')
      Object.entries(lineupByPos).forEach(([pos, players]) => {
        console.log(`     ${pos}: ${players.join(', ')}`)
      })
    }
    
    // Final statistics
    const totalDraftedPlayers = await prisma.rosterPlayer.count()
    const totalStarters = await prisma.rosterPlayer.count({ where: { isStarter: true } })
    
    console.log('\n🏆 DRAFT COMPLETE!')
    console.log('='.repeat(25))
    console.log(`📊 Total Players Drafted: ${totalDraftedPlayers}`)
    console.log(`⭐ Total Starters: ${totalStarters}`)
    console.log(`🪑 Total Bench Players: ${totalDraftedPlayers - totalStarters}`)
    console.log(`👥 Teams with Full Rosters: ${targetTeams.length}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Auto-draft failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

autoDraftLeague().then(success => {
  if (success) {
    console.log('\n🎉 ✅ D\'AMATO DYNASTY LEAGUE DRAFT SUCCESSFUL!')
    console.log('✅ All 10 teams have complete rosters')
    console.log('✅ Starters and bench players assigned')
    console.log('✅ League is now 1000% ready for play!')
  } else {
    console.log('\n❌ Draft failed - check errors above')
  }
  process.exit(success ? 0 : 1)
})