# Comprehensive Sleeper API Testing Framework

A specialized testing framework designed to validate, monitor, and ensure the reliability of Sleeper API integration for the D'Amato Dynasty League and Astral Field platform.

## Overview

This testing framework provides comprehensive validation across four critical areas:

1. **Data Accuracy Testing** - Validates NFL data accuracy against external sources
2. **Performance Testing** - Load testing, rate limiting, and response time validation  
3. **Integration Testing** - End-to-end D'Amato Dynasty League import testing
4. **Real-Time Testing** - Live scoring, WebSocket, and notification system testing

## Quick Start

### Running All Tests
```bash
npm run test:sleeper:all
```

### Running Specific Test Categories
```bash
# Data accuracy tests only
npm run test:sleeper:accuracy

# Performance tests only  
npm run test:sleeper:performance

# Integration tests only
npm run test:sleeper:integration

# Real-time tests only
npm run test:sleeper:realtime

# Start automated continuous testing
npm run test:sleeper:automated
```

### Running Individual Test Files
```bash
# Run comprehensive test suite
npx jest --config=jest.sleeper.config.js __tests__/comprehensive-sleeper-test.ts

# Run specific agent tests
npx jest --config=jest.sleeper.config.js __tests__/agents/dataAccuracyTestingAgent.test.ts
```

## Framework Architecture

### Testing Agents

#### 1. Data Accuracy Testing Agent (`/agents/dataAccuracyTestingAgent.ts`)
- **Purpose**: Validates Sleeper API data accuracy against known NFL sources
- **Features**:
  - Cross-references player data with ESPN and NFL.com
  - Validates injury status accuracy and timing
  - Verifies scoring calculations match standard fantasy rules
  - Tests edge cases (bye weeks, player transfers, IR status)
  - Continuous anomaly detection

**Key Methods**:
- `validateDataAccuracy()` - Comprehensive data validation
- `testEdgeCases()` - Edge case scenario testing
- `exportValidationReport()` - Generate detailed accuracy reports

#### 2. Performance Testing Agent (`/agents/performanceTestingAgent.ts`)
- **Purpose**: Validates API performance and scalability characteristics
- **Features**:
  - Load testing with configurable concurrent users
  - Rate limiting validation (1000 calls/minute)
  - Response time measurement and analysis
  - Memory usage monitoring
  - Cache efficiency testing
  - Stress testing and breaking point detection

**Key Methods**:
- `runPerformanceTestSuite()` - Complete performance validation
- `testRateLimitingBehavior()` - Rate limit compliance testing
- `exportPerformanceReport()` - Performance metrics reporting

#### 3. Integration Testing Agent (`/agents/integrationTestingAgent.ts`)
- **Purpose**: End-to-end testing of D'Amato Dynasty League import process
- **Features**:
  - Complete league import workflow testing
  - Roster synchronization accuracy validation
  - League settings and scoring rules mapping
  - Transaction history preservation
  - User authentication and permissions validation
  - Data integrity checks across full import

**Key Methods**:
- `runDamatoDynastyIntegrationTest()` - Complete integration testing
- `exportIntegrationReport()` - Integration test reporting

#### 4. Real-Time Testing Agent (`/agents/realTimeTestingAgent.ts`)
- **Purpose**: Validates real-time features and live data processing
- **Features**:
  - Live scoring validation during NFL games
  - WebSocket connection stability testing
  - Notification system accuracy and timing
  - Trending player data update testing
  - Game state transition verification
  - Real-time data synchronization validation

**Key Methods**:
- `runRealTimeTestSuite()` - Complete real-time testing
- `startLiveMonitoring()` - Continuous live monitoring
- `exportRealTimeReport()` - Real-time performance reporting

### Support Systems

#### Test Data Factories (`/factories/testDataFactories.ts`)
Generates realistic test data for all testing scenarios:
- **Player Data**: Realistic NFL player information with proper constraints
- **League Data**: Dynasty-specific league configurations
- **Transaction Data**: Various trade and waiver scenarios
- **Edge Cases**: Injury scenarios, bye weeks, rookie situations
- **D'Amato Dynasty Scenarios**: Complete league simulation data

