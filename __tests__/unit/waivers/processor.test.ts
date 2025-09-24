import { processWaiverClaims } from '@/lib/waivers/processor';
import type { WaiverProcessingResult } from '@/lib/waivers/processor';

// Mock Prisma
const mockPrisma = {
  league: {
    findUnique: jest.fn()
  },
  transaction: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  player: {
    findUnique: jest.fn()
  },
  roster: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  team: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  notification: {
    create: jest.fn()
  },
  $transaction: jest.fn()
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma
}));

describe('WaiverProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock $transaction to execute the callback immediately
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  });

  describe('processWaiverClaims', () => {
    const mockLeagueId = 'league-123';
    const mockWeek = 15;

    const mockLeague = {
      commissionerId: 'commissioner-123',
      settings: {
        waiverType: 'FAAB',
        waiverMode: 'ROLLING'
      },
      currentWeek: 15
    };

    const mockPlayer1 = {
      id: 'player-1',
      name: 'Josh Allen',
      position: 'QB',
      team: 'BUF'
    };

    const mockPlayer2 = {
      id: 'player-2', 
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF'
    };

    const mockTeam1 = {
      id: 'team-1',
      name: 'Team Alpha',
      ownerId: 'owner-1',
      faabBudget: 1000,
      faabSpent: 200,
      waiverPriority: 1
    };

    const mockTeam2 = {
      id: 'team-2',
      name: 'Team Beta', 
      ownerId: 'owner-2',
      faabBudget: 1000,
      faabSpent: 300,
      waiverPriority: 2
    };

    beforeEach(() => {
      mockPrisma.league.findUnique.mockResolvedValue(mockLeague);
      mockPrisma.player.findUnique.mockImplementation((args) => {
        if (args.where.id === 'player-1') return Promise.resolve(mockPlayer1);
        if (args.where.id === 'player-2') return Promise.resolve(mockPlayer2);
        return Promise.resolve(null);
      });
    });

    it('should return error if league not found', async () => {
      mockPrisma.league.findUnique.mockResolvedValue(null);

      await expect(processWaiverClaims(mockLeagueId, mockWeek))
        .rejects.toThrow('League not found');
    });

    it('should return empty result when no pending claims', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result).toEqual({
        processed: 0,
        failed: 0,
        details: {
          successful: [],
          failed: []
        }
      });
    });

    it('should process FAAB-based claims correctly', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { faabBid: 50 },
          status: 'pending',
          createdAt: new Date('2024-01-01'),
          team: mockTeam1
        },
        {
          id: 'claim-2', 
          teamId: 'team-2',
          playerIds: ['player-1'],
          relatedData: { faabBid: 75 }, // Higher bid
          status: 'pending',
          createdAt: new Date('2024-01-02'),
          team: mockTeam2
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null); // Player available
      mockPrisma.roster.findMany.mockResolvedValue([]); // Empty roster
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam2); // For FAAB check

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.details.successful).toHaveLength(1);
      expect(result.details.successful[0].team).toBe('Team Beta');
      expect(result.details.successful[0].bid).toBe(75);
    });

    it('should process priority-based claims correctly', async () => {
      const priorityLeague = {
        ...mockLeague,
        settings: { waiverType: 'PRIORITY', waiverMode: 'ROLLING' }
      };
      mockPrisma.league.findUnique.mockResolvedValue(priorityLeague);

      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { priority: 1 },
          status: 'pending',
          createdAt: new Date('2024-01-01'),
          team: { ...mockTeam1, waiverPriority: 1 }
        },
        {
          id: 'claim-2',
          teamId: 'team-2', 
          playerIds: ['player-1'],
          relatedData: { priority: 2 },
          status: 'pending',
          createdAt: new Date('2024-01-02'),
          team: { ...mockTeam2, waiverPriority: 2 }
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null); // Player available
      mockPrisma.roster.findMany.mockResolvedValue([]);

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.details.successful[0].team).toBe('Team Alpha'); // Higher priority
    });

    it('should handle insufficient FAAB budget', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { faabBid: 900 }, // More than available (1000 - 200)
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null);
      
      // Mock FAAB check to return insufficient funds
      mockPrisma.team.findUnique.mockResolvedValue({
        ...mockTeam1,
        faabBudget: 1000,
        faabSpent: 900 // Only 100 available
      });

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should handle player no longer available', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { faabBid: 50 },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      
      // Player is already rostered
      mockPrisma.roster.findFirst.mockResolvedValue({
        id: 'roster-1',
        teamId: 'other-team',
        playerId: 'player-1'
      });

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should handle drop player transactions', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1', 
          playerIds: ['player-1'],
          relatedData: { 
            faabBid: 50,
            dropPlayerId: 'drop-player-1'
          },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      const mockDropPlayer = {
        id: 'drop-player-1',
        name: 'Drop Player',
        position: 'RB'
      };

      const mockRosterEntry = {
        id: 'roster-1',
        teamId: 'team-1',
        playerId: 'drop-player-1',
        isLocked: false,
        player: mockDropPlayer
      };

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst
        .mockResolvedValueOnce(mockRosterEntry) // For drop player check
        .mockResolvedValueOnce(null) // For add player availability check
        .mockResolvedValueOnce(null); // For final availability check in transaction
      mockPrisma.roster.findMany.mockResolvedValue([mockRosterEntry]);
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam1);

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(1);
      expect(mockPrisma.roster.deleteMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-1',
          playerId: 'drop-player-1'
        }
      });
      expect(mockPrisma.roster.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: 'team-1',
          playerId: 'player-1',
          position: 'BENCH',
          acquisitionType: 'waiver'
        })
      });
    });

    it('should prevent dropping locked players', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: {
            faabBid: 50,
            dropPlayerId: 'locked-player'
          },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      const mockLockedRoster = {
        id: 'roster-1',
        teamId: 'team-1', 
        playerId: 'locked-player',
        isLocked: true, // Player is locked
        player: { id: 'locked-player', name: 'Locked Player' }
      };

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst
        .mockResolvedValueOnce(mockLockedRoster) // For drop player check
        .mockResolvedValueOnce(null); // For add player check
      mockPrisma.roster.findMany.mockResolvedValue([]);

      // Mock the transaction callback to throw when trying to drop locked player
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        try {
          return await callback({
            ...mockPrisma,
            roster: {
              ...mockPrisma.roster,
              findFirst: jest.fn()
                .mockResolvedValueOnce(mockLockedRoster) // Drop player lookup
                .mockResolvedValueOnce(null) // Add player availability
            }
          });
        } catch (error) {
          throw error;
        }
      });

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should update waiver priorities for rolling waivers', async () => {
      const priorityLeague = {
        ...mockLeague,
        settings: { waiverType: 'PRIORITY', waiverMode: 'ROLLING' }
      };
      mockPrisma.league.findUnique.mockResolvedValue(priorityLeague);

      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { priority: 1 },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      const mockTeams = [mockTeam1, mockTeam2];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null);
      mockPrisma.roster.findMany.mockResolvedValue([]);
      mockPrisma.team.findMany.mockResolvedValue(mockTeams);

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(1);
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith({
        where: { leagueId: mockLeagueId },
        orderBy: { waiverPriority: 'asc' }
      });
    });

    it('should create notifications for successful claims', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { faabBid: 50 },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null);
      mockPrisma.roster.findMany.mockResolvedValue([]);
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam1);

      await processWaiverClaims(mockLeagueId, mockWeek);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockTeam1.ownerId,
          type: 'WAIVER_PROCESSED',
          title: 'Waiver Claim Successful',
          message: expect.stringContaining('Josh Allen')
        })
      });
    });

    it('should handle roster size limits', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { faabBid: 50 },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      // Mock full roster (16 players)
      const fullRoster = Array.from({ length: 16 }, (_, i) => ({
        id: `roster-${i}`,
        teamId: 'team-1',
        playerId: `player-${i}`,
        player: { id: `player-${i}`, name: `Player ${i}` }
      }));

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null); // Player available
      mockPrisma.roster.findMany.mockResolvedValue(fullRoster); // Full roster

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should handle processing errors gracefully', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          teamId: 'team-1',
          playerIds: ['player-1'],
          relatedData: { faabBid: 50 },
          status: 'pending',
          createdAt: new Date(),
          team: mockTeam1
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockClaims);
      mockPrisma.roster.findFirst.mockResolvedValue(null);
      
      // Mock $transaction to throw error
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const result = await processWaiverClaims(mockLeagueId, mockWeek);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});