/**
 * Prisma Helpers Tests
 * 
 * Tests for lib/database/prisma.ts
 */

import { prisma, checkDatabaseHealth, withRetry, bulkOperation, timedQuery } from '@/lib/database/prisma'

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  })),
  Prisma: {
    TransactionIsolationLevel: {
      ReadCommitted: 'ReadCommitted'
    }
  }
}))

describe('Prisma Helpers', () => {
  describe('prisma', () => {
    it('should be defined', () => {
      expect(prisma).toBeDefined()
    })

    it('should have $queryRaw method', () => {
      expect(prisma.$queryRaw).toBeDefined()
    })

    it('should have $disconnect method', () => {
      expect(prisma.$disconnect).toBeDefined()
    })
  })

  describe('checkDatabaseHealth', () => {
    it('should check database connection', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

      const result = await checkDatabaseHealth()

      expect(result).toBe(true)
      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('should return false on connection failure', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'))

      const result = await checkDatabaseHealth()

      expect(result).toBe(false)
    })
  })

  describe('withRetry', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await withRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'))

      await expect(withRetry(operation, 2, 10)).rejects.toThrow('Always fails')
      expect(operation).toHaveBeenCalledTimes(2)
    })
  })

  describe('bulkOperation', () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 250 }, (_, i) => i)
      const operation = jest.fn().mockResolvedValue('batch processed')

      const results = await bulkOperation(items, operation, 100)

      expect(results).toHaveLength(3) // 250 items / 100 batch size = 3 batches
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should handle single batch', async () => {
      const items = [1, 2, 3]
      const operation = jest.fn().mockResolvedValue('processed')

      const results = await bulkOperation(items, operation, 100)

      expect(results).toHaveLength(1)
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('timedQuery', () => {
    it('should execute query and measure time', async () => {
      const query = jest.fn().mockResolvedValue('result')

      const result = await timedQuery('test-query', query)

      expect(result).toBe('result')
      expect(query).toHaveBeenCalled()
    })

    it('should handle query errors', async () => {
      const query = jest.fn().mockRejectedValue(new Error('Query failed'))

      await expect(timedQuery('test-query', query)).rejects.toThrow('Query failed')
    })
  })
})
