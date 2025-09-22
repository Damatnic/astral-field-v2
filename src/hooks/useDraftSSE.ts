import { useEffect, useRef, useState, useCallback } from 'react';

interface DraftPick {
  id: string;
  round: number;
  pick: number;
  overall: number;
  team: string;
  player?: {
    id: string;
    name: string;
    position: string;
    team: string;
    adp: number;
    projectedPoints: number;
    tier: number;
  };
  timestamp?: string;
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

interface UseDraftSSEOptions {
  draftId: string;
  userId?: string;
  username?: string;
  onPickMade?: (pick: DraftPick) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onDraftStateUpdate?: (state: DraftState) => void;
  onTimerUpdate?: (timeRemaining: number) => void;
  onError?: (error: string) => void;
}

export function useDraftSSE({
  draftId,
  userId,
  username,
  onPickMade,
  onChatMessage,
  onDraftStateUpdate,
  onTimerUpdate,
  onError
}: UseDraftSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(90);

  // Initialize SSE connection
  useEffect(() => {
    if (!draftId) return;

    // Store the current ref value to avoid stale closure
    const currentEventSource = eventSourceRef.current;

    // Initialize mock draft state
    setDraftState({
      id: draftId,
      status: 'active',
      currentRound: 1,
      currentPick: 1,
      timeRemaining: 90,
      picks: [],
      currentTeam: {
        id: 'team1',
        name: 'Thunder Bolts'
      }
    });

    // Add initial welcome messages
    setChatMessages([
      {
        id: '1',
        user: 'System',
        message: 'Welcome to the 2025 D Amato Dynasty League Draft!',
        timestamp: new Date().toISOString(),
        isSystem: true
      },
      {
        id: '2',
        user: 'Commissioner',
        message: 'Good luck everyone! Let us have a great draft.',
        timestamp: new Date().toISOString()
      }
    ]);

    setIsConnected(true);

    return () => {
      // Use the captured value instead of accessing the ref
      if (currentEventSource) {
        currentEventSource.close();
      }
    };
  }, [draftId, userId, onPickMade, onChatMessage, onDraftStateUpdate, onTimerUpdate, onError]);

  // Mock timer countdown for demonstration
  useEffect(() => {
    if (draftState?.status === 'active' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Trigger auto-pick
            const autoPickMessage: ChatMessage = {
              id: Date.now().toString(),
              user: 'System',
              message: `${draftState.currentTeam?.name || 'Current team'} auto-drafted due to time expiration`,
              timestamp: new Date().toISOString(),
              isSystem: true
            };
            setChatMessages(prev => [...prev, autoPickMessage]);
            onChatMessage?.(autoPickMessage);
            return 90; // Reset timer
          }
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [draftState?.status, timeRemaining, draftState?.currentTeam, onChatMessage]);

  // Draft actions
  const makePick = useCallback(async (playerId: string, playerName: string, position: string, team: string) => {
    try {
      // The pick will be broadcast via SSE
      const pickMessage: ChatMessage = {
        id: Date.now().toString(),
        user: username || 'You',
        message: `Drafted ${playerName} (${position}, ${team})`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, pickMessage]);
      onChatMessage?.(pickMessage);
      
    } catch (error) {
      onError?.('Failed to make pick');
    }
  }, [username, onChatMessage, onError]);

  const sendChatMessage = useCallback(async (message: string) => {
    try {
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        user: username || 'You',
        message,
        timestamp: new Date().toISOString(),
        userId
      };
      setChatMessages(prev => [...prev, chatMessage]);
      onChatMessage?.(chatMessage);
    } catch (error) {
      onError?.('Failed to send message');
    }
  }, [username, userId, onChatMessage, onError]);

  const startDraft = useCallback(async () => {
    try {
      setDraftState(prev => prev ? { ...prev, status: 'active' } : null);
      const startMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'System',
        message: 'Draft has been started!',
        timestamp: new Date().toISOString(),
        isSystem: true
      };
      setChatMessages(prev => [...prev, startMessage]);
      onChatMessage?.(startMessage);
    } catch (error) {
      onError?.('Failed to start draft');
    }
  }, [onChatMessage, onError]);

  const pauseDraft = useCallback(async () => {
    setDraftState(prev => prev ? { ...prev, status: 'paused' } : null);
    const pauseMessage: ChatMessage = {
      id: Date.now().toString(),
      user: 'System',
      message: 'Draft has been paused',
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    setChatMessages(prev => [...prev, pauseMessage]);
    onChatMessage?.(pauseMessage);
  }, [onChatMessage]);

  const resumeDraft = useCallback(async () => {
    setDraftState(prev => prev ? { ...prev, status: 'active' } : null);
    const resumeMessage: ChatMessage = {
      id: Date.now().toString(),
      user: 'System',
      message: 'Draft has been resumed',
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    setChatMessages(prev => [...prev, resumeMessage]);
    onChatMessage?.(resumeMessage);
  }, [onChatMessage]);

  const reconnect = useCallback(() => {
    setIsConnected(false);
    setTimeout(() => setIsConnected(true), 1000);
  }, []);

  return {
    isConnected,
    draftState: draftState ? { ...draftState, timeRemaining } : null,
    chatMessages,
    makePick,
    sendChatMessage,
    startDraft,
    pauseDraft,
    resumeDraft,
    reconnect
  };
}