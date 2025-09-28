const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('testuser123', 12)
    
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        name: 'Test User',
        hashedPassword: hashedPassword,
        role: 'USER'
      }
    })
    
    console.log('✅ Test user created successfully:', user.email)
    console.log('📧 Email: test@test.com')
    console.log('🔑 Password: testuser123')
    
    return user
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ Test user already exists, fetching existing user...')
      const user = await prisma.user.findUnique({
        where: { email: 'test@test.com' }
      })
      console.log('📧 Email: test@test.com')
      console.log('🔑 Password: testuser123')
      return user
    } else {
      console.error('❌ Error creating test user:', error)
      throw error
    }
  }
}

async function testDatabaseConnection() {
  try {
    // Test database connection
    const userCount = await prisma.user.count()
    console.log('✅ Database connection successful')
    console.log(`📊 Total users in database: ${userCount}`)
    
    // Test user queries
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    })
    
    console.log('👥 Users:', users)
    
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function testAuth() {
  try {
    console.log('🧪 Testing authentication system...\n')
    
    // Test database connection
    const dbConnected = await testDatabaseConnection()
    if (!dbConnected) {
      throw new Error('Database connection failed')
    }
    
    console.log('\n🔐 Testing user authentication...')
    
    // Create or get test user
    const user = await createTestUser()
    
    // Test password verification
    const testPassword = 'testuser123'
    const isPasswordValid = await bcrypt.compare(testPassword, user.hashedPassword)
    
    console.log(`✅ Password verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`)
    
    if (isPasswordValid) {
      console.log('\n🎉 Authentication system is working correctly!')
      console.log('\n📋 Test Results:')
      console.log('  ✅ Database connection: WORKING')
      console.log('  ✅ User creation: WORKING')
      console.log('  ✅ Password hashing: WORKING')
      console.log('  ✅ Password verification: WORKING')
      console.log('\n🚀 You can now test signin at: http://localhost:5005/auth/signin')
    } else {
      console.log('\n❌ Authentication system has issues!')
    }
    
  } catch (error) {
    console.error('\n💥 Authentication test failed:', error)
    console.log('\n🔍 Troubleshooting checklist:')
    console.log('  1. Check DATABASE_URL environment variable')
    console.log('  2. Verify database is accessible')
    console.log('  3. Run: npx prisma db push')
    console.log('  4. Run: npx prisma generate')
  } finally {
    await prisma.$disconnect()
  }
}

testAuth()