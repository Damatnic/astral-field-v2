/**
 * Catalyst Database Optimizer
 * Advanced query optimization, connection pooling, and caching strategies
 */

import { PrismaClient } from '@prisma/client'

interface QueryCache {
  key: string
  result: any
  timestamp: number
  ttl: number
  tags: string[]
}

interface QueryMetrics {
  executionTime: number
  resultCount: number
  cacheHit: boolean
  query: string
  timestamp: number
}

interface ConnectionPoolConfig {
  maxConnections: number
  minConnections: number
  idleTimeout: number
  connectionTimeout: number
  retryAttempts: number
  retryDelay: number
}

class CatalystDatabaseOptimizer {
  private prisma: PrismaClient
  private queryCache = new Map<string, QueryCache>()
  private queryMetrics: QueryMetrics[] = []
  private connectionConfig: ConnectionPoolConfig
  
  // Query performance thresholds (in milliseconds)
  private readonly SLOW_QUERY_THRESHOLD = 1000
  private readonly CACHE_TTL_DEFAULT = 300000 // 5 minutes
  private readonly CACHE_MAX_SIZE = 1000

  constructor(
    prisma: PrismaClient,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.prisma = prisma
    this.connectionConfig = {
      maxConnections: 100,
      minConnections: 5,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    }

    this.setupConnectionPool()
    this.setupPerformanceLogging()
    this.startCacheCleanup()
  }

  private setupConnectionPool() {
    // Connection pool is configured via Prisma schema and environment variables
    // This method sets up monitoring and health checks
    console.log('[DB Optimizer] Connection pool configured:', this.connectionConfig)
  }

