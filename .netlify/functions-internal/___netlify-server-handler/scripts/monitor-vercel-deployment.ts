#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

interface DeploymentStatus {
  url: string;
  isHealthy: boolean;
  responseTime: number;
  error?: string;
}

class VercelDeploymentMonitor {
  private baseUrl = 'https://astral-field-v1.vercel.app';
  private checkInterval = 30000; // 30 seconds
  private maxChecks = 20; // Monitor for 10 minutes max
  private currentChecks = 0;

  async startMonitoring(): Promise<void> {
    console.log(chalk.blue.bold('🔍 VERCEL DEPLOYMENT MONITOR STARTED\n'));
    console.log('═'.repeat(60));
    console.log(`Monitoring: ${chalk.cyan(this.baseUrl)}`);
    console.log(`Check interval: ${this.checkInterval / 1000}s`);
    console.log(`Max duration: ${(this.maxChecks * this.checkInterval) / 60000} minutes\n`);

    this.displayStatus('Starting monitoring...');

    const interval = setInterval(async () => {
      this.currentChecks++;
      
      try {
        const status = await this.checkDeploymentHealth();
        this.displayStatus(this.formatStatus(status));

        if (status.isHealthy) {
          console.log(chalk.green.bold('\n✅ DEPLOYMENT SUCCESSFUL - All systems operational!'));
          console.log(`🎯 Site accessible at: ${chalk.cyan(this.baseUrl)}`);
          clearInterval(interval);
          process.exit(0);
        }

        if (this.currentChecks >= this.maxChecks) {
          console.log(chalk.yellow.bold('\n⏰ Monitoring timeout reached'));
          clearInterval(interval);
          process.exit(1);
        }

      } catch (error: any) {
        console.log(chalk.red(`❌ Error: ${error.message}`));
        
        if (this.currentChecks >= this.maxChecks) {
          clearInterval(interval);
          process.exit(1);
        }
      }
    }, this.checkInterval);

    // Initial check
    try {
      const status = await this.checkDeploymentHealth();
      this.displayStatus(this.formatStatus(status));
    } catch (error: any) {
      this.displayStatus(`Initial check failed: ${error.message}`);
    }
  }

  private async checkDeploymentHealth(): Promise<DeploymentStatus> {
    const startTime = Date.now();
    
    try {
      // Check main site
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Deployment-Monitor/1.0' }
      });

      if (!response.ok) {
        return {
          url: this.baseUrl,
          isHealthy: false,
          responseTime: Date.now() - startTime,
          error: `HTTP ${response.status} ${response.statusText}`
        };
      }

      // Check health endpoint
      const healthResponse = await fetch(`${this.baseUrl}/api/health`);
      const healthData = await healthResponse.json();

      const isHealthy = healthResponse.ok && 
                       (healthData.status === 'operational' || healthData.status === 'ok');

      return {
        url: this.baseUrl,
        isHealthy,
        responseTime: Date.now() - startTime,
        error: isHealthy ? undefined : 'Health check failed'
      };

    } catch (error: any) {
      return {
        url: this.baseUrl,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private formatStatus(status: DeploymentStatus): string {
    const statusIcon = status.isHealthy ? chalk.green('✅') : chalk.red('❌');
    const timeStr = `${status.responseTime}ms`;
    
    if (status.isHealthy) {
      return `${statusIcon} Healthy - Response: ${chalk.green(timeStr)}`;
    } else {
      return `${statusIcon} Unhealthy - ${status.error} (${chalk.red(timeStr)})`;
    }
  }

  private displayStatus(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const checkNum = `${this.currentChecks}/${this.maxChecks}`;
    
    console.log(`[${chalk.gray(timestamp)}] [${chalk.blue(checkNum)}] ${message}`);
  }

  async triggerNewDeployment(): Promise<void> {
    console.log(chalk.yellow('🚀 Triggering new Vercel deployment...\n'));
    
    try {
      const { stdout, stderr } = await execAsync('npx vercel --prod');
      console.log('Deployment triggered:');
      console.log(stdout);
      
      if (stderr) {
        console.log(chalk.yellow('Warnings:'));
        console.log(stderr);
      }
      
    } catch (error: any) {
      console.log(chalk.red('Deployment trigger failed:'));
      console.log(error.message);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const monitor = new VercelDeploymentMonitor();

  console.log(chalk.blue.bold('🚀 VERCEL DEPLOYMENT MONITORING SYSTEM\n'));

  if (args.includes('--deploy')) {
    await monitor.triggerNewDeployment();
    console.log(chalk.blue('\nStarting monitoring after deployment...\n'));
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before monitoring
  }

  if (args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/monitor-vercel-deployment.ts [options]

Options:
  --deploy    Trigger a new deployment before monitoring
  --help      Show this help message

Examples:
  npx tsx scripts/monitor-vercel-deployment.ts
  npx tsx scripts/monitor-vercel-deployment.ts --deploy
    `);
    process.exit(0);
  }

  await monitor.startMonitoring();
}

if (require.main === module) {
  main().catch(console.error);
}

export { VercelDeploymentMonitor };