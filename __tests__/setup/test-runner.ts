/**
 * Test Runner Configuration and Utilities
 * Orchestrates different test suites and provides reporting
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  description: string;
  pattern: string;
  timeout?: number;
  coverage?: boolean;
  parallel?: boolean;
  env?: Record<string, string>;
}

interface TestResults {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

class FantasyFootballTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'unit-auth',
      description: 'Authentication & Authorization Unit Tests',
      pattern: '__tests__/unit/lib/auth.test.ts',
      timeout: 30000,
      coverage: true,
    },
    {
      name: 'unit-api',
      description: 'API Route Handler Unit Tests',
      pattern: '__tests__/unit/api/**/*.test.ts',
      timeout: 45000,
      coverage: true,
      parallel: true,
    },
    {
      name: 'unit-components',
      description: 'React Component Unit Tests',
      pattern: '__tests__/unit/components/**/*.test.tsx',
      timeout: 60000,
      coverage: true,
    },
    {
      name: 'unit-domain',
      description: 'Fantasy Football Domain Logic Tests',
      pattern: '__tests__/unit/domain/**/*.test.ts',
      timeout: 30000,
      coverage: true,
    },
    {
      name: 'unit-security',
      description: 'Security & Vulnerability Tests',
      pattern: '__tests__/unit/security/**/*.test.ts',
      timeout: 45000,
      coverage: true,
    },
    {
      name: 'integration',
      description: 'Integration Tests (API & Database)',
      pattern: '__tests__/integration/**/*.test.ts',
      timeout: 120000,
      coverage: true,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_fantasy_db',
      },
    },
    {
      name: 'performance',
      description: 'Performance & Load Tests',
      pattern: '__tests__/performance/**/*.test.ts',
      timeout: 180000,
      coverage: false,
      env: {
        NODE_ENV: 'test',
        PERFORMANCE_TEST: 'true',
      },
    },
    {
      name: 'e2e',
      description: 'End-to-End User Workflow Tests',
      pattern: '__tests__/e2e/**/*.test.ts',
      timeout: 300000,
      coverage: false,
      env: {
        NODE_ENV: 'test',
        E2E_TEST: 'true',
      },
    },
  ];

  private results: TestResults[] = [];

  async runSuite(suiteName: string): Promise<TestResults> {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    console.log(`\n🏈 Running ${suite.description}...`);
    console.log(`Pattern: ${suite.pattern}`);

    const startTime = Date.now();
    
    try {
      // Build Jest command
      const jestCommand = this.buildJestCommand(suite);
      
      // Set environment variables
      const env = { ...process.env, ...suite.env };
      
      // Execute tests
      const output = execSync(jestCommand, {
        encoding: 'utf8',
        env,
        stdio: 'pipe',
      });

      const duration = Date.now() - startTime;
      const results = this.parseJestOutput(output, suite.name, duration);
      
      console.log(`✅ ${suite.description} completed in ${duration}ms`);
      console.log(`   Passed: ${results.passed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
      
      if (results.coverage) {
        console.log(`   Coverage: ${results.coverage.statements}% statements, ${results.coverage.lines}% lines`);
      }

      this.results.push(results);
      return results;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${suite.description} failed after ${duration}ms`);
      console.error(error.message);

      const failedResults: TestResults = {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
      };

      this.results.push(failedResults);
      return failedResults;
    }
  }

  async runAll(options: { 
    sequential?: boolean; 
    failFast?: boolean; 
    suites?: string[];
  } = {}): Promise<TestResults[]> {
    const { sequential = false, failFast = false, suites } = options;
    
    const suitesToRun = suites ? 
      this.testSuites.filter(s => suites.includes(s.name)) : 
      this.testSuites;

    console.log(`\n🚀 Running Fantasy Football Test Suite`);
    console.log(`Suites: ${suitesToRun.map(s => s.name).join(', ')}`);
    console.log(`Mode: ${sequential ? 'Sequential' : 'Parallel'}`);

    this.results = []; // Reset results

    if (sequential) {
      // Run tests sequentially
      for (const suite of suitesToRun) {
        const result = await this.runSuite(suite.name);
        
        if (failFast && result.failed > 0) {
          console.log(`\n⏹️ Stopping due to failures in ${suite.name}`);
          break;
        }
      }
    } else {
      // Run tests in parallel (with some limitations)
      const unitTests = suitesToRun.filter(s => s.name.startsWith('unit-'));
      const heavyTests = suitesToRun.filter(s => !s.name.startsWith('unit-'));

      // Run unit tests in parallel
      if (unitTests.length > 0) {
        console.log('\n📋 Running unit tests in parallel...');
        await Promise.all(unitTests.map(suite => this.runSuite(suite.name)));
      }

      // Run heavy tests sequentially to avoid resource conflicts
      if (heavyTests.length > 0) {
        console.log('\n🔄 Running integration/performance tests sequentially...');
        for (const suite of heavyTests) {
          const result = await this.runSuite(suite.name);
          
          if (failFast && result.failed > 0) {
            console.log(`\n⏹️ Stopping due to failures in ${suite.name}`);
            break;
          }
        }
      }
    }

    return this.results;
  }

  async runCI(): Promise<boolean> {
    console.log('\n🤖 Running CI Test Suite for Fantasy Football Platform');
    
    // Check prerequisites
    await this.checkPrerequisites();
    
    // Run all tests except performance (CI focuses on correctness)
    const ciSuites = this.testSuites
      .filter(s => s.name !== 'performance')
      .map(s => s.name);

    const results = await this.runAll({ 
      sequential: false, 
      failFast: true,
      suites: ciSuites,
    });

    // Generate CI report
    this.generateCIReport(results);

    // Check if all tests passed
    const totalFailed = results.reduce((sum, result) => sum + result.failed, 0);
    const success = totalFailed === 0;

    if (success) {
      console.log('\n🎉 All CI tests passed! Ready for deployment.');
    } else {
      console.log(`\n❌ CI tests failed. ${totalFailed} test(s) failed.`);
    }

    return success;
  }

  async runQuick(): Promise<TestResults[]> {
    console.log('\n⚡ Running Quick Test Suite (Unit Tests Only)');
    
    const quickSuites = this.testSuites
      .filter(s => s.name.startsWith('unit-'))
      .map(s => s.name);

    return this.runAll({ 
      sequential: false, 
      suites: quickSuites,
    });
  }

  async runCoverage(): Promise<TestResults[]> {
    console.log('\n📊 Running Coverage Analysis');
    
    // Run all tests that support coverage
    const coverageSuites = this.testSuites
      .filter(s => s.coverage)
      .map(s => s.name);

    const results = await this.runAll({ 
      sequential: true, 
      suites: coverageSuites,
    });

    // Generate coverage report
    this.generateCoverageReport(results);

    return results;
  }

  private buildJestCommand(suite: TestSuite): string {
    const baseCommand = 'npx jest';
    const parts = [baseCommand];

    // Test pattern
    parts.push(`"${suite.pattern}"`);

    // Timeout
    if (suite.timeout) {
      parts.push(`--testTimeout=${suite.timeout}`);
    }

    // Coverage
    if (suite.coverage) {
      parts.push('--coverage');
      parts.push('--coverageReporters=json-summary');
      parts.push('--coverageReporters=text');
    }

    // Parallel execution
    if (suite.parallel) {
      parts.push('--maxWorkers=50%');
    } else {
      parts.push('--runInBand');
    }

    // Output format
    parts.push('--verbose');
    parts.push('--passWithNoTests');

    return parts.join(' ');
  }

  private parseJestOutput(output: string, suiteName: string, duration: number): TestResults {
    // Parse Jest output to extract test results
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let coverage: TestResults['coverage'];

    // Look for test summary
    for (const line of lines) {
      if (line.includes('passed')) {
        const match = line.match(/(\d+)\s+passed/);
        if (match) passed = parseInt(match[1]);
      }
      
      if (line.includes('failed')) {
        const match = line.match(/(\d+)\s+failed/);
        if (match) failed = parseInt(match[1]);
      }
      
      if (line.includes('skipped')) {
        const match = line.match(/(\d+)\s+skipped/);
        if (match) skipped = parseInt(match[1]);
      }

      // Parse coverage summary
      if (line.includes('Statements') && line.includes('%')) {
        const statements = this.extractCoveragePercentage(line);
        coverage = {
          statements,
          branches: 0,
          functions: 0,
          lines: 0,
        };
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      coverage,
    };
  }

  private extractCoveragePercentage(line: string): number {
    const match = line.match(/(\d+\.?\d*)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking test prerequisites...');

    // Check if Jest is available
    try {
      execSync('npx jest --version', { stdio: 'pipe' });
      console.log('✅ Jest is available');
    } catch {
      throw new Error('Jest is not available. Run npm install first.');
    }

    // Check if test database is configured
    const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('⚠️ No test database configured, using in-memory tests');
    } else {
      console.log('✅ Test database configured');
    }

    // Check if required test files exist
    const requiredFiles = [
      '__tests__/utils/test-helpers.ts',
      'jest.config.js',
      'jest.setup.js',
    ];

    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required test file missing: ${file}`);
      }
    }

    console.log('✅ All prerequisites met');
  }

  private generateCIReport(results: TestResults[]): void {
    const report = {
      timestamp: new Date().toISOString(),
      environment: 'CI',
      totalSuites: results.length,
      totalTests: results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      success: results.every(r => r.failed === 0),
      suites: results,
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'test-results-ci.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📝 CI report written to: ${reportPath}`);
  }

  private generateCoverageReport(results: TestResults[]): void {
    const coverageResults = results.filter(r => r.coverage);
    
    if (coverageResults.length === 0) {
      console.log('⚠️ No coverage data available');
      return;
    }

    console.log('\n📊 Coverage Summary:');
    console.log('─'.repeat(50));
    
    for (const result of coverageResults) {
      if (result.coverage) {
        console.log(`${result.suite}:`);
        console.log(`  Statements: ${result.coverage.statements}%`);
        console.log(`  Lines: ${result.coverage.lines}%`);
      }
    }

    // Calculate overall coverage
    const avgStatements = coverageResults.reduce((sum, r) => 
      sum + (r.coverage?.statements || 0), 0) / coverageResults.length;
    
    console.log('─'.repeat(50));
    console.log(`Overall Average: ${avgStatements.toFixed(1)}%`);

    if (avgStatements >= 80) {
      console.log('🎯 Excellent test coverage!');
    } else if (avgStatements >= 60) {
      console.log('👍 Good test coverage');
    } else {
      console.log('⚠️ Test coverage could be improved');
    }
  }

  getSummary(): { 
    totalSuites: number; 
    totalTests: number; 
    totalPassed: number; 
    totalFailed: number; 
    success: boolean; 
  } {
    return {
      totalSuites: this.results.length,
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      success: this.results.every(r => r.failed === 0),
    };
  }
}

