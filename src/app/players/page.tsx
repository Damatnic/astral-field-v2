'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, Position, PlayerStatus, PlayerSearchFilters } from '@/types/fantasy';
import PlayerCard from '@/components/player/PlayerCard';
import PlayerSearch from '@/components/player/PlayerSearch';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<PlayerSearchFilters>({
    position: [],
    team: [],
    status: [PlayerStatus.ACTIVE, PlayerStatus.QUESTIONABLE, PlayerStatus.DOUBTFUL],
    availability: 'all',
    searchQuery: ''
  });

  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [leagues, setLeagues] = useState<any[]>([]);

  useEffect(() => {
    fetchUserLeagues();
  }, []);

  useEffect(() => {
    setPage(1);
    setPlayers([]);
    fetchPlayers(1, true);
  }, [filters, selectedLeague]);

  const fetchUserLeagues = async () => {
    try {
      const response = await fetch('/api/leagues?limit=50');
      const data = await response.json();
      if (data.data) {
        setLeagues(data.data);
        if (data.data.length > 0) {
          setSelectedLeague(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

  const fetchPlayers = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        search: filters.searchQuery || '',
        availability: filters.availability || 'all'
      });

      if (filters.position && filters.position.length > 0) {
        params.append('positions', filters.position.join(','));
      }

      if (filters.team && filters.team.length > 0) {
        params.append('teams', filters.team.join(','));
      }

      if (filters.status && filters.status.length > 0) {
        params.append('statuses', filters.status.join(','));
      }

      if (selectedLeague) {
        params.append('leagueId', selectedLeague);
      }

      const response = await fetch(`/api/players?${params}`);
      const data = await response.json();

      if (data.data) {
        if (reset) {
          setPlayers(data.data);
        } else {
          setPlayers(prev => [...prev, ...data.data]);
        }
        setHasMore(data.pagination.hasMore);
      } else {
        setError('Failed to load players');
      }
    } catch (error) {
      setError('Error loading players');
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedLeague]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlayers(nextPage);
    }
  };

  const handleAddPlayer = async (playerId: string) => {
    // This would integrate with waiver/free agent system
    console.log('Add player:', playerId);
  };

  const handleDropPlayer = async (playerId: string) => {
    // This would integrate with roster management
    console.log('Drop player:', playerId);
  };

  const handleTradePlayer = async (playerId: string) => {
    // This would open trade interface
    console.log('Trade player:', playerId);
  };

  const groupedPlayers = players.reduce((groups, player) => {
    const position = player.position;
    if (!groups[position]) {
      groups[position] = [];
    }
    groups[position].push(player);
    return groups;
  }, {} as Record<Position, Player[]>);

  const positionOrder: Position[] = [Position.QB, Position.RB, Position.WR, Position.TE, Position.K, Position.DST];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Player Database</h1>
              <p className="mt-2 text-gray-600">
                Search and analyze NFL players for your fantasy lineup
              </p>
            </div>

            {/* League Selector */}
            {leagues.length > 0 && (
              <div className="mt-4 lg:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View for League
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                >
                  <option value="">All Players</option>
                  {leagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PlayerSearch
          filters={filters}
          onFiltersChange={setFilters}
          playerCount={players.length}
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {players.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="h-24 w-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or filters to find players.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {positionOrder.map((position) => {
              const positionPlayers = groupedPlayers[position];
              if (!positionPlayers || positionPlayers.length === 0) return null;

              return (
                <div key={position}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {position} ({positionPlayers.length})
                    </h2>
                    <div className="text-sm text-gray-500">
                      {position === Position.QB && "Quarterbacks"}
                      {position === Position.RB && "Running Backs"}
                      {position === Position.WR && "Wide Receivers"}
                      {position === Position.TE && "Tight Ends"}
                      {position === Position.K && "Kickers"}
                      {position === Position.DST && "Defense/Special Teams"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {positionPlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        isRostered={(player as any).isRostered}
                        isAvailable={!(player as any).isRostered}
                        showActions={!!selectedLeague}
                        onAdd={handleAddPlayer}
                        onDrop={handleDropPlayer}
                        onTrade={handleTradePlayer}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Loading...' : 'Load More Players'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && players.length === 0 && (
          <div className="space-y-8">
            {positionOrder.map((position) => (
              <div key={position}>
                <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg h-64 shadow animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}