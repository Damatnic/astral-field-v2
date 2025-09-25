/**
 * Draft Room State Management
 * Handles synchronized draft state across all participants
 */

import { prisma } from '@/lib/prisma';
import { AutoPickAlgorithm } from './autopick';
import { getSocketServer, broadcastToDraft } from '@/lib/socket/server';
import { notificationService } from '@/lib/notifications/notification-service';
import { Position } from '@prisma/client';

export interface DraftState {
  id: string;
  leagueId: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  currentRound: number;
  currentPick: number;
  currentTeamId: string;
  timeRemaining: number;
  totalRounds: number;
  teams: DraftTeam[];
  picks: DraftPick[];
  availablePlayers: AvailablePlayer[];
  chat: ChatMessage[];
  settings: DraftSettings;
}

export interface DraftTeam {
  id: string;
  name: string;
  owner: string;
  draftPosition: number;
  isOnline: boolean;
  isAutoPicking: boolean;
  roster: DraftedPlayer[];
}

export interface DraftPick {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  round: number;
  pickNumber: number;
  timestamp: Date;
  isAutoPick: boolean;
}

export interface AvailablePlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  byeWeek: number;
  projectedPoints: number;
  adp: number;
  positionRank: number;
  isQueued?: boolean;
}

export interface DraftedPlayer extends AvailablePlayer {
  round: number;
  pick: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'CHAT' | 'SYSTEM' | 'PICK_ANNOUNCEMENT';
}

export interface DraftSettings {
  pickTimeLimit: number; // seconds
  draftType: 'SNAKE' | 'LINEAR' | 'AUCTION';
  pauseBetweenPicks: number; // seconds
  allowTrades: boolean;
}

export class DraftStateManager {
  private draftStates: Map<string, DraftState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private autoPicker = new AutoPickAlgorithm();

  /**
   * Initialize draft 
   */
  async initializeDraft(draftId: string): Promise<DraftState> {
    return this.getOrCreateState(draftId);
  }

  /**
   * Get current state
   */
  getState(draftId: string): DraftState | null {
    return this.draftStates.get(draftId) || null;
  }

  /**
   * Trigger auto-pick for current team
   */
  async triggerAutoPick(draftId: string): Promise<void> {
    const state = this.getState(draftId);
    if (!state) return;

    const context = {
      round: state.currentRound,
      pick: state.currentPick,
      totalRounds: Math.ceil(state.teams.length * 16), // assuming 16 roster spots
      teamCount: state.teams.length,
      scoringType: 'STANDARD' as const,
      rosterSettings: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        K: 1,
        DEF: 1,
        FLEX: 1,
        BENCH: 6
      }
    };

