/**
 * Optimized Database Connection and Query Utilities for Astral Field
 * Implements connection pooling, query optimization, and performance monitoring
 */

import { PrismaClient } from '@prisma/client';
import { createServerCache, CACHE_DURATIONS, CACHE_TAGS } from './cache';

// Create base Prisma client
const basePrismaClient = new PrismaClient({
  // Connection pooling optimization
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enable query logging in development
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Performance monitoring state
let queryCount = 0;
let totalQueryTime = 0;

// Enhanced Prisma client with performance monitoring using Prisma v6 extensions
const prismaWithMonitoring = basePrismaClient.$extends({
  name: 'PerformanceMonitoring',
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;
        
        queryCount++;
        totalQueryTime += duration;
        
        // Log slow queries (>1000ms)
        if (duration > 1000) {
          console.warn(`🐌 Slow query detected (${duration}ms)`);
        }
        
        return result;
      }
    }
  }
});

// Export performance stats function
export function getPerformanceStats() {
  return {
    queryCount,
    totalQueryTime,
    averageQueryTime: queryCount > 0 ? totalQueryTime / queryCount : 0,
  };
}

// Export the optimized client as prisma
export const prisma = prismaWithMonitoring;

// Get the current week number for NFL season
export function getCurrentWeek(): number {
  const seasonStart = new Date('2024-09-05'); // NFL 2024 season start
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.min(18, Math.max(1, diffWeeks)); // NFL regular season is 18 weeks
}

/**
 * Cached database queries for optimal performance
 */

// Get players with advanced filtering and caching
export const getPlayersOptimized = createServerCache(
  async (options?: {
    position?: string;
    team?: string;
    search?: string;
    availability?: 'all' | 'available' | 'rostered';
    leagueId?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'name' | 'position' | 'team' | 'fantasyScore';
  }) => {
    const {
      position,
      team,
      search,
      availability = 'all',
      leagueId,
      limit = 50,
      offset = 0,
      orderBy = 'name',
    } = options || {};

    // Build where clause
    const whereClause: any = {
      AND: [],
    };

    // Position filter
    if (position) {
      whereClause.AND.push({ position });
    }

    // Team filter  
    if (team) {
      whereClause.AND.push({ nflTeam: team });
    }

    // Search filter
    if (search) {
      whereClause.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nflTeam: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Availability filter
    if (availability === 'available') {
      whereClause.AND.push({
        NOT: {
          roster: {
            some: {
              team: { leagueId },
            },
          },
        },
      });
    } else if (availability === 'rostered' && leagueId) {
      whereClause.AND.push({
        roster: {
          some: {
            team: { leagueId },
          },
        },
      });
    }

    try {
      const [players, total] = await Promise.all([
        prisma.player.findMany({
          where: whereClause.AND.length > 0 ? whereClause : undefined,
          skip: offset,
          take: limit,
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            byeWeek: true,
            status: true,
            injuryStatus: true,
            age: true,
            adp: true,
            // Limit related data to avoid over-fetching
            stats: {
              where: {
                season: new Date().getFullYear().toString(),
                week: { lte: getCurrentWeek() },
              },
              select: {
                week: true,
                fantasyPoints: true,
              },
              orderBy: { week: 'desc' },
              take: 5,
            },
            projections: {
              where: {
                week: getCurrentWeek(),
                season: new Date().getFullYear().toString(),
              },
              select: {
                projectedPoints: true,
                confidence: true,
              },
              orderBy: { confidence: 'desc' },
              take: 1,
            },
            news: {
              select: {
                id: true,
                headline: true,
                publishedAt: true,
                source: true,
              },
              orderBy: { publishedAt: 'desc' },
              take: 3,
            },
            // Only include roster info if needed
            ...(leagueId ? {
              roster: {
                where: {
                  team: { leagueId },
                },
                select: {
                  position: true,
                  team: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                take: 1,
              },
            } : {}),
          },
          orderBy: [
            { position: 'asc' },
            { name: 'asc' },
          ],
        }),
        prisma.player.count({
          where: whereClause.AND.length > 0 ? whereClause : undefined,
        }),
      ]);

      return {
        players,
        total,
        hasMore: total > offset + limit,
      };
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  },
  'players-optimized',
  {
    tags: [CACHE_TAGS.PLAYERS],
    revalidate: CACHE_DURATIONS.DYNAMIC
  }
);

// Get matchups with optimized queries
export const getMatchupsOptimized = createServerCache(
  async (leagueId: string, week?: number, season?: number) => {
    const currentWeek = week || getCurrentWeek();
    const currentSeason = season || new Date().getFullYear();

    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId,
        week: currentWeek,
        season: currentSeason.toString(),
      },
      select: {
        id: true,
        week: true,
        season: true,
        isPlayoff: true,
        isComplete: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
            roster: {
              select: {
                position: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    status: true,
                    projections: {
                      where: {
                        week: currentWeek,
                        season: currentSeason.toString(),
                      },
                      select: {
                        projectedPoints: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
              where: {
                position: {
                  notIn: ['BENCH', 'IR'],
                },
              },
            },
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                email: true,
              },
            },
            roster: {
              select: {
                position: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    status: true,
                    projections: {
                      where: {
                        week: currentWeek,
                        season: currentSeason.toString(),
                      },
                      select: {
                        projectedPoints: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
              where: {
                position: {
                  notIn: ['BENCH', 'IR'],
                },
              },
            },
          },
        },
        homeScore: true,
        awayScore: true,
      },
    });

    return matchups;
  },
  'matchups-optimized',
  {
    tags: [CACHE_TAGS.MATCHUPS],
    revalidate: CACHE_DURATIONS.REAL_TIME
  }
);

/**
 * Get player by ID with optimized queries
 */
export const getPlayerByIdOptimized = createServerCache(
  async (playerId: string, options?: { includeStats?: boolean; includeNews?: boolean }) => {
    const startTime = Date.now();
    
    try {
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
          stats: options?.includeStats ? {
            orderBy: { week: 'desc' },
            take: 5
          } : false,
          projections: {
            where: { 
              week: getCurrentWeek(),
              season: new Date().getFullYear().toString()
            }
          },
          news: options?.includeNews ? {
            orderBy: { publishedAt: 'desc' },
            take: 3
          } : false
        }
      });
      
      recordQueryPerformance('getPlayerById', Date.now() - startTime);
      return player;
    } catch (error) {
      recordQueryPerformance('getPlayerById', Date.now() - startTime, true);
      throw error;
    }
  },
  { 
    tags: [`player-{0}`],
    revalidate: 60 
  }
);

