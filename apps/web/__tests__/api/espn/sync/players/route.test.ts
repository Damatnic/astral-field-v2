/**
 * ESPN Sync Players API Route Tests
 * 
 * Tests for /api/espn/sync/players endpoint
 */

import { POST } from '@/app/api/espn/sync/players/route'
import { ESPNSyncService } from '@/lib/services/espn-sync'

jest.mock('@/lib/services/espn-sync')

describe('API Route: /api/espn/sync/players', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/espn/sync/players', () => {
    it('should sync ESPN players', async () => {
      const mockSyncResult = { synced: 100, errors: 0 }
      ;(ESPNSyncService as jest.Mock).mockImplementation(() => ({
        syncESPNPlayers: jest.fn().mockResolvedValue(mockSyncResult)
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return sync results', async () => {
      const mockSyncResult = { synced: 100, errors: 2 }
      ;(ESPNSyncService as jest.Mock).mockImplementation(() => ({
        syncESPNPlayers: jest.fn().mockResolvedValue(mockSyncResult)
      }))

      const response = await POST()
      const data = await response.json()

      expect(data.message).toContain('100')
      expect(data.message).toContain('2')
    })

    it('should handle sync errors', async () => {
      ;(ESPNSyncService as jest.Mock).mockImplementation(() => ({
        syncESPNPlayers: jest.fn().mockRejectedValue(new Error('Sync failed'))
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