    const playerId = await this.autoPicker.autoPick(draftId, state.currentTeamId, context);
    await this.makePick(draftId, state.currentTeamId, playerId, true);
  }

  // Note: pauseDraft and resumeDraft functions are implemented below with userId parameter

  /**
   * Get or create draft state
   */
  async getOrCreateState(draftId: string): Promise<DraftState> {
    // Check memory cache first
    if (this.draftStates.has(draftId)) {
      return this.draftStates.get(draftId)!;
    }

    // Load from database
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: {
          include: {
            teams: {
              include: {
                owner: true
              }
            },
            // Remove non-existent 'settings' field
          }
        },
        picks: true
      }
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    // Build initial state
    const state: DraftState = {
      id: draftId,
      leagueId: draft.leagueId,
      status: draft.status as 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED',
      currentRound: draft.currentRound || 1,
      currentPick: draft.currentPick || 1,
      currentTeamId: this.getCurrentTeamId(draft),
      timeRemaining: 90, // Remove reference to non-existent league.settings
      totalRounds: 15, // Remove reference to non-existent league.settings
      teams: await this.buildTeamStates(draft),
      picks: this.buildPickHistory(draft),
      availablePlayers: await this.getAvailablePlayers(draft),
      chat: [],
      settings: {
        pickTimeLimit: 90, // Remove reference to non-existent league.settings
        draftType: draft.type as 'SNAKE' | 'LINEAR' | 'AUCTION', // Use correct field name
        pauseBetweenPicks: 2,
        allowTrades: false
      }
    };

    // Cache the state
    this.draftStates.set(draftId, state);

    // Start timer if draft is in progress
    if (state.status === 'IN_PROGRESS') {
      this.startPickTimer(draftId);
    }

    return state;
  }

  /**
   * Get current team based on draft order
   */
  private getCurrentTeamId(draft: any): string {
    const { currentRound, currentPick, draftType, league } = draft;
    const teamCount = league.teams.length;
    
    if (draftType === 'SNAKE') {
      // Snake draft: reverse order on even rounds
      const isEvenRound = currentRound % 2 === 0;
      const pickInRound = ((currentPick - 1) % teamCount) + 1;
      
      const position = isEvenRound 
        ? teamCount - pickInRound + 1
        : pickInRound;
      
      const team = league.teams.find((t: any) => t.draftPosition === position);
      return team?.id || league.teams[0].id;
    } else {
      // Linear draft: same order every round
      const pickInRound = ((currentPick - 1) % teamCount) + 1;
      const team = league.teams.find((t: any) => t.draftPosition === pickInRound);
      return team?.id || league.teams[0].id;
    }
  }

  /**
   * Build team states from draft data
   */
  private async buildTeamStates(draft: any): Promise<DraftTeam[]> {
    return draft.league.teams.map((team: any) => {
      const teamPicks = draft.picks.filter((p: any) => p.teamId === team.id);
      
      return {
        id: team.id,
        name: team.name,
        owner: team.owner.name,
        draftPosition: team.draftPosition,
        isOnline: false, // Will be updated when users connect
        isAutoPicking: team.isAutoPicking || false,
        roster: teamPicks.map((pick: any) => ({
          id: pick.player.id,
          name: pick.player.name,
          position: pick.player.position,
          team: pick.player.team,
          byeWeek: pick.player.byeWeek,
          projectedPoints: pick.player.projectedPoints,
          adp: pick.player.adp,
          positionRank: pick.player.positionRank,
          round: pick.round,
          pick: pick.pickNumber
        }))
      };
    });
  }

  /**
   * Build pick history
   */
  private buildPickHistory(draft: any): DraftPick[] {
    // TODO: Include player relationships to get player name and position
    return draft.picks.map((pick: any) => ({
      id: pick.id,
      teamId: pick.teamId,
      playerId: pick.playerId,
      playerName: 'Unknown Player', // TODO: Get from player relationship
      position: 'UNKNOWN', // TODO: Get from player relationship
      round: pick.round,
      pickNumber: pick.pickNumber,
      timestamp: pick.pickMadeAt,
      isAutoPick: pick.isAutoPick || false
    }));
  }

  /**
   * Get available players
   */
  private async getAvailablePlayers(draft: any): Promise<AvailablePlayer[]> {
    const pickedPlayerIds = draft.picks.map((p: any) => p.playerId);
    
    const availablePlayers = await prisma.player.findMany({
      where: {
        id: { notIn: pickedPlayerIds },
        isActive: true,
        position: { in: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] }
      },
      orderBy: [
        { adp: 'asc' }
      ],
      take: 500 // Limit for performance
    });

    return availablePlayers.map(player => ({
      id: player.id,
      name: player.name,
      position: player.position,
      team: player.team || 'FA',
      byeWeek: player.byeWeek || 0,
      projectedPoints: 0, // TODO: Add projectedPoints field to Player model
      adp: player.adp || 300,
      positionRank: 99 // TODO: Add positionRank field to Player model
    }));
  }

  /**
   * Make a draft pick
   */
  async makePick(
    draftId: string,
    teamId: string,
    playerId: string,
    isAutoPick: boolean = false
  ): Promise<{ success: boolean; pick?: any; error?: string }> {
    try {
      const state = await this.getOrCreateState(draftId);
      
      // Validate it's the team's turn
      if (state.currentTeamId !== teamId) {
        return { success: false, error: 'Not your turn to pick' };
      }

      // Validate player is available
      const player = state.availablePlayers.find(p => p.id === playerId);
      if (!player) {
        return { success: false, error: 'Player not available' };
      }

    // Stop the timer
    this.stopPickTimer(draftId);

    // Create the pick in database
    const pick = await prisma.draftPick.create({
      data: {
        draftId,
        teamId,
        playerId,
        round: state.currentRound,
        pickNumber: state.currentPick,
        pickInRound: ((state.currentPick - 1) % 12) + 1, // Assuming 12 teams default
        isAutoPick,
        pickMadeAt: new Date()
      },
      include: {
        player: true,
        team: true
      }
    });

    // Update state
    state.picks.push({
      id: pick.id,
      teamId: pick.teamId,
      playerId: pick.playerId,
      playerName: pick.player?.name || 'Unknown',
      position: pick.player?.position || 'BENCH',
      round: pick.round,
      pickNumber: pick.pickNumber,
      timestamp: pick.pickMadeAt,
      isAutoPick
    });

    // Remove player from available
    state.availablePlayers = state.availablePlayers.filter(p => p.id !== playerId);

    // Add to team roster
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
      team.roster.push({
        ...player,
        round: state.currentRound,
        pick: state.currentPick
      });
    }

    // Move to next pick
    await this.advanceDraft(draftId);

    // Broadcast update
    this.broadcastState(draftId);

    // Send draft pick notifications
    await this.sendPickNotifications(draftId, pick, state);
    
    // Announce the pick
    this.announcePick(draftId, pick);

      return { success: true, pick };
    } catch (error) {
      console.error('Error making pick:', error);
      return { success: false, error: error.message || 'Failed to make pick' };
    }
  }

  /**
   * Advance to next pick
   */
  private async advanceDraft(draftId: string): Promise<void> {
    const state = this.draftStates.get(draftId);
    if (!state) return;

    const teamCount = state.teams.length;
    const totalPicks = state.totalRounds * teamCount;
    
    state.currentPick++;
    
    // Check if draft is complete
    if (state.currentPick > totalPicks) {
      await this.completeDraft(draftId);
      return;
    }

    // Update round if needed
    if (state.currentPick > state.currentRound * teamCount) {
      state.currentRound++;
    }

    // Update current team
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: {
          include: { teams: true }
        }
      }
    });

    if (draft) {
      state.currentTeamId = this.getCurrentTeamId({
        ...draft,
        currentRound: state.currentRound,
        currentPick: state.currentPick
      });

      // Update database
      await prisma.draft.update({
        where: { id: draftId },
        data: {
          currentRound: state.currentRound,
          currentPick: state.currentPick
        }
      });
    }

    // Reset timer
    state.timeRemaining = state.settings.pickTimeLimit;

    // Start timer for next pick
    this.startPickTimer(draftId);

    // Check if next team is auto-picking
    const nextTeam = state.teams.find(t => t.id === state.currentTeamId);
    if (nextTeam?.isAutoPicking || !nextTeam?.isOnline) {
      setTimeout(() => {
        this.executeAutoPick(draftId, state.currentTeamId);
      }, state.settings.pauseBetweenPicks * 1000);
    }
  }

  /**
   * Start pick timer
   */
  private startPickTimer(draftId: string): void {
    const state = this.draftStates.get(draftId);
    if (!state || state.status !== 'IN_PROGRESS') return;

    // Clear existing timer
    this.stopPickTimer(draftId);

    // Create countdown timer
    const timer = setInterval(() => {
      const currentState = this.draftStates.get(draftId);
      if (!currentState) {
        clearInterval(timer);
        return;
      }

      currentState.timeRemaining--;
      
      // Broadcast time update every 5 seconds or when under 10 seconds
      if (currentState.timeRemaining % 5 === 0 || currentState.timeRemaining <= 10) {
        broadcastToDraft(draftId, 'draft:timerUpdate', {
          timeRemaining: currentState.timeRemaining
        });
      }

      // Time expired - auto pick
      if (currentState.timeRemaining <= 0) {
        clearInterval(timer);
        this.executeAutoPick(draftId, currentState.currentTeamId);
      }
    }, 1000);

    this.timers.set(draftId, timer);
  }

  /**
   * Stop pick timer
   */
  private stopPickTimer(draftId: string): void {
    const timer = this.timers.get(draftId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(draftId);
    }
  }

  /**
   * Execute auto-pick for a team
   */
  private async executeAutoPick(draftId: string, teamId: string): Promise<void> {
    try {
      const state = this.draftStates.get(draftId);
      if (!state) return;

      const context = {
        round: state.currentRound,
        pick: state.currentPick,
        totalRounds: state.totalRounds,
        teamCount: state.teams.length,
        scoringType: 'PPR' as const, // Get from league settings
        rosterSettings: {
          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          K: 1,
          DEF: 1,
          FLEX: 1,
          BENCH: 6
        }
      };

      const playerId = await this.autoPicker.autoPick(draftId, teamId, context);
      await this.makePick(draftId, teamId, playerId, true);
    } catch (error) {
      console.error('Auto-pick error:', error);
      // Pick best available as fallback
      const state = this.draftStates.get(draftId);
      if (state && state.availablePlayers.length > 0) {
        await this.makePick(draftId, teamId, state.availablePlayers[0].id, true);
      }
    }
  }

  /**
   * Complete the draft
   */
  private async completeDraft(draftId: string): Promise<void> {
    const state = this.draftStates.get(draftId);
    if (!state) return;

    state.status = 'COMPLETED';
    
    // Stop timer
    this.stopPickTimer(draftId);

    // Update database
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        status: 'COMPLETED'
        // TODO: Add endTime field to Draft model
      }
    });

    // Create rosters for all teams
    await this.createRosters(draftId);

    // Broadcast completion
    broadcastToDraft(draftId, 'draft:completed', {
      message: 'Draft completed successfully!'
    });

    // Clean up state after a delay
    setTimeout(() => {
      this.draftStates.delete(draftId);
    }, 60000); // Keep state for 1 minute after completion
  }

  /**
   * Create team rosters from draft picks
   */
  private async createRosters(draftId: string): Promise<void> {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        picks: {
          include: {
            player: true
          }
        },
        league: {
          include: {
            teams: true
          }
        }
      }
    });

    if (!draft) return;

    // Group picks by team
    for (const team of draft.league.teams) {
      const teamPicks = draft.picks.filter(p => p.teamId === team.id);
      
      // Create roster entries
      for (const pick of teamPicks) {
        await prisma.roster.create({
          data: {
            teamId: team.id,
            playerId: pick.playerId,
            position: this.determineRosterPosition(pick.player?.position || 'BENCH', pick.round),
            acquisitionType: 'DRAFT',
            acquisitionDate: new Date(),
          }
        });
      }
    }
  }

  /**
   * Determine roster position for a player
   */
  private determineRosterPosition(position: Position | string, round: number): Position {
    // Ensure we have a valid Position enum value
    const validPosition = typeof position === 'string' ? position as Position : position;
    
    // Early picks are likely starters
    if (round <= 7) {
      return validPosition;
    } else if (round <= 10 && (validPosition === 'RB' || validPosition === 'WR')) {
      return 'FLEX';
    } else {
      return 'BENCH';
    }
  }

  /**
   * Pause the draft
   */
  async pauseDraft(draftId: string, userId: string): Promise<void> {
    const state = this.draftStates.get(draftId);
    if (!state) return;

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: state.leagueId }
    });

    if (league?.commissionerId !== userId) {
      throw new Error('Only commissioner can pause the draft');
    }

    state.status = 'PAUSED';
    this.stopPickTimer(draftId);

    await prisma.draft.update({
      where: { id: draftId },
      data: { status: 'PAUSED' }
    });

    this.broadcastState(draftId);
  }

  /**
   * Resume the draft
   */
  async resumeDraft(draftId: string, userId: string): Promise<void> {
    const state = this.draftStates.get(draftId);
    if (!state) return;

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: state.leagueId }
    });

    if (league?.commissionerId !== userId) {
      throw new Error('Only commissioner can resume the draft');
    }

    state.status = 'IN_PROGRESS';
    this.startPickTimer(draftId);

    await prisma.draft.update({
      where: { id: draftId },
      data: { status: 'IN_PROGRESS' }
    });

    this.broadcastState(draftId);
  }

  /**
   * Update user online status
   */
  private async updateUserOnlineStatus(
    draftId: string,
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    const state = this.draftStates.get(draftId);
    if (!state) return;

    // Find user's team
    const team = await prisma.team.findFirst({
      where: {
        leagueId: state.leagueId,
        ownerId: userId
      }
    });

    if (team) {
      const teamState = state.teams.find(t => t.id === team.id);
      if (teamState) {
        teamState.isOnline = isOnline;
      }
    }
  }

  /**
   * Broadcast state update
   */
  broadcastState(draftId: string): void {
    const state = this.draftStates.get(draftId);
    if (state) {
      broadcastToDraft(draftId, 'draft:state', state);
    }
  }

  /**
   * Send notifications for draft pick
   */
  private async sendPickNotifications(draftId: string, pick: any, state: DraftState): Promise<void> {
    try {
      // Notify all league members about the pick
      await notificationService.notifyDraftPick(
        state.leagueId,
        pick.player.name,
        pick.team.name,
        pick.pickNumber
      );

      // If there's a next pick, notify that team it's their turn
      if (state.currentTeamId && state.status === 'IN_PROGRESS') {
        const nextTeam = state.teams.find(t => t.id === state.currentTeamId);
        if (nextTeam) {
          const nextTeamOwner = await prisma.team.findUnique({
            where: { id: nextTeam.id },
            include: { owner: true }
          });

          if (nextTeamOwner?.owner) {
            await notificationService.notifyDraftTurn(
              nextTeamOwner.owner.id,
              state.leagueId,
              state.currentPick,
              state.settings.pickTimeLimit / 60 // Convert seconds to minutes
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending draft notifications:', error);
    }
  }

  /**
   * Announce a pick
   */
  announcePick(draftId: string, pick: any): void {
    const announcement: ChatMessage = {
      id: `announcement-${Date.now()}`,
      userId: 'system',
      userName: 'Draft Bot',
      message: `${pick.team.name} selected ${pick.player.name} (${pick.player.position} - ${pick.player.team})`,
      timestamp: new Date(),
      type: 'PICK_ANNOUNCEMENT'
    };

    const state = this.draftStates.get(draftId);
    if (state) {
      state.chat.push(announcement);
    }

    broadcastToDraft(draftId, 'draft:pickMade', {
      pick: pick,
      announcement: announcement
    });
  }
}

// Export singleton instance
export const draftStateManager = new DraftStateManager();