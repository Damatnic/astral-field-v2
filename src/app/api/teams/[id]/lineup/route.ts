import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || getCurrentWeek().toString());

    // Verify user owns this team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: user.id
      },
      include: {
        league: true
      }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Get current lineup for the week
    const rosterPlayers = await prisma.rosterPlayer.findMany({
      where: {
        teamId,
        week: week // If null, it's the current roster
      },
      include: {
        player: true
      },
      orderBy: {
        position: 'asc'
      }
    });

    // Organize by position
    const lineup = {
      QB: rosterPlayers.filter(rp => rp.rosterSlot === 'QB'),
      RB: rosterPlayers.filter(rp => rp.rosterSlot === 'RB'),
      WR: rosterPlayers.filter(rp => rp.rosterSlot === 'WR'),
      TE: rosterPlayers.filter(rp => rp.rosterSlot === 'TE'),
      FLEX: rosterPlayers.filter(rp => rp.rosterSlot === 'FLEX'),
      K: rosterPlayers.filter(rp => rp.rosterSlot === 'K'),
      DST: rosterPlayers.filter(rp => rp.rosterSlot === 'DST'),
      BENCH: rosterPlayers.filter(rp => rp.rosterSlot === 'BENCH'),
      IR: rosterPlayers.filter(rp => rp.rosterSlot === 'IR')
    };

    // Check if lineup is locked (games have started)
    const isLocked = await isLineupLocked(week);

    return NextResponse.json({
      success: true,
      lineup,
      week,
      isLocked,
      team: {
        id: team.id,
        name: team.name
      }
    });

  } catch (error) {
    console.error('Get lineup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lineup' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const { lineup, week } = await request.json();
    const targetWeek = week || getCurrentWeek();

    // Verify user owns this team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: user.id
      }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Check if lineup is locked
    const locked = await isLineupLocked(targetWeek);
    if (locked) {
      return NextResponse.json(
        { success: false, error: 'Lineup is locked - games have started' },
        { status: 400 }
      );
    }

    // Validate lineup structure
    const validation = validateLineup(lineup);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Update lineup in transaction
    const result = await prisma.$transaction(async (tx) => {
      // First, get all current roster players
      const currentRoster = await tx.rosterPlayer.findMany({
        where: { teamId }
      });

      // Create a map of player updates
      const updates: { playerId: string; position: string }[] = [];
      
      // Process each position group
      Object.entries(lineup).forEach(([position, players]) => {
        (players as any[]).forEach(playerData => {
          updates.push({
            playerId: playerData.playerId,
            position: position
          });
        });
      });

      // Update each player's position
      for (const update of updates) {
        await tx.rosterPlayer.updateMany({
          where: {
            teamId,
            playerId: update.playerId
          },
          data: {
            rosterSlot: update.position as any,
            week: targetWeek,
            isLocked: false,
            lastModified: new Date()
          }
        });
      }

      // Create lineup history record
      await tx.lineupHistory.create({
        data: {
          teamId,
          week: targetWeek,
          lineupData: lineup,
          submittedAt: new Date(),
          submittedBy: user.id
        }
      });

      return updates;
    });

    return NextResponse.json({
      success: true,
      message: 'Lineup updated successfully',
      week: targetWeek,
      updatedPlayers: result.length
    });

  } catch (error) {
    console.error('Update lineup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lineup' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const { action, week } = await request.json();
    const targetWeek = week || getCurrentWeek();

    // Verify user owns this team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: user.id
      }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    if (action === 'auto_set_optimal') {
      const optimalLineup = await generateOptimalLineup(teamId, targetWeek);
      
      // Set the optimal lineup
      const result = await prisma.$transaction(async (tx) => {
        for (const [position, players] of Object.entries(optimalLineup)) {
          for (const player of players as any[]) {
            await tx.rosterPlayer.updateMany({
              where: {
                teamId,
                playerId: player.playerId
              },
              data: {
                rosterSlot: position as any,
                week: targetWeek,
                lastModified: new Date()
              }
            });
          }
        }

        await tx.lineupHistory.create({
          data: {
            teamId,
            week: targetWeek,
            lineupData: optimalLineup,
            submittedAt: new Date(),
            submittedBy: user.id,
            isOptimal: true
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Optimal lineup set successfully',
        lineup: optimalLineup
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Lineup action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform lineup action' },
      { status: 500 }
    );
  }
}

function getCurrentWeek(): number {
  const seasonStart = new Date('2025-09-04');
  const now = new Date();
  const diff = now.getTime() - seasonStart.getTime();
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, Math.min(weeks + 1, 18));
}

async function isLineupLocked(week: number): Promise<boolean> {
  // Check if any NFL games for this week have started
  // For now, simple time-based check (lock on Thursday 8pm ET)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday
  const hour = now.getHours();
  
  // Lock from Thursday 8pm to Tuesday 6am ET
  if (dayOfWeek === 4 && hour >= 20) return true; // Thursday night
  if (dayOfWeek >= 5 || dayOfWeek <= 1) return true; // Fri-Sat-Sun-Mon
  if (dayOfWeek === 2 && hour < 6) return true; // Tuesday before 6am
  
  return false;
}

function validateLineup(lineup: any): { valid: boolean; error?: string } {
  const required = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DEF: 1
  };

  for (const [position, count] of Object.entries(required)) {
    if (!lineup[position] || lineup[position].length !== count) {
      return {
        valid: false,
        error: `Invalid ${position} count. Required: ${count}, Found: ${lineup[position]?.length || 0}`
      };
    }
  }

  // Validate FLEX position
  const flexPlayer = lineup.FLEX[0];
  if (flexPlayer && !['RB', 'WR', 'TE'].includes(flexPlayer.position)) {
    return {
      valid: false,
      error: 'FLEX position must be RB, WR, or TE'
    };
  }

  return { valid: true };
}

async function generateOptimalLineup(teamId: string, week: number): Promise<any> {
  // Get all roster players with their projections
  const rosterPlayers = await prisma.rosterPlayer.findMany({
    where: { teamId },
    include: {
      player: {
        include: {
          playerStats: {
            where: { week },
            take: 1
          }
        }
      }
    }
  });

  // Sort by projected points (descending)
  const sortedPlayers = rosterPlayers.sort((a, b) => {
    const aPoints = Number(a.player.playerStats[0]?.projectedPoints || 0);
    const bPoints = Number(b.player.playerStats[0]?.projectedPoints || 0);
    return bPoints - aPoints;
  });

  // Build optimal lineup
  const optimal: any = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    FLEX: [],
    K: [],
    DEF: [],
    BENCH: []
  };

  const used = new Set<string>();

  // Fill required positions first
  ['QB', 'K', 'DST'].forEach(pos => {
    const player = sortedPlayers.find(p => p.player.position === pos && !used.has(p.playerId));
    if (player) {
      optimal[pos].push(player);
      used.add(player.playerId);
    }
  });

  // Fill RB/WR/TE positions
  ['RB', 'RB', 'WR', 'WR', 'TE'].forEach(pos => {
    const player = sortedPlayers.find(p => p.player.position === pos && !used.has(p.playerId));
    if (player) {
      optimal[pos].push(player);
      used.add(player.playerId);
    }
  });

  // Fill FLEX with best remaining RB/WR/TE
  const flexPlayer = sortedPlayers.find(p => 
    ['RB', 'WR', 'TE'].includes(p.player.position) && !used.has(p.playerId)
  );
  if (flexPlayer) {
    optimal.FLEX.push(flexPlayer);
    used.add(flexPlayer.playerId);
  }

  // Rest go to bench
  optimal.BENCH = sortedPlayers.filter(p => !used.has(p.playerId));

  return optimal;
}