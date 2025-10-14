/**
 * Trades API Route Tests
 * 
 * Tests for /api/trades endpoint
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/trades/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    tradeProposal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    team: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    player: {
      findMany: jest.fn()
    },
    rosterPlayer: {
      findMany: jest.fn(),
      updateMany: jest.fn()
    },
    tradeHistory: {
      create: jest.fn()
    },
    notification: {
      create: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    }
  }
}))

describe('API Route: /api/trades', () => {
  const mockSession = {
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('GET /api/trades', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/trades')
        const response = await GET(request)

        expect(response.status).toBe(401)
      })
    })

    describe('Trade Proposals', () => {
      it('should fetch trade proposals', async () => {
        ;(prisma.team.findMany as jest.Mock).mockResolvedValue([{ id: 'team-1' }])
        ;(prisma.tradeProposal.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/trades?action=proposals')
        const response = await GET(request)

        expect(response.status).toBe(200)
      })

      it('should filter by leagueId', async () => {
        ;(prisma.tradeProposal.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/trades?leagueId=league-123')
        await GET(request)

        expect(prisma.tradeProposal.findMany).toHaveBeenCalled()
      })

      it('should filter by status', async () => {
        ;(prisma.tradeProposal.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/trades?status=PENDING')
        await GET(request)

        expect(prisma.tradeProposal.findMany).toHaveBeenCalled()
      })
    })

    describe('Trade History', () => {
      it('should fetch trade history', async () => {
        ;(prisma.tradeProposal.findMany as jest.Mock).mockResolvedValue([])

        const request = new NextRequest('http://localhost:3000/api/trades?action=history')
        const response = await GET(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Trade Analytics', () => {
      it('should fetch trade analytics', async () => {
        ;(prisma.tradeProposal.count as jest.Mock).mockResolvedValue(10)

        const request = new NextRequest('http://localhost:3000/api/trades?action=analytics')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveProperty('totalTrades')
      })
    })
  })

  describe('POST /api/trades', () => {
    describe('Propose Trade', () => {
      it('should propose a trade', async () => {
        ;(prisma.team.findUnique as jest.Mock).mockResolvedValue({
          id: 'team-1',
          ownerId: 'user-123',
          leagueId: 'league-1',
          owner: { name: 'Test User' }
        })
        ;(prisma.rosterPlayer.findMany as jest.Mock).mockResolvedValue([
          { playerId: 'player-1' }
        ])
        ;(prisma.tradeProposal.create as jest.Mock).mockResolvedValue({
          id: 'trade-1',
          proposingTeam: { owner: { name: 'Test' } },
          receivingTeam: { owner: { name: 'Other' } }
        })
        ;(prisma.tradeHistory.create as jest.Mock).mockResolvedValue({})
        ;(prisma.notification.create as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/trades', {
          method: 'POST',
          body: JSON.stringify({
            action: 'propose',
            proposingTeamId: 'team-1',
            receivingTeamId: 'team-2',
            givingPlayers: ['player-1'],
            receivingPlayers: ['player-2']
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should verify team ownership', async () => {
        ;(prisma.team.findUnique as jest.Mock).mockResolvedValue({
          id: 'team-1',
          ownerId: 'other-user',
          leagueId: 'league-1'
        })

        const request = new NextRequest('http://localhost:3000/api/trades', {
          method: 'POST',
          body: JSON.stringify({
            action: 'propose',
            proposingTeamId: 'team-1',
            receivingTeamId: 'team-2',
            givingPlayers: ['player-1'],
            receivingPlayers: ['player-2']
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(403)
      })
    })

    describe('Respond to Trade', () => {
      it('should accept a trade', async () => {
        ;(prisma.tradeProposal.findUnique as jest.Mock).mockResolvedValue({
          id: 'trade-1',
          status: 'PENDING',
          proposingTeamId: 'team-1',
          receivingTeamId: 'team-2',
          givingPlayerIds: '["player-1"]',
          receivingPlayerIds: '["player-2"]',
          proposingTeam: { ownerId: 'user-1', owner: { name: 'User 1' } },
          receivingTeam: { ownerId: 'user-123', owner: { name: 'User 2' }, name: 'Team 2' }
        })
        ;(prisma.tradeProposal.update as jest.Mock).mockResolvedValue({})
        ;(prisma.tradeHistory.create as jest.Mock).mockResolvedValue({})
        ;(prisma.notification.create as jest.Mock).mockResolvedValue({})
        ;(prisma.rosterPlayer.updateMany as jest.Mock).mockResolvedValue({})
        ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/trades', {
          method: 'POST',
          body: JSON.stringify({
            action: 'respond',
            tradeId: 'trade-1',
            response: 'ACCEPTED'
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should reject a trade', async () => {
        ;(prisma.tradeProposal.findUnique as jest.Mock).mockResolvedValue({
          id: 'trade-1',
          status: 'PENDING',
          proposingTeam: { ownerId: 'user-1', owner: { name: 'User 1' } },
          receivingTeam: { ownerId: 'user-123', owner: { name: 'User 2' }, name: 'Team 2' }
        })
        ;(prisma.tradeProposal.update as jest.Mock).mockResolvedValue({})
        ;(prisma.tradeHistory.create as jest.Mock).mockResolvedValue({})
        ;(prisma.notification.create as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/trades', {
          method: 'POST',
          body: JSON.stringify({
            action: 'respond',
            tradeId: 'trade-1',
            response: 'REJECTED'
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Cancel Trade', () => {
      it('should cancel a trade', async () => {
        ;(prisma.tradeProposal.findUnique as jest.Mock).mockResolvedValue({
          id: 'trade-1',
          status: 'PENDING',
          proposingTeam: { ownerId: 'user-123', owner: { id: 'user-123' } }
        })
        ;(prisma.tradeProposal.update as jest.Mock).mockResolvedValue({})
        ;(prisma.tradeHistory.create as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/trades', {
          method: 'POST',
          body: JSON.stringify({
            action: 'cancel',
            tradeId: 'trade-1'
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Error Handling', () => {
      it('should handle invalid action', async () => {
        const request = new NextRequest('http://localhost:3000/api/trades', {
          method: 'POST',
          body: JSON.stringify({
            action: 'invalid'
          })
        })

        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should handle database errors', async () => {
        ;(prisma.team.findMany as jest.Mock).mockRejectedValue(new Error('DB error'))

        const request = new NextRequest('http://localhost:3000/api/trades')
        const response = await GET(request)

        expect(response.status).toBe(500)
      })
    })
  })
})
