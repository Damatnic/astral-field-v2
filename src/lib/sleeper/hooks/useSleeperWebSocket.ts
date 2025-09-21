import { useState, useEffect, useCallback } from 'react';
import { sleeperWebSocket } from '../api/websocket';

interface WebSocketStatus {
  connected: boolean;
  subscriptions: number;
  lastHeartbeat: number;
  messageQueueSize: number;
}

interface UseSleeperWebSocketReturn {
  wsStatus: WebSocketStatus;
  isConnected: boolean;
  subscriptions: string[];
  
  // League subscriptions
  subscribeToLeague: (leagueId: string) => void;
  unsubscribeFromLeague: (leagueId: string) => void;
  
  // Draft subscriptions
  subscribeToDraft: (draftId: string) => void;
  unsubscribeFromDraft: (draftId: string) => void;
  
  // Scoring subscriptions
  subscribeToScoring: (leagueId: string, week: number) => void;
  unsubscribeFromScoring: (leagueId: string, week: number) => void;
  
  // Transaction subscriptions
  subscribeToTransactions: (leagueId: string) => void;
  unsubscribeFromTransactions: (leagueId: string) => void;
  
  // Trade subscriptions
  subscribeToTrades: (leagueId: string) => void;
  unsubscribeFromTrades: (leagueId: string) => void;
  
  // Player news subscription
  subscribeToPlayerNews: () => void;
  unsubscribeFromPlayerNews: () => void;
  
  // Event listeners
  addEventListener: (event: string, callback: (data: any) => void) => () => void;
  
  // Utility methods
  clearAllSubscriptions: () => void;
  reconnect: () => void;
}

export function useSleeperWebSocket(): UseSleeperWebSocketReturn {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({
    connected: false,
    subscriptions: 0,
    lastHeartbeat: 0,
    messageQueueSize: 0
  });
  
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = sleeperWebSocket.getConnectionStatus();
      const subs = sleeperWebSocket.getSubscriptions();
      
      setWsStatus(status);
      setSubscriptions(subs);
    };

    // Initial update
    updateStatus();

    // Set up listeners for status changes
    const handleConnected = () => updateStatus();
    const handleDisconnected = () => updateStatus();
    const handleError = () => updateStatus();

    sleeperWebSocket.on('connected', handleConnected);
    sleeperWebSocket.on('disconnected', handleDisconnected);
    sleeperWebSocket.on('error', handleError);

    // Update status every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    return () => {
      sleeperWebSocket.off('connected', handleConnected);
      sleeperWebSocket.off('disconnected', handleDisconnected);
      sleeperWebSocket.off('error', handleError);
      clearInterval(interval);
    };
  }, []);

  // League subscriptions
  const subscribeToLeague = useCallback((leagueId: string) => {
    sleeperWebSocket.subscribeToLeague(leagueId);
  }, []);

  const unsubscribeFromLeague = useCallback((leagueId: string) => {
    sleeperWebSocket.unsubscribeFromLeague(leagueId);
  }, []);

  // Draft subscriptions
  const subscribeToDraft = useCallback((draftId: string) => {
    sleeperWebSocket.subscribeToDraft(draftId);
  }, []);

  const unsubscribeFromDraft = useCallback((draftId: string) => {
    sleeperWebSocket.unsubscribeFromDraft(draftId);
  }, []);

  // Scoring subscriptions
  const subscribeToScoring = useCallback((leagueId: string, week: number) => {
    sleeperWebSocket.subscribeToScoring(leagueId, week);
  }, []);

  const unsubscribeFromScoring = useCallback((leagueId: string, week: number) => {
    sleeperWebSocket.unsubscribeFromScoring(leagueId, week);
  }, []);

  // Transaction subscriptions
  const subscribeToTransactions = useCallback((leagueId: string) => {
    sleeperWebSocket.subscribeToTransactions(leagueId);
  }, []);

  const unsubscribeFromTransactions = useCallback((leagueId: string) => {
    sleeperWebSocket.unsubscribeFromTransactions(leagueId);
  }, []);

  // Trade subscriptions
  const subscribeToTrades = useCallback((leagueId: string) => {
    sleeperWebSocket.subscribeToTrades(leagueId);
  }, []);

  const unsubscribeFromTrades = useCallback((leagueId: string) => {
    sleeperWebSocket.unsubscribeFromTrades(leagueId);
  }, []);

  // Player news subscription
  const subscribeToPlayerNews = useCallback(() => {
    sleeperWebSocket.subscribeToPlayerNews();
  }, []);

  const unsubscribeFromPlayerNews = useCallback(() => {
    sleeperWebSocket.unsubscribeFromPlayerNews();
  }, []);

  // Event listener management
  const addEventListener = useCallback((event: string, callback: (data: any) => void) => {
    sleeperWebSocket.on(event, callback);
    
    // Return cleanup function
    return () => {
      sleeperWebSocket.off(event, callback);
    };
  }, []);

  // Utility methods
  const clearAllSubscriptions = useCallback(() => {
    sleeperWebSocket.clearAllSubscriptions();
  }, []);

  const reconnect = useCallback(() => {
    sleeperWebSocket.close();
    // WebSocket will automatically reconnect
  }, []);

  return {
    wsStatus,
    isConnected: wsStatus.connected,
    subscriptions,
    
    // League subscriptions
    subscribeToLeague,
    unsubscribeFromLeague,
    
    // Draft subscriptions
    subscribeToDraft,
    unsubscribeFromDraft,
    
    // Scoring subscriptions
    subscribeToScoring,
    unsubscribeFromScoring,
    
    // Transaction subscriptions
    subscribeToTransactions,
    unsubscribeFromTransactions,
    
    // Trade subscriptions
    subscribeToTrades,
    unsubscribeFromTrades,
    
    // Player news subscription
    subscribeToPlayerNews,
    unsubscribeFromPlayerNews,
    
    // Event listeners
    addEventListener,
    
    // Utility methods
    clearAllSubscriptions,
    reconnect
  };
}

