#!/usr/bin/env tsx
/**
 * Check D'Amato Dynasty League Setup
 * Verify all members are in the same league
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLeagueSetup() {
  console.log('🔍 CHECKING D\'AMATO DYNASTY LEAGUE SETUP')
  console.log('='.repeat(50))
  
  try {
    // Check existing leagues
    const leagues = await prisma.league.findMany({
      include: {
        teams: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                teamName: true
              }
            }
          }
        }
      }
    })
    
    console.log('\n📊 CURRENT LEAGUES:')
    if (leagues.length === 0) {
      console.log('  ❌ No leagues found!')
    } else {
      leagues.forEach(league => {
        console.log(`  🏆 ${league.name} (ID: ${league.id})`)
        console.log(`     Teams: ${league.teams.length}`)
        league.teams.forEach(team => {
          console.log(`     - ${team.name} - Owner: ${team.owner.name} (${team.owner.email})`)
        })
      })
    }
    
    // Check all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        teamName: true,
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
    
    console.log('\n👥 ALL USERS:')
    if (allUsers.length === 0) {
      console.log('  ❌ No users found!')
    } else {
      allUsers.forEach(user => {
        const teamInfo = user.teams.length > 0 
          ? `${user.teams[0].name} in ${user.teams[0].league.name}` 
          : 'No team'
        console.log(`  - ${user.name} (${user.email}) - Team: ${teamInfo}`)
      })
    }
    
    // Check for D'Amato Dynasty League specifically
    const damatoLeague = leagues.find(league => 
      league.name.toLowerCase().includes('damato') || 
      league.name.toLowerCase().includes('dynasty')
    )
    
    console.log('\n🎯 D\'AMATO DYNASTY LEAGUE STATUS:')
    if (damatoLeague) {
      console.log(`  ✅ Found: ${damatoLeague.name}`)
      console.log(`  👥 Teams: ${damatoLeague.teams.length}/10`)
      
      const expectedMembers = [
        'Nicholas D\'Amato', 'Nick Hartley', 'Jack McCaigue', 'Larry McCaigue',
        'Renee McCaigue', 'Jon Kornbeck', 'David Jarvey', 'Kaity Lorbecki',
        'Cason Minor', 'Brittany Bergum'
      ]
      
      const teamOwners = damatoLeague.teams.map(team => team.owner.name)
      const missingMembers = expectedMembers.filter(expected => 
        !teamOwners.includes(expected)
      )
      
      if (missingMembers.length > 0) {
        console.log('  ⚠️  Missing members:')
        missingMembers.forEach(member => {
          console.log(`    - ${member}`)
        })
      } else {
        console.log('  ✅ All 10 D\'Amato Dynasty members are present!')
      }
    } else {
      console.log('  ❌ D\'Amato Dynasty League not found!')
    }
    
  } catch (error) {
    console.error('❌ Error checking league setup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLeagueSetup()