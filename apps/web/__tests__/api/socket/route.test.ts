/**
 * Socket API Route Tests
 * 
 * Tests for /api/socket endpoint
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/socket/route'

jest.mock('@/lib/auth')
jest.mock('@/lib/prisma')
jest.mock('socket.io')

describe('API Route: /api/socket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/socket', () => {
    it('should return initialization message', async () => {
      const request = new NextRequest('http://localhost:3000/api/socket')
      const response = await GET(request)
      const data = await response.json()

      expect(data.message).toBeDefined()
    })

    it('should handle initialization', async () => {
      const request = new NextRequest('http://localhost:3000/api/socket?init=true')
      const response = await GET(request)

      expect(response.status).toBeLessThan(500)
    })
  })

  describe('POST /api/socket', () => {
    it('should handle POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/socket', {
        method: 'POST'
      })
      const response = await POST(request)

      expect(response.status).toBeLessThan(500)
    })
  })
})
