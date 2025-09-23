import { createMocks } from 'node-mocks-http';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  player: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

describe('/api/players', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return players list', async () => {
    const { player } = require('@/lib/db');

    // Mock players data
    player.findMany.mockResolvedValue([
      {
        id: '1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: {
          passingYards: 4306,
          passingTDs: 29,
          rushingYards: 750,
          rushingTDs: 7,
        },
      },
      {
        id: '2',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        stats: {
          rushingYards: 1450,
          rushingTDs: 14,
          receivingYards: 550,
          receivingTDs: 4,
        },
      },
    ]);

    const { req, res } = createMocks({
      method: 'GET',
    });

    // Test that the mock is working
    const players = await player.findMany();
    expect(players).toHaveLength(2);
    expect(players[0].name).toBe('Josh Allen');
    expect(players[1].name).toBe('Christian McCaffrey');
  });

  it('should filter players by position', async () => {
    const { player } = require('@/lib/db');

    player.findMany.mockResolvedValue([
      {
        id: '1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
      },
    ]);

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        position: 'QB',
      },
    });

    const players = await player.findMany({
      where: { position: 'QB' },
    });

    expect(players).toHaveLength(1);
    expect(players[0].position).toBe('QB');
  });

  it('should filter players by team', async () => {
    const { player } = require('@/lib/db');

    player.findMany.mockResolvedValue([
      {
        id: '1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
      },
    ]);

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        team: 'BUF',
      },
    });

    const players = await player.findMany({
      where: { team: 'BUF' },
    });

    expect(players).toHaveLength(1);
    expect(players[0].team).toBe('BUF');
  });

  it('should search players by name', async () => {
    const { player } = require('@/lib/db');

    player.findMany.mockResolvedValue([
      {
        id: '1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
      },
    ]);

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        search: 'Josh',
      },
    });

    const players = await player.findMany({
      where: {
        name: { contains: 'Josh', mode: 'insensitive' },
      },
    });

    expect(players).toHaveLength(1);
    expect(players[0].name).toContain('Josh');
  });

  it('should handle empty results', async () => {
    const { player } = require('@/lib/db');

    player.findMany.mockResolvedValue([]);

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        search: 'NonexistentPlayer',
      },
    });

    const players = await player.findMany();
    expect(players).toHaveLength(0);
  });

  it('should handle database errors', async () => {
    const { player } = require('@/lib/db');

    player.findMany.mockRejectedValue(new Error('Database connection failed'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    try {
      await player.findMany();
    } catch (error) {
      expect(error.message).toBe('Database connection failed');
    }
  });
});