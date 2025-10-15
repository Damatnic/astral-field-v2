import { POST } from '@/app/api/teams/lineup/route'
import { prisma } from '@/lib/database/prisma'

// Mock Prisma
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    rosterPlayer: {
      updateMany: jest.fn()
    }
  }
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {}))
    })
  },
  NextRequest: class MockNextRequest {
    public json: () => Promise<any>
    constructor(body: any) {
      this.json = async () => body
    }
  }
}))

describe('/api/teams/lineup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 if teamId is missing', async () => {
    const mockRequest = {
      json: async () => ({ roster: [] })
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Team ID and roster are required')
  })

  it('returns 400 if roster is missing', async () => {
    const mockRequest = {
      json: async () => ({ teamId: 'team-123' })
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Team ID and roster are required')
  })

  it('updates roster players successfully', async () => {
    const mockRoster = [
      { playerId: 'player-1', isStarter: true },
      { playerId: 'player-2', isStarter: false }
    ]

    const mockRequest = {
      json: async () => ({
        teamId: 'team-123',
        roster: mockRoster
      })
    } as any

    ;(prisma.rosterPlayer.updateMany as jest.Mock).mockResolvedValue({ count: 1 })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updated).toBe(2)
    expect(prisma.rosterPlayer.updateMany).toHaveBeenCalledTimes(2)
  })

  it('handles database errors gracefully', async () => {
    const mockRequest = {
      json: async () => ({
        teamId: 'team-123',
        roster: [{ playerId: 'player-1', isStarter: true }]
      })
    } as any

    ;(prisma.rosterPlayer.updateMany as jest.Mock).mockRejectedValue(
      new Error('Database error')
    )

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

