'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { VirtualList, withMemoization, useDebouncedSearch } from './PerformanceComponents';
import { AdvancedPlayerFiltering } from '../advanced/AdvancedFiltering';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Star,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';

// Performance-optimized player list with virtual scrolling
export interface OptimizedPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  projectedPoints: number;
  averagePoints: number;
  trend: 'up' | 'down' | 'stable';
  availability: 'available' | 'owned' | 'waiver';
  injuryStatus?: 'healthy' | 'questionable' | 'doubtful' | 'out';
  ownership: number;
  lastUpdated: Date;
}

// Memoized Player Card Component
const PlayerCard = memo(({ 
  player, 
  onSelect, 
  isSelected = false 
}: { 
  player: OptimizedPlayer; 
  onSelect?: (player: OptimizedPlayer) => void;
  isSelected?: boolean;
}) => {
  const handleClick = useCallback(() => {
    onSelect?.(player);
  }, [onSelect, player]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-red-500 transform rotate-180" />;
      default: return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'owned': return 'bg-blue-100 text-blue-800';
      case 'waiver': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`p-4 bg-white rounded-lg border-2 transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">{player.name}</h3>
          <span className="text-sm text-gray-500">{player.team}</span>
        </div>
        {getTrendIcon(player.trend)}
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-600">{player.position}</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(player.availability)}`}>
          {player.availability}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">Proj:</span>
          <span className="font-semibold ml-1">{player.projectedPoints.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-gray-600">Avg:</span>
          <span className="font-semibold ml-1">{player.averagePoints.toFixed(1)}</span>
        </div>
      </div>
      
      {player.injuryStatus && player.injuryStatus !== 'healthy' && (
        <div className="mt-2 flex items-center space-x-1">
          <Target className="w-3 h-3 text-orange-500" />
          <span className="text-xs text-orange-600 capitalize">{player.injuryStatus}</span>
        </div>
      )}
    </motion.div>
  );
});

PlayerCard.displayName = 'PlayerCard';

// Optimized Player List Component
export const OptimizedPlayerList = withMemoization(({ 
  players,
  onPlayerSelect,
  selectedPlayers = [],
  itemHeight = 120,
  containerHeight = 600
}: {
  players: OptimizedPlayer[];
  onPlayerSelect?: (player: OptimizedPlayer) => void;
  selectedPlayers?: string[];
  itemHeight?: number;
  containerHeight?: number;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<keyof OptimizedPlayer>('projectedPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  
  const debouncedSearch = useDebouncedSearch(searchTerm, 300);

  // Memoized filtered and sorted players
  const processedPlayers = useMemo(() => {
    let filtered = players;

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchLower) ||
        player.team.toLowerCase().includes(searchLower) ||
        player.position.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortOrder === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });

    return filtered;
  }, [players, debouncedSearch, sortBy, sortOrder]);

  const handleSort = useCallback((field: keyof OptimizedPlayer) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const renderPlayerItem = useCallback((player: OptimizedPlayer, index: number) => (
    <PlayerCard
      key={player.id}
      player={player}
      onSelect={onPlayerSelect}
      isSelected={selectedPlayers.includes(player.id)}
    />
  ), [onPlayerSelect, selectedPlayers]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Player Database ({processedPlayers.length})
          </h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 mt-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          {[
            { key: 'projectedPoints' as const, label: 'Projected' },
            { key: 'averagePoints' as const, label: 'Average' },
            { key: 'ownership' as const, label: 'Ownership' },
            { key: 'name' as const, label: 'Name' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                sortBy === key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{label}</span>
              {sortBy === key && (
                sortOrder === 'desc' ? 
                  <SortDesc className="w-3 h-3" /> : 
                  <SortAsc className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-gray-100"
        >
          <AdvancedPlayerFiltering
            onFiltersChange={(_filters: any) => {
              // Apply additional filters - remove in production
            }}
            onSortChange={(_sort: any) => {
              // Apply sort changes - remove in production  
            }}
          />
        </motion.div>
      )}

      {/* Player List with Virtual Scrolling */}
      <div className="p-6">
        {processedPlayers.length > 0 ? (
          viewMode === 'list' ? (
            <VirtualList
              items={processedPlayers}
              itemHeight={itemHeight}
              containerHeight={containerHeight}
              renderItem={renderPlayerItem}
              className="space-y-4"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {processedPlayers.slice(0, 50).map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onSelect={onPlayerSelect}
                  isSelected={selectedPlayers.includes(player.id)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No players found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
});

OptimizedPlayerList.displayName = 'OptimizedPlayerList';