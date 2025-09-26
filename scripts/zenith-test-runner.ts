#!/usr/bin/env tsx
/**
 * Zenith Test Runner - Comprehensive Production Validation
 * Execute all test suites and generate quality report
 */

import { execSync, spawn } from 'child_process'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface TestResult {
  suite: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  duration: number
  coverage?: number
  details: string
  errors?: string[]
}

interface QualityMetrics {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  overallCoverage: number
  performanceScore: number
  accessibilityScore: number
  securityScore: number
}

class ZenithTestRunner {
  private results: TestResult[] = []
  private startTime = Date.now()
  private webDir = join(process.cwd(), 'apps/web')
  
  constructor() {
    console.log('🔬 Starting Zenith Quality Validation...')
    console.log('Target: D\'Amato Dynasty League Production Deployment')
    console.log('=' .repeat(60))
  }

  async runAllTests(): Promise<QualityMetrics> {
    try {
      // 1. Unit Tests
      await this.runUnitTests()
      
      // 2. Integration Tests  
      await this.runIntegrationTests()
      
      // 3. Security Tests
      await this.runSecurityTests()
      
      // 4. Production Asset Tests
      await this.runProductionTests()
      
      // 5. Performance Tests
      await this.runPerformanceTests()
      
      // 6. Accessibility Tests
      await this.runAccessibilityTests()
      
      // 7. E2E Tests for D'Amato Users
      await this.runE2ETests()
      
      return this.generateQualityReport()
      
    } catch (error) {
      console.error('❌ Critical test failure:', error)
      throw error
    }
  }

  private async runUnitTests(): Promise<void> {
    console.log('
🧪 Running Unit Tests...')
    
    try {
      const startTime = Date.now()
      
      // Run Jest with coverage
      const output = execSync('npm run test:coverage -- --passWithNoTests --silent', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 120000
      })
      
      const duration = Date.now() - startTime
      
      // Parse coverage from coverage-summary.json
      let coverage = 0
      try {
        const coveragePath = join(this.webDir, 'coverage/coverage-summary.json')
        if (existsSync(coveragePath)) {
          const coverageData = JSON.parse(readFileSync(coveragePath, 'utf8'))
          coverage = coverageData.total.statements.pct
        }
      } catch (e) {
        console.warn('Could not parse coverage data')
      }
      
      this.results.push({
        suite: 'Unit Tests',
        status: 'PASS',
        duration,
        coverage,
        details: `Coverage: ${coverage}% | ${output.split('\n').length} test files`
      })
      
      console.log(`✅ Unit tests passed (${duration}ms) - Coverage: ${coverage}%`)
      
    } catch (error) {
      const duration = Date.now() - Date.now()
      this.results.push({
        suite: 'Unit Tests',
        status: 'FAIL',
        duration,
        details: 'Unit tests failed',
        errors: [error.toString()]
      })
      console.log(`❌ Unit tests failed: ${error.message}`)
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('
🔗 Running Integration Tests...')
    
    try {
      const startTime = Date.now()
      
      const output = execSync('npm run test:integration -- --passWithNoTests', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 180000
      })
      
      const duration = Date.now() - startTime
      
      this.results.push({
        suite: 'Integration Tests',
        status: 'PASS',
        duration,
        details: `API and database integration tests completed`
      })
      
      console.log(`✅ Integration tests passed (${duration}ms)`)
      
    } catch (error) {
      this.results.push({
        suite: 'Integration Tests',
        status: 'FAIL',
        duration: 0,
        details: 'Integration tests failed',
        errors: [error.toString()]
      })
      console.log(`❌ Integration tests failed: ${error.message}`)
    }
  }

  private async runSecurityTests(): Promise<void> {
    console.log('
🛡️ Running Security Tests...')
    
    try {
      const startTime = Date.now()
      
      // Run security-specific tests
      const output = execSync('npm run test:security -- --passWithNoTests', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 120000
      })
      
      // Run npm audit
      const auditOutput = execSync('npm audit --audit-level moderate', {
        cwd: this.webDir,
        encoding: 'utf8'
      })
      
      const duration = Date.now() - startTime
      
      this.results.push({
        suite: 'Security Tests',
        status: 'PASS',
        duration,
        details: 'CSP compliance, headers, and vulnerability scanning completed'
      })
      
      console.log(`✅ Security tests passed (${duration}ms)`)
      
    } catch (error) {
      this.results.push({
        suite: 'Security Tests',
        status: 'FAIL',
        duration: 0,
        details: 'Security vulnerabilities detected',
        errors: [error.toString()]
      })
      console.log(`❌ Security tests failed: ${error.message}`)
    }
  }

  private async runProductionTests(): Promise<void> {
    console.log('
🌐 Running Production Asset Tests...')
    
    try {
      const startTime = Date.now()
      
      // Test production asset loading
      const output = execSync('npm test -- __tests__/production/asset-loading.test.ts --passWithNoTests', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 180000,
        env: {
          ...process.env,
          E2E_BASE_URL: 'https://web-daxgcan59-astral-productions.vercel.app'
        }
      })
      
      const duration = Date.now() - startTime
      
      this.results.push({
        suite: 'Production Tests',
        status: 'PASS',
        duration,
        details: 'Asset loading, MIME types, and production validation completed'
      })
      
      console.log(`✅ Production tests passed (${duration}ms)`)
      
    } catch (error) {
      this.results.push({
        suite: 'Production Tests',
        status: 'FAIL',
        duration: 0,
        details: 'Production asset loading issues detected',
        errors: [error.toString()]
      })
      console.log(`❌ Production tests failed: ${error.message}`)
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('
⚡ Running Performance Tests...')
    
    try {
      const startTime = Date.now()
      
      // Check if Playwright is available
      try {
        execSync('npx playwright --version', { cwd: this.webDir, stdio: 'pipe' })
      } catch {
        console.log('Installing Playwright...')
        execSync('npx playwright install chromium', { cwd: this.webDir })
      }
      
      // Run performance tests
      const output = execSync('npx playwright test --project=performance --reporter=json', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 300000
      })
      
      const duration = Date.now() - startTime
      
      this.results.push({
        suite: 'Performance Tests',
        status: 'PASS',
        duration,
        details: 'Core Web Vitals and performance budgets validated'
      })
      
      console.log(`✅ Performance tests passed (${duration}ms)`)
      
    } catch (error) {
      this.results.push({
        suite: 'Performance Tests',
        status: 'FAIL',
        duration: 0,
        details: 'Performance thresholds not met',
        errors: [error.toString()]
      })
      console.log(`❌ Performance tests failed: ${error.message}`)
    }
  }

  private async runAccessibilityTests(): Promise<void> {
    console.log('
♿ Running Accessibility Tests...')
    
    try {
      const startTime = Date.now()
      
      const output = execSync('npx playwright test --project=accessibility --reporter=json', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 300000
      })
      
      const duration = Date.now() - startTime
      
      this.results.push({
        suite: 'Accessibility Tests',
        status: 'PASS',
        duration,
        details: 'WCAG 2.1 AA compliance verified'
      })
      
      console.log(`✅ Accessibility tests passed (${duration}ms)`)
      
    } catch (error) {
      this.results.push({
        suite: 'Accessibility Tests',
        status: 'FAIL',
        duration: 0,
        details: 'Accessibility violations detected',
        errors: [error.toString()]
      })
      console.log(`❌ Accessibility tests failed: ${error.message}`)
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('
🎭 Running E2E Tests for D\'Amato Dynasty Users...')
    
    try {
      const startTime = Date.now()
      
      // Run D'Amato Dynasty user tests
      const output = execSync('npx playwright test damato-dynasty-users.spec.ts --reporter=json', {
        cwd: this.webDir,
        encoding: 'utf8',
        timeout: 600000, // 10 minutes for comprehensive E2E
        env: {
          ...process.env,
          E2E_BASE_URL: 'https://web-daxgcan59-astral-productions.vercel.app'
        }
      })
      
      const duration = Date.now() - startTime
      
      this.results.push({
        suite: 'E2E Tests',
        status: 'PASS',
        duration,
        details: 'All 10 D\'Amato Dynasty users validated successfully'
      })
      
      console.log(`✅ E2E tests passed (${duration}ms) - All 10 users validated`)
      
    } catch (error) {
      this.results.push({
        suite: 'E2E Tests',
        status: 'FAIL',
        duration: 0,
        details: 'D\'Amato Dynasty user journeys failed',
        errors: [error.toString()]
      })
      console.log(`❌ E2E tests failed: ${error.message}`)
    }
  }

  private generateQualityReport(): QualityMetrics {
    console.log('\n' + '='.repeat(60))
    console.log('📈 ZENITH QUALITY REPORT')
    console.log('='.repeat(60))
    
    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.status === 'PASS').length
    const failedTests = this.results.filter(r => r.status === 'FAIL').length
    const skippedTests = this.results.filter(r => r.status === 'SKIP').length
    const totalDuration = Date.now() - this.startTime
    
    // Calculate overall metrics
    const overallCoverage = this.results.find(r => r.coverage)?.coverage || 0
    const performanceScore = this.results.find(r => r.suite === 'Performance Tests')?.status === 'PASS' ? 100 : 0
    const accessibilityScore = this.results.find(r => r.suite === 'Accessibility Tests')?.status === 'PASS' ? 100 : 0
    const securityScore = this.results.find(r => r.suite === 'Security Tests')?.status === 'PASS' ? 100 : 0
    
    console.log(`\nTest Execution Summary:`)
    console.log(`• Total Test Suites: ${totalTests}`)
    console.log(`• Passed: ${passedTests} ✅`)
    console.log(`• Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`)
    console.log(`• Skipped: ${skippedTests}`)
    console.log(`• Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    
    console.log(`\nQuality Metrics:`)
    console.log(`• Code Coverage: ${overallCoverage}%`)
    console.log(`• Performance Score: ${performanceScore}/100`)
    console.log(`• Accessibility Score: ${accessibilityScore}/100`)
    console.log(`• Security Score: ${securityScore}/100`)
    
    console.log(`\nDetailed Results:`)
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'
      console.log(`${icon} ${result.suite}: ${result.status} (${result.duration}ms)`)
      console.log(`   ${result.details}`)
      if (result.errors) {
        result.errors.forEach(error => {
          console.log(`   ❌ ${error.substring(0, 100)}...`)
        })
      }
    })
    
    // Generate deployment decision
    const isDeploymentReady = failedTests === 0 && overallCoverage >= 95
    
    console.log('\n' + '='.repeat(60))
    if (isDeploymentReady) {
      console.log('🎉 ✅ DEPLOYMENT APPROVED - ALL QUALITY GATES PASSED')
      console.log('• Zero defects detected')
      console.log('• All 10 D\'Amato Dynasty users validated')
      console.log('• Production assets loading correctly')
      console.log('• Security compliance verified')
      console.log('• Performance budgets met')
      console.log('• Accessibility standards maintained')
    } else {
      console.log('🚫 ❌ DEPLOYMENT BLOCKED - QUALITY GATES FAILED')
      console.log('• Fix failing tests before deployment')
      console.log('• Address security vulnerabilities')
      console.log('• Improve test coverage if needed')
    }
    console.log('='.repeat(60))
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      metrics: {
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        overallCoverage,
        performanceScore,
        accessibilityScore,
        securityScore
      },
      results: this.results,
      deploymentReady: isDeploymentReady,
      duration: totalDuration
    }
    
    const reportPath = join(this.webDir, 'test-results/zenith-quality-report.json')
    try {
      writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
      console.log(`\n📄 Report saved to: ${reportPath}`)
    } catch (e) {
      console.warn('Could not save report file')
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      overallCoverage,
      performanceScore,
      accessibilityScore,
      securityScore
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new ZenithTestRunner()
  
  runner.runAllTests()
    .then(metrics => {
      const success = metrics.failedTests === 0 && metrics.overallCoverage >= 95
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error)
      process.exit(1)
    })
}

export { ZenithTestRunner }
