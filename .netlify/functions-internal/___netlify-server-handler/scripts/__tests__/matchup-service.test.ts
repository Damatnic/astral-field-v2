import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AdvancedMatchupService } from '../matchup-service-advanced';
import {
  MatchupStatus,
  MatchupFilters,
  PaginationOptions,
  ScoreUpdateInput,
  MatchupEvent
} from '../types/matchup.types';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
    matchup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    league: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  })),
}));

// Mock pino logger
vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  }),
}));

describe('AdvancedMatchupService', () => {
  let service: AdvancedMatchupService;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create service instance with test config
    service = new AdvancedMatchupService({
      nodeEnv: 'test' as any,
      enableCache: false,
      poolSize: 1,
    });

    // Get mock prisma instance
    mockPrisma = (PrismaClient as any).mock.results[0].value;
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('fetchMatchups', () => {
    it('should fetch matchups with default pagination', async () => {
      const mockMatchups = [
        {
          id: '1',
          week: 1,
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          homeScore: 110.5,
          awayScore: 98.2,
          status: MatchupStatus.COMPLETED,
          homeTeam: {
            id: 'team1',
            name: 'Team Alpha',
            owner: { id: 'user1', name: 'John Doe', email: 'john@example.com' }
          },
          awayTeam: {
            id: 'team2',
            name: 'Team Beta',
            owner: { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
          },
          league: {
            id: 'league1',
            name: 'Test League',
            currentWeek: 1,
            season: 2024
          }
        }
      ];

      mockPrisma.matchup.findMany.mockResolvedValueOnce(mockMatchups);
      mockPrisma.matchup.count.mockResolvedValueOnce(1);

      const result = await service.fetchMatchups();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.data).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
      expect(mockPrisma.matchup.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.matchup.count).toHaveBeenCalledTimes(1);
    });

    it('should apply filters correctly', async () => {
      const filters: MatchupFilters = {
        leagueId: 'league1',
        week: 5,
        status: MatchupStatus.IN_PROGRESS
      };

      mockPrisma.matchup.findMany.mockResolvedValueOnce([]);
      mockPrisma.matchup.count.mockResolvedValueOnce(0);

      await service.fetchMatchups(filters);

      const findManyCall = mockPrisma.matchup.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual({
        leagueId: 'league1',
        week: 5,
        status: MatchupStatus.IN_PROGRESS
      });
    });

    it('should handle team filter with OR condition', async () => {
      const filters: MatchupFilters = {
        teamId: 'team1'
      };

      mockPrisma.matchup.findMany.mockResolvedValueOnce([]);
      mockPrisma.matchup.count.mockResolvedValueOnce(0);

      await service.fetchMatchups(filters);

      const findManyCall = mockPrisma.matchup.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual({
        OR: [
          { homeTeamId: 'team1' },
          { awayTeamId: 'team1' }
        ]
      });
    });

    it('should apply pagination correctly', async () => {
      const pagination: PaginationOptions = {
        page: 2,
        limit: 5,
        sortBy: 'week',
        sortOrder: 'asc'
      };

      mockPrisma.matchup.findMany.mockResolvedValueOnce([]);
      mockPrisma.matchup.count.mockResolvedValueOnce(10);

      const result = await service.fetchMatchups({}, pagination);

      const findManyCall = mockPrisma.matchup.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(5); // (page - 1) * limit
      expect(findManyCall.take).toBe(5);
      expect(findManyCall.orderBy).toEqual({ week: 'asc' });
      expect(result.data?.hasNext).toBe(false);
      expect(result.data?.hasPrevious).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.matchup.findMany.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.fetchMatchups()).rejects.toThrow('Database error');
    });
  });

  describe('calculateAdvancedStats', () => {
    it('should calculate statistics correctly', async () => {
      const mockMatchups = [
        {
          id: '1',
          homeScore: 120,
          awayScore: 100,
          status: MatchupStatus.COMPLETED,
          homeTeam: { owner: {} },
          awayTeam: { owner: {} },
          league: {}
        },
        {
          id: '2',
          homeScore: 95,
          awayScore: 105,
          status: MatchupStatus.COMPLETED,
          homeTeam: { owner: {} },
          awayTeam: { owner: {} },
          league: {}
        },
        {
          id: '3',
          homeScore: null,
          awayScore: null,
          status: MatchupStatus.IN_PROGRESS,
          homeTeam: { owner: {} },
          awayTeam: { owner: {} },
          league: {}
        }
      ];

      mockPrisma.matchup.findMany.mockResolvedValueOnce(mockMatchups);

      const result = await service.calculateAdvancedStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.totalMatchups).toBe(3);
      expect(result.data?.completedMatchups).toBe(2);
      expect(result.data?.inProgressMatchups).toBe(1);
      expect(result.data?.averageHomeScore).toBe(107.5);
      expect(result.data?.averageAwayScore).toBe(102.5);
      expect(result.data?.homeWinPercentage).toBe(50);
    });

    it('should handle empty matchup list', async () => {
      mockPrisma.matchup.findMany.mockResolvedValueOnce([]);

      const result = await service.calculateAdvancedStats();

      expect(result.success).toBe(true);
      expect(result.data?.totalMatchups).toBe(0);
      expect(result.data?.averageHomeScore).toBe(0);
      expect(result.data?.averageAwayScore).toBe(0);
    });

    it('should identify highest and lowest scoring matchups', async () => {
      const mockMatchups = [
        {
          id: '1',
          homeScore: 150,
          awayScore: 140,
          status: MatchupStatus.COMPLETED,
          homeTeam: { name: 'High Scorers', owner: {} },
          awayTeam: { owner: {} },
          league: {}
        },
        {
          id: '2',
          homeScore: 70,
          awayScore: 65,
          status: MatchupStatus.COMPLETED,
          homeTeam: { name: 'Low Scorers', owner: {} },
          awayTeam: { owner: {} },
          league: {}
        }
      ];

      mockPrisma.matchup.findMany.mockResolvedValueOnce(mockMatchups);

      const result = await service.calculateAdvancedStats();

      expect(result.data?.highestScoringMatchup?.id).toBe('1');
      expect(result.data?.lowestScoringMatchup?.id).toBe('2');
    });
  });

  describe('updateScores', () => {
    it('should update scores and emit event', async () => {
      const input: ScoreUpdateInput = {
        matchupId: 'matchup1',
        homeScore: 115.5,
        awayScore: 102.3,
        updateType: 'MANUAL'
      };

      const updatedMatchup = {
        id: 'matchup1',
        homeScore: 115.5,
        awayScore: 102.3,
        status: MatchupStatus.COMPLETED,
        homeTeam: { owner: {} },
        awayTeam: { owner: {} },
        league: {}
      };

      mockPrisma.matchup.update.mockResolvedValueOnce(updatedMatchup);

      const eventListener = vi.fn();
      service.on('matchup:updated', eventListener);

      const result = await service.updateScores(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedMatchup);
      expect(mockPrisma.matchup.update).toHaveBeenCalledWith({
        where: { id: 'matchup1' },
        data: expect.objectContaining({
          homeScore: 115.5,
          awayScore: 102.3,
          status: MatchupStatus.COMPLETED
        }),
        include: expect.any(Object)
      });
      
      // Check event emission
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SCORE_UPDATE',
          matchupId: 'matchup1',
          data: { homeScore: 115.5, awayScore: 102.3 }
        })
      );
    });

    it('should set status to IN_PROGRESS when only one score is provided', async () => {
      const input: ScoreUpdateInput = {
        matchupId: 'matchup1',
        homeScore: 50,
        updateType: 'AUTOMATIC'
      };

      mockPrisma.matchup.update.mockResolvedValueOnce({
        id: 'matchup1',
        homeScore: 50,
        status: MatchupStatus.IN_PROGRESS,
        homeTeam: { owner: {} },
        awayTeam: { owner: {} },
        league: {}
      });

      await service.updateScores(input);

      expect(mockPrisma.matchup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MatchupStatus.IN_PROGRESS
          })
        })
      );
    });
  });

  describe('getTeamPerformance', () => {
    it('should calculate team performance metrics', async () => {
      const mockTeam = {
        id: 'team1',
        name: 'Test Team',
        owner: { name: 'Owner', email: 'owner@test.com' }
      };

      const mockMatchups = [
        {
          id: '1',
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          homeScore: 120,
          awayScore: 100,
          status: MatchupStatus.COMPLETED
        },
        {
          id: '2',
          homeTeamId: 'team3',
          awayTeamId: 'team1',
          homeScore: 90,
          awayScore: 95,
          status: MatchupStatus.COMPLETED
        },
        {
          id: '3',
          homeTeamId: 'team1',
          awayTeamId: 'team4',
          homeScore: 105,
          awayScore: 105,
          status: MatchupStatus.COMPLETED
        }
      ];

      mockPrisma.team.findUnique.mockResolvedValueOnce(mockTeam);
      mockPrisma.matchup.findMany.mockResolvedValueOnce(mockMatchups);

      const result = await service.getTeamPerformance('team1');

      expect(result.success).toBe(true);
      expect(result.data?.wins).toBe(2);
      expect(result.data?.losses).toBe(0);
      expect(result.data?.ties).toBe(1);
      expect(result.data?.averagePointsFor).toBeCloseTo(106.67, 1);
      expect(result.data?.averagePointsAgainst).toBeCloseTo(98.33, 1);
      expect(result.data?.highestScore).toBe(120);
      expect(result.data?.lowestScore).toBe(95);
    });

    it('should handle team not found', async () => {
      mockPrisma.team.findUnique.mockResolvedValueOnce(null);

      await expect(service.getTeamPerformance('nonexistent'))
        .rejects.toThrow('Team not found');
    });

    it('should handle team with no matchups', async () => {
      const mockTeam = {
        id: 'team1',
        name: 'New Team',
        owner: { name: 'Owner', email: 'owner@test.com' }
      };

      mockPrisma.team.findUnique.mockResolvedValueOnce(mockTeam);
      mockPrisma.matchup.findMany.mockResolvedValueOnce([]);

      const result = await service.getTeamPerformance('team1');

      expect(result.data?.wins).toBe(0);
      expect(result.data?.losses).toBe(0);
      expect(result.data?.ties).toBe(0);
      expect(result.data?.averagePointsFor).toBe(0);
    });
  });

  describe('getWeeklyStats', () => {
    it('should calculate weekly statistics', async () => {
      const mockMatchups = [
        { homeScore: 120, awayScore: 110, status: MatchupStatus.COMPLETED },
        { homeScore: 95, awayScore: 88, status: MatchupStatus.COMPLETED },
        { homeScore: 105, awayScore: 112, status: MatchupStatus.COMPLETED }
      ];

      mockPrisma.matchup.findMany.mockResolvedValueOnce(mockMatchups);

      const result = await service.getWeeklyStats(5);

      expect(result.success).toBe(true);
      expect(result.data?.week).toBe(5);
      expect(result.data?.matchupsCount).toBe(3);
      expect(result.data?.averageScore).toBeCloseTo(105, 0);
      expect(result.data?.highestScore).toBe(120);
      expect(result.data?.lowestScore).toBe(88);
      expect(result.data?.totalPoints).toBe(630);
    });

    it('should filter by league when provided', async () => {
      mockPrisma.matchup.findMany.mockResolvedValueOnce([]);

      await service.getWeeklyStats(5, 'league1');

      expect(mockPrisma.matchup.findMany).toHaveBeenCalledWith({
        where: {
          week: 5,
          status: MatchupStatus.COMPLETED,
          leagueId: 'league1'
        }
      });
    });
  });

  describe('subscribe', () => {
    it('should handle event subscriptions', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe(
        { events: ['SCORE_UPDATE'] },
        callback
      );

      const event: MatchupEvent = {
        type: 'SCORE_UPDATE',
        matchupId: 'match1',
        data: { homeScore: 100 },
        timestamp: new Date()
      };

      service.emit('matchup:updated', event);
      expect(callback).toHaveBeenCalledWith(event);

      unsubscribe();
      service.emit('matchup:updated', event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should filter events based on subscription options', () => {
      const callback = vi.fn();
      service.subscribe(
        { events: ['STATUS_CHANGE'] },
        callback
      );

      const scoreUpdate: MatchupEvent = {
        type: 'SCORE_UPDATE',
        matchupId: 'match1',
        data: {},
        timestamp: new Date()
      };

      const statusChange: MatchupEvent = {
        type: 'STATUS_CHANGE',
        matchupId: 'match1',
        data: {},
        timestamp: new Date()
      };

      service.emit('matchup:updated', scoreUpdate);
      expect(callback).not.toHaveBeenCalled();

      service.emit('matchup:updated', statusChange);
      expect(callback).toHaveBeenCalledWith(statusChange);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '1': 1 }]);

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.checks.database).toBe('healthy');
      expect(health.details.checks.cache).toBe('healthy');
      expect(health.details.checks.pool).toBe('healthy');
    });

    it('should return unhealthy status when database check fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.checks.database).toBe('unhealthy');
    });
  });

  describe('getMetrics', () => {
    it('should return service metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('service');
      expect(metrics).toHaveProperty('pool');
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics.service).toHaveProperty('requests_total');
      expect(metrics.service).toHaveProperty('cache_hits');
    });
  });

  describe('Error handling and retries', () => {
    it('should retry operations on failure', async () => {
      // Mock to fail twice then succeed
      mockPrisma.matchup.findMany
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce([]);
      
      mockPrisma.matchup.count.mockResolvedValue(0);

      const result = await service.fetchMatchups();

      expect(result.success).toBe(true);
      expect(mockPrisma.matchup.findMany).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockPrisma.matchup.findMany
        .mockRejectedValue(new Error('Persistent error'));

      await expect(service.fetchMatchups()).rejects.toThrow('Persistent error');
    });
  });
});