#### API Mocking System (`/mocks/sleeperApiMocks.ts`)
Comprehensive API mocking with realistic behavior:
- **Response Simulation**: Realistic delays and response patterns
- **Error Scenarios**: Network timeouts, rate limits, server errors
- **Data Consistency**: Configurable data quality and inconsistencies
- **Cache Behavior**: Simulated caching with hit/miss ratios
- **Rate Limiting**: Accurate rate limit simulation

#### Validation Utilities (`/utils/validationUtils.ts`)
Advanced validation tools for data integrity:
- **Schema Validation**: Zod-based type-safe validation
- **Cross-Reference Validation**: Relationship integrity checking
- **Business Logic Validation**: Fantasy football rule compliance
- **Data Consistency**: Time-based consistency analysis
- **Batch Validation**: Efficient bulk validation processing

#### Reporting System (`/utils/reportingSystem.ts`)
Comprehensive reporting and analytics:
- **Multi-Format Export**: HTML, JSON, CSV, Markdown reports
- **Trend Analysis**: Historical performance tracking
- **Performance Metrics**: Detailed performance analytics
- **Dashboard Reports**: Executive summary reporting
- **Automated Alerts**: Threshold-based notifications

#### Automated Test Suite (`/suites/automatedTestSuite.ts`)
Continuous testing and monitoring:
- **Scheduled Execution**: Configurable test scheduling
- **Continuous Monitoring**: Real-time system health checks
- **Automated Alerting**: Threshold violation notifications
- **Baseline Tracking**: Performance baseline management
- **Error Recovery**: Automatic retry and recovery mechanisms

## Configuration

### Test Suite Configuration
```typescript
const config = {
  schedule: {
    dataAccuracy: '0 */2 * * *', // Every 2 hours
    performance: '0 */6 * * *',  // Every 6 hours
    integration: '0 8 * * *',    // Daily at 8 AM
    realTime: '*/15 * * * *',    // Every 15 minutes
    fullSuite: '0 2 * * 1'       // Weekly on Monday at 2 AM
  },
  thresholds: {
    minAccuracyScore: 85,
    maxResponseTime: 5000,
    minSuccessRate: 90,
    maxErrorRate: 5
  },
  notifications: {
    enabled: true,
    email: ['admin@example.com'],
    slack: 'https://hooks.slack.com/...'
  }
};
```

### Mock Configuration
```typescript
SleeperApiMocks.configure({
  enableNetworkDelay: true,
  averageDelay: 100,
  errorRate: 0.02, // 2% error rate
  rateLimitSimulation: true,
  maxRequestsPerMinute: 1000,
  includeInconsistentData: false,
  cacheSimulation: true
});
```

## Test Categories and Coverage

### Data Accuracy Tests
- ✅ Player data validation (names, positions, teams, status)
- ✅ Injury status accuracy and timing
- ✅ Scoring calculation verification
- ✅ Edge case handling (bye weeks, transfers, IR)
- ✅ Cross-reference validation with external sources
- ✅ Data consistency across time periods

### Performance Tests  
- ✅ Response time analysis
- ✅ Rate limiting compliance (1000 calls/minute)
- ✅ Concurrent load testing
- ✅ Memory usage monitoring
- ✅ Cache efficiency validation
- ✅ Stress testing and breaking points

### Integration Tests
- ✅ D'Amato Dynasty League import workflow
- ✅ Roster synchronization accuracy
- ✅ League settings mapping
- ✅ Transaction history preservation
- ✅ User authentication and permissions
- ✅ Data integrity validation

### Real-Time Tests
- ✅ Live scoring during NFL games
- ✅ WebSocket connection stability
- ✅ Notification system accuracy
- ✅ Trending data updates
- ✅ Game state transitions
- ✅ Real-time synchronization

## Expected Test Results

