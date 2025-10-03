/**
 * Realtime League API Route Tests
 * 
 * Tests for /api/realtime/league/[leagueId] SSE endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/realtime/league/[leagueId]/route'
import { phoenixDb } from '@/lib/optimized-prisma'

jest.mock('@/lib/optimized-prisma')
jest.mock('@/lib/cache/catalyst-cache')

describe('API Route: /api/realtime/league/[leagueId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(phoenixDb.getCachedResult as jest.Mock).mockResolvedValue(null)
    ;(phoenixDb.setCachedResult as jest.Mock).mockResolvedValue(undefined)
    ;(phoenixDb.calculateLeagueStandings as jest.Mock).mockResolvedValue({})
  })

  describe('GET /api/realtime/league/[leagueId]', () => {
    it('should return SSE stream', async () => {
      const request = new NextRequest('http://localhost:3000/api/realtime/league/league-123')
      const params = { params: { leagueId: 'league-123' } }

      const response = await GET(request, params)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should set proper SSE headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/realtime/league/league-123')
      const params = { params: { leagueId: 'league-123' } }

      const response = await GET(request, params)

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should set CORS headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/realtime/league/league-123')
      const params = { params: { leagueId: 'league-123' } }

      const response = await GET(request, params)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('should return readable stream', async () => {
      const request = new NextRequest('http://localhost:3000/api/realtime/league/league-123')
      const params = { params: { leagueId: 'league-123' } }

      const response = await GET(request, params)

      expect(response.body).toBeDefined()
    })
  })
})
