/**
 * League Data API Route Tests
 * 
 * Tests for /api/leagues/[leagueId]/data endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/leagues/[leagueId]/data/route'
import { getOptimizedLeagueData, phoenixDb } from '@/lib/optimized-prisma'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/optimized-prisma')
jest.mock('@/lib/cache/catalyst-cache')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    playerProjection: {
      findMany: jest.fn()
    }
  }
}))

describe('API Route: /api/leagues/[leagueId]/data', () => {
  const mockLeagueData = {
    id: 'league-123',
    name: 'Test League',
    teams: [
      { id: 'team-1', name: 'Team 1', wins: 3, losses: 1 },
      { id: 'team-2', name: 'Team 2', wins: 2, losses: 2 }
    ],
    standings: [
      { teamId: 'team-1', rank: 1, points: 450 },
      { teamId: 'team-2', rank: 2, points: 420 }
    ]
  }

  const mockProjections = [
    {
      id: 'proj-1',
      week: 4,
      season: 2025,
      projectedPoints: 20.5,
      player: {
        id: 'player-1',
        name: 'Player 1',
        position: 'QB',
        nflTeam: 'KC'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(leagueCache.getLeagueStandings as jest.Mock).mockResolvedValue(null)
    ;(leagueCache.setLeagueStandings as jest.Mock).mockResolvedValue(undefined)
    ;(getOptimizedLeagueData as jest.Mock).mockResolvedValue(mockLeagueData)
    ;(phoenixDb.getCachedResult as jest.Mock).mockResolvedValue(null)
    ;(phoenixDb.setCachedResult as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.playerProjection.findMany as jest.Mock).mockResolvedValue(mockProjections)
  })

  describe('GET /api/leagues/[leagueId]/data', () => {
    describe('Basic Functionality', () => {
      it('should fetch league data', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toBeDefined()
      })

      it('should return league information', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.data.id).toBe('league-123')
        expect(data.data.name).toBe('Test League')
      })

      it('should include teams', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.data.teams).toBeDefined()
        expect(data.data.teams.length).toBe(2)
      })

      it('should include standings', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.data.standings).toBeDefined()
        expect(data.data.standings.length).toBe(2)
      })
    })

    describe('Caching', () => {
      it('should check cache first', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(leagueCache.getLeagueStandings).toHaveBeenCalledWith('league-123', 4)
      })

      it('should use cached data when available', async () => {
        ;(leagueCache.getLeagueStandings as jest.Mock).mockResolvedValue(mockLeagueData)

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(getOptimizedLeagueData).not.toHaveBeenCalled()
      })

      it('should fetch from database on cache miss', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(getOptimizedLeagueData).toHaveBeenCalledWith('league-123', 4)
      })

      it('should cache fetched data', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(leagueCache.setLeagueStandings).toHaveBeenCalledWith(
          'league-123',
          4,
          mockLeagueData
        )
      })

      it('should indicate cached response in metadata', async () => {
        ;(leagueCache.getLeagueStandings as jest.Mock).mockResolvedValue(mockLeagueData)

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.meta.cached).toBe(true)
      })
    })

    describe('Week Parameter', () => {
      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?week=5')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(getOptimizedLeagueData).toHaveBeenCalledWith('league-123', 5)
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(getOptimizedLeagueData).toHaveBeenCalledWith('league-123', 4)
      })

      it('should include week in metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?week=5')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.meta.week).toBe(5)
      })
    })

    describe('Projections', () => {
      it('should not include projections by default', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.data.currentProjections).toBeUndefined()
      })

      it('should include projections when requested', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?projections=true')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.data.currentProjections).toBeDefined()
      })

      it('should check projection cache', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?projections=true')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(phoenixDb.getCachedResult).toHaveBeenCalledWith('projections:league-123:week:4')
      })

      it('should use cached projections', async () => {
        ;(phoenixDb.getCachedResult as jest.Mock).mockResolvedValue(mockProjections)

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?projections=true')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(prisma.playerProjection.findMany).not.toHaveBeenCalled()
      })

      it('should fetch projections on cache miss', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?projections=true')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(prisma.playerProjection.findMany).toHaveBeenCalled()
      })

      it('should cache fetched projections', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data?projections=true')
        const params = { params: { leagueId: 'league-123' } }

        await GET(request, params)

        expect(phoenixDb.setCachedResult).toHaveBeenCalledWith(
          'projections:league-123:week:4',
          mockProjections,
          300000
        )
      })
    })

    describe('Response Format', () => {
      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.meta).toBeDefined()
        expect(data.meta.responseTime).toBeDefined()
        expect(data.meta.timestamp).toBeDefined()
      })

      it('should include response time', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.meta.responseTime).toMatch(/\d+\.\d+ms/)
      })

      it('should set cache control headers', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)

        expect(response.headers.get('Cache-Control')).toContain('public')
      })

      it('should set response time header', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)

        expect(response.headers.get('X-Response-Time')).toBeDefined()
      })

      it('should set content type header', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)

        expect(response.headers.get('Content-Type')).toBe('application/json')
      })
    })

    describe('Error Handling', () => {
      it('should return 404 when league not found', async () => {
        ;(getOptimizedLeagueData as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toContain('not found')
      })

      it('should handle database errors', async () => {
        ;(getOptimizedLeagueData as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch league data')
      })

      it('should include error details in development', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'
        
        ;(getOptimizedLeagueData as jest.Mock).mockRejectedValue(
          new Error('Test error')
        )

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.details).toBeDefined()
        
        process.env.NODE_ENV = originalEnv
      })

      it('should not include error details in production', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'
        
        ;(getOptimizedLeagueData as jest.Mock).mockRejectedValue(
          new Error('Test error')
        )

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.details).toBeUndefined()
        
        process.env.NODE_ENV = originalEnv
      })

      it('should handle cache errors gracefully', async () => {
        ;(leagueCache.getLeagueStandings as jest.Mock).mockRejectedValue(
          new Error('Cache error')
        )

        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)

        expect(response.status).toBe(500)
      })
    })

    describe('Performance', () => {
      it('should measure response time', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.meta.responseTime).toBeDefined()
        expect(parseFloat(data.meta.responseTime)).toBeGreaterThan(0)
      })

      it('should include timestamp', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/league-123/data')
        const params = { params: { leagueId: 'league-123' } }

        const response = await GET(request, params)
        const data = await response.json()

        expect(data.meta.timestamp).toBeDefined()
        expect(data.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      })
    })
  })
})
