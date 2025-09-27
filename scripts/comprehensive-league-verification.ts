#!/usr/bin/env tsx
/**
 * Comprehensive League Verification
 * 1000% verification that D'Amato Dynasty League is fully operational
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
})

async function comprehensiveLeagueVerification() {
  console.log('🔍 COMPREHENSIVE D\'AMATO DYNASTY LEAGUE VERIFICATION')
  console.log('='.repeat(60))
  
  try {
    // 1. Verify League Exists and Structure
    console.log('\n📊 STEP 1: LEAGUE STRUCTURE VERIFICATION')
    console.log('-'.repeat(40))
    
    const league = await prisma.league.findFirst({
      where: {
        name: { contains: 'Amato', mode: 'insensitive' }
      },
      include: {
        teams: {
          include: {
            owner: true,
            roster: {
              include: {
                player: true
              }
            }
          }
        }
      }
    })
    
    if (!league) {
      console.log('❌ CRITICAL: No D\'Amato Dynasty League found!')
      return false
    }
    
    console.log(`✅ League Found: ${league.name}`)
    console.log(`📋 League ID: ${league.id}`)
    console.log(`👥 Teams in League: ${league.teams.length}`)
    console.log(`🎯 Max Teams: ${league.maxTeams}`)
    
    // 2. Verify All 10 D'Amato Members
    console.log('\n👥 STEP 2: D\'AMATO DYNASTY MEMBERS VERIFICATION')
    console.log('-'.repeat(40))
    
    const expectedMembers = [
      'Nicholas D\'Amato', 'Nick Hartley', 'Jack McCaigue', 'Larry McCaigue',
      'Renee McCaigue', 'Jon Kornbeck', 'David Jarvey', 'Kaity Lorbecki',
      'Cason Minor', 'Brittany Bergum'
    ]
    
    const memberStatus = expectedMembers.map(expectedName => {
      const team = league.teams.find(team => team.owner.name === expectedName)
      return {
        name: expectedName,
        hasTeam: !!team,
        teamName: team?.name || 'NO TEAM',
        teamId: team?.id || null,
        rosterSize: team?.roster.length || 0
      }
    })
    
    memberStatus.forEach(member => {
      const status = member.hasTeam ? '✅' : '❌'
      console.log(`${status} ${member.name} - Team: ${member.teamName} (${member.rosterSize} players)`)
    })
    
    const membersWithTeams = memberStatus.filter(m => m.hasTeam).length
    console.log(`\n📊 Members with Teams: ${membersWithTeams}/10`)
    
    // 3. Check NFL Players Database
    console.log('\n🏈 STEP 3: NFL PLAYERS DATABASE VERIFICATION')
    console.log('-'.repeat(40))
    
    const totalPlayers = await prisma.player.count()
    const playersByPosition = await prisma.player.groupBy({
      by: ['position'],
      _count: {
        position: true
      }
    })
    
    console.log(`📊 Total NFL Players in Database: ${totalPlayers}`)
    console.log('📍 Players by Position:')
    playersByPosition.forEach(pos => {
      console.log(`   ${pos.position}: ${pos._count.position}`)
    })
    
    if (totalPlayers === 0) {
      console.log('❌ CRITICAL: No NFL players in database!')
      return false
    }
    
    // 4. Check Drafted Players/Rosters
    console.log('\n⭐ STEP 4: DRAFTED ROSTERS VERIFICATION')
    console.log('-'.repeat(40))
    
    let totalDraftedPlayers = 0
    for (const team of league.teams) {
      const rosterCount = team.roster.length
      totalDraftedPlayers += rosterCount
      
      const status = rosterCount > 0 ? '✅' : '❌'
      console.log(`${status} ${team.owner.name} (${team.name}): ${rosterCount} players drafted`)
      
      if (rosterCount > 0) {
        const starters = team.roster.filter(r => r.isStarter).length
        const bench = team.roster.filter(r => !r.isStarter).length
        console.log(`     └─ Starters: ${starters}, Bench: ${bench}`)
        
        // Show some players
        const samplePlayers = team.roster.slice(0, 3)
        samplePlayers.forEach(rp => {
          console.log(`     └─ ${rp.player.name} (${rp.player.position} - ${rp.player.nflTeam})`)
        })
      }
    }
    
    console.log(`\n📊 Total Drafted Players: ${totalDraftedPlayers}`)
    
    // 5. ESPN API Connection Test
    console.log('\n📡 STEP 5: ESPN API CONNECTION TEST')
    console.log('-'.repeat(40))
    
    try {
      // Test ESPN endpoints
      const espnTests = [
        { name: 'NFL News', endpoint: '/api/espn/news' },
        { name: 'NFL Scoreboard', endpoint: '/api/espn/scoreboard' }
      ]
      
      for (const test of espnTests) {
        try {
          const response = await fetch(`http://localhost:3000${test.endpoint}`)
          const status = response.ok ? '✅' : '❌'
          console.log(`${status} ${test.name}: ${response.status}`)
        } catch (error) {
          console.log(`❌ ${test.name}: Failed to connect`)
        }
      }
    } catch (error) {
      console.log('⚠️  ESPN API test requires running server')
    }
    
    // 6. Overall Assessment
    console.log('\n🏆 STEP 6: OVERALL LEAGUE READINESS ASSESSMENT')
    console.log('='.repeat(60))
    
    // Filter to only D'Amato Dynasty teams for final verification    
    const damatoTeams = league.teams.filter(team => 
      expectedMembers.includes(team.owner.name)
    )
    
    const checks = {
      leagueExists: !!league,
      allMembersHaveTeams: membersWithTeams === 10,
      nflPlayersLoaded: totalPlayers > 0,
      somePlayersdrafted: totalDraftedPlayers > 0,
      minimumRosterSizes: damatoTeams.every(team => team.roster.length >= 5)
    }
    
    const passedChecks = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length
    
    console.log(`📊 League Readiness Score: ${passedChecks}/${totalChecks}`)
    console.log('')
    
    Object.entries(checks).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌'
      const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase()
      console.log(`${status} ${checkName}`)
    })
    
    if (passedChecks === totalChecks) {
      console.log('\n🎉 ✅ D\'AMATO DYNASTY LEAGUE IS 1000% READY!')
      console.log('✅ All members have teams')
      console.log('✅ NFL players database loaded')
      console.log('✅ Players have been drafted')
      console.log('✅ League is fully operational')
    } else {
      console.log('\n⚠️  LEAGUE SETUP INCOMPLETE')
      console.log('❌ Some critical components need attention')
      
      if (!checks.nflPlayersLoaded) {
        console.log('🔧 ACTION NEEDED: Load NFL players from ESPN API')
      }
      if (!checks.somePlayersdrafted) {
        console.log('🔧 ACTION NEEDED: Draft players for teams')
      }
      if (!checks.allMembersHaveTeams) {
        console.log('🔧 ACTION NEEDED: Create teams for all members')
      }
    }
    
    return passedChecks === totalChecks
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

comprehensiveLeagueVerification().then(success => {
  process.exit(success ? 0 : 1)
})