// Specific event hooks for common use cases
export function useSleeperDraftUpdates(draftId: string | null) {
  const { addEventListener } = useSleeperWebSocket();
  const [latestPick, setLatestPick] = useState<any>(null);
  const [draftUpdates, setDraftUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!draftId) return;

    const cleanupPick = addEventListener('draftPick', (data) => {
      if (data.draft_id === draftId) {
        setLatestPick(data);
        setDraftUpdates(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      }
    });

    const cleanupUpdate = addEventListener('draftUpdate', (data) => {
      if (data.draft_id === draftId) {
        setDraftUpdates(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      }
    });

    return () => {
      cleanupPick();
      cleanupUpdate();
    };
  }, [draftId, addEventListener]);

  return { latestPick, draftUpdates };
}

export function useSleeperScoringUpdates(leagueId: string | null, week?: number) {
  const { addEventListener } = useSleeperWebSocket();
  const [scoreUpdates, setScoreUpdates] = useState<any[]>([]);
  const [matchupUpdates, setMatchupUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!leagueId) return;

    const cleanupScore = addEventListener('scoreUpdate', (data) => {
      if (data.league_id === leagueId && (!week || data.week === week)) {
        setScoreUpdates(prev => [data, ...prev.slice(0, 19)]); // Keep last 20
      }
    });

    const cleanupMatchup = addEventListener('matchupScoreUpdate', (data) => {
      if (data.leagueId === leagueId && (!week || data.week === week)) {
        setMatchupUpdates(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      }
    });

    return () => {
      cleanupScore();
      cleanupMatchup();
    };
  }, [leagueId, week, addEventListener]);

  return { scoreUpdates, matchupUpdates };
}

export function useSleeperTransactionUpdates(leagueId: string | null) {
  const { addEventListener } = useSleeperWebSocket();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tradeOffers, setTradeOffers] = useState<any[]>([]);

  useEffect(() => {
    if (!leagueId) return;

    const cleanupTransaction = addEventListener('transactionUpdate', (data) => {
      if (data.league_id === leagueId) {
        setTransactions(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      }
    });

    const cleanupTradeOffer = addEventListener('tradeOffer', (data) => {
      if (data.data?.league_id === leagueId) {
        setTradeOffers(prev => [data, ...prev.slice(0, 4)]); // Keep last 5
      }
    });

    const cleanupTradeAccepted = addEventListener('tradeAccepted', (data) => {
      if (data.league_id === leagueId) {
        setTradeOffers(prev => prev.filter(offer => 
          offer.data?.transaction_id !== data.transaction_id
        ));
      }
    });

    const cleanupTradeRejected = addEventListener('tradeRejected', (data) => {
      if (data.league_id === leagueId) {
        setTradeOffers(prev => prev.filter(offer => 
          offer.data?.transaction_id !== data.transaction_id
        ));
      }
    });

    return () => {
      cleanupTransaction();
      cleanupTradeOffer();
      cleanupTradeAccepted();
      cleanupTradeRejected();
    };
  }, [leagueId, addEventListener]);

  return { transactions, tradeOffers };
}