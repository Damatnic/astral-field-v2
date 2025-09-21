import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSleeperWebSocket } from './useSleeperWebSocket';

interface MatchupScoring {
  rosterId: number;
  owner: any;
  points: number;
  projectedPoints?: number;
  starters: string[];
  startersPoints: number[];
  lastUpdated: string;
}

interface LiveScoringConfig {
  leagueId: string;
  week: number;
  updateInterval: number;
  enableWebSocket: boolean;
}

interface UseSleeperScoringReturn {
  scoring: MatchupScoring[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isLive: boolean;
  startLiveScoring: (config?: Partial<LiveScoringConfig>) => Promise<void>;
  stopLiveScoring: () => Promise<void>;
  syncScoring: (week?: number) => Promise<void>;
  refresh: () => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return response.json();
};

export function useSleeperScoring(
  leagueId: string,
  week?: number
): UseSleeperScoringReturn {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { wsStatus, subscribeToScoring, unsubscribeFromScoring } = useSleeperWebSocket();

  const currentWeek = week || new Date().getWeek(); // You'll need to implement getWeek()
  const url = `/api/sleeper/leagues/${leagueId}/scoring?week=${currentWeek}`;

  const { data, error: swrError, mutate } = useSWR(
    leagueId ? url : null,
    fetcher,
    {
      refreshInterval: isLive ? 30000 : 300000, // 30s when live, 5min when not
      revalidateOnFocus: true
    }
  );

  const scoring = data?.scoring || [];

  const startLiveScoring = async (config: Partial<LiveScoringConfig> = {}) => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`/api/sleeper/leagues/${leagueId}/scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          week: currentWeek,
          startLive: true,
          ...config
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start live scoring');
      }

      setIsLive(true);
      
      // Subscribe to WebSocket updates
      if (wsStatus.connected) {
        subscribeToScoring(leagueId, currentWeek);
      }

      // Refresh the scoring data
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start live scoring');
    } finally {
      setSyncing(false);
    }
  };

  const stopLiveScoring = async () => {
    try {
      setIsLive(false);
      
      // Unsubscribe from WebSocket updates
      unsubscribeFromScoring(leagueId, currentWeek);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop live scoring');
    }
  };

  const syncScoring = async (weekToSync?: number) => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`/api/sleeper/leagues/${leagueId}/scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          week: weekToSync || currentWeek,
          startLive: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync scoring');
      }

      // Refresh the scoring data
      await mutate();
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const refresh = () => {
    mutate();
    setLastUpdated(new Date());
  };

  // Update last updated timestamp when data changes
  useEffect(() => {
    if (data?.lastUpdated) {
      setLastUpdated(new Date(data.lastUpdated));
    }
  }, [data]);

  // Auto-subscribe to WebSocket when live scoring is enabled
  useEffect(() => {
    if (isLive && wsStatus.connected) {
      subscribeToScoring(leagueId, currentWeek);
    }

    return () => {
      if (isLive) {
        unsubscribeFromScoring(leagueId, currentWeek);
      }
    };
  }, [isLive, wsStatus.connected, leagueId, currentWeek, subscribeToScoring, unsubscribeFromScoring]);

  return {
    scoring,
    loading: syncing || (!data && !swrError),
    error: error || (swrError ? 'Failed to load scoring' : null),
    lastUpdated,
    isLive,
    startLiveScoring,
    stopLiveScoring,
    syncScoring,
    refresh
  };
}

// Helper function to get current NFL week (you'll need to implement this based on your needs)
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  // Simplified implementation - you should replace with actual NFL week calculation
  const start = new Date(this.getFullYear(), 8, 1); // September 1st
  const diff = this.getTime() - start.getTime();
  const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, week)); // NFL weeks 1-18
};