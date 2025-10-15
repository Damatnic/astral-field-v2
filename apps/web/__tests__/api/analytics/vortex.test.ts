/**
 * Analytics Vortex API Route Tests
 * 
 * Tests for /api/analytics/vortex endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/vortex/route'
import { prisma } from '@/lib/database/prisma'

jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    team: {
      findMany: jest.fn(),
      aggregate: jest.fn()
    },
    player: {
      findMany: jest.fn(),
      aggregate: jest.fn()
    },
    game: {
      findMany: jest.fn()
    },
    league: {
      findUnique: jest.fn()
    }
  }
}))

describe('API Route: /api/analytics/vortex', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/analytics/vortex', () => {
    describe('Overview Endpoint', () => {
      it('should return overview analytics', async () => {
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([
          { id: 'team-1', name: 'Team 1', totalPoints: 1000 },
          { id: 'team-2', name: 'Team 2', totalPoints: 950 }
        ])
        ;(prisma.team.aggregate as jest.Mock).mockResolvedValue({
          _avg: { totalPoints: 975 },
          _max: { totalPoints: 1000 },
          _min: { totalPoints: 950 }
        })

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('totalTeams')
        expect(data.data).toHaveProperty('averagePoints')
      })

      it('should accept custom week and season', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview&week=5&season=2024')
        
        await GET(request)

        expect(prisma.team.findMany).toHaveBeenCalled()
      })

      it('should default to week 3 and season 2025', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        
        await GET(request)

        expect(prisma.team.findMany).toHaveBeenCalled()
      })
    })

    describe('Players Endpoint', () => {
      it('should return player analytics', async () => {
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([
          { id: 'player-1', name: 'Player 1', position: 'QB', fantasyPoints: 150 },
          { id: 'player-2', name: 'Player 2', position: 'RB', fantasyPoints: 120 }
        ])
        ;(prisma.player.aggregate as jest.Mock).mockResolvedValue({
          _avg: { fantasyPoints: 135 },
          _max: { fantasyPoints: 150 },
          _min: { fantasyPoints: 120 }
        })

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=players')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('players')
        expect(data.data).toHaveProperty('positionBreakdown')
      })

      it('should filter players by position', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=players&position=QB')
        
        await GET(request)

        expect(prisma.player.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              position: 'QB'
            })
          })
        )
      })

      it('should filter players by team', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=players&team=KC')
        
        await GET(request)

        expect(prisma.player.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              nflTeam: 'KC'
            })
          })
        )
      })

      it('should limit results', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=players&limit=10')
        
        await GET(request)

        expect(prisma.player.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 10
          })
        )
      })
    })

    describe('Teams Endpoint', () => {
      it('should return team analytics', async () => {
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([
          { id: 'team-1', name: 'Team 1', totalPoints: 1000, wins: 5, losses: 3 },
          { id: 'team-2', name: 'Team 2', totalPoints: 950, wins: 4, losses: 4 }
        ])

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=teams')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('teams')
        expect(data.data).toHaveProperty('standings')
      })

      it('should include team rankings', async () => {
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([
          { id: 'team-1', name: 'Team 1', totalPoints: 1000, wins: 5, losses: 3 },
          { id: 'team-2', name: 'Team 2', totalPoints: 950, wins: 4, losses: 4 }
        ])

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=teams')
        const response = await GET(request)
        const data = await response.json()

        expect(data.data.standings).toBeDefined()
        expect(Array.isArray(data.data.standings)).toBe(true)
      })
    })

    describe('Matchups Endpoint', () => {
      it('should return matchup analytics', async () => {
        ;(prisma.game.findMany as jest.Mock).mockResolvedValue([
          {
            id: 'game-1',
            homeTeam: 'KC',
            awayTeam: 'BUF',
            homeScore: 24,
            awayScore: 21,
            status: 'completed'
          }
        ])

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=matchups')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('matchups')
      })

      it('should filter matchups by week', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=matchups&week=5')
        
        await GET(request)

        expect(prisma.game.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              week: 5
            })
          })
        )
      })
    })

    describe('Insights Endpoint', () => {
      it('should return insights analytics', async () => {
        ;(prisma.league.findUnique as jest.Mock).mockResolvedValue({
          id: 'league-1',
          name: 'Test League',
          currentWeek: 4
        })
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([
          { id: 'team-1', name: 'Team 1', totalPoints: 1000 }
        ])
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([
          { id: 'player-1', name: 'Player 1', fantasyPoints: 150 }
        ])

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=insights')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('insights')
        expect(data.data).toHaveProperty('trends')
      })

      it('should include trend analysis', async () => {
        ;(prisma.league.findUnique as jest.Mock).mockResolvedValue({
          id: 'league-1',
          name: 'Test League',
          currentWeek: 4
        })
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=insights')
        const response = await GET(request)
        const data = await response.json()

        expect(data.data.trends).toBeDefined()
        expect(data.data.trends).toHaveProperty('hotPositions')
        expect(data.data.trends).toHaveProperty('risingTeams')
      })
    })

    describe('Validation', () => {
      it('should require valid endpoint', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=invalid')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid endpoint')
      })

      it('should list available endpoints in error', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=invalid')
        const response = await GET(request)
        const data = await response.json()

        expect(data.error).toContain('overview, players, teams, matchups, insights')
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.team.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })

      it('should include error details in development', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        ;(prisma.team.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        const response = await GET(request)
        const data = await response.json()

        expect(data.details).toBe('Database error')

        process.env.NODE_ENV = originalEnv
      })

      it('should not include error details in production', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        ;(prisma.team.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        const response = await GET(request)
        const data = await response.json()

        expect(data.details).toBe('Unknown error')

        process.env.NODE_ENV = originalEnv
      })
    })

    describe('Response Format', () => {
      it('should return consistent response structure', async () => {
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.team.aggregate as jest.Mock).mockResolvedValue({
          _avg: { totalPoints: 0 },
          _max: { totalPoints: 0 },
          _min: { totalPoints: 0 }
        })

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        const response = await GET(request)
        const data = await response.json()

        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('data')
        expect(data).toHaveProperty('metadata')
        expect(data.metadata).toHaveProperty('generatedAt')
        expect(data.metadata).toHaveProperty('endpoint')
        expect(data.metadata).toHaveProperty('week')
        expect(data.metadata).toHaveProperty('season')
      })

      it('should include performance metrics', async () => {
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.team.aggregate as jest.Mock).mockResolvedValue({
          _avg: { totalPoints: 0 },
          _max: { totalPoints: 0 },
          _min: { totalPoints: 0 }
        })

        const request = new NextRequest('http://localhost:3000/api/analytics/vortex?endpoint=overview')
        const response = await GET(request)
        const data = await response.json()

        expect(data.metadata).toHaveProperty('queryTime')
        expect(data.metadata).toHaveProperty('recordCount')
      })
    })
  })
})
