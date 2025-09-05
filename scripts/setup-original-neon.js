const { Pool } = require('pg')

// Using your original Neon connection string
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
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

async function setupOriginalNeon() {
  console.log('🚀 Setting up profiles in original Neon database...\n')
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    const testResult = await pool.query('SELECT NOW()')
    console.log('✅ Connected to Neon database at:', testResult.rows[0].now)
    
    // Enable UUID extension
    console.log('\n🔧 Enabling UUID extension...')
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    console.log('✅ UUID extension enabled')
    
    // Create users table if it doesn't exist
    console.log('\n📋 Creating users table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stack_user_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Users table ready')
    
    // Create user profiles
    console.log('\n👥 Creating user profiles...')
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
          const result = await pool.query(
            'INSERT INTO users (email, username, stack_user_id) VALUES ($1, $2, $3) RETURNING id',
            [user.email, user.username, null]
          )
          console.log(`✅ Created user: ${user.username} (ID: ${result.rows[0].id})`)
          createdCount++
        }
      } catch (error) {
        console.error(`❌ Error with user ${user.username}:`, error.message)
      }
    }
    
    // Final verification
    console.log('\n📊 Final verification...')
    const allUsers = await pool.query(
      'SELECT id, email, username, created_at FROM users ORDER BY created_at DESC'
    )
    
    console.log(`\n🎯 Summary:`)
    console.log(`- Created: ${createdCount} users`)
    console.log(`- Already existed: ${existingCount} users`)
    console.log(`- Total in database: ${allUsers.rows.length} users`)
    
    console.log('\n📋 All users in database:')
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.id}`)
    })
    
    console.log('\n🏈 Your fantasy league users are ready!')
    console.log('Login credentials: Any email above with any password')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    await pool.end()
  }
}

setupOriginalNeon().catch(console.error)