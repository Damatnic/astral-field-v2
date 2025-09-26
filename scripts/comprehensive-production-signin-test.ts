#!/usr/bin/env node

/**
 * Comprehensive Production Sign-in Test for D'Amato Dynasty League
 * Tests all 10 users on the live deployment with detailed reporting
 */

interface TestResult {
  email: string
  name: string
  team: string
  role: string
  signinSuccess: boolean
  dashboardAccess: boolean
  error?: string
  responseTime?: number
}

const DAMATO_DYNASTY_MEMBERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "PLAYER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "PLAYER" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: "PLAYER" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: "PLAYER" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: "PLAYER" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: "PLAYER" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: "PLAYER" }
]

const DEPLOYMENT_URL = "https://web-3n61yluzx-astral-productions.vercel.app"
const PASSWORD = "Dynasty2025!"

async function testSigninFlow(member: typeof DAMATO_DYNASTY_MEMBERS[0]): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    console.log(`🔐 Testing signin for ${member.name} (${member.email})...`)
    
    // Test 1: Attempt to sign in via API
    const signinResponse = await fetch(`${DEPLOYMENT_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: member.email,
        password: PASSWORD,
        redirect: 'false'
      })
    })
    
    const responseTime = Date.now() - startTime
    
    if (!signinResponse.ok) {
      return {
        email: member.email,
        name: member.name,
        team: member.teamName,
        role: member.role,
        signinSuccess: false,
        dashboardAccess: false,
        error: `Signin failed: ${signinResponse.status} ${signinResponse.statusText}`,
        responseTime
      }
    }
    
    console.log(`✅ ${member.name} - Signin successful`)
    
    // Test 2: Check if we can access dashboard (basic check)
    const dashboardResponse = await fetch(`${DEPLOYMENT_URL}/dashboard`, {
      headers: {
        'Cookie': signinResponse.headers.get('set-cookie') || ''
      }
    })
    
    const dashboardAccess = dashboardResponse.ok
    
    return {
      email: member.email,
      name: member.name,
      team: member.teamName,
      role: member.role,
      signinSuccess: true,
      dashboardAccess,
      responseTime
    }
    
  } catch (error: any) {
    return {
      email: member.email,
      name: member.name,
      team: member.teamName,
      role: member.role,
      signinSuccess: false,
      dashboardAccess: false,
      error: error.message,
      responseTime: Date.now() - startTime
    }
  }
}

async function testAllUsers(): Promise<void> {
  console.log('🚀 STARTING COMPREHENSIVE PRODUCTION SIGNIN TEST')
  console.log(`📍 Testing deployment: ${DEPLOYMENT_URL}`)
  console.log(`👥 Testing ${DAMATO_DYNASTY_MEMBERS.length} D'Amato Dynasty members`)
  console.log('=' * 60)
  
  const results: TestResult[] = []
  
  // Test each user
  for (const member of DAMATO_DYNASTY_MEMBERS) {
    const result = await testSigninFlow(member)
    results.push(result)
    
    // Brief delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n🔍 TEST RESULTS SUMMARY')
  console.log('=' * 60)
  
  const successful = results.filter(r => r.signinSuccess)
  const failed = results.filter(r => !r.signinSuccess)
  const dashboardAccess = results.filter(r => r.dashboardAccess)
  
  console.log(`✅ Successful signins: ${successful.length}/${results.length}`)
  console.log(`❌ Failed signins: ${failed.length}/${results.length}`)
  console.log(`🎯 Dashboard access: ${dashboardAccess.length}/${results.length}`)
  
  console.log('\n📊 DETAILED RESULTS:')
  results.forEach(result => {
    const status = result.signinSuccess ? '✅' : '❌'
    const dashboard = result.dashboardAccess ? '🎯' : '🚫'
    const time = result.responseTime ? `${result.responseTime}ms` : 'N/A'
    
    console.log(`${status} ${dashboard} ${result.name} (${result.team}) - ${result.role} - ${time}`)
    if (result.error) {
      console.log(`    Error: ${result.error}`)
    }
  })
  
  if (failed.length > 0) {
    console.log('\n🚨 FAILURES TO INVESTIGATE:')
    failed.forEach(result => {
      console.log(`- ${result.name}: ${result.error}`)
    })
  }
  
  console.log('\n📈 PERFORMANCE METRICS:')
  const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime!)
  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const maxTime = Math.max(...responseTimes)
    const minTime = Math.min(...responseTimes)
    
    console.log(`Average response time: ${Math.round(avgTime)}ms`)
    console.log(`Fastest response: ${minTime}ms`)
    console.log(`Slowest response: ${maxTime}ms`)
  }
  
  console.log('\n🎯 FINAL STATUS:')
  if (failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED! All D\'Amato Dynasty members can sign in successfully.')
  } else {
    console.log(`⚠️  ${failed.length} signin issues need to be resolved.`)
  }
  
  // Save results to file for reference
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = `test-results-${timestamp}.json`
  
  require('fs').writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    deploymentUrl: DEPLOYMENT_URL,
    totalTests: results.length,
    successful: successful.length,
    failed: failed.length,
    dashboardAccess: dashboardAccess.length,
    results
  }, null, 2))
  
  console.log(`📄 Detailed test report saved to: ${reportPath}`)
}

// Run the test
testAllUsers().catch(console.error)