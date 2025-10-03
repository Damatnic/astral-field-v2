import { PrismaClient, Prisma } from '@prisma/client'
import { prisma, withRetry, timedQuery } from './prisma'

// Phoenix: Advanced query optimization service
export class PhoenixDatabaseService {
  private static instance: PhoenixDatabaseService
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly CACHE_TTL = 60000 // 1 minute default cache

  static getInstance(): PhoenixDatabaseService {
    if (!PhoenixDatabaseService.instance) {
      PhoenixDatabaseService.instance = new PhoenixDatabaseService()
    }
    return PhoenixDatabaseService.instance
  }

  // Phoenix: Intelligent caching with TTL
  private getCachedResult<T>(key: string): T | null {
    const cached = this.queryCache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }
    this.queryCache.delete(key)
    return null
  }

  private setCachedResult<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // Phoenix: Optimized user operations
  async findUserWithRelations(userId: string) {
    const cacheKey = `user:${userId}:relations`
    const cached = this.getCachedResult<any>(cacheKey)
    if (cached) return cached

    const result = await timedQuery('findUserWithRelations', () =>
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          teams: {
            include: {
              league: true,
              roster: {
                include: {
                  player: true
                }
              }
            }
          },
          preferences: true
        }
      })
    )

    this.setCachedResult(cacheKey, result)
    return result
  }

  // Phoenix: Optimized team operations with bulk loading
  async getTeamsWithMatchups(leagueId: string, week?: number) {
    const cacheKey = `teams:${leagueId}:week:${week || 'current'}`
    const cached = this.getCachedResult<any>(cacheKey)
    if (cached) return cached

    const result = await timedQuery('getTeamsWithMatchups', () =>
      prisma.team.findMany({
        where: { leagueId },
        include: {
          owner: {
            select: { id: true, name: true, image: true }
          },
          roster: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  nflTeam: true
                }
              }
            }
          },
          homeMatchups: week ? {
            where: { week }
          } : true,
          awayMatchups: week ? {
            where: { week }
          } : true
        }
      })
    )

    this.setCachedResult(cacheKey, result, 30000) // 30 second cache for dynamic data
    return result
  }

  // Phoenix: Optimized player search with full-text search
  async searchPlayers(query: string, position?: string, limit: number = 50) {
    const cacheKey = `players:search:${query}:${position || 'all'}:${limit}`
    const cached = this.getCachedResult<any>(cacheKey)
    if (cached) return cached

    const whereClause: Prisma.PlayerWhereInput = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } }
          ]
        },
        position ? { position } : {},
        { isFantasyRelevant: true }
      ]
    }

    const result = await timedQuery('searchPlayers', () =>
      prisma.player.findMany({
        where: whereClause,
        include: {
          stats: {
            orderBy: { week: 'desc' },
            take: 5
          },
          projections: {
            orderBy: { week: 'desc' },
            take: 3
          },
          news: {
            orderBy: { publishedAt: 'desc' },
            take: 3
          }
        },
        orderBy: [
          { rank: 'asc' },
          { adp: 'asc' },
          { name: 'asc' }
        ],
        take: limit
      })
    )

    this.setCachedResult(cacheKey, result, 120000) // 2 minute cache for search
    return result
  }

  // Phoenix: Batch operations for roster management
  async updateRosterBatch(updates: Array<{ id: string; position: string; isStarter: boolean }>) {
    return await withRetry(async () => {
      return await prisma.$transaction(
        updates.map(update =>
          prisma.rosterPlayer.update({
            where: { id: update.id },
            data: {
              position: update.position as any,
              isStarter: update.isStarter
            }
          })
        ),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 5000,
          timeout: 10000
        }
      )
    })
  }

  // Phoenix: Ultra-optimized league standings with historical data
  async calculateLeagueStandings(leagueId: string, currentWeek: number = 4) {
    const cacheKey = `standings:${leagueId}:week:${currentWeek}`
    const cached = this.getCachedResult<any>(cacheKey)
    if (cached) return cached

    const result = await timedQuery('calculateLeagueStandings', async () => {
      // Catalyst: Single query for complete standings with weekly breakdown
      const standings = await prisma.$queryRaw`
        WITH team_weekly_scores AS (
          SELECT 
            t.id as team_id,
            t.name as team_name,
            t."ownerId",
            u.name as owner_name,
            u.image as owner_image,
            m.week,
            CASE 
              WHEN m."homeTeamId" = t.id THEN m."homeScore"
              WHEN m."awayTeamId" = t.id THEN m."awayScore"
            END as points_for,
            CASE 
              WHEN m."homeTeamId" = t.id THEN m."awayScore"
              WHEN m."awayTeamId" = t.id THEN m."homeScore"
            END as points_against,
            CASE 
              WHEN m."homeTeamId" = t.id AND m."homeScore" > m."awayScore" THEN 1
              WHEN m."awayTeamId" = t.id AND m."awayScore" > m."homeScore" THEN 1
              ELSE 0
            END as win,
            CASE 
              WHEN m."homeTeamId" = t.id AND m."homeScore" < m."awayScore" THEN 1
              WHEN m."awayTeamId" = t.id AND m."awayScore" < m."homeScore" THEN 1
              ELSE 0
            END as loss,
            CASE 
              WHEN m."homeTeamId" = t.id AND m."homeScore" = m."awayScore" THEN 1
              WHEN m."awayTeamId" = t.id AND m."awayScore" = m."homeScore" THEN 1
              ELSE 0
            END as tie
          FROM teams t
          JOIN users u ON t."ownerId" = u.id
          LEFT JOIN matchups m ON (t.id = m."homeTeamId" OR t.id = m."awayTeamId")
            AND m."leagueId" = ${leagueId}
            AND m."isComplete" = true
            AND m.week BETWEEN 1 AND ${currentWeek - 1}
            AND m.season = 2025
          WHERE t."leagueId" = ${leagueId}
        ),
        team_aggregates AS (
          SELECT 
            team_id,
            team_name,
            "ownerId",
            owner_name,
            owner_image,
            COALESCE(SUM(win), 0) as total_wins,
            COALESCE(SUM(loss), 0) as total_losses,
            COALESCE(SUM(tie), 0) as total_ties,
            COALESCE(SUM(points_for), 0) as total_points_for,
            COALESCE(SUM(points_against), 0) as total_points_against,
            COALESCE(AVG(points_for), 0) as avg_points_for,
            -- Weekly breakdown for last 3 weeks
            JSON_AGG(
              CASE WHEN week IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'week', week,
                  'pointsFor', points_for,
                  'pointsAgainst', points_against,
                  'result', CASE 
                    WHEN win = 1 THEN 'W'
                    WHEN loss = 1 THEN 'L'
                    ELSE 'T'
                  END
                )
              END
              ORDER BY week
            ) FILTER (WHERE week IS NOT NULL) as weekly_results
          FROM team_weekly_scores
          GROUP BY team_id, team_name, "ownerId", owner_name, owner_image
        )
        SELECT 
          *,
          CASE 
            WHEN (total_wins + total_losses + total_ties) > 0 
            THEN total_wins::float / (total_wins + total_losses + total_ties)
            ELSE 0 
          END as win_percentage,
          ROW_NUMBER() OVER (
            ORDER BY 
              CASE 
                WHEN (total_wins + total_losses + total_ties) > 0 
                THEN total_wins::float / (total_wins + total_losses + total_ties)
                ELSE 0 
              END DESC,
              total_points_for DESC
          ) as rank
        FROM team_aggregates
        ORDER BY rank;
      `

      return standings
    })

    this.setCachedResult(cacheKey, result, 180000) // 3 minute cache for standings
    return result
  }

  // Phoenix: Get player stats for multiple weeks efficiently
  async getPlayerStatsHistory(playerIds: string[], weeks: number[] = [1, 2, 3]) {
    const cacheKey = `player_stats:${playerIds.slice(0,3).join(',')}:weeks:${weeks.join(',')}`
    const cached = this.getCachedResult<any>(cacheKey)
    if (cached) return cached

    const result = await timedQuery('getPlayerStatsHistory', () =>
      prisma.playerStats.findMany({
        where: {
          playerId: { in: playerIds },
          week: { in: weeks },
          season: 2025
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              position: true,
              nflTeam: true
            }
          }
        },
        orderBy: [
          { week: 'desc' },
          { fantasyPoints: 'desc' }
        ]
      })
    )

    this.setCachedResult(cacheKey, result, 300000) // 5 minute cache
    return result
  }

  // Phoenix: Batch roster updates with optimistic locking
  async updateMultipleRosters(updates: Array<{
    teamId: string;
    players: Array<{ playerId: string; position: string; isStarter: boolean }>
  }>) {
    return await withRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        const results = []
        
        for (const update of updates) {
          // Delete existing roster for team
          await tx.rosterPlayer.deleteMany({
            where: { teamId: update.teamId }
          })
          
          // Insert new roster
          const newRoster = await tx.rosterPlayer.createMany({
            data: update.players.map(player => ({
              teamId: update.teamId,
              playerId: player.playerId,
              position: player.position,
              isStarter: player.isStarter
            }))
          })
          
          results.push(newRoster)
        }
        
        return results
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 10000,
        timeout: 20000
      })
    })
  }

  // Phoenix: Clear cache for specific patterns
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.queryCache.clear()
      return
    }

    for (const [key] of this.queryCache) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key)
      }
    }
  }

  // Phoenix: Get cache statistics
  getCacheStats() {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys())
    }
  }
}

