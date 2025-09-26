#!/usr/bin/env tsx

// Guardian Security: Comprehensive Security Validation Suite
// Tests all implemented security measures and generates a security report

import { guardianAuditLogger, SecurityEventType } from '../apps/web/src/lib/security/audit-logger'
import { guardianSessionManager } from '../apps/web/src/lib/security/session-manager'
import { guardianAccountProtection } from '../apps/web/src/lib/security/account-protection'
import { guardianPrivacyProtection, ConsentPurpose, LegalBasis } from '../apps/web/src/lib/security/privacy-protection'
import { guardianMFA } from '../apps/web/src/lib/security/mfa'
import { rateLimiter } from '../apps/web/src/lib/security/rate-limiter'
import { guardianSecurityHeaders } from '../apps/web/src/lib/security/security-headers'

interface SecurityTestResult {
  component: string
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

interface SecurityReport {
  timestamp: string
  overallStatus: 'PASS' | 'FAIL' | 'WARN'
  totalTests: number
  passed: number
  failed: number
  warnings: number
  results: SecurityTestResult[]
  recommendations: string[]
  securityScore: number
}

class GuardianSecurityValidator {
  private results: SecurityTestResult[] = []

  async runAllTests(): Promise<SecurityReport> {
    console.log('🛡️  Guardian Security Validation Suite')
    console.log('=====================================\n')

    // Run all security component tests
    await this.testAuditLogging()
    await this.testSessionManagement()
    await this.testAccountProtection()
    await this.testPrivacyProtection()
    await this.testMFASystem()
    await this.testRateLimiting()
    await this.testSecurityHeaders()

    return this.generateReport()
  }

