/**
 * Draft Auto-pick Algorithm
 * Intelligent player selection for auto-drafting teams
 */

import { prisma } from '@/lib/prisma';

interface PlayerValue {
  id: string;
  name: string;
  position: string;
  team: string;
  byeWeek: number;
  projectedPoints: number;
  adp: number; // Average Draft Position
  tier: number;
  positionRank: number;
  overallRank: number;
  valueScore: number; // Calculated value based on multiple factors
}

interface TeamNeeds {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K: number;
  DEF: number;
  FLEX: number;
  BENCH: number;
}

interface DraftContext {
  round: number;
  pick: number;
  totalRounds: number;
  teamCount: number;
  scoringType: 'STANDARD' | 'PPR' | 'HALF_PPR';
  rosterSettings: TeamNeeds;
}

export class AutoPickAlgorithm {
  private readonly POSITION_WEIGHTS = {
    QB: 0.9,
    RB: 1.0,
    WR: 0.95,
    TE: 0.85,
    K: 0.5,
    DEF: 0.6
  };

  private readonly SCARCITY_THRESHOLDS = {
    QB: 10,
    RB: 24,
    WR: 30,
    TE: 8,
    K: 5,
    DEF: 5
  };

  private readonly VALUE_BASED_DRAFTING_BASELINES = {
    QB: 12,
    RB: 36,
    WR: 36,
    TE: 12,
    K: 12,
    DEF: 12
  };

  /**
   * Main auto-pick function
   */
  async autoPick(
    draftId: string,
    teamId: string,
    context: DraftContext
  ): Promise<string> {
    try {
      // Get available players
      const availablePlayers = await this.getAvailablePlayers(draftId);
      
      // Get current team roster
      const currentRoster = await this.getCurrentRoster(draftId, teamId);
      
      // Calculate team needs
      const teamNeeds = this.calculateTeamNeeds(currentRoster, context.rosterSettings);
      
      // Get player valuations
      const valuedPlayers = this.calculatePlayerValues(
        availablePlayers,
        teamNeeds,
        context
      );
      
      // Apply draft strategy
      const bestPick = this.selectBestPlayer(
        valuedPlayers,
        teamNeeds,
        context,
        currentRoster
      );
      
      // Make the pick
      await this.makePick(draftId, teamId, bestPick.id, context.round, context.pick);
      
      return bestPick.id;
    } catch (error) {
      console.error('Auto-pick error:', error);
      // Fallback to best available player by projected points
      return this.fallbackPick(draftId);
    }
  }

  /**
   * Get all available players in the draft
   */
  private async getAvailablePlayers(draftId: string): Promise<PlayerValue[]> {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        picks: true,
        league: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    const pickedPlayerIds = draft.picks.map(pick => pick.playerId);

    const availablePlayers = await prisma.player.findMany({
      where: {
        id: { notIn: pickedPlayerIds },
        isActive: true,
        position: { in: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] }
      },
      include: {
        stats: {
          where: {
            season: new Date().getFullYear(),
            week: 0 // Season projections
          }
        }
      }
    });

