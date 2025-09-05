const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://udqlhdagqjbhkswzgitj.supabase.co'
const supabaseServiceKey = 'sb_secret_ZD550ahg4-Lx_GNjX2Aevw_Vm6cpH9l'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
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

async function setupDatabase() {
  console.log('🚀 Setting up Astral Field database...\n')
  
  try {
    // 1. Create players first
    console.log('📋 Creating players...')
    const { data: players, error: playersError } = await supabase
      .from('players')
      .upsert(playersData, { onConflict: 'name,nfl_team,position' })
      .select()
    
    if (playersError) {
      console.error('❌ Error creating players:', playersError.message)
      return
    }
    
    console.log(`✅ Created ${players.length} players`)
    
    // 2. Create league
    console.log('🏈 Creating league...')
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: 'The Astral Field Championship',
        commissioner_id: 'nicholas-damato-id', // We'll update this with real user ID
        settings: {
          maxTeams: 10,
          rounds: 16,
          playoffTeams: 4,
          playoffWeeks: 3,
          waiverDays: 2,
          tradeDeadline: 12,
          startingLineup: {
            QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 6
          }
        },
        scoring_system: {
          passingYards: 0.04,
          passingTouchdowns: 4,
          passingInterceptions: -2,
          rushingYards: 0.1,
          rushingTouchdowns: 6,
          receivingYards: 0.1,
          receivingTouchdowns: 6,
          receptions: 1, // PPR
          fumbles: -2,
          fieldGoals: 3,
          extraPoints: 1
        },
        season_year: 2024
      })
      .select()
      .single()
    
    if (leagueError) {
      console.error('❌ Error creating league:', leagueError.message)
      return
    }
    
    console.log('✅ Created league:', league.name)
    
    console.log('\n🎯 Database setup complete!')
    console.log('Next steps:')
    console.log('1. Run the schema.sql file in your Supabase SQL editor')
    console.log('2. Users will be created automatically when they first sign in')
    console.log('3. Teams and rosters can be created through the app interface')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

setupDatabase().catch(console.error)