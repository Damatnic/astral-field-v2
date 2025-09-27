#!/usr/bin/env tsx
/**
 * Check Nicholas D'Amato's League Membership
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
})

async function checkNicholasMembership() {
  console.log('🔍 CHECKING NICHOLAS D\'AMATO MEMBERSHIP')
  console.log('='.repeat(50))
  
  try {
    // Find Nicholas D'Amato user
    const nicholas = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'nicholas@damato.com' },
          { name: { contains: 'Nicholas', mode: 'insensitive' } }
        ]
      },
      include: {
        teams: {
          include: {
            league: true,
            roster: {
              include: {
                player: true
              }
            }
          }
        }
      }
    })
    
    if (!nicholas) {
      console.log('❌ Nicholas D\'Amato user not found!')
      return false
    }
    
    console.log(`✅ Found User: ${nicholas.name}`)
    console.log(`📧 Email: ${nicholas.email}`)
    console.log(`🆔 User ID: ${nicholas.id}`)
    console.log(`👥 Teams Count: ${nicholas.teams.length}`)
    
    if (nicholas.teams.length === 0) {
      console.log('❌ Nicholas has no teams assigned!')
      
      // Check if there's a team for Nicholas in the league
      const orphanTeam = await prisma.team.findFirst({
        where: {
          owner: {
            name: { contains: 'Nicholas', mode: 'insensitive' }
          }
        },
        include: {
          owner: true,
          league: true
        }
      })
      
      if (orphanTeam) {
        console.log(`🔧 Found orphan team: ${orphanTeam.name} owned by ${orphanTeam.owner.name}`)
        console.log(`   League: ${orphanTeam.league.name}`)
      }
      
      return false
    }
    
    for (const team of nicholas.teams) {
      console.log(`\n🏈 TEAM: ${team.name}`)
      console.log(`   League: ${team.league.name}`)
      console.log(`   Team ID: ${team.id}`)
      console.log(`   League ID: ${team.league.id}`)
      console.log(`   Roster Size: ${team.roster.length}`)
      
      if (team.roster.length > 0) {
        console.log(`   Sample Players:`)
        team.roster.slice(0, 3).forEach(rp => {
          console.log(`     - ${rp.player.name} (${rp.player.position})`)
        })
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error checking membership:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

checkNicholasMembership().then(success => {
  if (success) {
    console.log('\n✅ Nicholas D\'Amato membership verified!')
  } else {
    console.log('\n❌ Nicholas D\'Amato membership issue detected!')
  }
  process.exit(success ? 0 : 1)
})