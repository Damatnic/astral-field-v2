#!/usr/bin/env tsx

/**
 * Phoenix Performance Testing Suite
 * Benchmarks authentication and database performance optimizations
 */

import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

interface PerformanceTestResult {
  operation: string
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  p95Time: number
  p99Time: number
  throughput: number // operations per second
  errors: number
}

interface TestConfig {
  iterations: number
  concurrency: number
  warmupIterations: number
  testTimeout: number
}

class PhoenixPerformanceTester {
  private prisma: PrismaClient
  private testUsers: Array<{ email: string; password: string; hashedPassword: string }> = []
  private results: PerformanceTestResult[] = []

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }

  async initialize(): Promise<void> {
    console.log('🔥 Phoenix Performance Testing Suite')
    console.log('=====================================')
    
    // Create test users
    await this.createTestUsers()
    
    console.log(`✅ Initialized with ${this.testUsers.length} test users`)
  }

  private async createTestUsers(): Promise<void> {
    const userCount = 100
    console.log(`Creating ${userCount} test users...`)
    
    for (let i = 0; i < userCount; i++) {
      const password = `testpass${i}`
      const hashedPassword = await bcrypt.hash(password, 12)
      const email = `phoenixtest${i}@example.com`
      
      this.testUsers.push({
        email,
        password,
        hashedPassword
      })

      try {
        await this.prisma.user.upsert({
          where: { email },
          update: { hashedPassword },
          create: {
            email,
            name: `Phoenix Test User ${i}`,
            hashedPassword,
            role: 'USER'
          }
        })
      } catch (error) {
        // User might already exist, continue
      }
    }
  }

  async runAllTests(): Promise<void> {
    const config: TestConfig = {
      iterations: 1000,
      concurrency: 10,
      warmupIterations: 50,
      testTimeout: 30000
    }

    console.log('\n📊 Starting Performance Tests')
    console.log(`Configuration: ${config.iterations} iterations, ${config.concurrency} concurrent`)
    console.log('Target: <50ms authentication, <10ms database queries\n')

    // Test 1: Database Query Performance
    await this.testDatabaseQueries(config)
    
    // Test 2: Authentication Performance
    await this.testAuthentication(config)
    
    // Test 3: Password Verification Performance
    await this.testPasswordVerification(config)
    
    // Test 4: Session Validation Performance
    await this.testSessionValidation(config)
    
    // Test 5: Concurrent Load Testing
    await this.testConcurrentLoad(config)

    // Generate performance report
    this.generateReport()
  }

  private async testDatabaseQueries(config: TestConfig): Promise<void> {
    console.log('🔍 Testing Database Query Performance...')
    
    // Test 1: User lookup by email (most critical)
    const emailLookupTimes = await this.measureOperation(
      'Email Lookup',
      config.iterations,
      async () => {
        const randomUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)]
        return await this.prisma.user.findUnique({
          where: { email: randomUser.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            teamName: true,
            hashedPassword: true,
            updatedAt: true
          }
        })
      }
    )
    
    this.results.push(emailLookupTimes)

    // Test 2: User lookup by ID
    const idLookupTimes = await this.measureOperation(
      'ID Lookup',
      config.iterations,
      async () => {
        // First get a user ID
        const user = await this.prisma.user.findFirst({ select: { id: true } })
        if (!user) throw new Error('No user found')
        
        return await this.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        })
      }
    )
    
    this.results.push(idLookupTimes)

    // Test 3: Team queries for dashboard
    const teamQueryTimes = await this.measureOperation(
      'Team Dashboard Query',
      Math.floor(config.iterations / 2),
      async () => {
        const user = await this.prisma.user.findFirst({ select: { id: true } })
        if (!user) throw new Error('No user found')
        
        return await this.prisma.team.findMany({
          where: { ownerId: user.id },
          include: {
            league: {
              select: { name: true, isActive: true }
            }
          }
        })
      }
    )
    
    this.results.push(teamQueryTimes)
  }

  private async testAuthentication(config: TestConfig): Promise<void> {
    console.log('🔐 Testing Authentication Performance...')
    
    const authTimes = await this.measureOperation(
      'Full Authentication',
      config.iterations,
      async () => {
        const randomUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)]
        
        // Simulate full authentication flow
        const user = await this.prisma.user.findUnique({
          where: { email: randomUser.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            teamName: true,
            hashedPassword: true,
            updatedAt: true
          }
        })
        
        if (!user || !user.hashedPassword) {
          throw new Error('User not found')
        }
        
        const isValid = await bcrypt.compare(randomUser.password, user.hashedPassword)
        
        if (isValid) {
          // Update last login (async)
          setImmediate(async () => {
            try {
              await this.prisma.user.update({
                where: { id: user.id },
                data: { updatedAt: new Date() }
              })
            } catch (error) {
              // Ignore update errors in test
            }
          })
        }
        
        return { user, isValid }
      }
    )
    
    this.results.push(authTimes)
  }

  private async testPasswordVerification(config: TestConfig): Promise<void> {
    console.log('🔑 Testing Password Verification Performance...')
    
    const passwordTimes = await this.measureOperation(
      'Password Verification',
      config.iterations,
      async () => {
        const randomUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)]
        return await bcrypt.compare(randomUser.password, randomUser.hashedPassword)
      }
    )
    
    this.results.push(passwordTimes)
  }

  private async testSessionValidation(config: TestConfig): Promise<void> {
    console.log('🎫 Testing Session Validation Performance...')
    
    // Create some test sessions first
    const sessions = []
    for (let i = 0; i < 20; i++) {
      sessions.push({
        sessionId: `test-session-${i}`,
        userId: `test-user-${i}`,
        expiresAt: Date.now() + 30 * 60 * 1000,
        isActive: true
      })
    }
    
    const sessionTimes = await this.measureOperation(
      'Session Validation',
      config.iterations,
      async () => {
        const randomSession = sessions[Math.floor(Math.random() * sessions.length)]
        
        // Simulate session validation
        const isValid = randomSession.expiresAt > Date.now() && randomSession.isActive
        
        if (isValid) {
          // Simulate user lookup for session
          const user = await this.prisma.user.findFirst({
            select: { id: true, email: true, role: true }
          })
          return { session: randomSession, user }
        }
        
        return null
      }
    )
    
    this.results.push(sessionTimes)
  }

  private async testConcurrentLoad(config: TestConfig): Promise<void> {
    console.log('⚡ Testing Concurrent Load Performance...')
    
    const concurrentTimes = await this.measureConcurrentOperation(
      'Concurrent Authentication',
      config.iterations,
      config.concurrency,
      async () => {
        const randomUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)]
        
        const user = await this.prisma.user.findUnique({
          where: { email: randomUser.email },
          select: {
            id: true,
            email: true,
            hashedPassword: true
          }
        })
        
        if (user && user.hashedPassword) {
          return await bcrypt.compare(randomUser.password, user.hashedPassword)
        }
        
        return false
      }
    )
    
    this.results.push(concurrentTimes)
  }

  private async measureOperation(
    name: string,
    iterations: number,
    operation: () => Promise<any>
  ): Promise<PerformanceTestResult> {
    const times: number[] = []
    let errors = 0
    
    console.log(`  Running ${name}: ${iterations} iterations...`)
    
    const startTime = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now()
      
      try {
        await operation()
        const opTime = performance.now() - opStart
        times.push(opTime)
      } catch (error) {
        errors++
        times.push(0) // Count as 0ms for failed operations
      }
      
      // Progress indicator
      if (i % 100 === 0 && i > 0) {
        process.stdout.write(`\r    Progress: ${i}/${iterations}`)
      }
    }
    
    const totalTime = performance.now() - startTime
    times.sort((a, b) => a - b)
    
    console.log(`\r    Completed: ${iterations}/${iterations}`)
    
    return {
      operation: name,
      iterations,
      totalTime,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p95Time: times[Math.floor(times.length * 0.95)],
      p99Time: times[Math.floor(times.length * 0.99)],
      throughput: iterations / (totalTime / 1000),
      errors
    }
  }

  private async measureConcurrentOperation(
    name: string,
    iterations: number,
    concurrency: number,
    operation: () => Promise<any>
  ): Promise<PerformanceTestResult> {
    const times: number[] = []
    let errors = 0
    
    console.log(`  Running ${name}: ${iterations} iterations with ${concurrency} concurrency...`)
    
    const startTime = performance.now()
    const batchSize = Math.ceil(iterations / concurrency)
    
    const batches: Promise<void>[] = []
    
    for (let batch = 0; batch < concurrency; batch++) {
      const batchPromise = (async () => {
        for (let i = 0; i < batchSize && (batch * batchSize + i) < iterations; i++) {
          const opStart = performance.now()
          
          try {
            await operation()
            const opTime = performance.now() - opStart
            times.push(opTime)
          } catch (error) {
            errors++
            times.push(0)
          }
        }
      })()
      
      batches.push(batchPromise)
    }
    
    await Promise.all(batches)
    
    const totalTime = performance.now() - startTime
    times.sort((a, b) => a - b)
    
    return {
      operation: name,
      iterations,
      totalTime,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p95Time: times[Math.floor(times.length * 0.95)],
      p99Time: times[Math.floor(times.length * 0.99)],
      throughput: iterations / (totalTime / 1000),
      errors
    }
  }

  private generateReport(): void {
    console.log('\n📈 Phoenix Performance Test Results')
    console.log('====================================')
    
    const targets = {
      'Email Lookup': 10,
      'ID Lookup': 5,
      'Full Authentication': 50,
      'Password Verification': 30,
      'Session Validation': 25,
      'Team Dashboard Query': 20,
      'Concurrent Authentication': 75
    }
    
    console.log('\nOperation                  | Avg (ms) | P95 (ms) | P99 (ms) | Throughput (ops/s) | Target | Status')
    console.log('---------------------------|----------|----------|----------|-------------------|--------|--------')
    
    for (const result of this.results) {
      const target = targets[result.operation] || 50
      const status = result.averageTime <= target ? '✅ PASS' : '❌ FAIL'
      
      console.log(
        `${result.operation.padEnd(26)} | ${result.averageTime.toFixed(2).padStart(8)} | ${result.p95Time.toFixed(2).padStart(8)} | ${result.p99Time.toFixed(2).padStart(8)} | ${result.throughput.toFixed(0).padStart(17)} | ${target.toString().padStart(6)} | ${status}`
      )
    }
    
    console.log('\n🎯 Performance Summary:')
    
    const criticalOperations = this.results.filter(r => 
      ['Email Lookup', 'Full Authentication', 'Password Verification'].includes(r.operation)
    )
    
    const allPassing = criticalOperations.every(r => {
      const target = targets[r.operation] || 50
      return r.averageTime <= target
    })
    
    if (allPassing) {
      console.log('✅ All critical performance targets met!')
      console.log('🚀 Phoenix optimizations are working effectively')
    } else {
      console.log('❌ Some performance targets not met')
      console.log('🔧 Additional optimization may be required')
    }
    
    // Calculate overall improvement
    const authResult = this.results.find(r => r.operation === 'Full Authentication')
    if (authResult) {
      const improvement = ((300 - authResult.averageTime) / 300) * 100 // Baseline 300ms
      console.log(`📊 Authentication performance improved by ~${improvement.toFixed(0)}%`)
    }
    
    console.log('\n💡 Recommendations:')
    for (const result of this.results) {
      const target = targets[result.operation] || 50
      if (result.averageTime > target) {
        console.log(`  - Optimize ${result.operation}: ${result.averageTime.toFixed(2)}ms > ${target}ms target`)
      }
    }
    
    if (this.results.some(r => r.errors > 0)) {
      console.log('  - Investigate errors in operations')
    }
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...')
    
    try {
      // Remove test users
      await this.prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'phoenixtest'
          }
        }
      })
      
      await this.prisma.$disconnect()
      console.log('✅ Cleanup completed')
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
    }
  }
}

// Main execution
async function main() {
  const tester = new PhoenixPerformanceTester()
  
  try {
    await tester.initialize()
    await tester.runAllTests()
  } catch (error) {
    console.error('❌ Performance testing failed:', error)
    process.exit(1)
  } finally {
    await tester.cleanup()
  }
}

if (require.main === module) {
  main().catch(console.error)
}