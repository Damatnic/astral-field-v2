import { io, Socket } from 'socket.io-client';
import React from 'react';

interface ReconnectConfig {
  url: string;
  userId: string;
  roomId: string;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
}

interface ConnectionCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectError?: (error: any) => void;
  onReconnectFailed?: () => void;
  onMessage?: (event: string, data: any) => void;
}

class ReconnectingSocket {
  private socket: Socket | null = null;
  private config: Required<ReconnectConfig>;
  private callbacks: ConnectionCallbacks;
  private retryCount = 0;
  private isManualDisconnect = false;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(config: ReconnectConfig, callbacks: ConnectionCallbacks = {}) {
    this.config = {
      maxRetries: 10,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      backoffMultiplier: 1.5,
      ...config
    };
    this.callbacks = callbacks;
  }

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve(this.socket);
        return;
      }

      this.cleanup();

      const socketOptions = {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: false, // We'll handle reconnection manually
        forceNew: true
      };

      this.socket = io(this.config.url, socketOptions);

      const connectTimeout = setTimeout(() => {
        this.socket?.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        console.log(`[WebSocket] Connected to ${this.config.url}`);
        
        this.retryCount = 0;
        this.isManualDisconnect = false;
        
        // Join the room
        this.socket!.emit('join_draft', this.config.roomId, this.config.userId);
        
        this.callbacks.onConnect?.();
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        console.error('[WebSocket] Connection error:', error);
        
        if (this.retryCount === 0) {
          reject(error);
        } else {
          this.callbacks.onReconnectError?.(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] Disconnected: ${reason}`);
        this.callbacks.onDisconnect?.(reason);
        
        if (!this.isManualDisconnect && reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      // Set up event forwarding
      this.setupEventForwarding();
    });
  }

  private setupEventForwarding() {
    if (!this.socket) return;

    const events = [
      'draft_state',
      'pick_made',
      'auto_pick_made',
      'timer_update',
      'draft_started',
      'draft_paused',
      'draft_resumed',
      'chat_message',
      'user_joined',
      'user_left',
      'error'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data) => {
        this.callbacks.onMessage?.(event, data);
      });
    });
  }

  private scheduleReconnect() {
    if (this.retryCount >= this.config.maxRetries) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.callbacks.onReconnectFailed?.();
      return;
    }

    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, this.retryCount),
      this.config.maxRetryDelay
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.config.maxRetries})`);

    this.retryTimeoutId = setTimeout(async () => {
      this.retryCount++;
      
      try {
        await this.connect();
        console.log(`[WebSocket] Reconnected successfully after ${this.retryCount} attempts`);
        this.callbacks.onReconnect?.(this.retryCount);
      } catch (error) {
        console.error(`[WebSocket] Reconnection attempt ${this.retryCount} failed:`, error);
        
        if (this.retryCount < this.config.maxRetries) {
          this.scheduleReconnect();
        } else {
          this.callbacks.onReconnectFailed?.();
        }
      }
    }, delay);
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
      return true;
    }
    
    console.warn(`[WebSocket] Cannot emit '${event}' - socket not connected`);
    return false;
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.cleanup();
  }

  private cleanup() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  get connected(): boolean {
    return this.socket?.connected || false;
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

// Hook for using reconnecting socket in React components
export function useReconnectingSocket(config: ReconnectConfig, callbacks: ConnectionCallbacks = {}) {
  const [socket, setSocket] = React.useState<ReconnectingSocket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionState, setConnectionState] = React.useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  React.useEffect(() => {
    const reconnectingSocket = new ReconnectingSocket(config, {
      ...callbacks,
      onConnect: () => {
        setIsConnected(true);
        setConnectionState('connected');
        callbacks.onConnect?.();
      },
      onDisconnect: (reason) => {
        setIsConnected(false);
        setConnectionState('disconnected');
        callbacks.onDisconnect?.(reason);
      },
      onReconnect: (attemptNumber) => {
        setIsConnected(true);
        setConnectionState('connected');
        callbacks.onReconnect?.(attemptNumber);
      },
      onReconnectError: (error) => {
        setConnectionState('reconnecting');
        callbacks.onReconnectError?.(error);
      },
      onReconnectFailed: () => {
        setIsConnected(false);
        setConnectionState('disconnected');
        callbacks.onReconnectFailed?.();
      }
    });

    setSocket(reconnectingSocket);
    setConnectionState('connecting');

    reconnectingSocket.connect().catch((error) => {
      console.error('[WebSocket] Initial connection failed:', error);
      setConnectionState('disconnected');
    });

    return () => {
      reconnectingSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionState('disconnected');
    };
  }, [config.url, config.userId, config.roomId]);

  return {
    socket,
    isConnected,
    connectionState
  };
}

export { ReconnectingSocket };
export default ReconnectingSocket;