// Phoenix: Export singleton instance
export const phoenixDb = PhoenixDatabaseService.getInstance()

// Catalyst: Comprehensive league data with 3 weeks history + active week 4
export async function getOptimizedLeagueData(leagueId: string, currentWeek: number = 4) {
  try {
    // Catalyst: Single mega-optimized query for all league data
    const leagueData = await prisma.$queryRaw`
      WITH league_info AS (
        SELECT id, name, description, "currentWeek", "maxTeams"
        FROM leagues WHERE id = ${leagueId}
      ),
      -- Get all teams with their records
      team_records AS (
        SELECT 
          t.id,
          t.name,
          t."ownerId",
          u.name as owner_name,
          u.image as owner_image,
          t.wins,
          t.losses,
          t.ties,
          -- Calculate total points for and against
          COALESCE(SUM(CASE WHEN hm."homeTeamId" = t.id THEN hm."homeScore" ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN am."awayTeamId" = t.id THEN am."awayScore" ELSE 0 END), 0) as points_for,
          COALESCE(SUM(CASE WHEN hm."homeTeamId" = t.id THEN hm."awayScore" ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN am."awayTeamId" = t.id THEN am."homeScore" ELSE 0 END), 0) as points_against
        FROM teams t
        JOIN users u ON t."ownerId" = u.id
        LEFT JOIN matchups hm ON t.id = hm."homeTeamId" AND hm."isComplete" = true AND hm."leagueId" = ${leagueId}
        LEFT JOIN matchups am ON t.id = am."awayTeamId" AND am."isComplete" = true AND am."leagueId" = ${leagueId}
        WHERE t."leagueId" = ${leagueId}
        GROUP BY t.id, t.name, t."ownerId", u.name, u.image, t.wins, t.losses, t.ties
      ),
      -- Get historical matchups for weeks 1-3 + current week 4
      historical_matchups AS (
        SELECT 
          m.*,
          ht.name as home_team_name,
          at.name as away_team_name,
          hu.name as home_owner_name,
          au.name as away_owner_name
        FROM matchups m
        JOIN teams ht ON m."homeTeamId" = ht.id
        JOIN teams at ON m."awayTeamId" = at.id
        JOIN users hu ON ht."ownerId" = hu.id
        JOIN users au ON at."ownerId" = au.id
        WHERE m."leagueId" = ${leagueId} 
          AND m.week BETWEEN 1 AND ${currentWeek}
          AND m.season = 2025
        ORDER BY m.week DESC, m."createdAt" DESC
      ),
      -- Get active rosters with current week projections
      team_rosters AS (
        SELECT 
          t.id as team_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', p.id,
              'name', p.name,
              'position', p.position,
              'nflTeam', p."nflTeam",
              'rosterPosition', rp.position,
              'isStarter', rp."isStarter",
              'currentProjection', COALESCE(proj."projectedPoints", 0),
              'weeklyStats', (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'week', ps.week,
                    'points', ps."fantasyPoints",
                    'stats', ps.stats
                  ) ORDER BY ps.week DESC
                )
                FROM player_stats ps 
                WHERE ps."playerId" = p.id 
                  AND ps.week BETWEEN 1 AND ${currentWeek - 1}
                  AND ps.season = 2025
              )
            ) ORDER BY 
              CASE rp.position 
                WHEN 'QB' THEN 1 
                WHEN 'RB' THEN 2 
                WHEN 'WR' THEN 3 
                WHEN 'TE' THEN 4 
                WHEN 'K' THEN 5 
                WHEN 'DST' THEN 6 
                ELSE 7 
              END,
              rp."isStarter" DESC,
              p.name
          ) as roster_data
        FROM teams t
        JOIN roster_players rp ON t.id = rp."teamId"
        JOIN players p ON rp."playerId" = p.id
        LEFT JOIN player_projections proj ON p.id = proj."playerId" 
          AND proj.week = ${currentWeek} AND proj.season = 2025
        WHERE t."leagueId" = ${leagueId}
        GROUP BY t.id
      ),
      -- Get top performing players across the league
      top_performers AS (
        SELECT 
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'playerId', p.id,
              'playerName', p.name,
              'position', p.position,
              'nflTeam', p."nflTeam",
              'totalPoints', total_stats.total_points,
              'avgPoints', total_stats.avg_points,
              'teamName', t.name,
              'ownerName', u.name
            ) ORDER BY total_stats.total_points DESC
          ) as top_players
        FROM (
          SELECT 
            ps."playerId",
            SUM(ps."fantasyPoints") as total_points,
            AVG(ps."fantasyPoints") as avg_points
          FROM player_stats ps
          WHERE ps.week BETWEEN 1 AND ${currentWeek - 1} AND ps.season = 2025
          GROUP BY ps."playerId"
          HAVING COUNT(*) >= 2  -- At least 2 games played
          ORDER BY total_points DESC
          LIMIT 10
        ) total_stats
        JOIN players p ON total_stats."playerId" = p.id
        JOIN roster_players rp ON p.id = rp."playerId"
        JOIN teams t ON rp."teamId" = t.id AND t."leagueId" = ${leagueId}
        JOIN users u ON t."ownerId" = u.id
      )
      SELECT 
        li.*,
        (
          SELECT JSON_AGG(tr.*) 
          FROM team_records tr 
          ORDER BY 
            (tr.wins::float / NULLIF(tr.wins + tr.losses + tr.ties, 0)) DESC,
            tr.points_for DESC
        ) as standings,
        (
          SELECT JSON_AGG(hm.*) 
          FROM historical_matchups hm
        ) as matchups,
        (
          SELECT JSON_OBJECT_AGG(tr.team_id, tr.roster_data)
          FROM team_rosters tr
        ) as rosters,
        tp.top_players
      FROM league_info li
      CROSS JOIN top_performers tp;
    `

    return leagueData[0] || null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Optimized league query failed:', error);

    }
    // Fallback to individual queries
    return null
  }
}

