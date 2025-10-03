/**
 * Security Dashboard API Route Tests
 * 
 * Tests for /api/security/dashboard endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/security/dashboard/route'
import { auth } from '@/lib/auth'
import { guardianAuditLogger } from '@/lib/security/audit-logger'
import { guardianSessionManager } from '@/lib/security/session-manager'
import { guardianAccountProtection } from '@/lib/security/account-protection'
import { rateLimiter } from '@/lib/security/rate-limiter'
import { guardianSecurityHeaders } from '@/lib/security/security-headers'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

jest.mock('@/lib/auth')
jest.mock('@/lib/security/audit-logger')
jest.mock('@/lib/security/session-manager')
jest.mock('@/lib/security/account-protection')
jest.mock('@/lib/security/rate-limiter')
jest.mock('@/lib/security/security-headers')
jest.mock('@/lib/security/rate-limit-middleware')
jest.mock('@/lib/security/privacy-protection')

describe('API Route: /api/security/dashboard', () => {
  const mockSession = {
    user: { id: 'user-123', email: 'admin@example.com', role: 'admin' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(mockSession)
    ;(withRateLimit as jest.Mock).mockImplementation(() => {
      return async (req: NextRequest, handler: Function) => handler(req)
    })
    ;(guardianAuditLogger.getSecurityMetrics as jest.Mock).mockReturnValue({
      eventsToday: 10,
      incidentsToday: 0,
      averageRiskScore: 0.3,
      topThreatCategories: [],
      severityDistribution: {}
    })
    ;(guardianSessionManager.getSessionStats as jest.Mock).mockReturnValue({
      activeSessions: 5,
      averageRiskScore: 0.2,
      highRiskSessions: 0
    })
    ;(guardianAccountProtection.getAccountStatuses as jest.Mock).mockReturnValue([])
    ;(guardianAccountProtection.getLockedAccounts as jest.Mock).mockReturnValue([])
    ;(rateLimiter.getMetrics as jest.Mock).mockReturnValue({
      totalRequests: 100,
      blockedRequests: 10
    })
    ;(guardianSecurityHeaders.getSecurityScore as jest.Mock).mockReturnValue({
      score: 95,
      recommendations: []
    })
  })

  describe('GET /api/security/dashboard', () => {
    describe('Authentication', () => {
      it('should require authentication', async () => {
        ;(auth as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(401)
      })
    })

    describe('Dashboard Data', () => {
      it('should return security dashboard', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.overview).toBeDefined()
      })

      it('should include overview section', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(data.overview.securityLevel).toBeDefined()
        expect(data.overview.overallScore).toBeDefined()
        expect(data.overview.status).toBeDefined()
      })

      it('should include authentication metrics', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(data.authentication).toBeDefined()
        expect(data.authentication.activeSessions).toBe(5)
      })

      it('should include threat metrics', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(data.threats).toBeDefined()
        expect(data.threats.eventsToday).toBe(10)
      })

      it('should include compliance metrics', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(data.compliance).toBeDefined()
        expect(data.compliance.gdprCompliance).toBeDefined()
      })

      it('should include infrastructure metrics', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(data.infrastructure).toBeDefined()
        expect(data.infrastructure.securityHeadersScore).toBe(95)
      })

      it('should include recommendations', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)
        const data = await response.json()

        expect(data.recommendations).toBeDefined()
        expect(Array.isArray(data.recommendations)).toBe(true)
      })
    })

    describe('Rate Limiting', () => {
      it('should apply rate limiting', async () => {
        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        await GET(request)

        expect(withRateLimit).toHaveBeenCalledWith({ ruleKey: 'api:sensitive' })
      })
    })

    describe('Error Handling', () => {
      it('should handle errors gracefully', async () => {
        ;(guardianAuditLogger.getSecurityMetrics as jest.Mock).mockImplementation(() => {
          throw new Error('Test error')
        })

        const request = new NextRequest('http://localhost:3000/api/security/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(500)
      })
    })
  })
})
