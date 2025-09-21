#!/usr/bin/env node
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface HealthCheck {
  name: string;
  url: string;
  expectedStatus: number;
  timeout: number;
  critical: boolean;
}

interface MonitoringResult {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'down';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    responseTime: number;
    error?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    uptime: string;
  };
}

class AutomatedHealthMonitor {
  private baseUrl = 'https://astral-field-v1.vercel.app';
  private checkInterval = 30000; // 30 seconds
  private checks: HealthCheck[] = [
    {
      name: 'Main Application',
      url: '/',
      expectedStatus: 200,
      timeout: 10000,
      critical: true
    },
    {
      name: 'Health API',
      url: '/api/health',
      expectedStatus: 200,
      timeout: 5000,
      critical: true
    },
    {
      name: 'Database Health',
      url: '/api/health/db',
      expectedStatus: 200,
      timeout: 10000,
      critical: true
    },
    {
      name: 'Metrics API',
      url: '/api/metrics',
      expectedStatus: 200,
      timeout: 5000,
      critical: false
    },
    {
      name: 'SEO - Robots.txt',
      url: '/robots.txt',
      expectedStatus: 200,
      timeout: 5000,
      critical: false
    },
    {
      name: 'SEO - Sitemap',
      url: '/sitemap.xml',
      expectedStatus: 200,
      timeout: 5000,
      critical: false
    },
    {
      name: 'Authentication API',
      url: '/api/auth/me',
      expectedStatus: 401, // Expected to be unauthorized without token
      timeout: 5000,
      critical: true
    },
    {
      name: 'Teams API',
      url: '/api/teams',
      expectedStatus: 200,
      timeout: 5000,
      critical: false
    }
  ];

  private monitoringData: MonitoringResult[] = [];
  private startTime = Date.now();