  private setupPerformanceLogging() {
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$use(async (params, next) => {
        const before = Date.now()
        const result = await next(params)
        const after = Date.now()
        const executionTime = after - before

        if (executionTime > this.SLOW_QUERY_THRESHOLD) {
          console.warn(`[DB Optimizer] Slow query detected (${executionTime}ms):`, {
            model: params.model,
            action: params.action,
            args: params.args
          })
        }

        this.recordQueryMetric({
          executionTime,
          resultCount: Array.isArray(result) ? result.length : 1,
          cacheHit: false,
          query: `${params.model}.${params.action}`,
          timestamp: Date.now()
        })

        return result
      })
    }
  }

  private startCacheCleanup() {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanExpiredCache()
    }, 300000)
  }

  /**
   * Optimized query execution with caching
   */
  async executeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      skipCache?: boolean
    } = {}
  ): Promise<T> {
    const { ttl = this.CACHE_TTL_DEFAULT, tags = [], skipCache = false } = options

    // Check cache first
    if (!skipCache) {
      const cached = this.getFromCache<T>(queryKey)
      if (cached) {
        this.recordQueryMetric({
          executionTime: 0,
          resultCount: Array.isArray(cached) ? cached.length : 1,
          cacheHit: true,
          query: queryKey,
          timestamp: Date.now()
        })
        return cached
      }
    }

    // Execute query with performance tracking
    const startTime = Date.now()
    try {
      const result = await queryFn()
      const executionTime = Date.now() - startTime

      // Cache the result
      if (!skipCache) {
        this.setCache(queryKey, result, ttl, tags)
      }

      this.recordQueryMetric({
        executionTime,
        resultCount: Array.isArray(result) ? result.length : 1,
        cacheHit: false,
        query: queryKey,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error(`[DB Optimizer] Query failed (${executionTime}ms):`, queryKey, error)
      throw error
    }
  }

  /**
   * Optimized player queries with advanced caching
   */
  async findPlayersOptimized(filters: {
    position?: string
    team?: string
    status?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    const cacheKey = `players:${JSON.stringify(filters)}`
    
    return this.executeQuery(
      cacheKey,
      async () => {
        const where: any = {}
        
        if (filters.position) where.position = filters.position
        if (filters.team) where.nflTeam = filters.team
        if (filters.status) where.status = filters.status
        
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { nflTeam: { contains: filters.search, mode: 'insensitive' } }
          ]
        }

        return this.prisma.player.findMany({
          where,
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            rank: true,
            adp: true,
            isFantasyRelevant: true,
            stats: {
              select: {
                week: true,
                fantasyPoints: true,
                stats: true
              },
              orderBy: { week: 'desc' },
              take: 5
            },
            projections: {
              select: {
                projectedPoints: true,
                confidence: true
              },
              take: 1
            },
            news: {
              select: {
                title: true,
                publishedAt: true
              },
              orderBy: { publishedAt: 'desc' },
              take: 3
            }
          },
          orderBy: filters.position 
            ? { rank: 'asc' }
            : [{ rank: 'asc' }, { name: 'asc' }],
          take: filters.limit || 50,
          skip: filters.offset || 0
        })
      },
      { 
        ttl: 300000, // 5 minutes
        tags: ['players', `position:${filters.position}`, `team:${filters.team}`] 
      }
    )
  }

  /**
   * Optimized matchup queries with live scoring support
   */
  async findMatchupsOptimized(leagueId: string, week: number) {
    const cacheKey = `matchups:${leagueId}:${week}`
    
    return this.executeQuery(
      cacheKey,
      async () => {
        return this.prisma.matchup.findMany({
          where: {
            leagueId,
            week
          },
          select: {
            id: true,
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            status: true,
            week: true,
            homeTeam: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: { name: true }
                },
                lineups: {
                  where: { week },
                  select: {
                    players: {
                      select: {
                        id: true,
                        name: true,
                        position: true,
                        nflTeam: true,
                        isStarting: true,
                        stats: {
                          where: { week },
                          select: {
                            fantasyPoints: true,
                            stats: true
                          }
                        },
                        projections: {
                          select: {
                            projectedPoints: true
                          },
                          take: 1
                        }
                      }
                    }
                  }
                }
              }
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: { name: true }
                },
                lineups: {
                  where: { week },
                  select: {
                    players: {
                      select: {
                        id: true,
                        name: true,
                        position: true,
                        nflTeam: true,
                        isStarting: true,
                        stats: {
                          where: { week },
                          select: {
                            fantasyPoints: true,
                            stats: true
                          }
                        },
                        projections: {
                          select: {
                            projectedPoints: true
                          },
                          take: 1
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        })
      },
      { 
        ttl: 60000, // 1 minute for live data
        tags: ['matchups', `league:${leagueId}`, `week:${week}`] 
      }
    )
  }

  /**
   * Batch insert with conflict handling
   */
  async batchInsertPlayers(players: any[]) {
    const batchSize = 100
    const results = []

    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize)
      
      try {
        const result = await this.prisma.player.createMany({
          data: batch,
          skipDuplicates: true
        })
        results.push(result)
      } catch (error) {
        console.error('[DB Optimizer] Batch insert failed:', error)
        // Try individual inserts for this batch
        for (const player of batch) {
          try {
            await this.prisma.player.upsert({
              where: { id: player.id },
              update: player,
              create: player
            })
          } catch (playerError) {
            console.error('[DB Optimizer] Individual insert failed:', player.id, playerError)
          }
        }
      }
    }

    // Invalidate relevant cache
    this.invalidateByTags(['players'])
    
    return results
  }

  /**
   * Optimized statistics aggregation
   */
  async getPlayerStatsAggregated(playerId: string, season: number) {
    const cacheKey = `player-stats:${playerId}:${season}`
    
    return this.executeQuery(
      cacheKey,
      async () => {
        return this.prisma.playerStat.aggregate({
          where: {
            playerId,
            season
          },
          _avg: {
            fantasyPoints: true,
            passingYards: true,
            rushingYards: true,
            receivingYards: true,
            touchdowns: true
          },
          _sum: {
            fantasyPoints: true,
            passingYards: true,
            rushingYards: true,
            receivingYards: true,
            touchdowns: true
          },
          _count: {
            _all: true
          }
        })
      },
      { 
        ttl: 3600000, // 1 hour
        tags: ['player-stats', `player:${playerId}`, `season:${season}`] 
      }
    )
  }

  /**
   * League leaderboard with ranking
   */
  async getLeagueLeaderboard(leagueId: string, season: number) {
    const cacheKey = `leaderboard:${leagueId}:${season}`
    
    return this.executeQuery(
      cacheKey,
      async () => {
        return this.prisma.$queryRaw`
          SELECT 
            t.id,
            t.name,
            u.name as owner_name,
            SUM(m.home_score) as total_points,
            COUNT(m.id) as games_played,
            AVG(m.home_score) as avg_points,
            ROW_NUMBER() OVER (ORDER BY SUM(m.home_score) DESC) as rank
          FROM teams t
          JOIN users u ON t.owner_id = u.id
          LEFT JOIN matchups m ON (t.id = m.home_team_id OR t.id = m.away_team_id)
          WHERE t.league_id = ${leagueId}
            AND m.season = ${season}
          GROUP BY t.id, t.name, u.name
          ORDER BY total_points DESC
        `
      },
      { 
        ttl: 600000, // 10 minutes
        tags: ['leaderboard', `league:${leagueId}`, `season:${season}`] 
      }
    )
  }

  // Cache management methods
  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.queryCache.delete(key)
      return null
    }

    return cached.result
  }

  private setCache(key: string, result: any, ttl: number, tags: string[]) {
    // Enforce cache size limit
    if (this.queryCache.size >= this.CACHE_MAX_SIZE) {
      // Remove oldest entries
      const oldestKeys = Array.from(this.queryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, Math.floor(this.CACHE_MAX_SIZE * 0.1))
        .map(([key]) => key)
      
      oldestKeys.forEach(key => this.queryCache.delete(key))
    }

    this.queryCache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      ttl,
      tags
    })
  }

  private cleanExpiredCache() {
    const now = Date.now()
    const expiredKeys = []

    for (const [key, cached] of this.queryCache.entries()) {
      if (now > cached.timestamp + cached.ttl) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.queryCache.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`[DB Optimizer] Cleaned ${expiredKeys.length} expired cache entries`)
    }
  }

  public invalidateByTags(tags: string[]) {
    const keysToDelete = []

    for (const [key, cached] of this.queryCache.entries()) {
      if (cached.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.queryCache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.log(`[DB Optimizer] Invalidated ${keysToDelete.length} cache entries by tags:`, tags)
    }
  }

  public clearCache() {
    this.queryCache.clear()
    console.log('[DB Optimizer] Cache cleared')
  }

  private recordQueryMetric(metric: QueryMetrics) {
    this.queryMetrics.push(metric)
    
    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.splice(0, this.queryMetrics.length - 1000)
    }
  }

  public getPerformanceMetrics() {
    const now = Date.now()
    const last24h = this.queryMetrics.filter(m => now - m.timestamp < 86400000)
    
    if (last24h.length === 0) {
      return {
        totalQueries: 0,
        cacheHitRate: 0,
        averageExecutionTime: 0,
        slowQueries: 0
      }
    }

    const cacheHits = last24h.filter(m => m.cacheHit).length
    const slowQueries = last24h.filter(m => m.executionTime > this.SLOW_QUERY_THRESHOLD).length
    const totalExecutionTime = last24h.reduce((sum, m) => sum + m.executionTime, 0)

    return {
      totalQueries: last24h.length,
      cacheHitRate: (cacheHits / last24h.length) * 100,
      averageExecutionTime: totalExecutionTime / last24h.length,
      slowQueries
    }
  }

  // Connection health check
  public async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    
    try {
      await this.prisma.$queryRaw`SELECT 1`
      const latency = Date.now() - start
      
      return { healthy: true, latency }
    } catch (error) {
      console.error('[DB Optimizer] Health check failed:', error)
      return { healthy: false, latency: Date.now() - start }
    }
  }

  public async dispose() {
    await this.prisma.$disconnect()
  }
}

export { CatalystDatabaseOptimizer }
export type { QueryCache, QueryMetrics, ConnectionPoolConfig }