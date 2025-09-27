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
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true
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
        console.log(`     Members: ${league.users.length}`)
        league.users.forEach(user => {
          console.log(`     - ${user.name} (${user.email}) - Team: ${user.teamName || 'No team'}`)
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
        leagueId: true
      }
    })
    
    console.log('\n👥 ALL USERS:')
    if (allUsers.length === 0) {
      console.log('  ❌ No users found!')
    } else {
      allUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Team: ${user.teamName || 'No team'} - League: ${user.leagueId || 'None'}`)
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
      console.log(`  👥 Members: ${damatoLeague.users.length}/10`)
      
      const expectedMembers = [
        'Nicholas D\'Amato', 'Nick Hartley', 'Jack McCaigue', 'Larry McCaigue',
        'Renee McCaigue', 'Jon Kornbeck', 'David Jarvey', 'Kaity Lorbecki',
        'Cason Minor', 'Brittany Bergum'
      ]
      
      const missingMembers = expectedMembers.filter(expected => 
        !damatoLeague.users.some(user => user.name === expected)
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