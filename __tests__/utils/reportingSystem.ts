/**
 * Comprehensive Reporting System
 * 
 * Advanced reporting system for Sleeper API testing results, performance metrics,
 * and validation reports with export capabilities and trend analysis.
 * 
 * Features:
 * - Multi-format report generation (HTML, JSON, CSV, Markdown)
 * - Performance trend analysis and visualization
 * - Test result aggregation and statistical analysis
 * - Automated report scheduling and distribution
 * - Dashboard-style summary reports
 * - Historical data comparison and trend tracking
 */

import { DataAccuracyTestingAgent, DataValidationResult } from '../agents/dataAccuracyTestingAgent';
import { PerformanceTestingAgent, PerformanceTestResult } from '../agents/performanceTestingAgent';
import { IntegrationTestingAgent, IntegrationTestResult } from '../agents/integrationTestingAgent';
import { RealTimeTestingAgent, RealTimeTestResult } from '../agents/realTimeTestingAgent';
import { ValidationUtils, ValidationResult } from './validationUtils';

export interface TestSuiteReport {
  id: string;
  timestamp: Date;
  duration: number;
  summary: TestSuiteSummary;
  dataAccuracy: DataValidationResult[];
  performance: PerformanceTestResult[];
  integration: IntegrationTestResult[];
  realTime: RealTimeTestResult[];
  trends: TrendAnalysis;
  recommendations: string[];
}

export interface TestSuiteSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningCount: number;
  overallScore: number;
  successRate: number;
  categories: {
    dataAccuracy: CategorySummary;
    performance: CategorySummary;
    integration: CategorySummary;
    realTime: CategorySummary;
  };
}

export interface CategorySummary {
  testsRun: number;
  passed: number;
  failed: number;
  averageScore: number;
  averageDuration: number;
  criticalIssues: number;
}

export interface TrendAnalysis {
  period: string;
  dataPoints: number;
  trends: {
    accuracy: TrendData;
    performance: TrendData;
    reliability: TrendData;
  };
}

export interface TrendData {
  direction: 'improving' | 'declining' | 'stable';
  changePercent: number;
  confidence: number;
  dataPoints: {
    timestamp: Date;
    value: number;
  }[];
}

