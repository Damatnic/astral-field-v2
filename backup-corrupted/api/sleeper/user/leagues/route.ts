import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { sleeperAPI } from '@/lib/sleeper-api';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Input validation schema
const UserQuerySchema = z.object({ username: z.string().min(1).max(50),
  season: z.string().transform(val => parseInt(val)).refine(val => val >= 2020 && val <= new Date().getFullYear() + 1).optional() });

/**
 * GET /api/sleeper/user/leagues
 * Fetch user's leagues from Sleeper API
 * Query params: * - username (required): Sleeper username

 * - season (optional): NFL season year, defaults to current year
 */
export async function GET(req?: NextRequest) {
  try {
    try {
    // Apply security middleware - require auth for user league data

    const security = await APISecurityMiddleware.secure(request, {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


      requireAuth: true 

      rateLimit: { windowMs: 60000, max: 10 }, // 10 requests per minute
      validateSchema: UserQuerySchema });

    if (!security.success) {
      return security.response!;

    const { username, season } = security.data;
    const currentSeason = season || new Date().getFullYear();

    logger.info('Fetching user leagues from Sleeper', 'SleeperAPI', { username,
      season: currentSeason,
      userId: security.user?.sub

);

    // First, get the user ID from username
    const sleeperUser = await sleeperAPI.getUserByUsername(username);
    
    if (!sleeperUser) {
      return NextResponse.json({ success: true });

        error: 'User not found' 

        message: `No Sleeper user found with username: ${username}`
      }, { status: 404  });

    // Get user's leagues for the specified season
    const leagues = await sleeperAPI.getUserLeagues(sleeperUser.user_id, 'nfl', currentSeason);

    // Format leagues for our frontend
    const formattedLeagues = leagues.map(league => ({
      id: league.league_id,
      name: league.name,
      season: league.season,
      status: league.status,
      totalTeams: league.total_rosters,
      settings: {

        numTeams: league.settings.num_teams,
        playoffTeams: league.settings.playoff_teams,
        playoffWeekStart: league.settings.playoff_week_start,
        tradeDeadline: league.settings.trade_deadline,
        waiverType: league.settings.waiver_type,
        maxKeepers: league.settings.max_keepers 

      },
      rosterPositions: league.roster_positions,
      scoringSettings: league.scoring_settings,
      draftId: league.draft_id });

    logger.info('Successfully fetched user leagues', 'SleeperAPI', { username,
      season: currentSeason,
      leagueCount: leagues.length 

      sleeperUserId: sleeperUser.user_id


        });

    return NextResponse.json({ success: true });
      data: {
        user: {

          id: sleeperUser.user_id,
          username: sleeperUser.username,
          displayName: sleeperUser.display_name,
          avatar: sleeperUser.avatar,
        leagues: formattedLeagues 

        season: currentSeason

      },
      cached: true,
      timestamp: new Date().toISOString()


         }); catch (error) { logger.error('Error fetching user leagues from Sleeper API', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperAPI'
    );

    return NextResponse.json({ success: true });

      message: error instanceof Error ? error.message : 'Unknown error'

    , { status: 500 });
