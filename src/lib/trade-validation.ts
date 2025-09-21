import { prisma } from '@/lib/db';
import { Position, RosterSlot } from '@prisma/client';

export interface TradeValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface RosterImpactAnalysis {
  teamId: string;
  teamName: string;
  currentRosterSize: number;
  newRosterSize: number;
  playersAdded: number;
  playersRemoved: number;
  positionImpacts: PositionImpact[];
  canFieldValidLineup: boolean;
  warnings: string[];
}

export interface PositionImpact {
  position: Position;
  current: number;
  afterTrade: number;
  netChange: number;
  isDepthConcern: boolean;
}

/**
 * Validates a complete trade proposal including roster limits, player ownership, and league rules
 */
export async function validateCompleteTrade(
  tradeItems: any[],
  leagueId: string,
  proposerId: string
): Promise<TradeValidationResult> {
  try {
    // 1. Validate league exists and is active
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        settings: true
      }
    });

    if (!league || !league.isActive) {
      return { isValid: false, error: 'League not found or inactive' };
    }

    // 2. Check trade deadline
    if (league.settings?.tradeDeadline && new Date() > league.settings.tradeDeadline) {
      return { isValid: false, error: 'Trade deadline has passed' };
    }

    // 3. Validate all teams exist in league
    const teamIds = [...new Set([
      ...tradeItems.map(item => item.fromTeamId),
      ...tradeItems.map(item => item.toTeamId)
    ])];

    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        leagueId
      }
    });

    if (teams.length !== teamIds.length) {
      return { isValid: false, error: 'One or more teams not found in league' };
    }

    // 4. Validate player ownership
    const ownershipValidation = await validatePlayerOwnership(tradeItems);
    if (!ownershipValidation.isValid) {
      return ownershipValidation;
    }

    // 5. Validate roster limits after trade
    const rosterValidation = await validateRosterLimits(tradeItems, leagueId);
    if (!rosterValidation.isValid) {
      return rosterValidation;
    }

    // 6. Validate position requirements
    const positionValidation = await validatePositionRequirements(tradeItems, leagueId);
    if (!positionValidation.isValid) {
      return positionValidation;
    }

    // 7. Check for circular trades or invalid patterns
    const structuralValidation = validateTradeStructure(tradeItems);
    if (!structuralValidation.isValid) {
      return structuralValidation;
    }

    return { isValid: true };

  } catch (error) {
    console.error('Trade validation error:', error);
    return { isValid: false, error: 'Validation error occurred' };
  }
}

/**
 * Validates that all players in the trade are owned by the correct teams
 */
export async function validatePlayerOwnership(tradeItems: any[]): Promise<TradeValidationResult> {
  try {
    const playerItems = tradeItems.filter(item => item.itemType === 'PLAYER' && item.playerId);
    
    for (const item of playerItems) {
      const rosterPlayer = await prisma.rosterPlayer.findFirst({
        where: {
          teamId: item.fromTeamId,
          playerId: item.playerId
        }
      });

      if (!rosterPlayer) {
        const player = await prisma.player.findUnique({
          where: { id: item.playerId },
          select: { name: true }
        });
        
        return {
          isValid: false,
          error: `Player ${player?.name || 'Unknown'} is not owned by the trading team`
        };
      }

      // Check if player is locked (e.g., currently playing)
      if (rosterPlayer.isLocked) {
        const player = await prisma.player.findUnique({
          where: { id: item.playerId },
          select: { name: true }
        });
        
        return {
          isValid: false,
          error: `Player ${player?.name || 'Unknown'} is currently locked and cannot be traded`
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Player ownership validation failed' };
  }
}

/**
 * Validates that all teams will have valid roster sizes after the trade
 */
export async function validateRosterLimits(tradeItems: any[], leagueId: string): Promise<TradeValidationResult> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { leagueId },
      select: { rosterSlots: true }
    });

    if (!settings) {
      return { isValid: false, error: 'League settings not found' };
    }

    const rosterSlots = settings.rosterSlots as any;
    const maxRosterSize = Object.values(rosterSlots).reduce((sum: number, count: any) => sum + count, 0);
    const minStarterSlots = (rosterSlots.QB || 0) + (rosterSlots.RB || 0) + 
                           (rosterSlots.WR || 0) + (rosterSlots.TE || 0) + 
                           (rosterSlots.FLEX || 0) + (rosterSlots.K || 0) + 
                           (rosterSlots.DST || 0);

    // Group items by team
    const teamChanges = new Map<string, { adding: string[], removing: string[] }>();

    for (const item of tradeItems) {
      if (item.itemType !== 'PLAYER' || !item.playerId) continue;

      if (!teamChanges.has(item.fromTeamId)) {
        teamChanges.set(item.fromTeamId, { adding: [], removing: [] });
      }
      if (!teamChanges.has(item.toTeamId)) {
        teamChanges.set(item.toTeamId, { adding: [], removing: [] });
      }

      teamChanges.get(item.fromTeamId)!.removing.push(item.playerId);
      teamChanges.get(item.toTeamId)!.adding.push(item.playerId);
    }

    // Validate each team's roster size after trade
    for (const [teamId, changes] of teamChanges) {
      const currentRosterCount = await prisma.rosterPlayer.count({
        where: { teamId }
      });

      const netChange = changes.adding.length - changes.removing.length;
      const newRosterSize = currentRosterCount + netChange;

      if (newRosterSize > maxRosterSize) {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { name: true }
        });
        return { 
          isValid: false, 
          error: `Trade would exceed roster limit for ${team?.name}. Max: ${maxRosterSize}, After trade: ${newRosterSize}` 
        };
      }

      if (newRosterSize < minStarterSlots) {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { name: true }
        });
        return { 
          isValid: false, 
          error: `Trade would leave ${team?.name} with insufficient players to field a starting lineup` 
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Roster limit validation failed' };
  }
}

/**
 * Validates that teams can still field valid lineups after the trade
 */
export async function validatePositionRequirements(tradeItems: any[], leagueId: string): Promise<TradeValidationResult> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { leagueId },
      select: { rosterSlots: true }
    });

    if (!settings) {
      return { isValid: false, error: 'League settings not found' };
    }

    const rosterSlots = settings.rosterSlots as any;
    const warnings: string[] = [];

    // Group items by team and analyze position impacts
    const teamChanges = new Map<string, { adding: any[], removing: any[] }>();

    // Get player details for position analysis
    const playerIds = tradeItems
      .filter(item => item.itemType === 'PLAYER' && item.playerId)
      .map(item => item.playerId);

    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, position: true, name: true }
    });

    for (const item of tradeItems) {
      if (item.itemType !== 'PLAYER' || !item.playerId) continue;

      const player = players.find(p => p.id === item.playerId);
      if (!player) continue;

      if (!teamChanges.has(item.fromTeamId)) {
        teamChanges.set(item.fromTeamId, { adding: [], removing: [] });
      }
      if (!teamChanges.has(item.toTeamId)) {
        teamChanges.set(item.toTeamId, { adding: [], removing: [] });
      }

      teamChanges.get(item.fromTeamId)!.removing.push(player);
      teamChanges.get(item.toTeamId)!.adding.push(player);
    }

    // Check each team's position depth after trade
    for (const [teamId, changes] of teamChanges) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { name: true }
      });

      // Get current roster positions
      const currentRoster = await prisma.rosterPlayer.findMany({
        where: { teamId },
        include: {
          player: {
            select: { position: true, name: true }
          }
        }
      });

      // Calculate position counts after trade
      const positionCounts = new Map<Position, number>();
      
      // Start with current roster
      for (const rosterPlayer of currentRoster) {
        const pos = rosterPlayer.player.position;
        positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
      }

      // Remove traded away players
      for (const player of changes.removing) {
        const current = positionCounts.get(player.position) || 0;
        positionCounts.set(player.position, Math.max(0, current - 1));
      }

      // Add incoming players
      for (const player of changes.adding) {
        positionCounts.set(player.position, (positionCounts.get(player.position) || 0) + 1);
      }

      // Check minimum requirements for starting positions
      const requiredPositions = [
        { position: 'QB' as Position, required: rosterSlots.QB || 0 },
        { position: 'RB' as Position, required: rosterSlots.RB || 0 },
        { position: 'WR' as Position, required: rosterSlots.WR || 0 },
        { position: 'TE' as Position, required: rosterSlots.TE || 0 },
        { position: 'K' as Position, required: rosterSlots.K || 0 },
        { position: 'DST' as Position, required: rosterSlots.DST || 0 }
      ];

      for (const { position, required } of requiredPositions) {
        const available = positionCounts.get(position) || 0;
        
        if (available < required) {
          return {
            isValid: false,
            error: `${team?.name} would not have enough ${position} players to field a starting lineup (has ${available}, needs ${required})`
          };
        }

        // Warn about low depth
        if (available === required && required > 0) {
          warnings.push(`${team?.name} will have no ${position} depth after this trade`);
        }
      }
    }

    return { 
      isValid: true, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };

  } catch (error) {
    return { isValid: false, error: 'Position requirements validation failed' };
  }
}

