/**
 * Real-Time Stream Processor - Vortex Analytics
 * Processes live scoring updates, injury reports, and fantasy events
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import VortexAnalyticsEngine from './vortex-analytics-engine';

export interface StreamEvent {
  id: string;
  type: 'SCORE_UPDATE' | 'INJURY' | 'TRADE' | 'WAIVER_CLAIM' | 'LINEUP_CHANGE';
  timestamp: Date;
  playerId?: string;
  teamId?: string;
  matchupId?: string;
  data: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ScoreUpdate {
  playerId: string;
  gameId: string;
  quarter: number;
  timeRemaining: string;
  fantasyPoints: number;
  stats: {
    passingYards?: number;
    rushingYards?: number;
    receivingYards?: number;
    touchdowns?: number;
    receptions?: number;
    targets?: number;
  };
}

export interface InjuryReport {
  playerId: string;
  severity: 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'IR';
  description: string;
  estimatedReturn?: string;
  impactAssessment: number; // 0-1 scale
}

export interface LineupChange {
  teamId: string;
  playerId: string;
  action: 'START' | 'BENCH' | 'DROP' | 'ADD';
  position: string;
  timestamp: Date;
}

export class RealTimeStreamProcessor extends EventEmitter {
  private analyticsEngine: VortexAnalyticsEngine;
  private wsServer?: any;
  private clients: Set<WebSocket> = new Set();
  private eventQueue: StreamEvent[] = [];
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(analyticsEngine: VortexAnalyticsEngine) {
    super();
    this.analyticsEngine = analyticsEngine;
    this.setupEventHandlers();
    this.startProcessingLoop();
  }

  /**
   * Initialize WebSocket server for real-time updates
   */
  initializeWebSocketServer(port: number = 8080): void {
    this.wsServer = new (WebSocket as any).Server({ port });
    
    this.wsServer.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      
      // Send initial analytics data
      this.sendInitialData(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        if (process.env.NODE_ENV === 'development') {

          console.error('WebSocket error:', error);

        }
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Process incoming live events
   */
  async processLiveEvent(event: StreamEvent): Promise<void> {
    // Add to processing queue
    this.eventQueue.push(event);
    
    // Emit to all connected clients immediately
    this.broadcastEvent(event);
    
    // Log high priority events
    if (event.priority === 'HIGH' || event.priority === 'CRITICAL') {
      console.log(`🚨 ${event.priority} event: ${event.type} for ${event.playerId || event.teamId}`);
    }
  }

  /**
   * Process score updates from live games
   */
  async processScoreUpdate(update: ScoreUpdate): Promise<void> {
    const event: StreamEvent = {
      id: `score_${update.playerId}_${Date.now()}`,
      type: 'SCORE_UPDATE',
      timestamp: new Date(),
      playerId: update.playerId,
      data: update,
      priority: update.fantasyPoints > 5 ? 'HIGH' : 'MEDIUM'
    };

    await this.processLiveEvent(event);
    
    // Update player stats in real-time
    await this.updatePlayerLiveStats(update);
    
    // Trigger matchup recalculations if significant scoring
    if (update.fantasyPoints > 10) {
      await this.recalculateAffectedMatchups(update.playerId);
    }
  }

  /**
   * Process injury reports
   */
  async processInjuryReport(injury: InjuryReport): Promise<void> {
    const event: StreamEvent = {
      id: `injury_${injury.playerId}_${Date.now()}`,
      type: 'INJURY',
      timestamp: new Date(),
      playerId: injury.playerId,
      data: injury,
      priority: injury.severity === 'OUT' || injury.severity === 'IR' ? 'CRITICAL' : 'HIGH'
    };

    await this.processLiveEvent(event);
    
    // Update waiver wire recommendations
    await this.updateWaiverRecommendations(injury);
    
    // Alert affected team owners
    await this.alertAffectedOwners(injury);
  }

  /**
   * Process lineup changes
   */
  async processLineupChange(change: LineupChange): Promise<void> {
    const event: StreamEvent = {
      id: `lineup_${change.teamId}_${Date.now()}`,
      type: 'LINEUP_CHANGE',
      timestamp: new Date(),
      teamId: change.teamId,
      playerId: change.playerId,
      data: change,
      priority: 'MEDIUM'
    };

    await this.processLiveEvent(event);
    
    // Recalculate team projections
    await this.updateTeamProjections(change.teamId);
  }

  /**
   * Setup event processing handlers
   */
  private setupEventHandlers(): void {
    this.on('scoreUpdate', this.processScoreUpdate.bind(this));
    this.on('injuryReport', this.processInjuryReport.bind(this));
    this.on('lineupChange', this.processLineupChange.bind(this));
  }

  /**
   * Start the event processing loop
   */
  private startProcessingLoop(): void {
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing || this.eventQueue.length === 0) return;
      
      this.isProcessing = true;
      
      try {
        // Process events in batches
        const batchSize = 10;
        const batch = this.eventQueue.splice(0, batchSize);
        
        await this.processBatchEvents(batch);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('❌ Event processing error:', error);

        }
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Process a batch of events efficiently
   */
  private async processBatchEvents(events: StreamEvent[]): Promise<void> {
    // Group events by type for efficient processing
    const eventGroups = events.reduce((groups, event) => {
      if (!groups[event.type]) groups[event.type] = [];
      groups[event.type].push(event);
      return groups;
    }, {} as Record<string, StreamEvent[]>);

    // Process each type in parallel
    const processingPromises = Object.entries(eventGroups).map(([type, typeEvents]) => {
      switch (type) {
        case 'SCORE_UPDATE':
          return this.processBatchScoreUpdates(typeEvents);
        case 'INJURY':
          return this.processBatchInjuries(typeEvents);
        case 'LINEUP_CHANGE':
          return this.processBatchLineupChanges(typeEvents);
        default:
          return Promise.resolve();
      }
    });

    await Promise.all(processingPromises);
  }

  /**
   * Process batch score updates
   */
  private async processBatchScoreUpdates(events: StreamEvent[]): Promise<void> {
    const updates = events.map(e => e.data as ScoreUpdate);
    
    // Update analytics engine with batch data
    for (const update of updates) {
      await this.analyticsEngine.processRealTimeEvent(
        'SCORE_UPDATE', 
        'PLAYER', 
        update.playerId, 
        update
      );
    }
    
    // Broadcast aggregated updates
    this.broadcastBatchUpdate('SCORE_UPDATES', updates);
  }

  /**
   * Process batch injury reports
   */
  private async processBatchInjuries(events: StreamEvent[]): Promise<void> {
    const injuries = events.map(e => e.data as InjuryReport);
    
    for (const injury of injuries) {
      await this.analyticsEngine.processRealTimeEvent(
        'INJURY', 
        'PLAYER', 
        injury.playerId, 
        injury
      );
    }
    
    this.broadcastBatchUpdate('INJURIES', injuries);
  }

  /**
   * Process batch lineup changes
   */
  private async processBatchLineupChanges(events: StreamEvent[]): Promise<void> {
    const changes = events.map(e => e.data as LineupChange);
    
    // Group by team for efficient processing
    const teamChanges = changes.reduce((groups, change) => {
      if (!groups[change.teamId]) groups[change.teamId] = [];
      groups[change.teamId].push(change);
      return groups;
    }, {} as Record<string, LineupChange[]>);

    // Process each team's changes
    for (const [teamId, changes] of Object.entries(teamChanges)) {
      await this.updateTeamProjections(teamId);
      
      for (const change of changes) {
        await this.analyticsEngine.processRealTimeEvent(
          'LINEUP_CHANGE', 
          'TEAM', 
          teamId, 
          change
        );
      }
    }
    
    this.broadcastBatchUpdate('LINEUP_CHANGES', changes);
  }

  /**
   * Update player live stats
   */
  private async updatePlayerLiveStats(update: ScoreUpdate): Promise<void> {
    // This would update live stats in the database
    // For now, we'll emit an event for the UI to handle
    this.emit('playerStatsUpdate', {
      playerId: update.playerId,
      fantasyPoints: update.fantasyPoints,
      stats: update.stats,
      timestamp: new Date()
    });
  }

  /**
   * Recalculate affected matchups
   */
  private async recalculateAffectedMatchups(playerId: string): Promise<void> {
    // Find matchups involving teams that have this player
    // Recalculate projections and win probabilities
    this.emit('matchupUpdate', {
      playerId,
      recalculateProjections: true,
      timestamp: new Date()
    });
  }

  /**
   * Update waiver wire recommendations based on injuries
   */
  private async updateWaiverRecommendations(injury: InjuryReport): Promise<void> {
    if (injury.severity === 'OUT' || injury.severity === 'IR') {
      // Find replacement players at the same position
      this.emit('waiverUpdate', {
        injuredPlayerId: injury.playerId,
        severity: injury.severity,
        findReplacements: true,
        timestamp: new Date()
      });
    }
  }

  /**
   * Alert affected team owners
   */
  private async alertAffectedOwners(injury: InjuryReport): Promise<void> {
    this.emit('ownerAlert', {
      type: 'INJURY',
      playerId: injury.playerId,
      severity: injury.severity,
      message: `${injury.description}`,
      timestamp: new Date()
    });
  }

  /**
   * Update team projections
   */
  private async updateTeamProjections(teamId: string): Promise<void> {
    this.emit('teamProjectionUpdate', {
      teamId,
      recalculate: true,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast event to all connected clients
   */
  private broadcastEvent(event: StreamEvent): void {
    const message = JSON.stringify({
      type: 'LIVE_EVENT',
      event
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {

            console.error('Error sending to client:', error);

          }
          this.clients.delete(client);
        }
      }
    });
  }

  /**
   * Broadcast batch updates
   */
  private broadcastBatchUpdate(type: string, data: any[]): void {
    const message = JSON.stringify({
      type: 'BATCH_UPDATE',
      updateType: type,
      data,
      timestamp: new Date()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {

            console.error('Error sending batch update:', error);

          }
          this.clients.delete(client);
        }
      }
    });
  }

  /**
   * Send initial data to new clients
   */
  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      // Send current week analytics
      const currentWeek = 3; // Would be dynamic
      const season = 2025;
      
      const initialData = {
        type: 'INITIAL_DATA',
        week: currentWeek,
        season,
        data: {
          playerAnalytics: await this.analyticsEngine.getCachedAnalytics('players', currentWeek, season),
          teamAnalytics: await this.analyticsEngine.getCachedAnalytics('teams', currentWeek, season),
          matchupAnalytics: await this.analyticsEngine.getCachedAnalytics('matchups', currentWeek, season),
          waiverAnalytics: await this.analyticsEngine.getCachedAnalytics('waivers', currentWeek, season)
        },
        timestamp: new Date()
      };

      ws.send(JSON.stringify(initialData));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('Error sending initial data:', error);

      }
    }
  }

  /**
   * Get real-time analytics summary
   */
  async getRealtimeSummary(): Promise<any> {
    return {
      connectedClients: this.clients.size,
      queuedEvents: this.eventQueue.length,
      isProcessing: this.isProcessing,
      uptime: process.uptime(),
      lastProcessed: new Date(),
      eventTypes: this.getEventTypeStats()
    };
  }

  /**
   * Get event type statistics
   */
  private getEventTypeStats(): Record<string, number> {
    return this.eventQueue.reduce((stats, event) => {
      stats[event.type] = (stats[event.type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }

  /**
   * Simulate live game events for testing
   */
  async simulateLiveEvents(): Promise<void> {
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];
    
    // Simulate score updates every 30 seconds
    setInterval(() => {
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      const points = Math.random() * 15; // Random points up to 15
      
      this.processScoreUpdate({
        playerId: randomPlayer,
        gameId: 'game_' + Math.floor(Math.random() * 16),
        quarter: Math.floor(Math.random() * 4) + 1,
        timeRemaining: `${Math.floor(Math.random() * 15)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        fantasyPoints: points,
        stats: {
          rushingYards: Math.floor(Math.random() * 50),
          receivingYards: Math.floor(Math.random() * 80),
          touchdowns: Math.random() > 0.8 ? 1 : 0,
          receptions: Math.floor(Math.random() * 8),
          targets: Math.floor(Math.random() * 12)
        }
      });
    }, 30000);

    // Simulate injury reports occasionally
    setInterval(() => {
      if (Math.random() > 0.9) { // 10% chance
        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const severities: InjuryReport['severity'][] = ['QUESTIONABLE', 'DOUBTFUL', 'OUT'];
        
        this.processInjuryReport({
          playerId: randomPlayer,
          severity: severities[Math.floor(Math.random() * severities.length)],
          description: 'Simulated injury for testing',
          impactAssessment: Math.random()
        });
      }
    }, 120000); // Every 2 minutes
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    this.clients.clear();
    this.eventQueue = [];
  }
}

export default RealTimeStreamProcessor;
