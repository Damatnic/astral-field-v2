// API Route: Player Projections
// Gets player projections for the week from Sleeper and database

import { NextRequest, NextResponse } from 'next/server';
import { playerSyncService } from '@/services/sleeper/playerSyncService';
import { nflStateService } from '@/services/sleeper/nflStateService';
import { SleeperApiService } from '@/services/sleeper/sleeperApiService';
import { prisma as db } from '@/lib/db';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const sleeperApi = new SleeperApiService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');
    const season = searchParams.get('season');
    const playerId = searchParams.get('playerId');
    const position = searchParams.get('position');
    const teamId = searchParams.get('teamId');
    const format = searchParams.get('format') || 'detailed';
    const includeStats = searchParams.get('includeStats') === 'true';
    const source = searchParams.get('source') || 'database'; // 'database', 'sleeper', or 'both'

    // Get current NFL context
    const nflState = await nflStateService.getCurrentState();
    const targetWeek = week ? parseInt(week) : nflState.week;
    const targetSeason = season ? parseInt(season) : parseInt(nflState.season);

    if (targetWeek < 1 || targetWeek > 22) {
      return NextResponse.json(
        { error: 'Invalid week number. Must be between 1 and 22' },
        { status: 400 }
      );
    }

    let result;

    if (playerId) {
      // Get projections for specific player
      result = await getPlayerProjections(playerId, targetWeek, targetSeason, includeStats, source);
    } else if (leagueId) {
      // Get projections for all players in a league
      result = await getLeagueProjections(leagueId, targetWeek, targetSeason, teamId, format, includeStats, source);
    } else {
      // Get projections for all players (optionally filtered by position)
      result = await getAllProjections(targetWeek, targetSeason, position, format, includeStats, source);
    }

    // Add metadata
    const responseData = {
      success: true,
      data: result,
      meta: {
        week: targetWeek,
        season: targetSeason,
        isCurrentWeek: targetWeek === nflState.week,
        seasonType: nflState.season_type,
        source,
        format,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[API] Projections GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get projections',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, week, season, leagueId, options = {} } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action parameter required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'sync_projections':
        // Sync projections from Sleeper API
        console.log(`[API] Syncing projections for week ${week || 'current'}`);
        result = await syncProjectionsFromSleeper(week, season, options);
        break;

      case 'update_league_projections':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for league projection update' },
            { status: 400 }
          );
        }

        console.log(`[API] Updating projections for league: ${leagueId}`);
        result = await updateLeagueProjections(leagueId, week, season, options);
        break;

      case 'calculate_custom_projections':
        // Calculate custom projections based on historical data
        console.log(`[API] Calculating custom projections for week ${week || 'current'}`);
        result = await calculateCustomProjections(week, season, leagueId, options);
        break;

      case 'compare_projections':
        // Compare different projection sources
        console.log(`[API] Comparing projection sources for week ${week || 'current'}`);
        result = await compareProjections(week, season, leagueId, options);
        break;

      case 'generate_lineup_projections':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for lineup projections' },
            { status: 400 }
          );
        }

        console.log(`[API] Generating lineup projections for league: ${leagueId}`);
        result = await generateLineupProjections(leagueId, week, season, options);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sync_projections, update_league_projections, calculate_custom_projections, compare_projections, or generate_lineup_projections' },
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
    console.error('[API] Projections POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Projections operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Helper function to get projections for a specific player
async function getPlayerProjections(playerId: string, week: number, season: number, includeStats: boolean, source: string) {
  try {
    const player = await db.player.findUnique({
      where: { id: playerId },
      include: {
        projections: {
          where: { week, season },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        playerStats: includeStats ? {
          where: { week, season },
          take: 1,
        } : false,
      },
    });

    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    let sleeperProjection = null;
    if (source === 'sleeper' || source === 'both') {
      try {
        const sleeperProjections = await sleeperApi.getPlayerProjections(season.toString(), week);
        sleeperProjection = sleeperProjections[player.sleeperId];
      } catch (error) {
        console.warn(`Failed to get Sleeper projection for player ${playerId}:`, error);
      }
    }

    const dbProjection = player.projections[0];
    
    return {
      player: {
        id: player.id,
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        sleeperId: player.sleeperId,
      },
      week,
      season,
      projections: {
        database: dbProjection ? {
          projectedPoints: Number(dbProjection.projectedPoints),
          confidence: dbProjection.confidence,
          source: dbProjection.source,
          createdAt: dbProjection.createdAt,
          stats: dbProjection.projectedStats,
        } : null,
        sleeper: sleeperProjection ? {
          projectedPoints: calculateFantasyPoints(sleeperProjection),
          stats: sleeperProjection,
        } : null,
      },
      actualStats: includeStats && player.playerStats?.[0] ? {
        fantasyPoints: Number(player.playerStats[0].fantasyPoints),
        stats: player.playerStats[0].stats,
      } : null,
    };

  } catch (error) {
    console.error(`Failed to get player projections for ${playerId}:`, error);
    throw error;
  }
}

// Helper function to get projections for all players in a league
async function getLeagueProjections(
  leagueId: string, 
  week: number, 
  season: number, 
  teamId?: string, 
  format: string = 'detailed',
  includeStats: boolean = false,
  source: string = 'database'
) {
  try {
    // Verify league exists
    const league = await db.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, isActive: true },
    });

    if (!league) {
      throw new Error(`League ${leagueId} not found`);
    }

    // Get teams and their rosters
    const teams = await db.team.findMany({
      where: { 
        leagueId,
        ...(teamId ? { id: teamId } : {})
      },
      include: {
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: { week, season },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
                playerStats: includeStats ? {
                  where: { week, season },
                  take: 1,
                } : false,
              },
            },
          },
        },
      },
    });

    // Get Sleeper projections if requested
    let sleeperProjections: any = {};
    if (source === 'sleeper' || source === 'both') {
      try {
        sleeperProjections = await sleeperApi.getPlayerProjections(season.toString(), week);
      } catch (error) {
        console.warn('Failed to get Sleeper projections:', error);
      }
    }

    // Format response based on format type
    if (format === 'summary') {
      return formatLeagueProjectionsSummary(teams, week, season, sleeperProjections, includeStats);
    } else if (format === 'roster') {
      return formatLeagueProjectionsRoster(teams, week, season, sleeperProjections, includeStats);
    } else {
      return formatLeagueProjectionsDetailed(teams, week, season, sleeperProjections, includeStats);
    }

  } catch (error) {
    console.error(`Failed to get league projections for ${leagueId}:`, error);
    throw error;
  }
}

