import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getPlayersLockStatus, isWeekLocked } from '@/lib/gameTimeUtils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Types for lineup management
interface LineupChange {
  playerId: string;
  newPosition: string;
  oldPosition?: string;
}

interface LineupValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

interface OptimalLineupPlayer {
  playerId: string;
  playerName: string;
  position: string;
  projectedPoints: number;
  playerPosition: string;
  confidence: number;
}

// Standard fantasy football roster requirements
const DEFAULT_ROSTER_SLOTS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  K: 1,
  DST: 1,
  BENCH: 6,
  IR: 2
};

// GET /api/lineup - Get current lineup
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get user's team
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId: targetLeagueId
      },
      include: {
        roster: {
          include: {
            player: {
              include: {
                playerStats: {
                  where: {
                    week: week ? parseInt(week) : undefined,
                    season: 2024
                  },
                  orderBy: {
                    week: 'desc'
                  },
                  take: 1
                },
                projections: {
                  where: {
                    week: week ? parseInt(week) : undefined,
                    season: 2024
                  },
                  orderBy: {
                    confidence: 'desc'
                  },
                  take: 1
                }
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { acquisitionDate: 'desc' }
          ]
        }
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get league settings for roster requirements
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { 
        settings: true,
        currentWeek: true
      }
    });
    
    const settings = league?.settings as any;
    const rosterRequirements = settings?.rosterSlots || DEFAULT_ROSTER_SLOTS;
    const currentWeek = league?.currentWeek || 15;
    const targetWeek = week ? parseInt(week) : currentWeek;
    
    // Check for locked players
    const lockStatuses = await getPlayersLockStatus(team.roster.map(p => p.playerId), targetWeek);
    const lockedPlayerIds = lockStatuses.filter(ls => ls.isLocked).map(ls => ls.playerId);
    
    // Organize lineup by position
    const lineup = {
      starters: team.roster.filter(p => 
        p.position !== 'BENCH' && 
        p.position !== 'IR' && 
        p.position !== 'TAXI'
      ).map(rp => ({
        ...rp,
        isLocked: lockedPlayerIds.includes(rp.playerId),
        projectedPoints: rp.player.projections[0]?.projectedPoints || 0,
        scoredPoints: rp.player.playerStats[0]?.fantasyPoints || 0
      })),
      bench: team.roster.filter(p => p.position === 'BENCH').map(rp => ({
        ...rp,
        isLocked: lockedPlayerIds.includes(rp.playerId),
        projectedPoints: rp.player.projections[0]?.projectedPoints || 0,
        scoredPoints: rp.player.playerStats[0]?.fantasyPoints || 0
      })),
      injuredReserve: team.roster.filter(p => p.position === 'IR').map(rp => ({
        ...rp,
        isLocked: lockedPlayerIds.includes(rp.playerId),
        projectedPoints: rp.player.projections[0]?.projectedPoints || 0,
        scoredPoints: rp.player.playerStats[0]?.fantasyPoints || 0
      })),
      requirements: rosterRequirements,
      teamId: team.id,
      teamName: team.name,
      week: targetWeek
    };
    
    // Calculate total projected points for starters
    const totalProjected = lineup.starters.reduce((sum, rp) => {
      return sum + Number(rp.projectedPoints || 0);
    }, 0);
    
    // Calculate total scored points for starters
    const totalScored = lineup.starters.reduce((sum, rp) => {
      return sum + Number(rp.scoredPoints || 0);
    }, 0);
    
    // Validate current lineup
    const validation = validateCurrentLineup(lineup.starters, rosterRequirements);
    
    // Get optimal lineup suggestion
    const optimalLineup = await generateOptimalLineup(team.roster, rosterRequirements, targetWeek);
    
    return NextResponse.json({
      success: true,
      data: {
        ...lineup,
        totalProjected: Math.round(totalProjected * 10) / 10,
        totalScored: Math.round(totalScored * 10) / 10,
        currentWeek: currentWeek,
        validation,
        optimalLineup,
        lineupLocked: await isWeekLocked(targetWeek)
      }
    });
    
  } catch (error) {
    console.error('Get lineup error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lineup' },
      { status: 500 }
    );
  }
}

