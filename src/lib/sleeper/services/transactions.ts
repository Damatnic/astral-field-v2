import { sleeperClient } from '../api/client';
import { sleeperWebSocket } from '../api/websocket';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

interface SleeperTransactionData {
  transaction_id: string;
  type: 'waiver' | 'free_agent' | 'trade' | 'commissioner';
  status: 'complete' | 'failed' | 'pending';
  leg: number;
  created: number;
  roster_ids: number[];
  consenter_ids: number[];
  waiver_budget: Record<string, number>;
  settings: {
    waiver_bid: number;
    seq: number;
  };
  adds: Record<string, number> | null; // player_id -> roster_id
  drops: Record<string, number> | null; // player_id -> roster_id
  draft_picks: Array<{
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id: number;
    owner_id: number;
  }>;
  metadata: {
    notes?: string;
    trade_notes?: string;
    waiver_budget_used?: number;
  };
  status_updated: number;
  scoring_type: string;
  league_id: string;
}

interface TradeAnalysis {
  transactionId: string;
  fairnessScore: number; // 0-100
  rosterId1: number;
  rosterId2: number;
  roster1Value: number;
  roster2Value: number;
  positionImpact: Record<string, number>;
  recommendations: string[];
  warnings: string[];
}

interface WaiverClaim {
  transactionId: string;
  rosterId: number;
  playerId: string;
  droppedPlayerId?: string;
  bidAmount: number;
  priority: number;
  status: 'pending' | 'successful' | 'failed';
  processedAt?: Date;
  failureReason?: string;
}

interface TransactionRule {
  leagueId: string;
  type: 'trade_deadline' | 'waiver_period' | 'roster_lock' | 'transaction_limit';
  settings: Record<string, any>;
  isActive: boolean;
}

