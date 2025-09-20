// Test login for all D'Amato Dynasty League accounts

const DYNASTY_ACCOUNTS = [
  { email: 'nicholas@astralfield.com', name: 'Nicholas D\'Amato' },
  { email: 'nick@astralfield.com', name: 'Nick Hartley' },
  { email: 'jack@astralfield.com', name: 'Jack McCaigue' },
  { email: 'larry@astralfield.com', name: 'Larry McCaigue' },
  { email: 'renee@astralfield.com', name: 'Renee McCaigue' },
  { email: 'jon@astralfield.com', name: 'Jon Kornbeck' },
  { email: 'david@astralfield.com', name: 'David Jarvey' },
  { email: 'kaity@astralfield.com', name: 'Kaity Lorbecki' },
  { email: 'brittany@astralfield.com', name: 'Brittany Bergum' },
  { email: 'cason@astralfield.com', name: 'Cason Minor' }
];

const DEFAULT_PASSWORD = 'Dynasty2025!';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

async function testLogin(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      return { success: true, user: data.user, sessionId: data.sessionId };
    } else {
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testAllAccounts() {
  console.log('🧪 Testing login for all D\'Amato Dynasty League accounts...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const account of DYNASTY_ACCOUNTS) {
    const result = await testLogin(account.email, DEFAULT_PASSWORD);
    
    if (result.success) {
      console.log(`✅ ${account.email} - ${account.name}`);
      console.log(`   Session ID: ${result.sessionId?.substring(0, 20)}...`);
      console.log(`   User Role: ${result.user.role}\n`);
      successCount++;
    } else {
      console.log(`❌ ${account.email} - ${account.name}`);
      console.log(`   Error: ${result.error}\n`);
      failCount++;
    }
  }
  
  console.log('📊 TEST RESULTS:');
  console.log(`✅ Successful logins: ${successCount}`);
  console.log(`❌ Failed logins: ${failCount}`);
  console.log(`📈 Success rate: ${(successCount / DYNASTY_ACCOUNTS.length * 100).toFixed(1)}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 ALL ACCOUNTS ARE READY FOR WEEK 3 OF 2025 NFL SEASON!');
  } else {
    console.log('\n⚠️  Some accounts need attention before the season continues.');
  }
}

testAllAccounts();