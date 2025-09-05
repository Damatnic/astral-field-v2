const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IrC1uWYi3FdA@ep-floral-lake-aeiztgic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

// Real NFL players data
const playersData = [
  // QBs
  { name: 'Josh Allen', position: 'QB', nfl_team: 'BUF', bye_week: 12 },
  { name: 'Lamar Jackson', position: 'QB', nfl_team: 'BAL', bye_week: 14 },
  { name: 'Jalen Hurts', position: 'QB', nfl_team: 'PHI', bye_week: 7 },
  { name: 'Patrick Mahomes', position: 'QB', nfl_team: 'KC', bye_week: 10 },
  { name: 'Dak Prescott', position: 'QB', nfl_team: 'DAL', bye_week: 7 },
  { name: 'Tua Tagovailoa', position: 'QB', nfl_team: 'MIA', bye_week: 6 },
  { name: 'Joe Burrow', position: 'QB', nfl_team: 'CIN', bye_week: 12 },
  { name: 'Justin Herbert', position: 'QB', nfl_team: 'LAC', bye_week: 5 },
  { name: 'Aaron Rodgers', position: 'QB', nfl_team: 'NYJ', bye_week: 12 },
  { name: 'Trevor Lawrence', position: 'QB', nfl_team: 'JAX', bye_week: 12 },
  
  // RBs
  { name: 'Christian McCaffrey', position: 'RB', nfl_team: 'SF', bye_week: 9 },
  { name: 'Austin Ekeler', position: 'RB', nfl_team: 'WAS', bye_week: 14 },
  { name: 'Bijan Robinson', position: 'RB', nfl_team: 'ATL', bye_week: 12 },
  { name: 'Breece Hall', position: 'RB', nfl_team: 'NYJ', bye_week: 12 },
  { name: 'Saquon Barkley', position: 'RB', nfl_team: 'PHI', bye_week: 7 },
  { name: 'Jonathan Taylor', position: 'RB', nfl_team: 'IND', bye_week: 14 },
  { name: 'Derrick Henry', position: 'RB', nfl_team: 'BAL', bye_week: 14 },
  { name: 'Josh Jacobs', position: 'RB', nfl_team: 'GB', bye_week: 10 },
  { name: 'Alvin Kamara', position: 'RB', nfl_team: 'NO', bye_week: 12 },
  { name: 'Nick Chubb', position: 'RB', nfl_team: 'CLE', bye_week: 10 },
  { name: 'Joe Mixon', position: 'RB', nfl_team: 'HOU', bye_week: 14 },
  { name: 'Kenneth Walker III', position: 'RB', nfl_team: 'SEA', bye_week: 10 },
  { name: 'Jahmyr Gibbs', position: 'RB', nfl_team: 'DET', bye_week: 5 },
  { name: 'De\'Von Achane', position: 'RB', nfl_team: 'MIA', bye_week: 6 },
  { name: 'Tony Pollard', position: 'RB', nfl_team: 'TEN', bye_week: 5 },
  
  // WRs
  { name: 'Tyreek Hill', position: 'WR', nfl_team: 'MIA', bye_week: 6 },
  { name: 'CeeDee Lamb', position: 'WR', nfl_team: 'DAL', bye_week: 7 },
  { name: 'Justin Jefferson', position: 'WR', nfl_team: 'MIN', bye_week: 6 },
  { name: 'Ja\'Marr Chase', position: 'WR', nfl_team: 'CIN', bye_week: 12 },
  { name: 'A.J. Brown', position: 'WR', nfl_team: 'PHI', bye_week: 7 },
  { name: 'Amon-Ra St. Brown', position: 'WR', nfl_team: 'DET', bye_week: 5 },
  { name: 'Stefon Diggs', position: 'WR', nfl_team: 'HOU', bye_week: 14 },
  { name: 'Davante Adams', position: 'WR', nfl_team: 'LV', bye_week: 10 },
  { name: 'DK Metcalf', position: 'WR', nfl_team: 'SEA', bye_week: 10 },
  { name: 'DeVonta Smith', position: 'WR', nfl_team: 'PHI', bye_week: 7 },
  { name: 'Mike Evans', position: 'WR', nfl_team: 'TB', bye_week: 11 },
  { name: 'Keenan Allen', position: 'WR', nfl_team: 'CHI', bye_week: 7 },
  { name: 'Chris Olave', position: 'WR', nfl_team: 'NO', bye_week: 12 },
  { name: 'Puka Nacua', position: 'WR', nfl_team: 'LAR', bye_week: 6 },
  { name: 'Tee Higgins', position: 'WR', nfl_team: 'CIN', bye_week: 12 },
  
  // TEs
  { name: 'Travis Kelce', position: 'TE', nfl_team: 'KC', bye_week: 10 },
  { name: 'Mark Andrews', position: 'TE', nfl_team: 'BAL', bye_week: 14 },
  { name: 'T.J. Hockenson', position: 'TE', nfl_team: 'MIN', bye_week: 6 },
  { name: 'Kyle Pitts', position: 'TE', nfl_team: 'ATL', bye_week: 12 },
  { name: 'George Kittle', position: 'TE', nfl_team: 'SF', bye_week: 9 },
  { name: 'Evan Engram', position: 'TE', nfl_team: 'JAX', bye_week: 12 },
  { name: 'Dallas Goedert', position: 'TE', nfl_team: 'PHI', bye_week: 7 },
  { name: 'Sam LaPorta', position: 'TE', nfl_team: 'DET', bye_week: 5 },
  { name: 'David Njoku', position: 'TE', nfl_team: 'CLE', bye_week: 10 },
  { name: 'Jake Ferguson', position: 'TE', nfl_team: 'DAL', bye_week: 7 },
  
  // Kickers
  { name: 'Justin Tucker', position: 'K', nfl_team: 'BAL', bye_week: 14 },
  { name: 'Harrison Butker', position: 'K', nfl_team: 'KC', bye_week: 10 },
  { name: 'Tyler Bass', position: 'K', nfl_team: 'BUF', bye_week: 12 },
  { name: 'Brandon McManus', position: 'K', nfl_team: 'GB', bye_week: 10 },
  { name: 'Jake Moody', position: 'K', nfl_team: 'SF', bye_week: 9 },
  { name: 'Younghoe Koo', position: 'K', nfl_team: 'ATL', bye_week: 12 },
  { name: 'Daniel Carlson', position: 'K', nfl_team: 'LV', bye_week: 10 },
  { name: 'Wil Lutz', position: 'K', nfl_team: 'NO', bye_week: 12 },
  { name: 'Dustin Hopkins', position: 'K', nfl_team: 'CLE', bye_week: 10 },
  { name: 'Jake Elliott', position: 'K', nfl_team: 'PHI', bye_week: 7 },
  
  // Defenses
  { name: 'San Francisco 49ers', position: 'DST', nfl_team: 'SF', bye_week: 9 },
  { name: 'Baltimore Ravens', position: 'DST', nfl_team: 'BAL', bye_week: 14 },
  { name: 'Buffalo Bills', position: 'DST', nfl_team: 'BUF', bye_week: 12 },
  { name: 'Cleveland Browns', position: 'DST', nfl_team: 'CLE', bye_week: 10 },
  { name: 'Pittsburgh Steelers', position: 'DST', nfl_team: 'PIT', bye_week: 9 },
  { name: 'Dallas Cowboys', position: 'DST', nfl_team: 'DAL', bye_week: 7 },
  { name: 'New York Jets', position: 'DST', nfl_team: 'NYJ', bye_week: 12 },
  { name: 'Miami Dolphins', position: 'DST', nfl_team: 'MIA', bye_week: 6 },
  { name: 'Philadelphia Eagles', position: 'DST', nfl_team: 'PHI', bye_week: 7 },
  { name: 'New England Patriots', position: 'DST', nfl_team: 'NE', bye_week: 14 }
]

