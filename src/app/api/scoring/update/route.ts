// API Route: Scoring Updates
// Updates matchup scores in database from Sleeper's real-time data

import { NextRequest, NextResponse } from 'next/server';
import { sleeperRealTimeScoringService } from '@/services/sleeper/realTimeScoringService';
import { nflStateService } from '@/services/sleeper/nflStateService';
import { prisma as db } from '@/lib/db';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      // Handle empty or invalid JSON body
      body = {};
    }
    
    const { 
      action, 
      leagueId, 
      week, 
      season,
      matchupId,
      scores,
      options = {} 
    } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action parameter required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'update_league':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for league update' },
            { status: 400 }
          );
        }

        console.log(`[API] Updating scores for league: ${leagueId}`);
        result = await updateLeagueScores(leagueId, week, season, options);
        break;

      case 'update_matchup':
        if (!matchupId) {
          return NextResponse.json(
            { error: 'matchupId required for matchup update' },
            { status: 400 }
          );
        }

        console.log(`[API] Updating individual matchup: ${matchupId}`);
        result = await updateSingleMatchup(matchupId, scores, options);
        break;

      case 'update_all_leagues':
        console.log('[API] Updating scores for all active leagues');
        result = await updateAllActiveLeagues(options);
        break;

      case 'batch_update':
        if (!Array.isArray(body.updates)) {
          return NextResponse.json(
            { error: 'updates array required for batch update' },
            { status: 400 }
          );
        }

        console.log(`[API] Processing batch update of ${body.updates.length} matchups`);
        result = await processBatchUpdate(body.updates, options);
        break;

      case 'stat_correction':
        if (!leagueId || !week) {
          return NextResponse.json(
            { error: 'leagueId and week required for stat correction' },
            { status: 400 }
          );
        }

        console.log(`[API] Processing stat correction for league: ${leagueId}, week: ${week}`);
        result = await processStatCorrection(leagueId, week, season, body.corrections, options);
        break;

      case 'recalculate_week':
        if (!leagueId || !week) {
          return NextResponse.json(
            { error: 'leagueId and week required for recalculation' },
            { status: 400 }
          );
        }

        console.log(`[API] Recalculating week ${week} for league: ${leagueId}`);
        result = await recalculateWeekScores(leagueId, week, season, options);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: update_league, update_matchup, update_all_leagues, batch_update, stat_correction, or recalculate_week' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Scoring update error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Scoring update operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');
    const status = searchParams.get('status') || 'all';

    // Get update status and history
    if (leagueId) {
      const result = await getUpdateStatus(leagueId, week ? parseInt(week) : undefined, status);
      
      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    // Get global update status
    const globalStatus = await getGlobalUpdateStatus();
    
    return NextResponse.json({
      success: true,
      data: globalStatus,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Scoring update status error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get update status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Helper function to update league scores
async function updateLeagueScores(leagueId: string, week?: number, season?: number, options: any = {}) {
  try {
    // Get league info
    const league = await db.league.findUnique({
      where: { id: leagueId },
      select: { currentWeek: true, season: true, isActive: true },
    });

    if (!league) {
      throw new Error(`League ${leagueId} not found`);
    }

    if (!league.isActive) {
      throw new Error(`League ${leagueId} is not active`);
    }

    const targetWeek = week || league.currentWeek || 1;
    const targetSeason = season || parseInt(league.season);

    // Update scores using real-time service
    const liveUpdate = await sleeperRealTimeScoringService.updateLeagueScores(leagueId);

    // Log the update
    await logScoringUpdate({
      leagueId,
      week: targetWeek,
      season: targetSeason,
      updateType: 'league_update',
      success: true,
      details: {
        matchupsUpdated: liveUpdate.matchups.length,
        isLive: liveUpdate.isLive,
      },
    });

    return {
      leagueId,
      week: targetWeek,
      season: targetSeason,
      matchupsUpdated: liveUpdate.matchups.length,
      isLive: liveUpdate.isLive,
      lastUpdated: liveUpdate.lastUpdated,
      nextUpdate: liveUpdate.nextUpdate,
    };

  } catch (error) {
    console.error(`Failed to update league scores for ${leagueId}:`, error);
    
    // Log the failed update
    await logScoringUpdate({
      leagueId,
      week: week || 1,
      season: season || 2024,
      updateType: 'league_update',
      success: false,
      error: (error as Error).message,
    });

    throw error;
  }
}

// Helper function to update single matchup
async function updateSingleMatchup(matchupId: string, scores?: any, options: any = {}) {
  try {
    const matchup = await db.matchup.findUnique({
      where: { id: matchupId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });

    if (!matchup) {
      throw new Error(`Matchup ${matchupId} not found`);
    }

    let updateData: any = {};

    if (scores) {
      // Manual score update
      if (scores.homeScore !== undefined) updateData.homeScore = scores.homeScore;
      if (scores.awayScore !== undefined) updateData.awayScore = scores.awayScore;
      if (scores.isComplete !== undefined) updateData.isComplete = scores.isComplete;
    } else {
      // Calculate scores using real-time service
      const leagueUpdate = await sleeperRealTimeScoringService.updateLeagueScores(matchup.leagueId);
      const matchupScore = leagueUpdate.matchups.find(m => m.matchupId === matchupId);
      
      if (matchupScore) {
        updateData = {
          homeScore: matchupScore.homeScore,
          awayScore: matchupScore.awayScore,
          isComplete: matchupScore.isComplete,
        };
      }
    }

    // Update the matchup
    const updatedMatchup = await db.matchup.update({
      where: { id: matchupId },
      data: {
        ...updateData,
        lastUpdated: new Date(),
      },
    });

    await logScoringUpdate({
      leagueId: matchup.leagueId,
      week: matchup.week,
      season: matchup.season,
      updateType: 'matchup_update',
      success: true,
      details: {
        matchupId,
        homeTeam: matchup.homeTeam.name,
        awayTeam: matchup.awayTeam.name,
        scores: updateData,
      },
    });

    return {
      matchupId,
      updated: updateData,
      homeTeam: matchup.homeTeam.name,
      awayTeam: matchup.awayTeam.name,
    };

  } catch (error) {
    console.error(`Failed to update matchup ${matchupId}:`, error);
    throw error;
  }
}

// Helper function to update all active leagues
async function updateAllActiveLeagues(options: any = {}) {
  try {
    await sleeperRealTimeScoringService.updateAllLeagueScores();

    const leagues = await db.league.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    await logScoringUpdate({
      leagueId: 'ALL',
      week: 0,
      season: 2024,
      updateType: 'all_leagues_update',
      success: true,
      details: {
        leaguesUpdated: leagues.length,
      },
    });

    return {
      message: 'All active leagues updated',
      leaguesUpdated: leagues.length,
      leagues: leagues.map(l => ({ id: l.id, name: l.name })),
    };

  } catch (error) {
    console.error('Failed to update all leagues:', error);
    throw error;
  }
}

// Helper function to process batch updates
async function processBatchUpdate(updates: any[], options: any = {}) {
  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      if (update.type === 'matchup') {
        const result = await updateSingleMatchup(update.matchupId, update.scores, options);
        results.push({ ...result, success: true });
      } else if (update.type === 'league') {
        const result = await updateLeagueScores(update.leagueId, update.week, update.season, options);
        results.push({ ...result, success: true });
      }
    } catch (error) {
      errors.push({
        update,
        error: (error as Error).message,
      });
    }
  }

  return {
    totalUpdates: updates.length,
    successful: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

// Helper function to process stat corrections
async function processStatCorrection(leagueId: string, week: number, season?: number, corrections?: any[], options: any = {}) {
  try {
    const targetSeason = season || 2024;

    // Apply any specific stat corrections first
    if (corrections && corrections.length > 0) {
      for (const correction of corrections) {
        await db.playerStats.update({
          where: {
            playerId_week_season: {
              playerId: correction.playerId,
              week,
              season: targetSeason,
            },
          },
          data: {
            stats: correction.correctedStats,
            fantasyPoints: correction.correctedPoints,
            lastUpdated: new Date(),
          },
        });
      }
    }

    // Recalculate all scores for the week
    const result = await recalculateWeekScores(leagueId, week, targetSeason, options);

    await logScoringUpdate({
      leagueId,
      week,
      season: targetSeason,
      updateType: 'stat_correction',
      success: true,
      details: {
        correctionsApplied: corrections?.length || 0,
        recalculated: true,
      },
    });

    return {
      ...result,
      statCorrections: {
        applied: corrections?.length || 0,
        corrections: corrections || [],
      },
    };

  } catch (error) {
    console.error(`Failed to process stat correction for league ${leagueId}:`, error);
    throw error;
  }
}

// Helper function to recalculate week scores
async function recalculateWeekScores(leagueId: string, week: number, season?: number, options: any = {}) {
  try {
    const targetSeason = season || 2024;

    // Force a fresh calculation by clearing cache
    // This would clear cache if we had cache keys available
    
    // Recalculate using the real-time service
    const liveUpdate = await sleeperRealTimeScoringService.updateLeagueScores(leagueId);

    await logScoringUpdate({
      leagueId,
      week,
      season: targetSeason,
      updateType: 'recalculation',
      success: true,
      details: {
        matchupsRecalculated: liveUpdate.matchups.length,
        forced: true,
      },
    });

    return {
      leagueId,
      week,
      season: targetSeason,
      recalculated: true,
      matchupsUpdated: liveUpdate.matchups.length,
      lastUpdated: liveUpdate.lastUpdated,
    };

  } catch (error) {
    console.error(`Failed to recalculate week scores for league ${leagueId}:`, error);
    throw error;
  }
}

// Helper function to log scoring updates
async function logScoringUpdate(logData: {
  leagueId: string;
  week: number;
  season: number;
  updateType: string;
  success: boolean;
  details?: any;
  error?: string;
}) {
  try {
    // This would log to a scoring updates table if we had one
    // For now, just console log
    console.log(`[ScoringUpdate] ${logData.updateType}:`, {
      league: logData.leagueId,
      week: logData.week,
      season: logData.season,
      success: logData.success,
      details: logData.details,
      error: logData.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log scoring update:', error);
  }
}

// Helper function to get update status
async function getUpdateStatus(leagueId: string, week?: number, status: string = 'all') {
  try {
    const league = await db.league.findUnique({
      where: { id: leagueId },
      select: { 
        id: true, 
        name: true, 
        currentWeek: true, 
        season: true,
        isActive: true,
      },
    });

    if (!league) {
      throw new Error(`League ${leagueId} not found`);
    }

    const targetWeek = week || league.currentWeek || 1;

    // Get matchup update status
    const matchups = await db.matchup.findMany({
      where: {
        leagueId,
        week: targetWeek,
        season: parseInt(league.season),
      },
      select: {
        id: true,
        homeScore: true,
        awayScore: true,
        isComplete: true,
        lastUpdated: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });

    const nflState = await nflStateService.getCurrentState();
    const isCurrentWeek = targetWeek === nflState.week;
    const isLive = isCurrentWeek && await nflStateService.isScoringPeriod();

    return {
      league: {
        id: league.id,
        name: league.name,
        isActive: league.isActive,
      },
      week: targetWeek,
      season: parseInt(league.season),
      isCurrentWeek,
      isLive,
      matchups: matchups.map(m => ({
        id: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.homeScore || 0,
        awayScore: m.awayScore || 0,
        isComplete: m.isComplete || false,
        lastUpdated: m.lastUpdated,
        needsUpdate: isCurrentWeek && !m.lastUpdated || 
                    (m.lastUpdated && (Date.now() - m.lastUpdated.getTime()) > 300000), // 5 min old
      })),
      summary: {
        totalMatchups: matchups.length,
        completedMatchups: matchups.filter(m => m.isComplete).length,
        lastUpdate: matchups.reduce((latest, m) => 
          m.lastUpdated && (!latest || m.lastUpdated > latest) ? m.lastUpdated : latest, 
          null as Date | null
        ),
      },
    };

  } catch (error) {
    console.error(`Failed to get update status for league ${leagueId}:`, error);
    throw error;
  }
}

// Helper function to get global update status
async function getGlobalUpdateStatus() {
  try {
    const activeLeagues = await db.league.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        name: true, 
        currentWeek: true,
        season: true,
      },
    });

    const nflState = await nflStateService.getCurrentState();
    const isLive = await nflStateService.isScoringPeriod();

    return {
      nflState: {
        week: nflState.week,
        season: nflState.season,
        seasonType: nflState.season_type,
      },
      isLive,
      activeLeagues: activeLeagues.length,
      leagues: activeLeagues.map(league => ({
        id: league.id,
        name: league.name,
        currentWeek: league.currentWeek,
        season: league.season,
      })),
      systemStatus: {
        healthy: true,
        lastCheck: new Date().toISOString(),
      },
    };

  } catch (error) {
    console.error('Failed to get global update status:', error);
    throw error;
  }
}