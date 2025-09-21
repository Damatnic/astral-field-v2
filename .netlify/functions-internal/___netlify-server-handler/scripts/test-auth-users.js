#!/usr/bin/env node

/**
 * Test Authentication for All Real Users
 */

const BASE_URL = process.env.BASE_URL || 'https://astral-field-v1.vercel.app';

const users = [
  { email: 'nicholas.damato@astralfield.com', password: 'admin123!', name: "Nicholas D'Amato", role: 'admin' },
  { email: 'nicholas@astralfield.com', password: 'comm123!', name: "Nicholas D'Amato", role: 'commissioner' },
  { email: 'nick.hartley@astralfield.com', password: 'player123!', name: 'Nick Hartley', role: 'player' },
  { email: 'jack.mccaigue@astralfield.com', password: 'player123!', name: 'Jack McCaigue', role: 'player' },
  { email: 'larry.mccaigue@astralfield.com', password: 'player123!', name: 'Larry McCaigue', role: 'player' },
  { email: 'renee.mccaigue@astralfield.com', password: 'player123!', name: 'Renee McCaigue', role: 'player' },
  { email: 'jon.kornbeck@astralfield.com', password: 'player123!', name: 'Jon Kornbeck', role: 'player' },
  { email: 'david.jarvey@astralfield.com', password: 'player123!', name: 'David Jarvey', role: 'player' },
  { email: 'kaity.lorbecki@astralfield.com', password: 'player123!', name: 'Kaity Lorbecki', role: 'player' },
  { email: 'cason.minor@astralfield.com', password: 'player123!', name: 'Cason Minor', role: 'player' },
  { email: 'brittany.bergum@astralfield.com', password: 'player123!', name: 'Brittany Bergum', role: 'player' }
];

async function testUserLogin(user) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ ${user.name} (${user.role}): Login successful`);
      
      // Test /api/auth/me endpoint with the session
      const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 
          'Cookie': response.headers.get('set-cookie') || '',
        }
      });
      
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log(`   ✓ /api/auth/me verified: ${meData.user?.name}`);
      } else {
        console.log(`   ✗ /api/auth/me failed`);
      }
      
      return true;
    } else {
      console.log(`❌ ${user.name}: Login failed - ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${user.name}: Request failed - ${error.message}`);
    return false;
  }
}

async function testAllUsers() {
  console.log('🔐 Testing Authentication for All Users');
  console.log(`📍 URL: ${BASE_URL}`);
  console.log('=====================================\n');
  
  let successful = 0;
  let failed = 0;
  
  for (const user of users) {
    const result = await testUserLogin(user);
    if (result) successful++;
    else failed++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=====================================');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('=====================================');
  
  process.exit(failed > 0 ? 1 : 0);
}

testAllUsers().catch(console.error);