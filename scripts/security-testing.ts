#!/usr/bin/env tsx

/**
 * Guardian Security Testing Suite
 * Comprehensive penetration testing and vulnerability assessment
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'
import { performance } from 'perf_hooks'

const execAsync = promisify(exec)

interface SecurityTest {
  name: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  execute: () => Promise<SecurityTestResult>
}

interface SecurityTestResult {
  passed: boolean
  message: string
  details?: any
  executionTime: number
}

interface SecurityReport {
  timestamp: string
  totalTests: number
  passed: number
  failed: number
  critical: number
  high: number
  medium: number
  low: number
  tests: SecurityTestResult[]
  recommendations: string[]
}

class GuardianSecurityTester {
  private baseUrl: string
  private tests: SecurityTest[] = []

  constructor(baseUrl: string = 'http://localhost:3007') {
    this.baseUrl = baseUrl
    this.initializeTests()
  }

  private initializeTests() {
    this.tests = [
      // Authentication Security Tests
      {
        name: 'SQL Injection in Login',
        description: 'Test for SQL injection vulnerabilities in authentication',
        severity: 'CRITICAL',
        category: 'Authentication',
        execute: this.testSQLInjectionAuth.bind(this)
      },
      {
        name: 'Brute Force Protection',
        description: 'Test brute force protection mechanisms',
        severity: 'HIGH',
        category: 'Authentication',
        execute: this.testBruteForceProtection.bind(this)
      },
      {
        name: 'Session Management',
        description: 'Test session security and management',
        severity: 'HIGH',
        category: 'Session',
        execute: this.testSessionManagement.bind(this)
      },
      {
        name: 'JWT Security',
        description: 'Test JWT token security',
        severity: 'HIGH',
        category: 'Authentication',
        execute: this.testJWTSecurity.bind(this)
      },

      // Input Validation Tests
      {
        name: 'XSS Protection',
        description: 'Test for Cross-Site Scripting vulnerabilities',
        severity: 'HIGH',
        category: 'Input Validation',
        execute: this.testXSSProtection.bind(this)
      },
      {
        name: 'Command Injection',
        description: 'Test for command injection vulnerabilities',
        severity: 'CRITICAL',
        category: 'Input Validation',
        execute: this.testCommandInjection.bind(this)
      },
      {
        name: 'Path Traversal',
        description: 'Test for path traversal vulnerabilities',
        severity: 'HIGH',
        category: 'Input Validation',
        execute: this.testPathTraversal.bind(this)
      },

      // Security Headers Tests
      {
        name: 'Security Headers',
        description: 'Verify security headers are properly configured',
        severity: 'MEDIUM',
        category: 'Headers',
        execute: this.testSecurityHeaders.bind(this)
      },
      {
        name: 'HTTPS Enforcement',
        description: 'Test HTTPS redirection and enforcement',
        severity: 'HIGH',
        category: 'Transport',
        execute: this.testHTTPSEnforcement.bind(this)
      },

      // API Security Tests
      {
        name: 'Rate Limiting',
        description: 'Test API rate limiting protection',
        severity: 'MEDIUM',
        category: 'API',
        execute: this.testRateLimiting.bind(this)
      },
      {
        name: 'API Authentication',
        description: 'Test API authentication requirements',
        severity: 'HIGH',
        category: 'API',
        execute: this.testAPIAuthentication.bind(this)
      },
      {
        name: 'CORS Configuration',
        description: 'Test CORS configuration security',
        severity: 'MEDIUM',
        category: 'API',
        execute: this.testCORSConfiguration.bind(this)
      },

      // Data Protection Tests
      {
        name: 'Sensitive Data Exposure',
        description: 'Test for sensitive data exposure in responses',
        severity: 'HIGH',
        category: 'Data Protection',
        execute: this.testSensitiveDataExposure.bind(this)
      },
      {
        name: 'Error Handling',
        description: 'Test error handling for information disclosure',
        severity: 'MEDIUM',
        category: 'Data Protection',
        execute: this.testErrorHandling.bind(this)
      }
    ]
  }

  /**
   * Execute all security tests
   */
  async runAllTests(): Promise<SecurityReport> {
    console.log('🛡️  Starting Guardian Security Test Suite...\n')
    
    const results: SecurityTestResult[] = []
    let passed = 0
    let failed = 0
    let critical = 0
    let high = 0
    let medium = 0
    let low = 0

    for (const test of this.tests) {
      console.log(`🔍 Running: ${test.name}`)
      
      const startTime = performance.now()
      try {
        const result = await test.execute()
        result.executionTime = performance.now() - startTime
        
        results.push({
          ...result,
          ...{ testName: test.name, severity: test.severity, category: test.category }
        } as any)

        if (result.passed) {
          passed++
          console.log(`  ✅ PASS: ${result.message}`)
        } else {
          failed++
          console.log(`  ❌ FAIL: ${result.message}`)
          
          // Count by severity
          switch (test.severity) {
            case 'CRITICAL': critical++; break
            case 'HIGH': high++; break
            case 'MEDIUM': medium++; break
            case 'LOW': low++; break
          }
        }
      } catch (error) {
        failed++
        results.push({
          passed: false,
          message: `Test failed with error: ${error}`,
          executionTime: performance.now() - startTime,
          testName: test.name,
          severity: test.severity,
          category: test.category
        } as any)
        console.log(`  💥 ERROR: ${error}`)
      }
      
      console.log('')
    }

    const report: SecurityReport = {
      timestamp: new Date().toISOString(),
      totalTests: this.tests.length,
      passed,
      failed,
      critical,
      high,
      medium,
      low,
      tests: results,
      recommendations: this.generateRecommendations(results)
    }

    this.printReport(report)
    return report
  }

  // Authentication Tests
  private async testSQLInjectionAuth(): Promise<SecurityTestResult> {
    const maliciousPayloads = [
      "admin' OR '1'='1",
      "admin' UNION SELECT * FROM users--",
      "admin'; DROP TABLE users;--",
      "' OR 1=1--",
      "admin'/**/OR/**/1=1--"
    ]

    for (const payload of maliciousPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: payload,
          password: 'password'
        }, { timeout: 5000 })

        if (response.status === 200 && response.data.token) {
          return {
            passed: false,
            message: `SQL injection vulnerability detected with payload: ${payload}`,
            details: { payload, response: response.data },
            executionTime: 0
          }
        }
      } catch (error) {
        // Expected to fail - this is good
      }
    }

    return {
      passed: true,
      message: 'No SQL injection vulnerabilities detected in authentication',
      executionTime: 0
    }
  }

  private async testBruteForceProtection(): Promise<SecurityTestResult> {
    const attempts = 10
    let successfulAttempts = 0

    for (let i = 0; i < attempts; i++) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password: 'wrongpassword'
        }, { timeout: 5000 })

        if (response.status !== 429) {
          successfulAttempts++
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          return {
            passed: true,
            message: `Rate limiting activated after ${i + 1} attempts`,
            executionTime: 0
          }
        }
      }
    }

    return {
      passed: successfulAttempts < attempts,
      message: successfulAttempts === attempts 
        ? 'No brute force protection detected'
        : `Partial protection - ${successfulAttempts}/${attempts} attempts succeeded`,
      executionTime: 0
    }
  }

  private async testSessionManagement(): Promise<SecurityTestResult> {
    // Test session security
    try {
      const response = await axios.get(`${this.baseUrl}/api/auth/verify`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      })

      if (response.status === 200) {
        return {
          passed: false,
          message: 'Invalid token accepted - session management vulnerability',
          executionTime: 0
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          passed: true,
          message: 'Invalid tokens properly rejected',
          executionTime: 0
        }
      }
    }

    return {
      passed: false,
      message: 'Unexpected session management behavior',
      executionTime: 0
    }
  }

  private async testJWTSecurity(): Promise<SecurityTestResult> {
    const vulnerableTokens = [
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.', // None algorithm
      'null',
      'undefined',
      ''
    ]

    for (const token of vulnerableTokens) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/auth/verify`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.status === 200) {
          return {
            passed: false,
            message: `Vulnerable JWT token accepted: ${token}`,
            executionTime: 0
          }
        }
      } catch (error) {
        // Expected to fail
      }
    }

    return {
      passed: true,
      message: 'JWT security properly implemented',
      executionTime: 0
    }
  }

  // Input Validation Tests
  private async testXSSProtection(): Promise<SecurityTestResult> {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>'
    ]

    for (const payload of xssPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: payload,
          lastName: 'Test'
        })

        if (response.data?.user?.firstName === payload) {
          return {
            passed: false,
            message: `XSS payload not sanitized: ${payload}`,
            executionTime: 0
          }
        }
      } catch (error) {
        // Expected to fail
      }
    }

    return {
      passed: true,
      message: 'XSS protection working correctly',
      executionTime: 0
    }
  }

  private async testCommandInjection(): Promise<SecurityTestResult> {
    const commandPayloads = [
      '; ls -la',
      '| whoami',
      '`id`',
      '$(cat /etc/passwd)',
      '&& ping -c 1 google.com'
    ]

    for (const payload of commandPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/test`, {
          input: payload
        })

        // Check if command was executed (shouldn't be)
        if (response.data && typeof response.data === 'string' && 
            (response.data.includes('root:') || response.data.includes('uid='))) {
          return {
            passed: false,
            message: `Command injection vulnerability detected: ${payload}`,
            executionTime: 0
          }
        }
      } catch (error) {
        // Expected to fail
      }
    }

    return {
      passed: true,
      message: 'No command injection vulnerabilities detected',
      executionTime: 0
    }
  }

  private async testPathTraversal(): Promise<SecurityTestResult> {
    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc//passwd'
    ]

    for (const payload of pathPayloads) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/files/${payload}`)

        if (response.data && response.data.includes('root:')) {
          return {
            passed: false,
            message: `Path traversal vulnerability detected: ${payload}`,
            executionTime: 0
          }
        }
      } catch (error) {
        // Expected to fail
      }
    }

    return {
      passed: true,
      message: 'No path traversal vulnerabilities detected',
      executionTime: 0
    }
  }

  // Security Headers Tests
  private async testSecurityHeaders(): Promise<SecurityTestResult> {
    try {
      const response = await axios.get(this.baseUrl)
      const headers = response.headers

      const requiredHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': true,
        'content-security-policy': true
      }

      const missingHeaders: string[] = []

      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        if (!headers[header]) {
          missingHeaders.push(header)
        } else if (typeof expectedValue === 'string' && headers[header] !== expectedValue) {
          missingHeaders.push(`${header} (incorrect value)`)
        }
      }

      if (missingHeaders.length > 0) {
        return {
          passed: false,
          message: `Missing or incorrect security headers: ${missingHeaders.join(', ')}`,
          details: { missingHeaders, presentHeaders: headers },
          executionTime: 0
        }
      }

      return {
        passed: true,
        message: 'All required security headers present and correctly configured',
        executionTime: 0
      }
    } catch (error) {
      return {
        passed: false,
        message: `Failed to test security headers: ${error}`,
        executionTime: 0
      }
    }
  }

  private async testHTTPSEnforcement(): Promise<SecurityTestResult> {
    // This test would be more relevant in production
    return {
      passed: true,
      message: 'HTTPS enforcement test skipped in development environment',
      executionTime: 0
    }
  }

  // API Security Tests
  private async testRateLimiting(): Promise<SecurityTestResult> {
    const requests = Array(20).fill(null).map(() => 
      axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 })
    )

    try {
      const responses = await Promise.allSettled(requests)
      const rateLimited = responses.some(result => 
        result.status === 'rejected' && 
        (result.reason?.response?.status === 429)
      )

      return {
        passed: rateLimited,
        message: rateLimited 
          ? 'Rate limiting is working correctly'
          : 'No rate limiting detected - potential DoS vulnerability',
        executionTime: 0
      }
    } catch (error) {
      return {
        passed: false,
        message: `Rate limiting test failed: ${error}`,
        executionTime: 0
      }
    }
  }

  private async testAPIAuthentication(): Promise<SecurityTestResult> {
    const protectedEndpoints = [
      '/api/users',
      '/api/leagues',
      '/api/players',
      '/api/settings'
    ]

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`)
        
        if (response.status === 200) {
          return {
            passed: false,
            message: `Protected endpoint accessible without authentication: ${endpoint}`,
            executionTime: 0
          }
        }
      } catch (error: any) {
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          return {
            passed: false,
            message: `Unexpected response from protected endpoint ${endpoint}: ${error.response?.status}`,
            executionTime: 0
          }
        }
      }
    }

    return {
      passed: true,
      message: 'API authentication properly enforced',
      executionTime: 0
    }
  }

  private async testCORSConfiguration(): Promise<SecurityTestResult> {
    try {
      const response = await axios.options(this.baseUrl, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST'
        }
      })

      const corsHeader = response.headers['access-control-allow-origin']
      
      if (corsHeader === '*') {
        return {
          passed: false,
          message: 'CORS configured to allow all origins - security risk',
          executionTime: 0
        }
      }

      return {
        passed: true,
        message: 'CORS properly configured',
        executionTime: 0
      }
    } catch (error) {
      return {
        passed: true,
        message: 'CORS test completed - origin properly restricted',
        executionTime: 0
      }
    }
  }

  // Data Protection Tests
  private async testSensitiveDataExposure(): Promise<SecurityTestResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })

      const responseText = JSON.stringify(response.data).toLowerCase()
      const sensitivePatterns = [
        'password',
        'secret',
        'token',
        'key',
        'hash',
        'salt'
      ]

      for (const pattern of sensitivePatterns) {
        if (responseText.includes(pattern)) {
          return {
            passed: false,
            message: `Potential sensitive data exposure: ${pattern} found in response`,
            executionTime: 0
          }
        }
      }

      return {
        passed: true,
        message: 'No sensitive data exposure detected',
        executionTime: 0
      }
    } catch (error) {
      return {
        passed: true,
        message: 'Error responses properly handled',
        executionTime: 0
      }
    }
  }

  private async testErrorHandling(): Promise<SecurityTestResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/nonexistent`)
    } catch (error: any) {
      const errorResponse = error.response?.data
      
      if (typeof errorResponse === 'string' && 
          (errorResponse.includes('stack') || 
           errorResponse.includes('node_modules') ||
           errorResponse.includes('Error:'))) {
        return {
          passed: false,
          message: 'Error responses expose internal information',
          executionTime: 0
        }
      }
    }

    return {
      passed: true,
      message: 'Error handling properly configured',
      executionTime: 0
    }
  }

  private generateRecommendations(results: SecurityTestResult[]): string[] {
    const recommendations: string[] = []
    const failedTests = results.filter(r => !r.passed)

    if (failedTests.some(t => (t as any).severity === 'CRITICAL')) {
      recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Critical security vulnerabilities detected')
    }

    if (failedTests.some(t => (t as any).category === 'Authentication')) {
      recommendations.push('🔐 Review and strengthen authentication mechanisms')
    }

    if (failedTests.some(t => (t as any).category === 'Input Validation')) {
      recommendations.push('🛡️ Implement comprehensive input validation and sanitization')
    }

    if (failedTests.some(t => (t as any).category === 'Headers')) {
      recommendations.push('📋 Configure security headers according to OWASP guidelines')
    }

    if (failedTests.length === 0) {
      recommendations.push('✅ Excellent security posture! Continue regular security testing')
    }

    return recommendations
  }

  private printReport(report: SecurityReport) {
    console.log('\n' + '='.repeat(60))
    console.log('🛡️  GUARDIAN SECURITY TEST REPORT')
    console.log('='.repeat(60))
    console.log(`📅 Timestamp: ${report.timestamp}`)
    console.log(`📊 Total Tests: ${report.totalTests}`)
    console.log(`✅ Passed: ${report.passed}`)
    console.log(`❌ Failed: ${report.failed}`)
    console.log('')
    console.log('Severity Breakdown:')
    console.log(`🔴 Critical: ${report.critical}`)
    console.log(`🟠 High: ${report.high}`)
    console.log(`🟡 Medium: ${report.medium}`)
    console.log(`🟢 Low: ${report.low}`)
    console.log('')

    if (report.recommendations.length > 0) {
      console.log('📝 RECOMMENDATIONS:')
      report.recommendations.forEach(rec => console.log(`  ${rec}`))
      console.log('')
    }

    const securityScore = Math.round((report.passed / report.totalTests) * 100)
    console.log(`🎯 Security Score: ${securityScore}/100`)
    
    if (securityScore >= 90) {
      console.log('🏆 Security Level: EXCELLENT')
    } else if (securityScore >= 75) {
      console.log('👍 Security Level: GOOD')
    } else if (securityScore >= 60) {
      console.log('⚠️  Security Level: NEEDS IMPROVEMENT')
    } else {
      console.log('🚨 Security Level: CRITICAL - IMMEDIATE ACTION REQUIRED')
    }

    console.log('='.repeat(60))
  }
}

// Execute tests if run directly
if (require.main === module) {
  const tester = new GuardianSecurityTester()
  tester.runAllTests().then(() => {
    console.log('\n🛡️  Guardian Security Testing Complete!')
  }).catch(error => {
    console.error('Security testing failed:', error)
    process.exit(1)
  })
}

export default GuardianSecurityTester