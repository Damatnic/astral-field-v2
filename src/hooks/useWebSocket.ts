/**
 * WebSocket Hook for Real-time Scoring Updates
 * Provides easy-to-use React hook for connecting to live scoring WebSocket
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LiveScoreUpdate {
  leagueId: string;
  week: number;
  season: number;
  matchups: any[];
  lastUpdated: string;
  isLive: boolean;
  nextUpdate: string;
}

export interface GameStatusUpdate {
  gameStatus: {
    isAnyGameActive: boolean;
    activeGames: number;
    scoringPriority: 'high' | 'medium' | 'low';
    recommendedUpdateInterval: number;
  };
  orchestratorStatus: {
    isActive: boolean;
    currentInterval: number;
    lastUpdate: string | null;
    nextUpdate: string | null;
  };
  timestamp: string;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export interface UseWebSocketReturn {
  // Connection state
  state: WebSocketState;
  
  // Latest data
  liveScores: LiveScoreUpdate | null;
  gameStatus: GameStatusUpdate | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribeToLeague: (leagueId: string) => void;
  unsubscribeFromLeague: (leagueId: string) => void;
  
  // Socket instance (for advanced usage)
  socket: Socket | null;
}

export function useWebSocket(autoConnect = true): UseWebSocketReturn {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: null
  });
  
  const [liveScores, setLiveScores] = useState<LiveScoreUpdate | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatusUpdate | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedLeaguesRef = useRef<Set<string>>(new Set());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://your-domain.com' 
        : 'ws://localhost:3007';

      socketRef.current = io(socketUrl, {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('🔌 Connected to live scoring WebSocket');
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false, 
          error: null,
          lastUpdate: new Date()
        }));

        // Re-subscribe to previously subscribed leagues
        subscribedLeaguesRef.current.forEach(leagueId => {
          socket.emit('subscribe_league', leagueId);
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from WebSocket:', reason);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false,
          error: `Disconnected: ${reason}`
        }));

        // Auto-reconnect unless it was intentional
        if (reason !== 'io client disconnect') {
          scheduleReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false,
          error: `Connection error: ${error.message}`
        }));
        scheduleReconnect();
      });

      // Data events
      socket.on('score_update', (data: { leagueId: string; data: LiveScoreUpdate; timestamp: string }) => {
        console.log('📊 Received score update for league:', data.leagueId);
        setLiveScores(data.data);
        setState(prev => ({ ...prev, lastUpdate: new Date() }));
      });

      socket.on('game_status_update', (data: GameStatusUpdate) => {
        console.log('🏈 Received game status update');
        setGameStatus(data);
        setState(prev => ({ ...prev, lastUpdate: new Date() }));
      });

      // Subscription events
      socket.on('subscribed', (data: { leagueId: string; message: string }) => {
        console.log('✅ Subscribed to league:', data.leagueId);
        subscribedLeaguesRef.current.add(data.leagueId);
      });

      socket.on('unsubscribed', (data: { leagueId: string; message: string }) => {
        console.log('❌ Unsubscribed from league:', data.leagueId);
        subscribedLeaguesRef.current.delete(data.leagueId);
      });

      socket.on('error', (error: { message: string }) => {
        console.error('🔌 WebSocket error:', error);
        setState(prev => ({ ...prev, error: error.message }));
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false,
        error: `Initialization error: ${(error as Error).message}`
      }));
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      connected: false, 
      connecting: false,
      error: null
    }));
    
    subscribedLeaguesRef.current.clear();
  }, []);

  // Subscribe to league updates
  const subscribeToLeague = useCallback((leagueId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe_league', leagueId);
    } else {
      console.warn('Cannot subscribe: WebSocket not connected');
    }
  }, []);

  // Unsubscribe from league updates
  const unsubscribeFromLeague = useCallback((leagueId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe_league', leagueId);
    }
    subscribedLeaguesRef.current.delete(leagueId);
  }, []);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        console.log('🔄 Attempting to reconnect...');
        connect();
      }
    }, 5000); // 5 second delay
  }, [connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    state,
    liveScores,
    gameStatus,
    connect,
    disconnect,
    subscribeToLeague,
    unsubscribeFromLeague,
    socket: socketRef.current
  };
}

// Specialized hook for league-specific updates
export function useLeagueWebSocket(leagueId: string, autoConnect = true) {
  const webSocket = useWebSocket(autoConnect);

  useEffect(() => {
    if (webSocket.state.connected && leagueId) {
      webSocket.subscribeToLeague(leagueId);

      return () => {
        webSocket.unsubscribeFromLeague(leagueId);
      };
    }
  }, [webSocket.state.connected, leagueId, webSocket]);

  return {
    ...webSocket,
    // Filter scores to only this league
    liveScores: webSocket.liveScores?.leagueId === leagueId ? webSocket.liveScores : null
  };
}

// Hook for game status only (no league-specific data)
export function useGameStatusWebSocket(autoConnect = true) {
  const webSocket = useWebSocket(autoConnect);

  return {
    connected: webSocket.state.connected,
    connecting: webSocket.state.connecting,
    error: webSocket.state.error,
    gameStatus: webSocket.gameStatus,
    lastUpdate: webSocket.state.lastUpdate,
    connect: webSocket.connect,
    disconnect: webSocket.disconnect
  };
}

export default useWebSocket;