// API Route: Live Scoring
// Gets current week's live scores from Sleeper API with real-time updates

import { NextRequest, NextResponse } from 'next/server';
import { sleeperRealTimeScoringService } from '@/services/sleeper/realTimeScoringService';
import { nflStateService } from '@/services/sleeper/nflStateService';
import { prisma as db } from '@/lib/db';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');
    const includeProjections = searchParams.get('includeProjections') === 'true';
    const format = searchParams.get('format') || 'detailed';

    if (!leagueId) {
      return NextResponse.json(
        { error: 'leagueId parameter required' },
        { status: 400 }
      );
    }

    // Verify league exists and user has access
    const league = await db.league.findUnique({
      where: { id: leagueId },
      select: { 
        id: true, 
        name: true, 
        currentWeek: true, 
        season: true, 
        isActive: true 
      },
    });

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    if (!league.isActive) {
      return NextResponse.json(
        { error: 'League is not active' },
        { status: 400 }
      );
    }

    // Determine target week (current week if not specified)
    const targetWeek = week ? parseInt(week) : league.currentWeek || 1;
    
    if (targetWeek < 1 || targetWeek > 18) {
      return NextResponse.json(
        { error: 'Invalid week number. Must be between 1 and 18' },
        { status: 400 }
      );
    }

    // Get NFL state for context
    const nflState = await nflStateService.getCurrentState();
    const isCurrentWeek = targetWeek === nflState.week;
    const isLive = isCurrentWeek && await nflStateService.isScoringPeriod();
    const gameSchedule = await nflStateService.getCurrentGameSchedule();

    // Get live scores
    let liveScores;
    if (isCurrentWeek) {
      // For current week, use real-time service
      liveScores = await sleeperRealTimeScoringService.getLiveScores(leagueId);
    } else {
      // For past/future weeks, calculate from stored data
      liveScores = await calculateHistoricalScores(leagueId, targetWeek, parseInt(league.season));
    }

    if (!liveScores) {
      return NextResponse.json(
        { error: 'Unable to retrieve live scores for the specified week' },
        { status: 404 }
      );
    }

    // Format response based on requested format
    let responseData;
    switch (format) {
      case 'summary':
        responseData = formatSummaryResponse(liveScores, isLive, gameSchedule);
        break;
      case 'scores_only':
        responseData = formatScoresOnlyResponse(liveScores);
        break;
      case 'detailed':
      default:
        responseData = formatDetailedResponse(liveScores, isLive, gameSchedule, nflState);
        break;
    }

    // Add projections if requested
    if (includeProjections && format === 'detailed') {
      responseData.projections = await getWeekProjections(leagueId, targetWeek, parseInt(league.season));
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        league: {
          id: league.id,
          name: league.name,
          season: league.season,
        },
        week: targetWeek,
        isCurrentWeek,
        isLive,
        gameSchedule: {
          isGameWeek: gameSchedule.isGameWeek,
          daysUntilGames: gameSchedule.daysUntilGames,
        },
        lastUpdated: new Date().toISOString(),
        nextUpdate: isLive ? new Date(Date.now() + 60000).toISOString() : new Date(Date.now() + 300000).toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Live scoring GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get live scores',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leagueId, week, options = {} } = body;

    if (!leagueId) {
      return NextResponse.json(
        { error: 'leagueId required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'refresh':
        // Force refresh live scores for current week
        console.log(`[API] Force refreshing live scores for league: ${leagueId}`);
        result = await sleeperRealTimeScoringService.updateLeagueScores(leagueId);
        break;

      case 'start_live_tracking':
        // Start real-time tracking for this league
        const intervalMs = options.intervalMs || 60000;
        console.log(`[API] Starting live tracking for league: ${leagueId}`);
        await sleeperRealTimeScoringService.startRealTimeUpdates(intervalMs);
        
        result = {
          message: 'Live tracking started',
          interval: `${intervalMs}ms`,
          leagueId,
        };
        break;

      case 'stop_live_tracking':
        // Stop real-time tracking
        console.log(`[API] Stopping live tracking for league: ${leagueId}`);
        sleeperRealTimeScoringService.stopRealTimeUpdates();
        
        result = {
          message: 'Live tracking stopped',
          leagueId,
        };
        break;

      case 'calculate_week':
        // Calculate scores for a specific week
        const targetWeek = week || 1;
        console.log(`[API] Calculating scores for league: ${leagueId}, week: ${targetWeek}`);
        
        result = await calculateWeekScores(leagueId, targetWeek, options.season);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: refresh, start_live_tracking, stop_live_tracking, or calculate_week' },
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
    console.error('[API] Live scoring POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Live scoring operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate historical scores
async function calculateHistoricalScores(leagueId: string, week: number, season: number) {
  try {
    const matchups = await db.matchup.findMany({
      where: {
        leagueId,
        week,
        season,
      },
      include: {
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
      },
    });

    const matchupScores = matchups.map(matchup => ({
      matchupId: matchup.id,
      homeTeamId: matchup.homeTeamId,
      awayTeamId: matchup.awayTeamId,
      homeTeamName: matchup.homeTeam.name,
      awayTeamName: matchup.awayTeam.name,
      homeScore: matchup.homeScore || 0,
      awayScore: matchup.awayScore || 0,
      homeProjectedScore: 0, // Would need projection data
      awayProjectedScore: 0, // Would need projection data
      isComplete: matchup.isComplete || false,
      playerScores: [], // Could populate if needed
    }));

    return {
      leagueId,
      week,
      season,
      matchups: matchupScores,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      nextUpdate: new Date(Date.now() + 300000).toISOString(),
    };

  } catch (error) {
    console.error('Failed to calculate historical scores:', error);
    return null;
  }
}

// Helper function to calculate scores for a specific week
async function calculateWeekScores(leagueId: string, week: number, season?: number) {
  try {
    const league = await db.league.findUnique({
      where: { id: leagueId },
      select: { season: true },
    });

    const targetSeason = season || parseInt(league?.season || '2024');
    
    return await sleeperRealTimeScoringService.updateLeagueScores(leagueId);
  } catch (error) {
    console.error('Failed to calculate week scores:', error);
    throw error;
  }
}

// Response formatting functions
function formatSummaryResponse(liveScores: any, isLive: boolean, gameSchedule: any) {
  return {
    matchups: liveScores.matchups.map((m: any) => ({
      matchupId: m.matchupId,
      homeTeam: { id: m.homeTeamId, name: m.homeTeamName, score: m.homeScore },
      awayTeam: { id: m.awayTeamId, name: m.awayTeamName, score: m.awayScore },
      isComplete: m.isComplete,
    })),
    isLive,
    totalMatchups: liveScores.matchups.length,
    completedMatchups: liveScores.matchups.filter((m: any) => m.isComplete).length,
  };
}

function formatScoresOnlyResponse(liveScores: any) {
  const scores: Record<string, number> = {};
  
  liveScores.matchups.forEach((matchup: any) => {
    scores[matchup.homeTeamId] = matchup.homeScore;
    scores[matchup.awayTeamId] = matchup.awayScore;
  });

  return { scores };
}

function formatDetailedResponse(liveScores: any, isLive: boolean, gameSchedule: any, nflState: any) {
  return {
    ...liveScores,
    gameContext: {
      isLive,
      isGameWeek: gameSchedule.isGameWeek,
      daysUntilGames: gameSchedule.daysUntilGames,
      nflWeek: nflState.week,
      seasonType: nflState.season_type,
    },
  };
}

// Helper function to get week projections
async function getWeekProjections(leagueId: string, week: number, season: number) {
  try {
    // Get all teams in league
    const teams = await db.team.findMany({
      where: { leagueId },
      include: {
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: { week, season },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const projections: Record<string, any> = {};

    teams.forEach(team => {
      projections[team.id] = {
        teamName: team.name,
        totalProjected: 0,
        players: team.roster.map(rp => {
          const projection = rp.player.projections[0];
          const projectedPoints = projection ? Number(projection.projectedPoints) : 0;
          
          if (rp.rosterSlot !== 'BENCH' && rp.rosterSlot !== 'IR') {
            projections[team.id].totalProjected += projectedPoints;
          }

          return {
            playerId: rp.player.id,
            playerName: rp.player.name,
            position: rp.player.position,
            rosterSlot: rp.rosterSlot,
            projectedPoints,
            isStarting: rp.rosterSlot !== 'BENCH' && rp.rosterSlot !== 'IR',
          };
        }),
      };
    });

    return projections;
  } catch (error) {
    console.error('Failed to get week projections:', error);
    return {};
  }
}