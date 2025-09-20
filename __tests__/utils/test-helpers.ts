/**
 * Comprehensive test utilities for the Fantasy Football Platform
 * Includes helpers for database setup, mocking, and common test patterns
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { User, AuthSession } from '@/lib/auth';

// Test data factories
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'PLAYER',
  avatar: '🏈',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  userId: 'test-user-123',
  sessionId: 'test-session-456',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  createdAt: new Date(),
  ...overrides,
});

export const createMockPlayer = (overrides: any = {}) => ({
  id: 'player-123',
  sleeperPlayerId: 'sleeper-123',
  name: 'Test Player',
  firstName: 'Test',
  lastName: 'Player',
  position: 'QB',
  nflTeam: 'BUF',
  byeWeek: 12,
  status: 'ACTIVE',
  isRookie: false,
  yearsExperience: 5,
  isFantasyRelevant: true,
  ...overrides,
});

export const createMockTeam = (overrides: any = {}) => ({
  id: 'team-123',
  name: 'Test Team',
  leagueId: 'league-123',
  ownerId: 'user-123',
  wins: 8,
  losses: 4,
  ties: 0,
  pointsFor: 1250.50,
  pointsAgainst: 1180.25,
  waiverPriority: 5,
  faabBudget: 100,
  faabSpent: 25,
  ...overrides,
});

export const createMockLeague = (overrides: any = {}) => ({
  id: 'league-123',
  name: 'Test Fantasy League',
  description: 'A league for testing',
  season: 2024,
  isActive: true,
  currentWeek: 12,
  commissionerId: 'user-123',
  ...overrides,
});

export const createMockTrade = (overrides: any = {}) => ({
  id: 'trade-123',
  leagueId: 'league-123',
  proposerId: 'user-123',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  notes: 'Test trade proposal',
  createdAt: new Date(),
  items: [],
  ...overrides,
});

export const createMockWaiverClaim = (overrides: any = {}) => ({
  id: 'waiver-123',
  leagueId: 'league-123',
  teamId: 'team-123',
  userId: 'user-123',
  playerId: 'player-123',
  priority: 1,
  faabBid: 15,
  status: 'PENDING',
  weekNumber: 12,
  ...overrides,
});

export const createMockMatchup = (overrides: any = {}) => ({
  id: 'matchup-123',
  leagueId: 'league-123',
  week: 12,
  season: 2024,
  homeTeamId: 'team-123',
  awayTeamId: 'team-456',
  homeScore: 125.50,
  awayScore: 118.25,
  isComplete: false,
  ...overrides,
});

// API Testing Helpers
export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest => {
  const {
    method = 'GET',
    headers = {},
    body,
    cookies = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const request = new NextRequest(urlObj.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Mock cookies
  Object.entries(cookies).forEach(([name, value]) => {
    (request as any).cookies = {
      get: jest.fn((cookieName) => 
        cookieName === name ? { name, value } : undefined
      ),
    };
  });

  return request;
};

export const createMockResponse = () => {
  const response = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    headers: new Headers(),
  };
  return response as unknown as NextResponse;
};

// Database Testing Helpers
export const createTestDatabase = async () => {
  // In a real implementation, this would set up a test database
  // For now, we'll mock the Prisma client
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    league: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    trade: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    waiverClaim: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    player: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    userSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    matchup: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rosterPlayer: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  };

  return mockPrisma as unknown as PrismaClient;
};

export const seedTestData = async (prisma: PrismaClient) => {
  // Helper to seed common test data
  const user = createMockUser();
  const league = createMockLeague();
  const team = createMockTeam();
  const player = createMockPlayer();

  // Mock the database calls to return our test data
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
  (prisma.league.findUnique as jest.Mock).mockResolvedValue(league);
  (prisma.team.findFirst as jest.Mock).mockResolvedValue(team);
  (prisma.player.findUnique as jest.Mock).mockResolvedValue(player);

  return { user, league, team, player };
};

// Component Testing Helpers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    // Here you would wrap with providers like Zustand stores, context providers, etc.
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Authentication Testing Helpers
export const mockAuthenticatedUser = (user: User = createMockUser()) => {
  const cookiesMock = require('next/headers').cookies;
  cookiesMock.mockReturnValue({
    get: jest.fn((name) => {
      if (name === 'astralfield-session' || name === 'session') {
        return { name, value: 'test-session-token' };
      }
      return undefined;
    }),
    set: jest.fn(),
    delete: jest.fn(),
  });

  return user;
};

export const mockUnauthenticatedUser = () => {
  const cookiesMock = require('next/headers').cookies;
  cookiesMock.mockReturnValue({
    get: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
  });
};

// API Response Testing Helpers
export const expectSuccessResponse = (response: any, expectedData?: any) => {
  expect(response.status).toBe(200);
  if (expectedData) {
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, ...expectedData })
    );
  }
};

export const expectErrorResponse = (response: any, status: number, error?: string) => {
  expect(response.status).toBe(status);
  if (error) {
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error })
    );
  }
};

// Fantasy Football Specific Helpers
export const createValidLineup = () => ({
  QB: ['player-qb-1'],
  RB: ['player-rb-1', 'player-rb-2'],
  WR: ['player-wr-1', 'player-wr-2'],
  TE: ['player-te-1'],
  FLEX: ['player-flex-1'],
  K: ['player-k-1'],
  DST: ['player-dst-1'],
  BENCH: ['player-bench-1', 'player-bench-2', 'player-bench-3'],
});

export const createInvalidLineup = () => ({
  QB: [], // Missing required QB
  RB: ['player-rb-1'], // Only one RB, need 2
  WR: ['player-wr-1', 'player-wr-2'],
  TE: ['player-te-1'],
  FLEX: ['player-flex-1'],
  K: ['player-k-1'],
  DST: ['player-dst-1'],
  BENCH: ['player-bench-1'],
});

export const calculateExpectedScore = (playerStats: Record<string, number>) => {
  // Helper to calculate expected fantasy points based on stats
  const {
    passingYards = 0,
    passingTDs = 0,
    interceptions = 0,
    rushingYards = 0,
    rushingTDs = 0,
    receivingYards = 0,
    receivingTDs = 0,
    fumbles = 0,
  } = playerStats;

  return (
    passingYards * 0.04 +
    passingTDs * 4 +
    interceptions * -2 +
    rushingYards * 0.1 +
    rushingTDs * 6 +
    receivingYards * 0.1 +
    receivingTDs * 6 +
    fumbles * -2
  );
};

// Performance Testing Helpers
export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, executionTime: end - start };
};

export const expectExecutionTimeUnder = (executionTime: number, maxTime: number) => {
  expect(executionTime).toBeLessThan(maxTime);
};

// Sleeper API Mock Helpers
export const mockSleeperApiResponse = (endpoint: string, data: any) => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes(endpoint)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
};

// WebSocket Testing Helpers
export const createMockWebSocket = () => {
  const mockWs = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
  };

  global.WebSocket = jest.fn(() => mockWs) as any;
  return mockWs;
};

// Error Testing Helpers
export const expectToThrowError = async (fn: () => Promise<any>, errorMessage?: string) => {
  await expect(fn()).rejects.toThrow(errorMessage);
};

export const mockConsoleError = () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  return consoleSpy;
};

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

export { createMockRequest as mockRequest };
export { createMockResponse as mockResponse };