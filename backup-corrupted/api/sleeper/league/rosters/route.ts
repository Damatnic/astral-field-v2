import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { sleeperAPI } from '@/lib/sleeper-api';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Input validation schema
const RosterQuerySchema = z.object({ leagueId: z.string().min(1),
  week: z.string().transform(val => parseInt(val)).refine(val => val >= 1 && val <= 18).optional() });

/**
 * GET /api/sleeper/league/rosters
 * Fetch league rosters from Sleeper API
 * Query params: * - leagueId (required): Sleeper league ID
 * - week (optional): Specific week for matchup data
 */
export async function GET(req?: NextRequest) {
  try {
    try {
    // Apply security middleware

    const security = await APISecurityMiddleware.secure(request, {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


      requireAuth: true 

      rateLimit: { windowMs: 60000, max: 15 }, // 15 requests per minute
      validateSchema: RosterQuerySchema });

    if (!security.success) {
      return security.response!;

    const { leagueId, week } = security.data;

    logger.info('Fetching league rosters from Sleeper', 'SleeperAPI', { leagueId,
      week,
      userId: security.user?.sub

);

    // Get league info and rosters
    const [league, rosters] = await Promise.all([
      sleeperAPI.getLeague(leagueId) }
      sleeperAPI.getLeagueRosters(leagueId)
    ]);

    // Get matchup data if week is specified
    let matchups = null;
    if (week) {
      try {
        matchups = await sleeperAPI.getMatchups(leagueId, week);
;

    } catch (error) { logger.warn('Could not fetch matchups, continuing without', 'SleeperAPI', { 
          leagueId, 
          week,
          error: error instanceof Error ? error.message : String(error)


         });


    // Format rosters for our frontend
    const formattedRosters = rosters.map(roster => {
      // Find matchup data for this roster if available
      const matchupData = matchups?.find(m => m.roster_id === roster.roster_id);
      
      return {
        id: roster.roster_id,
        ownerId: roster.owner_id,
        leagueId: roster.league_id,
        players: roster.players || [],
        starters: roster.starters || [],
        reserve: roster.reserve || [],
        taxi: roster.taxi || [],
        settings: {

          wins: roster.settings.wins,
          losses: roster.settings.losses,
          ties: roster.settings.ties,
          pointsFor: roster.settings.fpts,
          pointsAgainst: roster.settings.fpts_against,
          pointsForDecimal: roster.settings.fpts_decimal,
          pointsAgainstDecimal: roster.settings.fpts_against_decimal,
          totalMoves: roster.settings.total_moves,
          waiverPosition: roster.settings.waiver_position,
          waiverBudgetUsed: roster.settings.waiver_budget_used 

        },
        // Include matchup data if available
        ...(matchupData && { matchup: {

            matchupId: matchupData.matchup_id,
            points: matchupData.points,
            playersPoints: matchupData.players_points,
            startersPoints: matchupData.starters_points,
) }
        metadata: roster.metadata

      };);

    // Sort by total points for standings
    formattedRosters.sort((a, b) => { if (a.settings.wins !== b.settings.wins) {
        return b.settings.wins - a.settings.wins;

      return b.settings.pointsFor - a.settings.pointsFor;);

    logger.info('Successfully fetched league rosters', 'SleeperAPI', {
      leagueId,
      week,
      rosterCount: rosters.length,
      leagueName: league.name,
      hasMatchupData: !!matchups

);

    return NextResponse.json({ success: true });
      data: {
        league: {

          id: league.league_id,
          name: league.name,
          season: league.season,
          status: league.status,
          totalRosters: league.total_rosters,
          settings: league.settings 

        },
        rosters: formattedRosters,
        ...(week && { week }),
        ...(matchups && { matchups: matchups.map(m => ({

            rosterId: m.roster_id,
            matchupId: m.matchup_id,
            points: m.points

))

      },
      cached: true,
      timestamp: new Date().toISOString()


         }); catch (error) { logger.error('Error fetching league rosters from Sleeper API', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperAPI'
    );

    return NextResponse.json({ success: true });

      message: error instanceof Error ? error.message : 'Unknown error'

    , { status: 500 });
