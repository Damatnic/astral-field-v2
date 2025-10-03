/**
 * AI Matchup Analysis API Route Tests
 * 
 * Tests for /api/ai/matchup-analysis endpoint
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/matchup-analysis/route'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

jest.mock('@/lib/ai/fantasy-ai-engine')
jest.mock('@/lib/ai/fantasy-data-generator')

describe('API Route: /api/ai/matchup-analysis', () => {
  const mockPlayers = [
    { id: 'player-1', name: 'Player 1', position: 'QB', adp: 10, nflTeam: 'KC' },
    { id: 'player-2', name: 'Player 2', position: 'RB', adp: 20, nflTeam: 'SF' }
  ]

  const mockMatchupAnalysis = {
    projectedHomeScore: 125.5,
    projectedAwayScore: 118.3,
    winProbability: 0.62,
    analysisConfidence: 0.85,
    keyMatchups: [
      { position: 'QB', homePlayer: 'Player 1', awayPlayer: 'Player 2' }
    ]
  }

  const mockOptimization = {
    lineup: { QB: 'player-1', RB1: 'player-2' },
    projectedScore: 125.5,
    floorScore: 100.0,
    ceilingScore: 150.0,
    strategy: 'BALANCED'
  }

  const mockPrediction = {
    projectedPoints: 20.5,
    confidence: 0.8
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue(mockPlayers)
    ;(fantasyDataGenerator.generateInjuryReports as jest.Mock).mockReturnValue([])
    ;(fantasyAI.analyzeMatchup as jest.Mock).mockResolvedValue(mockMatchupAnalysis)
    ;(fantasyAI.optimizeLineup as jest.Mock).mockResolvedValue(mockOptimization)
    ;(fantasyAI.predictPlayerPerformance as jest.Mock).mockResolvedValue(mockPrediction)
  })

  describe('POST /api/ai/matchup-analysis', () => {
    describe('Validation', () => {
      it('should require homeTeamId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({ awayTeamId: 'team-2' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('homeTeamId')
      })

      it('should require awayTeamId', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({ homeTeamId: 'team-1' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('awayTeamId')
      })
    })

    describe('Matchup Analysis', () => {
      it('should analyze matchup between teams', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)

        expect(fantasyAI.analyzeMatchup).toHaveBeenCalled()
      })

      it('should accept custom rosters', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            homeTeamRoster: ['player-1'],
            awayTeamRoster: ['player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            week: 5
          })
        })

        await POST(request)

        expect(fantasyAI.analyzeMatchup).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          5
        )
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        await POST(request)

        expect(fantasyAI.analyzeMatchup).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          4
        )
      })
    })

    describe('Response Format', () => {
      it('should return success response', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should include matchup details', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.matchup).toBeDefined()
        expect(data.data.matchup.homeTeam.id).toBe('team-1')
        expect(data.data.matchup.awayTeam.id).toBe('team-2')
      })

      it('should include analysis data', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.analysis).toBeDefined()
        expect(data.data.analysis.projectedHomeScore).toBe(125.5)
        expect(data.data.analysis.winProbability).toBe(0.62)
      })

      it('should include insights', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.insights).toBeDefined()
        expect(data.data.insights.competitiveAdvantages).toBeDefined()
        expect(data.data.insights.lineupSuggestions).toBeDefined()
        expect(data.data.insights.scenarioAnalysis).toBeDefined()
      })

      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.metadata).toBeDefined()
        expect(data.data.metadata.confidenceLevel).toBe(0.85)
        expect(data.data.metadata.generatedAt).toBeDefined()
      })
    })

    describe('Optional Features', () => {
      it('should include weather analysis when requested', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            includeWeatherAnalysis: true
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.externalFactors).toBeDefined()
      })

      it('should exclude weather analysis when not requested', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            includeWeatherAnalysis: false
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.externalFactors).toBeNull()
      })

      it('should include injury impact when requested', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            includeInjuryImpact: true
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.injuryImpact).toBeDefined()
      })

      it('should exclude injury impact when not requested', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            includeInjuryImpact: false
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.injuryImpact).toBeNull()
      })
    })

    describe('Error Handling', () => {
      it('should handle analysis errors', async () => {
        ;(fantasyAI.analyzeMatchup as jest.Mock).mockRejectedValue(
          new Error('Analysis failed')
        )

        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: 'invalid json{'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('GET /api/ai/matchup-analysis', () => {
    describe('Weekly Matchups', () => {
      it('should generate weekly matchups', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?week=4')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.matchups).toBeDefined()
        expect(Array.isArray(data.data.matchups)).toBe(true)
      })

      it('should accept custom week', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?week=5')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.week).toBe(5)
      })

      it('should default to week 4', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.week).toBe(4)
      })

      it('should accept leagueId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?leagueId=league-123')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.leagueId).toBe('league-123')
      })
    })

    describe('Response Format', () => {
      it('should include week overview', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?week=4')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.weekOverview).toBeDefined()
        expect(data.data.weekOverview.averageScore).toBeDefined()
      })

      it('should include metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?week=4')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.metadata).toBeDefined()
        expect(data.data.metadata.totalMatchups).toBeGreaterThan(0)
      })

      it('should include matchup summaries', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?week=4')

        const response = await GET(request)
        const data = await response.json()

        expect(data.data.matchups.length).toBeGreaterThan(0)
        if (data.data.matchups.length > 0) {
          expect(data.data.matchups[0].analysis).toBeDefined()
          expect(data.data.matchups[0].homeTeam).toBeDefined()
          expect(data.data.matchups[0].awayTeam).toBeDefined()
        }
      })
    })

    describe('Error Handling', () => {
      it('should handle errors gracefully', async () => {
        ;(fantasyAI.analyzeMatchup as jest.Mock).mockRejectedValue(
          new Error('Weekly matchups failed')
        )

        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis?week=4')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
