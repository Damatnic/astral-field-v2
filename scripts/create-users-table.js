const { Pool } = require('pg')

// Database connection using the Neon connection string
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IrC1uWYi3FdA@ep-floral-lake-aeiztgic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function createUsersTable() {
  console.log('🚀 Creating users table in Neon database...\n')
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    const testResult = await pool.query('SELECT NOW()')
    console.log('✅ Connected to Neon database at:', testResult.rows[0].now)
    
    // Enable UUID extension
    console.log('\n🔧 Enabling UUID extension...')
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    console.log('✅ UUID extension enabled')
    
    // Create users table
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
    console.log('✅ Users table created')
    
    // Create players table
    console.log('\n🏈 Creating players table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        position TEXT NOT NULL,
        nfl_team TEXT NOT NULL,
        stats JSONB DEFAULT '{}',
        projections JSONB DEFAULT '{}',
        injury_status TEXT,
        bye_week INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name, nfl_team, position)
      )
    `)
    console.log('✅ Players table created')
    
    // Verify tables exist
    console.log('\n📊 Verifying tables...')
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    const existingTables = tablesResult.rows.map(row => row.table_name)
    console.log('✅ Created tables:', existingTables)
    
    console.log('\n🎉 Database setup complete!')
    console.log('Next: Run `node scripts/create-neon-test-users.js` to add users')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  } finally {
    await pool.end()
  }
}

createUsersTable().catch(console.error)