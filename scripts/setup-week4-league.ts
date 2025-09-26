#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

const LEAGUE_NAME = "D'Amato Dynasty League"
const CURRENT_WEEK = 4
const CURRENT_SEASON = "2024"

// All 10 D'Amato Dynasty League players
const DAMATO_PLAYERS = [
  {
    email: "nicholas@damato-dynasty.com",
    name: "Nicholas D'Amato",
    teamName: "D'Amato Dynasty",
    role: "COMMISSIONER"
  },
  {
    email: "nick@damato-dynasty.com", 
    name: "Nick Hartley",
    teamName: "Hartley's Heroes",
    role: "PLAYER"
  },
  {
    email: "jack@damato-dynasty.com",
    name: "Jack McCaigue", 
    teamName: "McCaigue Mayhem",
    role: "PLAYER"
  },
  {
    email: "larry@damato-dynasty.com",
    name: "Larry McCaigue",
    teamName: "Larry Legends", 
    role: "PLAYER"
  },
  {
    email: "renee@damato-dynasty.com",
    name: "Renee McCaigue",
    teamName: "Renee's Reign",
    role: "PLAYER"
  },
  {
    email: "jon@damato-dynasty.com",
    name: "Jon Kornbeck",
    teamName: "Kornbeck Crushers", 
    role: "PLAYER"
  },
  {
    email: "david@damato-dynasty.com",
    name: "David Jarvey",
    teamName: "Jarvey's Juggernauts",
    role: "PLAYER"
  },
  {
    email: "kaity@damato-dynasty.com", 
    name: "Kaity Lorbecki",
    teamName: "Lorbecki Lions",
    role: "PLAYER"
  },
  {
    email: "cason@damato-dynasty.com",
    name: "Cason Minor", 
    teamName: "Minor Miracles",
    role: "PLAYER"
  },
  {
    email: "brittany@damato-dynasty.com",
    name: "Brittany Bergum",
    teamName: "Bergum Blitz",
    role: "PLAYER"
  }
]

