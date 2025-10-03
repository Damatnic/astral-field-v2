/**
 * Batch Player Stats API Route Tests
 * 
 * Tests for /api/players/stats/batch endpoint
 * Demonstrates complex API testing with caching and validation
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/players/stats/batch/route'
import { phoenixDb } from '@/lib/optimized-prisma'
import { leagueCache } from '@/lib/cache/catalyst-cache'

// Mock dependencies
jest.mock('@/lib/optimized-prisma')
jest.mock('@/lib/cache/catalyst-cache')

describe('API Route: /api/players/stats/batch', () => {
  const mockPlayerStats = [
    {
      playerId: 'player-1',
      week: 1,
      fantasyPoints: 25.4,
      stats: JSON.stringify({ passingYards: 300, touchdowns: 3 }),
      player: {
        id: 'player-1',
        name: 'Patrick Mahomes',
        position: 'QB',
        nflTeam: 'KC'
      }
    },
    {
      playerId: 'player-1',
      week: 2,
      fantasyPoints: 22.1,
      stats: JSON.stringify({ passingYards: 275, touchdowns: 2 }),
      player: {
        id: 'player-1',
        name: 'Patrick Mahomes',
        position: 'QB',
        nflTeam: 'KC'
      }
    },
    {
      playerId: 'player-2',
      week: 1,
      fantasyPoints: 18.7,
      stats: JSON.stringify({ rushingYards: 120, touchdowns: 1 }),
      player: {
        id: 'player-2',
        name: 'Christian McCaffrey',
        position: 'RB',
        nflTeam: 'SF'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(leagueCache.getPlayerStats as jest.Mock).mockResolvedValue(null)
    ;(leagueCache.setPlayerStats as jest.Mock).mockResolvedValue(undefined)
    ;(phoenixDb.getPlayerStatsHistory as jest.Mock).mockResolvedValue(mockPlayerStats)
    ;(phoenixDb.getCachedResult as jest.Mock).mockResolvedValue(null)
    ;(phoenixDb.setCachedResult as jest.Mock).mockResolvedValue(undefined)
  })

  describe('POST /api/players/stats/batch', () => {
    describe('Validation', () => {
      it('should validate required playerIds', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should validate playerIds is an array', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: 'not-an-array',
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should validate playerIds is not empty', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: [],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should validate playerIds max length (50)', async () => {
        const tooManyPlayers = Array.from({ length: 51 }, (_, i) => `player-${i}`)
        
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: tooManyPlayers,
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should validate required weeks', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should validate weeks is an array', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: 'not-an-array'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should validate weeks max length (17)', async () => {
        const tooManyWeeks = Array.from({ length: 18 }, (_, i) => i + 1)
        
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: tooManyWeeks
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request parameters')
      })

      it('should accept valid request', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1', 'player-2'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should use default season if not provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Season defaults to 2025
      })

      it('should accept optional includeProjections', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1],
            includeProjections: true
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Data Fetching', () => {
      it('should fetch player stats from database', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1', 'player-2'],
            weeks: [1, 2]
          })
        })

        await POST(request)

        expect(phoenixDb.getPlayerStatsHistory).toHaveBeenCalledWith(
          ['player-1', 'player-2'],
          [1, 2]
        )
      })

      it('should return organized player stats', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1', 'player-2'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.playerStats).toHaveProperty('player-1')
        expect(data.data.playerStats).toHaveProperty('player-2')
      })

      it('should calculate total points correctly', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        const player1Stats = data.data.playerStats['player-1']
        expect(player1Stats.totalPoints).toBe(47.5) // 25.4 + 22.1
      })

      it('should calculate average points correctly', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        const player1Stats = data.data.playerStats['player-1']
        expect(player1Stats.avgPoints).toBeCloseTo(23.75, 1) // (25.4 + 22.1) / 2
      })

      it('should track games played', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        const player1Stats = data.data.playerStats['player-1']
        expect(player1Stats.gamesPlayed).toBe(2)
      })

      it('should include weekly stats breakdown', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        const player1Stats = data.data.playerStats['player-1']
        expect(player1Stats.weeklyStats).toHaveProperty('1')
        expect(player1Stats.weeklyStats).toHaveProperty('2')
        expect(player1Stats.weeklyStats['1'].fantasyPoints).toBe(25.4)
      })

      it('should parse stats JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        const player1Stats = data.data.playerStats['player-1']
        expect(player1Stats.weeklyStats['1'].stats).toHaveProperty('passingYards')
        expect(player1Stats.weeklyStats['1'].stats.passingYards).toBe(300)
      })
    })

    describe('Caching', () => {
      it('should check cache first', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        await POST(request)

        expect(leagueCache.getPlayerStats).toHaveBeenCalledWith(['player-1'], [1])
      })

      it('should use cached data if available', async () => {
        ;(leagueCache.getPlayerStats as jest.Mock).mockResolvedValue(mockPlayerStats)

        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(phoenixDb.getPlayerStatsHistory).not.toHaveBeenCalled()
        expect(data.meta.cached).toBe(true)
      })

      it('should fetch from database on cache miss', async () => {
        ;(leagueCache.getPlayerStats as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        await POST(request)

        expect(phoenixDb.getPlayerStatsHistory).toHaveBeenCalled()
      })

      it('should cache fetched data', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        await POST(request)

        expect(leagueCache.setPlayerStats).toHaveBeenCalledWith(
          ['player-1'],
          [1],
          mockPlayerStats
        )
      })

      it('should not cache empty results', async () => {
        ;(phoenixDb.getPlayerStatsHistory as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        await POST(request)

        expect(leagueCache.setPlayerStats).not.toHaveBeenCalled()
      })
    })

    describe('Response Format', () => {
      it('should include data object', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data).toHaveProperty('data')
        expect(data.data).toHaveProperty('playerStats')
        expect(data.data).toHaveProperty('projections')
        expect(data.data).toHaveProperty('summary')
      })

      it('should include meta object', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data).toHaveProperty('meta')
        expect(data.meta).toHaveProperty('responseTime')
        expect(data.meta).toHaveProperty('cached')
        expect(data.meta).toHaveProperty('timestamp')
      })

      it('should include summary statistics', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1', 'player-2'],
            weeks: [1, 2]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.summary.playersRequested).toBe(2)
        expect(data.data.summary.playersFound).toBe(2)
        expect(data.data.summary.weeksRequested).toEqual([1, 2])
        expect(data.data.summary.totalDataPoints).toBe(3)
      })

      it('should include cache headers', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)

        expect(response.headers.get('Cache-Control')).toContain('public')
        expect(response.headers.get('Content-Type')).toBe('application/json')
        expect(response.headers.get('X-Response-Time')).toBeDefined()
      })

      it('should include response time in headers', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)

        const responseTime = response.headers.get('X-Response-Time')
        expect(responseTime).toMatch(/\d+\.\d+ms/)
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(phoenixDb.getPlayerStatsHistory as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        )

        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch player stats')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })

      it('should not expose error details in production', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        ;(phoenixDb.getPlayerStatsHistory as jest.Mock).mockRejectedValue(
          new Error('Database password: secret123')
        )

        const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
          method: 'POST',
          body: JSON.stringify({
            playerIds: ['player-1'],
            weeks: [1]
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.details).toBeUndefined()
        expect(data.error).not.toContain('password')

        process.env.NODE_ENV = originalEnv
      })
    })
  })

  describe('GET /api/players/stats/batch', () => {
    it('should accept playerIds query parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/players/stats/batch?playerIds=player-1,player-2&weeks=1,2'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should return 400 if playerIds missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/players/stats/batch?weeks=1,2'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('playerIds parameter is required')
    })

    it('should use default weeks if not provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/players/stats/batch?playerIds=player-1'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should parse projections parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/players/stats/batch?playerIds=player-1&projections=true'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Performance', () => {
    it('should respond quickly', async () => {
      const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
        method: 'POST',
        body: JSON.stringify({
          playerIds: ['player-1'],
          weeks: [1]
        })
      })

      const start = Date.now()
      await POST(request)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
    })

    it('should handle multiple players efficiently', async () => {
      const manyPlayers = Array.from({ length: 50 }, (_, i) => `player-${i}`)
      
      const request = new NextRequest('http://localhost:3000/api/players/stats/batch', {
        method: 'POST',
        body: JSON.stringify({
          playerIds: manyPlayers,
          weeks: [1]
        })
      })

      const start = Date.now()
      await POST(request)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
    })
  })
})