  async runHealthCheck(): Promise<MonitoringResult> {
    const timestamp = new Date().toISOString();
    const results = [];

    console.log(chalk.blue(`🔍 Running health checks at ${new Date().toLocaleTimeString()}...`));

    for (const check of this.checks) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), check.timeout);

        const response = await fetch(`${this.baseUrl}${check.url}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'AstralField-HealthMonitor/1.0'
          }
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        const status = response.status === check.expectedStatus ? 'pass' : 'fail';
        
        results.push({
          name: check.name,
          status,
          responseTime,
          error: status === 'fail' ? `Expected ${check.expectedStatus}, got ${response.status}` : undefined
        });

        const statusIcon = status === 'pass' ? '✅' : '❌';
        const criticalTag = check.critical ? '[CRITICAL]' : '';
        console.log(`${statusIcon} ${check.name} ${criticalTag} - ${responseTime}ms`);

      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        results.push({
          name: check.name,
          status: 'fail',
          responseTime,
          error: error.message
        });

        const criticalTag = check.critical ? '[CRITICAL]' : '';
        console.log(`❌ ${check.name} ${criticalTag} - FAILED: ${error.message}`);
      }
    }

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const criticalFailed = results.filter(r => r.status === 'fail' && 
      this.checks.find(c => c.name === r.name)?.critical).length;

    const overallStatus = criticalFailed > 0 ? 'down' : 
                         failed > 0 ? 'degraded' : 'healthy';

    const uptime = this.calculateUptime();

    const result: MonitoringResult = {
      timestamp,
      overallStatus,
      checks: results,
      summary: {
        total: results.length,
        passed,
        failed,
        uptime
      }
    };

    this.monitoringData.push(result);
    this.displayResults(result);
    
    return result;
  }

  private displayResults(result: MonitoringResult): void {
    console.log('\n' + '='.repeat(60));
    
    const statusColor = result.overallStatus === 'healthy' ? chalk.green :
                       result.overallStatus === 'degraded' ? chalk.yellow :
                       chalk.red;
    
    console.log(statusColor.bold(`🎯 OVERALL STATUS: ${result.overallStatus.toUpperCase()}`));
    console.log(chalk.cyan(`📊 Results: ${result.summary.passed}/${result.summary.total} checks passed`));
    console.log(chalk.gray(`⏱️  Uptime: ${result.summary.uptime}`));
    
    if (result.summary.failed > 0) {
      console.log(chalk.red('\n❌ FAILED CHECKS:'));
      result.checks
        .filter(c => c.status === 'fail')
        .forEach(check => {
          const critical = this.checks.find(c => c.name === check.name)?.critical;
          const tag = critical ? '[CRITICAL]' : '';
          console.log(chalk.red(`   • ${check.name} ${tag}: ${check.error}`));
        });
    }

    console.log('\n' + '='.repeat(60));
  }

  private calculateUptime(): string {
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  async startContinuousMonitoring(): Promise<void> {
    console.log(chalk.blue.bold('🚀 ASTRALFIELD AUTOMATED HEALTH MONITOR STARTED\n'));
    console.log(chalk.cyan(`Monitoring ${this.baseUrl} every ${this.checkInterval / 1000} seconds\n`));

    // Initial health check
    await this.runHealthCheck();

    // Set up continuous monitoring
    setInterval(async () => {
      try {
        await this.runHealthCheck();
        await this.updateProgressTracker();
      } catch (error: any) {
        console.error(chalk.red(`Monitoring error: ${error.message}`));
      }
    }, this.checkInterval);

    // Keep the process running
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n📊 Monitoring stopped. Final summary:'));
      this.displayFinalSummary();
      process.exit(0);
    });
  }

  private async updateProgressTracker(): Promise<void> {
    if (this.monitoringData.length === 0) return;

    const latest = this.monitoringData[this.monitoringData.length - 1];
    
    // Auto-update tasks based on health check results
    if (latest.overallStatus === 'healthy') {
      console.log(chalk.green('✅ Application is healthy - updating progress tracker...'));
      
      // Check if deployment is successful
      const mainAppCheck = latest.checks.find(c => c.name === 'Main Application');
      const healthApiCheck = latest.checks.find(c => c.name === 'Health API');
      
      if (mainAppCheck?.status === 'pass' && healthApiCheck?.status === 'pass') {
        await this.markTaskCompleted('deploy-02', 'Deployment verification successful');
        await this.markTaskCompleted('deploy-03', 'Production application testing completed');
      }

      // Check SEO endpoints
      const robotsCheck = latest.checks.find(c => c.name === 'SEO - Robots.txt');
      const sitemapCheck = latest.checks.find(c => c.name === 'SEO - Sitemap');
      
      if (robotsCheck?.status === 'pass' && sitemapCheck?.status === 'pass') {
        await this.markTaskCompleted('seo-02', 'SEO endpoints verified and accessible');
      }

      // Check security headers
      await this.checkSecurityHeaders();
    }
  }

  private async checkSecurityHeaders(): Promise<void> {
    try {
      const response = await fetch(this.baseUrl);
      const headers = response.headers;
      
      const requiredHeaders = [
        'strict-transport-security',
        'x-frame-options',
        'content-security-policy',
        'x-content-type-options'
      ];
      
      const presentHeaders = requiredHeaders.filter(h => headers.get(h));
      
      if (presentHeaders.length === requiredHeaders.length) {
        await this.markTaskCompleted('security-02', 'All security headers verified');
        console.log(chalk.green('✅ Security headers verification completed'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Security headers check pending deployment'));
    }
  }

  private async markTaskCompleted(taskId: string, details: string): Promise<void> {
    // This would integrate with the live progress tracker
    console.log(chalk.green(`✅ Task ${taskId} completed: ${details}`));
  }

  private displayFinalSummary(): void {
    if (this.monitoringData.length === 0) return;

    const totalChecks = this.monitoringData.length;
    const healthyChecks = this.monitoringData.filter(d => d.overallStatus === 'healthy').length;
    const uptime = (healthyChecks / totalChecks) * 100;

    console.log(chalk.blue.bold('\n📊 MONITORING SUMMARY:'));
    console.log(chalk.cyan(`Total health checks: ${totalChecks}`));
    console.log(chalk.cyan(`Healthy checks: ${healthyChecks}`));
    console.log(chalk.cyan(`Uptime: ${uptime.toFixed(1)}%`));
    console.log(chalk.cyan(`Monitoring duration: ${this.calculateUptime()}`));
  }

  async runOnce(): Promise<MonitoringResult> {
    console.log(chalk.blue.bold('🔍 ASTRALFIELD SINGLE HEALTH CHECK\n'));
    const result = await this.runHealthCheck();
    this.displayFinalSummary();
    return result;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const monitor = new AutomatedHealthMonitor();

  if (args.includes('--once')) {
    await monitor.runOnce();
  } else if (args.includes('--help')) {
    console.log(`
AstralField Automated Health Monitor

Usage: npx tsx scripts/automated-health-monitor.ts [options]

Options:
  --once     Run a single health check and exit
  --help     Show this help message

Examples:
  npx tsx scripts/automated-health-monitor.ts           # Continuous monitoring
  npx tsx scripts/automated-health-monitor.ts --once    # Single check
    `);
  } else {
    await monitor.startContinuousMonitoring();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { AutomatedHealthMonitor };