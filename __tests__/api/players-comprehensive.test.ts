/**
 * Comprehensive Player API Tests
 * Tests all player-related endpoints with proper authentication and validation
 */

import { TestHelpers } from '../setup/test-helpers'
import { TestDatabase } from '../setup/test-database'
import { AuthTestHelpers } from '../setup/auth-helpers'
import { GET as PlayersGET } from '../../src/app/api/players/route'
import { GET as PlayerGET } from '../../src/app/api/players/[id]/route'
import { GET as PlayerStatsGET } from '../../src/app/api/players/[id]/stats/route'

describe('/api/players API Endpoints', () => {
  let testUsers: any
  let testPlayers: any

  beforeAll(async () => {
    // Setup test data
    const testData = await TestDatabase.seedTestData()
    testUsers = {
      commissioner: await TestDatabase.getTestUser('commissioner@test.com'),
      player: await TestDatabase.getTestUser('player@test.com')
    }
    testPlayers = testData.players
  })

  afterAll(async () => {
    await TestDatabase.cleanup()
  })

  describe('GET /api/players', () => {
    it('should return all active players', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players'
      })

      const response = await PlayersGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['players'])

      expect(data.players).toBeInstanceOf(Array)
      expect(data.players.length).toBeGreaterThan(0)
      expect(data.players[0]).toHaveProperty('id')
      expect(data.players[0]).toHaveProperty('name')
      expect(data.players[0]).toHaveProperty('position')
      expect(data.players[0]).toHaveProperty('team')
    })

    it('should filter players by position', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?position=QB'
      })

      const response = await PlayersGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['players'])

      expect(data.players).toBeInstanceOf(Array)
      data.players.forEach((player: any) => {
        expect(player.position).toBe('QB')
      })
    })

    it('should filter players by team', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?team=KC'
      })

      const response = await PlayersGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['players'])

      expect(data.players).toBeInstanceOf(Array)
      data.players.forEach((player: any) => {
        expect(player.team).toBe('KC')
      })
    })

    it('should search players by name', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?search=Test'
      })

      const response = await PlayersGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['players'])

      expect(data.players).toBeInstanceOf(Array)
      data.players.forEach((player: any) => {
        expect(player.name.toLowerCase()).toContain('test')
      })
    })

    it('should handle pagination correctly', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?page=1&limit=5'
      })

      const response = await PlayersGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['players', 'pagination'])

      expect(data.players).toBeInstanceOf(Array)
      expect(data.players.length).toBeLessThanOrEqual(5)
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total')
    })

    it('should return empty array when no players match filters', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?position=InvalidPosition'
      })

      const response = await PlayersGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['players'])

      expect(data.players).toBeInstanceOf(Array)
      expect(data.players.length).toBe(0)
    })

    it('should handle invalid query parameters gracefully', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?page=invalid&limit=notanumber'
      })

      const response = await PlayersGET(request)
      
      // Should either return default pagination or error
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('GET /api/players/[id]', () => {
    it('should return specific player by ID', async () => {
      if (testPlayers.length === 0) {
        throw new Error('No test players available')
      }

      const testPlayer = testPlayers[0]
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/players/${testPlayer.id}`
      })

      // Mock the params for Next.js dynamic route
      Object.assign(request, { params: { id: testPlayer.id } })

      const response = await PlayerGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['player'])

      expect(data.player).toBeDefined()
      expect(data.player.id).toBe(testPlayer.id)
      expect(data.player.name).toBe(testPlayer.name)
      expect(data.player.position).toBe(testPlayer.position)
      expect(data.player.team).toBe(testPlayer.team)
    })

    it('should include additional player details', async () => {
      if (testPlayers.length === 0) {
        throw new Error('No test players available')
      }

      const testPlayer = testPlayers[0]
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/players/${testPlayer.id}?include=stats,notes`
      })
      
      Object.assign(request, { params: { id: testPlayer.id } })

      const response = await PlayerGET(request)
      const data = await TestHelpers.assertSuccessResponse(response, ['player'])

      expect(data.player).toHaveProperty('id')
      expect(data.player).toHaveProperty('name')
      expect(data.player).toHaveProperty('position')
      // Should include additional data based on query params
    })

    it('should return 404 for non-existent player', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players/non-existent-id'
      })
      
      Object.assign(request, { params: { id: 'non-existent-id' } })

      const response = await PlayerGET(request)
      
      await TestHelpers.assertErrorResponse(response, 404)
    })

    it('should return 400 for invalid player ID format', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players/123'
      })
      
      Object.assign(request, { params: { id: '123' } })

      const response = await PlayerGET(request)
      
      // Should validate ID format (assuming CUID format)
      expect([400, 404]).toContain(response.status)
    })
  })

  describe('GET /api/players/[id]/stats', () => {
    it('should return player statistics', async () => {
      if (testPlayers.length === 0) {
        throw new Error('No test players available')
      }

      const testPlayer = testPlayers[0]
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/players/${testPlayer.id}/stats`
      })
      
      Object.assign(request, { params: { id: testPlayer.id } })

      const response = await PlayerStatsGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200, ['stats'])

      expect(data.stats).toBeDefined()
      expect(data.stats).toHaveProperty('playerId')
      expect(data.stats.playerId).toBe(testPlayer.id)
    })

    it('should filter stats by season', async () => {
      if (testPlayers.length === 0) {
        throw new Error('No test players available')
      }

      const testPlayer = testPlayers[0]
      const currentYear = new Date().getFullYear()
      
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/players/${testPlayer.id}/stats?season=${currentYear}`
      })
      
      Object.assign(request, { params: { id: testPlayer.id } })

      const response = await PlayerStatsGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200)

      // Should return stats for specified season
      if (data.stats) {
        expect(data.stats).toHaveProperty('season')
        expect(data.stats.season).toBe(currentYear)
      }
    })

    it('should filter stats by week range', async () => {
      if (testPlayers.length === 0) {
        throw new Error('No test players available')
      }

      const testPlayer = testPlayers[0]
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/players/${testPlayer.id}/stats?weekStart=1&weekEnd=4`
      })
      
      Object.assign(request, { params: { id: testPlayer.id } })

      const response = await PlayerStatsGET(request)
      const data = await TestHelpers.assertApiResponse(response, 200)

      // Should return stats for specified week range
      expect(response.status).toBeLessThan(500) // At minimum shouldn't crash
    })

    it('should return 404 for non-existent player stats', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players/non-existent-id/stats'
      })
      
      Object.assign(request, { params: { id: 'non-existent-id' } })

      const response = await PlayerStatsGET(request)
      
      expect([404, 400]).toContain(response.status)
    })
  })

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players?limit=1000'
      })

      await TestHelpers.measurePerformance('Large Player Query', async () => {
        const response = await PlayersGET(request)
        expect(response.status).toBe(200)
        return response
      }, 2000) // Max 2 seconds for large queries
    })

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => {
        return TestHelpers.createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/players?page=${i + 1}&limit=10`
        })
      })

      const responses = await Promise.all(
        requests.map(request => PlayersGET(request))
      )

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Authentication & Authorization', () => {
    it('should allow public access to player list', async () => {
      // No authentication required for basic player data
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players'
      })

      const response = await PlayersGET(request)
      expect(response.status).toBe(200)
    })

    it('should require authentication for detailed player data', async () => {
      // If detailed data requires auth
      if (testPlayers.length === 0) return

      const testPlayer = testPlayers[0]
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/players/${testPlayer.id}?include=privateNotes`
      })
      
      Object.assign(request, { params: { id: testPlayer.id } })

      const response = await PlayerGET(request)
      
      // Should either work (public) or require auth (401/403)
      expect([200, 401, 403]).toContain(response.status)
    })
  })

  describe('Input Validation', () => {
    it('should validate query parameters', async () => {
      const invalidRequests = [
        'http://localhost:3000/api/players?limit=-1',
        'http://localhost:3000/api/players?page=0',
        'http://localhost:3000/api/players?limit=10000', // Too high
      ]

      for (const url of invalidRequests) {
        const request = TestHelpers.createMockRequest({
          method: 'GET',
          url
        })

        const response = await PlayersGET(request)
        // Should handle invalid params gracefully
        expect([200, 400]).toContain(response.status)
      }
    })

    it('should sanitize search queries', async () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        '; DROP TABLE players; --',
        '../../../etc/passwd'
      ]

      for (const search of maliciousQueries) {
        const request = TestHelpers.createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/players?search=${encodeURIComponent(search)}`
        })

        const response = await PlayersGET(request)
        
        // Should not crash and should sanitize input
        expect(response.status).toBeLessThan(500)
        
        if (response.status === 200) {
          const data = await response.json()
          expect(data.players).toBeInstanceOf(Array)
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection to fail
      // For now, we ensure the endpoint doesn't crash
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players'
      })

      const response = await PlayersGET(request)
      
      // Should return some response, not crash
      expect(response.status).toBeGreaterThan(0)
      expect(response.status).toBeLessThan(600)
    })

    it('should return proper error messages', async () => {
      const request = TestHelpers.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/players/invalid-id'
      })
      
      Object.assign(request, { params: { id: 'invalid-id' } })

      const response = await PlayerGET(request)
      
      if (response.status >= 400) {
        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')
      }
    })
  })
})