/**
 * Unit tests for Trades API Route Handler
 * Tests GET /api/trades endpoint functionality
 */

import { GET } from '@/app/api/trades/route';
import { prisma } from '@/lib/db';
import {
  createMockRequest,
  createMockUser,
  createMockTeam,
  createMockTrade,
  createMockPlayer,
  createTestDatabase,
  expectSuccessResponse,
  expectErrorResponse,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '../../utils/test-helpers';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    userSession: {
      findUnique: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
    },
    trade: {
      findMany: jest.fn(),
    },
  },
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/trades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/trades', () => {
    it('should return trades for authenticated user', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockTrades = [
        createMockTrade({
          id: 'trade-1',
          proposerId: mockUser.id,
          leagueId: mockTeam.leagueId,
          proposer: mockUser,
          team: mockTeam,
          items: [
            {
              id: 'item-1',
              fromTeamId: mockTeam.id,
              toTeamId: 'team-456',
              playerId: 'player-123',
              itemType: 'PLAYER',
              player: createMockPlayer({ id: 'player-123', name: 'Test Player' }),
            },
          ],
        }),
      ];

      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000), // 1 day
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockPrisma.trade.findMany.mockResolvedValue(mockTrades);

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith({
        where: { leagueId: mockTeam.leagueId },
        include: {
          proposer: true,
          team: { include: { owner: true } },
          items: { include: { player: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.trades).toHaveLength(1);
      expect(responseData.trades[0]).toMatchObject({
        id: 'trade-1',
        status: 'PENDING',
        isMyTrade: true,
      });
    });

    it('should filter trades by status when provided', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });

      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockPrisma.trade.findMany.mockResolvedValue([]);

      const request = createMockRequest('/api/trades', {
        searchParams: { status: 'ACCEPTED', limit: '10' },
      });

      // Act
      await GET(request);

      // Assert
      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith({
        where: { 
          leagueId: mockTeam.leagueId,
          status: 'ACCEPTED',
        },
        include: {
          proposer: true,
          team: { include: { owner: true } },
          items: { include: { player: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser();

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData.error).toBe('Not authenticated');
    });

    it('should return 401 when session is expired', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() - 86400000), // Expired 1 day ago
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData.error).toBe('Session expired');
    });

    it('should return 404 when user has no team', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.team.findFirst.mockResolvedValue(null);

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Team not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to fetch trades');
    });

    it('should respect limit parameter with bounds checking', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });

      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockPrisma.trade.findMany.mockResolvedValue([]);

      const request = createMockRequest('/api/trades', {
        searchParams: { limit: '50' },
      });

      // Act
      await GET(request);

      // Assert
      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it('should format trade response correctly', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockPlayer = createMockPlayer({ 
        id: 'player-123', 
        name: 'Josh Allen',
        position: 'QB',
        nflTeam: 'BUF' 
      });
      
      const mockTrade = {
        id: 'trade-1',
        status: 'PENDING',
        proposerId: 'other-user-123',
        teamId: 'other-team-123',
        leagueId: mockTeam.leagueId,
        expiresAt: new Date(Date.now() + 86400000),
        processedAt: null,
        notes: 'Great trade opportunity',
        createdAt: new Date('2024-01-15'),
        proposer: {
          id: 'other-user-123',
          name: 'Other User',
        },
        team: {
          id: 'other-team-123',
          name: 'Other Team',
          owner: {
            id: 'other-user-123',
            name: 'Other User',
          },
        },
        items: [
          {
            id: 'item-1',
            fromTeamId: 'other-team-123',
            toTeamId: mockTeam.id,
            playerId: 'player-123',
            itemType: 'PLAYER',
            player: mockPlayer,
          },
        ],
      };

      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockPrisma.trade.findMany.mockResolvedValue([mockTrade]);

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.trades[0]).toMatchObject({
        id: 'trade-1',
        status: 'PENDING',
        proposer: {
          userId: 'other-user-123',
          userName: 'Other User',
          teamId: 'other-team-123',
          teamName: 'Other Team',
        },
        items: [
          {
            fromTeamId: 'other-team-123',
            toTeamId: mockTeam.id,
            player: {
              id: 'player-123',
              name: 'Josh Allen',
              position: 'QB',
              team: 'BUF',
            },
            itemType: 'PLAYER',
          },
        ],
        isMyTrade: false,
        notes: 'Great trade opportunity',
      });
    });

    it('should handle trades with null players gracefully', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      
      const mockTrade = {
        id: 'trade-1',
        status: 'PENDING',
        proposerId: mockUser.id,
        teamId: mockTeam.id,
        leagueId: mockTeam.leagueId,
        expiresAt: new Date(Date.now() + 86400000),
        processedAt: null,
        notes: null,
        createdAt: new Date('2024-01-15'),
        proposer: mockUser,
        team: mockTeam,
        items: [
          {
            id: 'item-1',
            fromTeamId: mockTeam.id,
            toTeamId: 'other-team-123',
            playerId: null,
            itemType: 'DRAFT_PICK',
            player: null,
          },
        ],
      };

      mockAuthenticatedUser(mockUser);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        sessionId: 'test-session',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      mockPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockPrisma.trade.findMany.mockResolvedValue([mockTrade]);

      const request = createMockRequest('/api/trades');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.trades[0].items[0].player).toBeNull();
      expect(responseData.trades[0].items[0].itemType).toBe('DRAFT_PICK');
    });
  });
});