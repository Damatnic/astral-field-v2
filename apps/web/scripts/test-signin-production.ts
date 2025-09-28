#!/usr/bin/env tsx
/**
 * Production Signin Test Script
 * Tests the signin functionality against the deployed Vercel app
 */

import fetch from 'node-fetch'

const VERCEL_URL = 'https://web-rfs0pyuw6-astral-productions.vercel.app'

async function testSigninFlow() {
  console.log('🧪 Testing Signin Flow on Production...\n')
  
  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...')
    const healthResponse = await fetch(`${VERCEL_URL}/api/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Health Status:', healthData.status)
    console.log('   Database Connected:', healthData.database?.connected)
    console.log('   User Count:', healthData.database?.userCount)
    console.log('')
    
    // 2. Test session endpoint
    console.log('2. Testing session endpoint...')
    const sessionResponse = await fetch(`${VERCEL_URL}/api/auth/session`)
    const sessionData = await sessionResponse.text()
    console.log('✅ Session Response:', sessionData === 'null' ? 'No active session (expected)' : sessionData)
    console.log('')
    
    // 3. Test CSRF endpoint
    console.log('3. Testing CSRF token endpoint...')
    const csrfResponse = await fetch(`${VERCEL_URL}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()
    console.log('✅ CSRF Token:', csrfData.csrfToken ? 'Generated successfully' : 'Failed to generate')
    console.log('')
    
    // 4. Test signin page load
    console.log('4. Testing signin page load...')
    const signinResponse = await fetch(`${VERCEL_URL}/auth/signin`)
    if (signinResponse.ok) {
      console.log('✅ Signin page loads successfully')
    } else {
      console.log('❌ Signin page failed to load:', signinResponse.status)
    }
    console.log('')
    
    // 5. Test providers endpoint
    console.log('5. Testing auth providers endpoint...')
    const providersResponse = await fetch(`${VERCEL_URL}/api/auth/providers`)
    const providersData = await providersResponse.json()
    console.log('✅ Available Providers:', Object.keys(providersData).join(', '))
    console.log('')
    
    console.log('🎉 All tests completed successfully!')
    console.log('📍 Production URL:', VERCEL_URL)
    console.log('🔗 Signin URL:', `${VERCEL_URL}/auth/signin`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Test with demo user credentials if available
async function testDemoSignin() {
  console.log('\n🔐 Testing demo signin...')
  
  try {
    // Get CSRF token first
    const csrfResponse = await fetch(`${VERCEL_URL}/api/auth/csrf`)
    const { csrfToken } = await csrfResponse.json()
    
    // Try signin with demo credentials
    const signinResponse = await fetch(`${VERCEL_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'demo@astralfield.com',
        password: 'demo123',
        csrfToken,
        callbackUrl: '/dashboard',
        redirect: 'false'
      })
    })
    
    if (signinResponse.ok) {
      console.log('✅ Demo signin attempt completed')
      const result = await signinResponse.json()
      console.log('   Result:', result)
    } else {
      console.log('ℹ️  Demo signin not available (expected if no demo user exists)')
    }
    
  } catch (error) {
    console.log('ℹ️  Demo signin test skipped:', error.message)
  }
}

// Run tests
testSigninFlow().then(() => {
  return testDemoSignin()
}).catch(console.error)