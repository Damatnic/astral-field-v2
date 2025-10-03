/**
 * Team Lineup API Route Tests
 * 
 * Tests for /api/teams/lineup endpoint
 */

import { NextRequest } from 'next/server'
import { PUT, GET } from '@/app/api/teams/lineup/route'
import { auth } from '@/lib/auth'
import { phoenixDb } from '@/lib/optimized-prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/optimized-prisma')

describe('API Route: /api/teams/lineup', () => {
  const mockSession = {
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
  }

  const validRoster = [
    { id: 'rp1', position: 'QB' as const, isStarter: true },
    { id: 'rp2', position: 'RB' as const, isStarter: true },
    { id: 'rp3', position: 'RB' as const, isStarter: true },
    { id: 'rp4', position: 'WR' as const, isStarter: true },
    { id: 'rp5', position: 'WR' as const, isStarter: true },
    { id: 'rp6', position: 'TE' as const, isStarter: true },
    { id: 'rp7', position: 'K' as const, isStarter: true },
    { id: 'rp8', position: 'DEF' as const, isStarter: true },
    { id: 'rp9', position: 'BENCH' as const, isStarter: false }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('PUT /api/teams/lineup', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({ teamId: 'team-123', roster: validRoster })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('UNAUTHORIZED')
      })
    })

    describe('Validation', () => {
      it('should validate teamId format', async () => {
        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({ teamId: 'invalid', roster: validRoster })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.code).toBe('VALIDATION_ERROR')
      })

      it('should validate roster array', async () => {
        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({ teamId: 'cltest123456789012', roster: [] })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should validate position enum', async () => {
        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: [{ id: 'clrp123456789012', position: 'INVALID', isStarter: true }]
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })
    })

    describe('Lineup Validation', () => {
      it('should reject lineup with too few QBs', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [{
            id: 'cltest123456789012',
            leagueId: 'league-123',
            roster: validRoster.map(r => ({ id: r.id }))
          }]
        })

        const invalidRoster = validRoster.filter(r => r.position !== 'QB')

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: invalidRoster
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.code).toBe('INVALID_LINEUP')
        expect(data.details).toContain(expect.stringContaining('QB'))
      })

      it('should reject lineup with too many starters', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [{
            id: 'cltest123456789012',
            leagueId: 'league-123',
            roster: validRoster.map(r => ({ id: r.id }))
          }]
        })

        const tooManyStarters = [...validRoster, { id: 'rp10', position: 'WR' as const, isStarter: true }]

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: tooManyStarters
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.code).toBe('INVALID_LINEUP')
      })

      it('should allow skipping validation', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [{
            id: 'cltest123456789012',
            leagueId: 'league-123',
            roster: validRoster.map(r => ({ id: r.id }))
          }]
        })
        ;(phoenixDb.updateRosterBatch as jest.Mock).mockResolvedValue({})
        ;(phoenixDb.clearCache as jest.Mock).mockResolvedValue(undefined)

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: [{ id: 'clrp123456789012', position: 'QB', isStarter: true }],
            validateLineup: false
          })
        })

        const response = await PUT(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Team Ownership', () => {
      it('should verify team ownership', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: []
        })

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: validRoster
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.code).toBe('TEAM_NOT_FOUND')
      })

      it('should validate roster player IDs', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [{
            id: 'cltest123456789012',
            leagueId: 'league-123',
            roster: [{ id: 'rp1' }]
          }]
        })

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: [{ id: 'invalid-id', position: 'QB', isStarter: true }]
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.code).toBe('INVALID_ROSTER_IDS')
      })
    })

    describe('Successful Update', () => {
      it('should update lineup successfully', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [{
            id: 'cltest123456789012',
            leagueId: 'league-123',
            roster: validRoster.map(r => ({ id: r.id }))
          }]
        })
        ;(phoenixDb.updateRosterBatch as jest.Mock).mockResolvedValue({})
        ;(phoenixDb.clearCache as jest.Mock).mockResolvedValue(undefined)

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: validRoster
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.playersUpdated).toBe(validRoster.length)
      })

      it('should clear caches after update', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [{
            id: 'cltest123456789012',
            leagueId: 'league-123',
            roster: validRoster.map(r => ({ id: r.id }))
          }]
        })
        ;(phoenixDb.updateRosterBatch as jest.Mock).mockResolvedValue({})
        ;(phoenixDb.clearCache as jest.Mock).mockResolvedValue(undefined)

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: validRoster
          })
        })

        await PUT(request)

        expect(phoenixDb.clearCache).toHaveBeenCalledWith('user:user-123')
        expect(phoenixDb.clearCache).toHaveBeenCalledWith('teams:league-123')
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/teams/lineup', {
          method: 'PUT',
          body: JSON.stringify({
            teamId: 'cltest123456789012',
            roster: validRoster
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.code).toBe('INTERNAL_ERROR')
      })
    })
  })

  describe('GET /api/teams/lineup', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/teams/lineup?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('UNAUTHORIZED')
      })
    })

    describe('Validation', () => {
      it('should require teamId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/teams/lineup')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.code).toBe('MISSING_TEAM_ID')
      })
    })

    describe('Successful Retrieval', () => {
      it('should retrieve lineup successfully', async () => {
        const mockTeam = {
          id: 'team-123',
          name: 'Test Team',
          league: { id: 'league-123', name: 'Test League' },
          roster: [
            {
              id: 'rp1',
              position: 'QB',
              isStarter: true,
              player: { id: 'p1', name: 'Player 1' }
            }
          ]
        }

        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: [mockTeam]
        })

        const request = new NextRequest('http://localhost:3000/api/teams/lineup?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.team.id).toBe('team-123')
        expect(data.data.roster).toHaveLength(1)
      })

      it('should return 404 for non-existent team', async () => {
        ;(phoenixDb.findUserWithRelations as jest.Mock).mockResolvedValue({
          teams: []
        })

        const request = new NextRequest('http://localhost:3000/api/teams/lineup?teamId=team-123')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.code).toBe('TEAM_NOT_FOUND')
      })
    })
  })
})
