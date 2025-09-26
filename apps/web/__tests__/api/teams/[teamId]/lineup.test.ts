import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/teams/[teamId]/lineup'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findUnique: jest.fn(),
    },
    rosterPlayer: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/teams/[teamId]/lineup API route', () => {
  const mockSession = {
    user: {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
    },
  }

  const mockTeam = {
    id: 'team1',
    name: 'Fire Breathing Rubber Ducks',
    ownerId: 'user1',
    leagueId: 'league1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRoster = [
    {
      id: 'roster1',
      teamId: 'team1',
      playerId: 'player1',
      position: 'QB',
      isStarter: true,
      player: {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        nflTeam: 'BUF',
      },
    },
    {
      id: 'roster2',
      teamId: 'team1',
      playerId: 'player2',
      position: 'RB',
      isStarter: false,
      player: {
        id: 'player2',
        name: 'Saquon Barkley',
        position: 'RB',
        nflTeam: 'PHI',
      },
    },
    {
      id: 'roster3',
      teamId: 'team1',
      playerId: 'player3',
      position: 'BENCH',
      isStarter: false,
      player: {
        id: 'player3',
        name: 'Cooper Kupp',
        position: 'WR',
        nflTeam: 'LAR',
      },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
  })

  describe('GET /api/teams/[teamId]/lineup', () => {
    it('returns team lineup successfully', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
      mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)

      const { req, res } = createMocks({
        method: 'GET',
        query: { teamId: 'team1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.lineup).toHaveLength(3)
      expect(data.lineup[0].player.name).toBe('Josh Allen')
      expect(data.lineup[0].isStarter).toBe(true)
    })

    it('returns 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { teamId: 'team1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when team is not found', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { teamId: 'nonexistent' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Team not found')
    })

    it('returns 403 when user does not own the team', async () => {
      const otherUserTeam = { ...mockTeam, ownerId: 'otheruser' }
      mockPrisma.team.findUnique.mockResolvedValue(otherUserTeam)

      const { req, res } = createMocks({
        method: 'GET',
        query: { teamId: 'team1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(403)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Not authorized to view this team')
    })
  })

  describe('PUT /api/teams/[teamId]/lineup', () => {
    it('updates lineup successfully', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
      mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
      mockPrisma.rosterPlayer.update.mockResolvedValue(mockRoster[0])

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: [
            {
              playerId: 'player2',
              position: 'RB',
              isStarter: true,
            },
            {
              playerId: 'player3',
              position: 'WR',
              isStarter: true,
            },
          ],
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(mockPrisma.rosterPlayer.update).toHaveBeenCalledTimes(2)
      
      const data = JSON.parse(res._getData())
      expect(data.message).toBe('Lineup updated successfully')
    })

    it('validates lineup changes format', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: [
            {
              // Missing required fields
            },
          ],
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Invalid lineup changes format')
    })

    it('prevents setting duplicate starters at same position', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
      mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: [
            {
              playerId: 'player1',
              position: 'QB',
              isStarter: true,
            },
            {
              playerId: 'player2',
              position: 'QB', // Same position as player1
              isStarter: true,
            },
          ],
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Cannot have multiple starters at the same position')
    })

    it('validates player belongs to team', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
      mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: [
            {
              playerId: 'nonexistent-player',
              position: 'WR',
              isStarter: true,
            },
          ],
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Player nonexistent-player not found on team roster')
    })

    it('enforces position limits', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
      mockPrisma.rosterPlayer.findMany.mockResolvedValue([
        ...mockRoster,
        {
          id: 'roster4',
          teamId: 'team1',
          playerId: 'player4',
          position: 'RB',
          isStarter: false,
          player: { id: 'player4', name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL' },
        },
        {
          id: 'roster5',
          teamId: 'team1',
          playerId: 'player5',
          position: 'RB',
          isStarter: false,
          player: { id: 'player5', name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF' },
        },
        {
          id: 'roster6',
          teamId: 'team1',
          playerId: 'player6',
          position: 'RB',
          isStarter: false,
          player: { id: 'player6', name: 'Josh Jacobs', position: 'RB', nflTeam: 'GB' },
        },
      ])

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: [
            {
              playerId: 'player2',
              position: 'RB',
              isStarter: true,
            },
            {
              playerId: 'player4',
              position: 'RB',
              isStarter: true,
            },
            {
              playerId: 'player5',
              position: 'RB', // Third RB starter - should fail
              isStarter: true,
            },
          ],
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Too many starters at position RB. Maximum allowed: 2')
    })

    it('handles database update errors', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
      mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
      mockPrisma.rosterPlayer.update.mockRejectedValue(new Error('Database error'))

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: [
            {
              playerId: 'player2',
              position: 'RB',
              isStarter: true,
            },
          ],
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Failed to update lineup')
    })

    it('requires lineupChanges in request body', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {},
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('lineupChanges is required')
    })

    it('validates lineupChanges is an array', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { teamId: 'team1' },
        body: {
          lineupChanges: 'not-an-array',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('lineupChanges must be an array')
    })
  })

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
      query: { teamId: 'team1' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Method not allowed')
  })

  it('handles missing teamId parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Team ID is required')
  })

  it('handles database connection errors on GET', async () => {
    mockPrisma.team.findUnique.mockRejectedValue(new Error('Database connection failed'))

    const { req, res } = createMocks({
      method: 'GET',
      query: { teamId: 'team1' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Internal server error')
  })
})