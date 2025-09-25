/**
 * Phase 3 Testing Suite Runner
 * Executes comprehensive tests for draft room, trade system, scoring, mobile PWA, and load testing
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface TestSummary {
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  suites: TestResult[];
}

class Phase3TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Starting Phase 3: Testing & Quality comprehensive suite...\n');
    this.startTime = Date.now();

    // Ensure test environment is ready
    await this.setupTestEnvironment();

    // Run all test suites
    const testSuites = [
      {
        name: 'Draft Room Integration Tests',
        command: 'npm',
        args: ['test', '__tests__/integration/draft-room.test.ts'],
      },
      {
        name: 'Trade System Integration Tests',
        command: 'npm',
        args: ['test', '__tests__/integration/trade-system.test.ts'],
      },
      {
        name: 'Scoring Validation Tests',
        command: 'npm',
        args: ['test', '__tests__/integration/scoring-validation.test.ts'],
      },
      {
        name: 'Mobile PWA Tests',
        command: 'npx',
        args: ['playwright', 'test', '__tests__/e2e/mobile-pwa.test.ts'],
      },
      {
        name: 'Load Testing',
        command: 'k6',
        args: ['run', '__tests__/load/load-test.js'],
      }
    ];

    // Run each test suite
    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite.name, suite.command, suite.args);
      this.results.push(result);
      
      if (result.failed > 0) {
        console.log(`❌ ${suite.name} had ${result.failed} failures`);
        result.errors.forEach(error => console.log(`   🔸 ${error}`));
      } else {
        console.log(`✅ ${suite.name} passed all tests`);
      }
    }

    // Generate summary report
    const summary = this.generateSummary();
    await this.generateReport(summary);
    
    return summary;
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Ensure database is ready
    try {
      await this.runCommand('npx', ['prisma', 'db', 'push']);
      console.log('✅ Database schema updated');
    } catch (error) {
      console.log('⚠️  Database setup warning:', error);
    }

    // Ensure test data is seeded
    try {
      await this.runCommand('npx', ['tsx', 'scripts/seed-test-league.ts']);
      console.log('✅ Test data seeded');
    } catch (error) {
      console.log('⚠️  Test data seeding warning:', error);
    }

    // Start development server for E2E tests
    console.log('🚀 Starting development server...');
    // Note: Server should be started in background before running tests
    
    // Wait for server to be ready
    await this.waitForServer('http://localhost:3000', 30000);
    console.log('✅ Development server ready');
  }

  private async runTestSuite(name: string, command: string, args: string[]): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const output = await this.runCommand(command, args);
      const duration = Date.now() - startTime;
      
      // Parse test results from output
      const result = this.parseTestOutput(name, output, duration);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        suite: name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private parseTestOutput(suiteName: string, output: string, duration: number): TestResult {
    // Parse different test output formats
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    if (suiteName.includes('Load Testing')) {
      // Parse K6 output
      const checksMatch = output.match(/checks\.+: (\d+\.\d+)% ✓ (\d+) ✗ (\d+)/);
      if (checksMatch) {
        passed = parseInt(checksMatch[2]);
        failed = parseInt(checksMatch[3]);
      }

      const httpFailuresMatch = output.match(/http_req_failed\.+: (\d+\.\d+)%/);
      if (httpFailuresMatch && parseFloat(httpFailuresMatch[1]) > 10) {
        errors.push(`HTTP failure rate too high: ${httpFailuresMatch[1]}%`);
      }

    } else if (suiteName.includes('Mobile PWA')) {
      // Parse Playwright output
      const playwrightMatch = output.match(/(\d+) passed.*?(\d+) failed.*?(\d+) skipped/);
      if (playwrightMatch) {
        passed = parseInt(playwrightMatch[1]);
        failed = parseInt(playwrightMatch[2]);
        skipped = parseInt(playwrightMatch[3]);
      }

      // Extract error messages
      const errorMatches = output.match(/Error: .*$/gm);
      if (errorMatches) {
        errors.push(...errorMatches);
      }

    } else {
      // Parse Jest output
      const jestMatch = output.match(/Tests:\s+(\d+) failed,\s+(\d+) passed,\s+(\d+) total/);
      if (jestMatch) {
        failed = parseInt(jestMatch[1]);
        passed = parseInt(jestMatch[2]);
      } else {
        // If no failures mentioned, assume all passed
        const passedMatch = output.match(/Tests:\s+(\d+) passed/);
        if (passedMatch) {
          passed = parseInt(passedMatch[1]);
        }
      }

      // Extract test failures
      const failureMatches = output.match(/● .*/g);
      if (failureMatches) {
        errors.push(...failureMatches.slice(0, 5)); // Limit to first 5 errors
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      errors
    };
  }

  private generateSummary(): TestSummary {
    const totalDuration = Date.now() - this.startTime;
    
    return {
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration,
      suites: this.results
    };
  }

  private async generateReport(summary: TestSummary): Promise<void> {
    const reportPath = path.join(process.cwd(), 'test-reports', 'phase3-results.json');
    const htmlReportPath = path.join(process.cwd(), 'test-reports', 'phase3-report.html');
    
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    // Generate JSON report
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(summary);
    await fs.writeFile(htmlReportPath, htmlReport);

    // Print summary to console
    this.printSummary(summary);
  }

  private generateHtmlReport(summary: TestSummary): string {
    const passRate = ((summary.totalPassed / (summary.totalPassed + summary.totalFailed)) * 100).toFixed(1);
    const durationMinutes = (summary.totalDuration / 60000).toFixed(1);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 3: Testing & Quality Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #10b981; }
        .metric.failed { border-left-color: #ef4444; }
        .metric h3 { margin: 0 0 10px 0; color: #374151; font-size: 14px; text-transform: uppercase; }
        .metric .value { font-size: 32px; font-weight: bold; color: #111827; }
        .suite { background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
        .suite-header { background: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .suite-body { padding: 20px; }
        .pass { color: #10b981; font-weight: bold; }
        .fail { color: #ef4444; font-weight: bold; }
        .error { background: #fef2f2; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 12px; }
        .progress { background: #e5e7eb; border-radius: 10px; overflow: hidden; height: 20px; margin: 10px 0; }
        .progress-bar { background: #10b981; height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Phase 3: Testing & Quality Report</h1>
        <p>Comprehensive test suite results for AstralField v2.1</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value pass">${summary.totalPassed}</div>
        </div>
        <div class="metric ${summary.totalFailed > 0 ? 'failed' : ''}">
            <h3>Failed</h3>
            <div class="value ${summary.totalFailed > 0 ? 'fail' : ''}">${summary.totalFailed}</div>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <div class="value">${passRate}%</div>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <div class="value">${durationMinutes}m</div>
        </div>
    </div>

    <div class="progress">
        <div class="progress-bar" style="width: ${passRate}%"></div>
    </div>

    ${summary.suites.map(suite => `
    <div class="suite">
        <div class="suite-header">
            <h2>${suite.suite}</h2>
            <p>
                <span class="pass">${suite.passed} passed</span> • 
                <span class="fail">${suite.failed} failed</span> • 
                ${suite.skipped} skipped • 
                ${(suite.duration / 1000).toFixed(1)}s
            </p>
        </div>
        ${suite.errors.length > 0 ? `
        <div class="suite-body">
            <h3>Errors:</h3>
            ${suite.errors.map(error => `<div class="error">${error}</div>`).join('')}
        </div>
        ` : ''}
    </div>
    `).join('')}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>Report generated by AstralField Phase 3 Test Runner</p>
        <p>For detailed logs, check the individual test output files.</p>
    </div>
</body>
</html>`;
  }

  private printSummary(summary: TestSummary): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 3 TESTING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.totalPassed}`);
    console.log(`❌ Failed: ${summary.totalFailed}`);
    console.log(`⏭️  Skipped: ${summary.totalSkipped}`);
    console.log(`⏱️  Duration: ${(summary.totalDuration / 60000).toFixed(1)} minutes`);
    console.log(`📈 Pass Rate: ${((summary.totalPassed / (summary.totalPassed + summary.totalFailed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (summary.totalFailed === 0) {
      console.log('🎉 All tests passed! Phase 3 is complete and ready for launch.');
    } else {
      console.log(`⚠️  ${summary.totalFailed} tests failed. Review the detailed report for fixes.`);
    }

    console.log('\n📋 Detailed Results:');
    summary.suites.forEach(suite => {
      const status = suite.failed === 0 ? '✅' : '❌';
      console.log(`${status} ${suite.suite}: ${suite.passed}/${suite.passed + suite.failed} passed`);
    });

    console.log('\n📄 Full HTML report generated at: test-reports/phase3-report.html');
  }

  private runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true 
      });
      
      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async waitForServer(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          return; // Server is responding
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server at ${url} did not start within ${timeout}ms`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new Phase3TestRunner();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AstralField Phase 3 Test Runner

Usage: npm run test:phase3 [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Show verbose output
  --suite <name> Run specific test suite only

Test Suites:
  - Draft Room Integration Tests
  - Trade System Integration Tests  
  - Scoring Validation Tests
  - Mobile PWA Tests
  - Load Testing

Examples:
  npm run test:phase3
  npm run test:phase3 --verbose
  npm run test:phase3 --suite "Draft Room"
`);
    process.exit(0);
  }

  try {
    const summary = await runner.runAllTests();
    
    if (summary.totalFailed > 0) {
      console.log('\n❌ Some tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All Phase 3 tests passed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { Phase3TestRunner };