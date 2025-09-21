import { useState } from 'react';
import useSWR from 'swr';

interface SleeperLeague {
  id: string;
  name: string;
  season: string;
  seasonType: string;
  sport: string;
  status: string;
  totalRosters: number;
  scoringSettings: Record<string, any>;
  rosterPositions: string[];
  settings: Record<string, any>;
  metadata?: Record<string, any>;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface SleeperRoster {
  id: string;
  leagueId: string;
  rosterId: number;
  ownerId: string;
  players: string[];
  starters: string[];
  reserve: string[];
  taxi: string[];
  coOwners: string[];
  settings: Record<string, any>;
  metadata?: Record<string, any>;
  owner?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
}

interface LeagueStanding {
  rosterId: number;
  owner: any;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
}

interface UseSleeperLeaguesReturn {
  leagues: SleeperLeague[];
  loading: boolean;
  error: string | null;
  syncLeagues: (username: string) => Promise<void>;
  refresh: () => void;
}

interface UseSleeperLeagueReturn {
  league: SleeperLeague | null;
  rosters: SleeperRoster[];
  standings: LeagueStanding[];
  matchups: any[];
  loading: boolean;
  error: string | null;
  syncLeague: () => Promise<void>;
  refresh: () => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return response.json();
};

export function useSleeperLeagues(): UseSleeperLeaguesReturn {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: swrError, mutate } = useSWR(
    '/api/sleeper/leagues',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: true
    }
  );

  const leagues = data?.leagues || [];

  const syncLeagues = async (username: string) => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch('/api/sleeper/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync leagues');
      }

      // Refresh the leagues data
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

  return {
    leagues,
    loading: syncing || (!data && !swrError),
    error: error || (swrError ? 'Failed to load leagues' : null),
    syncLeagues,
    refresh
  };
}

export function useSleeperLeague(
  leagueId: string,
  options: {
    includeRosters?: boolean;
    includeStandings?: boolean;
    includeMatchups?: boolean;
  } = {}
): UseSleeperLeagueReturn {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { includeRosters = true, includeStandings = false, includeMatchups = false } = options;

  const include = [];
  if (includeRosters) include.push('rosters');
  if (includeStandings) include.push('standings');
  if (includeMatchups) include.push('matchups');

  const url = `/api/sleeper/leagues/${leagueId}?include=${include.join(',')}`;

  const { data, error: swrError, mutate } = useSWR(
    leagueId ? url : null,
    fetcher,
    {
      refreshInterval: 180000, // Refresh every 3 minutes
      revalidateOnFocus: true
    }
  );

  const league = data?.league || null;
  const rosters = data?.league?.sleeperRosters || [];
  const standings = data?.standings || [];
  const matchups = data?.matchups || [];

  const syncLeague = async () => {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch(`/api/sleeper/leagues/${leagueId}`, {
        method: 'PUT'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync league');
      }

      // Refresh the league data
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

  return {
    league,
    rosters,
    standings,
    matchups,
    loading: syncing || (!data && !swrError),
    error: error || (swrError ? 'Failed to load league' : null),
    syncLeague,
    refresh
  };
}