### Success Metrics
- **Data Accuracy Score**: ≥ 85%
- **Response Time**: ≤ 5000ms average
- **Success Rate**: ≥ 90%
- **Error Rate**: ≤ 5%
- **Cache Hit Rate**: ≥ 60%
- **Integration Accuracy**: ≥ 95%

### Performance Benchmarks
- **Average Response Time**: 100-500ms
- **Rate Limit Compliance**: 1000 requests/minute
- **Concurrent Users**: Up to 50 simultaneous
- **Memory Usage**: Stable under 500MB
- **WebSocket Latency**: ≤ 200ms

## Error Scenarios and Testing

### Network Error Simulation
```typescript
SleeperApiMocks.createErrorScenarios().networkTimeout();
```

### Rate Limiting Testing
```typescript
SleeperApiMocks.createErrorScenarios().rateLimitExceeded();
```

### Data Inconsistency Testing
```typescript
SleeperApiMocks.createErrorScenarios().invalidData();
```

### Intermittent Failure Testing
```typescript
SleeperApiMocks.createErrorScenarios().intermittentFailures();
```

## Reporting and Analytics

### Report Formats
- **HTML**: Interactive dashboard-style reports
- **Markdown**: Documentation-friendly reports
- **JSON**: Machine-readable data export
- **CSV**: Spreadsheet-compatible metrics

### Trend Analysis
- Performance trend tracking over time
- Accuracy score trend analysis
- Reliability metrics and patterns
- Anomaly detection and alerting

### Custom Reports
```typescript
const report = await reportingSystem.generateTestSuiteReport(
  dataAgent,
  performanceAgent, 
  integrationAgent,
  realTimeAgent
);

const htmlReport = reportingSystem.exportReport(report, {
  format: 'html',
  includeCharts: true,
  includeTrends: true,
  includeRecommendations: true,
  detailLevel: 'detailed'
});
```

## Continuous Testing

### Automated Execution
```typescript
const automatedSuite = new AutomatedTestSuite(config);
await automatedSuite.start();

// Monitor status
const status = automatedSuite.getStatus();
console.log(`Running: ${status.isRunning}`);
console.log(`Executions: ${status.executions.total}`);
```

### Monitoring and Alerts
- Real-time system health monitoring
- Threshold violation alerts
- Performance degradation detection
- Automated failure recovery
- Baseline performance tracking

## Troubleshooting

### Common Issues

#### High Error Rates
```bash
# Check mock configuration
SleeperApiMocks.getMockStats()

# Reset to defaults
SleeperApiMocks.reset()
```

#### Slow Test Performance
```bash
# Use fast configuration
setupUtils.configureFastTests()

# Reduce test scope
npm run test:sleeper:accuracy -- --testNamePattern="basic"
```

#### Memory Issues
```bash
# Monitor memory usage
node --max-old-space-size=4096 node_modules/.bin/jest --config=jest.sleeper.config.js
```

### Debug Mode
```bash
# Run with verbose output
VERBOSE=1 npm run test:sleeper:all

# Run with debug logging
DEBUG=sleeper:* npm run test:sleeper:all
```

## Contributing

### Adding New Tests
1. Create test file in appropriate `/agents/` directory
2. Follow naming convention: `*.test.ts`
3. Use provided utilities and mocks
4. Include comprehensive assertions
5. Add performance expectations

### Extending Validation
1. Add validation rules to `/utils/validationUtils.ts`
2. Include in appropriate testing agent
3. Update expected thresholds
4. Document new validation criteria

### Custom Test Data
1. Extend `/factories/testDataFactories.ts`
2. Add new scenario generation methods
3. Include edge cases and error conditions
4. Ensure reproducible with seeds

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Sleeper API Tests
  run: |
    npm run test:sleeper:all
    npm run test:sleeper:performance
```

### Test Reports
```yaml
- name: Publish Test Results
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Sleeper API Tests
    path: test-reports/sleeper/*.xml
    reporter: jest-junit
```

This framework provides comprehensive validation of the Sleeper API integration, ensuring data accuracy, performance reliability, and seamless D'Amato Dynasty League import functionality.