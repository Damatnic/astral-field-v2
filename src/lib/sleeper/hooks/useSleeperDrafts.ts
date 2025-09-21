import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSleeperWebSocket } from './useSleeperWebSocket';

interface SleeperDraft {
  id: string;
  type: string;
  status: string;
  sport: string;
  season: string;
  seasonType: string;
  leagueId?: string;
  settings: Record<string, any>;
  draftOrder?: Record<string, number>;
  slotToRosterId?: Record<string, number>;
  creators: string[];
  created: string;
  lastPicked: string;
  lastMessageId: string;
  lastMessageTime: string;
  metadata?: Record<string, any>;
  picks?: DraftPick[];
}

interface DraftPick {
  id: string;
  draftId: string;
  pickNo: number;
  playerId: string;
  player?: SleeperPlayer;
  pickedBy: string;
  rosterId: number;
  round: number;
  draftSlot: number;
  metadata: Record<string, any>;
  isKeeper: boolean;
  syncedAt: string;
  createdAt: string;
}

interface SleeperPlayer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  team?: string;
  age?: number;
  yearsExp?: number;
}

interface DraftBoard {
  draftId: string;
  picks: DraftPick[];
  currentPick: {
    round: number;
    pickNumber: number;
    rosterId: number;
    timeRemaining?: number;
  };
  draftOrder: Record<string, number>;
  availablePlayers: SleeperPlayer[];
  rosterComposition: Record<number, {
    rosterId: number;
    picks: DraftPick[];
    positionCounts: Record<string, number>;
    needsAssessment: string[];
  }>;
}

interface PlayerRecommendation extends SleeperPlayer {
  recommendationReason: string;
}

interface UseSleeperDraftReturn {
  draft: SleeperDraft | null;
  draftBoard: DraftBoard | null;
  analytics: any;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  startLiveDraft: () => Promise<void>;
  stopLiveDraft: () => Promise<void>;
  syncDraft: () => Promise<void>;
  refresh: () => void;
}

interface UseSleeperDraftRecommendationsReturn {
  recommendations: PlayerRecommendation[];
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

export function useSleeperDraft(
  draftId: string,
  options: {
    includePicks?: boolean;
    includeBoard?: boolean;
    includeAnalytics?: boolean;
  } = {}
): UseSleeperDraftReturn {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const { wsStatus, subscribeToDraft, unsubscribeFromDraft } = useSleeperWebSocket();

  const { includePicks = true, includeBoard = false, includeAnalytics = false } = options;

  const include = [];
  if (includePicks) include.push('picks');
  if (includeBoard) include.push('board');
  if (includeAnalytics) include.push('analytics');

  const url = `/api/sleeper/drafts/${draftId}?include=${include.join(',')}`;

  const { data, error: swrError, mutate } = useSWR(
    draftId ? url : null,
    fetcher,
    {
      refreshInterval: isLive ? 5000 : 60000, // 5s when live, 1min when not
      revalidateOnFocus: true
    }
  );

  const draft = data?.draft || null;
  const draftBoard = data?.board || null;
  const analytics = data?.analytics || null;

  const startLiveDraft = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`/api/sleeper/drafts/${draftId}/live`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start live draft');
      }

      setIsLive(true);
      
      // Subscribe to WebSocket updates
      if (wsStatus.connected) {
        subscribeToDraft(draftId);
      }

      // Refresh the draft data
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start live draft');
    } finally {
      setSyncing(false);
    }
  };

  const stopLiveDraft = async () => {
    try {
      const response = await fetch(`/api/sleeper/drafts/${draftId}/live`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop live draft');
      }

      setIsLive(false);
      
      // Unsubscribe from WebSocket updates
      unsubscribeFromDraft(draftId);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop live draft');
    }
  };

  const syncDraft = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`/api/sleeper/drafts/${draftId}`, {
        method: 'PUT'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync draft');
      }

      // Refresh the draft data
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const refresh = () => {
    mutate();
  };

  // Auto-subscribe to WebSocket when live draft is enabled
  useEffect(() => {
    if (isLive && wsStatus.connected) {
      subscribeToDraft(draftId);
    }

    return () => {
      if (isLive) {
        unsubscribeFromDraft(draftId);
      }
    };
  }, [isLive, wsStatus.connected, draftId, subscribeToDraft, unsubscribeFromDraft]);

  return {
    draft,
    draftBoard,
    analytics,
    loading: syncing || (!data && !swrError),
    error: error || (swrError ? 'Failed to load draft' : null),
    isLive,
    startLiveDraft,
    stopLiveDraft,
    syncDraft,
    refresh
  };
}

export function useSleeperDraftRecommendations(
  draftId: string,
  count = 10
): UseSleeperDraftRecommendationsReturn {
  const url = `/api/sleeper/drafts/${draftId}/recommendations?count=${count}`;

  const { data, error: swrError, mutate } = useSWR(
    draftId ? url : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  );

  const recommendations = data?.recommendations || [];

  const refresh = () => {
    mutate();
  };

  return {
    recommendations,
    loading: !data && !swrError,
    error: swrError ? 'Failed to load recommendations' : null,
    refresh
  };
}