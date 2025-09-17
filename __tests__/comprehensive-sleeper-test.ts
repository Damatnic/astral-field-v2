/**
 * Comprehensive Sleeper API Testing Framework
 * 
 * Main entry point for running all Sleeper API tests with specialized agents,
 * validation utilities, and comprehensive reporting.
 * 
 * Usage:
 * - npm test:sleeper:all          - Run all test categories
 * - npm test:sleeper:accuracy     - Run data accuracy tests only
 * - npm test:sleeper:performance  - Run performance tests only
 * - npm test:sleeper:integration  - Run integration tests only
 * - npm test:sleeper:realtime     - Run real-time tests only
 * - npm test:sleeper:automated    - Start automated test suite
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataAccuracyTestingAgent } from './agents/dataAccuracyTestingAgent';
import { PerformanceTestingAgent } from './agents/performanceTestingAgent';
import { IntegrationTestingAgent } from './agents/integrationTestingAgent';
import { RealTimeTestingAgent } from './agents/realTimeTestingAgent';
import { ReportingSystem } from './utils/reportingSystem';
import { AutomatedTestSuite } from './suites/automatedTestSuite';
import { SleeperApiMocks } from './mocks/sleeperApiMocks';
import { TestDataFactories } from './factories/testDataFactories';
import { ValidationUtils } from './utils/validationUtils';

describe('Comprehensive Sleeper API Testing Framework', () => {
  let dataAgent: DataAccuracyTestingAgent;
  let performanceAgent: PerformanceTestingAgent;
  let integrationAgent: IntegrationTestingAgent;
  let realTimeAgent: RealTimeTestingAgent;
  let reportingSystem: ReportingSystem;
  let automatedSuite: AutomatedTestSuite;

  beforeAll(async () => {
    console.log('🚀 Initializing Comprehensive Sleeper API Testing Framework...');
    
    // Setup mocks and test data
    SleeperApiMocks.reset();
    SleeperApiMocks.configure({
      enableNetworkDelay: true,
      averageDelay: 100,
      errorRate: 0.01, // 1% error rate for testing
      rateLimitSimulation: true,
      maxRequestsPerMinute: 1000,
      includeInconsistentData: false,
      cacheSimulation: true
    });
    
    TestDataFactories.setSeed(42); // Reproducible test data
    
    // Initialize all agents
    dataAgent = new DataAccuracyTestingAgent();
    performanceAgent = new PerformanceTestingAgent();
    integrationAgent = new IntegrationTestingAgent();
    realTimeAgent = new RealTimeTestingAgent();
    reportingSystem = ReportingSystem.getInstance();
    
    // Initialize automated suite with test configuration
    automatedSuite = new AutomatedTestSuite({
      schedule: {
        dataAccuracy: '0 */2 * * *',
        performance: '0 */6 * * *',
        integration: '0 8 * * *',
        realTime: '*/15 * * * *',
        fullSuite: '0 2 * * 1'
      },
      thresholds: {
        minAccuracyScore: 80,
        maxResponseTime: 5000,
        minSuccessRate: 85,
        maxErrorRate: 10
      },
      notifications: {
        enabled: false // Disabled for tests
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
        initialDelay: 500
      },
      monitoring: {
        enabled: true,
        baselineTracking: true,
        anomalyDetection: true
      }
    });
    
    console.log('✅ Testing framework initialized successfully');
  });

  afterAll(async () => {
    if (automatedSuite) {
      automatedSuite.stop();
    }
    console.log('🏁 Testing framework cleanup completed');
  });

  describe('Data Accuracy Testing Agent', () => {
    it('should validate NFL player data accuracy', async () => {
      console.log('📊 Running data accuracy validation...');
      
      const result = await dataAgent.validateDataAccuracy();
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.checkTime).toBeInstanceOf(Date);
      
      console.log(`✅ Data accuracy score: ${result.score}/100`);
      console.log(`📈 Player count validated: ${result.metadata.playerCount}`);
      
      if (result.errors.length > 0) {
        console.log(`❌ Errors found: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => console.log(`  - ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(`⚠️ Warnings: ${result.warnings.length}`);
        result.warnings.slice(0, 3).forEach(warning => console.log(`  - ${warning}`));
      }
      
      // Expect reasonable accuracy score
      expect(result.score).toBeGreaterThan(70);
    }, 30000);

    it('should test edge cases and data consistency', async () => {
      console.log('🎯 Testing edge cases...');
      
      const result = await dataAgent.testEdgeCases();
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.metadata.validationRules).toContain('Team changes');
      
      console.log(`✅ Edge case testing score: ${result.score}/100`);
      console.log(`📋 Validation rules tested: ${result.metadata.validationRules.join(', ')}`);
    }, 15000);
  });

  describe('Performance Testing Agent', () => {
    it('should run comprehensive performance test suite', async () => {
      console.log('⚡ Running performance test suite...');
      
      const results = await performanceAgent.runPerformanceTestSuite();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(result => {
        expect(result.testName).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
        expect(result.requestCount).toBeGreaterThan(0);
        expect(result.metrics).toBeDefined();
        expect(result.metrics.avgResponseTime).toBeGreaterThan(0);
      });
      
      const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.avgResponseTime, 0) / results.length;
      const successRate = (results.filter(r => r.success).length / results.length) * 100;
      
      console.log(`✅ Performance tests completed: ${results.length} tests`);
      console.log(`📈 Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`📊 Success rate: ${successRate.toFixed(1)}%`);
      
      // Performance expectations
      expect(avgResponseTime).toBeLessThan(10000); // Under 10 seconds
      expect(successRate).toBeGreaterThan(70); // At least 70% success
    }, 60000);

    it('should validate rate limiting behavior', async () => {
      console.log('🚦 Testing rate limiting...');
      
      const result = await performanceAgent.testRateLimitingBehavior();
      
      expect(result).toBeDefined();
      expect(result.maxRequestsPerMinute).toBeGreaterThan(0);
      expect(result.actualRequestsAchieved).toBeGreaterThan(0);
      expect(typeof result.rateLimitingWorking).toBe('boolean');
      
      console.log(`✅ Rate limiting test completed`);
      console.log(`📊 Max requests/minute: ${result.maxRequestsPerMinute}`);
      console.log(`🔄 Rate limiting working: ${result.rateLimitingWorking}`);
    }, 20000);
  });

  describe('Integration Testing Agent', () => {
    it('should run D\'Amato Dynasty League integration test', async () => {
      console.log('🔗 Running D\'Amato Dynasty League integration...');
      
      const result = await integrationAgent.runDamatoDynastyIntegrationTest('test_league_123');
      
      expect(result).toBeDefined();
      expect(result.testName).toContain('D\'Amato Dynasty');
      expect(result.duration).toBeGreaterThan(0);
      expect(Array.isArray(result.steps)).toBe(true);
      expect(result.dataIntegrity).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      console.log(`✅ Integration test completed: ${result.success ? 'PASS' : 'FAIL'}`);
      console.log(`📊 Data integrity score: ${result.dataIntegrity.matchingAccuracy.toFixed(1)}%`);
      console.log(`🔧 Steps completed: ${result.steps.filter(s => s.success).length}/${result.steps.length}`);
      
      result.steps.forEach(step => {
        const status = step.success ? '✅' : '❌';
        console.log(`  ${status} ${step.stepName} (${step.duration.toFixed(2)}ms)`);
      });
      
      // Expect reasonable integration success
      expect(result.dataIntegrity.matchingAccuracy).toBeGreaterThan(80);
    }, 45000);

    it('should validate league import data integrity', () => {
      console.log('🔍 Validating league import data...');
      
      const testData = TestDataFactories.createDamatoDynastyScenario();
      const validation = ValidationUtils.validateLeague(testData.league);
      
      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(90);
      
      console.log(`✅ League validation score: ${validation.score}/100`);
      console.log(`📋 Validation rules: ${validation.metadata.validationRules.join(', ')}`);
    });
  });

  describe('Real-Time Testing Agent', () => {
    it('should run real-time test suite', async () => {
      console.log('📡 Running real-time test suite...');
      
      const results = await realTimeAgent.runRealTimeTestSuite();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(result => {
        expect(result.testName).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
        expect(result.realTimeMetrics).toBeDefined();
        expect(result.realTimeMetrics.avgUpdateLatency).toBeGreaterThan(0);
      });
      
      const avgLatency = results.reduce((sum, r) => sum + r.realTimeMetrics.avgUpdateLatency, 0) / results.length;
      const successRate = (results.filter(r => r.success).length / results.length) * 100;
      
      console.log(`✅ Real-time tests completed: ${results.length} tests`);
      console.log(`⚡ Average update latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`📊 Success rate: ${successRate.toFixed(1)}%`);
      
      // Real-time performance expectations
      expect(avgLatency).toBeLessThan(5000); // Under 5 seconds
      expect(successRate).toBeGreaterThan(70); // At least 70% success
    }, 45000);

    it('should validate WebSocket stability', async () => {
      console.log('🔌 Testing WebSocket stability...');
      
      // This would test the first result which should be WebSocket tests
      const results = await realTimeAgent.runRealTimeTestSuite();
      const webSocketResult = results.find(r => r.testName.includes('WebSocket'));
      
      if (webSocketResult) {
        expect(webSocketResult.realTimeMetrics.connectionStability).toBeGreaterThan(80);
        console.log(`✅ WebSocket stability: ${webSocketResult.realTimeMetrics.connectionStability}%`);
      }
    }, 30000);
  });

  describe('Comprehensive Reporting System', () => {
    it('should generate complete test suite report', async () => {
      console.log('📋 Generating comprehensive test report...');
      
      const report = await reportingSystem.generateTestSuiteReport(
        dataAgent,
        performanceAgent,
        integrationAgent,
        realTimeAgent
      );
      
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalTests).toBeGreaterThan(0);
      expect(report.trends).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      
      console.log(`✅ Report generated: ${report.id}`);
      console.log(`📊 Overall score: ${report.summary.overallScore.toFixed(1)}/100`);
      console.log(`📈 Success rate: ${report.summary.successRate.toFixed(1)}%`);
      console.log(`🔧 Total tests: ${report.summary.totalTests}`);
      console.log(`⚠️ Warnings: ${report.summary.warningCount}`);
      
      // Validate report structure
      expect(report.summary.overallScore).toBeGreaterThan(0);
      expect(report.summary.successRate).toBeGreaterThan(0);
    }, 60000);

    it('should export report in multiple formats', async () => {
      console.log('📄 Testing report export formats...');
      
      const report = await reportingSystem.generateTestSuiteReport(
        dataAgent,
        performanceAgent,
        integrationAgent,
        realTimeAgent
      );
      
      // Test Markdown export
      const markdownReport = reportingSystem.exportReport(report, {
        format: 'markdown',
        includeCharts: false,
        includeTrends: true,
        includeRecommendations: true,
        detailLevel: 'summary'
      });
      
      expect(typeof markdownReport).toBe('string');
      expect(markdownReport).toContain('# Sleeper API Test Suite Report');
      expect(markdownReport).toContain('Overall Score');
      
      // Test JSON export
      const jsonReport = reportingSystem.exportReport(report, {
        format: 'json',
        includeCharts: false,
        includeTrends: false,
        includeRecommendations: false,
        detailLevel: 'summary'
      });
      
      expect(typeof jsonReport).toBe('string');
      const parsedJson = JSON.parse(jsonReport);
      expect(parsedJson.id).toBe(report.id);
      
      console.log(`✅ Report exports working: Markdown (${markdownReport.length} chars), JSON (${jsonReport.length} chars)`);
    });
  });

  describe('Automated Test Suite', () => {
    it('should initialize and provide status information', async () => {
      console.log('🤖 Testing automated test suite...');
      
      const status = automatedSuite.getStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.isRunning).toBe('boolean');
      expect(Array.isArray(status.scheduledJobs)).toBe(true);
      expect(status.executions).toBeDefined();
      expect(typeof status.executions.total).toBe('number');
      
      console.log(`🤖 Automated suite status: ${status.isRunning ? 'Running' : 'Stopped'}`);
      console.log(`📅 Scheduled jobs: ${status.scheduledJobs.length}`);
      console.log(`🔧 Total executions: ${status.executions.total}`);
    });

    it('should execute individual test categories', async () => {
      console.log('🎯 Testing individual automated executions...');
      
      // Test data accuracy execution
      await automatedSuite.executeDataAccuracyTests();
      
      const status = automatedSuite.getStatus();
      expect(status.executions.total).toBeGreaterThan(0);
      
      const executions = automatedSuite.getExecutionHistory(5);
      expect(executions.length).toBeGreaterThan(0);
      
      const lastExecution = executions[0];
      expect(lastExecution.type).toBe('data_accuracy');
      expect(['completed', 'failed'].includes(lastExecution.status)).toBe(true);
      
      console.log(`✅ Execution completed: ${lastExecution.status} in ${lastExecution.duration}ms`);
    }, 30000);
  });

  describe('Validation Utilities', () => {
    it('should validate player data with detailed errors', () => {
      console.log('🔍 Testing validation utilities...');
      
      const testData = TestDataFactories.createDamatoDynastyScenario();
      const samplePlayers = Object.values(testData.players).slice(0, 5);
      
      const results = ValidationUtils.batchValidate(samplePlayers, ValidationUtils.validatePlayer);
      
      expect(results.overallScore).toBeGreaterThan(0);
      expect(results.summary.total).toBe(5);
      expect(Array.isArray(results.results)).toBe(true);
      
      console.log(`✅ Validation completed: ${results.summary.valid}/${results.summary.total} valid`);
      console.log(`📊 Average score: ${results.summary.avgScore.toFixed(1)}/100`);
      
      // Generate validation report
      const validationReport = ValidationUtils.generateValidationReport(results.results);
      expect(typeof validationReport).toBe('string');
      expect(validationReport).toContain('Validation Report');
      
      console.log(`📋 Validation report generated (${validationReport.length} characters)`);
    });

    it('should perform cross-reference validation', () => {
      console.log('🔗 Testing cross-reference validation...');
      
      const testData = TestDataFactories.createDamatoDynastyScenario();
      const crossRefResult = ValidationUtils.validatePlayerRosterReferences(
        testData.players,
        testData.rosters
      );
      
      expect(crossRefResult.entity).toBe('player_roster_references');
      expect(crossRefResult.references.total).toBeGreaterThan(0);
      expect(crossRefResult.references.valid).toBeGreaterThan(0);
      
      console.log(`✅ Cross-reference validation: ${crossRefResult.references.valid}/${crossRefResult.references.total} valid`);
      console.log(`📊 Reference accuracy: ${((crossRefResult.references.valid / crossRefResult.references.total) * 100).toFixed(1)}%`);
    });
  });

  describe('Test Data Factories', () => {
    it('should generate realistic test data', () => {
      console.log('🏭 Testing data factories...');
      
      const scenario = TestDataFactories.createDamatoDynastyScenario();
      
      expect(scenario.players).toBeDefined();
      expect(Object.keys(scenario.players).length).toBeGreaterThan(100);
      expect(scenario.league).toBeDefined();
      expect(scenario.users.length).toBe(12);
      expect(scenario.rosters.length).toBe(12);
      expect(scenario.transactions.length).toBeGreaterThan(0);
      
      console.log(`✅ Test data generated:`);
      console.log(`  📊 Players: ${Object.keys(scenario.players).length}`);
      console.log(`  👥 Users: ${scenario.users.length}`);
      console.log(`  📋 Rosters: ${scenario.rosters.length}`);
      console.log(`  🔄 Transactions: ${scenario.transactions.length}`);
      console.log(`  🏆 League: ${scenario.league.name}`);
    });

    it('should generate edge case scenarios', () => {
      console.log('🎯 Testing edge case generation...');
      
      const edgeCases = TestDataFactories.createEdgeCaseScenarios();
      
      expect(edgeCases.injuredPlayers).toBeDefined();
      expect(edgeCases.tradeScenarios).toBeDefined();
      expect(edgeCases.byeWeekPlayers).toBeDefined();
      expect(edgeCases.rookiePlayers).toBeDefined();
      
      console.log(`✅ Edge cases generated:`);
      console.log(`  🏥 Injured players: ${Object.keys(edgeCases.injuredPlayers).length}`);
      console.log(`  🔄 Trade scenarios: ${edgeCases.tradeScenarios.length}`);
      console.log(`  😴 Bye week players: ${Object.keys(edgeCases.byeWeekPlayers).length}`);
      console.log(`  🌟 Rookie players: ${Object.keys(edgeCases.rookiePlayers).length}`);
    });
  });

  describe('API Mocking System', () => {
    it('should simulate various API conditions', async () => {
      console.log('🎭 Testing API mocking system...');
      
      // Test normal operation
      SleeperApiMocks.configure({ errorRate: 0 });
      const nflState = await SleeperApiMocks.mockGetNFLState();
      expect(nflState).toBeDefined();
      expect(nflState.week).toBeGreaterThan(0);
      
      // Test with errors
      SleeperApiMocks.configure({ errorRate: 1.0 }); // 100% error rate
      try {
        await SleeperApiMocks.mockGetNFLState();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      // Reset to normal
      SleeperApiMocks.configure({ errorRate: 0.01 });
      
      console.log(`✅ Mock system tested: Normal ops and error simulation working`);
    });
  });

  describe('Full Integration Test', () => {
    it('should run a complete end-to-end test scenario', async () => {
      console.log('🎯 Running complete end-to-end test...');
      
      const startTime = performance.now();
      
      // Run all testing agents in sequence
      const dataResult = await dataAgent.validateDataAccuracy();
      const perfResults = await performanceAgent.runPerformanceTestSuite();
      const integrationResult = await integrationAgent.runDamatoDynastyIntegrationTest();
      const realTimeResults = await realTimeAgent.runRealTimeTestSuite();
      
      // Generate comprehensive report
      const report = await reportingSystem.generateTestSuiteReport(
        dataAgent,
        performanceAgent,
        integrationAgent,
        realTimeAgent
      );
      
      const duration = performance.now() - startTime;
      
      // Validate end-to-end results
      expect(dataResult.score).toBeGreaterThan(50);
      expect(perfResults.length).toBeGreaterThan(0);
      expect(integrationResult.success).toBeDefined();
      expect(realTimeResults.length).toBeGreaterThan(0);
      expect(report.summary.overallScore).toBeGreaterThan(0);
      
      console.log(`🎉 End-to-end test completed in ${duration.toFixed(2)}ms`);
      console.log(`📊 Final Results:`);
      console.log(`  📈 Data Accuracy: ${dataResult.score}/100`);
      console.log(`  ⚡ Performance Tests: ${perfResults.filter(r => r.success).length}/${perfResults.length} passed`);
      console.log(`  🔗 Integration: ${integrationResult.success ? 'PASS' : 'FAIL'}`);
      console.log(`  📡 Real-time: ${realTimeResults.filter(r => r.success).length}/${realTimeResults.length} passed`);
      console.log(`  🏆 Overall Score: ${report.summary.overallScore.toFixed(1)}/100`);
      
      // Overall expectations
      expect(report.summary.overallScore).toBeGreaterThan(60);
      expect(report.summary.successRate).toBeGreaterThan(70);
      
    }, 120000); // 2 minute timeout for full integration
  });
});

// Export for standalone usage
export {
  DataAccuracyTestingAgent,
  PerformanceTestingAgent,
  IntegrationTestingAgent,
  RealTimeTestingAgent,
  ReportingSystem,
  AutomatedTestSuite,
  SleeperApiMocks,
  TestDataFactories,
  ValidationUtils
};