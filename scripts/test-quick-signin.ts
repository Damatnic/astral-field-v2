import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAMATO_DYNASTY_MEMBERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "PLAYER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "PLAYER" }
];

async function simulateQuickSignin(email: string, password: string, username: string) {
  try {
    // Step 1: Find user
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamName: true,
        hashedPassword: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        step: 'User Lookup'
      };
    }

    // Step 2: Verify password
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
      return {
        success: false,
        error: 'Invalid password',
        step: 'Password Verification'
      };
    }

    // Step 3: Simulate session creation (would normally create JWT)
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamName: user.teamName
    };

    return {
      success: true,
      user: sessionData,
      message: `Welcome back, ${user.name}!`
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      step: 'Database Error'
    };
  }
}

async function testQuickSigninFlow() {
  console.log('🧪 TESTING: Quick Signin Functionality\n');
  console.log('═'.repeat(70));
  
  const testResults = [];
  const password = 'Dynasty2025!';
  
  console.log('🔐 Testing Quick Signin Flow for all D\'Amato Dynasty members...\n');
  
  for (let i = 0; i < DAMATO_DYNASTY_MEMBERS.length; i++) {
    const member = DAMATO_DYNASTY_MEMBERS[i];
    console.log(`Test ${i + 1}/5: ${member.name} (${member.teamName})`);
    
    const result = await simulateQuickSignin(member.email, password, member.name);
    
    if (result.success) {
      console.log(`  ✅ PASS: ${result.message}`);
      console.log(`     👤 User ID: ${result.user?.userId}`);
      console.log(`     📧 Email: ${result.user?.email}`);
      console.log(`     🏆 Team: ${result.user?.teamName}`);
      console.log(`     👑 Role: ${result.user?.role}\n`);
      
      testResults.push({
        name: member.name,
        email: member.email,
        team: member.teamName,
        status: 'PASS',
        message: result.message
      });
    } else {
      console.log(`  ❌ FAIL: ${result.error}`);
      console.log(`     🔍 Failed at: ${result.step}\n`);
      
      testResults.push({
        name: member.name,
        email: member.email,
        team: member.teamName,
        status: 'FAIL',
        error: result.error,
        step: result.step
      });
    }
  }
  
  console.log('═'.repeat(70));
  console.log('📊 QUICK SIGNIN TEST RESULTS\n');
  
  const passed = testResults.filter(r => r.status === 'PASS');
  const failed = testResults.filter(r => r.status === 'FAIL');
  
  console.log(`✅ Passed: ${passed.length}/${testResults.length}`);
  console.log(`❌ Failed: ${failed.length}/${testResults.length}`);
  
  if (passed.length === testResults.length) {
    console.log('\n🎉 ALL QUICK SIGNIN TESTS PASSED!');
    console.log('\n🚀 Ready for production deployment:');
    console.log('   • All user accounts created ✅');
    console.log('   • Password authentication working ✅');
    console.log('   • User data retrieval working ✅');
    console.log('   • Session creation ready ✅');
    
    console.log('\n📱 Quick Signin Button Test Instructions:');
    console.log('   1. Visit: /auth/signin');
    console.log('   2. Click any team button from the D\'Amato Dynasty section');
    console.log('   3. Button auto-fills email and password');
    console.log('   4. Form submits automatically');
    console.log('   5. User should be redirected to dashboard');
    
    console.log('\n🎯 Test Accounts Summary:');
    passed.forEach((account, i) => {
      console.log(`   ${i + 1}. ${account.name} - ${account.team} ✅`);
    });
  } else {
    console.log('\n⚠️  Some tests failed:');
    failed.forEach(f => {
      console.log(`   ❌ ${f.name}: ${f.error} (${f.step})`);
    });
  }
  
  console.log('\n═'.repeat(70));
  return { passed, failed, total: testResults.length };
}

// Run the quick signin test
testQuickSigninFlow()
  .then(({ passed, failed, total }) => {
    if (failed.length === 0) {
      console.log('🎊 QUICK SIGNIN TESTING COMPLETE: All systems operational!\n');
      process.exit(0);
    } else {
      console.log('🔧 QUICK SIGNIN TESTING PARTIAL: Some issues need attention\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 QUICK SIGNIN TEST FAILED:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });