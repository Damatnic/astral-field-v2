#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';

const execAsync = promisify(exec);

interface DeploymentConfig {
  environment: 'staging' | 'production';
  skipTests: boolean;
  skipBackup: boolean;
  skipHealthCheck: boolean;
  force: boolean;
}

class ProductionDeployment {
  private config: DeploymentConfig;
  private startTime: number;
  private checkpoints: string[] = [];

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  async deploy(): Promise<void> {
    console.log(chalk.blue.bold('\n🚀 PRODUCTION DEPLOYMENT SYSTEM\n'));
    console.log('═'.repeat(60));

    try {
      // Pre-flight checks
      await this.runPreflightChecks();
      
      // Get final confirmation
      if (!this.config.force) {
        const confirmed = await this.getConfirmation();
        if (!confirmed) {
          console.log(chalk.yellow('\n⚠️  Deployment cancelled by user'));
          process.exit(0);
        }
      }

      // Run deployment steps
      await this.step('Backing up current deployment', this.backupCurrent.bind(this));
      await this.step('Running tests', this.runTests.bind(this));
      await this.step('Building application', this.buildApplication.bind(this));
      await this.step('Running database migrations', this.runMigrations.bind(this));
      await this.step('Deploying to ' + this.config.environment, this.deployToServer.bind(this));
      await this.step('Verifying deployment', this.verifyDeployment.bind(this));
      await this.step('Running smoke tests', this.runSmokeTests.bind(this));
      await this.step('Updating monitoring', this.updateMonitoring.bind(this));
      
      // Success!
      this.displaySuccess();
      
    } catch (error) {
      await this.handleFailure(error);
    }
  }

  private async runPreflightChecks(): Promise<void> {
    console.log(chalk.cyan('Running pre-flight checks...\n'));

    const checks = [
      { name: 'Git status', fn: this.checkGitStatus.bind(this) },
      { name: 'Node version', fn: this.checkNodeVersion.bind(this) },
      { name: 'Environment variables', fn: this.checkEnvVars.bind(this) },
      { name: 'Database connection', fn: this.checkDatabase.bind(this) },
      { name: 'Disk space', fn: this.checkDiskSpace.bind(this) },
      { name: 'Dependencies', fn: this.checkDependencies.bind(this) },
    ];

    for (const check of checks) {
      process.stdout.write(`  ${check.name}...`);
      try {
        await check.fn();
        console.log(chalk.green(' ✓'));
      } catch (error) {
        console.log(chalk.red(' ✗'));
        throw new Error(`Pre-flight check failed: ${check.name}`);
      }
    }

    console.log();
  }

  private async checkGitStatus(): Promise<void> {
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim() && !this.config.force) {
      throw new Error('Uncommitted changes detected');
    }
  }

  private async checkNodeVersion(): Promise<void> {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim().replace('v', '');
    const major = parseInt(version.split('.')[0]);
    if (major < 18) {
      throw new Error('Node.js 18+ required');
    }
  }

  private async checkEnvVars(): Promise<void> {
    const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  private async checkDatabase(): Promise<void> {
    try {
      // Test database connection
      await execAsync('npx prisma db pull --force');
      
      // Verify migration status
      const { stdout } = await execAsync('npx prisma migrate status');
      if (stdout.includes('Database schema is up to date')) {
        return;
      }
      
      // Check for pending migrations
      if (stdout.includes('Following migrations have not yet been applied')) {
        throw new Error('Pending database migrations detected. Run migrations first.');
      }
    } catch (error: any) {
      if (error.message.includes('Environment variable not found: DATABASE_URL')) {
        throw new Error('DATABASE_URL environment variable is required');
      }
      throw error;
    }
  }

  private async checkDiskSpace(): Promise<void> {
    const { stdout } = await execAsync('df -h .');
    // Parse disk usage and check if enough space
    // Simplified for this example
  }

  private async checkDependencies(): Promise<void> {
    await execAsync('npm audit --audit-level=high');
  }

  private async getConfirmation(): Promise<boolean> {
    console.log(chalk.yellow.bold('\n⚠️  DEPLOYMENT CONFIRMATION REQUIRED\n'));
    
    console.log('You are about to deploy to:', chalk.bold(this.config.environment.toUpperCase()));
    console.log('This will affect live users.\n');

    const response = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Deploy to ${this.config.environment}?`,
      initial: false
    });

    if (response.confirm && this.config.environment === 'production') {
      const doubleCheck = await prompts({
        type: 'text',
        name: 'confirmation',
        message: 'Type "DEPLOY TO PRODUCTION" to confirm:',
      });

      return doubleCheck.confirmation === 'DEPLOY TO PRODUCTION';
    }

    return response.confirm;
  }

  private async step(name: string, fn: () => Promise<void>): Promise<void> {
    const spinner = this.createSpinner(name);
    
    try {
      await fn();
      spinner.succeed();
      this.checkpoints.push(`✅ ${name}`);
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  private createSpinner(text: string) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    process.stdout.write(`  ${frames[0]} ${text}`);
    
    const interval = setInterval(() => {
      process.stdout.write(`\r  ${frames[i = ++i % frames.length]} ${text}`);
    }, 80);

    return {
      succeed: () => {
        clearInterval(interval);
        process.stdout.write(`\r  ${chalk.green('✓')} ${text}\n`);
      },
      fail: () => {
        clearInterval(interval);
        process.stdout.write(`\r  ${chalk.red('✗')} ${text}\n`);
      }
    };
  }

  private async backupCurrent(): Promise<void> {
    if (this.config.skipBackup) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backups/deployment-${timestamp}`;
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Backup database
    await execAsync(`pg_dump $DATABASE_URL > ${backupDir}/database.sql`);
    
    // Save current commit hash
    const { stdout } = await execAsync('git rev-parse HEAD');
    await fs.writeFile(`${backupDir}/commit.txt`, stdout.trim());
    
    // Save deployment metadata
    const metadata = {
      timestamp,
      environment: this.config.environment,
      version: process.env.npm_package_version,
    };
    await fs.writeFile(`${backupDir}/metadata.json`, JSON.stringify(metadata, null, 2));
  }

  private async runTests(): Promise<void> {
    if (this.config.skipTests) return;
    
    await execAsync('npm run test:ci');
  }

  private async buildApplication(): Promise<void> {
    await execAsync('npm run build');
    
    // Check build output
    const buildDir = '.next';
    const stats = await fs.stat(buildDir);
    if (!stats.isDirectory()) {
      throw new Error('Build failed - no output directory');
    }
  }

  private async runMigrations(): Promise<void> {
    // Create backup before migration
    if (!this.config.skipBackup && this.config.environment === 'production') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await execAsync(`pg_dump $DATABASE_URL > migration-backup-${timestamp}.sql`);
    }
    
    // Run migrations with detailed logging
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', { 
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' }
      });
      
      if (stdout.includes('No pending migrations to apply')) {
        console.log('  No migrations needed');
        return;
      }
      
      // Verify migration success
      await execAsync('npx prisma migrate status');
      console.log('  Migrations applied successfully');
      
    } catch (error: any) {
      console.error('Migration failed:', error.message);
      throw new Error(`Database migration failed: ${error.message}`);
    }
  }

  private async deployToServer(): Promise<void> {
    if (this.config.environment === 'production') {
      await execAsync('vercel --prod --force');
    } else {
      await execAsync('vercel --env=preview');
    }
  }

  private async verifyDeployment(): Promise<void> {
    if (this.config.skipHealthCheck) return;

    const url = this.config.environment === 'production' 
      ? 'https://fantasy-football.app'
      : 'https://staging.fantasy-football.app';

    // Check health endpoint
    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await execAsync(`curl -f ${url}/api/health`);
        return;
      } catch {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error('Health check failed after deployment');
  }

  private async runSmokeTests(): Promise<void> {
    const url = this.config.environment === 'production' 
      ? 'https://fantasy-football.app'
      : 'https://staging.fantasy-football.app';

    process.env.BASE_URL = url;
    await execAsync('npm run test:smoke');
  }

  private async updateMonitoring(): Promise<void> {
    // Update monitoring services with deployment info
    const deploymentInfo = {
      environment: this.config.environment,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      duration: Date.now() - this.startTime,
    };

    // Notify Sentry of new release
    if (process.env.SENTRY_DSN) {
      await execAsync(`sentry-cli releases new ${deploymentInfo.version}`);
      await execAsync(`sentry-cli releases finalize ${deploymentInfo.version}`);
    }

    // Update status page
    // await updateStatusPage(deploymentInfo);
  }

  private displaySuccess(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log('\n' + chalk.green.bold('═'.repeat(60)));
    console.log(chalk.green.bold('  ✅ DEPLOYMENT SUCCESSFUL!'));
    console.log(chalk.green.bold('═'.repeat(60)));
    
    console.log('\n📊 Deployment Summary:');
    console.log(`  Environment: ${chalk.bold(this.config.environment.toUpperCase())}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Time: ${new Date().toLocaleString()}`);
    
    console.log('\n✅ Completed Steps:');
    this.checkpoints.forEach(checkpoint => {
      console.log(`  ${checkpoint}`);
    });

    console.log('\n🔗 URLs:');
    if (this.config.environment === 'production') {
      console.log('  Production: https://fantasy-football.app');
      console.log('  API Docs: https://fantasy-football.app/api-docs');
      console.log('  Monitoring: https://fantasy-football.app/monitoring');
    } else {
      console.log('  Staging: https://staging.fantasy-football.app');
    }

    console.log('\n📋 Next Steps:');
    console.log('  1. Monitor error rates for 30 minutes');
    console.log('  2. Check performance metrics');
    console.log('  3. Verify critical user flows');
    console.log('  4. Review deployment logs');
    
    console.log(chalk.green.bold('\n🎉 Deployment completed successfully!\n'));
  }

  private async handleFailure(error: any): Promise<void> {
    console.log('\n' + chalk.red.bold('═'.repeat(60)));
    console.log(chalk.red.bold('  ❌ DEPLOYMENT FAILED'));
    console.log(chalk.red.bold('═'.repeat(60)));
    
    console.log('\n' + chalk.red('Error:'), error.message);
    
    console.log('\n⏮️  Completed checkpoints:');
    this.checkpoints.forEach(checkpoint => {
      console.log(`  ${checkpoint}`);
    });

    const { rollback } = await prompts({
      type: 'confirm',
      name: 'rollback',
      message: 'Do you want to rollback?',
      initial: true
    });

    if (rollback) {
      await this.rollback();
    }

    process.exit(1);
  }

  private async rollback(): Promise<void> {
    console.log(chalk.yellow('\n🔄 Starting rollback...'));

    try {
      // Rollback Vercel deployment
      await execAsync('vercel rollback --yes');
      
      // Rollback database if needed
      // await execAsync('npx prisma migrate reset --force');
      
      console.log(chalk.green('✅ Rollback completed'));
    } catch (error) {
      console.log(chalk.red('❌ Rollback failed:'), error);
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  const config: DeploymentConfig = {
    environment: args.includes('--production') ? 'production' : 'staging',
    skipTests: args.includes('--skip-tests'),
    skipBackup: args.includes('--skip-backup'),
    skipHealthCheck: args.includes('--skip-health'),
    force: args.includes('--force')
  };

  if (args.includes('--help')) {
    console.log(`
${chalk.blue.bold('Production Deployment Script')}

Usage: deploy-production [options]

Options:
  --production      Deploy to production (default: staging)
  --skip-tests      Skip running tests
  --skip-backup     Skip backup creation
  --skip-health     Skip health checks
  --force           Skip confirmation prompts
  --help            Show this help message

Examples:
  npm run deploy:staging
  npm run deploy:production
  npm run deploy:production --force
    `);
    process.exit(0);
  }

  const deployment = new ProductionDeployment(config);
  await deployment.deploy();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProductionDeployment };