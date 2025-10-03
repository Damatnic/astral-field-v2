/**
 * Live Scoring API Route Tests
 * 
 * Tests for /api/live-scoring endpoint
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/live-scoring/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    matchup: { findMany: jest.fn() },
    liveGame: { findMany: jest.fn(), upsert: jest.fn() },
    livePlayerUpdate: { create: jest.fn() },
    playerStats: { findFirst: jest.fn(), upsert: jest.fn() },
    playerInjuryReport: { upsert: jest.fn() }
  }
}))

describe('API Route: /api/live-scoring', () => {
  const mockSession = {
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
  }

  const mockMatchups = [
    {
      id: 'matchup-1',
      week: 4,
      season: 2025,
      isComplete: false,
      homeTeam: {
        id: 'team-1',
        name: 'Team 1',
        owner: { name: 'Owner 1' },
        roster: [
          {
            position: 'QB',
            player: {
              id: 'player-1',
              name: 'Player 1',
              position: 'QB',
              nflTeam: 'KC',
              stats: [{ fantasyPoints: 20.5 }],
              liveUpdates: [],
              injuryReports: [],
              projections: [{ projectedPoints: 22.0 }]
            }
          }
        ]
      },
      awayTeam: {
        id: 'team-2',
        name: 'Team 2',
        owner: { name: 'Owner 2' },
        roster: [
          {
            position: 'QB',
            player: {
              id: 'player-2',
              name: 'Player 2',
              position: 'QB',
              nflTeam: 'BUF',
              stats: [{ fantasyPoints: 18.3 }],
              liveUpdates: [],
              injuryReports: [],
              projections: [{ projectedPoints: 20.0 }]
            }
          }
        ]
      },
      liveScores: []
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.matchup.findMany as jest.Mock).mockResolvedValue(mockMatchups)
    ;(prisma.liveGame.findMany as jest.Mock).mockResolvedValue([])
  })

  describe('GET /api/live-scoring', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123')
        const response = await GET(request)

        expect(response.status).toBe(401)
      })
    })

    describe('Validation', () => {
      it('should require leagueId', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring')
        const response = await GET(request)

        expect(response.status).toBe(400)
      })
    })

    describe('Live Scoring Data', () => {
      it('should fetch live scoring data', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.matchups).toBeDefined()
      })

      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123&week=5')
        await GET(request)

        expect(prisma.matchup.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ week: 5 })
          })
        )
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123')
        await GET(request)

        expect(prisma.matchup.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ week: 4 })
          })
        )
      })

      it('should include team scores', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123')
        const response = await GET(request)
        const data = await response.json()

        expect(data.data.matchups[0].homeTeam.score).toBeDefined()
        expect(data.data.matchups[0].awayTeam.score).toBeDefined()
      })

      it('should include roster details', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123')
        const response = await GET(request)
        const data = await response.json()

        expect(data.data.matchups[0].homeTeam.roster).toBeDefined()
        expect(Array.isArray(data.data.matchups[0].homeTeam.roster)).toBe(true)
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.matchup.findMany as jest.Mock).mockRejectedValue(new Error('DB error'))

        const request = new NextRequest('http://localhost:3000/api/live-scoring?leagueId=league-123')
        const response = await GET(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('POST /api/live-scoring', () => {
    describe('Player Update', () => {
      it('should handle player stat update', async () => {
        ;(prisma.livePlayerUpdate.create as jest.Mock).mockResolvedValue({})
        ;(prisma.playerStats.findFirst as jest.Mock).mockResolvedValue(null)
        ;(prisma.playerStats.upsert as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/live-scoring', {
          method: 'POST',
          body: JSON.stringify({
            type: 'PLAYER_UPDATE',
            data: {
              playerId: 'player-1',
              gameId: 'game-1',
              statType: 'PASSING_TD',
              statValue: 1,
              week: 4,
              season: 2025
            }
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(prisma.livePlayerUpdate.create).toHaveBeenCalled()
      })
    })

    describe('Game Update', () => {
      it('should handle game update', async () => {
        ;(prisma.liveGame.upsert as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/live-scoring', {
          method: 'POST',
          body: JSON.stringify({
            type: 'GAME_UPDATE',
            data: {
              nflGameId: 'game-1',
              status: 'IN_PROGRESS',
              quarter: 2,
              timeRemaining: '10:30',
              homeScore: 14,
              awayScore: 7
            }
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(prisma.liveGame.upsert).toHaveBeenCalled()
      })
    })

    describe('Injury Update', () => {
      it('should handle injury update', async () => {
        ;(prisma.playerInjuryReport.upsert as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/live-scoring', {
          method: 'POST',
          body: JSON.stringify({
            type: 'INJURY_UPDATE',
            data: {
              playerId: 'player-1',
              status: 'QUESTIONABLE',
              injury: 'Ankle',
              week: 4,
              season: 2025
            }
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(prisma.playerInjuryReport.upsert).toHaveBeenCalled()
      })
    })

    describe('Validation', () => {
      it('should reject invalid update type', async () => {
        const request = new NextRequest('http://localhost:3000/api/live-scoring', {
          method: 'POST',
          body: JSON.stringify({
            type: 'INVALID_TYPE',
            data: {}
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(400)
      })
    })
  })
})
