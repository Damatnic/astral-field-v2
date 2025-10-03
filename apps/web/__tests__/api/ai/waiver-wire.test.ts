/**
 * AI Waiver Wire API Route Tests
 * 
 * Tests for /api/ai/waiver-wire endpoint
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/waiver-wire/route'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

jest.mock('@/lib/ai/fantasy-ai-engine')
jest.mock('@/lib/ai/fantasy-data-generator')

describe('API Route: /api/ai/waiver-wire', () => {
  const mockPlayers = [
    { id: 'player-1', name: 'Player 1', position: 'RB', nflTeam: 'KC', adp: 50, isFantasyRelevant: true },
    { id: 'player-2', name: 'Player 2', position: 'WR', nflTeam: 'SF', adp: 60, isFantasyRelevant: true },
    { id: 'player-3', name: 'Player 3', position: 'TE', nflTeam: 'DAL', adp: 70, isFantasyRelevant: true }
  ]

  const mockRecommendations = [
    {
      playerId: 'player-1',
      priority: 1,
      projectedValue: 15.5,
      reasoning: 'High value pickup'
    },
    {
      playerId: 'player-2',
      priority: 2,
      projectedValue: 12.3,
      reasoning: 'Good value'
    }
  ]

  const mockPrediction = {
    projectedPoints: 15.5,
    confidence: 0.8,
    breakoutPotential: 0.7
  }

  const mockStats = [
    { week: 1, fantasyPoints: 10.5 },
    { week: 2, fantasyPoints: 15.2 }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue(mockPlayers)
    ;(fantasyDataGenerator.getPlayerStats as jest.Mock).mockReturnValue(mockStats)
    ;(fantasyAI.analyzeWaiverWire as jest.Mock).mockResolvedValue(mockRecommendations)
    ;(fantasyAI.predictPlayerPerformance as jest.Mock).mockResolvedValue(mockPrediction)
  })

  describe('POST /api/ai/waiver-wire', () => {
    describe('Validation', () => {
      it('should require leagueId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({ teamId: 'team-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('leagueId')
      })

      it('should require teamId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({ leagueId: 'league-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('teamId')
      })
    })

    describe('Waiver Wire Analysis', () => {
      it('should analyze waiver wire', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)

        expect(fantasyAI.analyzeWaiverWire).toHaveBeenCalled()
      })

      it('should accept team needs', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123',
            teamNeeds: ['RB', 'WR']
          })
        })

        await POST(request)

        expect(fantasyAI.analyzeWaiverWire).toHaveBeenCalledWith(
          'league-123',
          expect.any(Array),
          ['RB', 'WR'],
          expect.any(Number)
        )
      })

      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123',
            week: 5
          })
        })

        await POST(request)

        expect(fantasyAI.analyzeWaiverWire).toHaveBeenCalledWith(
          'league-123',
          expect.any(Array),
          expect.any(Array),
          5
        )
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        await POST(request)

        expect(fantasyAI.analyzeWaiverWire).toHaveBeenCalledWith(
          'league-123',
          expect.any(Array),
          expect.any(Array),
          4
        )
      })

      it('should exclude specified players', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123',
            excludePlayerIds: ['player-1']
          })
        })

        await POST(request)

        const callArgs = (fantasyAI.analyzeWaiverWire as jest.Mock).mock.calls[0]
        const availablePlayers = callArgs[1]
        
        expect(availablePlayers.find((p: any) => p.id === 'player-1')).toBeUndefined()
      })

      it('should limit recommendations', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123',
            maxRecommendations: 5
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.recommendations.length).toBeLessThanOrEqual(5)
      })
    })

    describe('Response Format', () => {
      it('should return success response', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should include recommendations', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.recommendations).toBeDefined()
        expect(Array.isArray(data.data.recommendations)).toBe(true)
      })

      it('should include insights', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.insights).toBeDefined()
        expect(data.data.insights.emergingPlayers).toBeDefined()
        expect(data.data.insights.injuryReplacements).toBeDefined()
        expect(data.data.insights.handcuffAnalysis).toBeDefined()
        expect(data.data.insights.breakoutCandidates).toBeDefined()
      })

      it('should include trends', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.trends).toBeDefined()
      })

      it('should include analysis summary', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.analysis).toBeDefined()
        expect(data.data.analysis.totalPlayersAnalyzed).toBeGreaterThan(0)
      })

      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.metadata).toBeDefined()
        expect(data.data.metadata.leagueId).toBe('league-123')
        expect(data.data.metadata.teamId).toBe('team-123')
      })
    })

    describe('Error Handling', () => {
      it('should handle analysis errors', async () => {
        ;(fantasyAI.analyzeWaiverWire as jest.Mock).mockRejectedValue(
          new Error('Analysis failed')
        )

        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: JSON.stringify({
            leagueId: 'league-123',
            teamId: 'team-123'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('GET /api/ai/waiver-wire', () => {
    describe('Player Lookup', () => {
      it('should return available players', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.players).toBeDefined()
        expect(Array.isArray(data.data.players)).toBe(true)
      })

      it('should filter by position', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire?position=RB')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.position).toBe('RB')
      })

      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire?week=5')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.week).toBe(5)
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.week).toBe(4)
      })

      it('should accept roster threshold', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire?rosterThreshold=25')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.rosterThreshold).toBe(25)
      })

      it('should default roster threshold to 10', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.rosterThreshold).toBe(10)
      })
    })

    describe('Response Format', () => {
      it('should include player analysis', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.players).toBeDefined()
        if (data.data.players.length > 0) {
          expect(data.data.players[0].player).toBeDefined()
          expect(data.data.players[0].prediction).toBeDefined()
          expect(data.data.players[0].analysis).toBeDefined()
        }
      })

      it('should include categories', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.categories).toBeDefined()
        expect(data.data.categories.mustAdd).toBeDefined()
        expect(data.data.categories.strongConsider).toBeDefined()
        expect(data.data.categories.speculative).toBeDefined()
        expect(data.data.categories.deepSleepers).toBeDefined()
      })

      it('should include summary', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.summary).toBeDefined()
        expect(data.data.summary.totalAnalyzed).toBeGreaterThan(0)
      })

      it('should include filters', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire?position=WR&week=5')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters).toBeDefined()
        expect(data.data.filters.position).toBe('WR')
        expect(data.data.filters.week).toBe(5)
      })
    })

    describe('Error Handling', () => {
      it('should handle errors gracefully', async () => {
        ;(fantasyDataGenerator.getPlayers as jest.Mock).mockImplementation(() => {
          throw new Error('Data error')
        })

        const request = new NextRequest('http://localhost:3000/api/ai/waiver-wire')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
