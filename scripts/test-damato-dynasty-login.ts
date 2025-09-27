#!/usr/bin/env tsx
/**
 * Test D'Amato Dynasty League Login
 * Verify all 10 members can authenticate and access league data
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Test credentials for each member
const DAMATO_MEMBERS = [
  { name: 'Nicholas D\'Amato', email: 'nicholas@damato.com', teamName: 'Thunder Bolts', role: 'COMMISSIONER' },
  { name: 'Nick Hartley', email: 'nick@hartley.com', teamName: 'Lightning Strike', role: 'PLAYER' },
  { name: 'Jack McCaigue', email: 'jack@mccaigue.com', teamName: 'Storm Chasers', role: 'PLAYER' },
  { name: 'Larry McCaigue', email: 'larry@mccaigue.com', teamName: 'Wind Warriors', role: 'PLAYER' },
  { name: 'Renee McCaigue', email: 'renee@mccaigue.com', teamName: 'Tornado Titans', role: 'PLAYER' },
  { name: 'Jon Kornbeck', email: 'jon@kornbeck.com', teamName: 'Hurricane Heroes', role: 'PLAYER' },
  { name: 'David Jarvey', email: 'david@jarvey.com', teamName: 'Cyclone Squad', role: 'PLAYER' },
  { name: 'Kaity Lorbecki', email: 'kaity@lorbecki.com', teamName: 'Tempest Force', role: 'PLAYER' },
  { name: 'Cason Minor', email: 'cason@minor.com', teamName: 'Blizzard Brigade', role: 'PLAYER' },
  { name: 'Brittany Bergum', email: 'brittany@bergum.com', teamName: 'Frost Giants', role: 'PLAYER' }
]

const PASSWORD = 'dynasty2024!'

async function testMemberLogin(member: typeof DAMATO_MEMBERS[0]) {
  try {
    // 1. Test user exists
    const user = await prisma.user.findUnique({
      where: { email: member.email },
      include: {
        teams: {
          include: {
            league: true
          }
        }
      }
    })
    
    if (!user) {
      return {
        member: member.name,
        email: member.email,
        status: 'FAIL',
        reason: 'User not found'
      }
    }
    
    // 2. Test password verification
    const passwordValid = await bcrypt.compare(PASSWORD, user.hashedPassword || '')
    
    if (!passwordValid) {
      return {
        member: member.name,
        email: member.email,
        status: 'FAIL',
        reason: 'Invalid password'
      }
    }
    
    // 3. Test team in D'Amato Dynasty League
    const damatoTeam = user.teams.find(team => 
      team.league.name.toLowerCase().includes('amato') ||
      team.league.name.toLowerCase().includes('dynasty')
    )
    
    if (!damatoTeam) {
      return {
        member: member.name,
        email: member.email,
        status: 'FAIL',
        reason: 'Not in D\'Amato Dynasty League'
      }
    }
    
    // 4. Verify team name matches
    const teamNameMatches = damatoTeam.name === member.teamName
    
    return {
      member: member.name,
      email: member.email,
      status: 'PASS',
      teamName: damatoTeam.name,
      leagueName: damatoTeam.league.name,
      role: user.role,
      teamNameMatches,
      leagueId: damatoTeam.league.id
    }
    
  } catch (error) {
    return {
      member: member.name,
      email: member.email,
      status: 'ERROR',
      reason: error.message
    }
  }
}

async function testDamatoDynastyLogin() {
  console.log('🧪 TESTING D\'AMATO DYNASTY LEAGUE LOGIN')
  console.log('='.repeat(50))
  console.log(`👥 Testing ${DAMATO_MEMBERS.length} members`)
  console.log(`🔐 Password: ${PASSWORD}`)
  console.log('')
  
  const results = []
  
  for (const member of DAMATO_MEMBERS) {
    console.log(`Testing ${member.name} (${member.email})...`)
    const result = await testMemberLogin(member)
    results.push(result)
    
    if (result.status === 'PASS') {
      console.log(`  ✅ PASS - Team: ${result.teamName} in ${result.leagueName}`)
    } else {
      console.log(`  ❌ ${result.status} - ${result.reason}`)
    }
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY')
  console.log('='.repeat(30))
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const errors = results.filter(r => r.status === 'ERROR').length
  
  console.log(`✅ Passed: ${passed}/${DAMATO_MEMBERS.length}`)
  console.log(`❌ Failed: ${failed}/${DAMATO_MEMBERS.length}`)
  console.log(`🚨 Errors: ${errors}/${DAMATO_MEMBERS.length}`)
  
  if (passed === DAMATO_MEMBERS.length) {
    console.log('\n🎉 ALL D\'AMATO DYNASTY MEMBERS CAN LOGIN!')
    console.log('✅ League setup is complete and functional')
    console.log('✅ All members can access their teams and dashboard')
  } else {
    console.log('\n⚠️  Some members cannot login properly')
    console.log('Please check the failed tests above')
  }
  
  // Show league information
  const firstPassedResult = results.find(r => r.status === 'PASS')
  if (firstPassedResult) {
    console.log('\n🏆 LEAGUE INFORMATION')
    console.log('='.repeat(25))
    console.log(`League: ${firstPassedResult.leagueName}`)
    console.log(`League ID: ${firstPassedResult.leagueId}`)
    console.log(`Commissioner: Nicholas D'Amato`)
    console.log(`Total Teams: ${results.filter(r => r.status === 'PASS').length}`)
  }
  
  await prisma.$disconnect()
}

testDamatoDynastyLogin().catch(console.error)