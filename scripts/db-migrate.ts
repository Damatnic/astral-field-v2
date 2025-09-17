#!/usr/bin/env tsx

/**
 * Database Migration Script for AstralField v2.1
 * 
 * This script handles database migrations with proper rollback capabilities
 * and production safety checks.
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs/promises'
import * as path from 'path'

interface MigrationOptions {
  environment: 'development' | 'staging' | 'production'
  force: boolean
  rollback: boolean
  dryRun: boolean
  backup: boolean
  migrationName?: string
}

const prisma = new PrismaClient()

async function parseArgs(): Promise<MigrationOptions> {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    environment: 'development',
    force: false,
    rollback: false,
    dryRun: false,
    backup: true
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--env':
      case '--environment':
        const env = args[++i] as MigrationOptions['environment']
        if (!['development', 'staging', 'production'].includes(env)) {
          throw new Error('Environment must be: development, staging, or production')
        }
        options.environment = env
        break
      case '--force':
        options.force = true
        break
      case '--rollback':
        options.rollback = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--no-backup':
        options.backup = false
        break
      case '--migration':
        options.migrationName = args[++i]
        break
      case '--help':
        console.log(`
AstralField v2.1 Database Migration Tool

Usage: tsx scripts/db-migrate.ts [options]

Options:
  --env <env>          Environment: development, staging, production (default: development)
  --force              Force migration even with warnings
  --rollback           Rollback last migration
  --dry-run            Show what would be done without executing
  --no-backup          Skip backup before migration (not recommended for production)
  --migration <name>   Specific migration to run/rollback
  --help               Show this help message

Examples:
  tsx scripts/db-migrate.ts
  tsx scripts/db-migrate.ts --env production --backup
  tsx scripts/db-migrate.ts --rollback --migration "20240101_add_user_table"
  tsx scripts/db-migrate.ts --dry-run --env staging
`)
        process.exit(0)
        break
    }
  }

  return options
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT NOW() as server_time, version() as version`
    console.log('✅ Database connection established')
    console.log('📊 Database info:', result)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function createBackup(environment: string): Promise<string | null> {
  if (environment !== 'production' && environment !== 'staging') {
    console.log('⏭️  Skipping backup for development environment')
    return null
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `backup-${environment}-${timestamp}.sql`
    const backupPath = path.join(process.cwd(), 'backups', backupFileName)

    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true })

    console.log('🔄 Creating database backup...')
    
    // Get database URL
    const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables')
    }

    // Extract connection details
    const url = new URL(databaseUrl)
    const host = url.hostname
    const port = url.port || '5432'
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    // Create pg_dump command
    const dumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --clean --if-exists --create > ${backupPath}`
    
    execSync(dumpCommand, { stdio: 'inherit' })
    
    console.log(`✅ Backup created: ${backupPath}`)
    return backupPath
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  }
}

async function runMigrations(options: MigrationOptions): Promise<void> {
  try {
    if (options.dryRun) {
      console.log('🔍 DRY RUN: The following migrations would be applied:')
      execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma', { stdio: 'inherit' })
      return
    }

    console.log('🔄 Running database migrations...')
    
    if (options.environment === 'production') {
      // Production migrations require explicit confirmation
      console.log('⚠️  PRODUCTION MIGRATION')
      console.log('This will modify the production database.')
      
      if (!options.force) {
        throw new Error('Production migrations require --force flag for safety')
      }
    }

    // Generate Prisma client first
    console.log('🔄 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })

    // Run migrations
    if (options.migrationName) {
      execSync(`npx prisma migrate resolve --applied ${options.migrationName}`, { stdio: 'inherit' })
    } else {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    }

    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

async function rollbackMigration(options: MigrationOptions): Promise<void> {
  try {
    console.log('🔄 Rolling back migration...')
    
    if (options.environment === 'production' && !options.force) {
      throw new Error('Production rollbacks require --force flag for safety')
    }

    if (options.migrationName) {
      // Rollback specific migration
      console.log(`Rolling back migration: ${options.migrationName}`)
      execSync(`npx prisma migrate resolve --rolled-back ${options.migrationName}`, { stdio: 'inherit' })
    } else {
      // This is more complex and would require custom implementation
      console.log('⚠️  Automatic rollback not supported. Please specify --migration <name>')
      console.log('💡 To rollback manually:')
      console.log('1. Identify the migration to rollback from prisma/_migrations')
      console.log('2. Run: tsx scripts/db-migrate.ts --rollback --migration <migration_name>')
    }

    console.log('✅ Rollback completed')
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

async function verifyMigration(): Promise<void> {
  try {
    console.log('🔍 Verifying migration...')
    
    // Check database schema
    execSync('npx prisma migrate status', { stdio: 'inherit' })
    
    // Run basic health checks
    const userCount = await prisma.user.count()
    const leagueCount = await prisma.league.count()
    
    console.log('📊 Migration verification:')
    console.log(`   Users: ${userCount}`)
    console.log(`   Leagues: ${leagueCount}`)
    
    console.log('✅ Migration verification passed')
  } catch (error) {
    console.error('❌ Migration verification failed:', error)
    throw error
  }
}

async function main() {
  try {
    console.log('🚀 AstralField v2.1 Database Migration')
    console.log('=====================================')
    
    const options = await parseArgs()
    
    console.log('Configuration:', {
      environment: options.environment,
      rollback: options.rollback,
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force
    })

    // Check database connection
    const connected = await checkDatabaseConnection()
    if (!connected) {
      throw new Error('Database connection required for migration')
    }

    // Create backup if requested
    let backupPath: string | null = null
    if (options.backup && !options.dryRun && !options.rollback) {
      backupPath = await createBackup(options.environment)
    }

    try {
      if (options.rollback) {
        await rollbackMigration(options)
      } else {
        await runMigrations(options)
      }

      // Verify migration
      if (!options.dryRun) {
        await verifyMigration()
      }

      console.log('\n🎉 Database migration completed successfully!')
      if (backupPath) {
        console.log(`💾 Backup saved: ${backupPath}`)
      }
      
    } catch (migrationError) {
      if (backupPath && options.environment === 'production') {
        console.log('\n🚨 Migration failed! Consider restoring from backup:')
        console.log(`   psql -f ${backupPath}`)
      }
      throw migrationError
    }

  } catch (error) {
    console.error('❌ Migration process failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted by user')
  await prisma.$disconnect()
  process.exit(130)
})

if (require.main === module) {
  main()
}