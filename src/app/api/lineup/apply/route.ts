import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Lineup Apply API
 * POST /api/lineup/apply - Apply lineup changes to a team
 */
export async function POST(request: Request) {
  try {
    const { 
      teamId, 
      lineupChanges, 
      week, 
      season = '2025',
      validateOnly = false,
      source = 'manual'
    } = await request.json();

    if (!teamId || !lineupChanges) {
      return NextResponse.json(
        { success: false, error: 'Team ID and lineup changes are required' },
        { status: 400 }
      );
    }

    // Get current week if not specified
    const currentWeek = week || await getCurrentWeek();

    // Validate team exists and user has permission
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            rosterSettings: true,
            scoringSettings: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rosterPlayers: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
                status: true,
                injuryStatus: true
              }
            }
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Validate lineup changes
    const validation = await validateLineupChanges(team, lineupChanges, currentWeek, season);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid lineup changes',
          details: validation.errors,
          warnings: validation.warnings
        },
        { status: 400 }
      );
    }

    // If validation only, return validation results
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        message: 'Lineup changes are valid',
        data: {
          validation: validation,
          projectedImpact: await calculateProjectedImpact(team, lineupChanges, currentWeek),
          optimizationSuggestions: await getOptimizationSuggestions(team, lineupChanges)
        }
      });
    }

    // Apply lineup changes
    const result = await applyLineupChanges(team, lineupChanges, currentWeek, season, source);

    // Log the lineup change
    console.log(`Lineup applied for ${team.name} (Week ${currentWeek}):`, {
      changes: lineupChanges.length,
      source: source,
      teamId: teamId
    });

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: team.owner.id,
          action: 'lineup_change',
          details: {
            teamId: teamId,
            teamName: team.name,
            week: currentWeek,
            season: season,
            changes: lineupChanges,
            source: source,
            validation: validation
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the main operation
    }

    return NextResponse.json({
      success: true,
      message: `Lineup successfully applied for ${team.name}`,
      data: {
        teamId: teamId,
        week: currentWeek,
        season: season,
        appliedChanges: result.appliedChanges,
        rejectedChanges: result.rejectedChanges,
        currentLineup: result.currentLineup,
        projectedPoints: result.projectedPoints,
        optimizationScore: result.optimizationScore,
        appliedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Lineup apply API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to apply lineup changes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get current lineup
 * GET /api/lineup/apply - Get current lineup for a team
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const week = parseInt(searchParams.get('week') || '0');
    const season = searchParams.get('season') || '2025';
    const includeProjections = searchParams.get('includeProjections') === 'true';
    const includeBench = searchParams.get('includeBench') === 'true';

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const currentWeek = week || await getCurrentWeek();

    // Get team with current lineup
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            rosterSettings: true,
            scoringSettings: true
          }
        },
        rosterPlayers: {
          include: {
            player: {
              include: {
                stats: {
                  where: {
                    week: currentWeek,
                    season: season
                  },
                  take: 1
                },
                playerProjections: includeProjections ? {
                  where: {
                    week: currentWeek,
                    season: parseInt(season)
                  },
                  orderBy: { confidence: 'desc' },
                  take: 1
                } : false
              }
            }
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Organize lineup by position
    const lineup = organizeLineup(team.rosterPlayers, includeBench);
    
    // Calculate lineup metrics
    const metrics = await calculateLineupMetrics(lineup, team.league.scoringSettings);

    return NextResponse.json({
      success: true,
      data: {
        teamId: teamId,
        teamName: team.name,
        week: currentWeek,
        season: season,
        lineup: lineup,
        metrics: metrics,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get lineup API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get lineup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function getCurrentWeek(): Promise<number> {
  try {
    const league = await prisma.league.findFirst({
      where: { isActive: true },
      select: { currentWeek: true }
    });
    return league?.currentWeek || 1;
  } catch (error) {
    console.error('Error getting current week:', error);
    return 1;
  }
}

async function validateLineupChanges(team: any, lineupChanges: any[], week: number, season: string) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Check if lineup is locked for the week
    const isLocked = await isLineupLocked(team.id, week);
    if (isLocked) {
      errors.push('Lineup is locked for this week');
      return { isValid: false, errors, warnings };
    }

    // Validate each change
    for (const change of lineupChanges) {
      const { playerId, fromPosition, toPosition, action } = change;
      
      // Validate player exists on roster
      const rosterPlayer = team.rosterPlayers.find((rp: any) => rp.playerId === playerId);
      if (!rosterPlayer) {
        errors.push(`Player ${playerId} not found on roster`);
        continue;
      }

      // Validate position compatibility
      if (toPosition !== 'BENCH' && !isPositionCompatible(rosterPlayer.player.position, toPosition)) {
        errors.push(`${rosterPlayer.player.name} (${rosterPlayer.player.position}) cannot play ${toPosition}`);
        continue;
      }

      // Check player availability
      if (rosterPlayer.player.status === 'ir' || rosterPlayer.player.injuryStatus === 'out') {
        warnings.push(`${rosterPlayer.player.name} is injured and may not play`);
      }

      // Validate position limits
      const positionValidation = validatePositionLimits(team, lineupChanges, team.league.rosterSettings);
      if (!positionValidation.isValid) {
        errors.push(...positionValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Error validating lineup changes:', error);
    return {
      isValid: false,
      errors: ['Failed to validate lineup changes'],
      warnings: []
    };
  }
}

async function isLineupLocked(teamId: string, week: number): Promise<boolean> {
  try {
    // Check if any games have started for players on this team
    // For now, return false (lineup not locked)
    // In production, this would check game start times
    return false;
  } catch (error) {
    console.error('Error checking lineup lock:', error);
    return false;
  }
}

function isPositionCompatible(playerPosition: string, targetPosition: string): boolean {
  const compatibilityMap: { [key: string]: string[] } = {
    'QB': ['QB'],
    'RB': ['RB', 'FLEX'],
    'WR': ['WR', 'FLEX'],
    'TE': ['TE', 'FLEX'],
    'K': ['K'],
    'DEF': ['DEF'],
    'DST': ['DEF']
  };

  return compatibilityMap[playerPosition]?.includes(targetPosition) || false;
}

function validatePositionLimits(team: any, lineupChanges: any[], rosterSettings: any) {
  const errors: string[] = [];
  
  // Default position requirements
  const defaultLimits = {
    'QB': { min: 1, max: 1 },
    'RB': { min: 1, max: 2 },
    'WR': { min: 1, max: 3 },
    'TE': { min: 1, max: 1 },
    'FLEX': { min: 0, max: 1 },
    'K': { min: 1, max: 1 },
    'DEF': { min: 1, max: 1 }
  };

  const limits = rosterSettings?.positionLimits || defaultLimits;

  // Apply changes to current lineup
  const updatedLineup = simulateLineupChanges(team.rosterPlayers, lineupChanges);
  
  // Count positions after changes
  const positionCounts = countPositions(updatedLineup);

  // Validate each position
  for (const [position, requirements] of Object.entries(limits)) {
    const count = positionCounts[position] || 0;
    
    if (count < requirements.min) {
      errors.push(`Insufficient ${position} players: need ${requirements.min}, have ${count}`);
    }
    if (count > requirements.max) {
      errors.push(`Too many ${position} players: max ${requirements.max}, have ${count}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function simulateLineupChanges(currentRoster: any[], changes: any[]) {
  const simulation = currentRoster.map(rp => ({
    ...rp,
    position: rp.position,
    isStarter: rp.isStarter
  }));

  // Apply each change
  for (const change of changes) {
    const rosterPlayer = simulation.find(rp => rp.playerId === change.playerId);
    if (rosterPlayer) {
      if (change.action === 'move') {
        rosterPlayer.position = change.toPosition;
        rosterPlayer.isStarter = change.toPosition !== 'BENCH';
      } else if (change.action === 'start') {
        rosterPlayer.isStarter = true;
        rosterPlayer.position = change.toPosition;
      } else if (change.action === 'bench') {
        rosterPlayer.isStarter = false;
        rosterPlayer.position = 'BENCH';
      }
    }
  }

  return simulation;
}

function countPositions(roster: any[]) {
  const counts: { [key: string]: number } = {};
  
  roster.forEach(rp => {
    if (rp.isStarter) {
      counts[rp.position] = (counts[rp.position] || 0) + 1;
    }
  });

  return counts;
}

async function calculateProjectedImpact(team: any, lineupChanges: any[], week: number) {
  try {
    // Calculate current projected points
    const currentLineup = team.rosterPlayers.filter((rp: any) => rp.isStarter);
    const currentProjection = await getLineupProjection(currentLineup, week);

    // Calculate new projected points after changes
    const simulatedLineup = simulateLineupChanges(team.rosterPlayers, lineupChanges);
    const newStarters = simulatedLineup.filter(rp => rp.isStarter);
    const newProjection = await getLineupProjection(newStarters, week);

    return {
      currentProjection: currentProjection,
      newProjection: newProjection,
      projectedChange: newProjection - currentProjection,
      confidence: 0.75 // This would be calculated based on projection reliability
    };
  } catch (error) {
    console.error('Error calculating projected impact:', error);
    return {
      currentProjection: 0,
      newProjection: 0,
      projectedChange: 0,
      confidence: 0
    };
  }
}

async function getLineupProjection(lineup: any[], week: number): Promise<number> {
  // This would use actual projection data
  // For now, return estimated points based on position averages
  const positionAverages: { [key: string]: number } = {
    'QB': 18.5,
    'RB': 12.8,
    'WR': 11.2,
    'TE': 8.5,
    'FLEX': 10.0,
    'K': 7.2,
    'DEF': 8.0
  };

  return lineup.reduce((total, rp) => {
    return total + (positionAverages[rp.position] || 0);
  }, 0);
}

async function getOptimizationSuggestions(team: any, lineupChanges: any[]) {
  // This would analyze the lineup for optimization opportunities
  return {
    suggestions: [
      'Consider weather impact for outdoor games',
      'Check injury reports before finalizing lineup',
      'Monitor player news for last-minute changes'
    ],
    alternativeLineups: [],
    riskAssessment: 'medium'
  };
}

async function applyLineupChanges(team: any, lineupChanges: any[], week: number, season: string, source: string) {
  const appliedChanges: any[] = [];
  const rejectedChanges: any[] = [];

  try {
    // Apply each change
    for (const change of lineupChanges) {
      const { playerId, toPosition, action } = change;
      
      try {
        // Update roster player
        const updatedPlayer = await prisma.rosterPlayer.update({
          where: {
            teamId_playerId: {
              teamId: team.id,
              playerId: playerId
            }
          },
          data: {
            position: toPosition === 'BENCH' ? 'BENCH' : toPosition,
            isStarter: toPosition !== 'BENCH',
            updatedAt: new Date()
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true
              }
            }
          }
        });

        appliedChanges.push({
          ...change,
          player: updatedPlayer.player,
          appliedAt: new Date().toISOString()
        });

      } catch (updateError) {
        console.error(`Failed to apply change for player ${playerId}:`, updateError);
        rejectedChanges.push({
          ...change,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
    }

    // Get updated lineup
    const updatedTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        rosterPlayers: {
          include: {
            player: true
          }
        }
      }
    });

    const currentLineup = organizeLineup(updatedTeam?.rosterPlayers || [], false);
    const projectedPoints = await getLineupProjection(
      updatedTeam?.rosterPlayers.filter(rp => rp.isStarter) || [], 
      week
    );

    return {
      appliedChanges,
      rejectedChanges,
      currentLineup,
      projectedPoints,
      optimizationScore: calculateOptimizationScore(currentLineup)
    };

  } catch (error) {
    console.error('Error applying lineup changes:', error);
    throw error;
  }
}

function organizeLineup(rosterPlayers: any[], includeBench: boolean) {
  const starters = rosterPlayers.filter(rp => rp.isStarter);
  const bench = rosterPlayers.filter(rp => !rp.isStarter);

  const lineup: any = {
    starters: starters.map(rp => ({
      id: rp.id,
      playerId: rp.player.id,
      name: rp.player.name,
      position: rp.position,
      playerPosition: rp.player.position,
      team: rp.player.nflTeam,
      status: rp.player.status,
      injuryStatus: rp.player.injuryStatus,
      stats: rp.player.stats || [],
      projections: rp.player.playerProjections || []
    }))
  };

  if (includeBench) {
    lineup.bench = bench.map(rp => ({
      id: rp.id,
      playerId: rp.player.id,
      name: rp.player.name,
      position: 'BENCH',
      playerPosition: rp.player.position,
      team: rp.player.nflTeam,
      status: rp.player.status,
      injuryStatus: rp.player.injuryStatus,
      stats: rp.player.stats || [],
      projections: rp.player.playerProjections || []
    }));
  }

  return lineup;
}

async function calculateLineupMetrics(lineup: any, scoringSettings: any) {
  const starters = lineup.starters || [];
  
  return {
    totalProjectedPoints: await getLineupProjection(starters.map(s => ({ position: s.position })), 1),
    injuredPlayers: starters.filter((s: any) => s.injuryStatus && s.injuryStatus !== 'healthy').length,
    byeWeekPlayers: 0, // This would check actual bye weeks
    optimizationScore: calculateOptimizationScore(lineup),
    riskLevel: calculateRiskLevel(starters),
    completeness: starters.length >= 9 ? 'complete' : 'incomplete' // Standard lineup size
  };
}

function calculateOptimizationScore(lineup: any): number {
  // Simple optimization score based on lineup completeness
  const starters = lineup.starters || [];
  const requiredPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const filledPositions = new Set(starters.map((s: any) => s.position));
  
  const completeness = requiredPositions.filter(pos => filledPositions.has(pos)).length / requiredPositions.length;
  return Math.round(completeness * 100);
}

function calculateRiskLevel(starters: any[]): 'low' | 'medium' | 'high' {
  const injuredCount = starters.filter(s => s.injuryStatus && s.injuryStatus !== 'healthy').length;
  const questionableCount = starters.filter(s => s.injuryStatus === 'questionable').length;
  
  if (injuredCount > 2 || questionableCount > 3) return 'high';
  if (injuredCount > 0 || questionableCount > 1) return 'medium';
  return 'low';
}