import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinDraftRoom: (draftId: string) => void;
  leaveDraftRoom: (draftId: string) => void;
  makeDraftPick: (draftId: string, playerId: string) => Promise<void>;
  sendDraftChat: (draftId: string, message: string) => void;
  requestAutoPick: (draftId: string) => void;
  pauseDraft: (draftId: string) => void;
  resumeDraft: (draftId: string) => void;
  proposeTrade: (tradeData: any) => void;
  subscribeToScoring: (leagueId: string, week: number) => void;
  unsubscribeFromScoring: (leagueId: string, week: number) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  joinDraftRoom: () => {},
  leaveDraftRoom: () => {},
  makeDraftPick: async () => {},
  sendDraftChat: () => {},
  requestAutoPick: () => {},
  pauseDraft: () => {},
  resumeDraft: () => {},
  proposeTrade: () => {},
  subscribeToScoring: () => {},
  unsubscribeFromScoring: () => {},
});

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user && !socketRef.current) {
      // Initialize socket connection
      const newSocket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        path: '/api/socket',
        auth: {
          token: (session as any).accessToken, // Assuming token is stored in session
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = newSocket;

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        toast.success('Connected to live updates');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection error. Retrying...');
      });

      // Global event handlers
      newSocket.on('notification', (notification) => {
        toast(notification.message, {
          icon: notification.type === 'success' ? '✅' : 
                notification.type === 'error' ? '❌' : 'ℹ️'
        });
      });

      newSocket.on('trade:received', (data) => {
        toast(`New trade proposal from ${data.from}`, {
          icon: '🤝',
          duration: 5000,
        });
      });

      setSocket(newSocket);

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [session, status]);

  // Draft room methods
  const joinDraftRoom = useCallback((draftId: string) => {
    if (socket) {
      socket.emit('draft:join', draftId);
    }
  }, [socket]);

  const leaveDraftRoom = useCallback((draftId: string) => {
    if (socket) {
      socket.emit('draft:leave', draftId);
    }
  }, [socket]);

  const makeDraftPick = useCallback(async (draftId: string, playerId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Pick timeout'));
      }, 10000);

      socket.emit('draft:makePick', { draftId, playerId });

      socket.once('draft:pickMade', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.once('draft:error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });
    });
  }, [socket]);

  const sendDraftChat = useCallback((draftId: string, message: string) => {
    if (socket) {
      socket.emit('draft:chat', { draftId, message });
    }
  }, [socket]);

  const requestAutoPick = useCallback((draftId: string) => {
    if (socket) {
      socket.emit('draft:requestAutoPick', { draftId });
    }
  }, [socket]);

  const pauseDraft = useCallback((draftId: string) => {
    if (socket) {
      socket.emit('draft:pause', { draftId });
    }
  }, [socket]);

  const resumeDraft = useCallback((draftId: string) => {
    if (socket) {
      socket.emit('draft:resume', { draftId });
    }
  }, [socket]);

  // Trade methods
  const proposeTrade = useCallback((tradeData: any) => {
    if (socket) {
      socket.emit('trade:propose', tradeData);
    }
  }, [socket]);

  // Scoring subscription methods
  const subscribeToScoring = useCallback((leagueId: string, week: number) => {
    if (socket) {
      socket.emit('scoring:subscribe', { leagueId, week });
    }
  }, [socket]);

  const unsubscribeFromScoring = useCallback((leagueId: string, week: number) => {
    if (socket) {
      socket.emit('scoring:unsubscribe', { leagueId, week });
    }
  }, [socket]);

  const value: SocketContextType = {
    socket,
    connected,
    joinDraftRoom,
    leaveDraftRoom,
    makeDraftPick,
    sendDraftChat,
    requestAutoPick,
    pauseDraft,
    resumeDraft,
    proposeTrade,
    subscribeToScoring,
    unsubscribeFromScoring,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook for draft room functionality
export function useDraftRoom(draftId: string | null) {
  const { socket, joinDraftRoom, leaveDraftRoom } = useSocket();
  const [draftState, setDraftState] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !draftId) return;

    // Join draft room
    joinDraftRoom(draftId);

    // Draft event listeners
    socket.on('draft:state', (state) => {
      setDraftState(state);
    });

    socket.on('draft:pickMade', (data) => {
      toast(`Pick made: ${data.pick.playerName} to ${data.pick.teamName}`, {
        icon: '🎯',
      });
    });

    socket.on('draft:chatMessage', (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.on('draft:userJoined', (data) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
      toast(`${data.teamName || 'A team'} joined the draft`, {
        icon: '👋',
      });
    });

    socket.on('draft:userLeft', (data) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socket.on('draft:paused', () => {
      toast('Draft has been paused', {
        icon: '⏸️',
      });
    });

    socket.on('draft:resumed', () => {
      toast('Draft has been resumed', {
        icon: '▶️',
      });
    });

    socket.on('draft:completed', () => {
      toast('Draft completed!', {
        icon: '🏆',
        duration: 5000,
      });
    });

    socket.on('draft:error', (error) => {
      toast.error(error);
    });

    // Cleanup
    return () => {
      leaveDraftRoom(draftId);
      socket.off('draft:state');
      socket.off('draft:pickMade');
      socket.off('draft:chatMessage');
      socket.off('draft:userJoined');
      socket.off('draft:userLeft');
      socket.off('draft:paused');
      socket.off('draft:resumed');
      socket.off('draft:completed');
      socket.off('draft:error');
    };
  }, [socket, draftId, joinDraftRoom, leaveDraftRoom]);

  return {
    draftState,
    chatMessages,
    onlineUsers,
  };
}

// Custom hook for live scoring
export function useLiveScoring(leagueId: string | null, week: number) {
  const { socket, subscribeToScoring, unsubscribeFromScoring } = useSocket();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!socket || !leagueId) return;

    subscribeToScoring(leagueId, week);

    socket.on('scoring:update', (data) => {
      setScores(data.scores);
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeFromScoring(leagueId, week);
      socket.off('scoring:update');
    };
  }, [socket, leagueId, week, subscribeToScoring, unsubscribeFromScoring]);

  return {
    scores,
    lastUpdate,
  };
}