export class SleeperTransactionService extends EventEmitter {
  private activeWaiverClaims: Map<string, WaiverClaim[]> = new Map();
  private transactionRules: Map<string, TransactionRule[]> = new Map();
  private processingQueues: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    sleeperWebSocket.on('transaction', this.handleTransactionUpdate.bind(this));
    sleeperWebSocket.on('tradeOffer', this.handleTradeOffer.bind(this));
    sleeperWebSocket.on('tradeAccepted', this.handleTradeAccepted.bind(this));
    sleeperWebSocket.on('tradeRejected', this.handleTradeRejected.bind(this));
    sleeperWebSocket.on('connected', this.resubscribeToActiveLeagues.bind(this));
  }

  private async handleTransactionUpdate(data: any): Promise<void> {
    try {
      console.log('Transaction update received:', data);
      
      // Process the transaction
      await this.processTransaction(data);
      
      // Emit transaction event
      this.emit('transactionUpdate', data);
      
      // Handle specific transaction types
      if (data.type === 'waiver') {
        await this.processWaiverResult(data);
      } else if (data.type === 'trade') {
        await this.processTradeCompletion(data);
      }
    } catch (error) {
      console.error('Error handling transaction update:', error);
      this.emit('transactionError', { transactionId: data.transaction_id, error });
    }
  }

  private async handleTradeOffer(data: any): Promise<void> {
    try {
      console.log('Trade offer received:', data);
      
      // Analyze the trade
      const analysis = await this.analyzeTradeOffer(data);
      
      // Store pending trade
      await this.storePendingTrade(data, analysis);
      
      this.emit('tradeOffer', { data, analysis });
    } catch (error) {
      console.error('Error handling trade offer:', error);
    }
  }

  private async handleTradeAccepted(data: any): Promise<void> {
    this.emit('tradeAccepted', data);
  }

  private async handleTradeRejected(data: any): Promise<void> {
    this.emit('tradeRejected', data);
  }

  private async resubscribeToActiveLeagues(): Promise<void> {
    // Get all leagues with active monitoring
    const activeLeagues = await prisma.sleeperLeague.findMany({
      where: {
        status: { in: ['in_season', 'post_season', 'drafting'] }
      },
      select: { id: true }
    });

    for (const league of activeLeagues) {
      sleeperWebSocket.subscribeToTransactions(league.id);
      sleeperWebSocket.subscribeToTrades(league.id);
    }
  }

  async syncLeagueTransactions(leagueId: string, round?: number): Promise<{
    transactions: number;
    errors: string[];
  }> {
    try {
      console.log(`Starting transaction sync for league: ${leagueId}`);
      
      const transactions = await sleeperClient.getLeagueTransactions(leagueId, round);
      const errors: string[] = [];
      let transactionCount = 0;

      for (const transaction of transactions) {
        try {
          await this.processTransaction(transaction);
          transactionCount++;
        } catch (error) {
          const errorMsg = `Transaction ${transaction.transaction_id}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Transaction sync completed: ${transactionCount} transactions, ${errors.length} errors`);
      
      return {
        transactions: transactionCount,
        errors
      };
    } catch (error) {
      console.error(`Error syncing transactions for league ${leagueId}:`, error);
      throw error;
    }
  }

  private async processTransaction(transactionData: SleeperTransactionData): Promise<void> {
    // Store transaction in database
    await prisma.sleeperTransaction.upsert({
      where: { transactionId: transactionData.transaction_id },
      update: {
        status: transactionData.status,
        statusUpdated: new Date(transactionData.status_updated),
        metadata: transactionData.metadata,
        syncedAt: new Date()
      },
      create: {
        id: transactionData.transaction_id,
        transactionId: transactionData.transaction_id,
        type: transactionData.type,
        leagueId: transactionData.league_id,
        status: transactionData.status,
        leg: transactionData.leg,
        scoringType: transactionData.scoring_type,
        adds: transactionData.adds,
        drops: transactionData.drops,
        rosterIds: transactionData.roster_ids,
        waiverBudget: transactionData.waiver_budget,
        freeAgentBudget: transactionData.settings?.waiver_bid || 0,
        consenterIds: transactionData.consenter_ids,
        draftPicks: transactionData.draft_picks,
        settings: transactionData.settings,
        metadata: transactionData.metadata,
        statusUpdated: new Date(transactionData.status_updated),
        created: new Date(transactionData.created)
      }
    });

    // Update roster compositions if transaction is complete
    if (transactionData.status === 'complete') {
      await this.updateRosterCompositions(transactionData);
    }

    // Log transaction for analytics
    await this.logTransactionAnalytics(transactionData);
  }

  private async updateRosterCompositions(transaction: SleeperTransactionData): Promise<void> {
    // Handle player additions
    if (transaction.adds) {
      for (const [playerId, rosterId] of Object.entries(transaction.adds)) {
        await this.addPlayerToRoster(transaction.league_id, rosterId, playerId);
      }
    }

    // Handle player drops
    if (transaction.drops) {
      for (const [playerId, rosterId] of Object.entries(transaction.drops)) {
        await this.removePlayerFromRoster(transaction.league_id, rosterId, playerId);
      }
    }

    // Handle draft pick trades
    if (transaction.draft_picks && transaction.draft_picks.length > 0) {
      for (const pick of transaction.draft_picks) {
        await this.transferDraftPick(
          transaction.league_id,
          pick.season,
          pick.round,
          pick.previous_owner_id,
          pick.owner_id
        );
      }
    }
  }

  private async addPlayerToRoster(leagueId: string, rosterId: number, playerId: string): Promise<void> {
    const roster = await prisma.sleeperRoster.findUnique({
      where: {
        leagueId_rosterId: { leagueId, rosterId }
      }
    });

    if (roster) {
      const currentPlayers = roster.players as string[];
      if (!currentPlayers.includes(playerId)) {
        await prisma.sleeperRoster.update({
          where: {
            leagueId_rosterId: { leagueId, rosterId }
          },
          data: {
            players: [...currentPlayers, playerId],
            syncedAt: new Date()
          }
        });
      }
    }
  }

  private async removePlayerFromRoster(leagueId: string, rosterId: number, playerId: string): Promise<void> {
    const roster = await prisma.sleeperRoster.findUnique({
      where: {
        leagueId_rosterId: { leagueId, rosterId }
      }
    });

    if (roster) {
      const currentPlayers = roster.players as string[];
      const updatedPlayers = currentPlayers.filter(id => id !== playerId);
      
      await prisma.sleeperRoster.update({
        where: {
          leagueId_rosterId: { leagueId, rosterId }
        },
        data: {
          players: updatedPlayers,
          syncedAt: new Date()
        }
      });
    }
  }

  private async transferDraftPick(
    leagueId: string,
    season: string,
    round: number,
    fromRosterId: number,
    toRosterId: number
  ): Promise<void> {
    // Log draft pick transfer
    await prisma.sleeperDraftPickTrade.create({
      data: {
        leagueId,
        season,
        round,
        fromRosterId,
        toRosterId,
        tradedAt: new Date()
      }
    });
  }

  async analyzeTradeOffer(tradeData: any): Promise<TradeAnalysis> {
    const { roster_ids, adds, drops } = tradeData;
    
    if (!roster_ids || roster_ids.length !== 2) {
      throw new Error('Invalid trade data: must involve exactly 2 rosters');
    }

    const [rosterId1, rosterId2] = roster_ids;
    
    // Get players being traded
    const roster1GetsPlayers = adds ? Object.keys(adds).filter(playerId => adds[playerId] === rosterId1) : [];
    const roster1GivesPlayers = drops ? Object.keys(drops).filter(playerId => drops[playerId] === rosterId1) : [];
    
    const roster2GetsPlayers = adds ? Object.keys(adds).filter(playerId => adds[playerId] === rosterId2) : [];
    const roster2GivesPlayers = drops ? Object.keys(drops).filter(playerId => drops[playerId] === rosterId2) : [];

    // Calculate trade values (simplified - in reality would use more complex algorithms)
    const roster1Value = await this.calculatePlayersValue([...roster1GetsPlayers, ...roster2GivesPlayers]);
    const roster2Value = await this.calculatePlayersValue([...roster2GetsPlayers, ...roster1GivesPlayers]);

    // Calculate fairness score
    const totalValue = roster1Value + roster2Value;
    const fairnessScore = totalValue > 0 
      ? Math.round((1 - Math.abs(roster1Value - roster2Value) / totalValue) * 100)
      : 50;

    // Analyze positional impact
    const positionImpact = await this.analyzePositionalImpact(
      roster1GetsPlayers,
      roster1GivesPlayers,
      roster2GetsPlayers,
      roster2GivesPlayers
    );

    // Generate recommendations and warnings
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (fairnessScore < 70) {
      warnings.push('Trade appears significantly imbalanced');
    }
    
    if (fairnessScore >= 85) {
      recommendations.push('Trade appears fair for both parties');
    }

    return {
      transactionId: tradeData.transaction_id,
      fairnessScore,
      rosterId1,
      rosterId2,
      roster1Value,
      roster2Value,
      positionImpact,
      recommendations,
      warnings
    };
  }

  private async calculatePlayersValue(playerIds: string[]): Promise<number> {
    if (playerIds.length === 0) return 0;

    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: playerIds } },
      select: { searchRank: true }
    });

    // Simple value calculation based on search rank (lower rank = higher value)
    return players.reduce((total, player) => {
      const rank = player.searchRank || 9999;
      // Convert rank to value (rank 1 = 1000 points, rank 100 = 900 points, etc.)
      const value = Math.max(0, 1000 - rank);
      return total + value;
    }, 0);
  }

  private async analyzePositionalImpact(
    roster1Gets: string[],
    roster1Gives: string[],
    roster2Gets: string[],
    roster2Gives: string[]
  ): Promise<Record<string, number>> {
    const allPlayerIds = [...roster1Gets, ...roster1Gives, ...roster2Gets, ...roster2Gives];
    
    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: allPlayerIds } },
      select: { id: true, position: true }
    });

    const playerPositions = new Map(players.map(p => [p.id, p.position]));
    const impact: Record<string, number> = {};

    // Calculate net positional changes for roster 1
    [...roster1Gets, ...roster1Gives].forEach(playerId => {
      const position = playerPositions.get(playerId) || 'UNKNOWN';
      const isGetting = roster1Gets.includes(playerId);
      impact[position] = (impact[position] || 0) + (isGetting ? 1 : -1);
    });

    return impact;
  }

  private async storePendingTrade(tradeData: any, analysis: TradeAnalysis): Promise<void> {
    await prisma.sleeperPendingTrade.create({
      data: {
        transactionId: tradeData.transaction_id,
        leagueId: tradeData.league_id,
        rosterIds: tradeData.roster_ids,
        adds: tradeData.adds || {},
        drops: tradeData.drops || {},
        draftPicks: tradeData.draft_picks || [],
        fairnessScore: analysis.fairnessScore,
        analysis: analysis as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending'
      }
    });
  }

  async processWaiverClaims(leagueId: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const pendingClaims = this.activeWaiverClaims.get(leagueId) || [];
    
    if (pendingClaims.length === 0) {
      return { processed: 0, successful: 0, failed: 0 };
    }

    // Sort by priority and bid amount
    pendingClaims.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher priority
      }
      return b.bidAmount - a.bidAmount; // Higher bid wins
    });

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const claim of pendingClaims) {
      try {
        const result = await this.processWaiverClaim(leagueId, claim);
        
        if (result.success) {
          successful++;
          claim.status = 'successful';
          claim.processedAt = new Date();
        } else {
          failed++;
          claim.status = 'failed';
          claim.failureReason = result.reason;
          claim.processedAt = new Date();
        }
        
        processed++;
        
        // Emit claim result
        this.emit('waiverClaimProcessed', { leagueId, claim, result });
      } catch (error) {
        console.error(`Error processing waiver claim ${claim.transactionId}:`, error);
        failed++;
        claim.status = 'failed';
        claim.failureReason = 'Processing error';
        claim.processedAt = new Date();
      }
    }

    // Clear processed claims
    this.activeWaiverClaims.delete(leagueId);

    return { processed, successful, failed };
  }

  private async processWaiverClaim(leagueId: string, claim: WaiverClaim): Promise<{
    success: boolean;
    reason?: string;
  }> {
    // Check if player is still available
    const playerAvailable = await this.isPlayerAvailable(leagueId, claim.playerId);
    if (!playerAvailable) {
      return { success: false, reason: 'Player no longer available' };
    }

    // Check roster space
    const hasRosterSpace = await this.hasRosterSpace(leagueId, claim.rosterId, claim.droppedPlayerId);
    if (!hasRosterSpace) {
      return { success: false, reason: 'Insufficient roster space' };
    }

    // Check waiver budget
    const hasEnoughBudget = await this.hasWaiverBudget(leagueId, claim.rosterId, claim.bidAmount);
    if (!hasEnoughBudget) {
      return { success: false, reason: 'Insufficient waiver budget' };
    }

    // Process the claim
    await this.executeWaiverClaim(leagueId, claim);
    
    return { success: true };
  }

  private async isPlayerAvailable(leagueId: string, playerId: string): Promise<boolean> {
    const rosters = await prisma.sleeperRoster.findMany({
      where: { leagueId },
      select: { players: true }
    });

    return !rosters.some(roster => (roster.players as string[]).includes(playerId));
  }

  private async hasRosterSpace(leagueId: string, rosterId: number, droppedPlayerId?: string): Promise<boolean> {
    const roster = await prisma.sleeperRoster.findUnique({
      where: { leagueId_rosterId: { leagueId, rosterId } },
      select: { players: true }
    });

    if (!roster) return false;

    const currentPlayers = roster.players as string[];
    const effectivePlayerCount = droppedPlayerId 
      ? currentPlayers.length // Will drop one and add one
      : currentPlayers.length + 1; // Just adding one

    // Assume max roster size of 16 (should get from league settings)
    return effectivePlayerCount <= 16;
  }

  private async hasWaiverBudget(leagueId: string, rosterId: number, bidAmount: number): Promise<boolean> {
    // Get current waiver budget from roster settings
    const roster = await prisma.sleeperRoster.findUnique({
      where: { leagueId_rosterId: { leagueId, rosterId } },
      select: { settings: true }
    });

    if (!roster) return false;

    const settings = roster.settings as Record<string, any>;
    const currentBudget = settings.waiver_budget || 100; // Default budget

    return currentBudget >= bidAmount;
  }

  private async executeWaiverClaim(leagueId: string, claim: WaiverClaim): Promise<void> {
    // This would typically make an API call to Sleeper to execute the claim
    // For now, we'll simulate the transaction
    
    const transactionData: Partial<SleeperTransactionData> = {
      transaction_id: claim.transactionId,
      type: 'waiver',
      status: 'complete',
      league_id: leagueId,
      roster_ids: [claim.rosterId],
      adds: { [claim.playerId]: claim.rosterId },
      drops: claim.droppedPlayerId ? { [claim.droppedPlayerId]: claim.rosterId } : null,
      settings: { waiver_bid: claim.bidAmount, seq: 1 },
      created: Date.now(),
      status_updated: Date.now()
    };

    await this.processTransaction(transactionData as SleeperTransactionData);
  }

  private async processWaiverResult(transaction: SleeperTransactionData): Promise<void> {
    // Update waiver claim status based on transaction result
    this.emit('waiverResult', {
      transactionId: transaction.transaction_id,
      status: transaction.status,
      adds: transaction.adds,
      drops: transaction.drops
    });
  }

  private async processTradeCompletion(transaction: SleeperTransactionData): Promise<void> {
    // Clean up pending trade
    await prisma.sleeperPendingTrade.updateMany({
      where: { transactionId: transaction.transaction_id },
      data: { status: 'completed', completedAt: new Date() }
    });

    this.emit('tradeCompleted', transaction);
  }

  private async logTransactionAnalytics(transaction: SleeperTransactionData): Promise<void> {
    // Log transaction for analytics and reporting
    await prisma.sleeperTransactionAnalytics.create({
      data: {
        transactionId: transaction.transaction_id,
        leagueId: transaction.league_id,
        type: transaction.type,
        playerCount: this.getPlayerCount(transaction),
        totalValue: await this.calculateTransactionValue(transaction),
        timestamp: new Date(transaction.created)
      }
    });
  }

  private getPlayerCount(transaction: SleeperTransactionData): number {
    const addsCount = transaction.adds ? Object.keys(transaction.adds).length : 0;
    const dropsCount = transaction.drops ? Object.keys(transaction.drops).length : 0;
    return addsCount + dropsCount;
  }

  private async calculateTransactionValue(transaction: SleeperTransactionData): Promise<number> {
    const playerIds: string[] = [];
    
    if (transaction.adds) {
      playerIds.push(...Object.keys(transaction.adds));
    }
    
    if (transaction.drops) {
      playerIds.push(...Object.keys(transaction.drops));
    }

    return this.calculatePlayersValue(playerIds);
  }

  // Public API methods

  async startTransactionMonitoring(leagueId: string): Promise<void> {
    sleeperWebSocket.subscribeToTransactions(leagueId);
    sleeperWebSocket.subscribeToTrades(leagueId);
    
    // Initial sync
    await this.syncLeagueTransactions(leagueId);
    
    this.emit('monitoringStarted', { leagueId });
  }

  async stopTransactionMonitoring(leagueId: string): Promise<void> {
    sleeperWebSocket.unsubscribeFromTransactions(leagueId);
    sleeperWebSocket.unsubscribeFromTrades(leagueId);
    
    // Clear any pending waiver claims
    this.activeWaiverClaims.delete(leagueId);
    
    this.emit('monitoringStopped', { leagueId });
  }

  async getTransactionHistory(leagueId: string, limit = 50): Promise<any[]> {
    return prisma.sleeperTransaction.findMany({
      where: { leagueId },
      orderBy: { created: 'desc' },
      take: limit,
      include: {
        league: {
          select: { name: true }
        }
      }
    });
  }

  async getPendingTrades(leagueId: string): Promise<any[]> {
    return prisma.sleeperPendingTrade.findMany({
      where: { 
        leagueId,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTransactionAnalytics(leagueId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = { leagueId };
    
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    const analytics = await prisma.sleeperTransactionAnalytics.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' }
    });

    // Aggregate data
    const summary = {
      totalTransactions: analytics.length,
      byType: {} as Record<string, number>,
      totalValue: 0,
      averageValue: 0,
      mostActiveDay: null as string | null,
      timeline: [] as any[]
    };

    analytics.forEach(t => {
      summary.byType[t.type] = (summary.byType[t.type] || 0) + 1;
      summary.totalValue += t.totalValue;
    });

    summary.averageValue = analytics.length > 0 ? summary.totalValue / analytics.length : 0;

    return summary;
  }
}

// Singleton instance
export const sleeperTransactionService = new SleeperTransactionService();