const { Pool } = require('pg')

// Database connection using the Neon connection string
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IrC1uWYi3FdA@ep-floral-lake-aeiztgic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

const testUsers = [
  { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato' },
  { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum' },
  { email: 'cason.minor@astralfield.com', username: 'Cason Minor' },
  { email: 'david.jarvey@astralfield.com', username: 'David Jarvey' },
  { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue' },
  { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck' },
  { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki' },
  { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue' },
  { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley' },
  { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue' }
]

async function createNeonTestUsers() {
  console.log('🚀 Creating test users in Neon database...\n')
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    const testResult = await pool.query('SELECT NOW()')
    console.log('✅ Connected to Neon database at:', testResult.rows[0].now)
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist. Please create it first.')
      return
    }
    
    console.log('✅ Users table found')
    
    // Create test users
    console.log('\n👥 Creating test users...')
    let createdCount = 0
    let existingCount = 0
    
    for (const user of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        )
        
        if (existingUser.rows.length > 0) {
          console.log(`⚠️ User already exists: ${user.username}`)
          existingCount++
        } else {
          // Create new user
          await pool.query(
            'INSERT INTO users (email, username, stack_user_id) VALUES ($1, $2, $3)',
            [user.email, user.username, null]
          )
          console.log(`✅ Created user: ${user.username}`)
          createdCount++
        }
      } catch (error) {
        console.error(`❌ Error with user ${user.username}:`, error.message)
      }
    }
    
    console.log(`\n🎯 Summary:`)
    console.log(`- Created: ${createdCount} users`)
    console.log(`- Already existed: ${existingCount} users`)
    console.log(`- Total: ${createdCount + existingCount} users`)
    
    // Show final user list
    console.log('\n📋 All users in database:')
    const allUsers = await pool.query('SELECT email, username, created_at FROM users ORDER BY created_at')
    allUsers.rows.forEach(user => {
      console.log(`- ${user.username} (${user.email})`)
    })
    
    console.log('\n🏈 Your fantasy league users are ready!')
    console.log('You can now test login with any email and any password.')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  } finally {
    await pool.end()
  }
}

createNeonTestUsers().catch(console.error)