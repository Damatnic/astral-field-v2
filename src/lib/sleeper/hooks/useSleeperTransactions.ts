import { useState } from 'react';
import useSWR from 'swr';

interface SleeperTransaction {
  id: string;
  transactionId: string;
  type: 'waiver' | 'free_agent' | 'trade' | 'commissioner';
  leagueId: string;
  status: 'complete' | 'failed' | 'pending';
  leg: number;
  scoringType: string;
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  rosterIds: number[];
  waiverBudget: Record<string, number>;
  freeAgentBudget: number;
  consenterIds: number[];
  draftPicks: any[];
  settings: Record<string, any>;
  metadata: Record<string, any>;
  statusUpdated: string;
  created: string;
}

interface PendingTrade {
  id: string;
  transactionId: string;
  leagueId: string;
  rosterIds: number[];
  adds: Record<string, number>;
  drops: Record<string, number>;
  draftPicks: any[];
  fairnessScore: number;
  analysis: any;
  status: string;
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
}

interface TransactionAnalytics {
  totalTransactions: number;
  byType: Record<string, number>;
  totalValue: number;
  averageValue: number;
  mostActiveDay: string | null;
  timeline: any[];
}

interface UseSleeperTransactionsReturn {
  transactions: SleeperTransaction[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  syncTransactions: (round?: number) => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  refresh: () => void;
}

interface UseSleeperTradesReturn {
  pendingTrades: PendingTrade[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseSleeperTransactionAnalyticsReturn {
  analytics: TransactionAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return response.json();
};

export function useSleeperTransactions(
  leagueId: string,
  options: {
    type?: string;
    limit?: number;
  } = {}
): UseSleeperTransactionsReturn {
  const { type, limit: initialLimit = 50 } = options;
  
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build URL with parameters
  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('leagueId', leagueId);
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    
    if (type) params.set('type', type);
    
    return `/api/sleeper/transactions?${params.toString()}`;
  };

  const { data, error: swrError, mutate } = useSWR(
    leagueId ? buildUrl() : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true
    }
  );

  const transactions = data?.transactions || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const loadMore = () => {
    setOffset(prevOffset => prevOffset + limit);
  };

  const syncTransactions = async (round?: number) => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch('/api/sleeper/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'sync',
          leagueId,
          round
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync transactions');
      }

      // Refresh the transactions data
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const startMonitoring = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch('/api/sleeper/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start-monitoring',
          leagueId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start monitoring');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
    } finally {
      setSyncing(false);
    }
  };

  const stopMonitoring = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch('/api/sleeper/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stop-monitoring',
          leagueId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop monitoring');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop monitoring');
    } finally {
      setSyncing(false);
    }
  };

  const refresh = () => {
    mutate();
  };

  return {
    transactions,
    total,
    loading: syncing || (!data && !swrError),
    error: error || (swrError ? 'Failed to load transactions' : null),
    hasMore,
    loadMore,
    syncTransactions,
    startMonitoring,
    stopMonitoring,
    refresh
  };
}

export function useSleeperTrades(leagueId: string): UseSleeperTradesReturn {
  const { data, error: swrError, mutate } = useSWR(
    leagueId ? `/api/sleeper/trades?leagueId=${leagueId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  );

  const pendingTrades = data?.trades || [];

  const refresh = () => {
    mutate();
  };

  return {
    pendingTrades,
    loading: !data && !swrError,
    error: swrError ? 'Failed to load pending trades' : null,
    refresh
  };
}

export function useSleeperTransactionAnalytics(
  leagueId: string,
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  }
): UseSleeperTransactionAnalyticsReturn {
  // Build URL with date range parameters
  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('leagueId', leagueId);
    
    if (dateRange?.startDate) {
      params.set('startDate', dateRange.startDate.toISOString());
    }
    if (dateRange?.endDate) {
      params.set('endDate', dateRange.endDate.toISOString());
    }
    
    return `/api/sleeper/transactions/analytics?${params.toString()}`;
  };

  const { data, error: swrError, mutate } = useSWR(
    leagueId ? buildUrl() : null,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: true
    }
  );

  const analytics = data?.analytics || null;

  const refresh = () => {
    mutate();
  };

  return {
    analytics,
    loading: !data && !swrError,
    error: swrError ? 'Failed to load transaction analytics' : null,
    refresh
  };
}