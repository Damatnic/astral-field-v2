/**
 * League Create API Route Tests
 * 
 * Tests for /api/leagues/create endpoint
 * Demonstrates complex API testing with database operations
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/leagues/create/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    league: {
      create: jest.fn()
    },
    team: {
      create: jest.fn()
    },
    player: {
      findMany: jest.fn()
    },
    rosterPlayer: {
      create: jest.fn()
    }
  }
}))

describe('API Route: /api/leagues/create', () => {
  const validLeagueData = {
    name: 'Test League',
    description: 'A test fantasy football league',
    maxTeams: 10,
    isPublic: true,
    scoringType: 'ppr' as const
  }

  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('POST /api/leagues/create', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })

      it('should require user ID in session', async () => {
        ;(auth as jest.Mock).mockResolvedValue({ user: {} })

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })

      it('should accept valid session', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          description: 'A test league',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123',
          name: "Test User's Team"
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Validation', () => {
      it('should validate required name field', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            maxTeams: 10
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid data')
      })

      it('should validate name length', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: 'a'.repeat(101),
            maxTeams: 10
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toBeDefined()
      })

      it('should validate maxTeams minimum', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test League',
            maxTeams: 2
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should validate maxTeams maximum', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test League',
            maxTeams: 25
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should validate description length', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test League',
            description: 'a'.repeat(501),
            maxTeams: 10
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should validate scoringType enum', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test League',
            maxTeams: 10,
            scoringType: 'invalid'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should accept valid data', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('League Creation', () => {
      it('should create league with correct data', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        await POST(request)

        expect(prisma.league.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Test League',
            description: 'A test fantasy football league',
            maxTeams: 10,
            isActive: true,
            playoffs: false,
            currentWeek: 1
          })
        })
      })

      it('should handle optional description', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test League',
            maxTeams: 10
          })
        })

        await POST(request)

        expect(prisma.league.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            description: null
          })
        })
      })

      it('should return created league data', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          description: 'A test league',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.league).toEqual({
          id: 'league-123',
          name: 'Test League',
          description: 'A test league',
          maxTeams: 10
        })
      })
    })

    describe('Owner Team Creation', () => {
      it('should create owner team automatically', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        await POST(request)

        expect(prisma.team.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: "Test User's Team",
            ownerId: 'user-123',
            leagueId: 'league-123',
            wins: 0,
            losses: 0,
            ties: 0
          })
        })
      })

      it('should use email for team name if no user name', async () => {
        ;(auth as jest.Mock).mockResolvedValue({
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        })
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        await POST(request)

        expect(prisma.team.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: "test's Team"
          })
        })
      })
    })

    describe('Roster Creation', () => {
      it('should fetch sample players', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        await POST(request)

        expect(prisma.player.findMany).toHaveBeenCalledWith({
          where: { isFantasyRelevant: true },
          orderBy: { adp: 'asc' },
          take: 15
        })
      })

      it('should handle no available players', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(prisma.rosterPlayer.create).not.toHaveBeenCalled()
      })

      it('should create roster with available players', async () => {
        const mockPlayers = [
          { id: 'p1', position: 'QB', adp: 1 },
          { id: 'p2', position: 'RB', adp: 2 },
          { id: 'p3', position: 'RB', adp: 3 },
          { id: 'p4', position: 'WR', adp: 4 },
          { id: 'p5', position: 'WR', adp: 5 },
          { id: 'p6', position: 'TE', adp: 6 },
          { id: 'p7', position: 'WR', adp: 7 },
          { id: 'p8', position: 'K', adp: 8 },
          { id: 'p9', position: 'DEF', adp: 9 }
        ]

        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue(mockPlayers)
        ;(prisma.rosterPlayer.create as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        await POST(request)

        expect(prisma.rosterPlayer.create).toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.league.create as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        )

        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to create league')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })

      it('should provide detailed validation errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify({
            name: '',
            maxTeams: 2
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toBeInstanceOf(Array)
        expect(data.details.length).toBeGreaterThan(0)
      })
    })

    describe('Performance', () => {
      it('should respond quickly', async () => {
        ;(prisma.league.create as jest.Mock).mockResolvedValue({
          id: 'league-123',
          name: 'Test League',
          maxTeams: 10
        })
        ;(prisma.team.create as jest.Mock).mockResolvedValue({
          id: 'team-123'
        })
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const start = Date.now()
        const request = new NextRequest('http://localhost:3000/api/leagues/create', {
          method: 'POST',
          body: JSON.stringify(validLeagueData)
        })

        await POST(request)
        const duration = Date.now() - start

        expect(duration).toBeLessThan(2000)
      })
    })
  })
})
