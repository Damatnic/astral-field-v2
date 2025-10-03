/**
 * Setup API Route Tests
 * 
 * Tests for /api/setup endpoint
 */

import { GET } from '@/app/api/setup/route'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

jest.mock('@prisma/client')
jest.mock('bcryptjs')
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => callback(null, { stdout: 'Success', stderr: '' }))
}))
jest.mock('util', () => ({
  promisify: jest.fn((fn) => jest.fn().mockResolvedValue({ stdout: 'Success', stderr: '' }))
}))

describe('API Route: /api/setup', () => {
  const mockPrisma = {
    user: {
      upsert: jest.fn()
    },
    $disconnect: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')
  })

  describe('GET /api/setup', () => {
    it('should complete database setup', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('completed successfully')
    })

    it('should seed users', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const response = await GET()
      const data = await response.json()

      expect(data.seeding).toBeDefined()
      expect(data.seeding.successful).toBeGreaterThan(0)
    })

    it('should return password', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const response = await GET()
      const data = await response.json()

      expect(data.password).toBe('Dynasty2025!')
    })

    it('should handle errors', async () => {
      mockPrisma.user.upsert.mockRejectedValue(new Error('DB error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })
})
