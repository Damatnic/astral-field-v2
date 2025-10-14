/**
 * Trade Analysis API Tests
 * Comprehensive test coverage for /api/ai/trade-analysis
 */

import { GET, POST } from '@/app/api/ai/trade-analysis/route'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/auth')

describe('API Route: /api/ai/trade-analysis', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/ai/trade-analysis', () => {
    it('should return 401 when not authenticated', async () => {
      ;(auth as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1&week=4'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when teamId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?week=4'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should return 400 when week is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('should return 200 with analysis data when authenticated', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1&week=4'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('fairness')
      expect(data).toHaveProperty('confidence')
      expect(data).toHaveProperty('valueGap')
      expect(data).toHaveProperty('analysis')
      expect(data).toHaveProperty('recommendations')
    })

    it('should include cache headers', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1&week=4'
      )
      const response = await GET(request)

      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toContain('private')
      expect(cacheControl).toContain('s-maxage=300')
    })

    it('should return valid fairness values', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1&week=4'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(['fair', 'favorable', 'unfavorable']).toContain(data.fairness)
    })

    it('should return confidence between 0 and 1', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1&week=4'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(data.confidence).toBeGreaterThanOrEqual(0)
      expect(data.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('POST /api/ai/trade-analysis', () => {
    const validTradeRequest = {
      teamId: 'team-1',
      week: 4,
      giving: [
        {
          id: 'player-1',
          name: 'Patrick Mahomes',
          position: 'QB',
          team: 'KC',
          projectedPoints: 25.5,
          currentValue: 100,
        },
      ],
      receiving: [
        {
          id: 'player-2',
          name: 'Josh Allen',
          position: 'QB',
          team: 'BUF',
          projectedPoints: 26.2,
          currentValue: 105,
        },
      ],
    }

    it('should return 401 when not authenticated', async () => {
      ;(auth as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(validTradeRequest),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify({ teamId: 'team-1' }), // Missing required fields
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
    })

    it('should calculate value gap correctly', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(validTradeRequest),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.givingValue).toBe(25.5)
      expect(data.analysis.receivingValue).toBe(26.2)
      expect(data.valueGap).toBe(0.7)
    })

    it('should determine fairness based on value gap', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(validTradeRequest),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fairness).toBe('fair') // Gap is 0.7, less than 5
    })

    it('should calculate positional impact', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(validTradeRequest),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(data.analysis.positionalImpact).toHaveProperty('QB')
      expect(data.analysis.positionalImpact.QB).toBe(0.7) // 26.2 - 25.5
    })

    it('should provide recommendations', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(validTradeRequest),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(Array.isArray(data.recommendations)).toBe(true)
      expect(data.recommendations.length).toBeGreaterThan(0)
    })

    it('should handle multi-player trades', async () => {
      const multiPlayerTrade = {
        ...validTradeRequest,
        giving: [
          ...validTradeRequest.giving,
          {
            id: 'player-3',
            name: 'Travis Kelce',
            position: 'TE',
            team: 'KC',
            projectedPoints: 15.2,
            currentValue: 85,
          },
        ],
      }

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(multiPlayerTrade),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.givingValue).toBe(40.7) // 25.5 + 15.2
    })

    it('should return favorable for good trades', async () => {
      const favorableTrade = {
        ...validTradeRequest,
        giving: [
          {
            id: 'player-1',
            name: 'Low Value',
            position: 'QB',
            team: 'KC',
            projectedPoints: 15.0,
            currentValue: 50,
          },
        ],
        receiving: [
          {
            id: 'player-2',
            name: 'High Value',
            position: 'QB',
            team: 'BUF',
            projectedPoints: 25.0,
            currentValue: 100,
          },
        ],
      }

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(favorableTrade),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fairness).toBe('favorable') // Gap is 10, more than 5
    })

    it('should return unfavorable for bad trades', async () => {
      const unfavorableTrade = {
        ...validTradeRequest,
        giving: [
          {
            id: 'player-1',
            name: 'High Value',
            position: 'QB',
            team: 'KC',
            projectedPoints: 25.0,
            currentValue: 100,
          },
        ],
        receiving: [
          {
            id: 'player-2',
            name: 'Low Value',
            position: 'QB',
            team: 'BUF',
            projectedPoints: 15.0,
            currentValue: 50,
          },
        ],
      }

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(unfavorableTrade),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fairness).toBe('unfavorable') // Gap is -10, more than 5
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on server error for GET', async () => {
      ;(auth as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis?teamId=team-1&week=4'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed')
    })

    it('should return 500 on server error for POST', async () => {
      ;(auth as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(
        'http://localhost:3000/api/ai/trade-analysis',
        {
          method: 'POST',
          body: JSON.stringify(validTradeRequest),
        }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed')
    })
  })
})

