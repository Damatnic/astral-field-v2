/**
 * Zenith Prisma Test Setup
 * Configures Prisma client for testing with mock database
 */

import { jest } from '@jest/globals'

// Mock Prisma Client
const mockPrismaClient = {
  // User operations
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  
  // League operations
  leagues: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  // Team operations
  teams: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  // Player operations
  players: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  // Matchup operations
  matchups: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  // Draft operations
  drafts: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Roster operations
  roster: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Transaction operations
  transactions: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Chat operations
  chat_messages: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Database utilities
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn().mockImplementation((callback) => callback(mockPrismaClient)),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  
  // Extensions
  $extends: jest.fn(),
}

// Mock the Prisma module (updated path to /database/prisma)
jest.mock('@/lib/database/prisma', () => ({
  prisma: mockPrismaClient,
  checkDatabaseHealth: jest.fn(() => Promise.resolve(true)),
  withRetry: jest.fn((operation) => operation()),
  bulkOperation: jest.fn((items, operation) => Promise.resolve([])),
  timedQuery: jest.fn((name, query) => query()),
  __esModule: true,
  default: mockPrismaClient,
}))

// Export for test usage
global.mockPrisma = mockPrismaClient

// Reset function for individual tests
global.resetPrismaMocks = () => {
  Object.values(mockPrismaClient).forEach(model => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset()
        }
      })
    }
  })
  
  // Reset utility functions
  mockPrismaClient.$connect.mockResolvedValue(undefined)
  mockPrismaClient.$disconnect.mockResolvedValue(undefined)
  mockPrismaClient.$transaction.mockImplementation((callback) => callback(mockPrismaClient))
}
