#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE D'AMATO DYNASTY LEAGUE TEST
 * Validates complete functionality: database setup, authentication, quick signin, and dashboard access
 */

interface ComprehensiveTestResult {
  user: string
  email: string
  team: string
  role: string
  databaseSetup: boolean
  authentication: boolean  
  dashboardAccess: boolean
  personalData: boolean
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

async function runComprehensiveTest(): Promise<void> {
  console.log('🏈 D\'AMATO DYNASTY LEAGUE - FINAL COMPREHENSIVE TEST')
  console.log(`📍 Production deployment: ${DEPLOYMENT_URL}`)
  console.log(`👥 Testing ${DAMATO_DYNASTY_MEMBERS.length} league members`)
  console.log('=' * 70)
  
  // STEP 1: Database Setup Verification
  console.log('\n🗄️ STEP 1: Database Setup Verification')
  console.log('-' * 40)
  
  try {
    const setupResponse = await fetch(`${DEPLOYMENT_URL}/api/setup`)
    const setupData = await setupResponse.json()
    
    if (setupData.ready && setupData.seeding.successful === 10) {
      console.log('✅ Database setup: ALL 10 users created successfully')
      console.log(`✅ Password configured: ${setupData.password}`)
    } else {
      console.log(`❌ Database setup issue: ${setupData.seeding.successful}/10 users created`)
      return
    }
  } catch (error: any) {
    console.error('💥 Database setup failed:', error.message)
    return
  }
  
  // STEP 2: Authentication & Dashboard Testing
  console.log('\n🔐 STEP 2: Authentication & Dashboard Testing')
  console.log('-' * 45)
  
  const results: ComprehensiveTestResult[] = []
  
  for (const member of DAMATO_DYNASTY_MEMBERS) {
    const startTime = Date.now()
    console.log(`\n🧪 Testing ${member.name} (${member.teamName})...`)
    
    try {
      // Test authentication
      const authResponse = await fetch(`${DEPLOYMENT_URL}/api/auth/callback/credentials`, {
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
      
      const authentication = authResponse.ok
      console.log(`  🔑 Authentication: ${authentication ? '✅ Success' : '❌ Failed'}`)
      
      // Test dashboard access
      let dashboardAccess = false
      let personalData = false
      
      if (authentication) {
        const cookies = authResponse.headers.get('set-cookie') || ''
        
        const dashboardResponse = await fetch(`${DEPLOYMENT_URL}/dashboard`, {
          headers: { 'Cookie': cookies }
        })
        
        dashboardAccess = dashboardResponse.ok
        console.log(`  🎯 Dashboard access: ${dashboardAccess ? '✅ Success' : '❌ Failed'}`)
        
        if (dashboardAccess) {
          const dashboardContent = await dashboardResponse.text()
          personalData = dashboardContent.includes(member.name) || dashboardContent.includes(member.teamName)
          console.log(`  📊 Personal data: ${personalData ? '✅ Found' : '⚠️  Not visible'}`)
        }
      }
      
      const responseTime = Date.now() - startTime
      
      results.push({
        user: member.name,
        email: member.email,
        team: member.teamName,
        role: member.role,
        databaseSetup: true,
        authentication,
        dashboardAccess,
        personalData,
        responseTime
      })
      
    } catch (error: any) {
      results.push({
        user: member.name,
        email: member.email,
        team: member.teamName,
        role: member.role,
        databaseSetup: true,
        authentication: false,
        dashboardAccess: false,
        personalData: false,
        error: error.message,
        responseTime: Date.now() - startTime
      })
      console.log(`  💥 Error: ${error.message}`)
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // STEP 3: Signin Page Quick Buttons Check
  console.log('\n📱 STEP 3: Quick Signin Buttons Verification')
  console.log('-' * 45)
  
  try {
    const signinResponse = await fetch(`${DEPLOYMENT_URL}/auth/signin`)
    const signinHtml = await signinResponse.text()
    
    const hasQuickSignin = signinHtml.includes('D\'Amato Dynasty') && 
                          signinHtml.includes('Dynasty2025!') &&
                          DAMATO_DYNASTY_MEMBERS.every(m => signinHtml.includes(m.name))
    
    console.log(`📄 Signin page loaded: ${signinResponse.ok ? '✅' : '❌'}`)
    console.log(`🔘 Quick signin buttons: ${hasQuickSignin ? '✅ All 10 found' : '❌ Missing or incomplete'}`)
    
    if (hasQuickSignin) {
      console.log('✅ Users can click their name to auto-signin')
    } else {
      console.log('⚠️  Users need to manually enter credentials')
    }
    
  } catch (error: any) {
    console.log(`💥 Signin page test failed: ${error.message}`)
  }
  
  // FINAL RESULTS SUMMARY
  console.log('\n🏆 FINAL TEST RESULTS SUMMARY')
  console.log('=' * 70)
  
  const successful = results.filter(r => r.authentication && r.dashboardAccess)
  const authenticationSuccess = results.filter(r => r.authentication)
  const dashboardSuccess = results.filter(r => r.dashboardAccess)
  const personalDataSuccess = results.filter(r => r.personalData)
  
  console.log(`✅ Authentication success: ${authenticationSuccess.length}/10 users`)
  console.log(`🎯 Dashboard access: ${dashboardSuccess.length}/10 users`)
  console.log(`📊 Personal data access: ${personalDataSuccess.length}/10 users`)
  console.log(`🎉 Complete functionality: ${successful.length}/10 users`)
  
  console.log('\n📋 INDIVIDUAL RESULTS:')
  results.forEach(result => {
    const auth = result.authentication ? '✅' : '❌'
    const dash = result.dashboardAccess ? '🎯' : '🚫'
    const data = result.personalData ? '📊' : '⚪'
    const time = result.responseTime ? `${result.responseTime}ms` : 'N/A'
    
    console.log(`${auth}${dash}${data} ${result.user} (${result.team}) - ${result.role} - ${time}`)
    
    if (result.error) {
      console.log(`     Error: ${result.error}`)
    }
  })
  
  // Performance metrics
  const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime!)
  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    console.log(`\n⚡ Average response time: ${Math.round(avgTime)}ms`)
  }
  
  // Final status
  console.log('\n🎯 FINAL DEPLOYMENT STATUS:')
  
  if (successful.length === 10) {
    console.log('🎉 PERFECT DEPLOYMENT! All D\'Amato Dynasty members have full access.')
    console.log('✅ Database setup complete')
    console.log('✅ Authentication working for all users')  
    console.log('✅ Dashboard access verified for all users')
    console.log('✅ Ready for league play!')
    console.log(`\n🔗 Deployment URL: ${DEPLOYMENT_URL}`)
    console.log(`🔑 League password: ${PASSWORD}`)
  } else {
    console.log(`⚠️  PARTIAL SUCCESS: ${successful.length}/10 users have complete functionality`)
    console.log('🔧 Some issues need resolution before full league deployment')
  }
  
  // Save comprehensive report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = `final-d-amato-dynasty-report-${timestamp}.json`
  
  require('fs').writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    deploymentUrl: DEPLOYMENT_URL,
    leagueSize: DAMATO_DYNASTY_MEMBERS.length,
    password: PASSWORD,
    results: {
      authentication: authenticationSuccess.length,
      dashboardAccess: dashboardSuccess.length,
      personalDataAccess: personalDataSuccess.length,
      completeSuccess: successful.length
    },
    individualResults: results,
    ready: successful.length === 10
  }, null, 2))
  
  console.log(`\n📄 Complete test report saved to: ${reportPath}`)
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error)