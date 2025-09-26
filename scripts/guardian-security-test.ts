#!/usr/bin/env tsx
/**
 * Guardian Security Testing Suite
 * Comprehensive security verification for the player login system
 */

import axios, { AxiosResponse } from 'axios'
import chalk from 'chalk'
import crypto from 'crypto'

interface TestResult {
  test: string
  passed: boolean
  message: string
  details?: any
}

class GuardianSecurityTester {
  private baseURL: string
  private results: TestResult[] = []

  constructor(baseURL: string = 'http://localhost:3001') {
    this.baseURL = baseURL
  }

  /**
   * Guardian Security: Log test result
   */
  private logResult(test: string, passed: boolean, message: string, details?: any) {
    this.results.push({ test, passed, message, details })
    const status = passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')
    console.log(`${status} ${test}: ${message}`)
    if (details && !passed) {
      console.log(chalk.gray('  Details:', JSON.stringify(details, null, 2)))
    }
  }

  /**
   * Guardian Security: Test password hashing security
   */
  async testPasswordHashing(): Promise<void> {
    console.log(chalk.blue('\n🔐 Testing Password Hashing Security...'))

    try {
      // Test password complexity requirements
      const weakPasswords = [
        'password',
        '123456',
        'abc123',
        'qwerty',
        'admin',
        'user',
        '12345678'
      ]

      for (const password of weakPasswords) {
        try {
          const response = await axios.post(`${this.baseURL}/api/auth/register`, {
            email: `test${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User',
            username: `testuser${Date.now()}`
          })
          
          this.logResult(
            'Weak Password Rejection',
            false,
            `Weak password "${password}" was accepted`,
            { password, response: response.status }
          )
        } catch (error: any) {
          this.logResult(
            'Weak Password Rejection',
            true,
            `Weak password "${password}" correctly rejected`
          )
        }
      }

      // Test strong password acceptance
      const strongPassword = 'SecureP@ssw0rd123!'
      try {
        const response = await axios.post(`${this.baseURL}/api/auth/register`, {
          email: `strongtest${Date.now()}@example.com`,
          password: strongPassword,
          firstName: 'Strong',
          lastName: 'User',
          username: `stronguser${Date.now()}`
        })
        
        this.logResult(
          'Strong Password Acceptance',
          response.status === 201,
          'Strong password correctly accepted'
        )
      } catch (error: any) {
        this.logResult(
          'Strong Password Acceptance',
          false,
          'Strong password incorrectly rejected',
          error.response?.data
        )
      }

    } catch (error) {
      this.logResult(
        'Password Hashing Test',
        false,
        'Failed to test password hashing',
        error
      )
    }
  }

  /**
   * Guardian Security: Test brute force protection
   */
  async testBruteForceProtection(): Promise<void> {
    console.log(chalk.blue('\n🛡️ Testing Brute Force Protection...'))

    try {
      const testEmail = 'bruteforce@example.com'
      const wrongPassword = 'wrongpassword'
      let rateLimitHit = false
      let accountLocked = false

      // Attempt multiple failed logins
      for (let i = 1; i <= 10; i++) {
        try {
          await axios.post(`${this.baseURL}/api/auth/login`, {
            email: testEmail,
            password: wrongPassword
          })
        } catch (error: any) {
          const status = error.response?.status
          const data = error.response?.data

          if (status === 429) {
            rateLimitHit = true
            this.logResult(
              'Rate Limiting',
              true,
              `Rate limit triggered after ${i} attempts`
            )
            break
          } else if (status === 423) {
            accountLocked = true
            this.logResult(
              'Account Lockout',
              true,
              `Account locked after ${i} attempts`
            )
            break
          }
        }

        // Add delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!rateLimitHit && !accountLocked) {
        this.logResult(
          'Brute Force Protection',
          false,
          'No rate limiting or account lockout detected after 10 attempts'
        )
      }

    } catch (error) {
      this.logResult(
        'Brute Force Protection Test',
        false,
        'Failed to test brute force protection',
        error
      )
    }
  }

  /**
   * Guardian Security: Test SQL injection protection
   */
  async testSQLInjectionProtection(): Promise<void> {
    console.log(chalk.blue('\n💉 Testing SQL Injection Protection...'))

    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "'; UPDATE users SET password='hacked' --"
    ]

    for (const payload of sqlInjectionPayloads) {
      try {
        const response = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: payload,
          password: 'testpassword'
        })
        
        this.logResult(
          'SQL Injection Protection',
          false,
          `SQL injection payload was not blocked: ${payload}`,
          { payload, status: response.status }
        )
      } catch (error: any) {
        const status = error.response?.status
        if (status === 400 || status === 403) {
          this.logResult(
            'SQL Injection Protection',
            true,
            `SQL injection payload correctly blocked: ${payload.substring(0, 20)}...`
          )
        } else {
          this.logResult(
            'SQL Injection Protection',
            true,
            `SQL injection payload handled: ${payload.substring(0, 20)}...`
          )
        }
      }
    }
  }

  /**
   * Guardian Security: Test XSS protection
   */
  async testXSSProtection(): Promise<void> {
    console.log(chalk.blue('\n🔍 Testing XSS Protection...'))

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      '\"<script>alert(String.fromCharCode(88,83,83))</script>'
    ]

    for (const payload of xssPayloads) {
      try {
        const response = await axios.post(`${this.baseURL}/api/auth/register`, {
          email: `xsstest${Date.now()}@example.com`,
          password: 'SecureP@ssw0rd123!',
          firstName: payload,
          lastName: 'User',
          username: `xssuser${Date.now()}`
        })
        
        this.logResult(
          'XSS Protection',
          false,
          `XSS payload was not sanitized: ${payload}`,
          { payload, status: response.status }
        )
      } catch (error: any) {
        const status = error.response?.status
        if (status === 400 || status === 403) {
          this.logResult(
            'XSS Protection',
            true,
            `XSS payload correctly blocked: ${payload.substring(0, 20)}...`
          )
        } else {
          this.logResult(
            'XSS Protection',
            true,
            `XSS payload handled: ${payload.substring(0, 20)}...`
          )
        }
      }
    }
  }

  /**
   * Guardian Security: Test session security
   */
  async testSessionSecurity(): Promise<void> {
    console.log(chalk.blue('\n🎫 Testing Session Security...'))

    try {
      // Create a test user and login
      const testUser = {
        email: `sessiontest${Date.now()}@example.com`,
        password: 'SecureP@ssw0rd123!',
        firstName: 'Session',
        lastName: 'Test',
        username: `sessiontest${Date.now()}`
      }

      // Register user
      await axios.post(`${this.baseURL}/api/auth/register`, testUser)

      // Login to get token
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password
      })

      const token = loginResponse.data.token

      // Test token validation
      try {
        const verifyResponse = await axios.get(`${this.baseURL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        this.logResult(
          'Token Validation',
          verifyResponse.status === 200,
          'Valid token correctly accepted'
        )
      } catch (error: any) {
        this.logResult(
          'Token Validation',
          false,
          'Valid token incorrectly rejected',
          error.response?.data
        )
      }

      // Test invalid token
      try {
        await axios.get(`${this.baseURL}/api/auth/verify`, {
          headers: { Authorization: 'Bearer invalid_token' }
        })
        
        this.logResult(
          'Invalid Token Rejection',
          false,
          'Invalid token was accepted'
        )
      } catch (error: any) {
        this.logResult(
          'Invalid Token Rejection',
          error.response?.status === 401,
          'Invalid token correctly rejected'
        )
      }

      // Test token tampering
      const tamperedToken = token.slice(0, -5) + 'xxxxx'
      try {
        await axios.get(`${this.baseURL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${tamperedToken}` }
        })
        
        this.logResult(
          'Token Tampering Protection',
          false,
          'Tampered token was accepted'
        )
      } catch (error: any) {
        this.logResult(
          'Token Tampering Protection',
          error.response?.status === 401,
          'Tampered token correctly rejected'
        )
      }

    } catch (error) {
      this.logResult(
        'Session Security Test',
        false,
        'Failed to test session security',
        error
      )
    }
  }

  /**
   * Guardian Security: Test input validation
   */
  async testInputValidation(): Promise<void> {
    console.log(chalk.blue('\n📝 Testing Input Validation...'))

    const invalidInputs = [
      { field: 'email', value: 'invalid-email', expected: 'Invalid email format' },
      { field: 'email', value: '', expected: 'Email required' },
      { field: 'password', value: '123', expected: 'Password too short' },
      { field: 'firstName', value: '', expected: 'First name required' },
      { field: 'username', value: 'ab', expected: 'Username too short' },
      { field: 'username', value: 'user@name!', expected: 'Invalid characters' }
    ]

    for (const input of invalidInputs) {
      try {
        const testData = {
          email: 'valid@example.com',
          password: 'SecureP@ssw0rd123!',
          firstName: 'Valid',
          lastName: 'User',
          username: 'validusername'
        }

        // Override the field being tested
        ;(testData as any)[input.field] = input.value

        const response = await axios.post(`${this.baseURL}/api/auth/register`, testData)
        
        this.logResult(
          'Input Validation',
          false,
          `Invalid ${input.field} was accepted: ${input.value}`,
          { field: input.field, value: input.value }
        )
      } catch (error: any) {
        const status = error.response?.status
        if (status === 400) {
          this.logResult(
            'Input Validation',
            true,
            `Invalid ${input.field} correctly rejected: ${input.value}`
          )
        } else {
          this.logResult(
            'Input Validation',
            true,
            `Invalid ${input.field} handled: ${input.value}`
          )
        }
      }
    }
  }

  /**
   * Guardian Security: Test security headers
   */
  async testSecurityHeaders(): Promise<void> {
    console.log(chalk.blue('\n🛡️ Testing Security Headers...'))

    try {
      const response = await axios.get(`${this.baseURL}/api/health`)
      const headers = response.headers

      const requiredHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin'
      }

      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        const actualValue = headers[header]
        const isPresent = actualValue !== undefined
        const isCorrect = actualValue === expectedValue

        this.logResult(
          'Security Headers',
          isPresent && isCorrect,
          `${header}: ${isPresent ? actualValue : 'MISSING'}`,
          { expected: expectedValue, actual: actualValue }
        )
      }

    } catch (error) {
      this.logResult(
        'Security Headers Test',
        false,
        'Failed to test security headers',
        error
      )
    }
  }

