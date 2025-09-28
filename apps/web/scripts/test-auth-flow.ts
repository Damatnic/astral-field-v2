#!/usr/bin/env tsx

/**
 * Guardian Security: Authentication Flow Testing
 * 
 * Tests the complete authentication flow to identify navigation issues
 */

import { execSync } from 'child_process'

interface TestUser {
  email: string
  password: string
  name: string
}

class AuthFlowTester {
  private baseUrl = 'http://localhost:3000'
  private testUser: TestUser = {
    email: 'test@damato-dynasty.com',
    password: 'test123',
    name: 'Test User'
  }

  async runAuthFlowTest(): Promise<void> {
    console.log('🔍 Guardian Security: Authentication Flow Test')
    console.log('=' * 60)
    console.log()

    try {
      // Test 1: Check if server is running
      console.log('1. 🌐 Testing server connectivity...')
      await this.testServerConnection()

      // Test 2: Check authentication endpoints
      console.log('2. 🔐 Testing authentication endpoints...')
      await this.testAuthEndpoints()

      // Test 3: Test sign-in process
      console.log('3. 📝 Testing sign-in process...')
      await this.testSignInProcess()

      // Test 4: Test protected route access
      console.log('4. 🛡️ Testing protected route access...')
      await this.testProtectedRoutes()

      console.log()
      console.log('✅ Authentication flow test completed successfully')

    } catch (error) {
      console.error('❌ Authentication flow test failed:', error)
    }
  }

  private async testServerConnection(): Promise<void> {
    try {
      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${this.baseUrl}`, { encoding: 'utf8' })
      const statusCode = parseInt(result.trim())
      
      if (statusCode >= 200 && statusCode < 400) {
        console.log(`   ✅ Server responsive (Status: ${statusCode})`)
      } else {
        throw new Error(`Server returned status ${statusCode}`)
      }
    } catch (error) {
      throw new Error(`Cannot connect to server: ${error}`)
    }
  }

  private async testAuthEndpoints(): Promise<void> {
    const endpoints = [
      { path: '/auth/signin', name: 'Sign-in page' },
      { path: '/api/auth/signin', name: 'Sign-in API' },
      { path: '/api/auth/session', name: 'Session API' }
    ]

    for (const endpoint of endpoints) {
      try {
        const result = execSync(
          `curl -s -o /dev/null -w "%{http_code}" ${this.baseUrl}${endpoint.path}`,
          { encoding: 'utf8' }
        )
        const statusCode = parseInt(result.trim())
        
        if (statusCode === 200 || statusCode === 405) { // 405 is OK for API endpoints without proper method
          console.log(`   ✅ ${endpoint.name}: Accessible (${statusCode})`)
        } else {
          console.log(`   ⚠️  ${endpoint.name}: Unexpected status ${statusCode}`)
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: Error - ${error}`)
      }
    }
  }

  private async testSignInProcess(): Promise<void> {
    console.log(`   📧 Testing with user: ${this.testUser.email}`)
    
    // Test 1: Get CSRF token
    console.log('   🔑 Getting CSRF token...')
    try {
      const csrfResult = execSync(
        `curl -s -c cookies.txt "${this.baseUrl}/api/auth/csrf"`,
        { encoding: 'utf8' }
      )
      console.log('   ✅ CSRF token retrieved')
    } catch (error) {
      console.log('   ❌ Failed to get CSRF token:', error)
      return
    }

    // Test 2: Attempt sign-in
    console.log('   🔐 Attempting sign-in...')
    try {
      const signInResult = execSync(`
        curl -s -b cookies.txt -c cookies.txt \\
        -X POST \\
        -H "Content-Type: application/x-www-form-urlencoded" \\
        -d "email=${this.testUser.email}&password=${this.testUser.password}&callbackUrl=/dashboard" \\
        "${this.baseUrl}/api/auth/callback/credentials"
      `, { encoding: 'utf8' })
      
      console.log('   ✅ Sign-in request sent')
    } catch (error) {
      console.log('   ❌ Sign-in failed:', error)
      return
    }

    // Test 3: Check session
    console.log('   🎫 Checking session...')
    try {
      const sessionResult = execSync(
        `curl -s -b cookies.txt "${this.baseUrl}/api/auth/session"`,
        { encoding: 'utf8' }
      )
      
      const session = JSON.parse(sessionResult)
      if (session && session.user) {
        console.log(`   ✅ Session active for user: ${session.user.email}`)
      } else {
        console.log('   ⚠️  No active session found')
      }
    } catch (error) {
      console.log('   ❌ Session check failed:', error)
    }
  }

  private async testProtectedRoutes(): Promise<void> {
    const protectedRoutes = [
      '/dashboard',
      '/team', 
      '/players',
      '/ai-coach',
      '/settings'
    ]

    console.log('   🔒 Testing protected route access with session...')
    
    for (const route of protectedRoutes) {
      try {
        const result = execSync(
          `curl -s -b cookies.txt -w "%{http_code}" -o /dev/null "${this.baseUrl}${route}"`,
          { encoding: 'utf8' }
        )
        const statusCode = parseInt(result.trim())
        
        if (statusCode === 200) {
          console.log(`   ✅ ${route}: Accessible with session (${statusCode})`)
        } else if (statusCode === 307) {
          console.log(`   ⚠️  ${route}: Still redirecting (${statusCode}) - possible session issue`)
        } else {
          console.log(`   ❌ ${route}: Unexpected status ${statusCode}`)
        }
      } catch (error) {
        console.log(`   ❌ ${route}: Error - ${error}`)
      }
    }

    // Clean up cookies
    try {
      execSync('rm -f cookies.txt', { encoding: 'utf8' })
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
async function main() {
  const tester = new AuthFlowTester()
  await tester.runAuthFlowTest()
}

if (require.main === module) {
  main().catch(console.error)
}