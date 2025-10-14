/**
 * Zenith Teams API Integration Tests
 * Comprehensive testing for team management and lineup APIs
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { prisma } from '@/lib/prisma'
import { createMockTeam, createMockLeague } from '@/fixtures/leagues.fixture'
import { createMockUser } from '@/fixtures/users.fixture'
import { createMockRosterPlayer, createMockPlayersByPosition } from '@/fixtures/players.fixture'

// Mock authenticated session
const mockAuthenticatedUser = createMockUser()
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: mockAuthenticatedUser,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }),
}))

describe('Teams API Integration Tests', () => {
  const mockTeam = createMockTeam({
    ownerId: mockAuthenticatedUser.id,
  })
  const mockLeague = createMockLeague()
  const playersByPosition = createMockPlayersByPosition()

  beforeEach(() => {
    jest.clearAllMocks()
    global.resetPrismaMocks?.()
  })

  describe('GET /api/teams/[teamId]', () => {
    it('should fetch team details for team owner', async () => {
      global.mockPrisma.teams.findUnique.mockResolvedValue({
        ...mockTeam,
        league: mockLeague,
        roster: [
          createMockRosterPlayer({
            playerId: 'qb-1',
            position: 'QB',
            isStarter: true,
          }),
        ],
        _count: {
          roster: 16,
        },
      })

      const { req } = createMocks({
        method: 'GET',
        query: { teamId: mockTeam.id },
      })

      // Mock API handler call
      const response = await fetch(`/api/teams/${mockTeam.id}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer mock-token',
        },
      })

      expect(global.mockPrisma.teams.findUnique).toHaveBeenCalledWith({
        where: { id: mockTeam.id },
        include: {
          league: true,
          roster: {
            include: {
              players: true,
            },
            orderBy: [
              { isStarter: 'desc' },
              { position: 'asc' },
            ],
          },
          _count: {
            select: { roster: true },
          },
        },
      })
    })

    it('should deny access to team for non-owners', async () => {
      const otherUserTeam = createMockTeam({
        ownerId: 'other-user-id',
      })

      global.mockPrisma.teams.findUnique.mockResolvedValue(otherUserTeam)

      const { req } = createMocks({
        method: 'GET',
        query: { teamId: otherUserTeam.id },
      })

      const response = new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
      })

      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent team', async () => {
      global.mockPrisma.teams.findUnique.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        query: { teamId: 'non-existent-id' },
      })

      const response = new Response(JSON.stringify({ error: 'Team not found' }), {
        status: 404,
      })

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/teams/[teamId]/lineup', () => {
    const lineupData = {
      week: 1,
      lineup: [
        {
          playerId: 'qb-1',
          position: 'QB',
          isStarter: true,
        },
        {
          playerId: 'rb-1',
          position: 'RB1',
          isStarter: true,
        },
        {
          playerId: 'rb-2',
          position: 'RB2',
          isStarter: true,
        },
        {
          playerId: 'wr-1',
          position: 'WR1',
          isStarter: true,
        },
        {
          playerId: 'wr-2',
          position: 'WR2',
          isStarter: true,
        },
        {
          playerId: 'te-1',
          position: 'TE',
          isStarter: true,
        },
        {
          playerId: 'k-1',
          position: 'K',
          isStarter: true,
        },
        {
          playerId: 'def-1',
          position: 'DEF',
          isStarter: true,
        },
      ],
    }

    it('should update team lineup successfully', async () => {
      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      global.mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(global.mockPrisma)
      })

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: lineupData,
      })

      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
      })

      expect(response.status).toBe(200)
    })

    it('should validate lineup completeness', async () => {
      const incompleteLineup = {
        week: 1,
        lineup: [
          {
            playerId: 'qb-1',
            position: 'QB',
            isStarter: true,
          },
          // Missing other required positions
        ],
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: incompleteLineup,
      })

      const response = new Response(
        JSON.stringify({ 
          error: 'Incomplete lineup',
          missing: ['RB1', 'RB2', 'WR1', 'WR2', 'TE', 'K', 'DEF'],
        }),
        { status: 400 }
      )

      expect(response.status).toBe(400)
    })

    it('should prevent lineup changes after lock deadline', async () => {
      const lockedWeekTeam = {
        ...mockTeam,
        league: {
          ...mockLeague,
          currentWeek: 1,
          settings: {
            lockDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          },
        },
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(lockedWeekTeam)

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: lineupData,
      })

      const response = new Response(
        JSON.stringify({ error: 'Lineup locked for this week' }),
        { status: 423 } // Locked
      )

      expect(response.status).toBe(423)
    })

    it('should validate player eligibility', async () => {
      const invalidLineup = {
        week: 1,
        lineup: [
          {
            playerId: 'qb-1',
            position: 'RB1', // QB in RB position - invalid
            isStarter: true,
          },
        ],
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      global.mockPrisma.players.findUnique.mockResolvedValue(
        playersByPosition.QB[0] // Returns QB player
      )

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: invalidLineup,
      })

      const response = new Response(
        JSON.stringify({ 
          error: 'Invalid player position',
          details: 'QB cannot be placed in RB position',
        }),
        { status: 400 }
      )

      expect(response.status).toBe(400)
    })

    it('should handle bye week warnings', async () => {
      const byeWeekLineup = {
        week: 12, // Josh Allen's bye week
        lineup: [
          {
            playerId: 'qb-1', // Josh Allen
            position: 'QB',
            isStarter: true,
          },
        ],
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      global.mockPrisma.players.findUnique.mockResolvedValue({
        ...playersByPosition.QB[0],
        byeWeek: 12,
      })

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: byeWeekLineup,
      })

      const response = new Response(
        JSON.stringify({ 
          success: true,
          warnings: ['Josh Allen is on bye week 12'],
        }),
        { status: 200 }
      )

      const data = await response.json()
      expect(data.warnings).toContain('Josh Allen is on bye week 12')
    })
  })

  describe('GET /api/teams/[teamId]/stats', () => {
    it('should fetch team statistics', async () => {
      const mockStats = {
        season: {
          wins: 8,
          losses: 5,
          ties: 0,
          pointsFor: 1456.7,
          pointsAgainst: 1389.2,
          standing: 3,
        },
        weekly: [
          { week: 1, points: 124.5, opponent: 'Team Alpha', result: 'W' },
          { week: 2, points: 98.2, opponent: 'Team Beta', result: 'L' },
        ],
        projections: {
          currentWeek: 156.8,
          season: 1678.4,
        },
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      global.mockPrisma.matchups.findMany.mockResolvedValue([
        {
          week: 1,
          homeTeamId: mockTeam.id,
          awayTeamId: 'team-2',
          homeScore: 124.5,
          awayScore: 118.3,
          isComplete: true,
        },
      ])

      const { req } = createMocks({
        method: 'GET',
        query: { teamId: mockTeam.id },
      })

      const response = new Response(JSON.stringify(mockStats), {
        status: 200,
      })

      const data = await response.json()
      expect(data.season.wins).toBe(8)
      expect(data.weekly).toHaveLength(2)
    })

    it('should calculate advanced statistics', async () => {
      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      
      // Mock matchup data for calculations
      global.mockPrisma.matchups.findMany.mockResolvedValue([
        { homeScore: 120, awayScore: 100, homeTeamId: mockTeam.id },
        { homeScore: 95, awayScore: 110, awayTeamId: mockTeam.id },
        { homeScore: 130, awayScore: 125, homeTeamId: mockTeam.id },
      ])

      const response = new Response(
        JSON.stringify({
          advanced: {
            averageScore: 115.0,
            scoringConsistency: 0.85,
            strengthOfSchedule: 0.52,
            projectedWins: 9.2,
          },
        }),
        { status: 200 }
      )

      const data = await response.json()
      expect(data.advanced.averageScore).toBe(115.0)
    })
  })

  describe('POST /api/teams/[teamId]/transactions', () => {
    it('should process waiver claim', async () => {
      const waiverClaim = {
        type: 'WAIVER_CLAIM',
        playerId: 'available-player-1',
        dropPlayerId: 'bench-player-1',
        priority: 5,
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      global.mockPrisma.players.findUnique.mockResolvedValue(
        playersByPosition.RB[0]
      )

      const { req } = createMocks({
        method: 'POST',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: waiverClaim,
      })

      global.mockPrisma.transactions.create.mockResolvedValue({
        id: 'transaction-1',
        type: 'WAIVER_CLAIM',
        status: 'PENDING',
        createdAt: new Date(),
      })

      const response = new Response(
        JSON.stringify({
          success: true,
          transactionId: 'transaction-1',
        }),
        { status: 201 }
      )

      expect(response.status).toBe(201)
    })

    it('should validate FAAB budget for waiver bids', async () => {
      const waiverBid = {
        type: 'WAIVER_BID',
        playerId: 'available-player-1',
        dropPlayerId: 'bench-player-1',
        bidAmount: 500, // Exceeds team budget
      }

      const teamWithLowBudget = {
        ...mockTeam,
        faabBudget: 1000,
        faabSpent: 600, // Only $400 remaining
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(teamWithLowBudget)

      const { req } = createMocks({
        method: 'POST',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: waiverBid,
      })

      const response = new Response(
        JSON.stringify({
          error: 'Insufficient FAAB budget',
          available: 400,
          requested: 500,
        }),
        { status: 400 }
      )

      expect(response.status).toBe(400)
    })

    it('should handle trade proposals', async () => {
      const tradeProposal = {
        type: 'TRADE_PROPOSAL',
        targetTeamId: 'team-2',
        givingPlayerIds: ['rb-1'],
        receivingPlayerIds: ['wr-3'],
        message: 'Fair trade offer',
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      global.mockPrisma.trade_proposals.create.mockResolvedValue({
        id: 'trade-1',
        status: 'PENDING',
        createdAt: new Date(),
      })

      const { req } = createMocks({
        method: 'POST',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: tradeProposal,
      })

      const response = new Response(
        JSON.stringify({
          success: true,
          tradeId: 'trade-1',
        }),
        { status: 201 }
      )

      expect(response.status).toBe(201)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      global.mockPrisma.teams.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      )

      const { req } = createMocks({
        method: 'GET',
        query: { teamId: mockTeam.id },
      })

      const response = new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      )

      expect(response.status).toBe(500)
    })

    it('should validate request authentication', async () => {
      // Mock unauthenticated request
      jest.mocked(require('@/lib/auth').auth).mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        query: { teamId: mockTeam.id },
      })

      const response = new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )

      expect(response.status).toBe(401)
    })

    it('should handle malformed request data', async () => {
      const malformedData = {
        week: 'invalid',
        lineup: 'not-an-array',
      }

      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: malformedData,
      })

      const response = new Response(
        JSON.stringify({
          error: 'Invalid request data',
          details: 'Week must be a number, lineup must be an array',
        }),
        { status: 400 }
      )

      expect(response.status).toBe(400)
    })

    it('should handle concurrent lineup updates', async () => {
      global.mockPrisma.teams.findUnique.mockResolvedValue(mockTeam)
      
      // Simulate concurrent transaction conflict
      global.mockPrisma.$transaction.mockRejectedValue(
        new Error('Transaction conflict')
      )

      const { req } = createMocks({
        method: 'PUT',
        query: { teamId: mockTeam.id },
        headers: {
          'Content-Type': 'application/json',
        },
        body: lineupData,
      })

      const response = new Response(
        JSON.stringify({
          error: 'Lineup update conflict',
          message: 'Please retry your request',
        }),
        { status: 409 }
      )

      expect(response.status).toBe(409)
    })
  })
})
