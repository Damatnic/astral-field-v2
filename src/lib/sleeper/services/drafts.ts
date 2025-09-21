import { sleeperClient } from '../api/client';
import { sleeperWebSocket } from '../api/websocket';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

interface SleeperDraftData {
  draft_id: string;
  type: string;
  status: string;
  sport: string;
  season: string;
  season_type: string;
  settings: {
    teams: number;
    slots_rb: number;
    slots_wr: number;
    slots_qb: number;
    slots_te: number;
    slots_k: number;
    slots_def: number;
    slots_flex: number;
    slots_super_flex: number;
    slots_bn: number;
    rounds: number;
    reversal_round: number;
    nomination_timer: number;
    pick_timer: number;
    budget: number;
    alpha_sort: number;
    enforce_position_limits: number;
    cpu_autopick: number;
  };
  draft_order: Record<string, number>;
  slot_to_roster_id: Record<string, number>;
  creators: string[];
  created: number;
  last_picked: number;
  last_message_id: string;
  last_message_time: number;
  league_id: string;
  metadata: Record<string, any>;
}

interface SleeperDraftPick {
  player_id: string;
  picked_by: string;
  roster_id: number;
  round: number;
  draft_slot: number;
  pick_no: number;
  metadata: {
    team: string;
    status: string;
    sport: string;
    position: string;
    player_id: string;
    amount: string;
    first_name: string;
    last_name: string;
  };
  is_keeper: boolean;
  draft_id: string;
}

interface DraftBoard {
  draftId: string;
  picks: SleeperDraftPick[];
  currentPick: {
    round: number;
    pickNumber: number;
    rosterId: number;
    timeRemaining?: number;
  };
  draftOrder: Record<string, number>;
  availablePlayers: any[];
  rosterComposition: Record<number, {
    rosterId: number;
    picks: SleeperDraftPick[];
    positionCounts: Record<string, number>;
    needsAssessment: string[];
  }>;
}

interface DraftStrategy {
  draftId: string;
  rosterId: number;
  strategy: 'best_available' | 'positional_need' | 'value_based' | 'custom';
  positionPriorities: string[];
  targetPlayers: string[];
  avoidPlayers: string[];
  budgetAllocation?: Record<string, number>; // For auction drafts
  notes: string;
}

