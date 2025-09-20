const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3009';

async function testLogin() {
  console.log('🧪 Testing D\'Amato Dynasty Login Flow...\n');

  // Test all team members
  const testUsers = [
    { name: 'Nicholas D\'Amato', email: 'nicholas@damato-dynasty.com' },
    { name: 'Nick Hartley', email: 'nick@damato-dynasty.com' },
    { name: 'Jack McCaigue', email: 'jack@damato-dynasty.com' },
    { name: 'Larry McCaigue', email: 'larry@damato-dynasty.com' },
    { name: 'Renee McCaigue', email: 'renee@damato-dynasty.com' },
    { name: 'Jon Kornbeck', email: 'jon@damato-dynasty.com' },
    { name: 'David Jarvey', email: 'david@damato-dynasty.com' },
    { name: 'Kaity Lorbecki', email: 'kaity@damato-dynasty.com' },
    { name: 'Cason Minor', email: 'cason@damato-dynasty.com' },
    { name: 'Brittany Bergum', email: 'brittany@damato-dynasty.com' }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const user of testUsers) {
    try {
      console.log(`Testing login for ${user.name}...`);
      
      const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: 'Dynasty2025!',
          demo: true,
          season: '2025'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`  ✅ ${user.name} login successful`);
        console.log(`  📧 Email: ${user.email}`);
        console.log(`  👤 User ID: ${result.user?.id}`);
        console.log(`  📊 Team: ${result.user?.teamName || 'No team'}`);
        successCount++;
      } else {
        console.log(`  ❌ ${user.name} login failed: ${result.error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`  💥 ${user.name} login error: ${error.message}`);
      failCount++;
    }
    console.log('');
  }

  console.log(`📊 Test Results:`);
  console.log(`  ✅ Successful logins: ${successCount}`);
  console.log(`  ❌ Failed logins: ${failCount}`);
  console.log(`  📈 Success rate: ${Math.round((successCount / (successCount + failCount)) * 100)}%`);

  if (successCount > 0) {
    console.log('\n🎉 Login system is working! Users can now access the platform.');
    console.log('\n🌐 Access the platform:');
    console.log(`   Development: ${BASE_URL}`);
    console.log(`   Production: https://astralfield.vercel.app`);
  } else {
    console.log('\n⚠️  All logins failed. Please check the authentication system.');
  }
}

testLogin().catch(console.error);