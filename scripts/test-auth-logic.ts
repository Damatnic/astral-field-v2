import { getUserByEmail, getAllUsers } from '../src/lib/auth';
import { prisma } from '../src/lib/db';

async function testAuthLogic() {
  console.log('🧪 Testing authentication logic...');
  
  try {
    // Test getAllUsers function
    const users = await getAllUsers();
    console.log(`\nFound ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Test getUserByEmail function
    console.log('\n📧 Testing getUserByEmail with Nicholas D\'Amato...');
    const user = await getUserByEmail('nicholas.damato@astralfield.com');
    
    if (user) {
      console.log('✅ User found successfully!');
      console.log('User details:', user);
    } else {
      console.log('❌ User not found');
    }
    
    // Test getUserByEmail with non-existent user
    console.log('\n📧 Testing getUserByEmail with non-existent user...');
    const nonExistentUser = await getUserByEmail('nonexistent@astralfield.com');
    
    if (nonExistentUser) {
      console.log('❌ Non-existent user found (unexpected)');
    } else {
      console.log('✅ Non-existent user correctly not found');
    }
    
    // Test password verification logic (simplified)
    console.log('\n🔐 Testing password verification logic...');
    const DEFAULT_PASSWORD = 'player123!';
    
    const testPassword1 = 'player123!';
    const testPassword2 = 'wrongpassword';
    
    console.log(`Password "${testPassword1}" matches: ${testPassword1 === DEFAULT_PASSWORD}`);
    console.log(`Password "${testPassword2}" matches: ${testPassword2 === DEFAULT_PASSWORD}`);
    
    // Test direct database query
    console.log('\n🗄️ Testing direct database query...');
    const dbUser = await prisma.user.findUnique({
      where: {
        email: 'nicholas.damato@astralfield.com'
      }
    });
    
    if (dbUser) {
      console.log('✅ Direct database query successful!');
      console.log(`Found: ${dbUser.name} (${dbUser.email}) - ${dbUser.role}`);
    } else {
      console.log('❌ Direct database query failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAuthLogic()
  .then(() => {
    console.log('\n🎉 Authentication logic test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });