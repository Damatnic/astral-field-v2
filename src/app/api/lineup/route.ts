import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    const rosterRequirements = settings?.rosterSlots || {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      DST: 1,
      K: 1,
      BENCH: 6
    };
    
    // Organize lineup by position
    const lineup = {
      starters: team.roster.filter(p => p.position !== 'BENCH' && p.position !== 'IR'),
      bench: team.roster.filter(p => p.position === 'BENCH'),
      injuredReserve: team.roster.filter(p => p.position === 'IR'),
      requirements: rosterRequirements,
      teamId: team.id,
      teamName: team.name
    };
    
    // Calculate total projected points
    const totalProjected = lineup.starters.reduce((sum, rp) => {
      const projection = rp.player.projections[0];
      return sum + (projection ? Number(projection.projectedPoints) : 0);
    }, 0);
    
    // Calculate total scored points
    const totalScored = lineup.starters.reduce((sum, rp) => {
      const stats = rp.player.playerStats[0];
      return sum + (stats ? Number(stats.fantasyPoints) : 0);
    }, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        ...lineup,
        totalProjected: Math.round(totalProjected * 10) / 10,
        totalScored: Math.round(totalScored * 10) / 10,
        currentWeek: league?.currentWeek || 15
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
    
    // Check if any games have started (lineup lock)
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { currentWeek: true }
    });
    
    const targetWeek = week || league?.currentWeek || 15;
    
    // Check for locked players (games started)
    const lockedPlayers = await checkLockedPlayers(playerIds, targetWeek);
    if (lockedPlayers.length > 0) {
      return NextResponse.json({
        error: 'Cannot modify lineup - games have started',
        lockedPlayers: lockedPlayers.map(p => p.name)
      }, { status: 400 });
    }
    
    // Validate lineup requirements
    const validation = await validateLineupChanges(team.id, changes, targetLeek);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
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
            position: change.newPosition,
            rosterSlot: change.newPosition, // Update the slot as well
            lastModified: new Date()
          },
          include: {
            player: true
          }
        });
        updates.push(update);
      }
      
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
            week: targetWeek
          }
        }
      });
      
      return updates;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Lineup updated successfully',
      data: updatedRoster
    });
    
  } catch (error) {
    console.error('Update lineup error:', error);
    return NextResponse.json(
      { error: 'Failed to update lineup' },
      { status: 500 }
    );
  }
}

// POST /api/lineup/optimize - Auto-optimize lineup
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
      select: { settings: true }
    });
    
    const settings = league?.settings as any;
    const rosterSlots = settings?.rosterSlots || {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      DST: 1,
      K: 1,
      BENCH: 6
    };
    
    // Optimize lineup based on strategy
    const optimizedLineup = optimizeLineup(team.roster, rosterSlots, strategy);
    
    // Apply optimized lineup
    const changes = optimizedLineup.map(ol => ({
      playerId: ol.playerId,
      newPosition: ol.position
    }));
    
    // Update in database
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
            position: change.newPosition,
            rosterSlot: change.newPosition,
            lastModified: new Date()
          }
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Lineup optimized successfully',
      data: optimizedLineup
    });
    
  } catch (error) {
    console.error('Optimize lineup error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize lineup' },
      { status: 500 }
    );
  }
}

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}

async function checkLockedPlayers(playerIds: string[], week: number) {
  // In a real implementation, this would check actual NFL game times
  // For now, we'll assume no players are locked
  return [];
}

async function validateLineupChanges(teamId: string, changes: any[], targetLeagueId: string) {
  // Get league settings
  const league = await prisma.league.findUnique({
    where: { id: targetLeagueId },
    select: { settings: true }
  });
  
  const settings = league?.settings as any;
  const rosterSlots = settings?.rosterSlots || {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    DST: 1,
    K: 1,
    BENCH: 6
  };
  
  // Count positions after changes
  const positionCounts: { [key: string]: number } = {};
  
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
  
  // Count each position
  newLineup.forEach(rp => {
    const pos = rp.position;
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });
  
  // Validate requirements
  for (const [position, required] of Object.entries(rosterSlots)) {
    if (position === 'BENCH' || position === 'IR') continue;
    
    const actual = positionCounts[position] || 0;
    if (actual > required) {
      return {
        isValid: false,
        error: `Too many players in ${position} position. Max: ${required}, Actual: ${actual}`
      };
    }
  }
  
  // Validate FLEX position
  if (rosterSlots.FLEX) {
    const flexCount = positionCounts['FLEX'] || 0;
    const flexPlayers = newLineup.filter(rp => 
      rp.position === 'FLEX' && 
      ['RB', 'WR', 'TE'].includes(rp.player.position)
    );
    
    if (flexPlayers.length !== flexCount) {
      return {
        isValid: false,
        error: 'Invalid player in FLEX position. Only RB, WR, or TE allowed.'
      };
    }
  }
  
  return { isValid: true };
}

function optimizeLineup(roster: any[], rosterSlots: any, strategy: string) {
  const optimized = [];
  const used = new Set<string>();
  
  // Sort players by projected points
  const sortedRoster = [...roster].sort((a, b) => {
    const aProj = a.player.projections[0]?.projectedPoints || 0;
    const bProj = b.player.projections[0]?.projectedPoints || 0;
    return Number(bProj) - Number(aProj);
  });
  
  // Fill required positions first
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  
  for (const position of positions) {
    const required = rosterSlots[position] || 0;
    let filled = 0;
    
    for (const rp of sortedRoster) {
      if (filled >= required) break;
      if (used.has(rp.playerId)) continue;
      if (rp.player.position !== position) continue;
      
      optimized.push({
        playerId: rp.playerId,
        playerName: rp.player.name,
        position: position,
        projectedPoints: rp.player.projections[0]?.projectedPoints || 0
      });
      
      used.add(rp.playerId);
      filled++;
    }
  }
  
  // Fill FLEX with best available RB/WR/TE
  const flexRequired = rosterSlots.FLEX || 0;
  let flexFilled = 0;
  
  for (const rp of sortedRoster) {
    if (flexFilled >= flexRequired) break;
    if (used.has(rp.playerId)) continue;
    if (!['RB', 'WR', 'TE'].includes(rp.player.position)) continue;
    
    optimized.push({
      playerId: rp.playerId,
      playerName: rp.player.name,
      position: 'FLEX',
      projectedPoints: rp.player.projections[0]?.projectedPoints || 0
    });
    
    used.add(rp.playerId);
    flexFilled++;
  }
  
  // Put remaining players on bench
  for (const rp of sortedRoster) {
    if (used.has(rp.playerId)) continue;
    
    optimized.push({
      playerId: rp.playerId,
      playerName: rp.player.name,
      position: 'BENCH',
      projectedPoints: rp.player.projections[0]?.projectedPoints || 0
    });
  }
  
  return optimized;
}