/**
 * Optimized Database Connection and Query Utilities for Astral Field
 * Implements connection pooling, query optimization, and performance monitoring
 */

import { PrismaClient } from '@prisma/client';
import { createServerCache, CACHE_DURATIONS, CACHE_TAGS } from './cache';

// Enhanced Prisma client with performance monitoring
class OptimizedPrismaClient extends PrismaClient {
  private queryCount = 0;
  private totalQueryTime = 0;

  constructor() {
    super({
      // Connection pooling optimization
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Enable query logging in development
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Performance monitoring middleware
    this.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;
      
      this.queryCount++;
      this.totalQueryTime += duration;
      
      // Log slow queries (>1000ms)
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected: ${params.model}.${params.action} (${duration}ms)`);
      }
      
      return result;
    });
  }

  getPerformanceStats() {
    return {
      queryCount: this.queryCount,
      totalQueryTime: this.totalQueryTime,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
    };
  }

  resetStats() {
    this.queryCount = 0;
    this.totalQueryTime = 0;
  }
}

// Singleton instance
let prisma: OptimizedPrismaClient;

declare global {
  var __prisma: OptimizedPrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prisma = new OptimizedPrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new OptimizedPrismaClient();
  }
  prisma = global.__prisma;
}

// Optimized query functions with built-in caching

/**
 * Get players with optimized queries and caching
 */
export const getPlayersOptimized = createServerCache(
  async (filters: {
    search?: string;
    positions?: string[];
    teams?: string[];
    availability?: string;
    leagueId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const {
      search = '',
      positions = [],
      teams = [],
      availability = 'all',
      leagueId,
      limit = 20,
      offset = 0,
    } = filters;

    // Build optimized where clause
    const whereClause: any = {
      AND: [
        // Full-text search optimization
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        // Position filter
        positions.length > 0 ? { position: { in: positions } } : {},
        // Team filter
        teams.length > 0 ? { nflTeam: { in: teams } } : {},
        // Always include active status check
        { status: { in: ['ACTIVE', 'QUESTIONABLE', 'DOUBTFUL'] } },
      ].filter(clause => Object.keys(clause).length > 0),
    };

    // Availability filter with optimized subquery
    if (availability !== 'all' && leagueId) {
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
      } else if (availability === 'rostered') {
        whereClause.AND.push({
          rosterPlayers: {
            some: {
              team: { leagueId },
            },
          },
        });
      }
    }

    // Use Promise.all for parallel queries
    const [players, totalCount] = await Promise.all([
      prisma.player.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
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
              season: new Date().getFullYear().toString(),
              week: getCurrentWeek(),
            },
            select: {
              projectedPoints: true,
              confidence: true,
              source: true,
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
                    owner: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
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
        skip: offset,
        take: limit,
      }),
      prisma.player.count({ where: whereClause }),
    ]);

    return { players, totalCount };
  },
  'players-optimized',
  {
    tags: [CACHE_TAGS.PLAYERS],
    revalidate: CACHE_DURATIONS.DYNAMIC,
  }
);

/**
 * Get matchups with optimized queries and caching
 */
export const getMatchupsOptimized = createServerCache(
  async (leagueId: string, week: number, season: number = new Date().getFullYear()) => {
    // Single optimized query with proper joins
    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId,
        week,
        season: season.toString(),
      },
      select: {
        id: true,
        week: true,
        homeScore: true,
        awayScore: true,
        isComplete: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
            // Only get starting lineup for score calculation
            roster: {
              where: {
                position: {
                  not: 'BENCH',
                },
              },
              select: {
                position: true,
                playerId: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    status: true,
                  },
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
                name: true,
              },
            },
            roster: {
              where: {
                position: {
                  not: 'BENCH',
                },
              },
              select: {
                position: true,
                playerId: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return matchups;
  },
  'matchups-optimized',
  {
    tags: [CACHE_TAGS.MATCHUPS],
    revalidate: CACHE_DURATIONS.REAL_TIME,
  }
);

/**
 * Get roster with optimized queries and caching
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
            firstName: true,
            lastName: true,
            position: true,
            nflTeam: true,
            byeWeek: true,
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
              },
              orderBy: { week: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { player: { name: 'asc' } },
      ],
    });

    return roster;
  },
  'roster-optimized',
  {
    tags: [CACHE_TAGS.ROSTER],
    revalidate: CACHE_DURATIONS.DYNAMIC,
  }
);

/**
 * Get league standings with optimized queries
 */
export const getLeagueStandingsOptimized = createServerCache(
  async (leagueId: string) => {
    const teams = await prisma.team.findMany({
      where: { leagueId },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' },
      ],
    });

    return teams;
  },
  'league-standings',
  {
    tags: [CACHE_TAGS.LEAGUE],
    revalidate: CACHE_DURATIONS.DYNAMIC,
  }
);

/**
 * Batch operations for better performance
 */
export const batchOperations = {
  /**
   * Update multiple player stats in a single transaction
   */
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

  /**
   * Update multiple matchup scores in a single transaction
   */
  async updateMatchupScores(updates: Array<{
    matchupId: string;
    homeScore: number;
    awayScore: number;
  }>) {
    return prisma.$transaction(
      updates.map(update =>
        prisma.matchup.update({
          where: { id: update.matchupId },
          data: {
            homeScore: update.homeScore,
            awayScore: update.awayScore,
            updatedAt: new Date(),
          },
        })
      )
    );
  },
};

// Helper functions
function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

// Export optimized prisma instance
export { prisma };

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Performance monitoring
export function getDatabasePerformanceStats() {
  return (prisma as OptimizedPrismaClient).getPerformanceStats();
}

export function resetDatabaseStats() {
  (prisma as OptimizedPrismaClient).resetStats();
}

export default prisma;