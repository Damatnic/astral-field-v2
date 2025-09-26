/**
 * Phoenix Query Optimizer
 * High-performance query patterns for Astral Field sports application
 * 
 * Features:
 * - Optimized queries for sub-50ms latency
 * - Intelligent caching integration
 * - N+1 query elimination
 * - Database connection pooling
 * - Real-time data optimization
 * - Sports-specific query patterns
 * - Performance monitoring and analytics
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { dbPool } from './database-pool'
import { cacheManager } from './cache-manager'
import pino from 'pino'

interface QueryConfig {
  enableCaching?: boolean
  cacheEnabled?: boolean
  cacheTTL?: number
  enableLogging?: boolean
  maxRetries?: number
  timeout?: number
}

interface PaginationOptions {
  page?: number
  limit?: number
  cursor?: string
}

interface PlayerSearchFilters {
  position?: string[]
  team?: string[]
  status?: string
  search?: string
  minRank?: number
  maxRank?: number
  isRookie?: boolean
  isFantasyRelevant?: boolean
}

interface QueryPerformanceMetrics {
  queryName: string
  executionTime: number
  cacheHit: boolean
  recordCount: number
  timestamp: Date
}

class QueryOptimizer {
  private static instance: QueryOptimizer
  private prisma: PrismaClient
  private logger: pino.Logger
  private defaultConfig: Required<QueryConfig>
  private metrics: QueryPerformanceMetrics[] = []

  private constructor(config: QueryConfig = {}) {
    this.prisma = dbPool.getPrisma()
    this.logger = pino({
      name: 'QueryOptimizer',
      level: process.env.LOG_LEVEL || 'info'
    })

    this.defaultConfig = {
      enableCaching: config.enableCaching ?? true,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL || 300,
      enableLogging: config.enableLogging ?? (process.env.NODE_ENV === 'development'),
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000
    }
  }

  static getInstance(config?: QueryConfig): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer(config)
    }
    return QueryOptimizer.instance
  }

  // ========================================
  // LEAGUE AND DASHBOARD QUERIES
  // ========================================

  /**
   * Optimized league dashboard - Single transaction, multiple parallel queries
   * Target: <50ms execution time
   */
  async getLeagueDashboard(leagueId: string, userId: string, config?: QueryConfig): Promise<any> {
    const queryConfig = { ...this.defaultConfig, ...config }
    const cacheKey = `dashboard:${leagueId}:${userId}`

    return await this.executeWithCache(
      cacheKey,
      async () => {
        return await this.prisma.$transaction(async (tx) => {
          const [league, userTeam, standings, recentActivity, currentWeek] = await Promise.all([
            // League info with optimized includes
            tx.leagues.findUnique({
              where: { id: leagueId },
              select: {
                id: true,
                name: true,
                currentWeek: true,
                season: true,
                playoffs: true,
                settings: true,
                scoringSettings: true,
                teams: {
                  select: {
                    id: true,
                    name: true,
                    wins: true,
                    losses: true,
                    ties: true,
                    pointsFor: true,
                    pointsAgainst: true,
                    standing: true,
                    ownerId: true,
                    users: {
                      select: { 
                        id: true,
                        name: true, 
                        avatar: true 
                      }
                    }
                  },
                  orderBy: [
                    { standing: 'asc' },
                    { pointsFor: 'desc' }
                  ]
                }
              }
            }),

            // User's team with optimized roster
            tx.teams.findFirst({
              where: { 
                leagueId, 
                ownerId: userId 
              },
              select: {
                id: true,
                name: true,
                wins: true,
                losses: true,
                ties: true,
                pointsFor: true,
                pointsAgainst: true,
                standing: true,
                waiverPriority: true,
                faabBudget: true,
                faabSpent: true,
                roster: {
                  select: {
                    id: true,
                    position: true,
                    isStarter: true,
                    isLocked: true,
                    players: {
                      select: {
                        id: true,
                        name: true,
                        position: true,
                        nflTeam: true,
                        imageUrl: true,
                        status: true,
                        injuryStatus: true,
                        byeWeek: true,
                        player_stats: {
                          where: { 
                            season: '2024',
                            week: { 
                              gte: Math.max(1, (new Date().getMonth() >= 8 ? 1 : 1)) // Current season week range
                            }
                          },
                          select: { 
                            week: true, 
                            fantasyPoints: true,
                            gameDate: true
                          },
                          orderBy: { week: 'desc' },
                          take: 3 // Last 3 weeks
                        }
                      }
                    }
                  },
                  orderBy: [
                    { isStarter: 'desc' },
                    { position: 'asc' }
                  ]
                }
              }
            }),

            // Pre-calculated standings using optimized query
            tx.$queryRaw<any[]>`
              WITH team_standings AS (
                SELECT 
                  t.id,
                  t.name,
                  t.wins,
                  t.losses,
                  t.ties,
                  t.pointsFor,
                  t.pointsAgainst,
                  t.pointsFor - t.pointsAgainst as pointsDiff,
                  ROW_NUMBER() OVER (
                    ORDER BY t.wins DESC, 
                             t.pointsFor DESC, 
                             t.pointsAgainst ASC
                  ) as calculated_standing,
                  u.name as owner_name,
                  u.avatar as owner_avatar
                FROM teams t
                JOIN users u ON t.ownerId = u.id
                WHERE t.leagueId = ${leagueId}
              )
              SELECT * FROM team_standings
              ORDER BY calculated_standing
            `,

            // Recent league activity - optimized with specific timeframe
            tx.audit_logs.findMany({
              where: {
                users: {
                  teams: { 
                    some: { leagueId } 
                  }
                },
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
              },
              select: {
                id: true,
                action: true,
                details: true,
                createdAt: true,
                users: { 
                  select: { 
                    name: true,
                    avatar: true
                  } 
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 15
            }),

            // Current week matchups
            tx.matchups.findMany({
              where: {
                leagueId,
                week: { 
                  gte: Math.max(1, new Date().getMonth() >= 8 ? 1 : 1) // Current week
                }
              },
              select: {
                id: true,
                week: true,
                homeScore: true,
                awayScore: true,
                isComplete: true,
                teams_matchups_homeTeamIdToteams: {
                  select: { 
                    id: true,
                    name: true,
                    users: { select: { name: true } }
                  }
                },
                teams_matchups_awayTeamIdToteams: {
                  select: { 
                    id: true,
                    name: true,
                    users: { select: { name: true } }
                  }
                }
              },
              orderBy: [
                { week: 'desc' },
                { id: 'asc' }
              ],
              take: 10
            })
          ])

          return {
            league,
            userTeam,
            standings,
            recentActivity,
            matchups: currentWeek,
            metadata: {
              lastUpdated: new Date(),
              queryTime: Date.now()
            }
          }
        })
      },
      queryConfig.cacheTTL,
      'getLeagueDashboard'
    )
  }

  // ========================================
  // PLAYER SEARCH AND FILTERING
  // ========================================

  /**
   * High-performance player search with intelligent caching
   * Target: <25ms execution time
   */
  async searchPlayers(
    filters: PlayerSearchFilters, 
    pagination: PaginationOptions = {},
    config?: QueryConfig
  ): Promise<any> {
    const queryConfig = { ...this.defaultConfig, ...config }
    const { page = 1, limit = 50 } = pagination
    const offset = (page - 1) * limit

    // Create cache key from filters
    const cacheKey = `players:search:${JSON.stringify({ filters, page, limit })}`

    return await this.executeWithCache(
      cacheKey,
      async () => {
        // Build dynamic where clause
        const whereClause: Prisma.playersWhereInput = {
          isActive: true,
          isFantasyRelevant: filters.isFantasyRelevant ?? true,
          ...(filters.position?.length && { 
            position: { in: filters.position as any[] } 
          }),
          ...(filters.team?.length && { 
            nflTeam: { in: filters.team } 
          }),
          ...(filters.status && { status: filters.status }),
          ...(filters.isRookie !== undefined && { isRookie: filters.isRookie }),
          ...(filters.minRank && { rank: { gte: filters.minRank } }),
          ...(filters.maxRank && { rank: { lte: filters.maxRank } }),
          ...(filters.search && {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { nflTeam: { contains: filters.search, mode: 'insensitive' } }
            ]
          })
        }

        const [players, totalCount] = await Promise.all([
          this.prisma.players.findMany({
            where: whereClause,
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              position: true,
              nflTeam: true,
              imageUrl: true,
              status: true,
              injuryStatus: true,
              injuryDetails: true,
              byeWeek: true,
              rank: true,
              adp: true,
              dynastyRank: true,
              age: true,
              experience: true,
              college: true,
              height: true,
              weight: true,
              // Recent stats for performance context
              player_stats: {
                where: { 
                  season: '2024',
                  week: { gte: 1 }
                },
                select: { 
                  week: true, 
                  fantasyPoints: true,
                  stats: true,
                  gameDate: true
                },
                orderBy: { week: 'desc' },
                take: 5
              },
              // Recent projections
              player_projections: {
                where: {
                  season: 2024,
                  week: { gte: 1 }
                },
                select: {
                  week: true,
                  points: true,
                  confidence: true,
                  source: true
                },
                orderBy: { week: 'desc' },
                take: 3
              }
            },
            orderBy: [
              ...(filters.position ? [{ rank: 'asc' as const }] : []),
              { adp: 'asc' as const },
              { name: 'asc' as const }
            ],
            skip: offset,
            take: limit
          }),

          // Get total count for pagination
          this.prisma.players.count({ where: whereClause })
        ])

        return {
          players,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
            hasNext: page < Math.ceil(totalCount / limit),
            hasPrev: page > 1
          },
          metadata: {
            filtersApplied: Object.keys(filters).length,
            queryTime: Date.now()
          }
        }
      },
      300, // 5 minutes cache for player searches
      'searchPlayers'
    )
  }

  // ========================================
  // REAL-TIME SCORING UPDATES
  // ========================================

  /**
   * Lightning-fast live scoring updates
   * Target: <30ms execution time
   */
  async updateLiveScores(leagueId: string, week: number): Promise<any> {
    const startTime = Date.now()

    try {
      // Use raw SQL for maximum performance
      const result = await this.prisma.$queryRaw<any[]>`
        WITH roster_scores AS (
          SELECT 
            r.teamId,
            SUM(
              CASE 
                WHEN r.isStarter = true AND ps.fantasyPoints IS NOT NULL 
                THEN ps.fantasyPoints 
                ELSE 0 
              END
            ) as team_score
          FROM roster r
          LEFT JOIN player_stats ps ON ps.playerId = r.playerId 
            AND ps.week = ${week} 
            AND ps.season = '2024'
          WHERE r.teamId IN (
            SELECT DISTINCT t.id 
            FROM teams t 
            WHERE t.leagueId = ${leagueId}
          )
          GROUP BY r.teamId
        ),
        updated_matchups AS (
          UPDATE matchups 
          SET 
            homeScore = COALESCE(home_scores.team_score, 0),
            awayScore = COALESCE(away_scores.team_score, 0),
            updatedAt = NOW()
          FROM roster_scores home_scores, roster_scores away_scores
          WHERE matchups.leagueId = ${leagueId} 
            AND matchups.week = ${week}
            AND matchups.homeTeamId = home_scores.teamId
            AND matchups.awayTeamId = away_scores.teamId
            AND matchups.isComplete = false
          RETURNING 
            matchups.id,
            matchups.homeTeamId,
            matchups.awayTeamId,
            matchups.homeScore,
            matchups.awayScore,
            matchups.week
        )
        SELECT 
          um.*,
          ht.name as home_team_name,
          at.name as away_team_name
        FROM updated_matchups um
        JOIN teams ht ON um.homeTeamId = ht.id
        JOIN teams at ON um.awayTeamId = at.id
      `

      // Invalidate related caches
      await Promise.all([
        cacheManager.invalidatePattern(`live:scores:${leagueId}:*`),
        cacheManager.invalidatePattern(`standings:${leagueId}`),
        cacheManager.invalidatePattern(`dashboard:${leagueId}:*`)
      ])

      const executionTime = Date.now() - startTime
      this.recordMetrics('updateLiveScores', executionTime, false, result.length)

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordMetrics('updateLiveScores', executionTime, false, 0)
      this.logger.error('Live scores update failed:', error)
      throw error
    }
  }

  // ========================================
  // DRAFT OPTIMIZATION
  // ========================================

  /**
   * Ultra-fast draft board updates
   * Target: <20ms execution time
   */
  async getDraftBoard(draftId: string, config?: QueryConfig): Promise<any> {
    const queryConfig = { ...this.defaultConfig, ...config }
    const cacheKey = `draft:board:${draftId}`

    return await this.executeWithCache(
      cacheKey,
      async () => {
        return await this.prisma.$transaction(async (tx) => {
          const [draft, draftOrder, picks, availablePlayers] = await Promise.all([
            // Draft information
            tx.drafts.findUnique({
              where: { id: draftId },
              select: {
                id: true,
                status: true,
                currentRound: true,
                currentPick: true,
                currentTeamId: true,
                timeRemaining: true,
                totalRounds: true,
                timePerPick: true,
                type: true,
                leagues: {
                  select: {
                    id: true,
                    name: true,
                    teams: {
                      select: {
                        id: true,
                        name: true,
                        users: { select: { name: true, avatar: true } }
                      }
                    }
                  }
                }
              }
            }),

            // Draft order
            tx.draft_order.findMany({
              where: { draftId },
              select: {
                pickOrder: true,
                teamId: true,
                teams: {
                  select: {
                    id: true,
                    name: true,
                    users: { select: { name: true, avatar: true } }
                  }
                }
              },
              orderBy: { pickOrder: 'asc' }
            }),

            // All picks made so far
            tx.draft_picks.findMany({
              where: { draftId },
              select: {
                pickNumber: true,
                round: true,
                pickInRound: true,
                teamId: true,
                playerId: true,
                isAutoPick: true,
                pickMadeAt: true,
                players: {
                  select: {
                    id: true,
                    name: true,
                    position: true,
                    nflTeam: true,
                    imageUrl: true,
                    rank: true,
                    adp: true
                  }
                },
                teams: {
                  select: {
                    name: true,
                    users: { select: { name: true } }
                  }
                }
              },
              orderBy: { pickNumber: 'asc' }
            }),

            // Top available players for quick reference
            tx.$queryRaw<any[]>`
              SELECT 
                p.id,
                p.name,
                p.position,
                p.nflTeam,
                p.imageUrl,
                p.rank,
                p.adp,
                p.dynastyRank
              FROM players p
              WHERE p.isActive = true 
                AND p.isFantasyRelevant = true
                AND p.id NOT IN (
                  SELECT dp.playerId 
                  FROM draft_picks dp 
                  WHERE dp.draftId = ${draftId} 
                    AND dp.playerId IS NOT NULL
                )
              ORDER BY 
                CASE p.position 
                  WHEN 'QB' THEN 1 
                  WHEN 'RB' THEN 2 
                  WHEN 'WR' THEN 3 
                  WHEN 'TE' THEN 4 
                  ELSE 5 
                END,
                p.rank NULLS LAST,
                p.adp NULLS LAST
              LIMIT 200
            `
          ])

          return {
            draft,
            draftOrder,
            picks,
            availablePlayers,
            metadata: {
              totalPicks: picks.length,
              remainingPicks: (draft?.totalRounds || 15) * (draft?.leagues?.teams?.length || 10) - picks.length,
              lastUpdated: new Date()
            }
          }
        })
      },
      10, // 10 seconds cache for draft data
      'getDraftBoard'
    )
  }

  /**
   * Make draft pick with optimized updates
   * Target: <40ms execution time
   */
  async makeDraftPick(
    draftId: string, 
    teamId: string, 
    playerId: string, 
    timeUsed: number = 0
  ): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Get current draft state
        const draft = await tx.drafts.findUnique({
          where: { id: draftId },
          select: {
            currentPick: true,
            currentRound: true,
            totalRounds: true,
            timePerPick: true,
            leagues: {
              select: {
                teams: { select: { id: true } }
              }
            }
          }
        })

        if (!draft) throw new Error('Draft not found')

        const teamsCount = draft.leagues?.teams.length || 10
        const totalPicks = draft.totalRounds * teamsCount

        // Create the pick
        const pick = await tx.draft_picks.create({
          data: {
            id: `pick-${draftId}-${draft.currentPick}`,
            draftId,
            pickNumber: draft.currentPick,
            round: draft.currentRound,
            pickInRound: ((draft.currentPick - 1) % teamsCount) + 1,
            teamId,
            playerId,
            timeUsed,
            pickMadeAt: new Date()
          },
          include: {
            players: {
              select: {
                name: true,
                position: true,
                nflTeam: true,
                imageUrl: true
              }
            },
            teams: {
              select: {
                name: true,
                users: { select: { name: true } }
              }
            }
          }
        })

        // Calculate next pick
        const nextPick = draft.currentPick + 1
        const nextRound = Math.ceil(nextPick / teamsCount)
        const isSnakeDraft = true // Assuming snake draft
        
        let nextTeamIndex: number
        if (isSnakeDraft) {
          const pickInRound = ((nextPick - 1) % teamsCount) + 1
          nextTeamIndex = nextRound % 2 === 1 
            ? pickInRound - 1  // Odd rounds: normal order
            : teamsCount - pickInRound  // Even rounds: reverse order
        } else {
          nextTeamIndex = ((nextPick - 1) % teamsCount)
        }

        // Get next team ID
        const teams = await tx.teams.findMany({
          where: { leagueId: draft.leagues?.id },
          select: { id: true },
          orderBy: { createdAt: 'asc' }
        })

        const nextTeamId = teams[nextTeamIndex]?.id

        // Update draft state
        const isComplete = nextPick > totalPicks
        await tx.drafts.update({
          where: { id: draftId },
          data: {
            currentPick: isComplete ? draft.currentPick : nextPick,
            currentRound: isComplete ? draft.currentRound : nextRound,
            currentTeamId: isComplete ? null : nextTeamId,
            timeRemaining: isComplete ? 0 : draft.timePerPick,
            completedAt: isComplete ? new Date() : null,
            status: isComplete ? 'COMPLETED' : 'IN_PROGRESS'
          }
        })

        return {
          pick,
          nextTeamId: isComplete ? null : nextTeamId,
          isComplete,
          nextPick: isComplete ? null : nextPick,
          nextRound: isComplete ? null : nextRound
        }
      })

      // Invalidate draft caches
      await Promise.all([
        cacheManager.invalidateDraftData(draftId),
        cacheManager.invalidatePattern(`draft:*:${draftId}`)
      ])

      const executionTime = Date.now() - startTime
      this.recordMetrics('makeDraftPick', executionTime, false, 1)

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordMetrics('makeDraftPick', executionTime, false, 0)
      this.logger.error('Draft pick failed:', error)
      throw error
    }
  }

  // ========================================
  // HELPER METHODS AND UTILITIES
  // ========================================

  private async executeWithCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number,
    metricName: string
  ): Promise<T> {
    const startTime = Date.now()

    try {
      // Try cache first
      if (this.defaultConfig.enableCaching) {
        const cached = await cacheManager.get<T>(cacheKey)
        if (cached !== null) {
          const executionTime = Date.now() - startTime
          this.recordMetrics(metricName, executionTime, true, 0)
          return cached
        }
      }

      // Execute query
      const result = await queryFn()

      // Cache result
      if (this.defaultConfig.enableCaching && result) {
        await cacheManager.set(cacheKey, result, ttl)
      }

      const executionTime = Date.now() - startTime
      this.recordMetrics(metricName, executionTime, false, Array.isArray(result) ? result.length : 1)

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordMetrics(metricName, executionTime, false, 0)
      throw error
    }
  }

  private recordMetrics(
    queryName: string, 
    executionTime: number, 
    cacheHit: boolean, 
    recordCount: number
  ): void {
    const metric: QueryPerformanceMetrics = {
      queryName,
      executionTime,
      cacheHit,
      recordCount,
      timestamp: new Date()
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Log slow queries
    if (executionTime > 100 && this.defaultConfig.enableLogging) {
      this.logger.warn('Slow query detected', {
        queryName,
        executionTime: `${executionTime}ms`,
        cacheHit,
        recordCount
      })
    }
  }

  // ========================================
  // PUBLIC UTILITY METHODS
  // ========================================

  getMetrics(): QueryPerformanceMetrics[] {
    return [...this.metrics]
  }

  getAverageExecutionTime(queryName?: string): number {
    const relevantMetrics = queryName 
      ? this.metrics.filter(m => m.queryName === queryName)
      : this.metrics

    if (relevantMetrics.length === 0) return 0

    const total = relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    return Math.round((total / relevantMetrics.length) * 100) / 100
  }

  getCacheHitRate(queryName?: string): number {
    const relevantMetrics = queryName 
      ? this.metrics.filter(m => m.queryName === queryName)
      : this.metrics

    if (relevantMetrics.length === 0) return 0

    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length
    return Math.round((cacheHits / relevantMetrics.length) * 10000) / 100 // Percentage with 2 decimals
  }

  clearMetrics(): void {
    this.metrics = []
  }
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer.getInstance()

// Export for testing and advanced usage
export { QueryOptimizer }

// Export types for external use
export type { PlayerSearchFilters, PaginationOptions, QueryPerformanceMetrics }