// CLI Interface
if (require.main === module) {
  const runner = new FantasyFootballTestRunner();
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'all':
          await runner.runAll();
          break;
        case 'ci':
          const success = await runner.runCI();
          process.exit(success ? 0 : 1);
          break;
        case 'quick':
          await runner.runQuick();
          break;
        case 'coverage':
          await runner.runCoverage();
          break;
        case 'unit':
          await runner.runAll({ suites: ['unit-auth', 'unit-api', 'unit-components', 'unit-domain'] });
          break;
        case 'integration':
          await runner.runAll({ suites: ['integration'] });
          break;
        case 'performance':
          await runner.runAll({ suites: ['performance'] });
          break;
        case 'security':
          await runner.runAll({ suites: ['unit-security'] });
          break;
        case 'e2e':
          await runner.runAll({ suites: ['e2e'] });
          break;
        default:
          if (command) {
            await runner.runSuite(command);
          } else {
            console.log(`
🏈 Fantasy Football Platform Test Runner

Usage: npm run test:[command]

Commands:
  quick      - Run unit tests only (fast)
  all        - Run all test suites
  ci         - Run CI test suite (excludes performance)
  coverage   - Run tests with coverage analysis
  unit       - Run all unit tests
  integration- Run integration tests
  performance- Run performance tests
  security   - Run security tests
  e2e        - Run end-to-end tests

Individual test suites:
  unit-auth     - Authentication tests
  unit-api      - API route tests
  unit-components - React component tests
  unit-domain   - Fantasy football domain tests
  unit-security - Security tests

Examples:
  npm run test:quick
  npm run test:ci
  npm run test:coverage
  npm run test:unit-auth
            `);
          }
      }

      if (command && command !== 'ci') {
        const summary = runner.getSummary();
        console.log('\n🏆 Test Summary:');
        console.log(`Total Suites: ${summary.totalSuites}`);
        console.log(`Total Tests: ${summary.totalTests}`);
        console.log(`Passed: ${summary.totalPassed}`);
        console.log(`Failed: ${summary.totalFailed}`);
        console.log(`Status: ${summary.success ? '✅ PASS' : '❌ FAIL'}`);
      }

    } catch (error) {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    }
  })();
}

export default FantasyFootballTestRunner;