/**
 * Validates the structural integrity of the trade (no circular issues, balanced items)
 */
export function validateTradeStructure(tradeItems: any[]): TradeValidationResult {
  try {
    if (!tradeItems || tradeItems.length === 0) {
      return { isValid: false, error: 'No trade items provided' };
    }

    // Ensure trade is between at least 2 teams
    const teamIds = new Set([
      ...tradeItems.map(item => item.fromTeamId),
      ...tradeItems.map(item => item.toTeamId)
    ]);

    if (teamIds.size < 2) {
      return { isValid: false, error: 'Trade must involve at least 2 teams' };
    }

    // Validate each team is both giving and receiving something
    const givingTeams = new Set(tradeItems.map(item => item.fromTeamId));
    const receivingTeams = new Set(tradeItems.map(item => item.toTeamId));

    for (const teamId of givingTeams) {
      if (!receivingTeams.has(teamId)) {
        return { isValid: false, error: 'All teams must both give and receive assets in the trade' };
      }
    }

    // Check for duplicate items
    const playerIds = tradeItems
      .filter(item => item.itemType === 'PLAYER')
      .map(item => item.playerId);
    
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      return { isValid: false, error: 'Cannot trade the same player multiple times' };
    }

    // Validate item types
    const validItemTypes = ['PLAYER', 'DRAFT_PICK', 'FAAB_MONEY'];
    for (const item of tradeItems) {
      if (!validItemTypes.includes(item.itemType)) {
        return { isValid: false, error: `Invalid item type: ${item.itemType}` };
      }

      // Validate required fields based on item type
      if (item.itemType === 'PLAYER' && !item.playerId) {
        return { isValid: false, error: 'Player trades must include playerId' };
      }

      if (item.itemType === 'FAAB_MONEY' && (!item.metadata?.faabAmount || item.metadata.faabAmount <= 0)) {
        return { isValid: false, error: 'FAAB trades must include a positive amount' };
      }

      if (item.itemType === 'DRAFT_PICK' && !item.metadata?.draftPick) {
        return { isValid: false, error: 'Draft pick trades must include pick details' };
      }
    }

    return { isValid: true };

  } catch (error) {
    return { isValid: false, error: 'Trade structure validation failed' };
  }
}

/**
 * Analyzes the roster impact of a trade for all involved teams
 */
export async function analyzeRosterImpact(tradeItems: any[], leagueId: string): Promise<RosterImpactAnalysis[]> {
  try {
    const teamIds = [...new Set([
      ...tradeItems.map(item => item.fromTeamId),
      ...tradeItems.map(item => item.toTeamId)
    ])];

    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        leagueId
      },
      include: {
        roster: {
          include: {
            player: true
          }
        }
      }
    });

    const playerIds = tradeItems
      .filter(item => item.itemType === 'PLAYER' && item.playerId)
      .map(item => item.playerId);

    const tradedPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, position: true, name: true }
    });

    const results: RosterImpactAnalysis[] = [];

    for (const team of teams) {
      const givingItems = tradeItems.filter(item => 
        item.fromTeamId === team.id && item.itemType === 'PLAYER'
      );
      const receivingItems = tradeItems.filter(item => 
        item.toTeamId === team.id && item.itemType === 'PLAYER'
      );

      const playersAdded = receivingItems.length;
      const playersRemoved = givingItems.length;
      const currentRosterSize = team.roster.length;
      const newRosterSize = currentRosterSize + playersAdded - playersRemoved;

      // Calculate position impacts
      const positionCounts = new Map<Position, number>();
      
      // Current roster positions
      for (const rosterPlayer of team.roster) {
        const pos = rosterPlayer.player.position;
        positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
      }

      const positionImpacts: PositionImpact[] = [];
      const allPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as Position[];

      for (const position of allPositions) {
        const current = positionCounts.get(position) || 0;
        
        // Calculate changes
        const removing = givingItems
          .map(item => tradedPlayers.find(p => p.id === item.playerId))
          .filter(p => p?.position === position).length;
        
        const adding = receivingItems
          .map(item => tradedPlayers.find(p => p.id === item.playerId))
          .filter(p => p?.position === position).length;

        const afterTrade = current - removing + adding;
        const netChange = adding - removing;

        positionImpacts.push({
          position,
          current,
          afterTrade,
          netChange,
          isDepthConcern: afterTrade <= 1 && ['QB', 'K', 'DST'].includes(position)
        });
      }

      // Check if can field valid lineup
      const canFieldValidLineup = positionImpacts.every(impact => {
        const minimumRequired = impact.position === 'QB' ? 1 : 
                               impact.position === 'K' ? 1 :
                               impact.position === 'DST' ? 1 : 0;
        return impact.afterTrade >= minimumRequired;
      });

      // Generate warnings
      const warnings: string[] = [];
      
      for (const impact of positionImpacts) {
        if (impact.isDepthConcern) {
          warnings.push(`Low ${impact.position} depth after trade (${impact.afterTrade} players)`);
        }
      }

      if (newRosterSize < 15) {
        warnings.push('Roster size will be below recommended minimum (15 players)');
      }

      results.push({
        teamId: team.id,
        teamName: team.name,
        currentRosterSize,
        newRosterSize,
        playersAdded,
        playersRemoved,
        positionImpacts,
        canFieldValidLineup,
        warnings
      });
    }

    return results;

  } catch (error) {
    console.error('Roster impact analysis error:', error);
    return [];
  }
}

