/**
 * Health Check API Route Tests
 * 
 * Tests for /api/health endpoint
 */

import { GET } from '@/app/api/health/route'
import { prisma, checkDatabaseHealth } from '@/lib/prisma'

jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn()
    }
  },
  checkDatabaseHealth: jest.fn()
}))

describe('API Route: /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AUTH_SECRET = 'test-secret'
    process.env.DATABASE_URL = 'postgresql://test'
  })

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ version: 'PostgreSQL 14' }])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(10)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.database.connected).toBe(true)
    })

    it('should return unhealthy status when database is disconnected', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(false)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.database.connected).toBe(false)
    })

    it('should include timestamp', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)

      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should include database version', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ version: 'PostgreSQL 14' }])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(5)

      const response = await GET()
      const data = await response.json()

      expect(data.database.version).toBeDefined()
    })

    it('should include user count', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(42)

      const response = await GET()
      const data = await response.json()

      expect(data.database.userCount).toBe(42)
    })

    it('should check environment variables', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)

      const response = await GET()
      const data = await response.json()

      expect(data.environment).toBeDefined()
      expect(data.environment.hasAuthSecret).toBe(true)
      expect(data.environment.hasDatabaseUrl).toBe(true)
    })

    it('should include deployment information', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
      process.env.VERCEL_URL = 'test.vercel.app'
      process.env.VERCEL_ENV = 'production'

      const response = await GET()
      const data = await response.json()

      expect(data.deployment).toBeDefined()
      expect(data.deployment.vercelUrl).toBe('test.vercel.app')
      expect(data.deployment.vercelEnv).toBe('production')
    })

    it('should handle database query errors gracefully', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Query failed'))
      ;(prisma.user.count as jest.Mock).mockRejectedValue(new Error('Count failed'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.database.version).toBeNull()
      expect(data.database.userCount).toBeNull()
    })

    it('should handle complete failure', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockRejectedValue(new Error('Connection failed'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.status).toBe('error')
      expect(data.error).toBeDefined()
    })

    it('should set no-cache headers', async () => {
      ;(checkDatabaseHealth as jest.Mock).mockResolvedValue(true)
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)

      const response = await GET()

      expect(response.headers.get('Cache-Control')).toContain('no-store')
    })
  })
})