    return availablePlayers.map(player => ({
      id: player.id,
      name: player.name,
      position: player.position,
      team: player.team || 'FA',
      byeWeek: player.byeWeek || 0,
      projectedPoints: player.projectedPoints || 0,
      adp: player.adp || 300,
      tier: this.calculateTier(player.position, player.positionRank || 99),
      positionRank: player.positionRank || 99,
      overallRank: player.overallRank || 300,
      valueScore: 0
    }));
  }

  /**
   * Get current roster for a team
   */
  private async getCurrentRoster(draftId: string, teamId: string): Promise<any[]> {
    const picks = await prisma.draftPick.findMany({
      where: {
        draftId,
        teamId
      },
      include: {
        player: true
      }
    });

    return picks.map(pick => pick.player);
  }

  /**
   * Calculate team needs based on roster requirements
   */
  private calculateTeamNeeds(
    currentRoster: any[],
    rosterSettings: TeamNeeds
  ): TeamNeeds {
    const needs = { ...rosterSettings };
    
    currentRoster.forEach(player => {
      const position = player.position;
      if (needs[position] > 0) {
        needs[position]--;
      } else if (needs.BENCH > 0) {
        needs.BENCH--;
      }
    });

    return needs;
  }

  /**
   * Calculate value scores for available players
   */
  private calculatePlayerValues(
    players: PlayerValue[],
    teamNeeds: TeamNeeds,
    context: DraftContext
  ): PlayerValue[] {
    const positionScarcity = this.calculatePositionScarcity(players);
    
    return players.map(player => {
      let valueScore = 0;

      // Base value from projected points
      valueScore += player.projectedPoints * 2;

      // ADP value (how much of a "steal" is this pick?)
      const adpDiff = player.adp - (context.round * context.teamCount + context.pick);
      if (adpDiff > 0) {
        valueScore += adpDiff * 0.5; // Bonus for players falling below ADP
      }

      // Position scarcity bonus
      valueScore += positionScarcity[player.position] * 10;

      // Team need multiplier
      const needLevel = teamNeeds[player.position] || 0;
      if (needLevel > 0) {
        valueScore *= (1 + needLevel * 0.3);
      }

      // Tier-based bonus (prefer top-tier players)
      valueScore += (5 - player.tier) * 15;

      // Bye week consideration (avoid same bye weeks for same position)
      const byeWeekPenalty = this.calculateByeWeekPenalty(
        player,
        players.filter(p => p.position === player.position)
      );
      valueScore -= byeWeekPenalty;

      // Scoring type adjustments
      if (context.scoringType === 'PPR' || context.scoringType === 'HALF_PPR') {
        if (player.position === 'RB' || player.position === 'WR') {
          valueScore *= 1.1; // Boost pass-catchers in PPR
        }
      }

      // Early round QB penalty (don't reach for QBs early)
      if (player.position === 'QB' && context.round < 4) {
        valueScore *= 0.7;
      }

      // Late round K/DEF boost (fill these positions late)
      if ((player.position === 'K' || player.position === 'DEF') && context.round > 10) {
        valueScore *= 1.3;
      }

      return { ...player, valueScore };
    });
  }

  /**
   * Calculate position scarcity
   */
  private calculatePositionScarcity(players: PlayerValue[]): Record<string, number> {
    const scarcity: Record<string, number> = {};
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

    positions.forEach(pos => {
      const positionPlayers = players.filter(p => p.position === pos);
      const topTierCount = positionPlayers.filter(p => p.tier <= 2).length;
      const threshold = this.SCARCITY_THRESHOLDS[pos] || 10;
      
      scarcity[pos] = Math.max(0, 1 - (topTierCount / threshold));
    });

    return scarcity;
  }

  /**
   * Calculate bye week penalty
   */
  private calculateByeWeekPenalty(player: PlayerValue, samePositionPlayers: PlayerValue[]): number {
    if (!player.byeWeek) return 0;
    
    const sameByeCount = samePositionPlayers.filter(
      p => p.byeWeek === player.byeWeek
    ).length;
    
    return sameByeCount * 5; // Penalty for each player with same bye week
  }

  /**
   * Select the best player based on strategy
   */
  private selectBestPlayer(
    players: PlayerValue[],
    teamNeeds: TeamNeeds,
    context: DraftContext,
    currentRoster: any[]
  ): PlayerValue {
    // Sort by value score
    const sortedPlayers = players.sort((a, b) => b.valueScore - a.valueScore);

    // Strategy adjustments based on draft position
    if (context.round <= 2) {
      // Early rounds: Best Player Available (BPA) with slight position preference
      return this.bestPlayerAvailable(sortedPlayers, teamNeeds);
    } else if (context.round <= 6) {
      // Middle rounds: Balance BPA with team needs
      return this.balancedApproach(sortedPlayers, teamNeeds);
    } else if (context.round <= 10) {
      // Late-middle rounds: Fill starting lineup needs
      return this.fillStarters(sortedPlayers, teamNeeds);
    } else {
      // Late rounds: High-upside picks and handcuffs
      return this.lateRoundStrategy(sortedPlayers, teamNeeds, currentRoster);
    }
  }

  /**
   * Best Player Available strategy
   */
  private bestPlayerAvailable(
    players: PlayerValue[],
    teamNeeds: TeamNeeds
  ): PlayerValue {
    // Get top 5 players by value
    const topPlayers = players.slice(0, 5);
    
    // Prefer players at positions of need if value is close
    for (const player of topPlayers) {
      if (teamNeeds[player.position] > 0) {
        // If within 10% of best player's value, take the needed position
        if (player.valueScore >= topPlayers[0].valueScore * 0.9) {
          return player;
        }
      }
    }
    
    return topPlayers[0];
  }

  /**
   * Balanced approach between BPA and needs
   */
  private balancedApproach(
    players: PlayerValue[],
    teamNeeds: TeamNeeds
  ): PlayerValue {
    // Filter to positions of need
    const neededPlayers = players.filter(p => teamNeeds[p.position] > 0);
    
    if (neededPlayers.length > 0) {
      // Return best player at position of need
      return neededPlayers[0];
    }
    
    // If all needs filled, go BPA
    return players[0];
  }

  /**
   * Fill starting lineup positions
   */
  private fillStarters(
    players: PlayerValue[],
    teamNeeds: TeamNeeds
  ): PlayerValue {
    // Prioritize starting positions
    const starterPositions = ['QB', 'RB', 'WR', 'TE'];
    
    for (const position of starterPositions) {
      if (teamNeeds[position] > 0) {
        const positionPlayers = players.filter(p => p.position === position);
        if (positionPlayers.length > 0) {
          return positionPlayers[0];
        }
      }
    }
    
    // Then K/DEF if needed
    if (teamNeeds['K'] > 0 || teamNeeds['DEF'] > 0) {
      const specialTeams = players.filter(
        p => (p.position === 'K' || p.position === 'DEF')
      );
      if (specialTeams.length > 0) {
        return specialTeams[0];
      }
    }
    
    return players[0];
  }

  /**
   * Late round strategy - high upside and handcuffs
   */
  private lateRoundStrategy(
    players: PlayerValue[],
    teamNeeds: TeamNeeds,
    currentRoster: any[]
  ): PlayerValue {
    // Look for handcuffs (backup RBs to owned starters)
    const myRBs = currentRoster.filter(p => p.position === 'RB');
    
    for (const rb of myRBs) {
      const handcuff = players.find(
        p => p.position === 'RB' && 
        p.team === rb.team && 
        p.name !== rb.name
      );
      if (handcuff && handcuff.valueScore > players[0].valueScore * 0.7) {
        return handcuff;
      }
    }
    
    // Prioritize high-upside rookies and backups
    const highUpside = players.filter(p => 
      p.projectedPoints > 0 && 
      p.adp > 150 &&
      (p.position === 'RB' || p.position === 'WR')
    );
    
    if (highUpside.length > 0) {
      return highUpside[0];
    }
    
    // Fill K/DEF if still needed
    if (teamNeeds['K'] > 0) {
      const kickers = players.filter(p => p.position === 'K');
      if (kickers.length > 0) return kickers[0];
    }
    
    if (teamNeeds['DEF'] > 0) {
      const defenses = players.filter(p => p.position === 'DEF');
      if (defenses.length > 0) return defenses[0];
    }
    
    return players[0];
  }

  /**
   * Calculate player tier based on position rank
   */
  private calculateTier(position: string, positionRank: number): number {
    const tierBreaks = {
      QB: [3, 6, 10, 15, 20],
      RB: [5, 12, 20, 30, 40],
      WR: [5, 12, 20, 30, 40],
      TE: [3, 6, 10, 15, 20],
      K: [3, 6, 10, 15, 20],
      DEF: [3, 6, 10, 15, 20]
    };

    const breaks = tierBreaks[position] || [5, 10, 15, 20, 25];
    
    for (let i = 0; i < breaks.length; i++) {
      if (positionRank <= breaks[i]) {
        return i + 1;
      }
    }
    
    return 6; // Lowest tier
  }

  /**
   * Make the actual draft pick
   */
  private async makePick(
    draftId: string,
    teamId: string,
    playerId: string,
    round: number,
    pick: number
  ): Promise<void> {
    await prisma.draftPick.create({
      data: {
        draftId,
        teamId,
        playerId,
        round,
        pickNumber: pick,
        isAutoPick: true,
        pickTime: new Date()
      }
    });

    // Update draft state
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        currentRound: round,
        currentPick: pick + 1
      }
    });
  }

  /**
   * Fallback pick - best available by projected points
   */
  private async fallbackPick(draftId: string): Promise<string> {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: { picks: true }
    });

    const pickedIds = draft?.picks.map(p => p.playerId) || [];

    const bestAvailable = await prisma.player.findFirst({
      where: {
        id: { notIn: pickedIds },
        isActive: true,
        position: { in: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] }
      },
      orderBy: {
        projectedPoints: 'desc'
      }
    });

    if (!bestAvailable) {
      throw new Error('No available players');
    }

    return bestAvailable.id;
  }
}

