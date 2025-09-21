/**
 * Player Database - Complete implementation with search, filters, and analytics
 * Free access to all player data and insights
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, TrendingUp, TrendingDown, Minus, AlertCircle, Trophy,
  User, Activity, Calendar, DollarSign, Award, Target, Info,
  ChevronDown, ChevronUp, Star, Heart, BarChart3, Clock,
  PlayCircle, FileText, ExternalLink, X, Check
} from 'lucide-react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { format } from 'date-fns';

// Position groups for filtering
const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'];
const NFL_TEAMS = ['ALL', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'];

// Mock player data - would come from API
const mockPlayers = [
  {
    id: '1',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    byeWeek: 9,
    rank: 1,
    adp: 1.2,
    points: 312.5,
    avgPoints: 19.5,
    projectedPoints: 21.2,
    lastWeekPoints: 24.3,
    trend: 'up',
    injuryStatus: null,
    owned: 99.8,
    started: 98.5,
    news: 'Practiced in full Wednesday',
  },
  {
    id: '2',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'MIA',
    byeWeek: 10,
    rank: 2,
    adp: 3.5,
    points: 298.7,
    avgPoints: 18.7,
    projectedPoints: 19.8,
    lastWeekPoints: 15.2,
    trend: 'down',
    injuryStatus: null,
    owned: 99.9,
    started: 97.8,
    news: 'Leading league in receiving yards',
  },
  {
    id: '3',
    name: 'Austin Ekeler',
    position: 'RB',
    team: 'LAC',
    byeWeek: 5,
    rank: 8,
    adp: 7.3,
    points: 245.2,
    avgPoints: 15.3,
    projectedPoints: 14.8,
    lastWeekPoints: 16.1,
    trend: 'same',
    injuryStatus: 'Q',
    owned: 98.2,
    started: 92.1,
    news: 'Limited in practice with ankle injury',
  },
];

// Player performance chart data
const performanceData = [
  { week: 1, points: 18.5, projected: 16.2 },
  { week: 2, points: 22.3, projected: 18.5 },
  { week: 3, points: 14.2, projected: 17.8 },
  { week: 4, points: 28.7, projected: 19.2 },
  { week: 5, points: 19.8, projected: 18.0 },
];

export default function PlayersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [sortBy, setSortBy] = useState<'rank' | 'points' | 'projected' | 'owned'>('rank');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch players with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['players', debouncedSearch, selectedPosition, selectedTeam, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      // This would be an API call
      return {
        players: mockPlayers,
        nextPage: pageParam + 1,
        hasMore: false
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 0,
  });

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let players = data?.pages.flatMap(page => page.players) || mockPlayers;
    
    if (selectedPosition !== 'ALL') {
      players = players.filter(p => p.position === selectedPosition);
    }
    
    if (selectedTeam !== 'ALL') {
      players = players.filter(p => p.team === selectedTeam);
    }
    
    if (debouncedSearch) {
      players = players.filter(p => 
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.team.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    // Sort
    players.sort((a, b) => {
      switch (sortBy) {
        case 'rank': return a.rank - b.rank;
        case 'points': return b.points - a.points;
        case 'projected': return b.projectedPoints - a.projectedPoints;
        case 'owned': return b.owned - a.owned;
        default: return 0;
      }
    });
    
    return players;
  }, [data, selectedPosition, selectedTeam, debouncedSearch, sortBy]);

  const toggleFavorite = (playerId: string) => {
    setFavorites(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const getInjuryColor = (status: string | null) => {
    switch (status) {
      case 'Q': return 'text-yellow-600 dark:text-yellow-400';
      case 'D': return 'text-orange-600 dark:text-orange-400';
      case 'O': return 'text-red-600 dark:text-red-400';
      case 'IR': return 'text-red-800 dark:text-red-600';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Player Database
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time stats and projections for all NFL players
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2",
                  showFilters 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {(selectedPosition !== 'ALL' || selectedTeam !== 'ALL') && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {(selectedPosition !== 'ALL' ? 1 : 0) + (selectedTeam !== 'ALL' ? 1 : 0)}
                  </span>
                )}
              </button>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Filter Bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex flex-wrap gap-3">
                    {/* Position Filter */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Position:</label>
                      <div className="flex space-x-1">
                        {POSITIONS.map(pos => (
                          <button
                            key={pos}
                            onClick={() => setSelectedPosition(pos)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-sm font-medium transition",
                              selectedPosition === pos
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            )}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Team Filter */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Team:</label>
                      <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {NFL_TEAMS.map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Sort By */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="rank">Rank</option>
                        <option value="points">Total Points</option>
                        <option value="projected">Projected</option>
                        <option value="owned">Ownership %</option>
                      </select>
                    </div>
                    
                    {/* Clear Filters */}
                    {(selectedPosition !== 'ALL' || selectedTeam !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSelectedPosition('ALL');
                          setSelectedTeam('ALL');
                        }}
                        className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredPlayers.length}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Players Available</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredPlayers.filter(p => p.trend === 'up').length}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Trending Up</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredPlayers.filter(p => p.injuryStatus).length}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Injury Concerns</p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {favorites.length}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Watchlist</p>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Player</th>
                  <th className="px-6 py-3 text-center">Rank</th>
                  <th className="px-6 py-3 text-center">Pos</th>
                  <th className="px-6 py-3 text-center">Team</th>
                  <th className="px-6 py-3 text-center">Bye</th>
                  <th className="px-6 py-3 text-center">Points</th>
                  <th className="px-6 py-3 text-center">Avg</th>
                  <th className="px-6 py-3 text-center">Proj</th>
                  <th className="px-6 py-3 text-center">Last</th>
                  <th className="px-6 py-3 text-center">Trend</th>
                  <th className="px-6 py-3 text-center">Own%</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredPlayers.map((player) => (
                  <motion.tr
                    key={player.id}
                    whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="cursor-pointer"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <td className="px-6 py-4 sticky left-0 bg-white dark:bg-gray-900 z-10">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(player.id);
                          }}
                          className="hover:scale-110 transition"
                        >
                          {favorites.includes(player.id) ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Star className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {player.name}
                          </p>
                          {player.injuryStatus && (
                            <span className={cn("text-xs font-medium", getInjuryColor(player.injuryStatus))}>
                              {player.injuryStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        #{player.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {player.team}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {player.byeWeek}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {player.points.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {player.avgPoints.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {player.projectedPoints.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {player.lastWeekPoints.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getTrendIcon(player.trend)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {player.owned}%
                        </span>
                        <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-1">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${player.owned}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add to roster action
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                      >
                        Add
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Load More */}
          {hasNextPage && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More Players'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedPlayer(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {selectedPlayer.position}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedPlayer.name}
                      </h2>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedPlayer.team} • #{selectedPlayer.rank} Overall
                        </span>
                        {selectedPlayer.injuryStatus && (
                          <span className={cn("text-sm font-medium", getInjuryColor(selectedPlayer.injuryStatus))}>
                            {selectedPlayer.injuryStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedPlayer.points.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedPlayer.avgPoints.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedPlayer.projectedPoints.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Projected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedPlayer.owned}%
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Owned</p>
                  </div>
                </div>

                {/* Performance Chart */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Performance
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="week" stroke="#9CA3AF" tickFormatter={(v) => `W${v}`} />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="points" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPerformance)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="projected" 
                        stroke="#10B981" 
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Latest News */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Latest News
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedPlayer.news}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Updated 2 hours ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                    Add to Roster
                  </button>
                  <button className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium text-gray-700 dark:text-gray-300">
                    Add to Watchlist
                  </button>
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <ExternalLink className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}