#!/usr/bin/env tsx

/**
 * Production Database Seeding Script for AstralField v2.1
 * 
 * This script safely seeds production data with proper validation
 * and safety checks.
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

interface ProductionSeedOptions {
  environment: 'production' | 'staging'
  seedUsers: boolean
  seedDemo: boolean
  force: boolean
  dryRun: boolean
}

const prisma = new PrismaClient()

// Production seed data - minimal and safe
const PRODUCTION_USERS = [
  {
    email: 'admin@astralfield.com',
    name: 'AstralField Admin',
    role: 'ADMIN' as const,
    teamName: 'Astral Admins'
  },
  {
    email: 'commissioner@astralfield.com', 
    name: 'Demo Commissioner',
    role: 'COMMISSIONER' as const,
    teamName: 'Commissioners'
  }
]

const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
]

// Sample NFL players for demonstration
const SAMPLE_PLAYERS = [
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', nflId: 'josh-allen-buf' },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', nflId: 'lamar-jackson-bal' },
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', nflId: 'christian-mccaffrey-sf' },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL', nflId: 'derrick-henry-bal' },
  { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', nflId: 'cooper-kupp-lar' },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', nflId: 'davante-adams-lv' },
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', nflId: 'travis-kelce-kc' },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', nflId: 'mark-andrews-bal' },
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', nflId: 'justin-tucker-bal' },
  { name: 'Buffalo Defense', position: 'DST', nflTeam: 'BUF', nflId: 'buffalo-defense' }
]

async function parseArgs(): Promise<ProductionSeedOptions> {
  const args = process.argv.slice(2)
  const options: ProductionSeedOptions = {
    environment: 'staging',
    seedUsers: false,
    seedDemo: false,
    force: false,
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--env':
      case '--environment':
        const env = args[++i] as ProductionSeedOptions['environment']
        if (!['production', 'staging'].includes(env)) {
          throw new Error('Environment must be: staging or production')
        }
        options.environment = env
        break
      case '--seed-users':
        options.seedUsers = true
        break
      case '--seed-demo':
        options.seedDemo = true
        break
      case '--force':
        options.force = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
        console.log(`
AstralField v2.1 Production Database Seeding Tool

Usage: tsx scripts/db-seed-production.ts [options]

Options:
  --env <env>         Environment: staging or production (default: staging)
  --seed-users        Seed admin and demo users
  --seed-demo         Seed demo league data
  --force             Force seeding even with existing data
  --dry-run           Show what would be done without executing
  --help              Show this help message

Examples:
  tsx scripts/db-seed-production.ts --env staging --seed-demo
  tsx scripts/db-seed-production.ts --env production --seed-users --force
  tsx scripts/db-seed-production.ts --dry-run
`)
        process.exit(0)
        break
    }
  }

  return options
}

async function checkEnvironmentSafety(environment: string): Promise<void> {
  console.log(`🔍 Checking ${environment} environment safety...`)

  // Check if we're actually connected to the right database
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured')
  }

  if (environment === 'production') {
    // Additional production safety checks
    if (!databaseUrl.includes('prod') && !databaseUrl.includes('production')) {
      console.warn('⚠️  Warning: DATABASE_URL does not appear to be a production database')
    }

    // Check for existing data
    const userCount = await prisma.user.count()
    const leagueCount = await prisma.league.count()

    if ((userCount > 0 || leagueCount > 0)) {
      console.log(`📊 Existing data found: ${userCount} users, ${leagueCount} leagues`)
      console.log('⚠️  Production database contains data')
    }
  }

  console.log('✅ Environment safety check passed')
}

async function seedAdminUsers(dryRun: boolean): Promise<void> {
  console.log('👥 Seeding admin users...')

  for (const userData of PRODUCTION_USERS) {
    if (dryRun) {
      console.log(`   Would create user: ${userData.email} (${userData.role})`)
      continue
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existingUser) {
      console.log(`   User ${userData.email} already exists, skipping`)
      continue
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        teamName: userData.teamName,
        avatar: '⚡' // Default Astral Field avatar
      }
    })

    console.log(`   ✅ Created user: ${user.email} (${user.role})`)
  }
}

async function seedNFLPlayers(dryRun: boolean): Promise<void> {
  console.log('🏈 Seeding NFL players...')

  for (const playerData of SAMPLE_PLAYERS) {
    if (dryRun) {
      console.log(`   Would create player: ${playerData.name} (${playerData.position} - ${playerData.nflTeam})`)
      continue
    }

    // Check if player already exists
    const existingPlayer = await prisma.player.findUnique({
      where: { nflId: playerData.nflId }
    })

    if (existingPlayer) {
      console.log(`   Player ${playerData.name} already exists, skipping`)
      continue
    }

    // Create player
    const player = await prisma.player.create({
      data: {
        nflId: playerData.nflId,
        name: playerData.name,
        position: playerData.position as any,
        nflTeam: playerData.nflTeam,
        status: 'ACTIVE',
        isRookie: false,
        yearsExperience: 5 // Default experience
      }
    })

    console.log(`   ✅ Created player: ${player.name} (${player.position})`)
  }
}

async function seedDemoLeague(dryRun: boolean): Promise<void> {
  console.log('🏆 Seeding demo league...')

  if (dryRun) {
    console.log('   Would create demo league with sample teams and settings')
    return
  }

  // Find admin user to be commissioner
  const commissioner = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!commissioner) {
    console.log('   No admin user found, skipping demo league creation')
    return
  }

  // Check if demo league already exists
  const existingLeague = await prisma.league.findFirst({
    where: { name: { contains: 'Demo' } }
  })

  if (existingLeague) {
    console.log('   Demo league already exists, skipping')
    return
  }

  // Create demo league
  const league = await prisma.league.create({
    data: {
      name: 'AstralField Demo League',
      description: 'Demonstration league showcasing AstralField features',
      season: new Date().getFullYear(),
      currentWeek: 1,
      isActive: true,
      commissionerId: commissioner.id
    }
  })

  // Create league settings
  await prisma.settings.create({
    data: {
      leagueId: league.id,
      rosterSlots: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        K: 1,
        DST: 1,
        BENCH: 6
      },
      scoringSystem: {
        passing: { yards: 0.04, touchdowns: 4, interceptions: -2 },
        rushing: { yards: 0.1, touchdowns: 6 },
        receiving: { yards: 0.1, touchdowns: 6, receptions: 0.5 },
        kicking: { fieldGoals: 3, extraPoints: 1 },
        defense: { touchdowns: 6, interceptions: 2, fumbles: 2, safeties: 2 }
      },
      waiverMode: 'ROLLING',
      playoffWeeks: [15, 16, 17]
    }
  })

  console.log(`   ✅ Created demo league: ${league.name}`)
}

async function verifySeeding(): Promise<void> {
  console.log('🔍 Verifying seeding results...')

  const userCount = await prisma.user.count()
  const playerCount = await prisma.player.count()
  const leagueCount = await prisma.league.count()

  console.log('📊 Seeding verification:')
  console.log(`   Users: ${userCount}`)
  console.log(`   Players: ${playerCount}`)
  console.log(`   Leagues: ${leagueCount}`)

  if (userCount > 0 && playerCount > 0) {
    console.log('✅ Basic seeding verification passed')
  } else {
    console.warn('⚠️  Verification found missing data')
  }
}

async function main() {
  try {
    console.log('🚀 AstralField v2.1 Production Database Seeding')
    console.log('===============================================')
    
    const options = await parseArgs()
    
    console.log('Configuration:', {
      environment: options.environment,
      seedUsers: options.seedUsers,
      seedDemo: options.seedDemo,
      dryRun: options.dryRun,
      force: options.force
    })

    // Safety checks
    await checkEnvironmentSafety(options.environment)

    if (options.environment === 'production' && !options.force) {
      console.log('⚠️  Production seeding requires --force flag for safety')
      console.log('💡 Use: tsx scripts/db-seed-production.ts --env production --force')
      process.exit(1)
    }

    // Connect to database
    await prisma.$connect()
    console.log('✅ Connected to database')

    // Seed admin users
    if (options.seedUsers) {
      await seedAdminUsers(options.dryRun)
    }

    // Seed NFL players
    await seedNFLPlayers(options.dryRun)

    // Seed demo league
    if (options.seedDemo) {
      await seedDemoLeague(options.dryRun)
    }

    // Verify results
    if (!options.dryRun) {
      await verifySeeding()
    }

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN COMPLETED - No changes were made')
    } else {
      console.log('\n🎉 Production seeding completed successfully!')
    }

    console.log('\n💡 Next steps:')
    console.log('  1. Configure authentication provider')
    console.log('  2. Set up external API integrations')
    console.log('  3. Configure monitoring and alerting')
    console.log('  4. Run application health checks')

  } catch (error) {
    console.error('❌ Production seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Seeding interrupted by user')
  await prisma.$disconnect()
  process.exit(130)
})

if (require.main === module) {
  main()
}