/**
 * Queue-based draft pick recommendations
 */
export class DraftQueue {
  /**
   * Generate a draft queue for a team
   */
  static async generateQueue(
    leagueId: string,
    teamId: string,
    maxPlayers: number = 20
  ): Promise<string[]> {
    const algorithm = new AutoPickAlgorithm();
    
    // Get draft context
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        settings: true,
        draft: {
          include: { picks: true }
        }
      }
    });

    if (!league?.draft) {
      throw new Error('No active draft found');
    }

    const context: DraftContext = {
      round: league.draft.currentRound || 1,
      pick: league.draft.currentPick || 1,
      totalRounds: league.settings?.rosterSize || 15,
      teamCount: league.maxTeams,
      scoringType: league.scoringType as 'STANDARD' | 'PPR' | 'HALF_PPR',
      rosterSettings: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        K: 1,
        DEF: 1,
        BENCH: 6
      }
    };

    // Get available players
    const availablePlayers = await algorithm['getAvailablePlayers'](league.draft.id);
    
    // Get current roster
    const currentRoster = await algorithm['getCurrentRoster'](league.draft.id, teamId);
    
    // Calculate needs
    const teamNeeds = algorithm['calculateTeamNeeds'](currentRoster, context.rosterSettings);
    
    // Get valued players
    const valuedPlayers = algorithm['calculatePlayerValues'](
      availablePlayers,
      teamNeeds,
      context
    );
    
    // Sort by value and return top players
    return valuedPlayers
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, maxPlayers)
      .map(p => p.id);
  }

  /**
   * Update a team's draft queue
   */
  static async updateQueue(
    teamId: string,
    playerIds: string[]
  ): Promise<void> {
    // Store queue in database or cache
    await prisma.team.update({
      where: { id: teamId },
      data: {
        draftQueue: playerIds
      }
    });
  }

  /**
   * Get next player from queue
   */
  static async getNextFromQueue(teamId: string): Promise<string | null> {
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    const queue = team?.draftQueue || [];
    
    if (queue.length === 0) {
      return null;
    }

    // Check if first player is still available
    const draft = await prisma.draft.findFirst({
      where: {
        league: { teams: { some: { id: teamId } } },
        status: 'IN_PROGRESS'
      },
      include: { picks: true }
    });

    const pickedIds = draft?.picks.map(p => p.playerId) || [];
    
    // Find first available player in queue
    for (const playerId of queue) {
      if (!pickedIds.includes(playerId)) {
        return playerId;
      }
    }

    return null;
  }
}

// Export singleton instance
export const autoPickAlgorithm = new AutoPickAlgorithm();