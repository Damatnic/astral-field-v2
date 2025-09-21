/**
 * Comprehensive Performance Testing Suite Runner
 * Orchestrates all performance tests and generates optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { performance } = require('perf_hooks');

// Import test modules
const DraftLoadTester = require('./load-test-draft');
const ScoringLoadTester = require('./load-test-scoring');
const APILoadTester = require('./load-test-api');
const MemoryTester = require('./memory-test');
const DatabasePerformanceTester = require('./database-performance');

class PerformanceTestRunner {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || 'scripts/performance/reports';
    this.testSuite = options.testSuite || 'comprehensive';
    this.parallel = options.parallel || false;
    
    this.results = {
      summary: {
        startTime: null,
        endTime: null,
        duration: 0,
        testsRun: [],
        totalIssues: 0,
        criticalIssues: 0,
        overallScore: 0
      },
      tests: {},
      recommendations: [],
      optimizations: []
    };

    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive Performance Testing Suite');
    console.log('=' .repeat(60));
    console.log(`Target URL: ${this.baseUrl}`);
    console.log(`Output Directory: ${this.outputDir}`);
    console.log(`Test Suite: ${this.testSuite}`);
    console.log(`Parallel Execution: ${this.parallel}`);
    console.log('');

    this.results.summary.startTime = new Date().toISOString();
    const startTime = performance.now();

    try {
      // Check if server is running
      await this.checkServerHealth();

      // Run tests based on suite type
      switch (this.testSuite) {
        case 'quick':
          await this.runQuickTests();
          break;
        case 'load':
          await this.runLoadTests();
          break;
        case 'comprehensive':
          await this.runAllTests();
          break;
        default:
          await this.runAllTests();
      }

      // Generate optimization recommendations
      await this.generateOptimizationRecommendations();

      // Generate final report
      await this.generateFinalReport();

    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      this.results.summary.error = error.message;
    } finally {
      const endTime = performance.now();
      this.results.summary.endTime = new Date().toISOString();
      this.results.summary.duration = Math.round(endTime - startTime);
      
      console.log('\n📊 Performance Testing Complete');
      console.log(`Duration: ${Math.round(this.results.summary.duration / 1000)} seconds`);
      console.log(`Tests Run: ${this.results.summary.testsRun.length}`);
      console.log(`Overall Score: ${this.results.summary.overallScore}/100`);
    }
  }

  async checkServerHealth() {
    console.log('🔍 Checking server health...');
    
    try {
      const response = await this.makeHealthCheck();
      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.status}`);
      }
      console.log('✅ Server is healthy and ready for testing');
    } catch (error) {
      console.warn('⚠️ Health check failed, but continuing with tests:', error.message);
    }
  }

  async makeHealthCheck() {
    const { default: fetch } = await import('node-fetch');
    return fetch(`${this.baseUrl}/api/health`, { timeout: 5000 });
  }

  async runQuickTests() {
    console.log('🏃 Running Quick Performance Tests\n');
    
    const tests = [
      () => this.runMemoryTest({ duration: 60, interval: 5 }),
      () => this.runAPILoadTest({ users: 10, duration: 60 }),
    ];

    await this.executeTests(tests);
  }

  async runLoadTests() {
    console.log('🏋️ Running Load Performance Tests\n');
    
    const tests = [
      () => this.runDraftLoadTest({ users: 50, duration: 180 }),
      () => this.runScoringLoadTest({ users: 100, duration: 300 }),
      () => this.runAPILoadTest({ users: 25, duration: 180 }),
    ];

    await this.executeTests(tests);
  }

  async runAllTests() {
    console.log('🔬 Running Comprehensive Performance Tests\n');
    
    const tests = [
      () => this.runMemoryTest(),
      () => this.runDatabaseTest(),
      () => this.runDraftLoadTest(),
      () => this.runScoringLoadTest(),
      () => this.runAPILoadTest(),
    ];

    await this.executeTests(tests);
  }

  async executeTests(tests) {
    if (this.parallel) {
      console.log('⚡ Running tests in parallel...\n');
      await Promise.allSettled(tests.map(test => test()));
    } else {
      console.log('🔄 Running tests sequentially...\n');
      for (const test of tests) {
        await test();
        // Brief pause between tests
        await this.sleep(2000);
      }
    }
  }

  async runMemoryTest(options = {}) {
    console.log('🧠 Running Memory Performance Test...');
    
    try {
      const memoryTester = new MemoryTester({
        testDuration: (options.duration || 300) * 1000,
        samplingInterval: (options.interval || 5) * 1000,
        ...options
      });

      const result = await memoryTester.startMemoryTest();
      this.results.tests.memory = result;
      this.results.summary.testsRun.push('memory');
      
      console.log(`✅ Memory test completed - Growth: ${this.formatBytes(result.memoryMetrics.growth.heap)}`);
    } catch (error) {
      console.error('❌ Memory test failed:', error.message);
      this.results.tests.memory = { error: error.message };
    }
  }

  async runDatabaseTest(options = {}) {
    console.log('🗃️ Running Database Performance Test...');
    
    try {
      const dbTester = new DatabasePerformanceTester({
        testDuration: (options.duration || 300) * 1000,
        concurrentConnections: options.connections || 20,
        ...options
      });

      const result = await dbTester.startDatabaseTest();
      this.results.tests.database = result;
      this.results.summary.testsRun.push('database');
      
      console.log(`✅ Database test completed - Avg Query: ${result.testSummary.averageQueryTime}ms`);
    } catch (error) {
      console.error('❌ Database test failed:', error.message);
      this.results.tests.database = { error: error.message };
    }
  }

  async runDraftLoadTest(options = {}) {
    console.log('🏈 Running Draft Load Test...');
    
    try {
      const draftTester = new DraftLoadTester({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: options.users || 100,
        draftDuration: (options.duration || 300) * 1000,
        ...options
      });

      const result = await draftTester.startLoadTest();
      this.results.tests.draft = result;
      this.results.summary.testsRun.push('draft');
      
      console.log(`✅ Draft test completed - Success Rate: ${result.testSummary.successRate}%`);
    } catch (error) {
      console.error('❌ Draft test failed:', error.message);
      this.results.tests.draft = { error: error.message };
    }
  }

  async runScoringLoadTest(options = {}) {
    console.log('📊 Running Scoring Load Test...');
    
    try {
      const scoringTester = new ScoringLoadTester({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: options.users || 200,
        testDuration: (options.duration || 600) * 1000,
        ...options
      });

      const result = await scoringTester.startLoadTest();
      this.results.tests.scoring = result;
      this.results.summary.testsRun.push('scoring');
      
      console.log(`✅ Scoring test completed - Req/Sec: ${result.testSummary.requestsPerSecond}`);
    } catch (error) {
      console.error('❌ Scoring test failed:', error.message);
      this.results.tests.scoring = { error: error.message };
    }
  }

  async runAPILoadTest(options = {}) {
    console.log('🔧 Running API Load Test...');
    
    try {
      const apiTester = new APILoadTester({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: options.users || 50,
        testDuration: (options.duration || 300) * 1000,
        ...options
      });

      const result = await apiTester.startLoadTest();
      this.results.tests.api = result;
      this.results.summary.testsRun.push('api');
      
      console.log(`✅ API test completed - Success Rate: ${result.testSummary.successRate}%`);
    } catch (error) {
      console.error('❌ API test failed:', error.message);
      this.results.tests.api = { error: error.message };
    }
  }

  async generateOptimizationRecommendations() {
    console.log('\n💡 Generating Optimization Recommendations...');
    
    const recommendations = [];
    const optimizations = [];
    let totalIssues = 0;
    let criticalIssues = 0;

    // Analyze memory test results
    if (this.results.tests.memory && !this.results.tests.memory.error) {
      const memoryAnalysis = this.analyzeMemoryResults(this.results.tests.memory);
      recommendations.push(...memoryAnalysis.recommendations);
      optimizations.push(...memoryAnalysis.optimizations);
      totalIssues += memoryAnalysis.issues;
      criticalIssues += memoryAnalysis.critical;
    }

    // Analyze database test results
    if (this.results.tests.database && !this.results.tests.database.error) {
      const dbAnalysis = this.analyzeDatabaseResults(this.results.tests.database);
      recommendations.push(...dbAnalysis.recommendations);
      optimizations.push(...dbAnalysis.optimizations);
      totalIssues += dbAnalysis.issues;
      criticalIssues += dbAnalysis.critical;
    }

    // Analyze load test results
    const loadTests = ['draft', 'scoring', 'api'];
    for (const testType of loadTests) {
      if (this.results.tests[testType] && !this.results.tests[testType].error) {
        const loadAnalysis = this.analyzeLoadTestResults(this.results.tests[testType], testType);
        recommendations.push(...loadAnalysis.recommendations);
        optimizations.push(...loadAnalysis.optimizations);
        totalIssues += loadAnalysis.issues;
        criticalIssues += loadAnalysis.critical;
      }
    }

    // Calculate overall score
    const baseScore = 100;
    const scoreDeduction = Math.min(totalIssues * 5 + criticalIssues * 10, 90);
    this.results.summary.overallScore = Math.max(baseScore - scoreDeduction, 10);
    this.results.summary.totalIssues = totalIssues;
    this.results.summary.criticalIssues = criticalIssues;

    this.results.recommendations = recommendations;
    this.results.optimizations = optimizations;

    console.log(`📋 Generated ${recommendations.length} recommendations`);
    console.log(`🔧 Identified ${optimizations.length} optimization opportunities`);
  }

  analyzeMemoryResults(memoryResult) {
    const analysis = { recommendations: [], optimizations: [], issues: 0, critical: 0 };
    
    if (memoryResult.memoryMetrics.growth.percentage > 50) {
      analysis.recommendations.push('High memory growth detected. Investigate potential memory leaks.');
      analysis.optimizations.push({
        type: 'memory_optimization',
        priority: 'high',
        description: 'Optimize memory usage patterns',
        effort: 'medium'
      });
      analysis.issues += 2;
      analysis.critical += 1;
    }

    if (memoryResult.leakDetection.potentialLeaks.length > 0) {
      analysis.recommendations.push(`${memoryResult.leakDetection.potentialLeaks.length} potential memory leaks detected.`);
      analysis.issues += memoryResult.leakDetection.potentialLeaks.length;
    }

    return analysis;
  }

  analyzeDatabaseResults(dbResult) {
    const analysis = { recommendations: [], optimizations: [], issues: 0, critical: 0 };
    
    if (dbResult.testSummary.slowQueriesPercentage > 10) {
      analysis.recommendations.push('High percentage of slow queries detected.');
      analysis.optimizations.push({
        type: 'database_optimization',
        priority: 'high',
        description: 'Optimize slow database queries',
        effort: 'medium'
      });
      analysis.issues += 2;
      analysis.critical += 1;
    }

    if (dbResult.indexAnalysis.missingIndexes.length > 0) {
      analysis.recommendations.push(`${dbResult.indexAnalysis.missingIndexes.length} missing database indexes detected.`);
      analysis.issues += 1;
    }

    return analysis;
  }

  analyzeLoadTestResults(loadResult, testType) {
    const analysis = { recommendations: [], optimizations: [], issues: 0, critical: 0 };
    
    if (loadResult.testSummary.successRate < 95) {
      analysis.recommendations.push(`${testType} test has low success rate: ${loadResult.testSummary.successRate}%`);
      analysis.optimizations.push({
        type: `${testType}_optimization`,
        priority: 'critical',
        description: `Improve ${testType} system reliability`,
        effort: 'high'
      });
      analysis.issues += 3;
      analysis.critical += 1;
    }

    if (loadResult.responseTimeMetrics.average > 1000) {
      analysis.recommendations.push(`${testType} test has high average response time: ${loadResult.responseTimeMetrics.average}ms`);
      analysis.issues += 1;
    }

    return analysis;
  }

  async generateFinalReport() {
    console.log('\n📄 Generating Final Performance Report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.outputDir, `performance-report-${timestamp}.json`);
    const summaryPath = path.join(this.outputDir, `performance-summary-${timestamp}.md`);

    // Save detailed JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Generate summary markdown report
    const summaryReport = this.generateSummaryMarkdown();
    fs.writeFileSync(summaryPath, summaryReport);

    console.log(`✅ Detailed report saved: ${reportPath}`);
    console.log(`📋 Summary report saved: ${summaryPath}`);

    // Display key findings
    this.displayKeyFindings();
  }

  generateSummaryMarkdown() {
    const { summary, recommendations, optimizations } = this.results;
    
    return `# Performance Test Report

## Summary
- **Test Duration**: ${Math.round(summary.duration / 1000)} seconds
- **Tests Run**: ${summary.testsRun.join(', ')}
- **Overall Score**: ${summary.overallScore}/100
- **Total Issues**: ${summary.totalIssues}
- **Critical Issues**: ${summary.criticalIssues}

## Key Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Optimization Opportunities
${optimizations.map(opt => `- **${opt.type}** (${opt.priority}): ${opt.description} - ${opt.effort} effort`).join('\n')}

## Test Results Summary
${Object.entries(this.results.tests).map(([testName, result]) => {
  if (result.error) {
    return `### ${testName.toUpperCase()} Test\n❌ Failed: ${result.error}`;
  }
  return `### ${testName.toUpperCase()} Test\n✅ Completed successfully`;
}).join('\n\n')}

Generated on: ${new Date().toISOString()}
`;
  }

  displayKeyFindings() {
    console.log('\n🎯 Key Findings:');
    console.log('=' .repeat(40));
    
    if (this.results.summary.criticalIssues > 0) {
      console.log(`🚨 ${this.results.summary.criticalIssues} CRITICAL issues found`);
    }
    
    if (this.results.summary.totalIssues > 0) {
      console.log(`⚠️ ${this.results.summary.totalIssues} total issues found`);
    }

    console.log(`📊 Overall Performance Score: ${this.results.summary.overallScore}/100`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\n🔧 Top Recommendations:');
      this.results.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    if (this.results.summary.overallScore >= 80) {
      console.log('\n🎉 Excellent performance! System is production-ready.');
    } else if (this.results.summary.overallScore >= 60) {
      console.log('\n👍 Good performance with room for improvement.');
    } else {
      console.log('\n⚠️ Performance needs significant improvement before production.');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'url') options.baseUrl = value;
    if (key === 'suite') options.testSuite = value;
    if (key === 'output') options.outputDir = value;
    if (key === 'parallel') options.parallel = value === 'true';
  }
  
  const runner = new PerformanceTestRunner(options);
  
  process.on('SIGINT', () => {
    console.log('\n⏹️ Received interrupt signal, stopping tests...');
    process.exit(0);
  });
  
  runner.runComprehensiveTests().catch(error => {
    console.error('❌ Performance testing suite failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestRunner;