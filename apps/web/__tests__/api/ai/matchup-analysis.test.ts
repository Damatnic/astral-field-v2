/**
 * AI Matchup Analysis API Route Tests
 * 
 * Tests for /api/ai/matchup-analysis endpoint
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/matchup-analysis/route'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

jest.mock('@/lib/ai/fantasy-ai-engine')
jest.mock('@/lib/ai/fantasy-data-generator')

describe('API Route: /api/ai/matchup-analysis', () => {
  const mockPlayers = [
    { id: 'player-1', name: 'Player 1', position: 'QB', nflTeam: 'KC' },
    { id: 'player-2', name: 'Player 2', position: 'RB', nflTeam: 'SF' }
  ]

  const mockMatchupAnalysis = {
    homeTeamAdvantage: 0.65,
    projectedScore: { home: 145.2, away: 138.5 },
    keyMatchups: [
      { position: 'QB', homePlayer: 'Player 1', awayPlayer: 'Player 3', advantage: 'HOME' }
    ],
    weatherImpact: { factor: 1.0, description: 'Clear conditions' },
    injuryImpact: { factor: 0.95, description: 'Minor injuries' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fantasyDataGenerator.getPlayers as jest.Mock).mockReturnValue(mockPlayers)
    ;(fantasyAI.analyzeMatchup as jest.Mock).mockResolvedValue(mockMatchupAnalysis)
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
      it('should analyze matchup with default parameters', async () => {
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
        expect(fantasyAI.analyzeMatchup).toHaveBeenCalled()
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

      it('should accept custom roster data', async () => {
        const homeRoster = ['player-1', 'player-2']
        const awayRoster = ['player-3', 'player-4']

        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            homeTeamRoster: homeRoster,
            awayTeamRoster: awayRoster
          })
        })

        await POST(request)

        const callArgs = (fantasyAI.analyzeMatchup as jest.Mock).mock.calls[0]
        const homeTeam = callArgs[0]
        const awayTeam = callArgs[1]

        expect(homeTeam.roster).toHaveLength(2)
        expect(awayTeam.roster).toHaveLength(2)
      })

      it('should use default roster when not provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        await POST(request)

        const callArgs = (fantasyAI.analyzeMatchup as jest.Mock).mock.calls[0]
        const homeTeam = callArgs[0]
        const awayTeam = callArgs[1]

        expect(homeTeam.roster).toHaveLength(16) // Default roster size
        expect(awayTeam.roster).toHaveLength(16)
      })
    })

    describe('Weather Analysis', () => {
      it('should include weather analysis by default', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.externalFactors).toBeDefined()
      })

      it('should skip weather analysis when disabled', async () => {
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
    })

    describe('Injury Impact', () => {
      it('should include injury impact by default', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.injuryImpact).toBeDefined()
      })

      it('should skip injury impact when disabled', async () => {
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

      it('should include matchup analysis', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.matchupAnalysis).toBeDefined()
        expect(data.data.matchupAnalysis).toHaveProperty('homeTeamAdvantage')
        expect(data.data.matchupAnalysis).toHaveProperty('projectedScore')
      })

      it('should include competitive advantages', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.competitiveAdvantages).toBeDefined()
      })

      it('should include lineup suggestions', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.lineupSuggestions).toBeDefined()
      })

      it('should include scenario analysis', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.scenarioAnalysis).toBeDefined()
      })

      it('should include head-to-head comparisons', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data.data.headToHeadComparisons).toBeDefined()
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
        expect(data.data.metadata).toHaveProperty('generatedAt')
        expect(data.data.metadata).toHaveProperty('homeTeamId')
        expect(data.data.metadata).toHaveProperty('awayTeamId')
        expect(data.data.metadata).toHaveProperty('week')
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

      it('should handle missing request body', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST'
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })

    describe('Team Data Handling', () => {
      it('should create team objects with correct structure', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2'
          })
        })

        await POST(request)

        const callArgs = (fantasyAI.analyzeMatchup as jest.Mock).mock.calls[0]
        const homeTeam = callArgs[0]
        const awayTeam = callArgs[1]

        expect(homeTeam).toHaveProperty('id', 'team-1')
        expect(homeTeam).toHaveProperty('name', 'Home Team')
        expect(homeTeam).toHaveProperty('roster')
        expect(awayTeam).toHaveProperty('id', 'team-2')
        expect(awayTeam).toHaveProperty('name', 'Away Team')
        expect(awayTeam).toHaveProperty('roster')
      })

      it('should map roster IDs correctly', async () => {
        const homeRoster = ['player-1', 'player-2']
        const awayRoster = ['player-3', 'player-4']

        const request = new NextRequest('http://localhost:3000/api/ai/matchup-analysis', {
          method: 'POST',
          body: JSON.stringify({
            homeTeamId: 'team-1',
            awayTeamId: 'team-2',
            homeTeamRoster: homeRoster,
            awayTeamRoster: awayRoster
          })
        })

        await POST(request)

        const callArgs = (fantasyAI.analyzeMatchup as jest.Mock).mock.calls[0]
        const homeTeam = callArgs[0]
        const awayTeam = callArgs[1]

        expect(homeTeam.roster[0]).toHaveProperty('playerId', 'player-1')
        expect(homeTeam.roster[1]).toHaveProperty('playerId', 'player-2')
        expect(awayTeam.roster[0]).toHaveProperty('playerId', 'player-3')
        expect(awayTeam.roster[1]).toHaveProperty('playerId', 'player-4')
      })
    })
  })
})