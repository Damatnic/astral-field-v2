/**
 * League Join API Route Tests
 * 
 * Tests for /api/leagues/join endpoint
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/leagues/join/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: jest.fn()
    },
    team: {
      findFirst: jest.fn(),
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

describe('API Route: /api/leagues/join', () => {
  const mockSession = {
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
  }

  const mockLeague = {
    id: 'league-123',
    name: 'Test League',
    maxTeams: 12,
    isActive: true,
    teams: [
      { id: 'team-1' },
      { id: 'team-2' }
    ]
  }

  const mockPlayers = [
    { id: 'player-1', position: 'QB', isFantasyRelevant: true, adp: 1 },
    { id: 'player-2', position: 'RB', isFantasyRelevant: true, adp: 2 },
    { id: 'player-3', position: 'WR', isFantasyRelevant: true, adp: 3 }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.league.findUnique as jest.Mock).mockResolvedValue(mockLeague)
    ;(prisma.team.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.team.create as jest.Mock).mockResolvedValue({
      id: 'team-new',
      name: "Test User's Team",
      leagueId: 'league-123'
    })
    ;(prisma.player.findMany as jest.Mock).mockResolvedValue(mockPlayers)
    ;(prisma.rosterPlayer.create as jest.Mock).mockResolvedValue({})
  })

  describe('POST /api/leagues/join', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'league-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toContain('Authentication')
      })

      it('should require user ID', async () => {
        ;(auth as jest.Mock).mockResolvedValue({ user: {} })

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'league-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
      })
    })

    describe('Validation', () => {
      it('should require leagueId', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({})
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid data')
      })

      it('should validate leagueId format', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'invalid-id' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })
    })

    describe('League Validation', () => {
      it('should check if league exists', async () => {
        ;(prisma.league.findUnique as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toContain('not found')
      })

      it('should check if league is active', async () => {
        ;(prisma.league.findUnique as jest.Mock).mockResolvedValue({
          ...mockLeague,
          isActive: false
        })

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('not active')
      })

      it('should check if league is full', async () => {
        const fullTeams = Array(12).fill({ id: 'team' })
        ;(prisma.league.findUnique as jest.Mock).mockResolvedValue({
          ...mockLeague,
          teams: fullTeams
        })

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('full')
      })

      it('should check if user already in league', async () => {
        ;(prisma.team.findFirst as jest.Mock).mockResolvedValue({
          id: 'existing-team',
          ownerId: 'user-123'
        })

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('already a member')
      })
    })

    describe('Team Creation', () => {
      it('should create team for user', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        await POST(request)

        expect(prisma.team.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            ownerId: 'user-123',
            leagueId: 'clabcdef1234567890'
          })
        })
      })

      it('should use user name for team name', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        await POST(request)

        expect(prisma.team.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: expect.stringContaining('Test User')
          })
        })
      })

      it('should initialize team record', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        await POST(request)

        expect(prisma.team.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            wins: 0,
            losses: 0,
            ties: 0
          })
        })
      })
    })

    describe('Roster Creation', () => {
      it('should fetch available players', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        await POST(request)

        expect(prisma.player.findMany).toHaveBeenCalled()
      })

      it('should add players to roster', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        await POST(request)

        expect(prisma.rosterPlayer.create).toHaveBeenCalled()
      })

      it('should handle no available players', async () => {
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Response Format', () => {
      it('should return success response', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should include success message', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.message).toContain('Successfully')
      })

      it('should include team information', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.team).toBeDefined()
        expect(data.team.id).toBe('team-new')
        expect(data.team.leagueId).toBe('league-123')
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.league.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to join league')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })

      it('should provide validation error details', async () => {
        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'invalid' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid data')
        expect(data.details).toBeDefined()
      })
    })

    describe('Edge Cases', () => {
      it('should handle user without name', async () => {
        ;(auth as jest.Mock).mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' }
        })

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should handle user without email', async () => {
        ;(auth as jest.Mock).mockResolvedValue({
          user: { id: 'user-123', name: 'Test User' }
        })

        const request = new NextRequest('http://localhost:3000/api/leagues/join', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'clabcdef1234567890' })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })
  })
})
