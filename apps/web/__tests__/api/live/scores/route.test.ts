/**
 * Live Scores SSE Endpoint Tests
 * Comprehensive test coverage for /api/live/scores
 */

import { GET } from '@/app/api/live/scores/route'
import { NextRequest } from 'next/server'
import { ESPNService } from '@/lib/services/espn'

// Mock dependencies
jest.mock('@/lib/services/espn')

describe('API Route: /api/live/scores (SSE)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/live/scores', () => {
    it('should return SSE response with correct headers', async () => {
      const mockScoreboard = [
        {
          gameId: 'game-1',
          homeTeam: 'KC',
          awayTeam: 'BUF',
          homeScore: 24,
          awayScore: 21,
          quarter: '4th',
          timeRemaining: '2:15',
          status: 'live',
        },
      ]

      ;(ESPNService.prototype.getScoreboard as jest.Mock).mockResolvedValue(mockScoreboard)

      const request = new NextRequest('http://localhost:3000/api/live/scores')
      const response = await GET(request)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should return a ReadableStream', async () => {
      const request = new NextRequest('http://localhost:3000/api/live/scores')
      const response = await GET(request)

      expect(response.body).toBeInstanceOf(ReadableStream)
    })

    it('should have correct content-type for SSE', async () => {
      const request = new NextRequest('http://localhost:3000/api/live/scores')
      const response = await GET(request)

      expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    })

    it('should disable caching for SSE', async () => {
      const request = new NextRequest('http://localhost:3000/api/live/scores')
      const response = await GET(request)

      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toContain('no-cache')
    })

    it('should disable nginx buffering', async () => {
      const request = new NextRequest('http://localhost:3000/api/live/scores')
      const response = await GET(request)

      expect(response.headers.get('X-Accel-Buffering')).toBe('no')
    })
  })

  describe('Error Handling', () => {
    it('should handle ESPN service errors gracefully', async () => {
      ;(ESPNService.prototype.getScoreboard as jest.Mock).mockRejectedValue(
        new Error('ESPN API error')
      )

      const request = new NextRequest('http://localhost:3000/api/live/scores')
      const response = await GET(request)

      // Should still return a valid SSE response even with errors
      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })

  describe('Configuration', () => {
    it('should be configured for dynamic rendering', () => {
      // Check that the route exports dynamic config
      const route = require('@/app/api/live/scores/route')
      expect(route.dynamic).toBe('force-dynamic')
    })

    it('should use nodejs runtime', () => {
      const route = require('@/app/api/live/scores/route')
      expect(route.runtime).toBe('nodejs')
    })
  })
})

