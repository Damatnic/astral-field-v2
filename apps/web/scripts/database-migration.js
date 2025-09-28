#!/usr/bin/env node

/**
 * Phoenix Database Migration & Data Population Script
 * Resolves schema conflicts and populates missing data for AstralField
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Sample NFL Teams for realistic data
const NFL_TEAMS = [
  'BUF', 'MIA', 'NE', 'NYJ', 'BAL', 'CIN', 'CLE', 'PIT',
  'HOU', 'IND', 'JAX', 'TEN', 'DEN', 'KC', 'LV', 'LAC',
  'DAL', 'NYG', 'PHI', 'WAS', 'CHI', 'DET', 'GB', 'MIN',
  'ATL', 'CAR', 'NO', 'TB', 'ARI', 'LAR', 'SF', 'SEA'
]

// Sample Player Data for Fantasy Football
const SAMPLE_PLAYERS = [
  // Quarterbacks
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', rank: 1, adp: 1.5 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', rank: 2, adp: 2.1 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', rank: 3, adp: 2.8 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', rank: 4, adp: 3.2 },
  { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', rank: 5, adp: 4.1 },
  
  // Running Backs
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', rank: 1, adp: 1.1 },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL', rank: 2, adp: 1.8 },
  { name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', rank: 3, adp: 2.3 },
  { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', rank: 4, adp: 2.7 },
  { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', rank: 5, adp: 3.1 },
  { name: 'Josh Jacobs', position: 'RB', nflTeam: 'GB', rank: 6, adp: 3.5 },
  { name: 'Breece Hall', position: 'RB', nflTeam: 'NYJ', rank: 7, adp: 4.2 },
  { name: 'Kenneth Walker III', position: 'RB', nflTeam: 'SEA', rank: 8, adp: 4.8 },
  
  // Wide Receivers
  { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', rank: 1, adp: 1.3 },
  { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', rank: 2, adp: 1.7 },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', rank: 3, adp: 2.2 },
  { name: 'Stefon Diggs', position: 'WR', nflTeam: 'HOU', rank: 4, adp: 2.6 },
  { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', rank: 5, adp: 3.0 },
  { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', rank: 6, adp: 3.4 },
  { name: 'Ja\'Marr Chase', position: 'WR', nflTeam: 'CIN', rank: 7, adp: 3.8 },
  { name: 'DK Metcalf', position: 'WR', nflTeam: 'SEA', rank: 8, adp: 4.3 },
  { name: 'DeAndre Hopkins', position: 'WR', nflTeam: 'TEN', rank: 9, adp: 4.7 },
  { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', rank: 10, adp: 5.1 },
  
  // Tight Ends
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', rank: 1, adp: 2.5 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', rank: 2, adp: 4.0 },
  { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', rank: 3, adp: 5.5 },
  { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', rank: 4, adp: 6.0 },
  { name: 'George Kittle', position: 'TE', nflTeam: 'SF', rank: 5, adp: 6.5 },
  
  // Kickers
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', rank: 1, adp: 12.0 },
  { name: 'Harrison Butker', position: 'K', nflTeam: 'KC', rank: 2, adp: 12.5 },
  { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', rank: 3, adp: 13.0 },
  
  // Defenses
  { name: 'Buffalo Bills', position: 'DEF', nflTeam: 'BUF', rank: 1, adp: 11.0 },
  { name: 'San Francisco 49ers', position: 'DEF', nflTeam: 'SF', rank: 2, adp: 11.5 },
  { name: 'Dallas Cowboys', position: 'DEF', nflTeam: 'DAL', rank: 3, adp: 12.0 }
]

// Helper function to generate CUIDs
function generateCuid() {
  return 'cl' + Math.random().toString(36).substr(2, 9)
}

async function createSampleUsers() {
  console.log('🔄 Creating sample users...')
  
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const users = [
    {
      id: generateCuid(),
      email: 'admin@astralfield.com',
      name: 'Admin User',
      hashedPassword,
      role: 'ADMIN',
      onboardingCompleted: true
    },
    {
      id: generateCuid(),
      email: 'commissioner@league.com',
      name: 'League Commissioner',
      hashedPassword,
      role: 'COMMISSIONER',
      onboardingCompleted: true
    },
    {
      id: generateCuid(),
      email: 'player1@fantasy.com',
      name: 'Fantasy Player 1',
      hashedPassword,
      role: 'PLAYER',
      onboardingCompleted: true
    },
    {
      id: generateCuid(),
      email: 'player2@fantasy.com',
      name: 'Fantasy Player 2',
      hashedPassword,
      role: 'PLAYER',
      onboardingCompleted: true
    }
  ]
  
  for (const user of users) {
    try {
      await prisma.users.upsert({
        where: { email: user.email },
        update: user,
        create: user
      })
      console.log(`✅ Created user: ${user.email}`)
    } catch (error) {
      console.log(`ℹ️ User already exists: ${user.email}`)
    }
  }
  
  return users
}

async function createSamplePlayers() {
  console.log('🔄 Creating sample players...')
  
  for (const playerData of SAMPLE_PLAYERS) {
    try {
      await prisma.players.upsert({
        where: { 
          espnId: `espn_${playerData.name.replace(/\\s+/g, '_').toLowerCase()}`
        },
        update: {
          name: playerData.name,
          position: playerData.position,
          nflTeam: playerData.nflTeam,
          rank: playerData.rank,
          adp: playerData.adp,
          isActive: true,
          isFantasyRelevant: true
        },
        create: {
          id: generateCuid(),
          espnId: `espn_${playerData.name.replace(/\\s+/g, '_').toLowerCase()}`,
          name: playerData.name,
          position: playerData.position,
          nflTeam: playerData.nflTeam,
          rank: playerData.rank,
          adp: playerData.adp,
          isActive: true,
          isFantasyRelevant: true,
          status: 'active'
        }
      })
      console.log(`✅ Created player: ${playerData.name}`)
    } catch (error) {
      console.log(`ℹ️ Player might already exist: ${playerData.name}`)
    }
  }
}

async function createSampleLeagues(users) {
  console.log('🔄 Creating sample leagues...')
  
  const commissioner = users.find(u => u.role === 'COMMISSIONER')
  
  const leagueData = {
    id: generateCuid(),
    name: 'AstralField Championship League',
    commissionerId: commissioner.id,
    currentWeek: 4,
    season: '2025',
    isActive: true,
    settings: JSON.stringify({
      teamCount: 8,
      playoffTeams: 4,
      playoffWeeks: 3,
      regularSeasonLength: 14
    }),
    scoringSettings: JSON.stringify({
      passingTd: 4,
      rushingTd: 6,
      receivingTd: 6,
      passingYards: 0.04,
      rushingYards: 0.1,
      receivingYards: 0.1
    }),
    rosterSettings: JSON.stringify({
      qb: 1,
      rb: 2,
      wr: 2,
      te: 1,
      flex: 1,
      def: 1,
      k: 1,
      bench: 6
    })
  }
  
  try {
    const league = await prisma.leagues.upsert({
      where: { id: leagueData.id },
      update: leagueData,
      create: leagueData
    })
    console.log(`✅ Created league: ${leagueData.name}`)
    return league
  } catch (error) {
    console.log(`ℹ️ League might already exist: ${leagueData.name}`)
    // Find league by name using correct method
    const existingLeague = await prisma.leagues.findMany({
      where: { name: leagueData.name },
      take: 1
    })
    return existingLeague[0] || null
  }
}

async function createSampleTeams(users, league) {
  console.log('🔄 Creating sample teams...')
  
  const playerUsers = users.filter(u => u.role === 'PLAYER' || u.role === 'COMMISSIONER')
  
  const teamNames = [
    'Lightning Bolts',
    'Thunder Hawks',
    'Storm Riders',
    'Fire Dragons'
  ]
  
  const teams = []
  
  for (let i = 0; i < Math.min(playerUsers.length, teamNames.length); i++) {
    const teamData = {
      id: generateCuid(),
      name: teamNames[i],
      ownerId: playerUsers[i].id,
      leagueId: league.id,
      wins: Math.floor(Math.random() * 4),
      losses: Math.floor(Math.random() * 3),
      ties: 0,
      pointsFor: Math.floor(Math.random() * 500) + 300,
      pointsAgainst: Math.floor(Math.random() * 500) + 300,
      standing: i + 1
    }
    
    try {
      const team = await prisma.teams.upsert({
        where: { id: teamData.id },
        update: teamData,
        create: teamData
      })
      teams.push(team)
      console.log(`✅ Created team: ${teamData.name}`)
    } catch (error) {
      console.log(`ℹ️ Team might already exist: ${teamData.name}`)
    }
  }
  
  return teams
}

async function createSampleRosters(teams) {
  console.log('🔄 Creating sample rosters...')
  
  const players = await prisma.players.findMany({
    where: { isActive: true },
    take: 50
  })
  
  if (players.length === 0) {
    console.log('⚠️ No players found, skipping roster creation')
    return
  }
  
  const positionRequirements = {
    QB: 2,
    RB: 4,
    WR: 4,
    TE: 2,
    K: 1,
    DEF: 1
  }
  
  for (const team of teams) {
    console.log(`Creating roster for ${team.name}...`)
    
    let playerIndex = 0
    
    for (const [position, count] of Object.entries(positionRequirements)) {
      const positionPlayers = players.filter(p => p.position === position)
      
      for (let i = 0; i < Math.min(count, positionPlayers.length); i++) {
        const player = positionPlayers[i]
        
        try {
          await prisma.roster_players.upsert({
            where: {
              teamId_playerId: {
                teamId: team.id,
                playerId: player.id
              }
            },
            update: {},
            create: {
              id: generateCuid(),
              teamId: team.id,
              playerId: player.id,
              position: position,
              isStarter: i === 0, // First player at each position is starter
              isLocked: false,
              acquisitionType: 'draft'
            }
          })
          playerIndex++
        } catch (error) {
          console.log(`ℹ️ Roster entry might already exist for ${player.name}`)
        }
      }
    }
    
    console.log(`✅ Created roster for ${team.name} (${playerIndex} players)`)
  }
}

async function createSamplePlayerStats() {
  console.log('🔄 Creating sample player stats...')
  
  const players = await prisma.players.findMany({
    where: { isActive: true },
    take: 20
  })
  
  for (const player of players) {
    for (let week = 1; week <= 3; week++) {
      const statsData = {
        id: generateCuid(),
        playerId: player.id,
        week: week,
        season: '2025',
        fantasyPoints: Math.floor(Math.random() * 25) + 5,
        stats: JSON.stringify({
          passingYards: player.position === 'QB' ? Math.floor(Math.random() * 300) + 100 : 0,
          rushingYards: ['QB', 'RB'].includes(player.position) ? Math.floor(Math.random() * 100) : 0,
          receivingYards: ['WR', 'TE'].includes(player.position) ? Math.floor(Math.random() * 120) + 20 : 0,
          touchdowns: Math.floor(Math.random() * 3)
        })
      }
      
      try {
        await prisma.player_stats.upsert({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week: week,
              season: '2025'
            }
          },
          update: statsData,
          create: statsData
        })
      } catch (error) {
        console.log(`ℹ️ Stats might already exist for ${player.name} week ${week}`)
      }
    }
  }
  
  console.log(`✅ Created stats for ${players.length} players`)
}

async function createSampleNews() {
  console.log('🔄 Creating sample player news...')
  
  const players = await prisma.players.findMany({
    where: { isActive: true },
    take: 10
  })
  
  const newsTemplates = [
    'Expected to have a big game this week',
    'Dealing with minor injury, questionable for Sunday',
    'Breakout performance last week, trending up',
    'New role in offense could boost fantasy value',
    'Facing tough matchup but remains startable'
  ]
  
  for (const player of players) {
    const newsData = {
      id: generateCuid(),
      playerId: player.id,
      headline: `${player.name}: ${newsTemplates[Math.floor(Math.random() * newsTemplates.length)]}`,
      body: `Fantasy analysis and injury update for ${player.name}. Monitor throughout the week for latest updates.`,
      source: 'AstralField Analysis',
      publishedAt: new Date()
    }
    
    try {
      await prisma.player_news.create({
        data: newsData
      })
    } catch (error) {
      console.log(`ℹ️ News might already exist for ${player.name}`)
    }
  }
  
  console.log(`✅ Created news for ${players.length} players`)
}

async function main() {
  console.log('🚀 Starting AstralField Database Migration & Population...')
  
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Create sample data
    const users = await createSampleUsers()
    await createSamplePlayers()
    const league = await createSampleLeagues(users)
    const teams = await createSampleTeams(users, league)
    await createSampleRosters(teams)
    await createSamplePlayerStats()
    await createSampleNews()
    
    console.log('🎉 Database migration and population completed successfully!')
    console.log('')
    console.log('Sample login credentials:')
    console.log('Email: admin@astralfield.com')
    console.log('Email: player1@fantasy.com') 
    console.log('Password: password123')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()