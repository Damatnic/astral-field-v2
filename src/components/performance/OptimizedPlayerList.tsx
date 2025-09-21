/**
 * Performance-Optimized Player List Component
 * Features: Virtual scrolling, memoization, lazy loading, and debounced search
 */

'use client';

import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
// @ts-expect-error react-window types not available
import { FixedSizeList as List } from 'react-window';
import { debounce } from 'lodash';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { clientCache, cacheKeys } from '@/lib/cache';

interface Player {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  status: string;
  fantasyScore: number;
  projectedPoints: number;
  averagePoints: number;
  isRostered: boolean;
}

interface PlayerListProps {
  leagueId?: string;
  onPlayerSelect?: (player: Player) => void;
  filters?: {
    positions?: string[];
    availability?: 'all' | 'available' | 'rostered';
  };
  height?: number;
  className?: string;
}

// Memoized Player Row Component
const PlayerRow = memo(({ index, style, data }: any) => {
  const { players, onPlayerSelect } = data;
  const player = players[index];

  const handleClick = useCallback(() => {
    onPlayerSelect?.(player);
  }, [player, onPlayerSelect]);

  if (!player) {
    return (
      <div style={style} className="p-2">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div style={style} className="p-2">
      <Card 
        className="p-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{player.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {player.position}
              </Badge>
              <span className="text-xs text-muted-foreground">{player.nflTeam}</span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs">
                Proj: <span className="font-medium">{player.projectedPoints.toFixed(1)}</span>
              </span>
              <span className="text-xs">
                Avg: <span className="font-medium">{player.averagePoints.toFixed(1)}</span>
              </span>
              {player.isRostered && (
                <Badge variant="outline" className="text-xs">Rostered</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">
              {player.fantasyScore}
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
      </Card>
    </div>
  );
});

PlayerRow.displayName = 'PlayerRow';

// Main Component
const OptimizedPlayerList: React.FC<PlayerListProps> = ({
  leagueId,
  onPlayerSelect,
  filters = {},
  height = 600,
  className = '',
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const listRef = useRef<List>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      await fetchPlayers(term, 1, true);
    }, 300),
    [leagueId, filters]
  );

  // Optimized fetch function with caching
  const fetchPlayers = useCallback(async (
    search: string = '', 
    currentPage: number = 1, 
    reset: boolean = false
  ) => {
    if (loading && !reset) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cacheKey = cacheKeys.players(JSON.stringify({
        search,
        page: currentPage,
        leagueId,
        ...filters,
      }));
      
      const cachedData = clientCache.get<{ players: Player[], hasMore: boolean }>(cacheKey);
      
      if (cachedData && !reset) {
        if (reset) {
          setPlayers(cachedData.players);
        } else {
          setPlayers(prev => [...prev, ...cachedData.players]);
        }
        setHasMore(cachedData.hasMore);
        setLoading(false);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(search && { search }),
        ...(leagueId && { leagueId }),
        ...(filters.positions?.length && { positions: filters.positions.join(',') }),
        ...(filters.availability && filters.availability !== 'all' && { availability: filters.availability }),
      });

      const response = await fetch(`/api/players?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const newPlayers = data.data || [];
        const hasMoreData = data.pagination?.hasMore || false;

        // Cache the result
        clientCache.set(cacheKey, { 
          players: newPlayers, 
          hasMore: hasMoreData 
        }, 300); // 5 min cache

        if (reset) {
          setPlayers(newPlayers);
        } else {
          setPlayers(prev => [...prev, ...newPlayers]);
        }
        setHasMore(hasMoreData);
      } else {
        throw new Error(data.message || 'Failed to fetch players');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch players:', error);
        setError(error.message || 'Failed to load players');
      }
    } finally {
      setLoading(false);
    }
  }, [leagueId, filters, loading]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => {
        const nextPage = prev + 1;
        fetchPlayers(searchTerm, nextPage, false);
        return nextPage;
      });
    }
  }, [loading, hasMore, searchTerm, fetchPlayers]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPage(1);
    setPlayers([]);
    setHasMore(true);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle scroll for infinite loading
  const handleItemsRendered = useCallback(({ visibleStopIndex }: any) => {
    const buffer = 10; // Load more when 10 items from the end
    if (visibleStopIndex >= players.length - buffer && hasMore && !loading) {
      loadMore();
    }
  }, [players.length, hasMore, loading, loadMore]);

  // Initial load
  useEffect(() => {
    fetchPlayers('', 1, true);
  }, [leagueId, filters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Memoized list data
  const listData = useMemo(() => ({
    players,
    onPlayerSelect,
  }), [players, onPlayerSelect]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search Input */}
      <div className="p-4 border-b">
        <Input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 border-b">
          {error}
        </div>
      )}

      {/* Player List */}
      <div className="flex-1">
        {players.length === 0 && loading ? (
          // Loading skeleton
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : players.length === 0 && !loading ? (
          // Empty state
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            {searchTerm ? 'No players found matching your search.' : 'No players available.'}
          </div>
        ) : (
          // Virtual list
          <List
            ref={listRef}
            height={height - 80} // Account for search input height
            itemCount={players.length + (hasMore ? 1 : 0)} // +1 for loading item
            itemSize={80}
            itemData={listData}
            onItemsRendered={handleItemsRendered}
            overscanCount={5} // Pre-render 5 items outside viewport
          >
            {PlayerRow}
          </List>
        )}
      </div>

      {/* Loading indicator at bottom */}
      {loading && players.length > 0 && (
        <div className="p-4 text-center border-t">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading more players...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(OptimizedPlayerList);