import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnected: boolean = false;

  constructor(private config: WebSocketConfig = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001',
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...config
    };
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.socket = io(this.config.url!, {
      autoConnect: this.config.autoConnect,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('WebSocket connected');
      this.emit('connection:established', { connected: true });
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('WebSocket disconnected');
      this.emit('connection:lost', { connected: false });
    });

    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.emit('connection:error', { error: error.message });
    });

    // Fantasy football specific events
    this.socket.on('score:update', (data) => {
      this.emit('score:update', data);
    });

    this.socket.on('player:injury', (data) => {
      this.emit('player:injury', data);
    });

    this.socket.on('trade:offer', (data) => {
      this.emit('trade:offer', data);
    });

    this.socket.on('draft:pick', (data) => {
      this.emit('draft:pick', data);
    });

    this.socket.on('lineup:change', (data) => {
      this.emit('lineup:change', data);
    });

    this.socket.on('chat:message', (data) => {
      this.emit('chat:message', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }

    // Also emit to local listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  off(event: string, callback?: Function): void {
    if (callback) {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    } else {
      this.listeners.delete(event);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Fantasy football specific methods
  subscribeToLiveScores(leagueId: string): void {
    this.emit('subscribe:scores', { leagueId });
  }

  subscribeToDraft(draftId: string): void {
    this.emit('subscribe:draft', { draftId });
  }

  subscribeToTrades(leagueId: string): void {
    this.emit('subscribe:trades', { leagueId });
  }

  sendChatMessage(roomId: string, message: string): void {
    this.emit('chat:send', { roomId, message });
  }

  updateLineup(teamId: string, lineup: any[]): void {
    this.emit('lineup:update', { teamId, lineup });
  }

  makeDraftPick(draftId: string, playerId: string): void {
    this.emit('draft:make-pick', { draftId, playerId });
  }

  sendTradeOffer(offer: any): void {
    this.emit('trade:send-offer', offer);
  }

  respondToTrade(tradeId: string, response: 'accept' | 'reject' | 'counter', counterOffer?: any): void {
    this.emit('trade:respond', { tradeId, response, counterOffer });
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Hook for React components
export function useWebSocket() {
  return websocketService;
}

export default websocketService;