#!/usr/bin/env tsx

import { prisma } from '../src/lib/db'
import { writeFile } from 'fs/promises'

interface VerificationResult {
  timestamp: string
  checks: {
    database: { passed: boolean; details: any }
    schema: { passed: boolean; details: any }
    league: { passed: boolean; details: any }
    users: { passed: boolean; details: any }
    teams: { passed: boolean; details: any }
    rosters: { passed: boolean; details: any }
    commissioner: { passed: boolean; details: any }
    settings: { passed: boolean; details: any }
  }
  summary: {
    passed: number
    failed: number
    total: number
    status: 'PASS' | 'FAIL'
  }
}

async function main() {
  console.log('🔍 AstralField v2.1 Setup Verification')
  console.log('=====================================')
  
  const result: VerificationResult = {
    timestamp: new Date().toISOString(),
    checks: {
      database: { passed: false, details: null },
      schema: { passed: false, details: null },
      league: { passed: false, details: null },
      users: { passed: false, details: null },
      teams: { passed: false, details: null },
      rosters: { passed: false, details: null },
      commissioner: { passed: false, details: null },
      settings: { passed: false, details: null }
    },
    summary: { passed: 0, failed: 0, total: 8, status: 'FAIL' }
  }

  try {
    // Check 1: Database Connection
    console.log('\n1. Testing database connection...')
    try {
      await prisma.$connect()
      const serverTime = await prisma.$queryRaw`SELECT NOW() as server_time, version() as version`
      result.checks.database = {
        passed: true,
        details: { connected: true, serverTime, version: 'PostgreSQL' }
      }
      console.log('   ✅ Database connected successfully')
    } catch (error) {
      result.checks.database = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Connection failed' }
      }
      console.log('   ❌ Database connection failed:', error)
    }

    // Check 2: Schema Validation
    console.log('\n2. Validating database schema...')
    try {
      // Test key tables exist by querying them
      const tableChecks = await Promise.all([
        prisma.user.findMany({ take: 1 }),
        prisma.league.findMany({ take: 1 }),
        prisma.team.findMany({ take: 1 }),
        prisma.player.findMany({ take: 1 })
      ])
      
      result.checks.schema = {
        passed: true,
        details: { tablesAccessible: ['users', 'leagues', 'teams', 'players'] }
      }
      console.log('   ✅ Database schema is valid')
    } catch (error) {
      result.checks.schema = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Schema validation failed' }
      }
      console.log('   ❌ Schema validation failed:', error)
    }

    // Check 3: League Data
    console.log('\n3. Checking league configuration...')
    try {
      const leagues = await prisma.league.findMany({
        include: { 
          settings: true,
          _count: { select: { teams: true } }
        }
      })
      
      const currentLeague = leagues.find(l => l.season === 2025)
      const leagueValid = !!(currentLeague && currentLeague._count.teams && currentLeague._count.teams > 0)
      
      result.checks.league = {
        passed: leagueValid,
        details: {
          found: !!currentLeague,
          season: currentLeague?.season,
          teamCount: currentLeague?._count.teams
        }
      }
      
      if (leagueValid) {
        console.log('   ✅ League 2025 configured correctly')
      } else {
        console.log('   ❌ League 2025 not found or misconfigured')
      }
    } catch (error) {
      result.checks.league = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'League check failed' }
      }
      console.log('   ❌ League check failed:', error)
    }

    // Check 4: User Accounts
    console.log('\n4. Validating user accounts...')
    try {
      const users = await prisma.user.findMany()
      
      const userValid = users.length === 10
      const expectedEmails = [
        'nicholas.damato@email.com', 'nick.hartley@email.com', 'jack.mccaigue@email.com',
        'larry.mccaigue@email.com', 'renee.mccaigue@email.com', 'jon.kornbeck@email.com',
        'david.jarvey@email.com', 'kaity.lorbecki@email.com', 'cason.minor@email.com',
        'brittany.bergum@email.com'
      ]
      
      const foundEmails = users.map(u => u.email)
      const allUsersPresent = expectedEmails.every(email => foundEmails.includes(email))
      
      result.checks.users = {
        passed: userValid && allUsersPresent,
        details: {
          count: users.length,
          expected: 10,
          emails: foundEmails,
          allPresent: allUsersPresent
        }
      }
      
      if (userValid && allUsersPresent) {
        console.log('   ✅ All 10 users created successfully')
      } else {
        console.log('   ❌ User validation failed')
      }
    } catch (error) {
      result.checks.users = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'User check failed' }
      }
      console.log('   ❌ User check failed:', error)
    }

    // Check 5: Teams
    console.log('\n5. Validating team setup...')
    try {
      const teams = await prisma.team.findMany({
        where: { league: { season: 2025 } },
        include: { owner: true }
      })
      
      const teamValid = teams.length === 10
      const allTeamsHaveOwners = teams.every(t => t.owner)
      
      result.checks.teams = {
        passed: teamValid && allTeamsHaveOwners,
        details: {
          count: teams.length,
          expected: 10,
          teams: teams.map(t => ({ name: t.name, owner: t.owner.name }))
        }
      }
      
      if (teamValid && allTeamsHaveOwners) {
        console.log('   ✅ All 10 teams created with owners')
      } else {
        console.log('   ❌ Team validation failed')
      }
    } catch (error) {
      result.checks.teams = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Team check failed' }
      }
      console.log('   ❌ Team check failed:', error)
    }

    // Check 6: Rosters
    console.log('\n6. Validating roster completeness...')
    try {
      const teams = await prisma.team.findMany({
        where: { league: { season: 2025 } },
        include: {
          roster: { include: { player: true } }
        }
      })
      
      const rosterChecks = teams.map(team => {
        const positions = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 }
        ;(team as any).roster.forEach((r: any) => {
          if (positions.hasOwnProperty(r.player.position)) {
            positions[r.player.position as keyof typeof positions]++
          }
        })
        
        const hasViableStarters = positions.QB >= 1 && positions.RB >= 1 && 
                                 positions.WR >= 1 && positions.TE >= 1
        const correctSize = ((team as any).roster?.length || 0) === 15
        
        return {
          teamName: team.name,
          valid: hasViableStarters && correctSize,
          size: (team as any).roster?.length || 0,
          positions
        }
      })
      
      const allRostersValid = rosterChecks.every(check => check.valid)
      
      result.checks.rosters = {
        passed: allRostersValid,
        details: {
          teams: rosterChecks,
          validCount: rosterChecks.filter(c => c.valid).length
        }
      }
      
      if (allRostersValid) {
        console.log('   ✅ All team rosters are complete and valid')
      } else {
        console.log('   ❌ Some team rosters are invalid')
      }
    } catch (error) {
      result.checks.rosters = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Roster check failed' }
      }
      console.log('   ❌ Roster check failed:', error)
    }

    // Check 7: Commissioner Roles
    console.log('\n7. Validating commissioner setup...')
    try {
      const nicholas = await prisma.user.findUnique({
        where: { email: 'nicholas.damato@email.com' },
        select: { id: true, email: true }
      })
      
      let roles: string[] = []
      let hasAdminRole = false
      let hasCommissionerRole = false
      let commissionerValid = false

      if (nicholas) {
        const memberships = await prisma.leagueMember.findMany({
          where: { userId: nicholas.id },
          select: { role: true }
        })
        roles = memberships.map(m => m.role)
        hasAdminRole = roles.includes('ADMIN')
        hasCommissionerRole = roles.includes('COMMISSIONER')
        commissionerValid = hasAdminRole || hasCommissionerRole
      }
      
      result.checks.commissioner = {
        passed: commissionerValid,
        details: {
          found: !!nicholas,
          roles,
          hasAdmin: hasAdminRole,
          hasCommissioner: hasCommissionerRole
        }
      }
      
      if (commissionerValid) {
        console.log("   ✅ Commissioner account found for Nicholas D'Amato")
      } else {
        console.log('   ❌ Commissioner role validation failed')
      }
    } catch (error) {
      result.checks.commissioner = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Commissioner check failed' }
      }
      console.log('   ❌ Commissioner check failed:', error)
    }

    // Check 8: League Settings
    console.log('\n8. Validating league settings...')
    try {
      const league = await prisma.league.findFirst({
        where: { season: 2025 },
        include: { settings: true }
      })
      
      const settingsValid = !!(league?.settings && 
                           typeof league.settings.rosterSlots === 'object' &&
                           typeof league.settings.scoringSystem === 'object')
      
      result.checks.settings = {
        passed: settingsValid,
        details: {
          found: !!league?.settings,
          hasRosterSlots: !!league?.settings?.rosterSlots,
          hasScoringSystem: !!league?.settings?.scoringSystem
        }
      }
      
      if (settingsValid) {
        console.log('   ✅ League settings configured properly')
      } else {
        console.log('   ❌ League settings validation failed')
      }
    } catch (error) {
      result.checks.settings = {
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Settings check failed' }
      }
      console.log('   ❌ Settings check failed:', error)
    }

    // Calculate Summary
    const checkKeys = Object.keys(result.checks) as (keyof typeof result.checks)[]
    result.summary.passed = checkKeys.filter(key => result.checks[key].passed).length
    result.summary.failed = result.summary.total - result.summary.passed
    result.summary.status = result.summary.failed === 0 ? 'PASS' : 'FAIL'

    // Output Summary
    console.log('\n=====================================')
    console.log('📊 VERIFICATION SUMMARY')
    console.log('=====================================')
    console.log(`Status: ${result.summary.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`Checks Passed: ${result.summary.passed}/${result.summary.total}`)
    console.log(`Timestamp: ${result.timestamp}`)
    
    if (result.summary.status === 'PASS') {
      console.log('\n🎉 All verification checks passed!')
      console.log('Your AstralField v2.1 setup is ready to go.')
    } else {
      console.log(`\n⚠️  ${result.summary.failed} checks failed.`)
      console.log('Please review the issues above and re-run setup.')
    }

    // Write verification.json for CI
    try {
      await writeFile('verification.json', JSON.stringify(result, null, 2))
      console.log('\n📄 Verification report saved to verification.json')
    } catch (error) {
      console.warn('Warning: Could not write verification.json:', error)
    }

    process.exit(result.summary.status === 'PASS' ? 0 : 1)
    
  } catch (error) {
    console.error('\n❌ Fatal error during verification:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
