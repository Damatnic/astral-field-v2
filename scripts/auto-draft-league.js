const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udqlhdagqjbhkswzgitj.supabase.co'
const supabaseServiceKey = 'sb_secret_ZD550ahg4-Lx_GNjX2Aevw_Vm6cpH9l'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// PPR scoring system
const pprScoringSystem = {
  passingYards: 0.04,
  passingTouchdowns: 4,
  passingInterceptions: -2,
  rushingYards: 0.1,
  rushingTouchdowns: 6,
  receivingYards: 0.1,
  receivingTouchdowns: 6,
  receptions: 1, // PPR bonus
  fumbles: -2,
  fieldGoals: 3,
  extraPoints: 1,
  defensePoints: 1
}

// League settings for 10-team PPR
const leagueSettings = {
  maxTeams: 10,
  rounds: 16,
  playoffTeams: 4,
  playoffWeeks: 3,
  waiverDays: 2,
  tradeDeadline: 12,
  startingLineup: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DST: 1,
    BENCH: 6
  }
}

// Top fantasy football players for 2024 season with realistic projections
const playerPool = [
  // QBs
  { name: 'Josh Allen', position: 'QB', team: 'BUF', adp: 12, projectedPoints: 320 },
  { name: 'Lamar Jackson', position: 'QB', team: 'BAL', adp: 15, projectedPoints: 315 },
  { name: 'Jalen Hurts', position: 'QB', team: 'PHI', adp: 18, projectedPoints: 310 },
  { name: 'Patrick Mahomes', position: 'QB', team: 'KC', adp: 22, projectedPoints: 305 },
  { name: 'Dak Prescott', position: 'QB', team: 'DAL', adp: 45, projectedPoints: 285 },
  { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA', adp: 48, projectedPoints: 280 },
  { name: 'Joe Burrow', position: 'QB', team: 'CIN', adp: 52, projectedPoints: 275 },
  { name: 'Justin Herbert', position: 'QB', team: 'LAC', adp: 55, projectedPoints: 270 },
  { name: 'Aaron Rodgers', position: 'QB', team: 'NYJ', adp: 65, projectedPoints: 265 },
  { name: 'Trevor Lawrence', position: 'QB', team: 'JAX', adp: 68, projectedPoints: 260 },
  
  // RBs
  { name: 'Christian McCaffrey', position: 'RB', team: 'SF', adp: 1, projectedPoints: 280 },
  { name: 'Austin Ekeler', position: 'RB', team: 'WAS', adp: 8, projectedPoints: 240 },
  { name: 'Bijan Robinson', position: 'RB', team: 'ATL', adp: 10, projectedPoints: 235 },
  { name: 'Breece Hall', position: 'RB', team: 'NYJ', adp: 11, projectedPoints: 230 },
  { name: 'Saquon Barkley', position: 'RB', team: 'PHI', adp: 13, projectedPoints: 225 },
  { name: 'Jonathan Taylor', position: 'RB', team: 'IND', adp: 16, projectedPoints: 220 },
  { name: 'Derrick Henry', position: 'RB', team: 'BAL', adp: 19, projectedPoints: 215 },
  { name: 'Josh Jacobs', position: 'RB', team: 'GB', adp: 21, projectedPoints: 210 },
  { name: 'Alvin Kamara', position: 'RB', team: 'NO', adp: 23, projectedPoints: 205 },
  { name: 'Nick Chubb', position: 'RB', team: 'CLE', adp: 25, projectedPoints: 200 },
  { name: 'Joe Mixon', position: 'RB', team: 'HOU', adp: 28, projectedPoints: 195 },
  { name: 'Kenneth Walker III', position: 'RB', team: 'SEA', adp: 30, projectedPoints: 190 },
  { name: 'Jahmyr Gibbs', position: 'RB', team: 'DET', adp: 32, projectedPoints: 185 },
  { name: 'De\'Von Achane', position: 'RB', team: 'MIA', adp: 35, projectedPoints: 180 },
  { name: 'Tony Pollard', position: 'RB', team: 'TEN', adp: 38, projectedPoints: 175 },
  
  // WRs
  { name: 'Tyreek Hill', position: 'WR', team: 'MIA', adp: 2, projectedPoints: 260 },
  { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', adp: 3, projectedPoints: 255 },
  { name: 'Justin Jefferson', position: 'WR', team: 'MIN', adp: 4, projectedPoints: 250 },
  { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', adp: 5, projectedPoints: 245 },
  { name: 'A.J. Brown', position: 'WR', team: 'PHI', adp: 6, projectedPoints: 240 },
  { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', adp: 7, projectedPoints: 235 },
  { name: 'Stefon Diggs', position: 'WR', team: 'HOU', adp: 9, projectedPoints: 230 },
  { name: 'Davante Adams', position: 'WR', team: 'LV', adp: 14, projectedPoints: 225 },
  { name: 'DK Metcalf', position: 'WR', team: 'SEA', adp: 17, projectedPoints: 220 },
  { name: 'DeVonta Smith', position: 'WR', team: 'PHI', adp: 20, projectedPoints: 215 },
  { name: 'Mike Evans', position: 'WR', team: 'TB', adp: 24, projectedPoints: 210 },
  { name: 'Keenan Allen', position: 'WR', team: 'CHI', adp: 26, projectedPoints: 205 },
  { name: 'Chris Olave', position: 'WR', team: 'NO', adp: 27, projectedPoints: 200 },
  { name: 'Puka Nacua', position: 'WR', team: 'LAR', adp: 29, projectedPoints: 195 },
  { name: 'Tee Higgins', position: 'WR', team: 'CIN', adp: 31, projectedPoints: 190 },
  
  // TEs
  { name: 'Travis Kelce', position: 'TE', team: 'KC', adp: 33, projectedPoints: 180 },
  { name: 'Mark Andrews', position: 'TE', team: 'BAL', adp: 34, projectedPoints: 165 },
  { name: 'T.J. Hockenson', position: 'TE', team: 'MIN', adp: 36, projectedPoints: 150 },
  { name: 'Kyle Pitts', position: 'TE', team: 'ATL', adp: 37, projectedPoints: 145 },
  { name: 'George Kittle', position: 'TE', team: 'SF', adp: 39, projectedPoints: 140 },
  { name: 'Evan Engram', position: 'TE', team: 'JAX', adp: 42, projectedPoints: 135 },
  { name: 'Dallas Goedert', position: 'TE', team: 'PHI', adp: 44, projectedPoints: 130 },
  { name: 'Sam LaPorta', position: 'TE', team: 'DET', adp: 46, projectedPoints: 125 },
  { name: 'David Njoku', position: 'TE', team: 'CLE', adp: 50, projectedPoints: 120 },
  { name: 'Jake Ferguson', position: 'TE', team: 'DAL', adp: 54, projectedPoints: 115 },
  
  // Kickers
  { name: 'Justin Tucker', position: 'K', team: 'BAL', adp: 120, projectedPoints: 140 },
  { name: 'Harrison Butker', position: 'K', team: 'KC', adp: 125, projectedPoints: 135 },
  { name: 'Tyler Bass', position: 'K', team: 'BUF', adp: 130, projectedPoints: 130 },
  { name: 'Brandon McManus', position: 'K', team: 'GB', adp: 135, projectedPoints: 125 },
  { name: 'Jake Moody', position: 'K', team: 'SF', adp: 140, projectedPoints: 120 },
  { name: 'Younghoe Koo', position: 'K', team: 'ATL', adp: 145, projectedPoints: 115 },
  { name: 'Daniel Carlson', position: 'K', team: 'LV', adp: 150, projectedPoints: 110 },
  { name: 'Wil Lutz', position: 'K', team: 'NO', adp: 155, projectedPoints: 105 },
  { name: 'Dustin Hopkins', position: 'K', team: 'CLE', adp: 160, projectedPoints: 100 },
  { name: 'Jake Elliott', position: 'K', team: 'PHI', adp: 165, projectedPoints: 95 },
  
  // Defenses
  { name: 'San Francisco 49ers', position: 'DST', team: 'SF', adp: 110, projectedPoints: 145 },
  { name: 'Baltimore Ravens', position: 'DST', team: 'BAL', adp: 115, projectedPoints: 140 },
  { name: 'Buffalo Bills', position: 'DST', team: 'BUF', adp: 118, projectedPoints: 135 },
  { name: 'Cleveland Browns', position: 'DST', team: 'CLE', adp: 122, projectedPoints: 130 },
  { name: 'Pittsburgh Steelers', position: 'DST', team: 'PIT', adp: 127, projectedPoints: 125 },
  { name: 'Dallas Cowboys', position: 'DST', team: 'DAL', adp: 132, projectedPoints: 120 },
  { name: 'New York Jets', position: 'DST', team: 'NYJ', adp: 137, projectedPoints: 115 },
  { name: 'Miami Dolphins', position: 'DST', team: 'MIA', adp: 142, projectedPoints: 110 },
  { name: 'Philadelphia Eagles', position: 'DST', team: 'PHI', adp: 147, projectedPoints: 105 },
  { name: 'New England Patriots', position: 'DST', team: 'NE', adp: 152, projectedPoints: 100 }
]

const users = [
  { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato', teamName: 'D\'Amato Dynasty' },
  { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum', teamName: 'Bergum Ballers' },
  { email: 'cason.minor@astralfield.com', username: 'Cason Minor', teamName: 'Minor Miracles' },
  { email: 'david.jarvey@astralfield.com', username: 'David Jarvey', teamName: 'Jarvey\'s Juggernauts' },
  { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue', teamName: 'McCaigue Mayhem' },
  { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck', teamName: 'Kornbeck Crushers' },
  { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki', teamName: 'Kaity\'s Kings' },
  { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue', teamName: 'Larry\'s Legends' },
  { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley', teamName: 'Hartley Heroes' },
  { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue', teamName: 'Renee\'s Rockets' }
]

async function autoDraftLeague() {
  console.log('🏈 Auto-drafting PPR 10-Team League...\n')
  
  try {
    // First, we'll simulate the draft process by distributing players
    const draftOrder = [...Array(10)].map((_, i) => i)
    const rounds = 16
    const picks = []
    
    // Snake draft order
    for (let round = 1; round <= rounds; round++) {
      const roundOrder = round % 2 === 1 ? draftOrder : [...draftOrder].reverse()
      roundOrder.forEach((teamIndex, pickInRound) => {
        const overallPick = (round - 1) * 10 + pickInRound + 1
        if (overallPick <= playerPool.length) {
          picks.push({
            round,
            pick: pickInRound + 1,
            overallPick,
            teamIndex,
            player: playerPool[overallPick - 1]
          })
        }
      })
    }
    
    console.log('🎯 Draft Results:')
    console.log('=' * 80)
    
    users.forEach((user, teamIndex) => {
      const teamPicks = picks.filter(pick => pick.teamIndex === teamIndex).slice(0, 16)
      console.log(`\n${user.teamName} (${user.username}):`)
      console.log('-'.repeat(50))
      
      const positions = { QB: [], RB: [], WR: [], TE: [], K: [], DST: [] }
      teamPicks.forEach(pick => {
        const { player, round, pick: pickNum } = pick
        console.log(`Round ${round}, Pick ${pickNum}: ${player.name} (${player.position}, ${player.team})`)
        positions[player.position]?.push(player)
      })
      
      console.log('\nStarting Lineup:')
      console.log(`QB: ${positions.QB[0]?.name || 'None'}`)
      console.log(`RB1: ${positions.RB[0]?.name || 'None'}`)
      console.log(`RB2: ${positions.RB[1]?.name || 'None'}`)
      console.log(`WR1: ${positions.WR[0]?.name || 'None'}`)
      console.log(`WR2: ${positions.WR[1]?.name || 'None'}`)
      console.log(`TE: ${positions.TE[0]?.name || 'None'}`)
      console.log(`FLEX: ${positions.RB[2]?.name || positions.WR[2]?.name || positions.TE[1]?.name || 'None'}`)
      console.log(`K: ${positions.K[0]?.name || 'None'}`)
      console.log(`DST: ${positions.DST[0]?.name || 'None'}`)
      
      const totalProjected = teamPicks.reduce((sum, pick) => sum + pick.player.projectedPoints, 0)
      console.log(`Projected Season Points: ${totalProjected}`)
    })
    
    console.log('\n🏆 League Summary:')
    console.log(`League: "The Astral Field Championship"`)
    console.log(`Format: PPR (Point Per Reception)`)
    console.log(`Teams: 10`)
    console.log(`Regular Season: 16 weeks`)
    console.log(`Playoffs: Week 17-19 (Top 4 teams)`)
    console.log(`Commissioner: Nicholas D'Amato`)
    
    console.log('\n📋 Draft Complete! All teams ready for the season.')
    
  } catch (error) {
    console.error('Error creating auto-draft:', error)
  }
}

autoDraftLeague().catch(console.error)