export class SleeperDraftService extends EventEmitter {
  private activeDrafts: Map<string, DraftBoard> = new Map();
  private draftStrategies: Map<string, DraftStrategy> = new Map();
  private draftIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    sleeperWebSocket.on('draftPick', this.handleDraftPick.bind(this));
    sleeperWebSocket.on('draftUpdate', this.handleDraftUpdate.bind(this));
    sleeperWebSocket.on('connected', this.resubscribeToActiveDrafts.bind(this));
  }

  private async handleDraftPick(data: any): Promise<void> {
    try {
      console.log('Draft pick received:', data);
      
      // Process the draft pick
      await this.processDraftPick(data);
      
      // Update draft board
      const draftBoard = this.activeDrafts.get(data.draft_id);
      if (draftBoard) {
        await this.updateDraftBoard(data.draft_id);
      }
      
      // Emit pick event
      this.emit('draftPick', data);
    } catch (error) {
      console.error('Error handling draft pick:', error);
      this.emit('draftError', { draftId: data.draft_id, error });
    }
  }

  private async handleDraftUpdate(data: any): Promise<void> {
    try {
      console.log('Draft update received:', data);
      
      // Update draft status
      if (data.draft_id) {
        await this.syncDraft(data.draft_id);
        this.emit('draftUpdate', data);
      }
    } catch (error) {
      console.error('Error handling draft update:', error);
    }
  }

  private async resubscribeToActiveDrafts(): Promise<void> {
    for (const draftId of this.activeDrafts.keys()) {
      sleeperWebSocket.subscribeToDraft(draftId);
    }
  }

  async syncDraft(draftId: string): Promise<{
    draft: boolean;
    picks: number;
    tradingBlock: number;
  }> {
    try {
      console.log(`Starting draft sync for: ${draftId}`);
      
      // Get draft data
      const draftData = await sleeperClient.getDraft(draftId);
      
      if (!draftData) {
        throw new Error(`Draft ${draftId} not found`);
      }

      // Sync draft settings
      await this.processDraftData(draftData);
      
      // Sync draft picks
      const picksResult = await this.syncDraftPicks(draftId);
      
      // Sync trading block
      const tradingBlockResult = await this.syncTradingBlock(draftId);

      console.log(`Draft sync completed for: ${draftId}`);
      
      return {
        draft: true,
        picks: picksResult,
        tradingBlock: tradingBlockResult
      };
    } catch (error) {
      console.error(`Error syncing draft ${draftId}:`, error);
      throw error;
    }
  }

  private async processDraftData(draftData: SleeperDraftData): Promise<void> {
    await prisma.sleeperDraft.upsert({
      where: { id: draftData.draft_id },
      update: {
        type: draftData.type,
        status: draftData.status,
        settings: draftData.settings,
        draftOrder: draftData.draft_order,
        slotToRosterId: draftData.slot_to_roster_id,
        creators: draftData.creators,
        lastPicked: new Date(draftData.last_picked),
        lastMessageId: draftData.last_message_id,
        lastMessageTime: new Date(draftData.last_message_time),
        metadata: draftData.metadata,
        syncedAt: new Date()
      },
      create: {
        id: draftData.draft_id,
        type: draftData.type,
        status: draftData.status,
        sport: draftData.sport,
        season: draftData.season,
        seasonType: draftData.season_type,
        leagueId: draftData.league_id,
        settings: draftData.settings,
        draftOrder: draftData.draft_order,
        slotToRosterId: draftData.slot_to_roster_id,
        creators: draftData.creators,
        created: new Date(draftData.created),
        lastPicked: new Date(draftData.last_picked),
        lastMessageId: draftData.last_message_id,
        lastMessageTime: new Date(draftData.last_message_time),
        metadata: draftData.metadata
      }
    });
  }

  async syncDraftPicks(draftId: string): Promise<number> {
    try {
      const picks = await sleeperClient.getDraftPicks(draftId);
      let pickCount = 0;

      for (const pick of picks) {
        await this.processDraftPick(pick);
        pickCount++;
      }

      return pickCount;
    } catch (error) {
      console.error(`Error syncing picks for draft ${draftId}:`, error);
      return 0;
    }
  }

  private async processDraftPick(pick: SleeperDraftPick): Promise<void> {
    await prisma.sleeperDraftPick.upsert({
      where: {
        draftId_pickNo: {
          draftId: pick.draft_id,
          pickNo: pick.pick_no
        }
      },
      update: {
        playerId: pick.player_id,
        pickedBy: pick.picked_by,
        rosterId: pick.roster_id,
        round: pick.round,
        draftSlot: pick.draft_slot,
        metadata: pick.metadata,
        isKeeper: pick.is_keeper,
        syncedAt: new Date()
      },
      create: {
        draftId: pick.draft_id,
        pickNo: pick.pick_no,
        playerId: pick.player_id,
        pickedBy: pick.picked_by,
        rosterId: pick.roster_id,
        round: pick.round,
        draftSlot: pick.draft_slot,
        metadata: pick.metadata,
        isKeeper: pick.is_keeper
      }
    });
  }

  async syncTradingBlock(draftId: string): Promise<number> {
    try {
      const tradingBlock = await sleeperClient.getDraftTradingBlock(draftId);
      let tradingBlockCount = 0;

      for (const item of tradingBlock) {
        await prisma.sleeperTradingBlock.upsert({
          where: {
            draftId_playerId: {
              draftId,
              playerId: item.player_id
            }
          },
          update: {
            rosterId: item.roster_id,
            price: item.price,
            notes: item.notes,
            syncedAt: new Date()
          },
          create: {
            draftId,
            playerId: item.player_id,
            rosterId: item.roster_id,
            price: item.price,
            notes: item.notes
          }
        });
        tradingBlockCount++;
      }

      return tradingBlockCount;
    } catch (error) {
      console.error(`Error syncing trading block for draft ${draftId}:`, error);
      return 0;
    }
  }

  async startLiveDraft(draftId: string): Promise<DraftBoard> {
    try {
      // Subscribe to WebSocket updates
      sleeperWebSocket.subscribeToDraft(draftId);
      
      // Initial sync
      await this.syncDraft(draftId);
      
      // Create draft board
      const draftBoard = await this.createDraftBoard(draftId);
      this.activeDrafts.set(draftId, draftBoard);
      
      // Start periodic updates
      const interval = setInterval(async () => {
        try {
          await this.updateDraftBoard(draftId);
        } catch (error) {
          console.error(`Error updating draft board ${draftId}:`, error);
        }
      }, 5000); // Update every 5 seconds
      
      this.draftIntervals.set(draftId, interval);
      
      this.emit('draftStarted', { draftId, draftBoard });
      
      return draftBoard;
    } catch (error) {
      console.error(`Error starting live draft ${draftId}:`, error);
      throw error;
    }
  }

  async stopLiveDraft(draftId: string): Promise<void> {
    // Unsubscribe from WebSocket
    sleeperWebSocket.unsubscribeFromDraft(draftId);
    
    // Clear interval
    const interval = this.draftIntervals.get(draftId);
    if (interval) {
      clearInterval(interval);
      this.draftIntervals.delete(draftId);
    }
    
    // Remove from active drafts
    this.activeDrafts.delete(draftId);
    
    this.emit('draftStopped', { draftId });
  }

  private async createDraftBoard(draftId: string): Promise<DraftBoard> {
    const draft = await prisma.sleeperDraft.findUnique({
      where: { id: draftId },
      include: {
        picks: {
          orderBy: { pickNo: 'asc' }
        }
      }
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const picks = draft.picks.map(pick => ({
      player_id: pick.playerId,
      picked_by: pick.pickedBy,
      roster_id: pick.rosterId,
      round: pick.round,
      draft_slot: pick.draftSlot,
      pick_no: pick.pickNo,
      metadata: pick.metadata as any,
      is_keeper: pick.isKeeper,
      draft_id: pick.draftId
    }));

    // Calculate current pick
    const totalPicks = (draft.settings as any).teams * (draft.settings as any).rounds;
    const currentPickNumber = picks.length + 1;
    const currentRound = Math.ceil(currentPickNumber / (draft.settings as any).teams);
    
    // Snake draft logic
    let currentRosterId: number;
    if (currentRound % 2 === 1) {
      // Odd round - normal order
      currentRosterId = ((currentPickNumber - 1) % (draft.settings as any).teams) + 1;
    } else {
      // Even round - reverse order
      currentRosterId = (draft.settings as any).teams - ((currentPickNumber - 1) % (draft.settings as any).teams);
    }

    // Get available players
    const pickedPlayerIds = picks.map(p => p.player_id);
    const availablePlayers = await prisma.sleeperPlayer.findMany({
      where: {
        id: { notIn: pickedPlayerIds },
        position: { in: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] }
      },
      orderBy: [
        { searchRank: 'asc' },
        { searchFullName: 'asc' }
      ],
      take: 200
    });

    // Calculate roster composition
    const rosterComposition: Record<number, any> = {};
    for (let i = 1; i <= (draft.settings as any).teams; i++) {
      const rosterPicks = picks.filter(p => p.roster_id === i);
      const positionCounts: Record<string, number> = {};
      
      rosterPicks.forEach(pick => {
        const position = pick.metadata?.position || 'UNKNOWN';
        positionCounts[position] = (positionCounts[position] || 0) + 1;
      });

      rosterComposition[i] = {
        rosterId: i,
        picks: rosterPicks,
        positionCounts,
        needsAssessment: this.calculateNeeds(positionCounts, draft.settings as any)
      };
    }

    return {
      draftId,
      picks,
      currentPick: {
        round: currentRound,
        pickNumber: currentPickNumber,
        rosterId: currentRosterId
      },
      draftOrder: draft.draftOrder as Record<string, number>,
      availablePlayers,
      rosterComposition
    };
  }

  private calculateNeeds(positionCounts: Record<string, number>, settings: any): string[] {
    const needs: string[] = [];
    
    // Basic position requirements
    const requirements = {
      QB: settings.slots_qb || 1,
      RB: (settings.slots_rb || 2) + Math.floor((settings.slots_flex || 1) / 2),
      WR: (settings.slots_wr || 2) + Math.floor((settings.slots_flex || 1) / 2),
      TE: (settings.slots_te || 1) + Math.floor((settings.slots_flex || 1) / 4),
      K: settings.slots_k || 1,
      DEF: settings.slots_def || 1
    };

    for (const [position, required] of Object.entries(requirements)) {
      const current = positionCounts[position] || 0;
      if (current < required) {
        needs.push(position);
      }
    }

    return needs;
  }

  private async updateDraftBoard(draftId: string): Promise<void> {
    const draftBoard = this.activeDrafts.get(draftId);
    if (!draftBoard) {
      return;
    }

    // Get latest picks
    const latestPicks = await prisma.sleeperDraftPick.findMany({
      where: { draftId },
      orderBy: { pickNo: 'asc' }
    });

    // Update draft board with new picks
    const updatedBoard = await this.createDraftBoard(draftId);
    this.activeDrafts.set(draftId, updatedBoard);

    // Emit update event
    this.emit('draftBoardUpdate', { draftId, draftBoard: updatedBoard });
  }

  async getDraftBoard(draftId: string): Promise<DraftBoard | null> {
    const activeDraft = this.activeDrafts.get(draftId);
    if (activeDraft) {
      return activeDraft;
    }

    try {
      return await this.createDraftBoard(draftId);
    } catch (error) {
      console.error(`Error creating draft board for ${draftId}:`, error);
      return null;
    }
  }

  async saveDraftStrategy(strategy: DraftStrategy): Promise<void> {
    const key = `${strategy.draftId}:${strategy.rosterId}`;
    this.draftStrategies.set(key, strategy);

    // Save to database
    await prisma.sleeperDraftStrategy.upsert({
      where: {
        draftId_rosterId: {
          draftId: strategy.draftId,
          rosterId: strategy.rosterId
        }
      },
      update: {
        strategy: strategy.strategy,
        positionPriorities: strategy.positionPriorities,
        targetPlayers: strategy.targetPlayers,
        avoidPlayers: strategy.avoidPlayers,
        budgetAllocation: strategy.budgetAllocation || {},
        notes: strategy.notes,
        updatedAt: new Date()
      },
      create: {
        draftId: strategy.draftId,
        rosterId: strategy.rosterId,
        strategy: strategy.strategy,
        positionPriorities: strategy.positionPriorities,
        targetPlayers: strategy.targetPlayers,
        avoidPlayers: strategy.avoidPlayers,
        budgetAllocation: strategy.budgetAllocation || {},
        notes: strategy.notes
      }
    });
  }

  async getDraftStrategy(draftId: string, rosterId: number): Promise<DraftStrategy | null> {
    const key = `${draftId}:${rosterId}`;
    const cached = this.draftStrategies.get(key);
    
    if (cached) {
      return cached;
    }

    try {
      const strategy = await prisma.sleeperDraftStrategy.findUnique({
        where: {
          draftId_rosterId: {
            draftId,
            rosterId
          }
        }
      });

      if (strategy) {
        const draftStrategy: DraftStrategy = {
          draftId: strategy.draftId,
          rosterId: strategy.rosterId,
          strategy: strategy.strategy as any,
          positionPriorities: strategy.positionPriorities as string[],
          targetPlayers: strategy.targetPlayers as string[],
          avoidPlayers: strategy.avoidPlayers as string[],
          budgetAllocation: strategy.budgetAllocation as Record<string, number>,
          notes: strategy.notes
        };

        this.draftStrategies.set(key, draftStrategy);
        return draftStrategy;
      }

      return null;
    } catch (error) {
      console.error(`Error getting draft strategy for ${draftId}:${rosterId}:`, error);
      return null;
    }
  }

  async getPlayerRecommendations(draftId: string, rosterId: number, count = 10): Promise<any[]> {
    const draftBoard = await this.getDraftBoard(draftId);
    const strategy = await this.getDraftStrategy(draftId, rosterId);
    
    if (!draftBoard) {
      return [];
    }

    const rosterComposition = draftBoard.rosterComposition[rosterId];
    const needs = rosterComposition?.needsAssessment || [];
    
    let availablePlayers = [...draftBoard.availablePlayers];

    // Filter out avoided players
    if (strategy?.avoidPlayers.length) {
      availablePlayers = availablePlayers.filter(p => 
        !strategy.avoidPlayers.includes(p.id)
      );
    }

    // Prioritize target players
    if (strategy?.targetPlayers.length) {
      const targetPlayers = availablePlayers.filter(p => 
        strategy.targetPlayers.includes(p.id)
      );
      const otherPlayers = availablePlayers.filter(p => 
        !strategy.targetPlayers.includes(p.id)
      );
      availablePlayers = [...targetPlayers, ...otherPlayers];
    }

    // Apply positional needs filter
    if (needs.length > 0) {
      const neededPlayers = availablePlayers.filter(p => 
        needs.includes(p.position)
      );
      const otherPlayers = availablePlayers.filter(p => 
        !needs.includes(p.position)
      );
      availablePlayers = [...neededPlayers, ...otherPlayers];
    }

    return availablePlayers.slice(0, count).map(player => ({
      ...player,
      recommendationReason: this.getRecommendationReason(player, needs, strategy)
    }));
  }

  private getRecommendationReason(player: any, needs: string[], strategy?: DraftStrategy): string {
    if (strategy?.targetPlayers.includes(player.id)) {
      return 'Target player';
    }
    
    if (needs.includes(player.position)) {
      return `Fills ${player.position} need`;
    }
    
    return 'Best available';
  }

  // Utility methods
  getActiveDrafts(): string[] {
    return Array.from(this.activeDrafts.keys());
  }

  async stopAllLiveDrafts(): Promise<void> {
    for (const draftId of this.activeDrafts.keys()) {
      await this.stopLiveDraft(draftId);
    }
  }

  async getDraftHistory(leagueId: string): Promise<any[]> {
    return prisma.sleeperDraft.findMany({
      where: { leagueId },
      include: {
        picks: {
          orderBy: { pickNo: 'asc' }
        }
      },
      orderBy: { created: 'desc' }
    });
  }

  async getDraftAnalytics(draftId: string): Promise<any> {
    const draft = await prisma.sleeperDraft.findUnique({
      where: { id: draftId },
      include: {
        picks: {
          include: {
            player: true
          }
        }
      }
    });

    if (!draft) {
      return null;
    }

    const analytics = {
      draftId,
      totalPicks: draft.picks.length,
      positionBreakdown: {},
      teamAnalysis: {},
      draftGrades: {},
      timeline: []
    };

    // Calculate position breakdown
    const positionCounts: Record<string, number> = {};
    draft.picks.forEach(pick => {
      const position = pick.player?.position || 'UNKNOWN';
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    });
    analytics.positionBreakdown = positionCounts;

    // Calculate team analysis
    const teamAnalysis: Record<number, any> = {};
    for (let i = 1; i <= (draft.settings as any).teams; i++) {
      const teamPicks = draft.picks.filter(p => p.rosterId === i);
      teamAnalysis[i] = {
        rosterId: i,
        totalPicks: teamPicks.length,
        positions: {},
        averageRank: 0,
        draftGrade: 'B'
      };
      
      teamPicks.forEach(pick => {
        const position = pick.player?.position || 'UNKNOWN';
        teamAnalysis[i].positions[position] = (teamAnalysis[i].positions[position] || 0) + 1;
      });
    }
    analytics.teamAnalysis = teamAnalysis;

    return analytics;
  }
}

// Singleton instance
export const sleeperDraftService = new SleeperDraftService();