// POST /api/lineup - Update lineup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { changes, leagueId, week } = body;
    
    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: 'changes array is required' },
        { status: 400 }
      );
    }
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get user's team
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId: targetLeagueId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get league and current week
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { currentWeek: true, settings: true }
    });
    
    const targetWeek = week || league?.currentWeek || 15;
    
    // Check if lineup is locked for this week
    if (await isWeekLocked(targetWeek)) {
      return NextResponse.json({
        error: 'Lineup is locked - games have started for this week',
        code: 'LINEUP_LOCKED'
      }, { status: 400 });
    }
    
    // Validate all players belong to the team
    const playerIds = changes.map(c => c.playerId);
    const rosterPlayers = await prisma.rosterPlayer.findMany({
      where: {
        teamId: team.id,
        playerId: { in: playerIds }
      },
      include: {
        player: true
      }
    });
    
    if (rosterPlayers.length !== playerIds.length) {
      return NextResponse.json(
        { error: 'One or more players not on your roster' },
        { status: 400 }
      );
    }
    
    // Check for locked players (games started)
    const lockStatuses = await getPlayersLockStatus(playerIds, targetWeek);
    const lockedPlayerIds = lockStatuses.filter(ls => ls.isLocked).map(ls => ls.playerId);
    const lockedChanges = changes.filter(c => lockedPlayerIds.includes(c.playerId));
    
    if (lockedChanges.length > 0) {
      const lockedNames = rosterPlayers
        .filter(rp => lockedChanges.some(lc => lc.playerId === rp.playerId))
        .map(rp => rp.player.name);
      
      return NextResponse.json({
        error: 'Cannot modify lineup - some players\' games have started',
        lockedPlayers: lockedNames,
        code: 'PLAYERS_LOCKED'
      }, { status: 400 });
    }
    
    // Validate lineup requirements
    const settings = league?.settings as any;
    const rosterRequirements = settings?.rosterSlots || DEFAULT_ROSTER_SLOTS;
    
    const validation = await validateLineupChanges(team.id, changes, rosterRequirements);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: validation.error,
          warnings: validation.warnings,
          code: 'VALIDATION_FAILED'
        },
        { status: 400 }
      );
    }
    
    // Apply lineup changes in a transaction
    const updatedRoster = await prisma.$transaction(async (tx) => {
      const updates = [];
      
      for (const change of changes) {
        const update = await tx.rosterPlayer.update({
          where: {
            teamId_playerId: {
              teamId: team.id,
              playerId: change.playerId
            }
          },
          data: {
            position: change.newPosition as any,
            rosterSlot: change.newPosition as any,
            lastModified: new Date()
          },
          include: {
            player: {
              include: {
                projections: {
                  where: {
                    week: targetWeek,
                    season: 2024
                  },
                  take: 1,
                  orderBy: {
                    confidence: 'desc'
                  }
                }
              }
            }
          }
        });
        updates.push(update);
      }
      
      // Create lineup history entry
      await tx.lineupHistory.create({
        data: {
          userId: session.userId,
          teamId: team.id,
          week: targetWeek,
          season: 2024,
          changes: {
            timestamp: new Date().toISOString(),
            modifications: changes.map(c => ({
              playerId: c.playerId,
              playerName: rosterPlayers.find(rp => rp.playerId === c.playerId)?.player.name,
              oldPosition: c.oldPosition,
              newPosition: c.newPosition
            }))
          }
        }
      });
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          leagueId: targetLeagueId,
          userId: session.userId,
          action: 'LINEUP_UPDATED',
          entityType: 'Team',
          entityId: team.id,
          after: {
            changes: changes.length,
            week: targetWeek,
            playersModified: changes.map(c => ({
              playerId: c.playerId,
              newPosition: c.newPosition
            }))
          }
        }
      });
      
      return updates;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Lineup updated successfully',
      data: {
        updatedPlayers: updatedRoster.length,
        week: targetWeek,
        changes: changes.length
      }
    });
    
  } catch (error) {
    console.error('Update lineup error:', error);
    return NextResponse.json(
      { error: 'Failed to update lineup' },
      { status: 500 }
    );
  }
}

// PUT /api/lineup - Auto-optimize lineup
export async function PUT(request: NextRequest) {
  try {
    const { leagueId, week, strategy = 'highest-projected' } = await request.json();
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get user's team with full roster
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId: targetLeagueId
      },
      include: {
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: {
                    week: week || 15,
                    season: 2024
                  },
                  orderBy: {
                    confidence: 'desc'
                  },
                  take: 1
                }
              }
            }
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get league settings
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { settings: true, currentWeek: true }
    });
    
    const settings = league?.settings as any;
    const rosterSlots = settings?.rosterSlots || DEFAULT_ROSTER_SLOTS;
    const targetWeek = week || league?.currentWeek || 15;
    
    // Check if lineup is locked
    if (await isWeekLocked(targetWeek)) {
      return NextResponse.json({
        error: 'Cannot optimize lineup - games have started for this week',
        code: 'LINEUP_LOCKED'
      }, { status: 400 });
    }
    
    // Get locked players
    const lockStatuses = await getPlayersLockStatus(team.roster.map(p => p.playerId), targetWeek);
    const lockedPlayerIds = lockStatuses.filter(ls => ls.isLocked).map(ls => ls.playerId);
    
    // Optimize lineup based on strategy
    const optimizedLineup = await generateOptimalLineup(team.roster, rosterSlots, targetWeek, lockedPlayerIds, strategy);
    
    // Calculate changes needed
    const changes: LineupChange[] = [];
    for (const optPlayer of optimizedLineup) {
      const currentPlayer = team.roster.find(rp => rp.playerId === optPlayer.playerId);
      if (currentPlayer && currentPlayer.position !== optPlayer.position) {
        changes.push({
          playerId: optPlayer.playerId,
          newPosition: optPlayer.position,
          oldPosition: currentPlayer.position
        });
      }
    }
    
    if (changes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Lineup is already optimal',
        data: { changes: 0, optimizedLineup }
      });
    }
    
    // Apply optimized lineup
    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        await tx.rosterPlayer.update({
          where: {
            teamId_playerId: {
              teamId: team.id,
              playerId: change.playerId
            }
          },
          data: {
            position: change.newPosition as any,
            rosterSlot: change.newPosition as any,
            lastModified: new Date()
          }
        });
      }
      
      // Create lineup history
      await tx.lineupHistory.create({
        data: {
          userId: session.userId,
          teamId: team.id,
          week: targetWeek,
          season: 2024,
          changes: {
            timestamp: new Date().toISOString(),
            type: 'OPTIMIZATION',
            strategy: strategy,
            modifications: changes.map(c => ({
              playerId: c.playerId,
              oldPosition: c.oldPosition,
              newPosition: c.newPosition
            }))
          }
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Lineup optimized successfully',
      data: {
        changes: changes.length,
        strategy,
        optimizedLineup,
        totalProjected: optimizedLineup
          .filter(p => p.position !== 'BENCH' && p.position !== 'IR')
          .reduce((sum, p) => sum + Number(p.projectedPoints || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('Optimize lineup error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize lineup' },
      { status: 500 }
    );
  }
}

// Helper Functions

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}


function validateCurrentLineup(starters: any[], requirements: any): LineupValidationResult {
  const positionCounts: { [key: string]: number } = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Count positions
  starters.forEach(player => {
    const pos = player.position;
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });
  
  // Check required positions
  Object.entries(requirements).forEach(([position, required]) => {
    if (position === 'BENCH' || position === 'IR' || position === 'TAXI') return;
    
    const actual = positionCounts[position] || 0;
    const req = Number(required);
    
    if (actual < req) {
      errors.push(`Not enough ${position} players. Required: ${req}, Current: ${actual}`);
    } else if (actual > req) {
      errors.push(`Too many ${position} players. Max: ${req}, Current: ${actual}`);
    }
  });
  
  // Check FLEX eligibility
  const flexPlayers = starters.filter(p => p.position === 'FLEX');
  for (const flexPlayer of flexPlayers) {
    if (!['RB', 'WR', 'TE'].includes(flexPlayer.player.position)) {
      errors.push(`Invalid player in FLEX position: ${flexPlayer.player.name} (${flexPlayer.player.position})`);
    }
  }
  
  // Check for injured players in starting lineup
  const injuredStarters = starters.filter(p => 
    p.player.injuryStatus && !['Healthy', 'Probable'].includes(p.player.injuryStatus)
  );
  
  if (injuredStarters.length > 0) {
    warnings.push(`Starting injured players: ${injuredStarters.map(p => `${p.player.name} (${p.player.injuryStatus})`).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    warnings
  };
}

async function validateLineupChanges(
  teamId: string, 
  changes: LineupChange[], 
  requirements: any
): Promise<LineupValidationResult> {
  // Get current roster
  const currentRoster = await prisma.rosterPlayer.findMany({
    where: { teamId },
    include: { player: true }
  });
  
  // Apply changes to get new lineup
  const newLineup = currentRoster.map(rp => {
    const change = changes.find(c => c.playerId === rp.playerId);
    return {
      ...rp,
      position: change ? change.newPosition : rp.position
    };
  });
  
  // Get just the starters for validation
  const starters = newLineup.filter(rp => 
    rp.position !== 'BENCH' && 
    rp.position !== 'IR' && 
    rp.position !== 'TAXI'
  );
  
  return validateCurrentLineup(starters, requirements);
}

async function generateOptimalLineup(
  roster: any[], 
  rosterSlots: any, 
  week: number,
  lockedPlayerIds: string[] = [],
  strategy: string = 'highest-projected'
): Promise<OptimalLineupPlayer[]> {
  const optimized: OptimalLineupPlayer[] = [];
  const used = new Set<string>();
  
  // Add locked players first
  const lockedPlayers = roster.filter(rp => lockedPlayerIds.includes(rp.playerId));
  for (const lockedPlayer of lockedPlayers) {
    optimized.push({
      playerId: lockedPlayer.playerId,
      playerName: lockedPlayer.player.name,
      position: lockedPlayer.position,
      projectedPoints: Number(lockedPlayer.player.projections[0]?.projectedPoints || 0),
      playerPosition: lockedPlayer.player.position,
      confidence: Number(lockedPlayer.player.projections[0]?.confidence || 0)
    });
    used.add(lockedPlayer.playerId);
  }
  
  // Sort available players by strategy
  const availableRoster = roster.filter(rp => !used.has(rp.playerId));
  let sortedRoster: any[];
  
  switch (strategy) {
    case 'highest-projected':
      sortedRoster = [...availableRoster].sort((a, b) => {
        const aProj = Number(a.player.projections[0]?.projectedPoints || 0);
        const bProj = Number(b.player.projections[0]?.projectedPoints || 0);
        return bProj - aProj;
      });
      break;
    case 'safest-floor':
      sortedRoster = [...availableRoster].sort((a, b) => {
        const aFloor = Number(a.player.projections[0]?.floorPoints || 0);
        const bFloor = Number(b.player.projections[0]?.floorPoints || 0);
        return bFloor - aFloor;
      });
      break;
    case 'highest-ceiling':
      sortedRoster = [...availableRoster].sort((a, b) => {
        const aCeiling = Number(a.player.projections[0]?.ceilingPoints || 0);
        const bCeiling = Number(b.player.projections[0]?.ceilingPoints || 0);
        return bCeiling - aCeiling;
      });
      break;
    default:
      sortedRoster = [...availableRoster].sort((a, b) => {
        const aProj = Number(a.player.projections[0]?.projectedPoints || 0);
        const bProj = Number(b.player.projections[0]?.projectedPoints || 0);
        return bProj - aProj;
      });
  }
  
  // Fill required positions (excluding already placed locked players)
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  
  for (const position of positions) {
    const required = rosterSlots[position] || 0;
    const alreadyFilled = optimized.filter(p => p.position === position).length;
    let filled = alreadyFilled;
    
    for (const rp of sortedRoster) {
      if (filled >= required) break;
      if (used.has(rp.playerId)) continue;
      if (rp.player.position !== position) continue;
      
      optimized.push({
        playerId: rp.playerId,
        playerName: rp.player.name,
        position: position,
        projectedPoints: Number(rp.player.projections[0]?.projectedPoints || 0),
        playerPosition: rp.player.position,
        confidence: Number(rp.player.projections[0]?.confidence || 0)
      });
      
      used.add(rp.playerId);
      filled++;
    }
  }
  
  // Fill FLEX with best available RB/WR/TE
  const flexRequired = rosterSlots.FLEX || 0;
  const flexFilled = optimized.filter(p => p.position === 'FLEX').length;
  let currentFlexFilled = flexFilled;
  
  for (const rp of sortedRoster) {
    if (currentFlexFilled >= flexRequired) break;
    if (used.has(rp.playerId)) continue;
    if (!['RB', 'WR', 'TE'].includes(rp.player.position)) continue;
    
    optimized.push({
      playerId: rp.playerId,
      playerName: rp.player.name,
      position: 'FLEX',
      projectedPoints: Number(rp.player.projections[0]?.projectedPoints || 0),
      playerPosition: rp.player.position,
      confidence: Number(rp.player.projections[0]?.confidence || 0)
    });
    
    used.add(rp.playerId);
    currentFlexFilled++;
  }
  
  // Put remaining players on bench
  for (const rp of sortedRoster) {
    if (used.has(rp.playerId)) continue;
    
    optimized.push({
      playerId: rp.playerId,
      playerName: rp.player.name,
      position: 'BENCH',
      projectedPoints: Number(rp.player.projections[0]?.projectedPoints || 0),
      playerPosition: rp.player.position,
      confidence: Number(rp.player.projections[0]?.confidence || 0)
    });
  }
  
  return optimized;
}