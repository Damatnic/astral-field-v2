import { EventEmitter } from 'events';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  protocols?: string[];
}

interface SleeperMessage {
  type: string;
  channel?: string;
  id?: string;
  league_id?: string;
  week?: number;
  data?: any;
  timestamp?: number;
}

interface Subscription {
  channel: string;
  id?: string;
  league_id?: string;
  week?: number;
}

// Custom WebSocket implementation for environments where ReconnectingWebSocket isn't available
class ReconnectingWebSocket extends EventEmitter {
  private url: string;
  private protocols: string[];
  private options: WebSocketOptions;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(url: string, protocols: string[] = [], options: WebSocketOptions = {}) {
    super();
    this.url = url;
    this.protocols = protocols;
    this.options = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      timeout: 10000,
      ...options
    };
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url, this.protocols);
      this.setupEventListeners();
      this.setupPing();
    } catch (error) {
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      this.reconnectAttempts = 0;
      this.emit('open', event);
    };

    this.ws.onmessage = (event) => {
      this.emit('message', event);
    };

    this.ws.onclose = (event) => {
      this.emit('close', event);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.warn('WebSocket connection error, will retry...', event);
      // Don't emit error to prevent crashes
    };
  }

  private setupPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      console.warn('Max WebSocket reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval! * Math.pow(1.5, this.reconnectAttempts - 1);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, Math.min(delay, 30000)); // Max 30 second delay
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.emit('error', new Error('WebSocket is not connected'));
    }
  }

  close(code?: number, reason?: string): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.readyState === WebSocket.OPEN;
  }
}

export class SleeperWebSocket extends EventEmitter {
  private ws: ReconnectingWebSocket;
  private subscriptions: Map<string, Subscription> = new Map();
  private messageQueue: SleeperMessage[] = [];
  private isReady = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  constructor(options: WebSocketOptions = {}) {
    super();
    this.ws = new ReconnectingWebSocket('wss://api.sleeper.app/ws', [], {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      timeout: 5000,
      ...options
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('open', this.onOpen.bind(this));
    this.ws.on('message', this.onMessage.bind(this));
    this.ws.on('error', this.onError.bind(this));
    this.ws.on('close', this.onClose.bind(this));
  }

  private onOpen(): void {
    console.log('Sleeper WebSocket connected');
    this.isReady = true;
    this.startHeartbeat();
    this.resubscribeAll();
    this.processMessageQueue();
    this.emit('connected');
  }

  private onMessage(event: MessageEvent): void {
    try {
      const data: SleeperMessage = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'pong':
          this.lastHeartbeat = Date.now();
          break;
        case 'draft_update':
          this.emit('draftPick', data);
          this.emit('draftUpdate', data);
          break;
        case 'scoring_update':
          this.emit('scoreUpdate', data);
          break;
        case 'transaction':
          this.emit('transaction', data);
          break;
        case 'trade_offer':
          this.emit('tradeOffer', data);
          break;
        case 'trade_accepted':
          this.emit('tradeAccepted', data);
          break;
        case 'trade_rejected':
          this.emit('tradeRejected', data);
          break;
        case 'roster_update':
          this.emit('rosterUpdate', data);
          break;
        case 'league_update':
          this.emit('leagueUpdate', data);
          break;
        case 'player_news':
          this.emit('playerNews', data);
          break;
        case 'injury_update':
          this.emit('injuryUpdate', data);
          break;
        default:
          this.emit('message', data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', error);
    }
  }

  private onError(error: Event): void {
    console.error('Sleeper WebSocket error:', error);
    this.isReady = false;
    // Don't emit error to prevent unhandled error crashes in Node.js
    // this.emit('error', error);
  }

  private onClose(event: CloseEvent): void {
    console.log('Sleeper WebSocket disconnected:', event.code, event.reason);
    this.isReady = false;
    this.stopHeartbeat();
    this.emit('disconnected', event);
  }

  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = setInterval(() => {
      if (this.isReady) {
        this.send({ type: 'ping' });
        
        // Check if we've received a pong recently
        if (Date.now() - this.lastHeartbeat > 60000) {
          console.warn('WebSocket heartbeat timeout, reconnecting...');
          this.ws.close(1000, 'Heartbeat timeout');
        }
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private send(message: SleeperMessage): void {
    if (this.isReady) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.messageQueue.push(message);
      }
    } else {
      this.messageQueue.push(message);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isReady) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  private resubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      this.subscribe(subscription);
    }
  }

  private subscribe(subscription: Subscription): void {
    const message: SleeperMessage = {
      type: 'subscribe',
      channel: subscription.channel,
      id: subscription.id,
      league_id: subscription.league_id,
      week: subscription.week
    };
    this.send(message);
  }

  private unsubscribe(subscription: Subscription): void {
    const message: SleeperMessage = {
      type: 'unsubscribe',
      channel: subscription.channel,
      id: subscription.id,
      league_id: subscription.league_id,
      week: subscription.week
    };
    this.send(message);
  }

  // Public API methods

  subscribeToDraft(draftId: string): void {
    const subscription: Subscription = { channel: 'draft', id: draftId };
    const key = `draft:${draftId}`;
    this.subscriptions.set(key, subscription);
    this.subscribe(subscription);
  }

  unsubscribeFromDraft(draftId: string): void {
    const key = `draft:${draftId}`;
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.unsubscribe(subscription);
      this.subscriptions.delete(key);
    }
  }

  subscribeToLeague(leagueId: string): void {
    const subscription: Subscription = { channel: 'league', league_id: leagueId };
    const key = `league:${leagueId}`;
    this.subscriptions.set(key, subscription);
    this.subscribe(subscription);
  }

  unsubscribeFromLeague(leagueId: string): void {
    const key = `league:${leagueId}`;
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.unsubscribe(subscription);
      this.subscriptions.delete(key);
    }
  }

  subscribeToScoring(leagueId: string, week: number): void {
    const subscription: Subscription = { 
      channel: 'scoring', 
      league_id: leagueId, 
      week 
    };
    const key = `scoring:${leagueId}:${week}`;
    this.subscriptions.set(key, subscription);
    this.subscribe(subscription);
  }

  unsubscribeFromScoring(leagueId: string, week: number): void {
    const key = `scoring:${leagueId}:${week}`;
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.unsubscribe(subscription);
      this.subscriptions.delete(key);
    }
  }

