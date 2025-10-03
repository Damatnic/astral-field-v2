/**
 * Monitoring Health API Route Tests
 * 
 * Tests for /api/monitoring/health endpoint
 */

import { GET } from '@/app/api/monitoring/health/route'

describe('API Route: /api/monitoring/health', () => {
  describe('GET /api/monitoring/health', () => {
    it('should return health status', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
    })

    it('should include timestamp', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should include metrics', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.metrics).toBeDefined()
      expect(data.metrics.errorRate).toBeDefined()
      expect(data.metrics.avgResponseTime).toBeDefined()
      expect(data.metrics.memoryUsage).toBeDefined()
      expect(data.metrics.cpuUsage).toBeDefined()
      expect(data.metrics.uptime).toBeDefined()
    })

    it('should include thresholds', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.thresholds).toBeDefined()
      expect(data.thresholds.errorRate).toBeDefined()
      expect(data.thresholds.responseTime).toBeDefined()
    })

    it('should have valid metric values', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.metrics.errorRate).toBeGreaterThanOrEqual(0)
      expect(data.metrics.avgResponseTime).toBeGreaterThan(0)
      expect(data.metrics.memoryUsage).toBeGreaterThan(0)
      expect(data.metrics.cpuUsage).toBeGreaterThan(0)
    })
  })
})
