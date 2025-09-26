import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
];

const PASSWORD = 'Dynasty2025!';

async function autoSetupAndTest() {
  console.log('🏈 AUTO-SETUP: D\'Amato Dynasty League Complete Setup & Test\n');
  console.log('═'.repeat(60));
  
  try {
    // STEP 1: Create all users
    console.log('📝 STEP 1: Creating all user accounts...\n');
    
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const setupResults = [];
    
    for (const member of DAMATO_DYNASTY_MEMBERS) {
      try {
        const user = await prisma.user.upsert({
          where: { email: member.email },
          update: {
            name: member.name,
            role: member.role,
            teamName: member.teamName
          },
          create: {
            email: member.email,
            hashedPassword,
            name: member.name,
            role: member.role,
            teamName: member.teamName
          }
        });
        
        setupResults.push({
          success: true,
          name: member.name,
          email: member.email,
          team: member.teamName,
          role: member.role,
          userId: user.id
        });
        
        console.log(`  ✅ ${member.name} (${member.teamName}) - ${member.role}`);
        
      } catch (error: any) {
        setupResults.push({
          success: false,
          name: member.name,
          email: member.email,
          error: error.message
        });
        console.log(`  ❌ ${member.name} - Error: ${error.message}`);
      }
    }
    
    console.log('\n═'.repeat(60));
    console.log('📊 STEP 2: Setup Summary\n');
    
    const successful = setupResults.filter(r => r.success);
    const failed = setupResults.filter(r => !r.success);
    
    console.log(`✅ Successfully created: ${successful.length} accounts`);
    console.log(`❌ Failed: ${failed.length} accounts`);
    
    if (failed.length > 0) {
      console.log('\nFailed accounts:');
      failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }
    
    // STEP 3: Test all logins
    console.log('\n═'.repeat(60));
    console.log('🔐 STEP 3: Testing all login credentials...\n');
    
    const testResults = [];
    
    for (const setup of successful) {
      try {
        // Find user and test password
        const user = await prisma.user.findUnique({
          where: { email: setup.email }
        });
        
        if (!user) {
          testResults.push({
            success: false,
            name: setup.name,
            email: setup.email,
            error: 'User not found'
          });
          continue;
        }
        
        const passwordMatch = await bcrypt.compare(PASSWORD, user.hashedPassword);
        
        if (passwordMatch) {
          testResults.push({
            success: true,
            name: setup.name,
            email: setup.email,
            team: setup.team,
            role: setup.role
          });
          console.log(`  ✅ ${setup.name} - Login test PASSED`);
        } else {
          testResults.push({
            success: false,
            name: setup.name,
            email: setup.email,
            error: 'Password verification failed'
          });
          console.log(`  ❌ ${setup.name} - Login test FAILED`);
        }
        
      } catch (error: any) {
        testResults.push({
          success: false,
          name: setup.name,
          email: setup.email,
          error: error.message
        });
        console.log(`  ❌ ${setup.name} - Error: ${error.message}`);
      }
    }
    
    // STEP 4: Final Report
    console.log('\n═'.repeat(60));
    console.log('🎯 FINAL REPORT: D\'Amato Dynasty League Status\n');
    
    const loginSuccess = testResults.filter(r => r.success);
    const loginFailed = testResults.filter(r => !r.success);
    
    console.log(`🏈 League Name: D'Amato Dynasty League`);
    console.log(`👥 Total Members: ${DAMATO_DYNASTY_MEMBERS.length}`);
    console.log(`✅ Ready Accounts: ${loginSuccess.length}`);
    console.log(`❌ Failed Accounts: ${loginFailed.length}`);
    console.log(`🔑 Password: ${PASSWORD}`);
    
    if (loginSuccess.length === DAMATO_DYNASTY_MEMBERS.length) {
      console.log('\n🎉 SUCCESS: All accounts are ready for quick signin!');
      console.log('\n📋 Ready to use accounts:');
      loginSuccess.forEach((account, i) => {
        console.log(`   ${i + 1}. ${account.name} (${account.role})`);
        console.log(`      📧 ${account.email}`);
        console.log(`      🏆 ${account.team}`);
      });
      console.log('\n✨ Quick Signin Instructions:');
      console.log('   1. Go to /auth/signin');
      console.log('   2. Click any team button for instant login');
      console.log(`   3. Password: ${PASSWORD}`);
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some accounts need attention');
      if (loginFailed.length > 0) {
        console.log('\n❌ Failed accounts:');
        loginFailed.forEach(f => {
          console.log(`   - ${f.name} (${f.email}): ${f.error}`);
        });
      }
    }
    
    console.log('\n═'.repeat(60));
    return { setupResults, testResults };
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the auto-setup and test
autoSetupAndTest()
  .then(({ setupResults, testResults }) => {
    const allSuccess = testResults.every(r => r.success);
    if (allSuccess) {
      console.log('\n🚀 AUTO-SETUP COMPLETE: All systems ready for production!');
      process.exit(0);
    } else {
      console.log('\n⚠️  AUTO-SETUP PARTIAL: Some issues need resolution');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 AUTO-SETUP FAILED:', error);
    process.exit(1);
  });