async function setupWeek4League() {
  console.log('🏈 Setting up D\'Amato Dynasty League for Week 4...')
  
  try {
    // Hash password for all users
    const hashedPassword = await bcryptjs.hash('Dynasty2025!', 12)
    
    console.log('📊 Setting up users and league data...')
    
    // Upsert all users
    for (const player of DAMATO_PLAYERS) {
      await prisma.user.upsert({
        where: { email: player.email },
        update: {
          name: player.name,
          role: player.role,
          teamName: player.teamName,
          leagueName: LEAGUE_NAME,
          currentWeek: CURRENT_WEEK,
          season: CURRENT_SEASON,
          isActive: true,
          lastLoginAt: new Date(),
          settings: {
            notifications: true,
            emailAlerts: true,
            theme: 'dark',
            language: 'en'
          },
          profile: {
            favoriteTeam: null,
            bio: `${player.teamName} manager in the ${LEAGUE_NAME}`,
            joinedAt: new Date('2024-09-01'), // Season start
            wins: Math.floor(Math.random() * 4), // Random wins 0-3 for week 4
            losses: Math.floor(Math.random() * 4),
            ties: 0,
            totalPoints: Math.floor(Math.random() * 400) + 300, // 300-700 points
            weeklyRank: Math.floor(Math.random() * 10) + 1,
            overallRank: Math.floor(Math.random() * 10) + 1
          }
        },
        create: {
          email: player.email,
          name: player.name,
          hashedPassword,
          role: player.role,
          teamName: player.teamName,
          leagueName: LEAGUE_NAME,
          currentWeek: CURRENT_WEEK,
          season: CURRENT_SEASON,
          isActive: true,
          emailVerified: new Date(),
          createdAt: new Date('2024-09-01'),
          lastLoginAt: new Date(),
          settings: {
            notifications: true,
            emailAlerts: true,
            theme: 'dark',
            language: 'en'
          },
          profile: {
            favoriteTeam: null,
            bio: `${player.teamName} manager in the ${LEAGUE_NAME}`,
            joinedAt: new Date('2024-09-01'),
            wins: Math.floor(Math.random() * 4),
            losses: Math.floor(Math.random() * 4), 
            ties: 0,
            totalPoints: Math.floor(Math.random() * 400) + 300,
            weeklyRank: Math.floor(Math.random() * 10) + 1,
            overallRank: Math.floor(Math.random() * 10) + 1
          }
        }
      })
      
      console.log(`✅ Set up ${player.name} (${player.teamName})`)
    }
    
    // Create league settings if they don't exist
    await prisma.leagueSetting.upsert({
      where: { leagueName: LEAGUE_NAME },
      update: {
        currentWeek: CURRENT_WEEK,
        season: CURRENT_SEASON,
        totalTeams: 10,
        playoffTeams: 4,
        regularSeasonWeeks: 14,
        playoffWeeks: 3,
        scoringType: 'PPR',
        waiverType: 'FAAB',
        tradingEnabled: true,
        draftCompleted: true,
        seasonStarted: true,
        settings: {
          positionLimits: {
            QB: 1,
            RB: 2,
            WR: 2,
            TE: 1,
            FLEX: 1,
            DST: 1,
            K: 1,
            BENCH: 6
          },
          scoring: {
            passingYards: 0.04,
            passingTouchdowns: 4,
            interceptions: -2,
            rushingYards: 0.1,
            rushingTouchdowns: 6,
            receptions: 1,
            receivingYards: 0.1,
            receivingTouchdowns: 6,
            fumbles: -2
          },
          waiverBudget: 100,
          tradeDeadline: '2024-11-19',
          playoffStart: '2024-12-14'
        }
      },
      create: {
        leagueName: LEAGUE_NAME,
        currentWeek: CURRENT_WEEK,
        season: CURRENT_SEASON,
        totalTeams: 10,
        playoffTeams: 4,
        regularSeasonWeeks: 14,
        playoffWeeks: 3,
        scoringType: 'PPR',
        waiverType: 'FAAB',
        tradingEnabled: true,
        draftCompleted: true,
        seasonStarted: true,
        settings: {
          positionLimits: {
            QB: 1,
            RB: 2,
            WR: 2,
            TE: 1,
            FLEX: 1,
            DST: 1,
            K: 1,
            BENCH: 6
          },
          scoring: {
            passingYards: 0.04,
            passingTouchdowns: 4,
            interceptions: -2,
            rushingYards: 0.1,
            rushingTouchdowns: 6,
            receptions: 1,
            receivingYards: 0.1,
            receivingTouchdowns: 6,
            fumbles: -2
          },
          waiverBudget: 100,
          tradeDeadline: '2024-11-19',
          playoffStart: '2024-12-14'
        }
      }
    })
    
    // Create week 4 matchups
    const users = await prisma.user.findMany({
      where: { leagueName: LEAGUE_NAME }
    })
    
    // Create 5 matchups for 10 players
    const matchups = [
      [users[0], users[1]], // Nicholas vs Nick
      [users[2], users[3]], // Jack vs Larry  
      [users[4], users[5]], // Renee vs Jon
      [users[6], users[7]], // David vs Kaity
      [users[8], users[9]]  // Cason vs Brittany
    ]
    
    for (let i = 0; i < matchups.length; i++) {
      const [team1, team2] = matchups[i]
      const team1Score = Math.floor(Math.random() * 50) + 80 // 80-130 points
      const team2Score = Math.floor(Math.random() * 50) + 80
      
      await prisma.weeklyMatchup.upsert({
        where: {
          week_season_team1Id_team2Id: {
            week: CURRENT_WEEK,
            season: CURRENT_SEASON,
            team1Id: team1.id,
            team2Id: team2.id
          }
        },
        update: {
          team1Score,
          team2Score,
          isComplete: false, // Week 4 is current week, games in progress
          gameStatus: 'IN_PROGRESS'
        },
        create: {
          week: CURRENT_WEEK,
          season: CURRENT_SEASON,
          leagueName: LEAGUE_NAME,
          team1Id: team1.id,
          team1Name: team1.teamName || team1.name || 'Team 1',
          team1Score,
          team2Id: team2.id,
          team2Name: team2.teamName || team2.name || 'Team 2', 
          team2Score,
          isComplete: false,
          gameStatus: 'IN_PROGRESS',
          startTime: new Date(),
          metadata: {
            matchupType: 'REGULAR_SEASON',
            importance: 'NORMAL'
          }
        }
      })
      
      console.log(`🏆 Created Week ${CURRENT_WEEK} matchup: ${team1.teamName} vs ${team2.teamName}`)
    }
    
    console.log('\n🎉 Week 4 setup complete!')
    console.log(`📊 League: ${LEAGUE_NAME}`)
    console.log(`📅 Current Week: ${CURRENT_WEEK}`)
    console.log(`🏈 Season: ${CURRENT_SEASON}`)
    console.log(`👥 Players: ${DAMATO_PLAYERS.length}`)
    console.log(`🔐 Password: Dynasty2025!`)
    
    // Summary stats
    const totalUsers = await prisma.user.count({ where: { leagueName: LEAGUE_NAME } })
    const totalMatchups = await prisma.weeklyMatchup.count({ 
      where: { 
        leagueName: LEAGUE_NAME,
        week: CURRENT_WEEK 
      } 
    })
    
    console.log(`\n📈 Database Summary:`)
    console.log(`   Users: ${totalUsers}`)
    console.log(`   Week ${CURRENT_WEEK} Matchups: ${totalMatchups}`)
    
  } catch (error) {
    console.error('❌ Error setting up Week 4 league:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
if (require.main === module) {
  setupWeek4League()
    .then(() => {
      console.log('✅ Setup completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error)
      process.exit(1)
    })
}

export { setupWeek4League }