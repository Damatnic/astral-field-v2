/**
 * Test Database Setup and Management
 * Handles test database initialization, seeding, and cleanup
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

export class TestDatabase {
  static prisma = prisma

  /**
   * Initialize test database with clean state
   */
  static async setup() {
    console.log('🧪 Setting up test database...')
    
    try {
      // Clean all tables in reverse dependency order
      await this.cleanup()
      
      // Seed with test data
      await this.seedTestData()
      
      console.log('✅ Test database setup complete')
    } catch (error) {
      console.error('❌ Test database setup failed:', error)
      throw error
    }
  }

  /**
   * Clean up test database - remove all test data
   */
  static async cleanup() {
    console.log('🧹 Cleaning test database...')
    
    const tablesToClean = [
      'PlayerNote',
      'PlayerActivity',
      'AuditLog',
      'PlayerStats',
      'Message',
      'Notification',
      'MatchupPlayer',
      'Matchup',
      'LineupPlayer',
      'Lineup',
      'RosterPlayer',
      'WaiverClaim',
      'TradePlayer',
      'Trade',
      'UserPreferences',
      'UserSession',
      'Session',
      'Account',
      'Team',
      'League',
      'Player',
      'User'
    ]

    for (const table of tablesToClean) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table.toLowerCase()}";`)
      } catch (error) {
        // Some tables might not exist or have dependencies, continue
        console.warn(`Warning cleaning ${table}:`, error)
      }
    }
  }

  /**
   * Seed test database with comprehensive test data
   */
  static async seedTestData() {
    console.log('🌱 Seeding test data...')

    // Create test users
    const testUsers = await this.createTestUsers()
    
    // Create test league
    const testLeague = await this.createTestLeague(testUsers[0].id)
    
    // Create test teams
    const testTeams = await this.createTestTeams(testLeague.id, testUsers)
    
    // Create test players
    const testPlayers = await this.createTestPlayers()
    
    // Create test rosters
    await this.createTestRosters(testTeams, testPlayers)
    
    // Create test matchups
    await this.createTestMatchups(testLeague.id, testTeams)

    console.log('✅ Test data seeding complete')

    return {
      users: testUsers,
      league: testLeague,
      teams: testTeams,
      players: testPlayers
    }
  }

  /**
   * Create test users for various scenarios
   */
  private static async createTestUsers() {
    const hashedPassword = await hash('testpass123', 10)

    const users = await Promise.all([
      // Commissioner user
      prisma.user.create({
        data: {
          email: 'commissioner@test.com',
          name: 'Test Commissioner',
          hashedPassword,
          role: 'COMMISSIONER',
          teamName: 'Test Dynasty'
        }
      }),
      // Regular users
      prisma.user.create({
        data: {
          email: 'player1@test.com',
          name: 'Test Player 1',
          hashedPassword,
          role: 'PLAYER',
          teamName: 'Champions United'
        }
      }),
      prisma.user.create({
        data: {
          email: 'player2@test.com',
          name: 'Test Player 2',
          hashedPassword,
          role: 'PLAYER',
          teamName: 'Fantasy Kings'
        }
      }),
      prisma.user.create({
        data: {
          email: 'player3@test.com',
          name: 'Test Player 3',
          hashedPassword,
          role: 'PLAYER',
          teamName: 'Grid Warriors'
        }
      })
    ])

    return users
  }

  /**
   * Create test league with standard settings
   */
  private static async createTestLeague(commissionerId: string) {
    return await prisma.league.create({
      data: {
        name: 'Test League',
        description: 'Test league for automated testing',
        commissionerId,
        seasonYear: new Date().getFullYear(),
        maxTeams: 10,
        draftType: 'SNAKE',
        scoringType: 'PPR',
        playoffTeams: 4,
        playoffWeeks: 3,
        regularSeasonWeeks: 14,
        rosterPositions: {
          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          FLEX: 1,
          K: 1,
          DEF: 1,
          BENCH: 6
        },
        scoringRules: {
          passingYards: 0.04,
          passingTDs: 4,
          rushingYards: 0.1,
          rushingTDs: 6,
          receivingYards: 0.1,
          receivingTDs: 6,
          receptions: 1, // PPR
          fieldGoals: 3,
          extraPoints: 1
        },
        waiverType: 'ROLLING',
        tradeDeadline: new Date(new Date().getFullYear(), 10, 15), // Nov 15
        isActive: true
      }
    })
  }

  /**
   * Create test teams for the league
   */
  private static async createTestTeams(leagueId: string, users: any[]) {
    const teams = []
    
    for (let i = 0; i < users.length; i++) {
      const team = await prisma.team.create({
        data: {
          name: users[i].teamName || `Test Team ${i + 1}`,
          ownerId: users[i].id,
          leagueId,
          draftPosition: i + 1,
          wins: Math.floor(Math.random() * 8),
          losses: Math.floor(Math.random() * 8),
          ties: 0,
          pointsFor: 1200 + Math.floor(Math.random() * 400),
          pointsAgainst: 1100 + Math.floor(Math.random() * 400)
        }
      })
      teams.push(team)
    }

    return teams
  }

  /**
   * Create test players for all positions
   */
  private static async createTestPlayers() {
    const testPlayersData = [
      // Quarterbacks
      { name: 'Test QB1', position: 'QB', team: 'KC', byeWeek: 10, isActive: true },
      { name: 'Test QB2', position: 'QB', team: 'BUF', byeWeek: 12, isActive: true },
      { name: 'Test QB3', position: 'QB', team: 'MIA', byeWeek: 6, isActive: true },
      
      // Running Backs
      { name: 'Test RB1', position: 'RB', team: 'SF', byeWeek: 9, isActive: true },
      { name: 'Test RB2', position: 'RB', team: 'DAL', byeWeek: 7, isActive: true },
      { name: 'Test RB3', position: 'RB', team: 'NYG', byeWeek: 11, isActive: true },
      { name: 'Test RB4', position: 'RB', team: 'PHI', byeWeek: 10, isActive: true },
      
      // Wide Receivers  
      { name: 'Test WR1', position: 'WR', team: 'MIN', byeWeek: 6, isActive: true },
      { name: 'Test WR2', position: 'WR', team: 'CIN', byeWeek: 12, isActive: true },
      { name: 'Test WR3', position: 'WR', team: 'HOU', byeWeek: 14, isActive: true },
      { name: 'Test WR4', position: 'WR', team: 'ATL', byeWeek: 12, isActive: true },
      
      // Tight Ends
      { name: 'Test TE1', position: 'TE', team: 'KC', byeWeek: 10, isActive: true },
      { name: 'Test TE2', position: 'TE', team: 'LV', byeWeek: 6, isActive: true },
      
      // Kickers
      { name: 'Test K1', position: 'K', team: 'BAL', byeWeek: 14, isActive: true },
      
      // Defenses
      { name: 'Test DEF1', position: 'DEF', team: 'SF', byeWeek: 9, isActive: true }
    ]

    const players = []
    for (const playerData of testPlayersData) {
      const player = await prisma.player.create({
        data: {
          ...playerData,
          espnId: Math.floor(Math.random() * 100000),
          sleeperPlayerId: `test_${Math.floor(Math.random() * 100000)}`,
          height: '6-0',
          weight: 200,
          experience: Math.floor(Math.random() * 10),
          college: 'Test University',
          photoUrl: `https://example.com/player${Math.floor(Math.random() * 1000)}.jpg`,
          projectedPoints: Math.floor(Math.random() * 300) + 100
        }
      })
      players.push(player)
    }

    return players
  }

  /**
   * Create test rosters with realistic player assignments
   */
  private static async createTestRosters(teams: any[], players: any[]) {
    // Assign players to teams for testing
    for (let i = 0; i < teams.length && i < 4; i++) {
      const team = teams[i]
      
      // Assign some players to each team
      const startIndex = i * 3
      const endIndex = Math.min(startIndex + 4, players.length)
      
      for (let j = startIndex; j < endIndex; j++) {
        if (players[j]) {
          await prisma.rosterPlayer.create({
            data: {
              teamId: team.id,
              playerId: players[j].id,
              position: this.determineRosterPosition(players[j].position),
              acquisitionDate: new Date(),
              acquisitionType: 'DRAFT'
            }
          })
        }
      }
    }
  }

  /**
   * Create test matchups for the current week
   */
  private static async createTestMatchups(leagueId: string, teams: any[]) {
    const currentWeek = this.getCurrentWeek()
    
    // Create matchups between teams
    for (let i = 0; i < teams.length - 1; i += 2) {
      if (teams[i + 1]) {
        await prisma.matchup.create({
          data: {
            leagueId,
            week: currentWeek,
            homeTeamId: teams[i].id,
            awayTeamId: teams[i + 1].id,
            homeScore: Math.floor(Math.random() * 50) + 80,
            awayScore: Math.floor(Math.random() * 50) + 80,
            isPlayoff: false
          }
        })
      }
    }
  }

  /**
   * Helper methods
   */
  private static determineRosterPosition(position: string) {
    const positionMap = {
      'QB': 'QB',
      'RB': 'RB', 
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      'DEF': 'DEF'
    }
    
    return positionMap[position] || 'BENCH'
  }

  private static getCurrentWeek(): number {
    // For testing, return week 1-17 based on current date
    const now = new Date()
    const seasonStart = new Date(now.getFullYear(), 8, 1) // Sept 1
    const weeksPassed = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(17, weeksPassed + 1))
  }

  /**
   * Get test data by type
   */
  static async getTestUser(email: string = 'commissioner@test.com') {
    return await prisma.user.findUnique({
      where: { email }
    })
  }

  static async getTestLeague() {
    return await prisma.league.findFirst({
      where: { name: 'Test League' }
    })
  }

  static async getTestTeams() {
    const league = await this.getTestLeague()
    if (!league) return []
    
    return await prisma.team.findMany({
      where: { leagueId: league.id }
    })
  }

  /**
   * Teardown - close database connection
   */
  static async teardown() {
    await prisma.$disconnect()
  }
}