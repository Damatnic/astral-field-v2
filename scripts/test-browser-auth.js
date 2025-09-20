#!/usr/bin/env node

const { JSDOM } = require('jsdom');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

console.log('🔍 BROWSER AUTHENTICATION FLOW TEST');
console.log('====================================');
console.log(`Testing URL: ${BASE_URL}`);
console.log('');

async function testBrowserAuthFlow() {
  try {
    // Test 1: Simulate browser authentication flow
    console.log('1. Testing browser authentication flow...');
    
    // Create a test login
    const testLogin = async (email, password) => {
      const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      const cookies = response.headers.get('set-cookie');
      
      return { data, cookies, status: response.status };
    };
    
    // Test with demo account (shorter password)
    console.log('   🔐 Testing demo account login...');
    const demoResult = await testLogin('demo@astralfield.com', 'demo123');
    console.log(`   📋 Demo Login Response:`, demoResult.data);
    console.log(`   🍪 Demo Cookies:`, demoResult.cookies ? 'SET' : 'NOT SET');
    
    // Test with regular account
    console.log('   🔐 Testing Nicholas account login...');
    const nicholasResult = await testLogin('nicholas@astralfield.com', 'Astral2025!');
    console.log(`   📋 Nicholas Login Response:`, nicholasResult.data);
    console.log(`   🍪 Nicholas Cookies:`, nicholasResult.cookies ? 'SET' : 'NOT SET');
    
    // Test session validation
    if (demoResult.cookies) {
      console.log('   🔍 Testing session validation...');
      const sessionCookie = demoResult.cookies.split(';')[0]; // Get the session cookie
      const cookieValue = sessionCookie.split('=')[1];
      
      const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
      
      const meData = await meResponse.json();
      console.log(`   👤 Session Validation:`, meData);
    }
    
    console.log('');
    console.log('✅ Browser authentication flow test completed!');
    console.log('');
    
    // Test 2: Check login page accessibility
    console.log('2. Testing login page accessibility...');
    const loginPageResponse = await fetch(`${BASE_URL}/login`);
    console.log(`   📄 Login page status: ${loginPageResponse.status}`);
    console.log(`   📏 Login page size: ${loginPageResponse.headers.get('content-length') || 'unknown'}`);
    
    console.log('');
    console.log('🎉 All browser tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Browser test failed:', error);
    process.exit(1);
  }
}

testBrowserAuthFlow();