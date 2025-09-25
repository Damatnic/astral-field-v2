/**
 * Optimized Database Queries
 * High-performance queries with proper indexing and minimal data fetching
 */

import { prisma } from '@/lib/prisma';
import { cacheService, CACHE_TTL } from '@/lib/cache/redis-client';

export class OptimizedQueries {
  
  // ==================== LEAGUE QUERIES ====================
  
  /**
   * Get league with essential data only
   * Used for navigation and basic league info
   */
  static async getLeagueBasic(leagueId: string) {
    return await cacheService.getOrSet(
      `league:basic:${leagueId}`,
      async () => {
        return await prisma.league.findUnique({
          where: { id: leagueId },
          select: {
            id: true,
            name: true,
            status: true,
            currentWeek: true,
            season: true,
            commissionerId: true,
            settings: {
              select: {
                rosterSize: true,
                startingLineup: true,
                scoringType: true,
                tradeDeadlineWeek: true,
                waiverType: true
              }
            }
          }
        });
      },
      CACHE_TTL.LEAGUE_SETTINGS
    );
  }

  /**
   * Get league standings with optimized team data
   * Includes wins, losses, points for efficient standings display
   */
  static async getLeagueStandings(leagueId: string) {
    return await cacheService.getOrSet(
      `league:standings:${leagueId}`,
      async () => {
        return await prisma.team.findMany({
          where: { leagueId },
          select: {
            id: true,
            name: true,
            wins: true,
            losses: true,
            ties: true,
            totalPointsFor: true,
            totalPointsAgainst: true,
            owner: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: [
            { wins: 'desc' },
            { totalPointsFor: 'desc' }
          ]
        });
      },
      CACHE_TTL.LEAGUE_STANDINGS
    );
  }

  /**
   * Get current week matchups with scores
   * Optimized for scoreboard display
   */
  static async getCurrentMatchups(leagueId: string, week: number) {
    return await cacheService.getOrSet(
      `matchups:current:${leagueId}:${week}`,
      async () => {
        return await prisma.matchup.findMany({
          where: {
            leagueId,
            week
          },
          select: {
            id: true,
            team1Score: true,
            team2Score: true,
            status: true,
            team1: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              }
            },
            team2: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              }
            }
          }
        });
      },
      CACHE_TTL.MATCHUP_SCORES
    );
  }

  // ==================== TEAM QUERIES ====================

  /**
   * Get team roster with player essentials
   * Optimized for roster display and lineup setting
   */
  static async getTeamRoster(teamId: string) {
    return await cacheService.getOrSet(
      `team:roster:${teamId}`,
      async () => {
        return await prisma.roster.findMany({
          where: { teamId },
          select: {
            id: true,
            position: true,
            acquisitionDate: true,
            acquisitionType: true,
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true,
                isActive: true,
                injuryStatus: true,
                byeWeek: true,
                espnId: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { player: { name: 'asc' } }
          ]
        });
      },
      CACHE_TTL.TEAM_ROSTER
    );
  }

  /**
   * Get team lineup for specific week
   * Includes starting lineup and bench
   */
  static async getTeamLineup(teamId: string, week: number) {
    return await cacheService.getOrSet(
      `team:lineup:${teamId}:${week}`,
      async () => {
        return await prisma.lineup.findFirst({
          where: { teamId, week },
          select: {
            id: true,
            week: true,
            isLocked: true,
            slots: {
              select: {
                id: true,
                position: true,
                playerId: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    team: true,
                    injuryStatus: true,
                    isActive: true
                  }
                }
              }
            }
          }
        });
      },
      CACHE_TTL.TEAM_LINEUP
    );
  }

  /**
   * Get team basic info for quick access
   */
  static async getTeamBasic(teamId: string) {
    return await cacheService.getOrSet(
      `team:basic:${teamId}`,
      async () => {
        return await prisma.team.findUnique({
          where: { id: teamId },
          select: {
            id: true,
            name: true,
            leagueId: true,
            ownerId: true,
            wins: true,
            losses: true,
            ties: true,
            totalPointsFor: true,
            totalPointsAgainst: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        });
      },
      CACHE_TTL.TEAM_ROSTER
    );
  }

  // ==================== PLAYER QUERIES ====================

  /**
   * Get available players for waivers/free agents
   * Optimized with pagination and filtering
   */
  static async getAvailablePlayers(
    leagueId: string,
    position?: string,
    searchTerm?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const cacheKey = `players:available:${leagueId}:${position || 'all'}:${searchTerm || 'none'}:${limit}:${offset}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const rosterPlayerIds = await prisma.roster.findMany({
          where: {
            team: { leagueId }
          },
          select: { playerId: true }
        });

        const takenIds = rosterPlayerIds.map(r => r.playerId);

        const whereClause: any = {
          id: { notIn: takenIds },
          isActive: true
        };

        if (position) {
          whereClause.position = position;
        }

        if (searchTerm) {
          whereClause.name = {
            contains: searchTerm,
            mode: 'insensitive'
          };
        }

        return await prisma.player.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            position: true,
            team: true,
            byeWeek: true,
            injuryStatus: true,
            isActive: true,
            espnId: true,
            averagePoints: true,
            projectedPoints: true
          },
          orderBy: [
            { averagePoints: 'desc' },
            { name: 'asc' }
          ],
          take: limit,
          skip: offset
        });
      },
      CACHE_TTL.PLAYER_INFO
    );
  }

  /**
   * Get player statistics for specific week
   * Used for scoring calculations
   */
  static async getPlayerStats(playerId: string, week: number) {
    return await cacheService.getOrSet(
      `player:stats:${playerId}:${week}`,
      async () => {
        return await prisma.playerStats.findFirst({
          where: { playerId, week },
          select: {
            week: true,
            fantasyPoints: true,
            stats: true,
            isProjected: true,
            lastUpdated: true
          }
        });
      },
      CACHE_TTL.PLAYER_STATS
    );
  }

  /**
   * Get player with essential info only
   * Used for quick player lookups
   */
  static async getPlayerBasic(playerId: string) {
    return await cacheService.getOrSet(
      `player:basic:${playerId}`,
      async () => {
        return await prisma.player.findUnique({
          where: { id: playerId },
          select: {
            id: true,
            name: true,
            position: true,
            team: true,
            byeWeek: true,
            injuryStatus: true,
            isActive: true,
            espnId: true
          }
        });
      },
      CACHE_TTL.PLAYER_INFO
    );
  }

  // ==================== DRAFT QUERIES ====================

  /**
   * Get draft with essential data for draft room
   */
  static async getDraftBasic(draftId: string) {
    return await cacheService.getOrSet(
      `draft:basic:${draftId}`,
      async () => {
        return await prisma.draft.findUnique({
          where: { id: draftId },
          select: {
            id: true,
            leagueId: true,
            status: true,
            currentRound: true,
            currentPick: true,
            pickTimeLimit: true,
            draftOrder: true,
            createdAt: true
          }
        });
      },
      CACHE_TTL.DRAFT_STATE
    );
  }

  /**
   * Get draft picks with minimal data
   * Used for draft board display
   */
  static async getDraftPicks(draftId: string) {
    return await cacheService.getOrSet(
      `draft:picks:${draftId}`,
      async () => {
        return await prisma.draftPick.findMany({
          where: { draftId },
          select: {
            id: true,
            round: true,
            pickNumber: true,
            pickTime: true,
            isAutoPick: true,
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { pickNumber: 'asc' }
        });
      },
      CACHE_TTL.DRAFT_STATE
    );
  }

  // ==================== TRADE QUERIES ====================

  /**
   * Get pending trades for a team
   * Used for trade management
   */
  static async getPendingTrades(teamId: string) {
    return await cacheService.getOrSet(
      `trades:pending:${teamId}`,
      async () => {
        return await prisma.transaction.findMany({
          where: {
            OR: [
              { teamId, type: 'trade', status: 'pending' },
              { 
                type: 'trade',
                status: 'pending',
                relatedData: {
                  path: ['toTeamId'],
                  equals: teamId
                }
              }
            ]
          },
          select: {
            id: true,
            type: true,
            status: true,
            playerIds: true,
            relatedData: true,
            createdAt: true,
            team: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      },
      CACHE_TTL.TRADE_ANALYSIS
    );
  }

  // ==================== WAIVER QUERIES ====================

  /**
   * Get waiver claims for a team
   */
  static async getWaiverClaims(teamId: string, week: number) {
    return await cacheService.getOrSet(
      `waivers:claims:${teamId}:${week}`,
      async () => {
        return await prisma.waiverClaim.findMany({
          where: { teamId, week },
          select: {
            id: true,
            priority: true,
            status: true,
            bidAmount: true,
            dropPlayerId: true,
            createdAt: true,
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true
              }
            },
            dropPlayer: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true
              }
            }
          },
          orderBy: { priority: 'asc' }
        });
      },
      CACHE_TTL.TEAM_LINEUP
    );
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Get multiple teams' basic info in one query
   */
  static async getTeamsBatch(teamIds: string[]) {
    if (teamIds.length === 0) return [];
    
    return await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        totalPointsFor: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });
  }

  /**
   * Get multiple players' basic info in one query
   */
  static async getPlayersBatch(playerIds: string[]) {
    if (playerIds.length === 0) return [];
    
    return await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        byeWeek: true,
        injuryStatus: true,
        isActive: true
      }
    });
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Invalidate related caches when data changes
   */
  static async invalidateTeamCaches(teamId: string) {
    await cacheService.invalidateTeamCache(teamId);
    
    // Also invalidate league standings since team data affects it
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { leagueId: true }
    });
    
    if (team) {
      await cacheService.delete(`league:standings:${team.leagueId}`);
    }
  }

  static async invalidateLeagueCaches(leagueId: string) {
    await cacheService.invalidateLeagueCache(leagueId);
  }

  static async invalidatePlayerCaches(playerId: string) {
    await cacheService.invalidatePlayerCache(playerId);
  }

  /**
   * Get players with pagination and filters
   */
  static async getPlayersOptimized(filters: {
    page?: number;
    limit?: number;
    search?: string;
    positions?: string[];
    teams?: string[];
    onlyAvailable?: boolean;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    
    if (filters.positions && filters.positions.length > 0) {
      where.position = { in: filters.positions };
    }
    
    if (filters.teams && filters.teams.length > 0) {
      where.team = { in: filters.teams };
    }
    
    if (filters.onlyAvailable) {
      where.isActive = true;
    }
    
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          position: true,
          team: true,
          byeWeek: true,
          injuryStatus: true,
          isActive: true,
          imageUrl: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.player.count({ where })
    ]);
    
    return {
      players,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get player by ID with optimized query
   */
  static async getPlayerByIdOptimized(playerId: string) {
    return await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        byeWeek: true,
        injuryStatus: true,
        isActive: true,
        imageUrl: true,
        stats: {
          select: {
            week: true,
            points: true,
            projectedPoints: true
          },
          orderBy: { week: 'desc' },
          take: 5
        }
      }
    });
  }
}

// Export convenience functions
export const getPlayersOptimized = OptimizedQueries.getPlayersOptimized;
export const getPlayerByIdOptimized = OptimizedQueries.getPlayerByIdOptimized;