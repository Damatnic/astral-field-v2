import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getPlayersLockStatus } from '@/lib/gameTimeUtils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  lockStatus: {
    hasLockedPlayers: boolean;
    lockedPlayers: Array<{
      playerId: string;
      playerName: string;
      position: string;
      timeUntilLock?: number;
    }>;
  };
  positionBreakdown: {
    [position: string]: {
      required: number;
      current: number;
      status: 'complete' | 'incomplete' | 'overfilled';
    };
  };
  projectedScore: number;
  benchStrength: number;
}

// POST /api/lineup/validate - Validate a lineup configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineup, leagueId, week, validateLocks = true } = body;
    
    if (!lineup || !lineup.starters || !Array.isArray(lineup.starters)) {
      return NextResponse.json(
        { error: 'Valid lineup.starters array is required' },
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
    
    // Get league settings
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { 
        settings: true,
        currentWeek: true
      }
    });
    
    const settings = league?.settings as any;
    const rosterRequirements = settings?.rosterSlots || DEFAULT_ROSTER_SLOTS;
    const targetWeek = week || league?.currentWeek || 15;
    
    // Get detailed player information
    const playerIds = [
      ...lineup.starters.map((p: any) => p.playerId),
      ...(lineup.bench || []).map((p: any) => p.playerId)
    ];
    
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds }
      },
      include: {
        projections: {
          where: {
            week: targetWeek,
            season: 2024
          },
          orderBy: {
            confidence: 'desc'
          },
          take: 1
        },
        playerStats: {
          where: {
            week: targetWeek,
            season: 2024
          },
          take: 1
        }
      }
    });
    
    // Create player lookup map
    const playerMap = new Map(players.map(p => [p.id, p]));
    
    // Validate lineup
    const validation = await validateLineupDetailed(
      lineup.starters,
      lineup.bench || [],
      rosterRequirements,
      playerMap,
      targetWeek,
      validateLocks
    );
    
    return NextResponse.json({
      success: true,
      data: validation
    });
    
  } catch (error) {
    console.error('Validate lineup error:', error);
    return NextResponse.json(
      { error: 'Failed to validate lineup' },
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

async function validateLineupDetailed(
  starters: any[],
  bench: any[],
  requirements: any,
  playerMap: Map<string, any>,
  week: number,
  validateLocks: boolean
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Count positions
  const positionCounts: { [key: string]: number } = {};
  const positionBreakdown: { [position: string]: any } = {};
  
  // Initialize position breakdown
  Object.entries(requirements).forEach(([position, required]) => {
    if (position !== 'BENCH' && position !== 'IR' && position !== 'TAXI') {
      positionBreakdown[position] = {
        required: Number(required),
        current: 0,
        status: 'incomplete'
      };
    }
  });
  
  // Count current starters
  for (const starter of starters) {
    const position = starter.position || starter.rosterSlot;
    positionCounts[position] = (positionCounts[position] || 0) + 1;
    
    if (positionBreakdown[position]) {
      positionBreakdown[position].current++;
    }
  }
  
  // Update position status
  Object.keys(positionBreakdown).forEach(position => {
    const breakdown = positionBreakdown[position];
    if (breakdown.current === breakdown.required) {
      breakdown.status = 'complete';
    } else if (breakdown.current > breakdown.required) {
      breakdown.status = 'overfilled';
    } else {
      breakdown.status = 'incomplete';
    }
  });
  
  // Validate position requirements
  Object.entries(requirements).forEach(([position, required]) => {
    if (position === 'BENCH' || position === 'IR' || position === 'TAXI') return;
    
    const actual = positionCounts[position] || 0;
    const req = Number(required);
    
    if (actual < req) {
      const needed = req - actual;
      errors.push(`Missing ${needed} ${position} player${needed > 1 ? 's' : ''}. Required: ${req}, Current: ${actual}`);
    } else if (actual > req) {
      const excess = actual - req;
      errors.push(`Too many ${position} players. Max: ${req}, Current: ${actual} (+${excess} over limit)`);
    }
  });
  
  // Validate FLEX eligibility
  const flexPlayers = starters.filter(p => p.position === 'FLEX' || p.rosterSlot === 'FLEX');
  for (const flexPlayer of flexPlayers) {
    const player = playerMap.get(flexPlayer.playerId);
    if (player && !['RB', 'WR', 'TE'].includes(player.position)) {
      errors.push(`Invalid player in FLEX: ${player.name} (${player.position}). Only RB, WR, or TE allowed.`);
    }
  }
  
  // Validate SUPER_FLEX if it exists
  const superFlexPlayers = starters.filter(p => p.position === 'SUPER_FLEX' || p.rosterSlot === 'SUPER_FLEX');
  for (const superFlexPlayer of superFlexPlayers) {
    const player = playerMap.get(superFlexPlayer.playerId);
    if (player && !['QB', 'RB', 'WR', 'TE'].includes(player.position)) {
      errors.push(`Invalid player in SUPER_FLEX: ${player.name} (${player.position}). Only QB, RB, WR, or TE allowed.`);
    }
  }
  
  // Check for duplicate players
  const allPlayerIds = [...starters, ...bench].map(p => p.playerId);
  const duplicates = allPlayerIds.filter((id, index) => allPlayerIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate players found in lineup: ${duplicates.join(', ')}`);
  }
  
  // Check for injured players in starting lineup
  const injuredStarters = starters
    .map(s => playerMap.get(s.playerId))
    .filter(p => p && p.injuryStatus && !['Healthy', 'Probable'].includes(p.injuryStatus));
  
  if (injuredStarters.length > 0) {
    const injuredNames = injuredStarters.map(p => `${p.name} (${p.injuryStatus})`);
    warnings.push(`Starting injured players: ${injuredNames.join(', ')}`);
  }
  
  // Check for bye week players
  const byeWeekStarters = starters
    .map(s => playerMap.get(s.playerId))
    .filter(p => p && p.byeWeek === week);
  
  if (byeWeekStarters.length > 0) {
    const byeNames = byeWeekStarters.map(p => p.name);
    warnings.push(`Starting players on bye week: ${byeNames.join(', ')}`);
  }
  
  // Calculate projected score
  const projectedScore = starters.reduce((sum, starter) => {
    const player = playerMap.get(starter.playerId);
    const projection = player?.projections[0];
    return sum + Number(projection?.projectedPoints || 0);
  }, 0);
  
  // Calculate bench strength (average projected points)
  const benchProjections = bench.map(b => {
    const player = playerMap.get(b.playerId);
    const projection = player?.projections[0];
    return Number(projection?.projectedPoints || 0);
  });
  const benchStrength = benchProjections.length > 0 
    ? benchProjections.reduce((sum, proj) => sum + proj, 0) / benchProjections.length 
    : 0;
  
  // Check lock status if requested
  let lockStatus = {
    hasLockedPlayers: false,
    lockedPlayers: [] as any[]
  };
  
  if (validateLocks) {
    const starterIds = starters.map(s => s.playerId);
    const lockStatuses = await getPlayersLockStatus(starterIds, week);
    
    const lockedPlayers = lockStatuses.filter(ls => ls.isLocked);
    lockStatus = {
      hasLockedPlayers: lockedPlayers.length > 0,
      lockedPlayers: lockedPlayers.map(lp => ({
        playerId: lp.playerId,
        playerName: lp.playerName,
        position: starters.find(s => s.playerId === lp.playerId)?.position || 'UNKNOWN',
        timeUntilLock: lp.timeUntilLock
      }))
    };
    
    if (lockStatus.hasLockedPlayers) {
      warnings.push(`${lockedPlayers.length} player(s) in starting lineup are locked`);
    }
  }
  
  // Generate suggestions
  if (benchStrength > 5) {
    suggestions.push('Consider reviewing your starting lineup - you have strong bench players available');
  }
  
  if (projectedScore > 0 && projectedScore < 80) {
    suggestions.push('Low projected score - consider optimizing your lineup');
  }
  
  if (injuredStarters.length > 0) {
    suggestions.push('Replace injured players with healthy alternatives from your bench');
  }
  
  if (byeWeekStarters.length > 0) {
    suggestions.push('Replace players on bye week with active players');
  }
  
  // Check if startable players are on bench
  const benchStarters = bench
    .map(b => playerMap.get(b.playerId))
    .filter(p => p && p.projections[0] && Number(p.projections[0].projectedPoints) > 8);
  
  if (benchStarters.length > 0) {
    suggestions.push(`High-scoring players on bench: ${benchStarters.map(p => p.name).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    lockStatus,
    positionBreakdown,
    projectedScore: Math.round(projectedScore * 10) / 10,
    benchStrength: Math.round(benchStrength * 10) / 10
  };
}