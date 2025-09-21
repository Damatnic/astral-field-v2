import { useState } from 'react';
import useSWR from 'swr';

interface SleeperPlayer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  searchFullName: string;
  position: string;
  team?: string;
  age?: number;
  yearsExp?: number;
  college?: string;
  height?: string;
  weight?: string;
  number?: number;
  depth?: number;
  status?: string;
  injuryStatus?: string;
  injuryNotes?: string;
  birthDate?: string;
  stats?: Record<string, any>;
  projections?: Record<string, any>;
  metadata?: Record<string, any>;
  hashtag?: string;
  depthChartOrder?: number;
  searchRank?: number;
  fantasyPositions: string[];
  newsUpdated?: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PlayerStats {
  id: string;
  playerId: string;
  season: string;
  week: number;
  gameId: string;
  team: string;
  opponent: string;
  stats: Record<string, number>;
  fantasyPointsDefault: number;
  fantasyPointsPpr: number;
  fantasyPointsHalfPpr: number;
  lastUpdated: string;
  syncedAt: string;
}

interface PlayerProjections {
  id: string;
  playerId: string;
  season: string;
  week: number;
  projectedStats: Record<string, number>;
  projectedPointsDefault: number;
  projectedPointsPpr: number;
  projectedPointsHalfPpr: number;
  confidence: number;
  lastUpdated: string;
  syncedAt: string;
}

interface PlayerNews {
  id: string;
  playerId: string;
  source: string;
  title: string;
  content: string;
  url?: string;
  impact: string;
  isBreaking: boolean;
  publishedAt: string;
  createdAt: string;
}

interface UseSleeperPlayersReturn {
  players: SleeperPlayer[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  search: (query: string, filters?: PlayerSearchFilters) => void;
  syncPlayers: () => Promise<void>;
  syncTrending: () => Promise<void>;
  refresh: () => void;
}

interface UseSleeperPlayerReturn {
  player: SleeperPlayer | null;
  stats: PlayerStats | PlayerStats[] | null;
  projections: PlayerProjections | PlayerProjections[] | null;
  news: PlayerNews[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface PlayerSearchFilters {
  position?: string;
  team?: string;
  trending?: boolean;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return response.json();
};

export function useSleeperPlayers(
  initialFilters: PlayerSearchFilters = {},
  initialLimit = 50
): UseSleeperPlayersReturn {
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build URL with search parameters
  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    
    if (search) params.set('search', search);
    if (filters.position) params.set('position', filters.position);
    if (filters.team) params.set('team', filters.team);
    if (filters.trending) params.set('trending', 'true');
    
    return `/api/sleeper/players?${params.toString()}`;
  };

  const { data, error: swrError, mutate } = useSWR(
    buildUrl(),
    fetcher,
    {
      refreshInterval: filters.trending ? 60000 : 300000, // 1min for trending, 5min for others
      revalidateOnFocus: true
    }
  );

  const players = data?.players || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const loadMore = () => {
    setOffset(prevOffset => prevOffset + limit);
  };

  const searchPlayers = (query: string, newFilters: PlayerSearchFilters = {}) => {
    setSearch(query);
    setFilters({ ...filters, ...newFilters });
    setOffset(0); // Reset offset when searching
  };

  const syncPlayers = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch('/api/sleeper/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync players');
      }

      // Refresh the players data
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const syncTrending = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch('/api/sleeper/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync-trending' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync trending players');
      }

      // Refresh the players data if currently showing trending
      if (filters.trending) {
        await mutate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const refresh = () => {
    mutate();
  };

  return {
    players,
    total,
    loading: syncing || (!data && !swrError),
    error: error || (swrError ? 'Failed to load players' : null),
    hasMore,
    loadMore,
    search: searchPlayers,
    syncPlayers,
    syncTrending,
    refresh
  };
}

export function useSleeperPlayer(
  playerId: string,
  options: {
    includeStats?: boolean;
    includeProjections?: boolean;
    includeNews?: boolean;
    season?: string;
    week?: number;
  } = {}
): UseSleeperPlayerReturn {
  const {
    includeStats = false,
    includeProjections = false,
    includeNews = false,
    season = '2024',
    week
  } = options;

  const include = [];
  if (includeStats) include.push('stats');
  if (includeProjections) include.push('projections');
  if (includeNews) include.push('news');

  const params = new URLSearchParams();
  if (include.length > 0) params.set('include', include.join(','));
  params.set('season', season);
  if (week) params.set('week', week.toString());

  const url = `/api/sleeper/players/${playerId}?${params.toString()}`;

  const { data, error: swrError, mutate } = useSWR(
    playerId ? url : null,
    fetcher,
    {
      refreshInterval: includeStats ? 30000 : 300000, // 30s for stats, 5min for others
      revalidateOnFocus: true
    }
  );

  const player = data?.player || null;
  const stats = data?.stats || null;
  const projections = data?.projections || null;
  const news = data?.news || [];

  const refresh = () => {
    mutate();
  };

  return {
    player,
    stats,
    projections,
    news,
    loading: !data && !swrError,
    error: swrError ? 'Failed to load player' : null,
    refresh
  };
}