/**
 * Get roster with optimized queries
 */
export const getRosterOptimized = createServerCache(
  async (teamId: string) => {
    const roster = await prisma.roster.findMany({
      where: { teamId },
      select: {
        id: true,
        position: true,
        acquisitionDate: true,
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            byeWeek: true,
            adp: true,
            status: true,
            injuryStatus: true,
            // Get latest stats efficiently
            stats: {
              where: {
                season: new Date().getFullYear().toString(),
              },
              select: {
                week: true,
                fantasyPoints: true,
                stats: true,
              },
              orderBy: { week: 'desc' },
              take: 5,
            },
            // Get current week projection
            projections: {
              where: {
                week: getCurrentWeek(),
                season: new Date().getFullYear().toString(),
              },
              select: {
                projectedPoints: true,
                confidence: true,
              },
              orderBy: { confidence: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        {
          position: 'asc',
        },
        {
          player: {
            name: 'asc',
          },
        },
      ],
    });

    return roster;
  },
  'roster-optimized',
  {
    tags: [CACHE_TAGS.ROSTER],
    revalidate: CACHE_DURATIONS.REAL_TIME
  }
);

/**
 * Batch operations for better performance
 */
export const batchOperations = {
  // Batch create players
  async createPlayers(players: any[]) {
    return prisma.player.createMany({
      data: players,
      skipDuplicates: true,
    });
  },

  // Batch update player stats
  async updatePlayerStats(updates: Array<{
    playerId: string;
    week: number;
    season: string;
    fantasyPoints: number;
    stats: any;
  }>) {
    return prisma.$transaction(
      updates.map(update =>
        prisma.playerStats.upsert({
          where: {
            playerId_week_season: {
              playerId: update.playerId,
              week: update.week,
              season: update.season,
            },
          },
          update: {
            fantasyPoints: update.fantasyPoints,
            stats: update.stats,
          },
          create: {
            playerId: update.playerId,
            week: update.week,
            season: update.season,
            fantasyPoints: update.fantasyPoints,
            stats: update.stats,
          },
        })
      )
    );
  },

  // Batch update rosters
  async updateRosters(teamId: string, changes: Array<{
    playerId: string;
    position: string;
    action: 'add' | 'remove' | 'move';
  }>) {
    const operations = changes.map(change => {
      if (change.action === 'remove') {
        return prisma.roster.deleteMany({
          where: {
            teamId,
            playerId: change.playerId,
          },
        });
      } else if (change.action === 'add') {
        return prisma.roster.create({
          data: {
            teamId,
            playerId: change.playerId,
            position: change.position as any,
            acquisitionDate: new Date(),
          },
        });
      } else {
        return prisma.roster.updateMany({
          where: {
            teamId,
            playerId: change.playerId,
          },
          data: {
            position: change.position as any,
          },
        });
      }
    });

    return prisma.$transaction(operations);
  },
};

// Connection health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  message?: string;
}> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - start;
    
    return {
      healthy: false,
      latency,
      message: (error as Error).message,
    };
  }
}

// Export types
export type { PrismaClient };

// Close connection on app shutdown
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}