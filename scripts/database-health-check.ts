#!/usr/bin/env tsx

/**
 * Database Health Check Script for AstralField v2.1
 * Comprehensive health monitoring for PostgreSQL database
 * 
 * Usage:
 * npm run db:health
 * npm run db:health -- --env production
 * npm run db:health -- --detailed
 */

import { PrismaClient } from '@prisma/client';

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  checks: {
    connection: boolean;
    migrations: boolean;
    tableIntegrity: boolean;
    indexHealth: boolean;
    diskSpace?: number;
    connectionCount?: number;
    slowQueries?: number;
  };
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

class DatabaseHealthCheck {
  private prisma: PrismaClient;
  private result: HealthCheckResult;

  constructor() {
    this.prisma = new PrismaClient();
    this.result = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        connection: false,
        migrations: false,
        tableIntegrity: false,
        indexHealth: false,
      },
      warnings: [],
      errors: [],
      recommendations: []
    };
  }

  async runAllChecks(detailed: boolean = false): Promise<HealthCheckResult> {
    console.log('🏥 Starting database health check...\n');

    try {
      await this.checkConnection();
      await this.checkMigrations();
      await this.checkTableIntegrity();
      await this.checkIndexHealth();
      
      if (detailed) {
        await this.checkDetailedMetrics();
      }

      this.determineOverallStatus();
      this.generateRecommendations();

    } catch (error) {
      this.result.errors.push(`Health check failed: ${error}`);
      this.result.status = 'critical';
    } finally {
      await this.prisma.$disconnect();
    }

    return this.result;
  }

  private async checkConnection(): Promise<void> {
    try {
      console.log('🔌 Checking database connection...');
      
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1 as test`;
      const responseTime = Date.now() - startTime;

      this.result.checks.connection = true;
      console.log(`✅ Connection successful (${responseTime}ms)`);

      if (responseTime > 1000) {
        this.result.warnings.push(`Slow connection response: ${responseTime}ms`);
      }

    } catch (error) {
      this.result.checks.connection = false;
      this.result.errors.push(`Connection failed: ${error}`);
      console.log('❌ Connection failed');
    }
  }

  private async checkMigrations(): Promise<void> {
    try {
      console.log('📋 Checking migration status...');
      
      // Check if _prisma_migrations table exists and has entries
      const migrations = await this.prisma.$queryRaw`
        SELECT migration_name, finished_at, applied_steps_count
        FROM "_prisma_migrations" 
        ORDER BY finished_at DESC 
        LIMIT 5
      ` as any[];

      if (migrations.length === 0) {
        this.result.warnings.push('No migrations found - database may not be initialized');
      } else {
        this.result.checks.migrations = true;
        console.log(`✅ Found ${migrations.length} migrations`);
        
        // Check for failed migrations
        const failed = migrations.filter((m: any) => !m.finished_at);
        if (failed.length > 0) {
          this.result.errors.push(`${failed.length} migrations failed to complete`);
        }
      }

    } catch (error) {
      this.result.errors.push(`Migration check failed: ${error}`);
      console.log('❌ Migration check failed');
    }
  }

  private async checkTableIntegrity(): Promise<void> {
    try {
      console.log('🗃️ Checking table integrity...');
      
      // Check that all expected tables exist
      const expectedTables = [
        'users', 'leagues', 'teams', 'players', 'matches', 
        'transactions', 'trades', 'notifications'
      ];

      const existingTables = await this.prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ` as any[];

      const tableNames = existingTables.map((t: any) => t.table_name);
      const missingTables = expectedTables.filter(table => !tableNames.includes(table));

      if (missingTables.length > 0) {
        this.result.warnings.push(`Missing tables: ${missingTables.join(', ')}`);
      } else {
        this.result.checks.tableIntegrity = true;
        console.log(`✅ All ${expectedTables.length} core tables present`);
      }

      // Check for foreign key constraints
      const constraints = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
      ` as any[];

      const fkCount = parseInt(constraints[0]?.count || '0');
      console.log(`📊 Found ${fkCount} foreign key constraints`);

    } catch (error) {
      this.result.errors.push(`Table integrity check failed: ${error}`);
      console.log('❌ Table integrity check failed');
    }
  }

  private async checkIndexHealth(): Promise<void> {
    try {
      console.log('🏃 Checking index health...');
      
      const indexes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC
        LIMIT 10
      ` as any[];

      this.result.checks.indexHealth = true;
      console.log(`✅ Found ${indexes.length} indexes`);

      // Check for unused indexes
      const unusedIndexes = indexes.filter((idx: any) => 
        parseInt(idx.idx_tup_read) === 0 && parseInt(idx.idx_tup_fetch) === 0
      );

      if (unusedIndexes.length > 0) {
        this.result.warnings.push(`${unusedIndexes.length} potentially unused indexes found`);
      }

    } catch (error) {
      this.result.warnings.push(`Index health check failed: ${error}`);
      console.log('⚠️ Index health check failed');
    }
  }

  private async checkDetailedMetrics(): Promise<void> {
    try {
      console.log('📊 Gathering detailed metrics...');

      // Connection count
      const connections = await this.prisma.$queryRaw`
        SELECT count(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
      ` as any[];
      
      this.result.checks.connectionCount = parseInt(connections[0]?.active_connections || '0');

      // Database size
      const size = await this.prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      ` as any[];
      
      console.log(`💾 Database size: ${size[0]?.size || 'unknown'}`);
      console.log(`🔗 Active connections: ${this.result.checks.connectionCount}`);

      // Check for long-running queries
      const longQueries = await this.prisma.$queryRaw`
        SELECT count(*) as slow_queries
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '1 minute'
        AND query NOT LIKE '%pg_stat_activity%'
      ` as any[];

      this.result.checks.slowQueries = parseInt(longQueries[0]?.slow_queries || '0');
      
      if (this.result.checks.slowQueries > 0) {
        this.result.warnings.push(`${this.result.checks.slowQueries} slow queries detected`);
      }

    } catch (error) {
      this.result.warnings.push(`Detailed metrics check failed: ${error}`);
      console.log('⚠️ Detailed metrics check failed');
    }
  }

  private determineOverallStatus(): void {
    const criticalIssues = this.result.errors.length;
    const warnings = this.result.warnings.length;
    const passedChecks = Object.values(this.result.checks).filter(Boolean).length;
    const totalChecks = 4; // connection, migrations, tables, indexes

    if (criticalIssues > 0) {
      this.result.status = 'critical';
    } else if (warnings > 2 || passedChecks < totalChecks) {
      this.result.status = 'warning';
    } else {
      this.result.status = 'healthy';
    }
  }

  private generateRecommendations(): void {
    if (this.result.checks.connectionCount && this.result.checks.connectionCount > 20) {
      this.result.recommendations.push('Consider implementing connection pooling');
    }

    if (this.result.checks.slowQueries && this.result.checks.slowQueries > 0) {
      this.result.recommendations.push('Investigate and optimize slow queries');
    }

    if (this.result.warnings.some(w => w.includes('unused indexes'))) {
      this.result.recommendations.push('Review and remove unused indexes to improve performance');
    }

    if (!this.result.checks.migrations) {
      this.result.recommendations.push('Run database migrations to ensure schema is up to date');
    }
  }

  displayResults(): void {
    console.log('\n📋 DATABASE HEALTH REPORT');
    console.log('========================');
    
    const statusEmoji = {
      healthy: '🟢',
      warning: '🟡', 
      critical: '🔴'
    };

    console.log(`Status: ${statusEmoji[this.result.status]} ${this.result.status.toUpperCase()}`);
    console.log(`Timestamp: ${this.result.timestamp}\n`);

    console.log('🔍 Check Results:');
    console.log(`  Connection: ${this.result.checks.connection ? '✅' : '❌'}`);
    console.log(`  Migrations: ${this.result.checks.migrations ? '✅' : '❌'}`);
    console.log(`  Tables: ${this.result.checks.tableIntegrity ? '✅' : '❌'}`);
    console.log(`  Indexes: ${this.result.checks.indexHealth ? '✅' : '❌'}`);

    if (this.result.checks.connectionCount !== undefined) {
      console.log(`  Active Connections: ${this.result.checks.connectionCount}`);
    }

    if (this.result.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.result.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.result.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (this.result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.result.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    console.log('\n');
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes('--detailed');
  const env = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'development';

  console.log(`🏥 Running health check for ${env} environment...\n`);

  // Load appropriate environment
  const envFile = env === 'production' ? '.env.production' : '.env.local';
  require('dotenv').config({ path: envFile });

  const healthCheck = new DatabaseHealthCheck();

  try {
    const result = await healthCheck.runAllChecks(detailed);
    healthCheck.displayResults();
    
    // Exit with appropriate code
    process.exit(result.status === 'critical' ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseHealthCheck };