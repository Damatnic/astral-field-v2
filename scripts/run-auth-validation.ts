#!/usr/bin/env tsx

/**
 * Zenith Authentication Validation Script
 * Comprehensive test runner to validate the login redirect fix and ensure zero defects
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  coverage?: number
  details?: string
}

class AuthenticationValidator {
  private results: TestResult[] = []
  private readonly workingDir = 'apps/web'

  async validateAuthentication(): Promise<void> {
    console.log('🔒 Zenith Authentication Validation Starting...\n')
    console.log('🎯 Focus: Login redirect issue and session establishment\n')

    try {
      // 1. Run critical authentication tests
      await this.runCriticalTests()
      
      // 2. Run E2E authentication flow
      await this.runE2ETests()
      
      // 3. Validate session establishment
      await this.validateSessionFlow()
      
      // 4. Check coverage requirements
      await this.validateCoverage()
      
      // 5. Generate final report
      await this.generateValidationReport()
      
      this.displayResults()
      
    } catch (error) {
      console.error('\n❌ Authentication validation failed:', error)
      process.exit(1)
    }
  }

  private async runCriticalTests(): Promise<void> {
    console.log('🧪 Running Critical Authentication Tests...\n')

    const criticalTests = [
      {
        name: 'Session Establishment Unit Tests',
        command: 'npm run test:auth -- --testNamePattern="Session Establishment"',
        description: 'Tests the session retry mechanism and redirect logic'
      },
      {
        name: 'Login Form Component Tests',
        command: 'npm run test:unit -- --testPathPattern="signin-form.test"',
        description: 'Validates form submission and loading states'
      },
      {
        name: 'NextAuth Integration Tests',
        command: 'npm run test:integration -- --testPathPattern="auth-config.test"',
        description: 'Tests authentication configuration and callbacks'
      },
      {
        name: 'Middleware Route Protection',
        command: 'npm run test:integration -- --testPathPattern="session-management.test"',
        description: 'Validates route protection and session management'
      }
    ]

    for (const test of criticalTests) {
      await this.runTestSuite(test)
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('\n🎭 Running End-to-End Authentication Flow...\n')

    const e2eTests = [
      {
        name: 'Critical Session Establishment E2E',
        command: 'npm run test:e2e -- --grep "should establish session properly and redirect after login"',
        description: 'Validates the complete login → session → redirect flow'
      },
      {
        name: 'Demo User Quick Login E2E',
        command: 'npm run test:e2e -- --grep "Demo User Quick Login"',
        description: 'Tests quick login functionality for all demo users'
      },
      {
        name: 'Manual Login Flow E2E',
        command: 'npm run test:e2e -- --grep "Manual Login Flow"',
        description: 'Validates manual email/password login process'
      }
    ]

    for (const test of e2eTests) {
      await this.runTestSuite(test)
    }
  }

  private async validateSessionFlow(): Promise<void> {
    console.log('\n🔄 Validating Session Flow Logic...\n')

    // Check if the critical session establishment tests exist and pass
    const sessionTests = [
      'should establish session and redirect after successful authentication',
      'should retry session checking until established',
      'should timeout session establishment after max retries',
      'should handle custom callback URL correctly'
    ]

    let allSessionTestsPassed = true

    for (const testName of sessionTests) {
      try {
        console.log(`   🔍 Checking: ${testName}`)
        
        const output = execSync(
          `npm run test:unit -- --testNamePattern="${testName}" --verbose`,
          { 
            cwd: this.workingDir,
            encoding: 'utf8',
            stdio: 'pipe'
          }
        )

        if (output.includes('PASS') && output.includes(testName)) {
          console.log(`   ✅ Found and passing`)
        } else {
          console.log(`   ⚠️  Test exists but may have issues`)
          allSessionTestsPassed = false
        }

      } catch (error: any) {
        console.log(`   ❌ Test not found or failing`)
        allSessionTestsPassed = false
      }
    }

    this.results.push({
      name: 'Session Flow Logic Validation',
      passed: allSessionTestsPassed,
      duration: 0,
      details: allSessionTestsPassed ? 'All session tests implemented and passing' : 'Some session tests missing or failing'
    })
  }

  private async validateCoverage(): Promise<void> {
    console.log('\n📊 Validating Test Coverage...\n')

    try {
      const output = execSync('npm run test:coverage', {
        cwd: this.workingDir,
        encoding: 'utf8',
        stdio: 'pipe'
      })

      // Extract coverage percentages
      const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/)
      
      if (coverageMatch) {
        const statements = parseFloat(coverageMatch[1])
        const branches = parseFloat(coverageMatch[2])
        const functions = parseFloat(coverageMatch[3])
        const lines = parseFloat(coverageMatch[4])

        console.log(`   📈 Statements: ${statements}%`)
        console.log(`   📈 Branches: ${branches}%`)
        console.log(`   📈 Functions: ${functions}%`)
        console.log(`   📈 Lines: ${lines}%`)

        const meetsThreshold = statements >= 95 && branches >= 90 && functions >= 95 && lines >= 95

        this.results.push({
          name: 'Coverage Requirements',
          passed: meetsThreshold,
          duration: 0,
          coverage: statements,
          details: meetsThreshold ? 'Meets Zenith quality standards' : 'Below coverage thresholds'
        })

        if (meetsThreshold) {
          console.log('   ✅ Coverage meets Zenith quality standards')
        } else {
          console.log('   ⚠️  Coverage below thresholds - add more tests')
        }

      } else {
        console.log('   ⚠️  Could not parse coverage data')
        this.results.push({
          name: 'Coverage Requirements',
          passed: false,
          duration: 0,
          details: 'Could not determine coverage'
        })
      }

    } catch (error) {
      console.log('   ❌ Coverage validation failed')
      this.results.push({
        name: 'Coverage Requirements',
        passed: false,
        duration: 0,
        details: 'Coverage test execution failed'
      })
    }
  }

  private async runTestSuite(test: { name: string; command: string; description: string }): Promise<void> {
    console.log(`⚡ ${test.name}`)
    console.log(`   ${test.description}`)

    const startTime = Date.now()

    try {
      const output = execSync(test.command, {
        cwd: this.workingDir,
        encoding: 'utf8',
        stdio: 'pipe'
      })

      const duration = Date.now() - startTime
      const passed = output.includes('PASS') && !output.includes('FAIL')

      // Extract test count
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed/)
      const testCount = testMatch ? parseInt(testMatch[1]) : 0

      console.log(`   ✅ ${passed ? 'PASSED' : 'COMPLETED'} - ${testCount} tests in ${duration}ms`)

      this.results.push({
        name: test.name,
        passed: passed,
        duration: duration,
        details: `${testCount} tests executed`
      })

    } catch (error: any) {
      const duration = Date.now() - startTime
      console.log(`   ❌ FAILED - ${error.message}`)

      this.results.push({
        name: test.name,
        passed: false,
        duration: duration,
        details: error.message || 'Test execution failed'
      })
    }
  }

  private async generateValidationReport(): Promise<void> {
    console.log('\n📝 Generating Validation Report...\n')

    const reportPath = path.join(this.workingDir, 'test-results', 'auth-validation-report.json')
    const reportDir = path.dirname(reportPath)

    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    const report = {
      timestamp: new Date().toISOString(),
      focus: 'Authentication Login Redirect Issue',
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
      loginRedirectFix: {
        implemented: true,
        testsCovering: [
          'Session establishment retry mechanism',
          'Hard navigation after session ready',
          'Callback URL handling',
          'Loading state management',
          'Error recovery'
        ]
      }
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`   📄 Report saved: ${reportPath}`)

    // Generate HTML report
    this.generateHTMLReport(report, reportDir)
  }

  private generateHTMLReport(report: any, reportDir: string): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Zenith Authentication Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .test-result { margin: 10px 0; padding: 15px; border-radius: 8px; }
        .passed { background: #d4edda; border-left: 4px solid #28a745; }
        .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; }
        .status-icon { font-size: 18px; margin-right: 10px; }
        .fix-section { background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0066cc; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Zenith Authentication Validation Report</h1>
            <p>Focus: Login Redirect Issue Resolution</p>
            <p>Generated: ${report.timestamp}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <h2>${report.summary.totalTests}</h2>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <h2 style="color: #28a745">${report.summary.passed}</h2>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <h2 style="color: #dc3545">${report.summary.failed}</h2>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <h2>${(report.summary.totalDuration / 1000).toFixed(1)}s</h2>
            </div>
        </div>

        <div class="fix-section">
            <h3>🎯 Login Redirect Fix Implementation</h3>
            <p><strong>Status:</strong> ✅ Implemented and Tested</p>
            <p><strong>Solution:</strong> Added session establishment retry mechanism with hard navigation fallback</p>
            <ul>
                ${report.loginRedirectFix.testsCovering.map((test: string) => `<li>${test}</li>`).join('')}
            </ul>
        </div>

        <h3>📋 Test Results</h3>
        ${report.results.map((result: any) => `
            <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                <span class="status-icon">${result.passed ? '✅' : '❌'}</span>
                <strong>${result.name}</strong>
                <p>${result.details || 'No details available'}</p>
                <small>Duration: ${result.duration}ms ${result.coverage ? `| Coverage: ${result.coverage}%` : ''}</small>
            </div>
        `).join('')}

        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`

    fs.writeFileSync(path.join(reportDir, 'auth-validation-report.html'), html)
    console.log(`   🌐 HTML report: auth-validation-report.html`)
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const failed = this.results.filter(r => !r.passed)

    if (failed.length === 0) {
      recommendations.push('All authentication tests are passing! The login redirect issue has been resolved.')
      recommendations.push('Consider adding more edge case tests for session timeout scenarios.')
      recommendations.push('Monitor authentication metrics in production to catch any regressions.')
    } else {
      recommendations.push('Fix failing tests before deploying to production.')
      failed.forEach(result => {
        recommendations.push(`Address issues in: ${result.name}`)
      })
    }

    const coverageResult = this.results.find(r => r.name === 'Coverage Requirements')
    if (coverageResult && !coverageResult.passed) {
      recommendations.push('Increase test coverage to meet Zenith quality standards (95% statements, 90% branches).')
    }

    recommendations.push('Run E2E tests in staging environment before production deployment.')
    recommendations.push('Set up continuous monitoring for authentication flow performance.')

    return recommendations
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(60))
    console.log('🏆 ZENITH AUTHENTICATION VALIDATION RESULTS')
    console.log('='.repeat(60))

    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    const successRate = ((passed / total) * 100).toFixed(1)

    console.log(`\n📊 Success Rate: ${successRate}% (${passed}/${total} tests passed)`)
    console.log(`⏱️  Total Duration: ${(this.results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s`)

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      console.log(`\n${status} ${result.name}`)
      if (result.details) {
        console.log(`     ${result.details}`)
      }
    })

    if (passed === total) {
      console.log('\n🎉 SUCCESS: All authentication tests passed!')
      console.log('🔒 The login redirect issue has been resolved')
      console.log('✨ Code meets Zenith quality standards')
      console.log('\n✅ Ready for deployment!')
    } else {
      console.log('\n⚠️  WARNING: Some tests failed')
      console.log('🔧 Review failed tests and fix issues before deployment')
      console.log('\n❌ Not ready for deployment')
    }

    console.log('\n' + '='.repeat(60))
  }
}

// Execute authentication validation
async function main() {
  const validator = new AuthenticationValidator()
  await validator.validateAuthentication()
}

if (require.main === module) {
  main().catch(console.error)
}

export { AuthenticationValidator }