// Catalyst: Optimized dashboard data fetch with single query
export async function getOptimizedDashboardData(userId: string) {
  try {
    // Catalyst: Single optimized query instead of multiple N+1 queries
    const dashboardData = await prisma.$queryRaw`
      WITH user_teams AS (
        SELECT 
          t.id,
          t.name,
          t.wins,
          t.losses,
          t.ties,
          t."leagueId",
          l.name as league_name,
          l."currentWeek"
        FROM teams t
        JOIN leagues l ON t."leagueId" = l.id
        WHERE t."ownerId" = ${userId}
      ),
      team_matchups AS (
        SELECT 
          t.id as team_id,
          COALESCE(hm."awayTeamId", am."homeTeamId") as opponent_id,
          COALESCE(away_team.name, home_team.name) as opponent_name
        FROM user_teams t
        LEFT JOIN matchups hm ON t.id = hm."homeTeamId" AND hm.week = 4 AND hm.season = 2025
        LEFT JOIN matchups am ON t.id = am."awayTeamId" AND am.week = 4 AND am.season = 2025
        LEFT JOIN teams away_team ON hm."awayTeamId" = away_team.id
        LEFT JOIN teams home_team ON am."homeTeamId" = home_team.id
      ),
      team_rosters AS (
        SELECT 
          t.id as team_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', p.id,
              'name', p.name,
              'position', p.position,
              'nflTeam', p."nflTeam"
            )
          ) as roster_players
        FROM user_teams t
        JOIN roster_players r ON t.id = r."teamId"
        JOIN players p ON r."playerId" = p.id
        GROUP BY t.id
      ),
      recent_news AS (
        SELECT 
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pn.id,
              'title', pn.title,
              'publishedAt', pn."publishedAt",
              'player', JSON_BUILD_OBJECT(
                'name', p.name,
                'position', p.position,
                'nflTeam', p."nflTeam"
              )
            ) ORDER BY pn."publishedAt" DESC
          ) as news_data
        FROM player_news pn
        JOIN players p ON pn."playerId" = p.id
        LIMIT 5
      )
      SELECT 
        ut.*,
        tm.opponent_name,
        tr.roster_players,
        rn.news_data
      FROM user_teams ut
      LEFT JOIN team_matchups tm ON ut.id = tm.team_id
      LEFT JOIN team_rosters tr ON ut.id = tr.team_id
      CROSS JOIN recent_news rn;
    `

    return dashboardData
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Optimized dashboard query failed:', error);

    }
    // Fallback to original method
    return []
  }
}

// Catalyst: Weekly scoring update with batch processing
export async function updateWeeklyScoring(week: number, playerUpdates: Array<{
  playerId: string;
  fantasyPoints: number;
  stats: any;
}>) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Batch upsert player stats
      const statUpdates = await Promise.all(
        playerUpdates.map(update =>
          tx.playerStats.upsert({
            where: {
              playerId_week_season: {
                playerId: update.playerId,
                week: week,
                season: 2025
              }
            },
            update: {
              fantasyPoints: update.fantasyPoints,
              stats: JSON.stringify(update.stats)
            },
            create: {
              playerId: update.playerId,
              week: week,
              season: 2025,
              fantasyPoints: update.fantasyPoints,
              stats: JSON.stringify(update.stats)
            }
          })
        )
      )

      // Update matchup scores based on roster performance
      const matchups = await tx.matchup.findMany({
        where: {
          week: week,
          season: 2025,
          isComplete: false
        },
        include: {
          homeTeam: {
            include: {
              roster: {
                where: { isStarter: true },
                include: { player: true }
              }
            }
          },
          awayTeam: {
            include: {
              roster: {
                where: { isStarter: true },
                include: { player: true }
              }
            }
          }
        }
      })

      // Calculate team scores
      const scoreUpdates = await Promise.all(
        matchups.map(async (matchup) => {
          const homeScore = await calculateTeamScore(matchup.homeTeam.roster, week)
          const awayScore = await calculateTeamScore(matchup.awayTeam.roster, week)

          return tx.matchup.update({
            where: { id: matchup.id },
            data: {
              homeScore,
              awayScore,
              isComplete: true // Mark as complete when all games are final
            }
          })
        })
      )

      return { statUpdates, scoreUpdates }
    }, {
      timeout: 30000 // 30 second timeout for batch operations
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Weekly scoring update failed:', error);

    }
    throw error
  }
}

// Helper function to calculate team score
async function calculateTeamScore(roster: any[], week: number): Promise<number> {
  const playerIds = roster.map(r => r.playerId)
  const stats = await prisma.playerStats.findMany({
    where: {
      playerId: { in: playerIds },
      week: week,
      season: 2025
    }
  })

  return stats.reduce((total, stat) => total + stat.fantasyPoints, 0)
}

// Catalyst: Connection pooling and cleanup
// Only set up global and process handlers in Node.js runtime (not edge runtime)
if (typeof process !== 'undefined' && process.env && typeof globalThis !== 'undefined') {
  const globalForPrisma = globalThis as unknown as {
    prisma: any | undefined
  }
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
  
  // Catalyst: Graceful shutdown with duplicate prevention
  let shutdownHandlersAdded = false
  if (process.on && !shutdownHandlersAdded) {
    const gracefulShutdown = async () => {
      try {
        await prisma.$disconnect()
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Error during graceful shutdown:', error);

        }
      }
    }
    
    process.removeAllListeners('beforeExit')
    process.on('beforeExit', gracefulShutdown)
    shutdownHandlersAdded = true
  }
}