// Helper function to get all projections
async function getAllProjections(
  week: number, 
  season: number, 
  position?: string, 
  format: string = 'detailed',
  includeStats: boolean = false,
  source: string = 'database'
) {
  try {
    const whereClause: any = {};
    if (position) {
      whereClause.position = position;
    }

    const players = await db.player.findMany({
      where: whereClause,
      include: {
        projections: {
          where: { week, season },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        playerStats: includeStats ? {
          where: { week, season },
          take: 1,
        } : false,
      },
      orderBy: [
        { position: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get Sleeper projections if requested
    let sleeperProjections: any = {};
    if (source === 'sleeper' || source === 'both') {
      try {
        sleeperProjections = await sleeperApi.getPlayerProjections(season.toString(), week);
      } catch (error) {
        console.warn('Failed to get Sleeper projections:', error);
      }
    }

    // Filter players with projections or stats
    const playersWithData = players.filter(player => 
      player.projections.length > 0 || 
      (sleeperProjections[player.sleeperId]) ||
      (includeStats && player.playerStats && player.playerStats.length > 0)
    );

    if (format === 'summary') {
      return formatAllProjectionsSummary(playersWithData, week, season, sleeperProjections, includeStats, position);
    } else {
      return formatAllProjectionsDetailed(playersWithData, week, season, sleeperProjections, includeStats);
    }

  } catch (error) {
    console.error('Failed to get all projections:', error);
    throw error;
  }
}

// Helper function to sync projections from Sleeper
async function syncProjectionsFromSleeper(week?: number, season?: number, options: any = {}) {
  try {
    const nflState = await nflStateService.getCurrentState();
    const targetWeek = week || nflState.week;
    const targetSeason = season || parseInt(nflState.season);

    console.log(`Syncing Sleeper projections for week ${targetWeek}, season ${targetSeason}`);
    
    // Use the existing sync service
    await playerSyncService.syncCurrentWeekProjections();

    // Get sync stats
    const syncedCount = await db.playerProjection.count({
      where: {
        week: targetWeek,
        season: targetSeason,
        source: 'sleeper',
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Last hour
        },
      },
    });

    return {
      week: targetWeek,
      season: targetSeason,
      syncedProjections: syncedCount,
      source: 'sleeper',
      syncedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Failed to sync projections from Sleeper:', error);
    throw error;
  }
}

// Helper function to update league projections
async function updateLeagueProjections(leagueId: string, week?: number, season?: number, options: any = {}) {
  try {
    const nflState = await nflStateService.getCurrentState();
    const targetWeek = week || nflState.week;
    const targetSeason = season || parseInt(nflState.season);

    // Get all players in the league
    const leaguePlayerIds = await db.rosterPlayer.findMany({
      where: {
        team: { leagueId },
      },
      select: { playerId: true },
      distinct: ['playerId'],
    });

    const playerIds = leaguePlayerIds.map(rp => rp.playerId);

    // Update projections for these players
    let updatedCount = 0;
    for (const playerId of playerIds) {
      try {
        // This would trigger individual player projection updates
        // For now, we'll just count existing projections
        const existing = await db.playerProjection.findFirst({
          where: { playerId, week: targetWeek, season: targetSeason },
        });
        if (existing) updatedCount++;
      } catch (error) {
        console.warn(`Failed to update projection for player ${playerId}:`, error);
      }
    }

    return {
      leagueId,
      week: targetWeek,
      season: targetSeason,
      playersInLeague: playerIds.length,
      projectionsUpdated: updatedCount,
      updatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`Failed to update league projections for ${leagueId}:`, error);
    throw error;
  }
}

// Helper function to calculate custom projections
async function calculateCustomProjections(week?: number, season?: number, leagueId?: string, options: any = {}) {
  try {
    // This would implement custom projection algorithms
    // For now, return a placeholder implementation
    const nflState = await nflStateService.getCurrentState();
    const targetWeek = week || nflState.week;
    const targetSeason = season || parseInt(nflState.season);

    return {
      week: targetWeek,
      season: targetSeason,
      method: 'custom_algorithm',
      message: 'Custom projections would be calculated here using historical data, matchup analysis, and ML models',
      features: [
        'Historical performance analysis',
        'Matchup difficulty scoring',
        'Weather impact modeling',
        'Injury risk assessment',
        'Target share trends',
        'Red zone efficiency',
      ],
      calculatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Failed to calculate custom projections:', error);
    throw error;
  }
}

// Helper function to compare projections
async function compareProjections(week?: number, season?: number, leagueId?: string, options: any = {}) {
  try {
    // This would compare different projection sources
    const nflState = await nflStateService.getCurrentState();
    const targetWeek = week || nflState.week;
    const targetSeason = season || parseInt(nflState.season);

    // Get some sample comparisons
    const dbProjections = await db.playerProjection.count({
      where: { week: targetWeek, season: targetSeason, source: 'sleeper' },
    });

    return {
      week: targetWeek,
      season: targetSeason,
      sources: {
        sleeper: {
          available: dbProjections,
          accuracy: 'TBD', // Would calculate historical accuracy
        },
        custom: {
          available: 0,
          accuracy: 'TBD',
        },
        consensus: {
          available: 0,
          accuracy: 'TBD',
        },
      },
      comparison: {
        message: 'Projection comparison would analyze accuracy, bias, and correlation between sources',
        metrics: ['MAE', 'RMSE', 'Correlation', 'Bias'],
      },
      comparedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Failed to compare projections:', error);
    throw error;
  }
}

// Helper function to generate lineup projections
async function generateLineupProjections(leagueId: string, week?: number, season?: number, options: any = {}) {
  try {
    const nflState = await nflStateService.getCurrentState();
    const targetWeek = week || nflState.week;
    const targetSeason = season || parseInt(nflState.season);

    // Get league teams and their projected lineups
    const teams = await db.team.findMany({
      where: { leagueId },
      include: {
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: { week: targetWeek, season: targetSeason },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const teamProjections = teams.map(team => {
      const startingLineup = team.roster.filter(rp => 
        rp.rosterSlot !== 'BENCH' && rp.rosterSlot !== 'IR'
      );

      const totalProjected = startingLineup.reduce((sum, rp) => {
        const projection = rp.player.projections[0];
        return sum + (projection ? Number(projection.projectedPoints) : 0);
      }, 0);

      return {
        teamId: team.id,
        teamName: team.name,
        totalProjected: Math.round(totalProjected * 100) / 100,
        startingLineup: startingLineup.map(rp => ({
          playerId: rp.player.id,
          playerName: rp.player.name,
          position: rp.player.position,
          rosterSlot: rp.rosterSlot,
          projectedPoints: rp.player.projections[0] ? 
            Number(rp.player.projections[0].projectedPoints) : 0,
        })),
      };
    });

    // Sort by projected points
    teamProjections.sort((a, b) => b.totalProjected - a.totalProjected);

    return {
      leagueId,
      week: targetWeek,
      season: targetSeason,
      teamProjections,
      summary: {
        averageProjected: teamProjections.reduce((sum, t) => sum + t.totalProjected, 0) / teamProjections.length,
        highestProjected: teamProjections[0]?.totalProjected || 0,
        lowestProjected: teamProjections[teamProjections.length - 1]?.totalProjected || 0,
      },
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`Failed to generate lineup projections for league ${leagueId}:`, error);
    throw error;
  }
}

// Formatting helper functions
function formatLeagueProjectionsSummary(teams: any[], week: number, season: number, sleeperProjections: any, includeStats: boolean) {
  const teamSummaries = teams.map(team => {
    const startingLineup = team.roster.filter((rp: any) => 
      rp.rosterSlot !== 'BENCH' && rp.rosterSlot !== 'IR'
    );

    const totalProjected = startingLineup.reduce((sum: number, rp: any) => {
      const dbProjection = rp.player.projections[0];
      const sleeperProj = sleeperProjections[rp.player.sleeperId];
      
      const points = dbProjection ? Number(dbProjection.projectedPoints) :
                    sleeperProj ? calculateFantasyPoints(sleeperProj) : 0;
      
      return sum + points;
    }, 0);

    return {
      teamId: team.id,
      teamName: team.name,
      totalProjected: Math.round(totalProjected * 100) / 100,
      startingPlayers: startingLineup.length,
    };
  });

  return {
    week,
    season,
    teams: teamSummaries,
    summary: {
      totalTeams: teams.length,
      averageProjected: teamSummaries.reduce((sum, t) => sum + t.totalProjected, 0) / teamSummaries.length,
    },
  };
}

function formatLeagueProjectionsRoster(teams: any[], week: number, season: number, sleeperProjections: any, includeStats: boolean) {
  return teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    roster: team.roster.map((rp: any) => {
      const dbProjection = rp.player.projections[0];
      const sleeperProj = sleeperProjections[rp.player.sleeperId];
      
      return {
        playerId: rp.player.id,
        playerName: rp.player.name,
        position: rp.player.position,
        rosterSlot: rp.rosterSlot,
        projectedPoints: dbProjection ? Number(dbProjection.projectedPoints) :
                        sleeperProj ? calculateFantasyPoints(sleeperProj) : 0,
        isStarting: rp.rosterSlot !== 'BENCH' && rp.rosterSlot !== 'IR',
      };
    }),
  }));
}

function formatLeagueProjectionsDetailed(teams: any[], week: number, season: number, sleeperProjections: any, includeStats: boolean) {
  return {
    week,
    season,
    teams: teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      roster: team.roster.map((rp: any) => {
        const dbProjection = rp.player.projections[0];
        const sleeperProj = sleeperProjections[rp.player.sleeperId];
        
        return {
          playerId: rp.player.id,
          playerName: rp.player.name,
          position: rp.player.position,
          nflTeam: rp.player.nflTeam,
          rosterSlot: rp.rosterSlot,
          isStarting: rp.rosterSlot !== 'BENCH' && rp.rosterSlot !== 'IR',
          projections: {
            database: dbProjection ? {
              projectedPoints: Number(dbProjection.projectedPoints),
              confidence: dbProjection.confidence,
              source: dbProjection.source,
            } : null,
            sleeper: sleeperProj ? {
              projectedPoints: calculateFantasyPoints(sleeperProj),
              stats: sleeperProj,
            } : null,
          },
          actualStats: includeStats && rp.player.playerStats?.[0] ? {
            fantasyPoints: Number(rp.player.playerStats[0].fantasyPoints),
            stats: rp.player.playerStats[0].stats,
          } : null,
        };
      }),
    })),
  };
}

function formatAllProjectionsSummary(players: any[], week: number, season: number, sleeperProjections: any, includeStats: boolean, position?: string) {
  const positionGroups = players.reduce((groups: any, player) => {
    const pos = player.position;
    if (!groups[pos]) groups[pos] = [];
    
    const dbProjection = player.projections[0];
    const sleeperProj = sleeperProjections[player.sleeperId];
    const projectedPoints = dbProjection ? Number(dbProjection.projectedPoints) :
                           sleeperProj ? calculateFantasyPoints(sleeperProj) : 0;
    
    if (projectedPoints > 0) {
      groups[pos].push({
        playerId: player.id,
        playerName: player.name,
        nflTeam: player.nflTeam,
        projectedPoints,
      });
    }
    
    return groups;
  }, {});

  // Sort players within each position by projected points
  Object.keys(positionGroups).forEach(pos => {
    positionGroups[pos].sort((a: any, b: any) => b.projectedPoints - a.projectedPoints);
  });

  return {
    week,
    season,
    position: position || 'all',
    positionGroups,
    summary: {
      totalPlayers: players.length,
      playersWithProjections: Object.values(positionGroups).flat().length,
      positions: Object.keys(positionGroups),
    },
  };
}

function formatAllProjectionsDetailed(players: any[], week: number, season: number, sleeperProjections: any, includeStats: boolean) {
  return {
    week,
    season,
    players: players.map(player => {
      const dbProjection = player.projections[0];
      const sleeperProj = sleeperProjections[player.sleeperId];
      
      return {
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        projections: {
          database: dbProjection ? {
            projectedPoints: Number(dbProjection.projectedPoints),
            confidence: dbProjection.confidence,
            source: dbProjection.source,
            createdAt: dbProjection.createdAt,
          } : null,
          sleeper: sleeperProj ? {
            projectedPoints: calculateFantasyPoints(sleeperProj),
            stats: sleeperProj,
          } : null,
        },
        actualStats: includeStats && player.playerStats?.[0] ? {
          fantasyPoints: Number(player.playerStats[0].fantasyPoints),
          stats: player.playerStats[0].stats,
        } : null,
      };
    }),
  };
}

// Helper function to calculate fantasy points from stats
function calculateFantasyPoints(stats: any): number {
  // Standard PPR scoring
  let points = 0;
  
  // Passing
  points += (stats.pass_yd || 0) * 0.04;
  points += (stats.pass_td || 0) * 4;
  points += (stats.pass_int || 0) * -2;
  
  // Rushing
  points += (stats.rush_yd || 0) * 0.1;
  points += (stats.rush_td || 0) * 6;
  
  // Receiving
  points += (stats.rec_yd || 0) * 0.1;
  points += (stats.rec_td || 0) * 6;
  points += (stats.rec || 0) * 1; // PPR
  
  // Kicking
  points += (stats.fgm || 0) * 3;
  points += (stats.xpm || 0) * 1;
  
  // Defense
  points += (stats.def_int || 0) * 2;
  points += (stats.def_td || 0) * 6;
  
  return Math.round(points * 100) / 100;
}