describe('AdvancedMatchupService - Integration Tests', () => {
  it('should handle concurrent operations', async () => {
    const service = new AdvancedMatchupService({
      nodeEnv: 'test' as any,
      enableCache: true,
      poolSize: 3,
    });

    const mockPrisma = (PrismaClient as any).mock.results[0].value;
    mockPrisma.matchup.findMany.mockResolvedValue([]);
    mockPrisma.matchup.count.mockResolvedValue(0);
    mockPrisma.team.findUnique.mockResolvedValue({
      id: 'team1',
      name: 'Test',
      owner: {}
    });

    // Execute multiple operations concurrently
    const operations = await Promise.all([
      service.fetchMatchups(),
      service.fetchMatchups({ week: 1 }),
      service.getTeamPerformance('team1'),
      service.getWeeklyStats(1)
    ]);

    expect(operations.every(op => op.success)).toBe(true);
    
    await service.shutdown();
  });

  it('should properly cache results', async () => {
    const service = new AdvancedMatchupService({
      nodeEnv: 'test' as any,
      enableCache: true,
      cacheTtl: 1000,
    });

    const mockPrisma = (PrismaClient as any).mock.results[0].value;
    mockPrisma.matchup.findMany.mockResolvedValue([{ id: '1' }]);
    mockPrisma.matchup.count.mockResolvedValue(1);

    // First call - should hit database
    const result1 = await service.fetchMatchups();
    expect(result1.metadata?.cached).toBe(false);

    // Second call - should hit cache
    const result2 = await service.fetchMatchups();
    expect(mockPrisma.matchup.findMany).toHaveBeenCalledTimes(1);

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Third call - should hit database again
    const result3 = await service.fetchMatchups();
    expect(mockPrisma.matchup.findMany).toHaveBeenCalledTimes(2);

    await service.shutdown();
  });
});