/**
 * AI Lineup Optimization API Route Tests
 * 
 * Tests for /api/ai/lineup-optimization endpoint
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/lineup-optimization/route'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

jest.mock('@/lib/ai/fantasy-ai-engine')
jest.mock('@/lib/ai/fantasy-data-generator')

describe('API Route: /api/ai/lineup-optimization', () => {
  const mockPlayers = [
    { id: 'player-1', name: 'Player 1', position: 'QB', adp: 10 },
    { id: 'player-2', name: 'Player 2', position: 'RB', adp: 20 },
    { id: 'player-3', name: 'Player 3', position: 'WR', adp: 30 }
  ]

  const mockOptimization = {
    lineup: {
      QB: 'player-1',
      RB1: 'player-2',
      WR1: 'player-3'
    },
    projectedScore: 125.5,
    floorScore: 100.0,
    ceilingScore: 150.0,
    winProbability: 0.65
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue(mockPlayers)
    ;(fantasyAI.optimizeLineup as jest.Mock).mockResolvedValue(mockOptimization)
  })

  describe('POST /api/ai/lineup-optimization', () => {
    describe('Validation', () => {
      it('should require teamId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({ rosterPlayerIds: ['player-1'] })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('teamId')
      })

      it('should require rosterPlayerIds', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({ teamId: 'team-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('rosterPlayerIds')
      })

      it('should require non-empty rosterPlayerIds', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({ teamId: 'team-123', rosterPlayerIds: [] })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should validate player existence', async () => {
        ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue([])

        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({ 
            teamId: 'team-123', 
            rosterPlayerIds: ['invalid-player'] 
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('No valid players')
      })
    })

    describe('Optimization Strategies', () => {
      it('should accept SAFE strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2'],
            strategy: 'SAFE'
          })
        })

        const response = await POST(request)

        expect(fantasyAI.optimizeLineup).toHaveBeenCalledWith(
          'team-123',
          expect.any(Array),
          'SAFE',
          expect.any(Number)
        )
      })

      it('should accept BALANCED strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2'],
            strategy: 'BALANCED'
          })
        })

        const response = await POST(request)

        expect(fantasyAI.optimizeLineup).toHaveBeenCalledWith(
          'team-123',
          expect.any(Array),
          'BALANCED',
          expect.any(Number)
        )
      })

      it('should accept AGGRESSIVE strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2'],
            strategy: 'AGGRESSIVE'
          })
        })

        const response = await POST(request)

        expect(fantasyAI.optimizeLineup).toHaveBeenCalledWith(
          'team-123',
          expect.any(Array),
          'AGGRESSIVE',
          expect.any(Number)
        )
      })

      it('should default to BALANCED strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)

        expect(fantasyAI.optimizeLineup).toHaveBeenCalledWith(
          'team-123',
          expect.any(Array),
          'BALANCED',
          expect.any(Number)
        )
      })
    })

    describe('Week Parameter', () => {
      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1'],
            week: 5
          })
        })

        const response = await POST(request)

        expect(fantasyAI.optimizeLineup).toHaveBeenCalledWith(
          'team-123',
          expect.any(Array),
          'BALANCED',
          5
        )
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1']
          })
        })

        const response = await POST(request)

        expect(fantasyAI.optimizeLineup).toHaveBeenCalledWith(
          'team-123',
          expect.any(Array),
          'BALANCED',
          4
        )
      })
    })

    describe('Response Format', () => {
      it('should return success response', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should include optimization data', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.optimization).toBeDefined()
        expect(data.data.optimization.lineup).toBeDefined()
        expect(data.data.optimization.projectedScore).toBe(125.5)
      })

      it('should include alternative lineups', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.alternatives).toBeDefined()
        expect(Array.isArray(data.data.alternatives)).toBe(true)
      })

      it('should include analysis', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.analysis).toBeDefined()
        expect(data.data.analysis.positionStrength).toBeDefined()
        expect(data.data.analysis.riskAssessment).toBeDefined()
      })

      it('should include roster summary', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.roster).toBeDefined()
        expect(data.data.roster.totalPlayers).toBeGreaterThan(0)
        expect(data.data.roster.byPosition).toBeDefined()
      })

      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1', 'player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.metadata).toBeDefined()
        expect(data.data.metadata.optimizationMethod).toBeDefined()
        expect(data.data.metadata.generatedAt).toBeDefined()
      })
    })

    describe('Error Handling', () => {
      it('should handle optimization errors', async () => {
        ;(fantasyAI.optimizeLineup as jest.Mock).mockRejectedValue(
          new Error('Optimization failed')
        )

        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: JSON.stringify({
            teamId: 'team-123',
            rosterPlayerIds: ['player-1']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('GET /api/ai/lineup-optimization', () => {
    describe('Validation', () => {
      it('should require teamId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('teamId')
      })
    })

    describe('Strategy Comparison', () => {
      it('should generate optimizations for all strategies', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.optimizations).toBeDefined()
        expect(data.data.optimizations.length).toBe(3)
      })

      it('should include SAFE strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        const safeStrategy = data.data.optimizations.find((o: any) => o.strategy === 'SAFE')
        expect(safeStrategy).toBeDefined()
      })

      it('should include BALANCED strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        const balancedStrategy = data.data.optimizations.find((o: any) => o.strategy === 'BALANCED')
        expect(balancedStrategy).toBeDefined()
      })

      it('should include AGGRESSIVE strategy', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        const aggressiveStrategy = data.data.optimizations.find((o: any) => o.strategy === 'AGGRESSIVE')
        expect(aggressiveStrategy).toBeDefined()
      })

      it('should include comparison data', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.comparison).toBeDefined()
        expect(data.data.comparison.scoreRange).toBeDefined()
        expect(data.data.comparison.insights).toBeDefined()
      })

      it('should provide recommendation', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.recommendation).toBeDefined()
        expect(data.data.recommendation.strategy).toBeDefined()
        expect(data.data.recommendation.reasoning).toBeDefined()
      })
    })

    describe('Week Parameter', () => {
      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123&week=5')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.metadata.week).toBe(5)
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.metadata.week).toBe(4)
      })
    })

    describe('Error Handling', () => {
      it('should handle errors gracefully', async () => {
        ;(fantasyAI.optimizeLineup as jest.Mock).mockRejectedValue(
          new Error('Comparison failed')
        )

        const request = new NextRequest('http://localhost:3000/api/ai/lineup-optimization?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