async function setupNeonDatabase() {
  console.log('🚀 Setting up Neon database for Astral Field...\n')
  
  try {
    // 1. Test connection
    console.log('🔌 Testing database connection...')
    const testResult = await pool.query('SELECT NOW()')
    console.log('✅ Connected to Neon database at:', testResult.rows[0].now)
    
    // 2. Check if tables exist
    console.log('\n📋 Checking existing tables...')
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    const existingTables = tablesResult.rows.map(row => row.table_name)
    console.log('Existing tables:', existingTables.length > 0 ? existingTables : 'None')
    
    // 3. Create players if players table exists and is empty
    if (existingTables.includes('players')) {
      console.log('\n🏈 Checking players data...')
      const playersCount = await pool.query('SELECT COUNT(*) FROM players')
      
      if (parseInt(playersCount.rows[0].count) === 0) {
        console.log('📋 Inserting NFL players...')
        
        for (const player of playersData) {
          try {
            await pool.query(`
              INSERT INTO players (name, position, nfl_team, bye_week)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (name, nfl_team, position) DO NOTHING
            `, [player.name, player.position, player.nfl_team, player.bye_week])
          } catch (err) {
            console.log(`⚠️ Skipped ${player.name}: ${err.message}`)
          }
        }
        
        const finalCount = await pool.query('SELECT COUNT(*) FROM players')
        console.log(`✅ Added ${finalCount.rows[0].count} players to database`)
      } else {
        console.log(`✅ Players table already has ${playersCount.rows[0].count} players`)
      }
    } else {
      console.log('⚠️ Players table not found. Run the schema first.')
    }
    
    console.log('\n🎯 Database setup summary:')
    console.log('- Database: Connected ✅')
    console.log(`- Tables: ${existingTables.length} found`)
    if (existingTables.includes('players')) {
      const count = await pool.query('SELECT COUNT(*) FROM players')
      console.log(`- Players: ${count.rows[0].count} in database`)
    }
    
    console.log('\n🚀 Next steps:')
    console.log('1. If no tables exist, run the schema: neon/schema.sql')
    console.log('2. Your app should now work with Stack Auth + Neon!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  } finally {
    await pool.end()
  }
}

setupNeonDatabase().catch(console.error)