export interface ReportConfig {
  format: 'html' | 'json' | 'csv' | 'markdown';
  includeCharts: boolean;
  includeTrends: boolean;
  includeRecommendations: boolean;
  detailLevel: 'summary' | 'detailed' | 'verbose';
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export class ReportingSystem {
  private reports: TestSuiteReport[] = [];
  private static instance: ReportingSystem;

  static getInstance(): ReportingSystem {
    if (!this.instance) {
      this.instance = new ReportingSystem();
    }
    return this.instance;
  }

  /**
   * Generate comprehensive test suite report
   */
  async generateTestSuiteReport(
    dataAgent: DataAccuracyTestingAgent,
    performanceAgent: PerformanceTestingAgent,
    integrationAgent: IntegrationTestingAgent,
    realTimeAgent: RealTimeTestingAgent
  ): Promise<TestSuiteReport> {
    const startTime = performance.now();
    const reportId = `report_${Date.now()}`;

    // Collect test results from all agents
    const dataResults = await this.runDataAccuracyTests(dataAgent);
    const performanceResults = await this.runPerformanceTests(performanceAgent);
    const integrationResults = await this.runIntegrationTests(integrationAgent);
    const realTimeResults = await this.runRealTimeTests(realTimeAgent);

    // Generate summary
    const summary = this.generateSummary(dataResults, performanceResults, integrationResults, realTimeResults);
    
    // Analyze trends
    const trends = this.analyzeTrends();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, trends);

    const report: TestSuiteReport = {
      id: reportId,
      timestamp: new Date(),
      duration: performance.now() - startTime,
      summary,
      dataAccuracy: dataResults,
      performance: performanceResults,
      integration: integrationResults,
      realTime: realTimeResults,
      trends,
      recommendations
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Run data accuracy tests
   */
  private async runDataAccuracyTests(agent: DataAccuracyTestingAgent): Promise<DataValidationResult[]> {
    try {
      const result = await agent.validateDataAccuracy();
      const edgeCaseResult = await agent.testEdgeCases();
      return [result, edgeCaseResult];
    } catch (error) {
      console.error('Data accuracy tests failed:', error);
      return [];
    }
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(agent: PerformanceTestingAgent): Promise<PerformanceTestResult[]> {
    try {
      return await agent.runPerformanceTestSuite();
    } catch (error) {
      console.error('Performance tests failed:', error);
      return [];
    }
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(agent: IntegrationTestingAgent): Promise<IntegrationTestResult[]> {
    try {
      const result = await agent.runDamatoDynastyIntegrationTest();
      return [result];
    } catch (error) {
      console.error('Integration tests failed:', error);
      return [];
    }
  }

  /**
   * Run real-time tests
   */
  private async runRealTimeTests(agent: RealTimeTestingAgent): Promise<RealTimeTestResult[]> {
    try {
      return await agent.runRealTimeTestSuite();
    } catch (error) {
      console.error('Real-time tests failed:', error);
      return [];
    }
  }

  /**
   * Generate test suite summary
   */
  private generateSummary(
    dataResults: DataValidationResult[],
    performanceResults: PerformanceTestResult[],
    integrationResults: IntegrationTestResult[],
    realTimeResults: RealTimeTestResult[]
  ): TestSuiteSummary {
    // Data accuracy summary
    const dataAccuracy = this.generateCategorySummary(
      dataResults.map(r => ({
        success: r.isValid,
        duration: 0, // DataValidationResult doesn't have duration
        score: r.score,
        errors: r.errors.length
      }))
    );

    // Performance summary
    const performance = this.generateCategorySummary(
      performanceResults.map(r => ({
        success: r.success,
        duration: r.duration,
        score: 100 - r.metrics.errorRate, // Convert error rate to score
        errors: r.errors.length
      }))
    );

    // Integration summary
    const integration = this.generateCategorySummary(
      integrationResults.map(r => ({
        success: r.success,
        duration: r.duration,
        score: r.dataIntegrity.matchingAccuracy,
        errors: r.errors.length
      }))
    );

    // Real-time summary
    const realTime = this.generateCategorySummary(
      realTimeResults.map(r => ({
        success: r.success,
        duration: r.duration,
        score: r.realTimeMetrics.dataAccuracy,
        errors: r.errors.length
      }))
    );

    const totalTests = dataResults.length + performanceResults.length + integrationResults.length + realTimeResults.length;
    const passedTests = dataAccuracy.passed + performance.passed + integration.passed + realTime.passed;
    const failedTests = totalTests - passedTests;
    const warningCount = dataResults.reduce((sum, r) => sum + r.warnings.length, 0) +
                        performanceResults.reduce((sum, r) => sum + r.warnings.length, 0) +
                        integrationResults.reduce((sum, r) => sum + r.warnings.length, 0) +
                        realTimeResults.reduce((sum, r) => sum + r.warnings.length, 0);

    const overallScore = totalTests > 0 
      ? (dataAccuracy.averageScore + performance.averageScore + integration.averageScore + realTime.averageScore) / 4
      : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      warningCount,
      overallScore,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      categories: {
        dataAccuracy,
        performance,
        integration,
        realTime
      }
    };
  }

  /**
   * Generate category summary
   */
  private generateCategorySummary(tests: Array<{
    success: boolean;
    duration: number;
    score: number;
    errors: number;
  }>): CategorySummary {
    const testsRun = tests.length;
    const passed = tests.filter(t => t.success).length;
    const failed = testsRun - passed;
    const averageScore = testsRun > 0 
      ? tests.reduce((sum, t) => sum + t.score, 0) / testsRun 
      : 0;
    const averageDuration = testsRun > 0 
      ? tests.reduce((sum, t) => sum + t.duration, 0) / testsRun 
      : 0;
    const criticalIssues = tests.reduce((sum, t) => sum + t.errors, 0);

    return {
      testsRun,
      passed,
      failed,
      averageScore,
      averageDuration,
      criticalIssues
    };
  }

  /**
   * Analyze trends from historical data
   */
  private analyzeTrends(): TrendAnalysis {
    const recentReports = this.reports.slice(-10); // Last 10 reports
    
    if (recentReports.length < 2) {
      return {
        period: 'insufficient_data',
        dataPoints: recentReports.length,
        trends: {
          accuracy: { direction: 'stable', changePercent: 0, confidence: 0, dataPoints: [] },
          performance: { direction: 'stable', changePercent: 0, confidence: 0, dataPoints: [] },
          reliability: { direction: 'stable', changePercent: 0, confidence: 0, dataPoints: [] }
        }
      };
    }

    // Extract accuracy trend
    const accuracyData = recentReports.map(r => ({
      timestamp: r.timestamp,
      value: r.summary.categories.dataAccuracy.averageScore
    }));

    // Extract performance trend
    const performanceData = recentReports.map(r => ({
      timestamp: r.timestamp,
      value: r.summary.categories.performance.averageScore
    }));

    // Extract reliability trend (success rate)
    const reliabilityData = recentReports.map(r => ({
      timestamp: r.timestamp,
      value: r.summary.successRate
    }));

    return {
      period: `${recentReports.length}_reports`,
      dataPoints: recentReports.length,
      trends: {
        accuracy: this.calculateTrend(accuracyData),
        performance: this.calculateTrend(performanceData),
        reliability: this.calculateTrend(reliabilityData)
      }
    };
  }

  /**
   * Calculate trend direction and statistics
   */
  private calculateTrend(data: { timestamp: Date; value: number }[]): TrendData {
    if (data.length < 2) {
      return { direction: 'stable', changePercent: 0, confidence: 0, dataPoints: data };
    }

    // Simple linear regression to detect trend
    const n = data.length;
    const xValues = data.map((_, i) => i);
    const yValues = data.map(d => d.value);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    // Determine direction
    const threshold = 0.5; // Minimum slope to consider significant
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (Math.abs(slope) > threshold) {
      direction = slope > 0 ? 'improving' : 'declining';
    }
    
    // Calculate percent change from first to last value
    const changePercent = data.length > 1 
      ? ((yValues[yValues.length - 1] - yValues[0]) / yValues[0]) * 100 
      : 0;

    return {
      direction,
      changePercent,
      confidence: Math.max(0, Math.min(100, rSquared * 100)),
      dataPoints: data
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(summary: TestSuiteSummary, trends: TrendAnalysis): string[] {
    const recommendations: string[] = [];

    // Overall performance recommendations
    if (summary.overallScore < 70) {
      recommendations.push('🔴 CRITICAL: Overall test score is below 70%. Immediate attention required.');
    } else if (summary.overallScore < 85) {
      recommendations.push('🟡 WARNING: Overall test score is below 85%. Consider improvements.');
    }

    // Success rate recommendations
    if (summary.successRate < 80) {
      recommendations.push('❌ Low test success rate. Review failing tests and underlying issues.');
    }

    // Data accuracy recommendations
    if (summary.categories.dataAccuracy.averageScore < 80) {
      recommendations.push('📊 Data accuracy issues detected. Review data validation and cleansing processes.');
    }

    // Performance recommendations
    if (summary.categories.performance.averageScore < 75) {
      recommendations.push('⚡ Performance issues detected. Consider optimizing API calls and caching strategies.');
    }

    if (summary.categories.performance.averageDuration > 5000) {
      recommendations.push('⏱️ High average test duration. Review test efficiency and API response times.');
    }

    // Integration recommendations
    if (summary.categories.integration.criticalIssues > 0) {
      recommendations.push('🔗 Integration issues found. Review data mapping and synchronization processes.');
    }

    // Real-time recommendations
    if (summary.categories.realTime.averageScore < 80) {
      recommendations.push('📡 Real-time functionality issues detected. Review WebSocket connections and live data processing.');
    }

    // Trend-based recommendations
    if (trends.trends.accuracy.direction === 'declining') {
      recommendations.push('📉 Data accuracy is declining over time. Investigate root causes and implement corrective measures.');
    }

    if (trends.trends.performance.direction === 'declining') {
      recommendations.push('📉 Performance is declining over time. Monitor system resources and optimize bottlenecks.');
    }

    if (trends.trends.reliability.direction === 'declining') {
      recommendations.push('📉 System reliability is declining. Review error patterns and implement stability improvements.');
    }

    // Positive reinforcement
    if (summary.overallScore >= 90 && summary.successRate >= 95) {
      recommendations.push('✅ Excellent test results! System is performing optimally.');
    }

    if (trends.trends.accuracy.direction === 'improving') {
      recommendations.push('📈 Data accuracy is improving. Continue current practices.');
    }

    // Warning count recommendations
    if (summary.warningCount > summary.totalTests * 0.5) {
      recommendations.push('⚠️ High warning count detected. Review warnings to prevent future issues.');
    }

    return recommendations;
  }

  /**
   * Export report in specified format
   */
  exportReport(report: TestSuiteReport, config: ReportConfig): string {
    switch (config.format) {
      case 'html':
        return this.generateHtmlReport(report, config);
      case 'json':
        return this.generateJsonReport(report, config);
      case 'csv':
        return this.generateCsvReport(report, config);
      case 'markdown':
      default:
        return this.generateMarkdownReport(report, config);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: TestSuiteReport, config: ReportConfig): string {
    const includeCharts = config.includeCharts ? `
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <canvas id="scoreChart" width="400" height="200"></canvas>
      <script>
        new Chart(document.getElementById('scoreChart'), {
          type: 'bar',
          data: {
            labels: ['Data Accuracy', 'Performance', 'Integration', 'Real-Time'],
            datasets: [{
              label: 'Scores',
              data: [
                ${report.summary.categories.dataAccuracy.averageScore},
                ${report.summary.categories.performance.averageScore},
                ${report.summary.categories.integration.averageScore},
                ${report.summary.categories.realTime.averageScore}
              ],
              backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']
            }]
          }
        });
      </script>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Sleeper API Test Report - ${report.timestamp.toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .score { font-size: 2em; font-weight: bold; text-align: center; }
        .good { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #f44336; }
        .recommendations { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sleeper API Test Suite Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp.toISOString()}</p>
        <p><strong>Duration:</strong> ${report.duration.toFixed(2)}ms</p>
        <p><strong>Report ID:</strong> ${report.id}</p>
    </div>

    <div class="summary">
        <div class="card">
            <h3>Overall Score</h3>
            <div class="score ${report.summary.overallScore >= 80 ? 'good' : report.summary.overallScore >= 60 ? 'warning' : 'error'}">
                ${report.summary.overallScore.toFixed(1)}%
            </div>
        </div>
        <div class="card">
            <h3>Success Rate</h3>
            <div class="score ${report.summary.successRate >= 90 ? 'good' : report.summary.successRate >= 70 ? 'warning' : 'error'}">
                ${report.summary.successRate.toFixed(1)}%
            </div>
        </div>
        <div class="card">
            <h3>Total Tests</h3>
            <div class="score">${report.summary.totalTests}</div>
        </div>
        <div class="card">
            <h3>Warnings</h3>
            <div class="score ${report.summary.warningCount === 0 ? 'good' : 'warning'}">${report.summary.warningCount}</div>
        </div>
    </div>

    ${includeCharts}

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <h2>Category Details</h2>
    <div class="summary">
        <div class="card">
            <h4>Data Accuracy</h4>
            <p>Score: ${report.summary.categories.dataAccuracy.averageScore.toFixed(1)}%</p>
            <p>Tests: ${report.summary.categories.dataAccuracy.passed}/${report.summary.categories.dataAccuracy.testsRun}</p>
        </div>
        <div class="card">
            <h4>Performance</h4>
            <p>Score: ${report.summary.categories.performance.averageScore.toFixed(1)}%</p>
            <p>Tests: ${report.summary.categories.performance.passed}/${report.summary.categories.performance.testsRun}</p>
        </div>
        <div class="card">
            <h4>Integration</h4>
            <p>Score: ${report.summary.categories.integration.averageScore.toFixed(1)}%</p>
            <p>Tests: ${report.summary.categories.integration.passed}/${report.summary.categories.integration.testsRun}</p>
        </div>
        <div class="card">
            <h4>Real-Time</h4>
            <p>Score: ${report.summary.categories.realTime.averageScore.toFixed(1)}%</p>
            <p>Tests: ${report.summary.categories.realTime.passed}/${report.summary.categories.realTime.testsRun}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(report: TestSuiteReport, config: ReportConfig): string {
    if (config.detailLevel === 'summary') {
      return JSON.stringify({
        id: report.id,
        timestamp: report.timestamp,
        summary: report.summary,
        trends: report.trends,
        recommendations: report.recommendations
      }, null, 2);
    }
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(report: TestSuiteReport, config: ReportConfig): string {
    const headers = [
      'Category',
      'Tests Run',
      'Passed',
      'Failed',
      'Average Score',
      'Average Duration',
      'Critical Issues'
    ];

    const rows = [
      headers.join(','),
      [
        'Data Accuracy',
        report.summary.categories.dataAccuracy.testsRun,
        report.summary.categories.dataAccuracy.passed,
        report.summary.categories.dataAccuracy.failed,
        report.summary.categories.dataAccuracy.averageScore.toFixed(1),
        report.summary.categories.dataAccuracy.averageDuration.toFixed(2),
        report.summary.categories.dataAccuracy.criticalIssues
      ].join(','),
      [
        'Performance',
        report.summary.categories.performance.testsRun,
        report.summary.categories.performance.passed,
        report.summary.categories.performance.failed,
        report.summary.categories.performance.averageScore.toFixed(1),
        report.summary.categories.performance.averageDuration.toFixed(2),
        report.summary.categories.performance.criticalIssues
      ].join(','),
      [
        'Integration',
        report.summary.categories.integration.testsRun,
        report.summary.categories.integration.passed,
        report.summary.categories.integration.failed,
        report.summary.categories.integration.averageScore.toFixed(1),
        report.summary.categories.integration.averageDuration.toFixed(2),
        report.summary.categories.integration.criticalIssues
      ].join(','),
      [
        'Real-Time',
        report.summary.categories.realTime.testsRun,
        report.summary.categories.realTime.passed,
        report.summary.categories.realTime.failed,
        report.summary.categories.realTime.averageScore.toFixed(1),
        report.summary.categories.realTime.averageDuration.toFixed(2),
        report.summary.categories.realTime.criticalIssues
      ].join(',')
    ];

    return rows.join('\n');
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: TestSuiteReport, config: ReportConfig): string {
    return `
# Sleeper API Test Suite Report

**Generated:** ${report.timestamp.toISOString()}  
**Duration:** ${report.duration.toFixed(2)}ms  
**Report ID:** ${report.id}

## Summary

| Metric | Value |
|--------|-------|
| Overall Score | ${report.summary.overallScore.toFixed(1)}% |
| Success Rate | ${report.summary.successRate.toFixed(1)}% |
| Total Tests | ${report.summary.totalTests} |
| Passed Tests | ${report.summary.passedTests} |
| Failed Tests | ${report.summary.failedTests} |
| Warnings | ${report.summary.warningCount} |

## Category Results

### Data Accuracy
- **Score:** ${report.summary.categories.dataAccuracy.averageScore.toFixed(1)}%
- **Tests:** ${report.summary.categories.dataAccuracy.passed}/${report.summary.categories.dataAccuracy.testsRun}
- **Critical Issues:** ${report.summary.categories.dataAccuracy.criticalIssues}

### Performance
- **Score:** ${report.summary.categories.performance.averageScore.toFixed(1)}%
- **Tests:** ${report.summary.categories.performance.passed}/${report.summary.categories.performance.testsRun}
- **Avg Duration:** ${report.summary.categories.performance.averageDuration.toFixed(2)}ms
- **Critical Issues:** ${report.summary.categories.performance.criticalIssues}

### Integration
- **Score:** ${report.summary.categories.integration.averageScore.toFixed(1)}%
- **Tests:** ${report.summary.categories.integration.passed}/${report.summary.categories.integration.testsRun}
- **Critical Issues:** ${report.summary.categories.integration.criticalIssues}

### Real-Time
- **Score:** ${report.summary.categories.realTime.averageScore.toFixed(1)}%
- **Tests:** ${report.summary.categories.realTime.passed}/${report.summary.categories.realTime.testsRun}
- **Critical Issues:** ${report.summary.categories.realTime.criticalIssues}

${config.includeTrends ? `
## Trend Analysis

**Period:** ${report.trends.period}  
**Data Points:** ${report.trends.dataPoints}

- **Accuracy Trend:** ${report.trends.trends.accuracy.direction} (${report.trends.trends.accuracy.changePercent.toFixed(1)}%)
- **Performance Trend:** ${report.trends.trends.performance.direction} (${report.trends.trends.performance.changePercent.toFixed(1)}%)
- **Reliability Trend:** ${report.trends.trends.reliability.direction} (${report.trends.trends.reliability.changePercent.toFixed(1)}%)
` : ''}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Report generated by Sleeper API Testing Framework*
    `.trim();
  }

  /**
   * Get reports within time range
   */
  getReports(timeRange?: { start: Date; end: Date }): TestSuiteReport[] {
    if (!timeRange) {
      return [...this.reports];
    }

    return this.reports.filter(report => 
      report.timestamp >= timeRange.start && report.timestamp <= timeRange.end
    );
  }

  /**
   * Get latest report
   */
  getLatestReport(): TestSuiteReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;
  }

  /**
   * Clear old reports (keep only last N)
   */
  cleanup(keepLast: number = 50): void {
    if (this.reports.length > keepLast) {
      this.reports = this.reports.slice(-keepLast);
    }
  }
}