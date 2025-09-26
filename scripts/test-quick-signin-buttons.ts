#!/usr/bin/env node

/**
 * Test Quick Signin Buttons on Production Deployment
 * Validates that the signin page loads with all 10 quick signin buttons
 */

const DEPLOYMENT_URL = "https://web-b45unuoxf-astral-productions.vercel.app"

const EXPECTED_USERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty", role: "Commissioner" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes", role: "Player" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem", role: "Player" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends", role: "Player" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign", role: "Player" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", team: "Kornbeck Crushers", role: "Player" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", team: "Jarvey's Juggernauts", role: "Player" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", team: "Lorbecki Lions", role: "Player" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", team: "Minor Miracles", role: "Player" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", team: "Bergum Blitz", role: "Player" }
]

async function testQuickSigninButtons(): Promise<void> {
  console.log('🚀 TESTING QUICK SIGNIN BUTTONS')
  console.log(`📍 Testing deployment: ${DEPLOYMENT_URL}`)
  console.log('=' * 50)
  
  try {
    console.log('🔍 Fetching signin page...')
    const response = await fetch(`${DEPLOYMENT_URL}/auth/signin`)
    
    if (!response.ok) {
      throw new Error(`Failed to load signin page: ${response.status} ${response.statusText}`)
    }
    
    const html = await response.text()
    console.log('✅ Signin page loaded successfully')
    
    // Check for page title
    const titleMatch = html.match(/<title>(.*?)<\/title>/)
    if (titleMatch) {
      console.log(`📄 Page title: ${titleMatch[1]}`)
    }
    
    // Check for quick signin section
    const quickSigninSectionExists = html.includes('D\'Amato Dynasty - Quick Access') || 
                                    html.includes('Quick Sign In') ||
                                    html.includes('damato-dynasty.com')
    
    if (!quickSigninSectionExists) {
      console.log('❌ Quick signin section not found on page')
      console.log('🔍 Checking for any D\'Amato references...')
      
      const damatoRefs = html.match(/damato/gi)
      if (damatoRefs) {
        console.log(`Found ${damatoRefs.length} references to 'damato' in page`)
      } else {
        console.log('No D\'Amato references found in page')
      }
      return
    }
    
    console.log('✅ Quick signin section found on page')
    
    // Check for each user
    let foundUsers = 0
    const missingUsers: string[] = []
    
    for (const user of EXPECTED_USERS) {
      const userExists = html.includes(user.name) && 
                        html.includes(user.email) && 
                        html.includes(user.team)
      
      if (userExists) {
        foundUsers++
        console.log(`✅ ${user.name} - Quick signin button found`)
      } else {
        missingUsers.push(user.name)
        console.log(`❌ ${user.name} - Quick signin button missing`)
      }
    }
    
    console.log('\n📊 QUICK SIGNIN BUTTONS SUMMARY:')
    console.log(`✅ Found: ${foundUsers}/${EXPECTED_USERS.length} users`)
    console.log(`❌ Missing: ${missingUsers.length}/${EXPECTED_USERS.length} users`)
    
    if (missingUsers.length > 0) {
      console.log('🚨 Missing users:')
      missingUsers.forEach(name => console.log(`  - ${name}`))
    }
    
    // Check for signin form elements
    const hasEmailInput = html.includes('type="email"') || html.includes('name="email"')
    const hasPasswordInput = html.includes('type="password"') || html.includes('name="password"')
    const hasSigninButton = html.includes('Sign In') || html.includes('signin')
    
    console.log('\n🔍 FORM ELEMENTS CHECK:')
    console.log(`📧 Email input: ${hasEmailInput ? '✅' : '❌'}`)
    console.log(`🔒 Password input: ${hasPasswordInput ? '✅' : '❌'}`)
    console.log(`🚀 Signin button: ${hasSigninButton ? '✅' : '❌'}`)
    
    // Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:')
    if (foundUsers === EXPECTED_USERS.length && hasEmailInput && hasPasswordInput) {
      console.log('🎉 PERFECT! All quick signin buttons are present and form is complete.')
      console.log('👥 All 10 D\'Amato Dynasty members have quick signin access.')
    } else if (foundUsers > 0) {
      console.log('⚠️  PARTIAL SUCCESS: Some quick signin buttons found but issues remain.')
    } else {
      console.log('❌ FAILURE: Quick signin buttons not properly implemented.')
    }
    
  } catch (error: any) {
    console.error('💥 Error testing quick signin buttons:', error.message)
  }
}

// Run the test
testQuickSigninButtons().catch(console.error)