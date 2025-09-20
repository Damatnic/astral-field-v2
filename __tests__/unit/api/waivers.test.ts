/**
 * Unit tests for Waivers API Route Handler
 * Tests waiver claim processing, validation, and FAAB bidding
 */

import { GET, POST } from '@/app/api/waivers/route';
import { prisma } from '@/lib/db';
import {
  createMockRequest,
  createMockUser,
  createMockTeam,
  createMockWaiverClaim,
  createMockPlayer,
  createMockLeague,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  expectSuccessResponse,
  expectErrorResponse,
} from '../../utils/test-helpers';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    userSession: {
      findUnique: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    league: {
      findUnique: jest.fn(),
    },
    player: {
      findUnique: jest.fn(),
    },
    waiverClaim: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    rosterPlayer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('next/headers');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/waivers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/waivers', () => {
    it('should return waiver claims for authenticated user', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockClaims = [
        createMockWaiverClaim({
          id: 'claim-1',
          teamId: mockTeam.id,
          userId: mockUser.id,
          status: 'PENDING',
          player: createMockPlayer({ name: 'Test Player' }),
        }),
      ];

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
      mockPrisma.waiverClaim.findMany.mockResolvedValue(mockClaims);

      const request = createMockRequest('/api/waivers');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.claims).toHaveLength(1);
      expect(responseData.claims[0].id).toBe('claim-1');
    });

    it('should filter waiver claims by status', async () => {
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
      mockPrisma.waiverClaim.findMany.mockResolvedValue([]);

      const request = createMockRequest('/api/waivers', {
        searchParams: { status: 'SUCCESSFUL' },
      });

      // Act
      await GET(request);

      // Assert
      expect(mockPrisma.waiverClaim.findMany).toHaveBeenCalledWith({
        where: {
          leagueId: mockTeam.leagueId,
          status: 'SUCCESSFUL',
        },
        include: {
          player: true,
          team: {
            include: { owner: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      mockUnauthenticatedUser();
      const request = createMockRequest('/api/waivers');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData.error).toBe('Not authenticated');
    });
  });

  describe('POST /api/waivers', () => {
    it('should successfully create waiver claim', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ 
        ownerId: mockUser.id,
        faabBudget: 100,
        faabSpent: 20,
        waiverPriority: 3,
      });
      const mockLeague = createMockLeague({ 
        id: mockTeam.leagueId,
        currentWeek: 12,
      });
      const mockPlayer = createMockPlayer({ id: 'player-123' });
      const mockDropPlayer = createMockPlayer({ id: 'drop-player-456' });

      const claimData = {
        playerId: 'player-123',
        dropPlayerId: 'drop-player-456',
        faabBid: 25,
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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(mockDropPlayer);
      mockPrisma.rosterPlayer.findFirst.mockResolvedValue({
        id: 'roster-1',
        teamId: mockTeam.id,
        playerId: 'drop-player-456',
        rosterSlot: 'BENCH',
        position: 'BENCH',
        isLocked: false,
        acquisitionDate: new Date(),
        acquisitionType: 'DRAFT',
        week: null,
        lastModified: new Date(),
      });
      mockPrisma.waiverClaim.findFirst.mockResolvedValue(null); // No existing claim
      mockPrisma.waiverClaim.create.mockResolvedValue({
        id: 'claim-123',
        ...claimData,
        leagueId: mockTeam.leagueId,
        teamId: mockTeam.id,
        userId: mockUser.id,
        priority: 3,
        status: 'PENDING',
        weekNumber: 12,
        processedAt: null,
        successful: null,
        failureReason: null,
        createdAt: new Date(),
      });

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: claimData,
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.claim.id).toBe('claim-123');
      expect(mockPrisma.waiverClaim.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          playerId: 'player-123',
          dropPlayerId: 'drop-player-456',
          faabBid: 25,
          priority: 3,
          status: 'PENDING',
          weekNumber: 12,
        }),
      });
    });

    it('should validate FAAB bid amount', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ 
        ownerId: mockUser.id,
        faabBudget: 100,
        faabSpent: 80, // Only $20 remaining
      });
      const mockLeague = createMockLeague();

      const claimData = {
        playerId: 'player-123',
        faabBid: 30, // More than remaining budget
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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: claimData,
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Insufficient FAAB budget');
    });

    it('should prevent duplicate waiver claims', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockLeague = createMockLeague();
      const mockPlayer = createMockPlayer();

      const claimData = {
        playerId: 'player-123',
        faabBid: 10,
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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
      mockPrisma.waiverClaim.findFirst.mockResolvedValue({
        id: 'existing-claim',
        leagueId: mockTeam.leagueId,
        teamId: mockTeam.id,
        userId: mockUser.id,
        playerId: 'player-123',
        dropPlayerId: null,
        priority: 3,
        faabBid: 5,
        status: 'PENDING',
        processedAt: null,
        successful: null,
        failureReason: null,
        weekNumber: 12,
        createdAt: new Date(),
      });

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: claimData,
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(409);
      const responseData = await response.json();
      expect(responseData.error).toContain('already have a pending claim');
    });

    it('should validate required fields', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockAuthenticatedUser(mockUser);

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: {}, // Missing required fields
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Player ID is required');
    });

    it('should validate player exists', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockLeague = createMockLeague();

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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique.mockResolvedValue(null); // Player doesn't exist

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: {
          playerId: 'non-existent-player',
          faabBid: 10,
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Player not found');
    });

    it('should validate drop player ownership', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockLeague = createMockLeague();
      const mockPlayer = createMockPlayer();
      const mockDropPlayer = createMockPlayer({ id: 'drop-player-456' });

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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(mockDropPlayer);
      mockPrisma.rosterPlayer.findFirst.mockResolvedValue(null); // Player not on roster

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: {
          playerId: 'player-123',
          dropPlayerId: 'drop-player-456',
          faabBid: 10,
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('do not own the player you want to drop');
    });

    it('should handle zero FAAB bid for free agents', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockLeague = createMockLeague();
      const mockPlayer = createMockPlayer();

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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
      mockPrisma.waiverClaim.findFirst.mockResolvedValue(null);
      mockPrisma.waiverClaim.create.mockResolvedValue({
        id: 'claim-123',
        leagueId: mockTeam.leagueId,
        teamId: mockTeam.id,
        userId: mockUser.id,
        playerId: 'player-123',
        dropPlayerId: null,
        priority: 3,
        faabBid: 0,
        status: 'PENDING',
        processedAt: null,
        successful: null,
        failureReason: null,
        weekNumber: 12,
        createdAt: new Date(),
      });

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: {
          playerId: 'player-123',
          faabBid: 0, // Free agent pickup
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.claim.faabBid).toBe(0);
    });

    it('should handle database transaction errors', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTeam = createMockTeam({ ownerId: mockUser.id });
      const mockLeague = createMockLeague();
      const mockPlayer = createMockPlayer();

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
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
      mockPrisma.waiverClaim.findFirst.mockResolvedValue(null);
      mockPrisma.waiverClaim.create.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('/api/waivers', {
        method: 'POST',
        body: {
          playerId: 'player-123',
          faabBid: 10,
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to create waiver claim');
    });
  });
});