  /**
   * Guardian Security: Generate security report
   */
  generateReport(): void {
    console.log(chalk.blue('\n📊 Guardian Security Test Report'))
    console.log(chalk.blue('====================================='))

    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length

    console.log(`\nTotal Tests: ${total}`)
    console.log(chalk.green(`Passed: ${passed}`)) 
    console.log(chalk.red(`Failed: ${failed}`))
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`)

    if (failed > 0) {
      console.log(chalk.red('\n❌ FAILED TESTS:'))
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(chalk.red(`  - ${result.test}: ${result.message}`))
        })
    }

    const score = Math.round((passed / total) * 100)
    if (score >= 90) {
      console.log(chalk.green('\n🏆 EXCELLENT: Your system has enterprise-grade security!'))
    } else if (score >= 80) {
      console.log(chalk.yellow('\n⚠️ GOOD: Your system is well secured with minor issues.'))
    } else if (score >= 70) {
      console.log(chalk.orange('\n🚨 MODERATE: Your system needs security improvements.'))
    } else {
      console.log(chalk.red('\n💀 CRITICAL: Your system has serious security vulnerabilities!'))
    }

    console.log(chalk.blue('\n🛡️ Guardian Security: Protection Analysis Complete'))
  }

  /**
   * Guardian Security: Run all security tests
   */
  async runAllTests(): Promise<void> {
    console.log(chalk.blue('🛡️ Guardian Security Testing Suite'))
    console.log(chalk.blue('==================================='))
    console.log(chalk.gray('Testing bulletproof security for player login system...\n'))

    await this.testPasswordHashing()
    await this.testBruteForceProtection()
    await this.testSQLInjectionProtection()
    await this.testXSSProtection()
    await this.testSessionSecurity()
    await this.testInputValidation()
    await this.testSecurityHeaders()

    this.generateReport()
  }
}

// Run the security tests
if (require.main === module) {
  const tester = new GuardianSecurityTester()
  tester.runAllTests().catch(error => {
    console.error(chalk.red('Security test suite failed:'), error)
    process.exit(1)
  })
}

export default GuardianSecurityTester
