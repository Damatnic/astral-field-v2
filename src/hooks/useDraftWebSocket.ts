import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface DraftPick {
  id: string;
  round: number;
  pick: number;
  overall: number;
  teamId: string;
  teamName: string;
  player?: {
    id: string;
    name: string;
    position: string;
    team: string;
  };
  timestamp: string;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  userId?: string;
  isSystem?: boolean;
}

interface DraftState {
  id: string;
  status: 'scheduled' | 'active' | 'paused' | 'completed';
  currentRound: number;
  currentPick: number;
  timeRemaining: number;
  picks: DraftPick[];
  currentTeam?: {
    id: string;
    name: string;
  };
}

interface UseDraftWebSocketOptions {
  draftId: string;
  userId?: string;
  username?: string;
  onPickMade?: (pick: DraftPick) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onDraftStateUpdate?: (state: DraftState) => void;
  onTimerUpdate?: (timeRemaining: number) => void;
  onError?: (error: string) => void;
}

export function useDraftWebSocket({
  draftId,
  userId,
  username,
  onPickMade,
  onChatMessage,
  onDraftStateUpdate,
  onTimerUpdate,
  onError
}: UseDraftWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!draftId) return;

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'https://astralfield.vercel.app'
      : 'http://localhost:3000';

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      retries: 3
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to draft WebSocket');
      setIsConnected(true);
      if (userId) {
        socket.emit('join_draft', draftId, userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from draft WebSocket');
      setIsConnected(false);
    });

    socket.on('draft_state', (state: DraftState) => {
      console.log('Received draft state:', state);
      setDraftState(state);
      onDraftStateUpdate?.(state);
    });

    socket.on('pick_made', (data: { pick: DraftPick; nextUp: any; timestamp: string }) => {
      console.log('Pick made:', data.pick);
      onPickMade?.(data.pick);
      
      // Update local state
      setDraftState(prev => prev ? {
        ...prev,
        picks: [...prev.picks, data.pick],
        currentRound: data.nextUp.round,
        currentPick: data.nextUp.pick
      } : null);
    });

    socket.on('auto_pick_made', (data: { pick: DraftPick; nextUp: any; timestamp: string }) => {
      console.log('Auto pick made:', data.pick);
      onPickMade?.(data.pick);
      
      // Add system message about auto pick
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: `${data.pick.teamName} auto-drafted ${data.pick.player?.name || 'a player'} due to time expiration`,
        timestamp: data.timestamp,
        isSystem: true
      };
      setChatMessages(prev => [...prev, systemMessage]);
      onChatMessage?.(systemMessage);
    });

    socket.on('chat_message', (message: ChatMessage) => {
      console.log('Chat message:', message);
      setChatMessages(prev => [...prev, message]);
      onChatMessage?.(message);
    });

    socket.on('timer_update', (data: { timeRemaining: number; currentPick: any; timestamp: string }) => {
      onTimerUpdate?.(data.timeRemaining);
      setDraftState(prev => prev ? { ...prev, timeRemaining: data.timeRemaining } : null);
    });

    socket.on('draft_started', (data: { timestamp: string }) => {
      setDraftState(prev => prev ? { ...prev, status: 'active' } : null);
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: 'Draft has started! Good luck everyone!',
        timestamp: data.timestamp,
        isSystem: true
      };
      setChatMessages(prev => [...prev, systemMessage]);
      onChatMessage?.(systemMessage);
    });

    socket.on('draft_paused', (data: { timestamp: string }) => {
      setDraftState(prev => prev ? { ...prev, status: 'paused' } : null);
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: 'Draft has been paused',
        timestamp: data.timestamp,
        isSystem: true
      };
      setChatMessages(prev => [...prev, systemMessage]);
      onChatMessage?.(systemMessage);
    });

    socket.on('draft_resumed', (data: { timestamp: string }) => {
      setDraftState(prev => prev ? { ...prev, status: 'active' } : null);
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: 'Draft has been resumed',
        timestamp: data.timestamp,
        isSystem: true
      };
      setChatMessages(prev => [...prev, systemMessage]);
      onChatMessage?.(systemMessage);
    });

    socket.on('user_joined', (data: { userId: string; timestamp: string }) => {
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: `User ${data.userId} joined the draft`,
        timestamp: data.timestamp,
        isSystem: true
      };
      setChatMessages(prev => [...prev, systemMessage]);
      onChatMessage?.(systemMessage);
    });

    socket.on('user_left', (data: { userId: string; timestamp: string }) => {
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: `User ${data.userId} left the draft`,
        timestamp: data.timestamp,
        isSystem: true
      };
      setChatMessages(prev => [...prev, systemMessage]);
      onChatMessage?.(systemMessage);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('WebSocket error:', data.message);
      onError?.(data.message);
    });

    return () => {
      if (userId) {
        socket.emit('leave_draft', draftId, userId);
      }
      socket.disconnect();
    };
  }, [draftId, userId, onPickMade, onChatMessage, onDraftStateUpdate, onTimerUpdate, onError]);

  // Draft actions
  const makePick = useCallback((playerId: string, playerName: string, position: string, team: string) => {
    if (!socketRef.current || !draftState || !userId) return;

    const pickData = {
      draftId,
      round: draftState.currentRound,
      pick: draftState.currentPick,
      overall: (draftState.currentRound - 1) * 10 + draftState.currentPick, // Assuming 10 teams
      teamId: `team_${userId}`, // This would be the user's team ID
      playerId,
      userId
    };

    socketRef.current.emit('make_pick', pickData);
  }, [draftId, draftState, userId]);

  const sendChatMessage = useCallback((message: string) => {
    if (!socketRef.current || !username) return;

    const messageData = {
      draftId,
      userId: userId || 'anonymous',
      username,
      message,
      timestamp: new Date().toISOString()
    };

    socketRef.current.emit('send_chat_message', messageData);
  }, [draftId, userId, username]);

  const startDraft = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('start_draft', draftId);
  }, [draftId]);

  const pauseDraft = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('pause_draft', draftId);
  }, [draftId]);

  const resumeDraft = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('resume_draft', draftId);
  }, [draftId]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  return {
    isConnected,
    draftState,
    chatMessages,
    makePick,
    sendChatMessage,
    startDraft,
    pauseDraft,
    resumeDraft,
    reconnect
  };
}