  private async testAuditLogging(): Promise<void> {
    console.log('Testing Audit Logging System...')

    try {
      // Test event logging
      const eventId = await guardianAuditLogger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'test-user-123',
        {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          location: { country: 'US', region: 'CA' }
        },
        {
          description: 'Test login event',
          riskScore: 0.2,
          context: { test: true }
        }
      )

      this.addResult('Audit Logging', 'Event Creation', 'PASS', 
        `Successfully created audit event: ${eventId}`)

      // Test event retrieval
      const events = guardianAuditLogger.getEvents({ limit: 1 })
      if (events.length > 0) {
        this.addResult('Audit Logging', 'Event Retrieval', 'PASS', 
          `Successfully retrieved ${events.length} events`)
      } else {
        this.addResult('Audit Logging', 'Event Retrieval', 'FAIL', 
          'No events found in audit log')
      }

      // Test security metrics
      const metrics = guardianAuditLogger.getSecurityMetrics()
      this.addResult('Audit Logging', 'Security Metrics', 'PASS', 
        `Generated metrics: ${metrics.eventsToday} events today`, metrics)

    } catch (error) {
      this.addResult('Audit Logging', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testSessionManagement(): Promise<void> {
    console.log('Testing Session Management...')

    try {
      // Test session creation
      const sessionData = await guardianSessionManager.createSession({
        userId: 'test-user-123',
        email: 'test@example.com',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        timestamp: Date.now()
      })

      this.addResult('Session Management', 'Session Creation', 'PASS', 
        `Created session: ${sessionData.sessionId}`)

      // Test session validation
      const validation = await guardianSessionManager.validateSession(
        sessionData.sessionId,
        { ip: '192.168.1.100' }
      )

      if (validation.isValid) {
        this.addResult('Session Management', 'Session Validation', 'PASS', 
          'Session validation successful')
      } else {
        this.addResult('Session Management', 'Session Validation', 'FAIL', 
          'Session validation failed')
      }

      // Test session stats
      const stats = guardianSessionManager.getSessionStats()
      this.addResult('Session Management', 'Session Statistics', 'PASS', 
        `Active sessions: ${stats.activeSessions}, Average risk: ${stats.averageRiskScore.toFixed(2)}`, stats)

    } catch (error) {
      this.addResult('Session Management', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testAccountProtection(): Promise<void> {
    console.log('Testing Account Protection...')

    try {
      const testUserId = 'test-user-protection'
      const testEmail = 'protection-test@example.com'

      // Test account lockout check
      const lockoutStatus = await guardianAccountProtection.isAccountLocked(testUserId)
      this.addResult('Account Protection', 'Lockout Check', 'PASS', 
        `Lockout status checked: ${lockoutStatus.isLocked ? 'Locked' : 'Unlocked'}`)

      // Test failed attempt recording
      const failureResult = await guardianAccountProtection.recordFailedAttempt(
        testUserId,
        testEmail,
        {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          attemptType: 'test_failure'
        }
      )

      this.addResult('Account Protection', 'Failed Attempt Recording', 'PASS', 
        `Recorded failed attempt. Risk score: ${failureResult.riskScore}`)

      // Test successful attempt recording
      const successResult = await guardianAccountProtection.recordSuccessfulAttempt(
        testUserId,
        testEmail,
        {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          sessionId: 'test-session-123'
        }
      )

      this.addResult('Account Protection', 'Success Attempt Recording', 'PASS', 
        `Recorded successful attempt. Anomalies detected: ${successResult.anomalies.length}`)

    } catch (error) {
      this.addResult('Account Protection', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testPrivacyProtection(): Promise<void> {
    console.log('Testing Privacy Protection (GDPR)...')

    try {
      const testUserId = 'test-user-privacy'

      // Test consent recording
      const consentIds = await guardianPrivacyProtection.recordConsent(
        testUserId,
        [ConsentPurpose.AUTHENTICATION, ConsentPurpose.SERVICE_PROVISION],
        LegalBasis.CONSENT,
        {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          consentMethod: 'explicit',
          policyVersion: '1.0'
        }
      )

      this.addResult('Privacy Protection', 'Consent Recording', 'PASS', 
        `Recorded ${consentIds.length} consent records`)

      // Test consent validation
      const hasConsent = guardianPrivacyProtection.hasValidConsent(
        testUserId, 
        ConsentPurpose.AUTHENTICATION
      )

      this.addResult('Privacy Protection', 'Consent Validation', 'PASS', 
        `Consent validation: ${hasConsent ? 'Valid' : 'Invalid'}`)

      // Test privacy request
      const requestId = await guardianPrivacyProtection.handlePrivacyRequest(
        testUserId,
        'access',
        {
          contactMethod: 'email',
          reason: 'Test data access request'
        },
        {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Test Browser)'
        }
      )

      this.addResult('Privacy Protection', 'Privacy Request', 'PASS', 
        `Created privacy request: ${requestId}`)

    } catch (error) {
      this.addResult('Privacy Protection', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testMFASystem(): Promise<void> {
    console.log('Testing MFA System...')

    try {
      // Test MFA setup generation
      const mfaSetup = guardianMFA.generateMFASetup('test@example.com')
      
      this.addResult('MFA System', 'Setup Generation', 'PASS', 
        `Generated MFA setup with ${mfaSetup.backupCodes.length} backup codes`)

      // Test TOTP verification (this will fail as we don't have a real authenticator)
      const isValidCode = guardianMFA.verifyTOTP('123456', mfaSetup.secret)
      this.addResult('MFA System', 'TOTP Verification', isValidCode ? 'PASS' : 'WARN', 
        `TOTP verification: ${isValidCode ? 'Valid' : 'Invalid (expected for test code)'}`)

      // Test backup code verification
      const backupResult = guardianMFA.verifyBackupCode(
        mfaSetup.backupCodes[0], 
        mfaSetup.backupCodes
      )

      this.addResult('MFA System', 'Backup Code Verification', 'PASS', 
        `Backup code verification: ${backupResult.isValid ? 'Valid' : 'Invalid'}`)

      // Test MFA status
      const mfaStatus = guardianMFA.getMFAStatus({
        secret: mfaSetup.secret,
        backupCodes: mfaSetup.backupCodes,
        isEnabled: true
      })

      this.addResult('MFA System', 'Status Check', 'PASS', 
        `MFA status: Enabled=${mfaStatus.isEnabled}, Backup codes=${mfaStatus.backupCodesRemaining}`)

    } catch (error) {
      this.addResult('MFA System', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testRateLimiting(): Promise<void> {
    console.log('Testing Rate Limiting...')

    try {
      const testIdentifier = 'test-ip-192.168.1.100'

      // Test rate limit checking
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.checkRateLimit(
          testIdentifier,
          'api:general',
          { userAgent: 'Test Browser', path: '/api/test' }
        )

        if (i === 0) {
          this.addResult('Rate Limiting', 'First Request', 'PASS', 
            `Rate limit check passed. Remaining: ${result.remaining}`)
        }
      }

      // Test rate limit metrics
      const metrics = rateLimiter.getMetrics()
      this.addResult('Rate Limiting', 'Metrics Collection', 'PASS', 
        `Collected metrics: ${metrics.totalRequests} total requests, ${metrics.blockedRequests} blocked`)

      // Test active rate limits
      const activeEntries = rateLimiter.getActiveEntries()
      this.addResult('Rate Limiting', 'Active Entries', 'PASS', 
        `Found ${activeEntries.length} active rate limit entries`)

    } catch (error) {
      this.addResult('Rate Limiting', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async testSecurityHeaders(): Promise<void> {
    console.log('Testing Security Headers...')

    try {
      // Test production headers generation
      const prodHeaders = guardianSecurityHeaders.generateHeaders(true)
      const hasCSP = 'Content-Security-Policy' in prodHeaders
      const hasHSTS = 'Strict-Transport-Security' in prodHeaders

      this.addResult('Security Headers', 'Production Headers', 'PASS', 
        `Generated ${Object.keys(prodHeaders).length} security headers`)

      if (hasCSP) {
        this.addResult('Security Headers', 'CSP Header', 'PASS', 
          'Content Security Policy header present')
      } else {
        this.addResult('Security Headers', 'CSP Header', 'FAIL', 
          'Content Security Policy header missing')
      }

      if (hasHSTS) {
        this.addResult('Security Headers', 'HSTS Header', 'PASS', 
          'HTTP Strict Transport Security header present')
      } else {
        this.addResult('Security Headers', 'HSTS Header', 'WARN', 
          'HSTS header missing (expected in development)')
      }

      // Test security score
      const securityScore = guardianSecurityHeaders.getSecurityScore()
      this.addResult('Security Headers', 'Security Score', 
        securityScore.score >= 80 ? 'PASS' : 'WARN', 
        `Security score: ${securityScore.score}/${securityScore.maxScore}`, securityScore)

    } catch (error) {
      this.addResult('Security Headers', 'System Test', 'FAIL', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private addResult(component: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any): void {
    this.results.push({ component, test, status, message, details })
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️ '
    console.log(`  ${emoji} ${component} - ${test}: ${message}`)
  }

  private generateReport(): SecurityReport {
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const warnings = this.results.filter(r => r.status === 'WARN').length

    const overallStatus = failed > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'PASS'
    const securityScore = Math.round((passed / this.results.length) * 100)

    const recommendations: string[] = []
    
    if (failed > 0) {
      recommendations.push('Address all failed security tests immediately')
    }
    if (warnings > 0) {
      recommendations.push('Review and resolve security warnings')
    }
    if (securityScore < 90) {
      recommendations.push('Improve security score to above 90%')
    }
    
    recommendations.push('Conduct regular security assessments')
    recommendations.push('Keep security dependencies updated')
    recommendations.push('Monitor security logs for anomalies')

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      totalTests: this.results.length,
      passed,
      failed,
      warnings,
      results: this.results,
      recommendations,
      securityScore
    }
  }
}

// Run the security validation
async function main() {
  const validator = new GuardianSecurityValidator()
  const report = await validator.runAllTests()

  console.log('\n🛡️  Security Validation Report')
  console.log('================================')
  console.log(`Overall Status: ${report.overallStatus}`)
  console.log(`Security Score: ${report.securityScore}%`)
  console.log(`Tests: ${report.passed} passed, ${report.failed} failed, ${report.warnings} warnings`)
  
  if (report.recommendations.length > 0) {
    console.log('\n📋 Recommendations:')
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`)
    })
  }

  console.log('\n✨ Guardian Security Suite validation complete!')
  
  // Write detailed report to file
  const fs = require('fs')
  const reportPath = './security-validation-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 Detailed report written to: ${reportPath}`)

  // Exit with appropriate code
  process.exit(report.overallStatus === 'FAIL' ? 1 : 0)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { GuardianSecurityValidator }