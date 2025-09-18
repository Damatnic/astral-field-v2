'use client';

import { handleComponentError } from '@/lib/error-handling';
import { useState, useEffect, useCallback } from 'react';
import { Player, Position, PlayerStatus, PlayerSearchFilters } from '@/types/fantasy';
import PlayerSearch from '@/components/player/PlayerSearch';
import { EnhancedCard, EnhancedButton, EnhancedBadge, PlayerCard, LoadingSpinner } from '@/components/ui/enhanced-components';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnhancedPlayersPage() {
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'projection' | 'owned'>('points');

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
      handleComponentError(error as Error, 'page');
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
        availability: filters.availability || 'all',
        sortBy: sortBy
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
      handleComponentError(error as Error, 'page');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedLeague, sortBy]);

  useEffect(() => {
    fetchUserLeagues();
  }, []);

  useEffect(() => {
    setPage(1);
    setPlayers([]);
    fetchPlayers(1, true);
  }, [filters, selectedLeague, fetchPlayers]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlayers(nextPage);
    }
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

  const getPositionInfo = (position: Position) => {
    const positionData = {
      QB: { name: 'Quarterbacks', icon: '🏈', color: 'purple' },
      RB: { name: 'Running Backs', icon: '🏃', color: 'blue' },
      WR: { name: 'Wide Receivers', icon: '🏃‍♂️', color: 'green' },
      TE: { name: 'Tight Ends', icon: '🤾', color: 'orange' },
      K: { name: 'Kickers', icon: '🦵', color: 'gray' },
      DST: { name: 'Defense/Special Teams', icon: '🛡️', color: 'red' },
      P: { name: 'Punters', icon: '🦵', color: 'gray' },
      LB: { name: 'Linebackers', icon: '🛡️', color: 'red' },
      DB: { name: 'Defensive Backs', icon: '🛡️', color: 'red' },
      DL: { name: 'Defensive Line', icon: '🛡️', color: 'red' },
      CB: { name: 'Cornerbacks', icon: '🛡️', color: 'red' },
      S: { name: 'Safeties', icon: '🛡️', color: 'red' }
    } as const;
    return positionData[position as keyof typeof positionData] || { name: position.toString(), icon: '⚡', color: 'gray' };
  };

  const getPlayerCounts = () => {
    const total = players.length;
    const available = players.filter(p => !(p as any).isRostered).length;
    const rostered = total - available;
    return { total, available, rostered };
  };

  if (loading && players.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  const playerCounts = getPlayerCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Hero Header */}
      <motion.div 
        className="bg-gradient-to-r from-green-900 via-blue-900 to-purple-900 text-white relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Player Universe
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mb-6">
                Discover, analyze, and track every NFL player. Make data-driven decisions for your fantasy lineup.
              </p>
              
              {/* Player Stats */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold">{playerCounts.total}</div>
                  <div className="text-sm text-blue-200">Total Players</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-300">{playerCounts.available}</div>
                  <div className="text-sm text-blue-200">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-300">{playerCounts.rostered}</div>
                  <div className="text-sm text-blue-200">Rostered</div>
                </div>
              </div>
            </motion.div>

            {/* League Selector */}
            {leagues.length > 0 && (
              <motion.div
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  View for League
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 min-w-[200px]"
                >
                  <option value="" className="text-gray-900">All Players</option>
                  {leagues.map((league) => (
                    <option key={league.id} value={league.id} className="text-gray-900">
                      {league.name}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search and Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <EnhancedCard className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Search Component */}
            <div className="flex-1 w-full">
              <PlayerSearch
                filters={filters}
                onFiltersChange={setFilters}
                playerCount={players.length}
              />
            </div>
            
            {/* View Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="points">Fantasy Points</option>
                  <option value="projection">Projection</option>
                  <option value="name">Name</option>
                  <option value="owned">% Owned</option>
                </select>
              </div>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <EnhancedCard className="p-4 border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </EnhancedCard>
            </motion.div>
          )}
        </AnimatePresence>

        {players.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No players found</h3>
              <p className="text-gray-600 mb-8 text-lg">
                Try adjusting your search criteria or filters to find the perfect players for your roster.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {positionOrder.map((position) => {
              const positionPlayers = groupedPlayers[position];
              if (!positionPlayers || positionPlayers.length === 0) return null;
              
              const positionInfo = getPositionInfo(position);

              return (
                <motion.div 
                  key={position}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <EnhancedCard className="overflow-hidden">
                    {/* Position Header */}
                    <div className={`bg-gradient-to-r from-${positionInfo.color}-600 to-${positionInfo.color}-700 text-white p-6`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{positionInfo.icon}</span>
                          <div>
                            <h2 className="text-2xl font-bold">
                              {position} - {positionInfo.name}
                            </h2>
                            <p className="text-blue-100">
                              {positionPlayers.length} players available
                            </p>
                          </div>
                        </div>
                        <EnhancedBadge variant="default" className="bg-white/20 text-white">
                          {positionPlayers.length}
                        </EnhancedBadge>
                      </div>
                    </div>

                    {/* Players Grid */}
                    <div className="p-6">
                      <div className={
                        viewMode === 'grid' 
                          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                          : "space-y-2"
                      }>
                        {positionPlayers.map((player, index) => (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                          >
                            <PlayerCard
                              player={{
                                name: player.name,
                                position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DST",
                                team: (player as any).team || 'N/A',
                                status: (player as any).status || 'active',
                                points: (player as any).points || 0,
                                projection: (player as any).projection,
                                avatar: (player as any).avatar
                              }}
                              onClick={() => {
                                // Navigate to player detail page
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </EnhancedCard>
                </motion.div>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <motion.div 
                className="text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <EnhancedButton
                  variant="primary"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="text-white" />
                      <span className="ml-2">Loading...</span>
                    </>
                  ) : (
                    'Load More Players'
                  )}
                </EnhancedButton>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}