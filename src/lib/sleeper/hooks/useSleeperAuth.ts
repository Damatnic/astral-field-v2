import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata?: Record<string, any>;
  created?: number;
}

interface SleeperAuthState {
  connected: boolean;
  user: SleeperUser | null;
  loading: boolean;
  error: string | null;
}

interface UseSleeperAuthReturn extends SleeperAuthState {
  connect: (redirectUrl?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return response.json();
};

export function useSleeperAuth(): UseSleeperAuthReturn {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: swrError, mutate } = useSWR(
    session?.user ? '/api/sleeper/auth' : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true
    }
  );

  const connected = data?.connected || false;
  const user = data?.user || null;

  const connect = async (redirectUrl?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sleeper/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ redirectUrl })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate connection');
      }

      const { authUrl } = await response.json();
      
      // Redirect to Sleeper OAuth
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sleeper/auth', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }

      // Refresh the auth state
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    mutate();
  };

  // Handle URL parameters for OAuth callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const connected = urlParams.get('connected');
      const error = urlParams.get('error');

      if (connected === 'true') {
        // Clear URL parameters and refresh data
        window.history.replaceState({}, '', window.location.pathname);
        mutate();
      } else if (error) {
        setError(decodeURIComponent(error));
        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [mutate]);

  return {
    connected,
    user,
    loading: loading || (!data && !swrError),
    error: error || (swrError ? 'Failed to load auth status' : null),
    connect,
    disconnect,
    refresh
  };
}