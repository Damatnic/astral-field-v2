#!/usr/bin/env tsx

/**
 * Database Backup Script for AstralField v2.1
 * Creates a timestamped backup of the PostgreSQL database
 * 
 * Usage:
 * npm run db:backup
 * npm run db:backup -- --env production
 * npm run db:backup -- --tables users,leagues
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface BackupOptions {
  env?: string;
  tables?: string[];
  outputDir?: string;
  compress?: boolean;
}

class DatabaseBackup {
  private readonly backupDir: string;
  
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  private getDatabaseUrl(env: string = 'development'): string {
    // Load appropriate environment file
    const envFile = env === 'production' ? '.env.production' : '.env.local';
    require('dotenv').config({ path: envFile });
    
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
    if (!dbUrl) {
      throw new Error(`DATABASE_URL not found in ${envFile}`);
    }
    
    return dbUrl;
  }

  private generateFilename(env: string, options: BackupOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tablesSuffix = options.tables ? `_${options.tables.join('-')}` : '';
    const extension = options.compress ? '.sql.gz' : '.sql';
    
    return `astralfield_${env}_${timestamp}${tablesSuffix}${extension}`;
  }

  async createBackup(options: BackupOptions = {}): Promise<string> {
    const {
      env = 'development',
      tables = [],
      compress = true
    } = options;

    try {
      console.log(`🚀 Starting database backup for ${env} environment...`);
      
      const dbUrl = this.getDatabaseUrl(env);
      const filename = this.generateFilename(env, { ...options, compress });
      const backupPath = path.join(this.backupDir, filename);

      // Build pg_dump command
      let command = `pg_dump "${dbUrl}" --no-password --verbose`;
      
      // Add table filtering if specified
      if (tables.length > 0) {
        const tableArgs = tables.map(table => `--table=${table}`).join(' ');
        command += ` ${tableArgs}`;
      }

      // Add compression if enabled
      if (compress) {
        command += ` | gzip > "${backupPath}"`;
      } else {
        command += ` > "${backupPath}"`;
      }

      console.log(`📊 Executing: ${command.replace(dbUrl, '[DATABASE_URL]')}`);
      
      const startTime = Date.now();
      await execAsync(command);
      const duration = Date.now() - startTime;

      // Get file size for reporting
      const { size } = await import('fs').then(fs => fs.promises.stat(backupPath));
      const sizeKB = Math.round(size / 1024);

      console.log(`✅ Backup completed successfully!`);
      console.log(`📁 File: ${backupPath}`);
      console.log(`📊 Size: ${sizeKB} KB`);
      console.log(`⏱️ Duration: ${duration}ms`);

      return backupPath;

    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<void> {
    try {
      const { readdir, stat } = await import('fs').then(fs => fs.promises);
      const files = await readdir(this.backupDir);
      const backupFiles = files.filter(file => file.includes('astralfield_'));

      if (backupFiles.length === 0) {
        console.log('📁 No backups found');
        return;
      }

      console.log(`📋 Found ${backupFiles.length} backup(s):`);
      
      for (const file of backupFiles.sort().reverse()) {
        const filePath = path.join(this.backupDir, file);
        const stats = await stat(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        const date = stats.mtime.toISOString().split('T')[0];
        
        console.log(`  📄 ${file} (${sizeKB} KB, ${date})`);
      }
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const backup = new DatabaseBackup();

  // Parse command line arguments
  const options: BackupOptions = {};
  let command = 'backup';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--env' && args[i + 1]) {
      options.env = args[++i];
    } else if (arg === '--tables' && args[i + 1]) {
      options.tables = args[++i].split(',');
    } else if (arg === '--no-compress') {
      options.compress = false;
    } else if (arg === '--list') {
      command = 'list';
    }
  }

  try {
    if (command === 'list') {
      await backup.listBackups();
    } else {
      await backup.createBackup(options);
    }
  } catch (error) {
    console.error('💥 Operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseBackup };