/**
 * Settings API Route Tests
 * 
 * Tests for /api/settings endpoint
 */

import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/settings/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn()
    }
  }
}))

describe('API Route: /api/settings', () => {
  const mockSession = {
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
  }

  const validSettings = {
    name: 'Updated Name',
    teamName: 'Updated Team',
    emailNotifications: true,
    pushNotifications: false,
    theme: 'dark' as const,
    timezone: 'America/New_York',
    favoriteTeam: 'KC'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('PUT /api/settings', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify(validSettings)
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Validation', () => {
      it('should validate theme enum', async () => {
        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            ...validSettings,
            theme: 'invalid'
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid data')
      })

      it('should validate name length', async () => {
        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            ...validSettings,
            name: 'a'.repeat(101)
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
      })

      it('should accept valid settings', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify(validSettings)
        })

        const response = await PUT(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Settings Update', () => {
      it('should update user settings', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify(validSettings)
        })

        await PUT(request)

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            name: 'Updated Name',
            teamName: 'Updated Team'
          })
        })
      })

      it('should handle optional fields', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const minimalSettings = {
          emailNotifications: true,
          pushNotifications: false,
          theme: 'dark' as const,
          timezone: 'UTC'
        }

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify(minimalSettings)
        })

        const response = await PUT(request)

        expect(response.status).toBe(200)
      })

      it('should return success response', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify(validSettings)
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(data.success).toBe(true)
      })
    })

    describe('Theme Options', () => {
      it('should accept light theme', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ ...validSettings, theme: 'light' })
        })

        const response = await PUT(request)

        expect(response.status).toBe(200)
      })

      it('should accept dark theme', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ ...validSettings, theme: 'dark' })
        })

        const response = await PUT(request)

        expect(response.status).toBe(200)
      })

      it('should accept system theme', async () => {
        ;(prisma.user.update as jest.Mock).mockResolvedValue({})

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ ...validSettings, theme: 'system' })
        })

        const response = await PUT(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        ;(prisma.user.update as jest.Mock).mockRejectedValue(
          new Error('Database error')
        )

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: JSON.stringify(validSettings)
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'PUT',
          body: 'invalid json{'
        })

        const response = await PUT(request)

        expect(response.status).toBe(500)
      })
    })
  })
})
