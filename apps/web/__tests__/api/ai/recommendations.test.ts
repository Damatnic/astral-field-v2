import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/ai/recommendations'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findUnique: jest.fn(),
    },
    player: {
      findMany: jest.fn(),
    },
    rosterPlayer: {
      findMany: jest.fn(),
    },
    matchup: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/ai/recommendations API route', () => {
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
        adp: 2.5,
        stats: [
          { week: 13, fantasyPoints: 22.4, stats: { passingYards: 280, touchdowns: 2 } },
        ],
        projections: [
          { projectedPoints: 24.8, confidence: 0.88 },
        ],
      },
    },
    {
      id: 'roster2',
      teamId: 'team1',
      playerId: 'player2',
      position: 'BENCH',
      isStarter: false,
      player: {
        id: 'player2',
        name: 'Baker Mayfield',
        position: 'QB',
        nflTeam: 'TB',
        adp: 12.8,
        stats: [
          { week: 13, fantasyPoints: 18.6, stats: { passingYards: 250, touchdowns: 2 } },
        ],
        projections: [
          { projectedPoints: 19.2, confidence: 0.75 },
        ],
      },
    },
  ]

  const mockAvailablePlayers = [
    {
      id: 'player3',
      name: 'Geno Smith',
      position: 'QB',
      nflTeam: 'SEA',
      adp: 15.2,
      isAvailable: true,
      stats: [
        { week: 13, fantasyPoints: 21.8, stats: { passingYards: 290, touchdowns: 3 } },
      ],
      projections: [
        { projectedPoints: 18.5, confidence: 0.72 },
      ],
    },
  ]

  const mockMatchup = {
    id: 'matchup1',
    week: 14,
    homeTeamId: 'team1',
    awayTeamId: 'team2',
    homeScore: 0,
    awayScore: 0,
    isComplete: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
  })

  it('generates AI recommendations successfully', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
    mockPrisma.player.findMany.mockResolvedValue(mockAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    
    expect(data.recommendations).toBeDefined()
    expect(Array.isArray(data.recommendations)).toBe(true)
    expect(data.analysis).toBeDefined()
    expect(data.analysis.teamStrength).toBeDefined()
    expect(data.analysis.projectedScore).toBeDefined()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when team is not found', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'nonexistent',
        week: 14,
      },
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
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(403)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Not authorized to access this team')
  })

  it('validates required request fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        // Missing teamId and week
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('teamId and week are required')
  })

  it('validates week is a valid number', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 'invalid',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Week must be a valid number between 1 and 18')
  })

  it('validates week is within valid range', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 25, // Invalid week
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Week must be a valid number between 1 and 18')
  })

  it('generates lineup recommendations', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
    mockPrisma.player.findMany.mockResolvedValue(mockAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    const lineupRecs = data.recommendations.filter((rec: any) => rec.type === 'LINEUP')
    
    expect(lineupRecs.length).toBeGreaterThan(0)
    expect(lineupRecs[0]).toMatchObject({
      type: 'LINEUP',
      playerId: expect.any(String),
      playerName: expect.any(String),
      position: expect.any(String),
      confidence: expect.any(Number),
      reason: expect.any(String),
      recommendation: expect.stringMatching(/^(START|BENCH)$/),
      expectedPoints: expect.any(Number),
      impact: expect.stringMatching(/^(HIGH|MEDIUM|LOW)$/),
    })
  })

  it('generates waiver recommendations', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
    mockPrisma.player.findMany.mockResolvedValue(mockAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    const waiverRecs = data.recommendations.filter((rec: any) => rec.type === 'WAIVER')
    
    expect(waiverRecs.length).toBeGreaterThan(0)
    expect(waiverRecs[0]).toMatchObject({
      type: 'WAIVER',
      playerId: expect.any(String),
      playerName: expect.any(String),
      position: expect.any(String),
      confidence: expect.any(Number),
      reason: expect.any(String),
      recommendation: expect.stringMatching(/^(ADD|DROP)$/),
      expectedPoints: expect.any(Number),
      impact: expect.stringMatching(/^(HIGH|MEDIUM|LOW)$/),
    })
  })

  it('generates trade recommendations', async () => {
    // Add injured player to roster for trade recommendation
    const rosterWithInjuredPlayer = [
      ...mockRoster,
      {
        id: 'roster3',
        teamId: 'team1',
        playerId: 'player4',
        position: 'RB',
        isStarter: true,
        player: {
          id: 'player4',
          name: 'Injured Player',
          position: 'RB',
          nflTeam: 'NYG',
          adp: 8.5,
          stats: [
            { week: 13, fantasyPoints: 5.2, stats: { rushingYards: 35, touchdowns: 0 } },
          ],
          projections: [
            { projectedPoints: 8.5, confidence: 0.45 },
          ],
        },
      },
    ]

    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(rosterWithInjuredPlayer)
    mockPrisma.player.findMany.mockResolvedValue(mockAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    const tradeRecs = data.recommendations.filter((rec: any) => rec.type === 'TRADE')
    
    expect(tradeRecs.length).toBeGreaterThan(0)
    expect(tradeRecs[0]).toMatchObject({
      type: 'TRADE',
      playerId: expect.any(String),
      playerName: expect.any(String),
      position: expect.any(String),
      confidence: expect.any(Number),
      reason: expect.any(String),
      recommendation: expect.stringMatching(/^(BUY|SELL)$/),
      expectedPoints: expect.any(Number),
      impact: expect.stringMatching(/^(HIGH|MEDIUM|LOW)$/),
    })
  })

  it('includes team analysis in response', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
    mockPrisma.player.findMany.mockResolvedValue(mockAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    
    expect(data.analysis).toMatchObject({
      teamStrength: expect.stringMatching(/^(Strong|Average|Weak)$/),
      weakPositions: expect.any(Array),
      upcomingMatchup: expect.stringMatching(/^(Favorable|Neutral|Difficult)$/),
      projectedScore: expect.any(Number),
    })
  })

  it('handles database errors gracefully', async () => {
    mockPrisma.team.findUnique.mockRejectedValue(new Error('Database error'))

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Failed to generate recommendations')
  })

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Method not allowed')
  })

  it('limits recommendations to reasonable number', async () => {
    // Mock large roster and available players
    const largeRoster = Array.from({ length: 20 }, (_, i) => ({
      id: `roster${i}`,
      teamId: 'team1',
      playerId: `player${i}`,
      position: 'BENCH',
      isStarter: false,
      player: {
        id: `player${i}`,
        name: `Player ${i}`,
        position: 'WR',
        nflTeam: 'NYJ',
        adp: 10 + i,
        stats: [{ week: 13, fantasyPoints: 10, stats: {} }],
        projections: [{ projectedPoints: 12, confidence: 0.7 }],
      },
    }))

    const largeAvailablePlayers = Array.from({ length: 50 }, (_, i) => ({
      id: `available${i}`,
      name: `Available Player ${i}`,
      position: 'WR',
      nflTeam: 'MIA',
      adp: 20 + i,
      isAvailable: true,
      stats: [{ week: 13, fantasyPoints: 8, stats: {} }],
      projections: [{ projectedPoints: 10, confidence: 0.6 }],
    }))

    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(largeRoster)
    mockPrisma.player.findMany.mockResolvedValue(largeAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    
    // Should limit total recommendations to reasonable number
    expect(data.recommendations.length).toBeLessThanOrEqual(10)
  })

  it('prioritizes higher confidence recommendations', async () => {
    mockPrisma.team.findUnique.mockResolvedValue(mockTeam)
    mockPrisma.rosterPlayer.findMany.mockResolvedValue(mockRoster)
    mockPrisma.player.findMany.mockResolvedValue(mockAvailablePlayers)
    mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        teamId: 'team1',
        week: 14,
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    
    // Recommendations should be sorted by confidence (highest first)
    const confidenceValues = data.recommendations.map((rec: any) => rec.confidence)
    const sortedConfidence = [...confidenceValues].sort((a, b) => b - a)
    expect(confidenceValues).toEqual(sortedConfidence)
  })
})