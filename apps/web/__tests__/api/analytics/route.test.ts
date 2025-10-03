/**
 * Analytics API Route Tests
 * 
 * Tests for /api/analytics endpoint
 */

import { NextRequest } from 'next/server'
import { GET, POST, OPTIONS } from '@/app/api/analytics/route'
import { auth } from '@/lib/auth'

jest.mock('@/lib/auth')

describe('API Route: /api/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/analytics', () => {
    it('should return health check', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.service).toBe('analytics')
      expect(data.timestamp).toBeDefined()
    })

    it('should include timestamp in ISO format', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('POST /api/analytics', () => {
    describe('Validation', () => {
      it('should require event type', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ data: {} })
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(response.status).toBe(400)
        expect(data.error).toContain('Event type required')
      })

      it('should accept valid event', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'page_view', data: {} })
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('User Attribution', () => {
      it('should track authenticated users', async () => {
        ;(auth as jest.Mock).mockResolvedValue({
          user: { id: 'user-123' }
        })
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'button_click', data: {} })
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        expect(auth).toHaveBeenCalled()
      })

      it('should handle anonymous users', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'page_view', data: {} })
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should handle auth errors gracefully', async () => {
        ;(auth as jest.Mock).mockRejectedValue(new Error('Auth error'))
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'page_view', data: {} })
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
      })
    })

    describe('Event Types', () => {
      it('should handle page_view events', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({
            event: 'page_view',
            data: { page: '/dashboard' }
          })
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.event).toBe('page_view')
      })

      it('should handle button_click events', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({
            event: 'button_click',
            data: { button: 'submit' }
          })
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
      })

      it('should handle custom events', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({
            event: 'custom_event',
            data: { custom: 'data' }
          })
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
      })
    })

    describe('Client Information', () => {
      it('should capture user agent', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'page_view', data: {} }),
          headers: {
            'user-agent': 'Mozilla/5.0'
          }
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
      })

      it('should capture referer', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'page_view', data: {} }),
          headers: {
            'referer': 'https://example.com'
          }
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
      })

      it('should capture IP address', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'page_view', data: {} }),
          headers: {
            'x-forwarded-for': '1.2.3.4'
          }
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(200)
      })
    })

    describe('Response Format', () => {
      it('should return success response', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'test', data: {} })
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(data.success).toBe(true)
        expect(data.timestamp).toBeDefined()
        expect(data.event).toBe('test')
      })

      it('should include timestamp', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)
        
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({ event: 'test', data: {} })
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      })
    })

    describe('Error Handling', () => {
      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: 'invalid json{'
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(500)
      })

      it('should handle missing body', async () => {
        const request = new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          body: JSON.stringify({})
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(response.status).toBe(400)
      })
    })
  })

  describe('OPTIONS /api/analytics', () => {
    it('should handle CORS preflight', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'OPTIONS'
      })
      
      const response = await OPTIONS(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })

    it('should allow required headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'OPTIONS'
      })
      
      const response = await OPTIONS(request)
      
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
    })
  })
})
