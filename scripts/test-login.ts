import { login, getAllUsers } from '../src/lib/auth';

async function testLogin() {
  console.log('🧪 Testing login functionality...');
  
  try {
    // First, get all users to see who's available
    const users = await getAllUsers();
    console.log(`\nFound ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Test login with Nicholas D'Amato
    console.log('\n🔑 Testing login with Nicholas D\'Amato...');
    const loginResult = await login({
      email: 'nicholas.damato@astralfield.com',
      password: 'player123!'
    });
    
    if (loginResult.success) {
      console.log('✅ Login successful!');
      console.log('User details:', loginResult.user);
    } else {
      console.log('❌ Login failed:', loginResult.error);
    }
    
    // Test login with Nick Hartley
    console.log('\n🔑 Testing login with Nick Hartley...');
    const loginResult2 = await login({
      email: 'nick.hartley@astralfield.com',
      password: 'player123!'
    });
    
    if (loginResult2.success) {
      console.log('✅ Login successful!');
      console.log('User details:', loginResult2.user);
    } else {
      console.log('❌ Login failed:', loginResult2.error);
    }
    
    // Test login with wrong password
    console.log('\n🔑 Testing login with wrong password...');
    const loginResult3 = await login({
      email: 'nicholas.damato@astralfield.com',
      password: 'wrongpassword'
    });
    
    if (loginResult3.success) {
      console.log('✅ Login successful!');
      console.log('User details:', loginResult3.user);
    } else {
      console.log('❌ Login failed (expected):', loginResult3.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLogin()
  .then(() => {
    console.log('\n🎉 Login test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });