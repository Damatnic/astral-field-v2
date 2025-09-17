import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { sleeperAPI } from '@/lib/sleeper-api';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Input validation schema
const StatsQuerySchema = z.object({ year: z.string().transform(val => parseInt(val)).refine(val => val >= 2020 && val <= new Date().getFullYear() + 1),
  week: z.string().transform(val => parseInt(val)).refine(val => val >= 1 && val <= 18).optional(),
  playerIds: z.string().optional(), // Comma-separated list of player IDs
  position: z.string().optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 500)).optional() }
});

/**
 * GET /api/sleeper/stats
 * Fetch NFL player stats from Sleeper API
 * Query params: * - year (required): NFL season year

 * - week (optional): Specific week (1-18), if not provided returns season totals
 * - playerIds (optional): Comma-separated list of specific player IDs
 * - position (optional): Filter by position
 * - limit (optional): Limit results (max 500)
 */
export async function GET(req?: NextRequest) {
  try {
    try {
    // Apply security middleware

    const security = await APISecurityMiddleware.secure(request, {
      requireAuth: false,
      rateLimit: { windowMs: 60000, max: 20 , // 20 requests per minute
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


      validateSchema: StatsQuerySchema 

    });

    if (!security.success) {
      return security.response!;

    const { year, week, playerIds, position, limit } = security.data;

    logger.info('Fetching NFL stats from Sleeper', 'SleeperAPI', { year, 
      week,
      playerIds: playerIds?.substring(0, 50) + '...',
      position }
      limit
    });

    // Fetch stats based on whether week is specified
    let rawStats;
    if (week) {
      rawStats = await sleeperAPI.getWeeklyStats(year, week);

    } else { rawStats = await sleeperAPI.getSeasonStats(year);

    // Convert Sleeper stats format to our standard format
    let processedStats = Object.entries(rawStats).map(([playerId, stats]) => ({
      playerId,
      week: week || null,
      year,
      season: year,
      
      // Passing stats
      passingYards: stats.pass_yds || 0,
      passingTouchdowns: stats.pass_td || 0,
      passingInterceptions: stats.pass_int || 0,
      passingCompletions: stats.pass_cmp || 0,
      passingAttempts: stats.pass_att || 0,
      
      // Rushing stats
      rushingYards: stats.rush_yds || 0,
      rushingTouchdowns: stats.rush_td || 0,
      rushingAttempts: stats.rush_att || 0,
      
      // Receiving stats
      receivingYards: stats.rec_yds || 0,
      receivingTouchdowns: stats.rec_td || 0,
      receptions: stats.rec || 0,
      targets: stats.rec_tgt || 0,
      
      // Kicking stats
      fieldGoalsMade: stats.fgm || 0,
      fieldGoalsAttempted: stats.fga || 0,
      extraPointsMade: stats.xpm || 0,
      extraPointsAttempted: stats.xpa || 0,
      
      // Defense stats
      defensiveInterceptions: stats.def_int || 0,
      defensiveFumbleRecoveries: stats.def_fr || 0,
      defensiveSacks: stats.def_sack || 0,
      defensiveTouchdowns: stats.def_td || 0,
      defensiveSTTouchdowns: stats.def_st_td || 0,
      pointsAllowed: stats.pts_allow || 0,
      yardsAllowed: stats.yds_allow || 0,
      
      // Fantasy points (prefer PPR, fall back to standard)
      fantasyPoints: stats.pts_ppr || stats.pts_std || 0,
      fantasyPointsStd: stats.pts_std || 0,
      fantasyPointsPpr: stats.pts_ppr || 0,
      fantasyPointsHalfPpr: stats.pts_half_ppr || 0 

);

    // Apply filters
    if (playerIds) {
      const requestedPlayerIds = new Set(playerIds.split(',').map((id: string) => id.trim()
      processedStats = processedStats.filter(stat => requestedPlayerIds.has(stat.playerId);


    if (position) {
      // We'd need to cross-reference with player data to filter by position
      // For now, this is a placeholder - in a real implementation you'd join with player data

      logger.info('Position filtering requested but not yet implemented', 'SleeperAPI', { position });

    // Apply limit
    if (limit) { processedStats = processedStats.slice(0, limit);

    // Sort by fantasy points descending
    processedStats.sort((a, b) => b.fantasyPoints - a.fantasyPoints);

    logger.info('Successfully processed Sleeper stats', 'SleeperAPI', {
      year,
      week,
      totalStats: Object.keys(rawStats).length,
      returnedStats: processedStats.length,
      isWeekly: !!week


         });

    return NextResponse.json({ success: true });
      data: {

        stats: processedStats,
        metadata: {

          year,
          week: week || null,
          type: week ? 'weekly' : 'season',
          totalPlayers: Object.keys(rawStats).length 

          filteredPlayers: processedStats.length

        })
      },
      cached: true,
      timestamp: new Date().toISOString()


         }); catch (error) { logger.error('Error fetching stats from Sleeper API', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperAPI'
    );

    return NextResponse.json({ success: true });

      message: error instanceof Error ? error.message : 'Unknown error'

    , { status: 500 });