/**
 * Calculates a trade fairness score based on player values and market analysis
 */
export async function calculateTradeFairness(tradeItems: any[]): Promise<{
  fairnessScore: number;
  teamValues: { teamId: string; totalValue: number }[];
  analysis: string;
}> {
  try {
    // This is a simplified fairness calculation
    // In a production app, this would integrate with player rankings, ADP, expert consensus, etc.
    
    const teamValues = new Map<string, number>();
    
    const playerIds = tradeItems
      .filter(item => item.itemType === 'PLAYER' && item.playerId)
      .map(item => item.playerId);

    // Get basic player data for value estimation
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      include: {
        playerStats: {
          where: {
            season: new Date().getFullYear()
          },
          orderBy: {
            week: 'desc'
          },
          take: 5
        }
      }
    });

    for (const item of tradeItems) {
      let itemValue = 0;

      if (item.itemType === 'PLAYER') {
        const player = players.find(p => p.id === item.playerId);
        if (player) {
          // Simple value calculation based on recent performance
          const recentStats = player.stats.slice(0, 3);
          const avgPoints = recentStats.length > 0 
            ? recentStats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / recentStats.length
            : 10; // Default value

          // Position scarcity multipliers
          const scarcityMultiplier = {
            'QB': 1.0,
            'RB': 1.4,
            'WR': 1.1,
            'TE': 1.3,
            'K': 0.7,
            'DST': 0.8,
            'P': 0.5,
            'LB': 1.2,
            'DB': 1.1,
            'DL': 1.1,
            'CB': 1.1,
            'S': 1.1
          }[player.position] || 1.0;

          itemValue = avgPoints * scarcityMultiplier;
        }
      } else if (item.itemType === 'FAAB_MONEY') {
        itemValue = (item.metadata?.faabAmount || 0) * 0.1; // FAAB has lower value
      } else if (item.itemType === 'DRAFT_PICK') {
        const round = item.metadata?.draftPick?.round || 1;
        itemValue = Math.max(0, 20 - (round * 3)); // Draft picks lose value by round
      }

      // Add value to receiving team
      const currentValue = teamValues.get(item.toTeamId) || 0;
      teamValues.set(item.toTeamId, currentValue + itemValue);
    }

    const teamValueArray = Array.from(teamValues.entries()).map(([teamId, totalValue]) => ({
      teamId,
      totalValue
    }));

    // Calculate fairness score
    const values = teamValueArray.map(tv => tv.totalValue);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const fairnessScore = minValue > 0 ? Math.min(100, (minValue / maxValue) * 100) : 50;

    let analysis = '';
    if (fairnessScore >= 85) {
      analysis = 'Very fair trade with balanced value exchange';
    } else if (fairnessScore >= 70) {
      analysis = 'Generally fair trade with acceptable value difference';
    } else if (fairnessScore >= 50) {
      analysis = 'Significant value imbalance - proceed with caution';
    } else {
      analysis = 'Major value discrepancy detected';
    }

    return {
      fairnessScore,
      teamValues: teamValueArray,
      analysis
    };

  } catch (error) {
    console.error('Trade fairness calculation error:', error);
    return {
      fairnessScore: 50,
      teamValues: [],
      analysis: 'Unable to calculate trade fairness'
    };
  }
}