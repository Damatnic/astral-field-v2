/**
 * Optimized WebSocket Manager for Astral Field Fantasy Football
 * Features: Connection pooling, message deduplication, compression, and intelligent reconnection
 */

import { io, Socket } from 'socket.io-client';
import { redisCache } from './redis-cache';

interface WebSocketConfig {
  url: string;
  options?: {
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    timeout?: number;
    compression?: boolean;
  };
  rooms?: string[];
  messageBufferSize?: number;
  heartbeatInterval?: number;
}

interface OptimizedMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  room?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface ConnectionMetrics {
  connected: boolean;
  reconnectCount: number;
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  lastHeartbeat: number;
  errors: number;
}

class OptimizedWebSocketManager {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private messageBuffer: Map<string, OptimizedMessage> = new Map();
  private pendingMessages: OptimizedMessage[] = [];
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private metrics: ConnectionMetrics = {
    connected: false,
    reconnectCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
    averageLatency: 0,
    lastHeartbeat: 0,
    errors: 0,
  };
  private latencyMeasurements: number[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageDeduplicationCache: Set<string> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      messageBufferSize: 100,
      heartbeatInterval: 30000, // 30 seconds
      options: {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        compression: true,
      },
      ...config,
    };

    if (this.config.options?.autoConnect) {
      this.connect();
    }

    // Clean up deduplication cache every 5 minutes
    setInterval(() => this.cleanupDeduplicationCache(), 5 * 60 * 1000);
  }

  private cleanupDeduplicationCache(): void {
    // Keep only messages from the last 5 minutes to prevent memory leaks
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const messagesToKeep = new Set<string>();
    
    for (const messageId of this.messageDeduplicationCache) {
      const timestamp = parseInt(messageId.split(':')[1] || '0');
      if (timestamp > fiveMinutesAgo) {
        messagesToKeep.add(messageId);
      }
    }
    
    this.messageDeduplicationCache = messagesToKeep;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to WebSocket server...');
      
      this.socket = io(this.config.url, this.config.options);

      this.setupEventHandlers();
      
      // Join specified rooms
      if (this.config.rooms?.length) {
        this.socket.on('connect', () => {
          this.config.rooms?.forEach(room => {
            this.joinRoom(room);
          });
        });
      }

      // Start heartbeat monitoring
      this.startHeartbeat();

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.metrics.errors++;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.metrics.connected = true;
      this.metrics.lastHeartbeat = Date.now();
      
      // Send any pending messages
      this.flushPendingMessages();
      
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.metrics.connected = false;
      
      // Schedule reconnection for unexpected disconnects
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.metrics.errors++;
      this.scheduleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      this.metrics.reconnectCount++;
    });

    // Handle incoming messages
    this.socket.onAny((eventName, data) => {
      this.handleIncomingMessage(eventName, data);
    });

    // Handle pong for latency measurement
    this.socket.on('pong', (timestamp) => {
      const latency = Date.now() - timestamp;
      this.recordLatency(latency);
    });
  }

  private handleIncomingMessage(eventName: string, data: any): void {
    this.metrics.messagesReceived++;
    
    // Check for message deduplication
    const messageId = `${eventName}:${data?.id || data?.timestamp || Date.now()}`;
    if (this.messageDeduplicationCache.has(messageId)) {
      console.log('🔄 Duplicate message ignored:', messageId);
      return;
    }
    this.messageDeduplicationCache.add(messageId);

    // Process message based on type
    try {
      // Cache real-time data if applicable
      this.cacheRealtimeData(eventName, data);
      
      // Notify subscribers
      const subscribers = this.subscriptions.get(eventName);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in message callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      this.metrics.errors++;
    }
  }

  private async cacheRealtimeData(eventName: string, data: any): Promise<void> {
    try {
      // Cache live scores
      if (eventName === 'liveScores' && data.leagueId) {
        const cacheKey = `live:scores:${data.leagueId}:${data.week}`;
        await redisCache.set(cacheKey, data, 60); // 1 minute cache
      }
      
      // Cache player updates
      if (eventName === 'playerUpdate' && data.playerId) {
        const cacheKey = `player:live:${data.playerId}`;
        await redisCache.set(cacheKey, data, 300); // 5 minute cache
      }
      
      // Cache trade notifications
      if (eventName === 'tradeUpdate' && data.tradeId) {
        const cacheKey = `trade:update:${data.tradeId}`;
        await redisCache.set(cacheKey, data, 600); // 10 minute cache
      }
    } catch (error) {
      console.warn('Failed to cache realtime data:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    const delay = Math.min(1000 * Math.pow(2, this.metrics.reconnectCount), 30000); // Exponential backoff, max 30s
    
    this.reconnectTimer = setTimeout(() => {
      console.log('🔄 Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        const timestamp = Date.now();
        this.socket.emit('ping', timestamp);
        this.metrics.lastHeartbeat = timestamp;
      }
    }, this.config.heartbeatInterval);
  }

  private recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only last 10 measurements
    if (this.latencyMeasurements.length > 10) {
      this.latencyMeasurements.shift();
    }
    
    // Calculate average
    this.metrics.averageLatency = 
      this.latencyMeasurements.reduce((sum, l) => sum + l, 0) / this.latencyMeasurements.length;
  }

  private flushPendingMessages(): void {
    if (!this.socket?.connected || this.pendingMessages.length === 0) {
      return;
    }

    console.log(`📤 Sending ${this.pendingMessages.length} pending messages`);
    
    // Sort by priority
    this.pendingMessages.sort((a, b) => {
      const priorities = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    this.pendingMessages.forEach(message => {
      this.sendMessage(message.type, message.data, message.room, false);
    });

    this.pendingMessages = [];
  }

  // Public API

  subscribe(eventName: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, new Set());
    }
    
    this.subscriptions.get(eventName)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscriptions.get(eventName);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscriptions.delete(eventName);
        }
      }
    };
  }

  sendMessage(
    type: string, 
    data: any, 
    room?: string, 
    buffer: boolean = true,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): void {
    const message: OptimizedMessage = {
      id: `${type}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      room,
      priority,
    };

    if (!this.socket?.connected && buffer) {
      // Buffer the message if not connected
      this.pendingMessages.push(message);
      
      // Limit buffer size
      if (this.pendingMessages.length > (this.config.messageBufferSize || 100)) {
        this.pendingMessages.shift(); // Remove oldest message
      }
      
      return;
    }

    if (this.socket?.connected) {
      try {
        if (room) {
          (this.socket as any).to(room).emit(type, data);
        } else {
          this.socket.emit(type, data);
        }
        
        this.metrics.messagesSent++;
        
        // Add to deduplication cache
        this.messageDeduplicationCache.add(message.id);
      } catch (error) {
        console.error('Failed to send message:', error);
        this.metrics.errors++;
        
        if (buffer) {
          this.pendingMessages.push(message);
        }
      }
    }
  }

  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join', room);
      console.log(`🏠 Joined room: ${room}`);
    } else {
      // Store room to join on connection
      if (!this.config.rooms) {
        this.config.rooms = [];
      }
      if (!this.config.rooms.includes(room)) {
        this.config.rooms.push(room);
      }
    }
  }

  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave', room);
      console.log(`🚪 Left room: ${room}`);
    }
    
    // Remove from config
    if (this.config.rooms) {
      this.config.rooms = this.config.rooms.filter(r => r !== room);
    }
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  } {
    const now = Date.now();
    const lastHeartbeatAge = now - this.metrics.lastHeartbeat;
    const errorRate = this.metrics.errors / Math.max(1, this.metrics.messagesReceived + this.metrics.messagesSent);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!this.metrics.connected || lastHeartbeatAge > 60000 || errorRate > 0.1) {
      status = 'unhealthy';
    } else if (this.metrics.averageLatency > 1000 || errorRate > 0.05) {
      status = 'degraded';
    }
    
    return {
      status,
      details: {
        connected: this.metrics.connected,
        latency: this.metrics.averageLatency,
        errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
        lastHeartbeatAge: lastHeartbeatAge,
        pendingMessages: this.pendingMessages.length,
        activeSubscriptions: this.subscriptions.size,
      },
    };
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.metrics.connected = false;
    this.subscriptions.clear();
    this.pendingMessages = [];
  }
}

// Singleton instance for the application
let wsManager: OptimizedWebSocketManager | null = null;

export function getWebSocketManager(config?: WebSocketConfig): OptimizedWebSocketManager {
  if (!wsManager && config) {
    wsManager = new OptimizedWebSocketManager(config);
  } else if (!wsManager) {
    throw new Error('WebSocket manager not initialized. Provide config on first call.');
  }
  
  return wsManager;
}

// Convenience hooks for common real-time features
export const realtimeHooks = {
  // Subscribe to live score updates
  subscribeToLiveScores: (leagueId: string, callback: (scores: any) => void) => {
    const ws = getWebSocketManager();
    ws.joinRoom(`league:${leagueId}:scores`);
    return ws.subscribe('liveScores', callback);
  },

  // Subscribe to trade updates
  subscribeToTradeUpdates: (leagueId: string, callback: (trade: any) => void) => {
    const ws = getWebSocketManager();
    ws.joinRoom(`league:${leagueId}:trades`);
    return ws.subscribe('tradeUpdate', callback);
  },

  // Subscribe to waiver updates
  subscribeToWaiverUpdates: (leagueId: string, callback: (waiver: any) => void) => {
    const ws = getWebSocketManager();
    ws.joinRoom(`league:${leagueId}:waivers`);
    return ws.subscribe('waiverUpdate', callback);
  },

  // Subscribe to lineup changes
  subscribeToLineupChanges: (teamId: string, callback: (lineup: any) => void) => {
    const ws = getWebSocketManager();
    ws.joinRoom(`team:${teamId}:lineup`);
    return ws.subscribe('lineupUpdate', callback);
  },

  // Subscribe to chat messages
  subscribeToChatMessages: (leagueId: string, callback: (message: any) => void) => {
    const ws = getWebSocketManager();
    ws.joinRoom(`league:${leagueId}:chat`);
    return ws.subscribe('chatMessage', callback);
  },
};

export default OptimizedWebSocketManager;