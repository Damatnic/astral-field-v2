/**
 * Commissioner Tools
 * Advanced league management functionality for commissioners
 */

import { prisma } from '@/lib/prisma';
import { broadcastToLeague, broadcastToUser } from '@/lib/socket/server';

export interface LeagueSettings {
  leagueName?: string;
  rosterSize?: number;
  pickTimeLimit?: number;
  tradeDeadlineWeek?: number;
  waiverType?: 'FAAB' | 'PRIORITY';
  waiverMode?: 'ROLLING' | 'RESET';
  scoringType?: 'STANDARD' | 'PPR' | 'HALF_PPR';
  playoffWeeks?: number;
  playoffTeams?: number;
  isPublic?: boolean;
}

export interface ManualScoreAdjustment {
  teamId: string;
  week: number;
  adjustment: number;
  reason: string;
  playerId?: string;
}

export interface CommissionerAction {
  id: string;
  action: string;
  targetId: string;
  reason: string;
  timestamp: Date;
  commissionerId: string;
}

export class CommissionerTools {
  /**
   * Verify user is commissioner of league
   */
  async verifyCommissioner(leagueId: string, userId: string): Promise<boolean> {
    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        commissionerId: userId
      }
    });
    
    return !!league;
  }

  /**
   * Get commissioner dashboard data
   */
  async getCommissionerDashboard(leagueId: string): Promise<any> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        settings: true,
        teams: {
          include: {
            owner: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        drafts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        transactions: {
          where: {
            type: { in: ['trade', 'waiver'] },
            status: 'pending'
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!league) {
      throw new Error('League not found');
    }

    // Get recent activity
    const recentActivity = await prisma.transaction.findMany({
      where: { leagueId },
      include: {
        team: true,
        player: {
          select: { id: true, name: true, position: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get current week matchups
    const currentMatchups = await prisma.matchup.findMany({
      where: {
        leagueId,
        week: league.currentWeek || 1
      },
      include: {
        team1: { include: { owner: true } },
        team2: { include: { owner: true } }
      }
    });

    // Get league stats
    const teamStats = await this.getLeagueStats(leagueId);

    return {
      league,
      recentActivity,
      currentMatchups,
      teamStats,
      pendingActions: {
        pendingTrades: league.transactions.filter(t => t.type === 'trade').length,
        pendingWaivers: league.transactions.filter(t => t.type === 'waiver').length,
      }
    };
  }

  /**
   * Update league settings
   */
  async updateLeagueSettings(
    leagueId: string,
    settings: LeagueSettings,
    commissionerId: string
  ): Promise<void> {
    // Verify commissioner
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can update league settings');
    }

    // Update league basic info
    if (settings.leagueName !== undefined) {
      await prisma.league.update({
        where: { id: leagueId },
        data: { name: settings.leagueName }
      });
    }

    // Update league settings
    const settingsUpdate: any = {};
    if (settings.rosterSize !== undefined) settingsUpdate.rosterSize = settings.rosterSize;
    if (settings.pickTimeLimit !== undefined) settingsUpdate.pickTimeLimit = settings.pickTimeLimit;
    if (settings.tradeDeadlineWeek !== undefined) settingsUpdate.tradeDeadlineWeek = settings.tradeDeadlineWeek;
    if (settings.waiverType !== undefined) settingsUpdate.waiverType = settings.waiverType;
    if (settings.waiverMode !== undefined) settingsUpdate.waiverMode = settings.waiverMode;
    if (settings.scoringType !== undefined) settingsUpdate.scoringType = settings.scoringType;
    if (settings.playoffWeeks !== undefined) settingsUpdate.playoffWeeks = settings.playoffWeeks;
    if (settings.playoffTeams !== undefined) settingsUpdate.playoffTeams = settings.playoffTeams;
    if (settings.isPublic !== undefined) settingsUpdate.isPublic = settings.isPublic;

    if (Object.keys(settingsUpdate).length > 0) {
      await prisma.leagueSettings.update({
        where: { leagueId },
        data: settingsUpdate
      });
    }

    // Log the action
    await this.logCommissionerAction(
      leagueId,
      commissionerId,
      'SETTINGS_UPDATE',
      'league',
      `Updated league settings: ${Object.keys(settingsUpdate).join(', ')}`
    );

    // Notify league members
    broadcastToLeague(leagueId, 'league:settingsUpdated', {
      message: 'League settings have been updated by the commissioner',
      changes: Object.keys(settingsUpdate)
    });
  }

  /**
   * Make manual score adjustment
   */
  async adjustScore(
    leagueId: string,
    adjustment: ManualScoreAdjustment,
    commissionerId: string
  ): Promise<void> {
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can adjust scores');
    }

    // Get the matchup for this team and week
    const matchup = await prisma.matchup.findFirst({
      where: {
        leagueId,
        week: adjustment.week,
        OR: [
          { team1Id: adjustment.teamId },
          { team2Id: adjustment.teamId }
        ]
      }
    });

    if (!matchup) {
      throw new Error('Matchup not found for this team and week');
    }

    // Apply the adjustment
    const isTeam1 = matchup.team1Id === adjustment.teamId;
    const updateData = isTeam1
      ? { team1Score: { increment: adjustment.adjustment } }
      : { team2Score: { increment: adjustment.adjustment } };

    await prisma.matchup.update({
      where: { id: matchup.id },
      data: {
        ...updateData,
        lastUpdated: new Date()
      }
    });

    // Create adjustment record
    await prisma.transaction.create({
      data: {
        type: 'score_adjustment',
        status: 'completed',
        teamId: adjustment.teamId,
        playerIds: adjustment.playerId ? [adjustment.playerId] : [],
        leagueId,
        week: adjustment.week,
        relatedData: {
          adjustment: adjustment.adjustment,
          reason: adjustment.reason,
          commissionerId,
          originalScore: isTeam1 ? matchup.team1Score : matchup.team2Score
        }
      }
    });

    // Log the action
    await this.logCommissionerAction(
      leagueId,
      commissionerId,
      'SCORE_ADJUSTMENT',
      adjustment.teamId,
      `Adjusted score by ${adjustment.adjustment} points: ${adjustment.reason}`
    );

    // Get team for notification
    const team = await prisma.team.findUnique({
      where: { id: adjustment.teamId },
      include: { owner: true }
    });

    if (team?.owner) {
      // Notify affected team owner
      await prisma.notification.create({
        data: {
          userId: team.owner.id,
          type: 'SCORE_ADJUSTMENT',
          title: 'Score Adjustment',
          message: `Commissioner adjusted your Week ${adjustment.week} score by ${adjustment.adjustment} points: ${adjustment.reason}`,
          relatedId: matchup.id
        }
      });

      broadcastToUser(team.owner.id, 'scoring:adjustment', {
        week: adjustment.week,
        adjustment: adjustment.adjustment,
        reason: adjustment.reason
      });
    }

    // Notify entire league
    broadcastToLeague(leagueId, 'league:scoreAdjustment', {
      teamName: team?.name,
      week: adjustment.week,
      adjustment: adjustment.adjustment,
      reason: adjustment.reason
    });
  }

  /**
   * Force process waivers
   */
  async forceProcessWaivers(leagueId: string, commissionerId: string): Promise<void> {
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can force process waivers');
    }

    try {
      // Import waiver processor
      const { processWaiverClaims } = await import('@/lib/waivers/processor');
      
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      const currentWeek = league?.currentWeek || 1;
      const result = await processWaiverClaims(leagueId, currentWeek);

      // Log the action
      await this.logCommissionerAction(
        leagueId,
        commissionerId,
        'FORCE_WAIVER_PROCESSING',
        'league',
        `Manually processed waivers: ${result.processed} successful, ${result.failed} failed`
      );

      // Notify league
      broadcastToLeague(leagueId, 'waivers:forceProcessed', {
        processed: result.processed,
        failed: result.failed,
        message: 'Commissioner manually processed waivers'
      });

    } catch (error) {
      console.error('Error force processing waivers:', error);
      throw new Error('Failed to process waivers');
    }
  }

  /**
   * Reset draft order
   */
  async resetDraftOrder(
    leagueId: string,
    newOrder: string[],
    commissionerId: string
  ): Promise<void> {
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can reset draft order');
    }

    // Verify all team IDs are valid
    const teams = await prisma.team.findMany({
      where: { leagueId }
    });

    const teamIds = teams.map(t => t.id);
    const invalidIds = newOrder.filter(id => !teamIds.includes(id));
    
    if (invalidIds.length > 0) {
      throw new Error(`Invalid team IDs: ${invalidIds.join(', ')}`);
    }

    if (newOrder.length !== teamIds.length) {
      throw new Error('Draft order must include all teams');
    }

    // Update draft order
    const draft = await prisma.draft.findFirst({
      where: { leagueId }
    });

    if (draft) {
      await prisma.draft.update({
        where: { id: draft.id },
        data: { draftOrder: newOrder }
      });

      // Update team draft positions
      for (let i = 0; i < newOrder.length; i++) {
        await prisma.team.update({
          where: { id: newOrder[i] },
          data: { draftPosition: i + 1 }
        });
      }
    }

    // Log the action
    await this.logCommissionerAction(
      leagueId,
      commissionerId,
      'DRAFT_ORDER_RESET',
      'league',
      'Reset draft order'
    );

    // Notify league
    broadcastToLeague(leagueId, 'draft:orderReset', {
      message: 'Commissioner has reset the draft order',
      newOrder
    });
  }

  /**
   * Move player between teams (emergency)
   */
  async movePlayer(
    leagueId: string,
    playerId: string,
    fromTeamId: string,
    toTeamId: string,
    reason: string,
    commissionerId: string
  ): Promise<void> {
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can move players');
    }

    // Verify player is on from team
    const currentRoster = await prisma.roster.findFirst({
      where: {
        teamId: fromTeamId,
        playerId
      },
      include: { player: true }
    });

    if (!currentRoster) {
      throw new Error('Player not found on source team');
    }

    // Check roster limits
    const toTeamRosterCount = await prisma.roster.count({
      where: { teamId: toTeamId }
    });

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { settings: true }
    });

    const maxRosterSize = league?.settings?.rosterSize || 16;
    if (toTeamRosterCount >= maxRosterSize) {
      throw new Error('Destination team roster is full');
    }

    // Move the player
    await prisma.roster.update({
      where: { id: currentRoster.id },
      data: {
        teamId: toTeamId,
        acquisitionType: 'commissioner_move',
        acquisitionDate: new Date()
      }
    });

    // Log the action
    await this.logCommissionerAction(
      leagueId,
      commissionerId,
      'PLAYER_MOVE',
      playerId,
      `Moved ${currentRoster.player.name} from ${fromTeamId} to ${toTeamId}: ${reason}`
    );

    // Get team names for notifications
    const [fromTeam, toTeam] = await Promise.all([
      prisma.team.findUnique({
        where: { id: fromTeamId },
        include: { owner: true }
      }),
      prisma.team.findUnique({
        where: { id: toTeamId },
        include: { owner: true }
      })
    ]);

    // Notify affected teams
    if (fromTeam?.owner) {
      await prisma.notification.create({
        data: {
          userId: fromTeam.owner.id,
          type: 'COMMISSIONER_ACTION',
          title: 'Player Moved by Commissioner',
          message: `${currentRoster.player.name} has been moved from your team: ${reason}`,
          relatedId: playerId
        }
      });
    }

    if (toTeam?.owner) {
      await prisma.notification.create({
        data: {
          userId: toTeam.owner.id,
          type: 'COMMISSIONER_ACTION',
          title: 'Player Added by Commissioner',
          message: `${currentRoster.player.name} has been added to your team: ${reason}`,
          relatedId: playerId
        }
      });
    }

    // Notify league
    broadcastToLeague(leagueId, 'league:playerMoved', {
      playerName: currentRoster.player.name,
      fromTeam: fromTeam?.name,
      toTeam: toTeam?.name,
      reason
    });
  }

  /**
   * Get league statistics for dashboard
   */
  private async getLeagueStats(leagueId: string): Promise<any> {
    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        roster: {
          include: { player: true }
        }
      }
    });

    const totalTeams = teams.length;
    const totalRosterSpots = teams.reduce((sum, team) => sum + team.roster.length, 0);
    const avgRosterSize = totalTeams > 0 ? totalRosterSpots / totalTeams : 0;

    // Calculate position breakdown
    const positionCounts: Record<string, number> = {};
    teams.forEach(team => {
      team.roster.forEach(roster => {
        const pos = roster.player.position;
        positionCounts[pos] = (positionCounts[pos] || 0) + 1;
      });
    });

    // Get recent trades and waivers
    const recentTransactions = await prisma.transaction.count({
      where: {
        leagueId,
        type: { in: ['trade', 'waiver'] },
        status: 'completed',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    return {
      totalTeams,
      avgRosterSize: Math.round(avgRosterSize * 10) / 10,
      positionBreakdown: positionCounts,
      recentTransactions
    };
  }

  /**
   * Log commissioner action
   */
  private async logCommissionerAction(
    leagueId: string,
    commissionerId: string,
    action: string,
    targetId: string,
    reason: string
  ): Promise<void> {
    await prisma.transaction.create({
      data: {
        type: 'commissioner_action',
        status: 'completed',
        teamId: commissionerId, // Using teamId field for commissioner ID
        playerIds: [],
        leagueId,
        week: 0, // Commissioner actions are not week-specific
        relatedData: {
          action,
          targetId,
          reason,
          timestamp: new Date()
        }
      }
    });
  }

  /**
   * Get commissioner action history
   */
  async getActionHistory(leagueId: string, limit = 20): Promise<CommissionerAction[]> {
    const actions = await prisma.transaction.findMany({
      where: {
        leagueId,
        type: 'commissioner_action'
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return actions.map(action => ({
      id: action.id,
      action: (action.relatedData as any).action,
      targetId: (action.relatedData as any).targetId,
      reason: (action.relatedData as any).reason,
      timestamp: action.createdAt,
      commissionerId: action.teamId
    }));
  }

  /**
   * Advance league to next week manually
   */
  async advanceWeek(leagueId: string, commissionerId: string): Promise<void> {
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can advance week');
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });

    if (!league) {
      throw new Error('League not found');
    }

    const currentWeek = league.currentWeek || 1;
    if (currentWeek >= 18) {
      throw new Error('Cannot advance beyond week 18');
    }

    await prisma.league.update({
      where: { id: leagueId },
      data: { currentWeek: currentWeek + 1 }
    });

    // Log the action
    await this.logCommissionerAction(
      leagueId,
      commissionerId,
      'ADVANCE_WEEK',
      'league',
      `Advanced from week ${currentWeek} to week ${currentWeek + 1}`
    );

    // Notify league
    broadcastToLeague(leagueId, 'league:weekAdvanced', {
      newWeek: currentWeek + 1,
      message: `Commissioner advanced the league to Week ${currentWeek + 1}`
    });
  }

  /**
   * Lock/unlock rosters
   */
  async toggleRosterLock(
    leagueId: string,
    teamId: string,
    locked: boolean,
    commissionerId: string
  ): Promise<void> {
    const isCommissioner = await this.verifyCommissioner(leagueId, commissionerId);
    if (!isCommissioner) {
      throw new Error('Only commissioner can lock/unlock rosters');
    }

    await prisma.roster.updateMany({
      where: { teamId },
      data: { isLocked: locked }
    });

    // Get team name
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { owner: true }
    });

    // Log the action
    await this.logCommissionerAction(
      leagueId,
      commissionerId,
      locked ? 'ROSTER_LOCKED' : 'ROSTER_UNLOCKED',
      teamId,
      `${locked ? 'Locked' : 'Unlocked'} roster for ${team?.name}`
    );

    // Notify affected team
    if (team?.owner) {
      await prisma.notification.create({
        data: {
          userId: team.owner.id,
          type: 'COMMISSIONER_ACTION',
          title: `Roster ${locked ? 'Locked' : 'Unlocked'}`,
          message: `Commissioner has ${locked ? 'locked' : 'unlocked'} your roster`,
          relatedId: teamId
        }
      });
    }

    // Notify league
    broadcastToLeague(leagueId, `roster:${locked ? 'locked' : 'unlocked'}`, {
      teamName: team?.name,
      message: `Commissioner ${locked ? 'locked' : 'unlocked'} ${team?.name}'s roster`
    });
  }
}

export const commissionerTools = new CommissionerTools();