/**
 * AI Player Predictions API Route Tests
 * 
 * Tests for /api/ai/player-predictions endpoint
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/player-predictions/route'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

jest.mock('@/lib/ai/fantasy-ai-engine')
jest.mock('@/lib/ai/fantasy-data-generator')

describe('API Route: /api/ai/player-predictions', () => {
  const mockPlayer = {
    id: 'player-123',
    name: 'Test Player',
    position: 'RB',
    nflTeam: 'KC'
  }

  const mockPrediction = {
    projectedPoints: 15.5,
    confidence: 0.85,
    floor: 10.0,
    ceiling: 22.0
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue([mockPlayer])
    ;(fantasyDataGenerator.getPlayerStats as jest.Mock).mockReturnValue([
      { week: 1, fantasyPoints: 14.5 },
      { week: 2, fantasyPoints: 16.2 },
      { week: 3, fantasyPoints: 15.8 }
    ])
    ;(fantasyAI.predictPlayerPerformance as jest.Mock).mockResolvedValue(mockPrediction)
  })

  describe('POST /api/ai/player-predictions', () => {
    describe('Validation', () => {
      it('should require playerId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({})
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('playerId')
      })

      it('should return 404 for non-existent player', async () => {
        ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue([])

        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'invalid' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toContain('not found')
      })
    })

    describe('Prediction Generation', () => {
      it('should generate prediction for valid player', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.prediction).toEqual(mockPrediction)
      })

      it('should include player information', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.player).toEqual({
          id: 'player-123',
          name: 'Test Player',
          position: 'RB',
          team: 'KC'
        })
      })

      it('should include insights', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.insights).toBeDefined()
        expect(data.data.insights.recentTrend).toBeDefined()
        expect(data.data.insights.consistencyScore).toBeDefined()
        expect(data.data.insights.matchupDifficulty).toBeDefined()
      })

      it('should accept custom week parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123', week: 5 })
        })

        const response = await POST(request)

        expect(fantasyAI.predictPlayerPerformance).toHaveBeenCalledWith(
          'player-123',
          5,
          expect.any(Object)
        )
      })

      it('should include game context by default', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.gameContext).toBeDefined()
      })

      it('should exclude game context when requested', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123', includeContext: false })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.gameContext).toBeUndefined()
      })
    })

    describe('Metadata', () => {
      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.metadata).toBeDefined()
        expect(data.data.metadata.modelVersion).toBe('4.0')
        expect(data.data.metadata.generatedAt).toBeDefined()
      })
    })

    describe('Error Handling', () => {
      it('should handle prediction errors', async () => {
        ;(fantasyAI.predictPlayerPerformance as jest.Mock).mockRejectedValue(
          new Error('Prediction failed')
        )

        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions', {
          method: 'POST',
          body: JSON.stringify({ playerId: 'player-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('GET /api/ai/player-predictions', () => {
    describe('Filtering', () => {
      it('should filter by position', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions?position=RB')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should filter by team', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions?team=KC')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
      })

      it('should accept week parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions?week=5')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.week).toBe(5)
      })

      it('should accept limit parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions?limit=5')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.filters.limit).toBe(5)
      })
    })

    describe('Bulk Predictions', () => {
      it('should generate predictions for multiple players', async () => {
        ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue([
          mockPlayer,
          { ...mockPlayer, id: 'player-456', name: 'Player 2' }
        ])

        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.predictions.length).toBeGreaterThan(0)
      })

      it('should sort by projected points', async () => {
        ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue([
          mockPlayer,
          { ...mockPlayer, id: 'player-456' }
        ])
        ;(fantasyAI.predictPlayerPerformance as jest.Mock)
          .mockResolvedValueOnce({ projectedPoints: 10 })
          .mockResolvedValueOnce({ projectedPoints: 20 })

        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.predictions[0].prediction.projectedPoints).toBeGreaterThanOrEqual(
          data.data.predictions[1].prediction.projectedPoints
        )
      })

      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.metadata).toBeDefined()
        expect(data.data.metadata.totalPlayers).toBeDefined()
        expect(data.data.metadata.predictionsGenerated).toBeDefined()
      })
    })

    describe('Error Handling', () => {
      it('should handle errors gracefully', async () => {
        ;(fantasyDataGenerator.getPlayers as jest.Mock).mockImplementation(() => {
          throw new Error('Data error')
        })

        const request = new NextRequest('http://localhost:3000/api/ai/player-predictions')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