  subscribeToPlayerNews(): void {
    const subscription: Subscription = { channel: 'player_news' };
    const key = 'player_news';
    this.subscriptions.set(key, subscription);
    this.subscribe(subscription);
  }

  unsubscribeFromPlayerNews(): void {
    const key = 'player_news';
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.unsubscribe(subscription);
      this.subscriptions.delete(key);
    }
  }

  subscribeToTrades(leagueId: string): void {
    const subscription: Subscription = { channel: 'trades', league_id: leagueId };
    const key = `trades:${leagueId}`;
    this.subscriptions.set(key, subscription);
    this.subscribe(subscription);
  }

  unsubscribeFromTrades(leagueId: string): void {
    const key = `trades:${leagueId}`;
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.unsubscribe(subscription);
      this.subscriptions.delete(key);
    }
  }

  subscribeToTransactions(leagueId: string): void {
    const subscription: Subscription = { channel: 'transactions', league_id: leagueId };
    const key = `transactions:${leagueId}`;
    this.subscriptions.set(key, subscription);
    this.subscribe(subscription);
  }

  unsubscribeFromTransactions(leagueId: string): void {
    const key = `transactions:${leagueId}`;
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.unsubscribe(subscription);
      this.subscriptions.delete(key);
    }
  }

  // Utility methods

  isConnected(): boolean {
    return this.isReady && this.ws.isConnected();
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  clearAllSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      this.unsubscribe(subscription);
    }
    this.subscriptions.clear();
  }

  close(): void {
    this.clearAllSubscriptions();
    this.stopHeartbeat();
    this.ws.close(1000, 'Client requested close');
  }

  // Connection status
  getConnectionStatus(): {
    connected: boolean;
    subscriptions: number;
    lastHeartbeat: number;
    messageQueueSize: number;
  } {
    return {
      connected: this.isConnected(),
      subscriptions: this.subscriptions.size,
      lastHeartbeat: this.lastHeartbeat,
      messageQueueSize: this.messageQueue.length
    };
  }
}

// Singleton instance for global use
export const sleeperWebSocket = new SleeperWebSocket();

// React Hook for WebSocket connection
export function useSleeperWebSocket(): {
  ws: SleeperWebSocket;
  isConnected: boolean;
  status: ReturnType<SleeperWebSocket['getConnectionStatus']>;
} {
  const [isConnected, setIsConnected] = React.useState(sleeperWebSocket.isConnected());
  const [status, setStatus] = React.useState(sleeperWebSocket.getConnectionStatus());

  React.useEffect(() => {
    const updateStatus = () => {
      setIsConnected(sleeperWebSocket.isConnected());
      setStatus(sleeperWebSocket.getConnectionStatus());
    };

    sleeperWebSocket.on('connected', updateStatus);
    sleeperWebSocket.on('disconnected', updateStatus);
    sleeperWebSocket.on('error', updateStatus);

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      sleeperWebSocket.off('connected', updateStatus);
      sleeperWebSocket.off('disconnected', updateStatus);
      sleeperWebSocket.off('error', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return {
    ws: sleeperWebSocket,
    isConnected,
    status
  };
}

// Helper functions for specific use cases
export function subscribeToLiveScoring(leagueId: string, week: number, callback: (data: any) => void): () => void {
  sleeperWebSocket.subscribeToScoring(leagueId, week);
  sleeperWebSocket.on('scoreUpdate', callback);

  return () => {
    sleeperWebSocket.unsubscribeFromScoring(leagueId, week);
    sleeperWebSocket.off('scoreUpdate', callback);
  };
}

export function subscribeToDraftUpdates(draftId: string, callback: (data: any) => void): () => void {
  sleeperWebSocket.subscribeToDraft(draftId);
  sleeperWebSocket.on('draftUpdate', callback);

  return () => {
    sleeperWebSocket.unsubscribeFromDraft(draftId);
    sleeperWebSocket.off('draftUpdate', callback);
  };
}

export function subscribeToLeagueUpdates(leagueId: string, callback: (data: any) => void): () => void {
  sleeperWebSocket.subscribeToLeague(leagueId);
  sleeperWebSocket.on('leagueUpdate', callback);

  return () => {
    sleeperWebSocket.unsubscribeFromLeague(leagueId);
    sleeperWebSocket.off('leagueUpdate', callback);
  };
}

// Add React import for the hook
import React from 'react';