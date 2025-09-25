/**
 * Trade Processor
 * Handles trade proposals, validation, and execution
 */

import { prisma } from '@/lib/prisma';
import { broadcastToUser, broadcastToLeague } from '@/lib/socket/server';
import { notificationService } from '@/lib/notifications/notification-service';

export interface TradeProposal {
  fromTeamId: string;
  toTeamId: string;
  givingPlayerIds: string[];
  receivingPlayerIds: string[];
  message?: string;
  expiresAt?: Date;
}

export interface TradeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TradeExecutionResult {
  success: boolean;
  tradeId?: string;
  error?: string;
}

export class TradeProcessor {
  /**
   * Validate a trade proposal
   */
  async validateTrade(
    proposal: TradeProposal,
    leagueId: string
  ): Promise<TradeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get league settings
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        errors.push('League not found');
        return { isValid: false, errors, warnings };
      }

      // Check trade deadline
      const settings = league.settings as any;
      if (settings?.tradeDeadlineWeek) {
        const currentWeek = league.currentWeek || 1;
        if (currentWeek >= settings.tradeDeadlineWeek) {
          errors.push('Trade deadline has passed');
        }
      }

      // Verify both teams exist and are in the same league
      const [fromTeam, toTeam] = await Promise.all([
        prisma.team.findFirst({
          where: { id: proposal.fromTeamId, leagueId }
        }),
        prisma.team.findFirst({
          where: { id: proposal.toTeamId, leagueId }
        })
      ]);

      if (!fromTeam) errors.push('Sending team not found');
      if (!toTeam) errors.push('Receiving team not found');
      if (fromTeam?.id === toTeam?.id) errors.push('Cannot trade with yourself');

      // Verify all players exist and ownership
      const givingPlayers = await prisma.roster.findMany({
        where: {
          teamId: proposal.fromTeamId,
          playerId: { in: proposal.givingPlayerIds }
        },
        include: { player: true }
      });

      const receivingPlayers = await prisma.roster.findMany({
        where: {
          teamId: proposal.toTeamId,
          playerId: { in: proposal.receivingPlayerIds }
        },
        include: { player: true }
      });

      // Check if all giving players are owned by fromTeam
      if (givingPlayers.length !== proposal.givingPlayerIds.length) {
        errors.push('Some players are not on your roster');
      }

      // Check if all receiving players are owned by toTeam
      if (receivingPlayers.length !== proposal.receivingPlayerIds.length) {
        errors.push('Some requested players are not available');
      }

      // Check for locked players (can't trade players who have already played)
      const lockedGiving = givingPlayers.filter(p => p.isLocked);
      const lockedReceiving = receivingPlayers.filter(p => p.isLocked);

      if (lockedGiving.length > 0) {
        errors.push(`Cannot trade locked players: ${lockedGiving.map(p => p.player.name).join(', ')}`);
      }

      if (lockedReceiving.length > 0) {
        errors.push(`Cannot receive locked players: ${lockedReceiving.map(p => p.player.name).join(', ')}`);
      }

      // Check roster limits after trade
      const fromTeamRosterCount = await prisma.roster.count({
        where: { teamId: proposal.fromTeamId }
      });
      const toTeamRosterCount = await prisma.roster.count({
        where: { teamId: proposal.toTeamId }
      });

      const maxRosterSize = (settings as any)?.rosterSize || 16;
      const fromTeamNewSize = fromTeamRosterCount - givingPlayers.length + receivingPlayers.length;
      const toTeamNewSize = toTeamRosterCount - receivingPlayers.length + givingPlayers.length;

      if (fromTeamNewSize > maxRosterSize) {
        errors.push(`Trade would exceed your roster limit (${maxRosterSize})`);
      }

      if (toTeamNewSize > maxRosterSize) {
        errors.push(`Trade would exceed opponent's roster limit (${maxRosterSize})`);
      }

      // Check position requirements (must maintain valid lineup)
      await this.validatePositionRequirements(
        proposal.fromTeamId,
        givingPlayers.map(p => p.player),
        receivingPlayers.map(p => p.player),
        league.settings,
        errors,
        warnings
      );

      // Add trade fairness warning if imbalanced
      const fairnessScore = await this.calculateTradeFairness(
        givingPlayers.map(p => p.player),
        receivingPlayers.map(p => p.player)
      );

      if (fairnessScore < -30) {
        warnings.push('This trade appears to favor the other team significantly');
      } else if (fairnessScore > 30) {
        warnings.push('This trade appears to favor you significantly');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Trade validation error:', error);
      errors.push('Failed to validate trade');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate position requirements after trade
   */
  private async validatePositionRequirements(
    teamId: string,
    giving: any[],
    receiving: any[],
    settings: any,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const currentRoster = await prisma.roster.findMany({
      where: { teamId },
      include: { player: true }
    });

    // Calculate position counts after trade
    const positionCounts: Record<string, number> = {};
    
    // Start with current roster
    currentRoster.forEach(r => {
      const pos = r.player.position;
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });

    // Remove giving players
    giving.forEach(player => {
      const pos = player.position;
      positionCounts[pos] = Math.max(0, (positionCounts[pos] || 0) - 1);
    });

    // Add receiving players
    receiving.forEach(player => {
      const pos = player.position;
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });

    // Check minimum requirements
    const requirements = {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      K: 1,
      DEF: 1
    };

    for (const [position, minRequired] of Object.entries(requirements)) {
      const count = positionCounts[position] || 0;
      if (count < minRequired) {
        errors.push(`Trade would leave you with insufficient ${position}s (need at least ${minRequired})`);
      }
    }

    // Warn about depth issues
    if ((positionCounts.RB || 0) < 3) {
      warnings.push('You would have limited RB depth after this trade');
    }
    if ((positionCounts.WR || 0) < 3) {
      warnings.push('You would have limited WR depth after this trade');
    }
  }

  /**
   * Calculate trade fairness score
   */
  async calculateTradeFairness(
    givingPlayers: any[],
    receivingPlayers: any[]
  ): Promise<number> {
    const givingValue = givingPlayers.reduce((sum, player) => {
      // Use projected points, ADP, and position scarcity for value
      const adpValue = Math.max(0, 200 - (player.adp || 200));
      const projValue = player.projectedPoints || 0;
      const positionMultiplier = this.getPositionValueMultiplier(player.position);
      
      return sum + (adpValue * 0.5 + projValue) * positionMultiplier;
    }, 0);

    const receivingValue = receivingPlayers.reduce((sum, player) => {
      const adpValue = Math.max(0, 200 - (player.adp || 200));
      const projValue = player.projectedPoints || 0;
      const positionMultiplier = this.getPositionValueMultiplier(player.position);
      
      return sum + (adpValue * 0.5 + projValue) * positionMultiplier;
    }, 0);

    // Return percentage difference (-100 to +100)
    if (givingValue === 0 && receivingValue === 0) return 0;
    
    const totalValue = givingValue + receivingValue;
    const difference = receivingValue - givingValue;
    
    return Math.round((difference / totalValue) * 100);
  }

  /**
   * Get position value multiplier for trade calculations
   */
  private getPositionValueMultiplier(position: string): number {
    const multipliers: Record<string, number> = {
      QB: 1.1,
      RB: 1.2,
      WR: 1.15,
      TE: 1.0,
      K: 0.6,
      DEF: 0.7
    };
    return multipliers[position] || 1.0;
  }

  /**
   * Propose a new trade
   */
  async proposeTrade(
    proposal: TradeProposal,
    leagueId: string,
    proposerId: string
  ): Promise<TradeExecutionResult> {
    try {
      // Validate the trade first
      const validation = await this.validateTrade(proposal, leagueId);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Get current week
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      // Create the trade transaction
      const trade = await prisma.transaction.create({
        data: {
          type: 'trade',
          status: 'pending',
          teamId: proposal.fromTeamId,
          playerIds: proposal.givingPlayerIds,
          leagueId,
          week: league?.currentWeek || 1,
          relatedData: {
            toTeamId: proposal.toTeamId,
            receivingPlayerIds: proposal.receivingPlayerIds,
            message: proposal.message,
            proposerId,
            expiresAt: proposal.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours default
            warnings: validation.warnings
          }
        },
        include: {
          team: {
            include: { owner: true }
          }
        }
      });

      // Get receiving team for notifications
      const receivingTeam = await prisma.team.findUnique({
        where: { id: proposal.toTeamId },
        include: { owner: true }
      });

      // Send push notification for trade proposal
      if (receivingTeam?.owner) {
        await notificationService.notifyTradeProposed(
          trade.id,
          trade.team.name,
          receivingTeam.owner.id,
          leagueId
        );

        // Send real-time notification
        broadcastToUser(receivingTeam.owner.id, 'trade:received', {
          tradeId: trade.id,
          from: trade.team.name,
          message: proposal.message
        });
      }

      return {
        success: true,
        tradeId: trade.id
      };
    } catch (error) {
      console.error('Error proposing trade:', error);
      return {
        success: false,
        error: 'Failed to propose trade'
      };
    }
  }

  /**
   * Accept a trade proposal
   */
  async acceptTrade(
    tradeId: string,
    acceptingUserId: string
  ): Promise<TradeExecutionResult> {
    try {
      // Get the trade
      const trade = await prisma.transaction.findUnique({
        where: { id: tradeId },
        include: {
          team: { include: { owner: true } }
        }
      });

      if (!trade || trade.type !== 'trade') {
        return { success: false, error: 'Trade not found' };
      }

      if (trade.status !== 'pending') {
        return { success: false, error: 'Trade is no longer pending' };
      }

      const relatedData = trade.relatedData as any;

      // Verify the accepting user owns the receiving team
      const receivingTeam = await prisma.team.findUnique({
        where: { id: relatedData.toTeamId },
        include: { owner: true }
      });

      if (receivingTeam?.owner.id !== acceptingUserId) {
        return { success: false, error: 'You cannot accept this trade' };
      }

      // Check if trade has expired
      if (relatedData.expiresAt && new Date(relatedData.expiresAt) < new Date()) {
        await prisma.transaction.update({
          where: { id: tradeId },
          data: { status: 'expired' }
        });
        return { success: false, error: 'Trade has expired' };
      }

      // Re-validate the trade
      const validation = await this.validateTrade({
        fromTeamId: trade.teamId,
        toTeamId: relatedData.toTeamId,
        givingPlayerIds: trade.playerIds,
        receivingPlayerIds: relatedData.receivingPlayerIds,
        message: relatedData.message
      }, trade.leagueId);

      if (!validation.isValid) {
        return { success: false, error: validation.errors.join('; ') };
      }

      // Execute the trade in a transaction
      await prisma.$transaction(async (tx) => {
        // Move players from team A to team B
        for (const playerId of trade.playerIds) {
          await tx.roster.updateMany({
            where: {
              teamId: trade.teamId,
              playerId
            },
            data: {
              teamId: relatedData.toTeamId,
              acquisitionType: 'trade',
              acquisitionDate: new Date()
            }
          });
        }

        // Move players from team B to team A
        for (const playerId of relatedData.receivingPlayerIds) {
          await tx.roster.updateMany({
            where: {
              teamId: relatedData.toTeamId,
              playerId
            },
            data: {
              teamId: trade.teamId,
              acquisitionType: 'trade',
              acquisitionDate: new Date()
            }
          });
        }

        // Update trade status
        await tx.transaction.update({
          where: { id: tradeId },
          data: {
            status: 'completed',
            processedAt: new Date()
          }
        });

        // Create trade history record
        await tx.transaction.create({
          data: {
            type: 'trade_completed',
            status: 'completed',
            teamId: trade.teamId,
            playerIds: [...trade.playerIds, ...relatedData.receivingPlayerIds],
            leagueId: trade.leagueId,
            week: trade.week,
            relatedData: {
              originalTradeId: tradeId,
              team1Id: trade.teamId,
              team1Gave: trade.playerIds,
              team1Received: relatedData.receivingPlayerIds,
              team2Id: relatedData.toTeamId,
              team2Gave: relatedData.receivingPlayerIds,
              team2Received: trade.playerIds,
              acceptedBy: acceptingUserId,
              acceptedAt: new Date()
            }
          }
        });

        // Send push notification to proposer
        await notificationService.notifyTradeAccepted(
          tradeId,
          receivingTeam?.name || 'Unknown Team',
          trade.team.owner.id,
          trade.leagueId
        );
      });

      // Broadcast trade completion
      broadcastToLeague(trade.leagueId, 'trade:completed', {
        tradeId,
        team1: trade.team.name,
        team2: receivingTeam?.name
      });

      return { success: true, tradeId };
    } catch (error) {
      console.error('Error accepting trade:', error);
      return { success: false, error: 'Failed to accept trade' };
    }
  }

  /**
   * Reject a trade proposal
   */
  async rejectTrade(
    tradeId: string,
    rejectingUserId: string,
    reason?: string
  ): Promise<TradeExecutionResult> {
    try {
      const trade = await prisma.transaction.findUnique({
        where: { id: tradeId },
        include: {
          team: { include: { owner: true } }
        }
      });

      if (!trade || trade.type !== 'trade') {
        return { success: false, error: 'Trade not found' };
      }

      if (trade.status !== 'pending') {
        return { success: false, error: 'Trade is no longer pending' };
      }

      const relatedData = trade.relatedData as any;

      // Verify the rejecting user owns the receiving team or is the proposer
      const receivingTeam = await prisma.team.findUnique({
        where: { id: relatedData.toTeamId },
        include: { owner: true }
      });

      const canReject = 
        receivingTeam?.owner.id === rejectingUserId ||
        trade.team.owner.id === rejectingUserId;

      if (!canReject) {
        return { success: false, error: 'You cannot reject this trade' };
      }

      // Update trade status
      await prisma.transaction.update({
        where: { id: tradeId },
        data: {
          status: 'rejected',
          processedAt: new Date(),
          relatedData: {
            ...relatedData,
            rejectedBy: rejectingUserId,
            rejectionReason: reason
          }
        }
      });

      // Create notification
      const notifyUserId = 
        rejectingUserId === trade.team.owner.id
          ? receivingTeam?.owner.id
          : trade.team.owner.id;

      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'TRADE_REJECTED',
            title: 'Trade Rejected',
            message: reason || 'Your trade proposal has been rejected',
            data: { relatedId: tradeId }
          }
        });

        broadcastToUser(notifyUserId, 'trade:rejected', {
          tradeId,
          reason
        });
      }

      return { success: true, tradeId };
    } catch (error) {
      console.error('Error rejecting trade:', error);
      return { success: false, error: 'Failed to reject trade' };
    }
  }

  /**
   * Counter a trade proposal with modifications
   */
  async counterTrade(
    originalTradeId: string,
    counterProposal: TradeProposal,
    counteringUserId: string
  ): Promise<TradeExecutionResult> {
    try {
      // First reject the original trade
      await this.rejectTrade(originalTradeId, counteringUserId, 'Countered with new proposal');

      // Get original trade for reference
      const originalTrade = await prisma.transaction.findUnique({
        where: { id: originalTradeId }
      });

      if (!originalTrade) {
        return { success: false, error: 'Original trade not found' };
      }

      // Create new trade with swapped teams (counter goes opposite direction)
      const result = await this.proposeTrade(
        counterProposal,
        originalTrade.leagueId,
        counteringUserId
      );

      if (result.success && result.tradeId) {
        // Link to original trade
        await prisma.transaction.update({
          where: { id: result.tradeId },
          data: {
            relatedData: {
              ...(await prisma.transaction.findUnique({ where: { id: result.tradeId } }))?.relatedData as any,
              counteredFrom: originalTradeId
            }
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Error countering trade:', error);
      return { success: false, error: 'Failed to counter trade' };
    }
  }

  /**
   * Cancel a pending trade
   */
  async cancelTrade(
    tradeId: string,
    cancelingUserId: string
  ): Promise<TradeExecutionResult> {
    try {
      const trade = await prisma.transaction.findUnique({
        where: { id: tradeId },
        include: {
          team: { include: { owner: true } }
        }
      });

      if (!trade || trade.type !== 'trade') {
        return { success: false, error: 'Trade not found' };
      }

      if (trade.status !== 'pending') {
        return { success: false, error: 'Trade is no longer pending' };
      }

      // Only the proposer can cancel
      if (trade.team.owner.id !== cancelingUserId) {
        return { success: false, error: 'Only the proposer can cancel this trade' };
      }

      await prisma.transaction.update({
        where: { id: tradeId },
        data: {
          status: 'cancelled',
          processedAt: new Date()
        }
      });

      // Notify the other party
      const relatedData = trade.relatedData as any;
      const receivingTeam = await prisma.team.findUnique({
        where: { id: relatedData.toTeamId },
        include: { owner: true }
      });

      if (receivingTeam?.owner) {
        await prisma.notification.create({
          data: {
            userId: receivingTeam.owner.id,
            type: 'TRADE_CANCELLED',
            title: 'Trade Cancelled',
            message: `${trade.team.name} has cancelled their trade proposal`,
            data: { relatedId: tradeId }
          }
        });
      }

      return { success: true, tradeId };
    } catch (error) {
      console.error('Error cancelling trade:', error);
      return { success: false, error: 'Failed to cancel trade' };
    }
  }
}

export const tradeProcessor = new TradeProcessor();