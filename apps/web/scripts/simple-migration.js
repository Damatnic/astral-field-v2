#!/usr/bin/env node

/**
 * Simple Database Population Script for AstralField
 * Works with the existing schema structure
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to generate CUIDs
function generateCuid() {
  return 'cl' + Math.random().toString(36).substr(2, 9)
}

// Sample Player Data for Fantasy Football
const SAMPLE_PLAYERS = [
  // Quarterbacks
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', rank: 1, adp: 1.5 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', rank: 2, adp: 2.1 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', rank: 3, adp: 2.8 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', rank: 4, adp: 3.2 },
  
  // Running Backs
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', rank: 1, adp: 1.1 },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL', rank: 2, adp: 1.8 },
  { name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', rank: 3, adp: 2.3 },
  { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', rank: 4, adp: 2.7 },
  
  // Wide Receivers
  { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', rank: 1, adp: 1.3 },
  { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', rank: 2, adp: 1.7 },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', rank: 3, adp: 2.2 },
  { name: 'Stefon Diggs', position: 'WR', nflTeam: 'HOU', rank: 4, adp: 2.6 },
  
  // Tight Ends
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', rank: 1, adp: 2.5 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', rank: 2, adp: 4.0 },
  
  // Kickers
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', rank: 1, adp: 12.0 },
  
  // Defenses
  { name: 'Buffalo Bills', position: 'DEF', nflTeam: 'BUF', rank: 1, adp: 11.0 }
]

async function createSampleUsers() {
  console.log('🔄 Creating sample users...')
  
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const users = [
    {
      id: generateCuid(),
      email: 'admin@astralfield.com',
      name: 'Admin User',
      hashedPassword,
      role: 'ADMIN'
    },
    {
      id: generateCuid(),
      email: 'player1@fantasy.com',
      name: 'Fantasy Player 1',
      hashedPassword,
      role: 'USER'
    },
    {
      id: generateCuid(),
      email: 'player2@fantasy.com', 
      name: 'Fantasy Player 2',
      hashedPassword,
      role: 'USER'
    }
  ]
  
  for (const user of users) {
    try {
      // Using the actual table name from the schema
      await prisma.user.upsert({
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
      // Check if player exists
      const existingPlayer = await prisma.player.findFirst({
        where: { name: playerData.name }
      })
      
      if (!existingPlayer) {
        await prisma.player.create({
          data: {
            id: generateCuid(),
            name: playerData.name,
            position: playerData.position,
            nflTeam: playerData.nflTeam,
            rank: playerData.rank,
            adp: playerData.adp,
            isFantasyRelevant: true
          }
        })
        console.log(`✅ Created player: ${playerData.name}`)
      } else {
        console.log(`ℹ️ Player already exists: ${playerData.name}`)
      }
    } catch (error) {
      console.log(`⚠️ Error creating player ${playerData.name}: ${error.message}`)
    }
  }
}

async function createSampleLeague(users) {
  console.log('🔄 Creating sample league...')
  
  const admin = users.find(u => u.role === 'ADMIN') || users[0]
  
  const leagueData = {
    id: generateCuid(),
    name: 'AstralField Championship League',
    description: 'Demo league for AstralField testing',
    currentWeek: 4,
    isActive: true
  }
  
  try {
    const league = await prisma.league.upsert({
      where: { id: leagueData.id },
      update: leagueData,
      create: leagueData
    })
    console.log(`✅ Created league: ${leagueData.name}`)
    return league
  } catch (error) {
    console.log(`ℹ️ League might already exist: ${leagueData.name}`)
    // Try to find existing league
    const existingLeague = await prisma.league.findFirst({
      where: { name: leagueData.name }
    })
    return existingLeague
  }
}

async function createSampleTeams(users, league) {
  console.log('🔄 Creating sample teams...')
  
  if (!league) {
    console.log('⚠️ No league found, skipping team creation')
    return []
  }
  
  const teamNames = ['Lightning Bolts', 'Thunder Hawks', 'Storm Riders']
  const teams = []
  
  for (let i = 0; i < Math.min(users.length, teamNames.length); i++) {
    const teamData = {
      id: generateCuid(),
      name: teamNames[i],
      ownerId: users[i].id,
      leagueId: league.id,
      wins: Math.floor(Math.random() * 4),
      losses: Math.floor(Math.random() * 3),
      ties: 0
    }
    
    try {
      const team = await prisma.team.upsert({
        where: { id: teamData.id },
        update: teamData,
        create: teamData
      })
      teams.push(team)
      console.log(`✅ Created team: ${teamData.name}`)
    } catch (error) {
      console.log(`ℹ️ Team might already exist: ${teamData.name} - ${error.message}`)
    }
  }
  
  return teams
}

async function createSampleRosters(teams) {
  console.log('🔄 Creating sample rosters...')
  
  const players = await prisma.player.findMany({
    take: 15
  })
  
  if (players.length === 0) {
    console.log('⚠️ No players found, skipping roster creation')
    return
  }
  
  for (const team of teams) {
    console.log(`Creating roster for ${team.name}...`)
    
    // Add 3-4 players per team
    const teamPlayers = players.slice(0, 4)
    
    for (let i = 0; i < teamPlayers.length; i++) {
      const player = teamPlayers[i]
      
      try {
        await prisma.rosterPlayer.upsert({
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
            position: player.position,
            isStarter: i === 0 // First player is starter
          }
        })
      } catch (error) {
        console.log(`ℹ️ Roster entry might already exist for ${player.name}`)
      }
    }
    
    console.log(`✅ Created roster for ${team.name}`)
  }
}

async function createSamplePlayerStats() {
  console.log('🔄 Creating sample player stats...')
  
  const players = await prisma.player.findMany({
    take: 10
  })
  
  for (const player of players) {
    for (let week = 1; week <= 3; week++) {
      const statsData = {
        id: generateCuid(),
        playerId: player.id,
        week: week,
        season: 2025,
        fantasyPoints: Math.floor(Math.random() * 25) + 5,
        stats: JSON.stringify({
          touchdowns: Math.floor(Math.random() * 3),
          yards: Math.floor(Math.random() * 100) + 50
        })
      }
      
      try {
        await prisma.playerStats.upsert({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week: week,
              season: 2025
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
  
  const players = await prisma.player.findMany({
    take: 5
  })
  
  const newsTemplates = [
    'Expected to have a big game this week',
    'Dealing with minor injury, questionable for Sunday',
    'Breakout performance last week, trending up'
  ]
  
  for (const player of players) {
    const newsData = {
      id: generateCuid(),
      playerId: player.id,
      title: `${player.name}: ${newsTemplates[Math.floor(Math.random() * newsTemplates.length)]}`,
      content: `Fantasy analysis and injury update for ${player.name}.`,
      source: 'AstralField Analysis',
      severity: 'LOW',
      publishedAt: new Date()
    }
    
    try {
      await prisma.playerNews.create({
        data: newsData
      })
    } catch (error) {
      console.log(`ℹ️ News might already exist for ${player.name}`)
    }
  }
  
  console.log(`✅ Created news for ${players.length} players`)
}

async function main() {
  console.log('🚀 Starting AstralField Database Population...')
  
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Create sample data
    const users = await createSampleUsers()
    await createSamplePlayers()
    const league = await createSampleLeague(users)
    const teams = await createSampleTeams(users, league)
    await createSampleRosters(teams)
    await createSamplePlayerStats()
    await createSampleNews()
    
    console.log('🎉 Database population completed successfully!')
    console.log('')
    console.log('Sample login credentials:')
    console.log('Email: admin@astralfield.com')
    console.log('Email: player1@fantasy.com') 
    console.log('Email: player2@fantasy.com')
    console.log('Password: password123')
    
  } catch (error) {
    console.error('❌ Population failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()