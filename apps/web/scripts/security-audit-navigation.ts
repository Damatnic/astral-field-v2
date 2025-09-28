#!/usr/bin/env tsx

/**
 * Guardian Security Audit: AstralField Navigation Security Test
 * 
 * Comprehensive security audit for authentication and navigation issues
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface SecurityTest {
  name: string
  endpoint: string
  expectedStatus: number
  expectedRedirect?: string
  requiresAuth: boolean
  description: string
}

interface AuditResult {
  test: SecurityTest
  status: 'PASS' | 'FAIL' | 'WARNING'
  actualStatus: number
  actualRedirect?: string
  details: string
}

class GuardianSecurityAudit {
  private baseUrl = 'http://localhost:3000'
  private results: AuditResult[] = []

  private securityTests: SecurityTest[] = [
    // Authentication Routes (should be accessible without auth)
    {
      name: 'AUTH_SIGNIN_ACCESS',
      endpoint: '/auth/signin',
      expectedStatus: 200,
      requiresAuth: false,
      description: 'Sign-in page should be accessible without authentication'
    },
    {
      name: 'AUTH_SIGNUP_ACCESS', 
      endpoint: '/auth/signup',
      expectedStatus: 200,
      requiresAuth: false,
      description: 'Sign-up page should be accessible without authentication'
    },

    // Protected Routes (should redirect to signin when not authenticated)
    {
      name: 'DASHBOARD_PROTECTION',
      endpoint: '/dashboard',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin',
      requiresAuth: true,
      description: 'Dashboard should redirect to signin when not authenticated'
    },
    {
      name: 'TEAM_PROTECTION',
      endpoint: '/team',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin', 
      requiresAuth: true,
      description: 'Team page should redirect to signin when not authenticated'
    },
    {
      name: 'PLAYERS_PROTECTION',
      endpoint: '/players',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin',
      requiresAuth: true,
      description: 'Players page should redirect to signin when not authenticated'
    },
    {
      name: 'AI_COACH_PROTECTION',
      endpoint: '/ai-coach',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin',
      requiresAuth: true,
      description: 'AI Coach page should redirect to signin when not authenticated'
    },
    {
      name: 'SETTINGS_PROTECTION',
      endpoint: '/settings',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin',
      requiresAuth: true,
      description: 'Settings page should redirect to signin when not authenticated'
    },
    {
      name: 'LIVE_PROTECTION',
      endpoint: '/live',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin',
      requiresAuth: true,
      description: 'Live scoring page should redirect to signin when not authenticated'
    },
    {
      name: 'DRAFT_PROTECTION',
      endpoint: '/draft',
      expectedStatus: 307,
      expectedRedirect: '/auth/signin',
      requiresAuth: true,
      description: 'Draft page should redirect to signin when not authenticated'
    },

    // API Routes (should return 401 when not authenticated)
    {
      name: 'API_SETTINGS_PROTECTION',
      endpoint: '/api/settings',
      expectedStatus: 401,
      requiresAuth: true,
      description: 'Settings API should return 401 when not authenticated'
    },
    {
      name: 'API_TEAMS_PROTECTION',
      endpoint: '/api/teams/lineup',
      expectedStatus: 401,
      requiresAuth: true,
      description: 'Teams API should return 401 when not authenticated'
    },

    // Public Routes (should be accessible)
    {
      name: 'ROOT_ACCESS',
      endpoint: '/',
      expectedStatus: 200,
      requiresAuth: false,
      description: 'Root page should be accessible without authentication'
    },

    // Health/Debug Routes (should be accessible)
    {
      name: 'HEALTH_ACCESS',
      endpoint: '/api/health/database',
      expectedStatus: 200,
      requiresAuth: false,
      description: 'Health check should be accessible without authentication'
    }
  ]

  async runSecurityAudit(): Promise<void> {
    console.log('🛡️ Guardian Security Audit: AstralField Navigation Security Test')
    console.log('=' * 80)
    console.log()

    // Test server accessibility
    try {
      await this.testServerConnection()
    } catch (error) {
      console.error('❌ Server connection failed:', error)
      return
    }

    // Run all security tests
    for (const test of this.securityTests) {
      await this.runSecurityTest(test)
    }

    // Generate comprehensive report
    this.generateSecurityReport()
  }

  private async testServerConnection(): Promise<void> {
    try {
      const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${this.baseUrl}`)
      const statusCode = parseInt(stdout.trim())
      
      if (statusCode >= 200 && statusCode < 500) {
        console.log('✅ Server connection: OK')
      } else {
        throw new Error(`Server returned status ${statusCode}`)
      }
    } catch (error) {
      throw new Error(`Cannot connect to server at ${this.baseUrl}`)
    }
  }

  private async runSecurityTest(test: SecurityTest): Promise<void> {
    try {
      console.log(`🔍 Testing: ${test.name} - ${test.description}`)
      
      // Use curl to test the endpoint
      const curlCommand = `curl -s -I -L --max-redirs 0 "${this.baseUrl}${test.endpoint}"`
      const { stdout } = await execAsync(curlCommand)
      
      // Parse response
      const lines = stdout.split('\n')
      const statusLine = lines[0]
      const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)/)
      const actualStatus = statusMatch ? parseInt(statusMatch[1]) : 0
      
      // Check for redirects
      const locationHeader = lines.find(line => line.toLowerCase().startsWith('location:'))
      const actualRedirect = locationHeader ? locationHeader.split('location: ')[1]?.trim() : undefined

      // Evaluate test result
      const result = this.evaluateTestResult(test, actualStatus, actualRedirect)
      this.results.push(result)

      // Log result
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'
      console.log(`   ${statusIcon} ${result.status}: ${result.details}`)
      console.log()

    } catch (error) {
      const result: AuditResult = {
        test,
        status: 'FAIL',
        actualStatus: 0,
        details: `Test failed with error: ${error}`
      }
      this.results.push(result)
      console.log(`   ❌ FAIL: ${result.details}`)
      console.log()
    }
  }

  private evaluateTestResult(test: SecurityTest, actualStatus: number, actualRedirect?: string): AuditResult {
    let status: 'PASS' | 'FAIL' | 'WARNING' = 'FAIL'
    let details = ''

    if (actualStatus === test.expectedStatus) {
      if (test.expectedRedirect) {
        if (actualRedirect && actualRedirect.includes(test.expectedRedirect)) {
          status = 'PASS'
          details = `Correct status ${actualStatus} and redirect to ${actualRedirect}`
        } else {
          status = 'FAIL'
          details = `Expected redirect to ${test.expectedRedirect}, got ${actualRedirect || 'none'}`
        }
      } else {
        status = 'PASS'
        details = `Correct status ${actualStatus}`
      }
    } else {
      // Special case: 200 instead of 307 might indicate navigation issue
      if (test.requiresAuth && test.expectedStatus === 307 && actualStatus === 200) {
        status = 'FAIL'
        details = `SECURITY ISSUE: Protected route accessible without authentication (got ${actualStatus}, expected ${test.expectedStatus})`
      } else {
        status = 'FAIL'
        details = `Expected status ${test.expectedStatus}, got ${actualStatus}`
      }
    }

    return {
      test,
      status,
      actualStatus,
      actualRedirect,
      details
    }
  }

  private generateSecurityReport(): void {
    console.log('🛡️ GUARDIAN SECURITY AUDIT REPORT')
    console.log('=' * 80)
    console.log()

    const passed = this.results.filter(r => r.status === 'PASS').length
    const warnings = this.results.filter(r => r.status === 'WARNING').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const total = this.results.length

    console.log(`📊 TEST SUMMARY:`)
    console.log(`   ✅ Passed: ${passed}/${total}`)
    console.log(`   ⚠️  Warnings: ${warnings}/${total}`)
    console.log(`   ❌ Failed: ${failed}/${total}`)
    console.log()

    // Security score calculation
    const securityScore = Math.round((passed / total) * 100)
    console.log(`🔒 SECURITY SCORE: ${securityScore}%`)
    
    if (securityScore >= 90) {
      console.log('   🟢 EXCELLENT: Strong security posture')
    } else if (securityScore >= 75) {
      console.log('   🟡 GOOD: Minor security improvements needed')
    } else if (securityScore >= 50) {
      console.log('   🟠 MODERATE: Several security issues identified')
    } else {
      console.log('   🔴 POOR: Critical security vulnerabilities detected')
    }
    console.log()

    // Detailed failure analysis
    const failures = this.results.filter(r => r.status === 'FAIL')
    if (failures.length > 0) {
      console.log('❌ SECURITY FAILURES:')
      failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.test.name}: ${failure.details}`)
      })
      console.log()
    }

    // Navigation-specific analysis
    const navigationIssues = this.results.filter(r => 
      r.status === 'FAIL' && 
      r.test.requiresAuth && 
      r.actualStatus === 200
    )

    if (navigationIssues.length > 0) {
      console.log('🚨 CRITICAL NAVIGATION SECURITY ISSUES:')
      console.log('   The following protected routes are accessible without authentication:')
      navigationIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.test.endpoint} - ${issue.test.description}`)
      })
      console.log()
      console.log('💡 RECOMMENDED ACTIONS:')
      console.log('   1. Review middleware configuration in src/middleware.ts')
      console.log('   2. Verify protected route definitions')
      console.log('   3. Check session validation logic')
      console.log('   4. Ensure proper authentication flow')
      console.log()
    }

    // Security recommendations
    console.log('🔧 SECURITY RECOMMENDATIONS:')
    console.log('   1. Implement comprehensive RBAC (Role-Based Access Control)')
    console.log('   2. Add API rate limiting for authentication endpoints')
    console.log('   3. Implement session management with proper expiration')
    console.log('   4. Add audit logging for all authentication events')
    console.log('   5. Implement MFA for administrative functions')
    console.log('   6. Regular security penetration testing')
    console.log()

    console.log('🛡️ Guardian Security Audit Complete')
    console.log('=' * 80)
  }
}

// Execute the security audit
async function main() {
  const audit = new GuardianSecurityAudit()
  await audit.runSecurityAudit()
}

if (require.main === module) {
  main().catch(console.error)
}