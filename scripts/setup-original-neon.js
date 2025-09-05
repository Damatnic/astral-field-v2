const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Using your original Neon connection string
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
})

const testUsers = [
  { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato', password: 'astral2025' },
  { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum', password: 'astral2025' },
  { email: 'cason.minor@astralfield.com', username: 'Cason Minor', password: 'astral2025' },
  { email: 'david.jarvey@astralfield.com', username: 'David Jarvey', password: 'astral2025' },
  { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue', password: 'astral2025' },
  { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck', password: 'astral2025' },
  { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki', password: 'astral2025' },
  { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue', password: 'astral2025' },
  { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley', password: 'astral2025' },
  { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue', password: 'astral2025' }
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
        password_hash TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Users table ready')
    
    // Add password_hash column if it doesn't exist (for existing tables)
    console.log('🔧 Adding password_hash column if needed...')
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT')
      console.log('✅ Password hash column ready')
    } catch (error) {
      console.log('⚠️ Password hash column already exists or error:', error.message)
    }
    
    // Create user profiles with passwords
    console.log('\n👥 Creating/updating user profiles with passwords...')
    let createdCount = 0
    let updatedCount = 0
    
    for (const user of testUsers) {
      try {
        // Hash the password
        const passwordHash = await bcrypt.hash(user.password, 10)
        
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id, password_hash FROM users WHERE email = $1',
          [user.email]
        )
        
        if (existingUser.rows.length > 0) {
          // Update existing user with password
          await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
            [passwordHash, user.email]
          )
          console.log(`🔄 Updated password for: ${user.username}`)
          updatedCount++
        } else {
          // Create new user
          const result = await pool.query(
            'INSERT INTO users (email, username, password_hash, stack_user_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [user.email, user.username, passwordHash, null]
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
      'SELECT id, email, username, password_hash, created_at FROM users ORDER BY created_at DESC'
    )
    
    console.log(`\n🎯 Summary:`)
    console.log(`- Created: ${createdCount} users`)
    console.log(`- Updated: ${updatedCount} users`)
    console.log(`- Total in database: ${allUsers.rows.length} users`)
    
    console.log('\n📋 All users in database:')
    allUsers.rows.forEach((user, index) => {
      const hasPassword = user.password_hash ? '🔒' : '❌'
      console.log(`${index + 1}. ${user.username} (${user.email}) ${hasPassword} - ${user.id}`)
    })
    
    console.log('\n🏈 Your fantasy league users are ready!')
    console.log('Login credentials: Use any email above with password: astral2025')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    await pool.end()
  }
}

setupOriginalNeon().catch(console.error)