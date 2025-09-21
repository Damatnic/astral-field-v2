'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Grid3x3, 
  List, 
  TrendingUp, 
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Bookmark,
  Plus,
  Minus
} from 'lucide-react';
import { useSearch } from '@/utils/search';

interface SearchResultsProps {
  className?: string;
  showViewOptions?: boolean;
  enableComparison?: boolean;
  showQuickActions?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  className = "",
  showViewOptions = true,
  enableComparison = true,
  showQuickActions = true
}) => {
  const {
    results,
    isLoading,
    query,
    sort,
    availableSorts,
    setSort,
    analytics
  } = useSearch();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const handlePlayerSelect = (playerId: string) => {
    if (!enableComparison) return;
    
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else if (newSelected.size < 4) { // Limit to 4 players for comparison
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
    setShowComparison(newSelected.size > 1);
  };

  const clearSelection = () => {
    setSelectedPlayers(new Set());
    setShowComparison(false);
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <SearchResultsHeader 
          resultCount={0}
          showViewOptions={showViewOptions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sort={sort}
          availableSorts={availableSorts}
          onSortChange={setSort}
          isLoading={true}
        />
        <SearchResultsSkeleton viewMode={viewMode} />
      </div>
    );
  }

  if (!query && results.length === 0) {
    return (
      <div className={`${className}`}>
        <SearchPrompt analytics={analytics} />
      </div>
    );
  }

  if (query && results.length === 0) {
    return (
      <div className={`${className}`}>
        <SearchResultsHeader 
          resultCount={0}
          showViewOptions={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sort={sort}
          availableSorts={availableSorts}
          onSortChange={setSort}
        />
        <NoResults query={query} />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <SearchResultsHeader 
        resultCount={results.length}
        showViewOptions={showViewOptions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sort={sort}
        availableSorts={availableSorts}
        onSortChange={setSort}
      />

      {/* Comparison Bar */}
      <AnimatePresence>
        {showComparison && selectedPlayers.size > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedPlayers.size} players selected for comparison
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Click &quot;Compare Players&quot; to see detailed side-by-side analysis
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowComparison(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Compare Players
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Grid/List */}
      <div className={`${
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
      }`}>
        {results.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {viewMode === 'grid' ? (
              <PlayerGridCard
                player={player}
                isSelected={selectedPlayers.has(player.id)}
                onSelect={() => handlePlayerSelect(player.id)}
                enableComparison={enableComparison}
                showQuickActions={showQuickActions}
              />
            ) : (
              <PlayerListItem
                player={player}
                isSelected={selectedPlayers.has(player.id)}
                onSelect={() => handlePlayerSelect(player.id)}
                enableComparison={enableComparison}
                showQuickActions={showQuickActions}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Results Header Component
interface SearchResultsHeaderProps {
  resultCount: number;
  showViewOptions: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (_mode: 'grid' | 'list') => void;
  sort: any;
  availableSorts: any[];
  onSortChange: (newSort: any) => void;
  isLoading?: boolean;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  resultCount,
  showViewOptions,
  viewMode,
  onViewModeChange,
  sort,
  availableSorts,
  onSortChange,
  isLoading = false
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {isLoading ? 'Searching...' : `${resultCount} Results`}
          </div>
          {!isLoading && sort && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Sorted by {sort.label}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sort ? `${sort.field}-${sort.direction}` : ''}
            onChange={(e) => {
              const selectedSort = availableSorts.find(s => 
                `${s.field}-${s.direction}` === e.target.value
              );
              onSortChange(selectedSort);
            }}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {availableSorts.map((sortOption) => (
              <option 
                key={`${sortOption.field}-${sortOption.direction}`}
                value={`${sortOption.field}-${sortOption.direction}`}
              >
                {sortOption.label}
              </option>
            ))}
          </select>
          <ArrowUpDown className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* View Toggle */}
        {showViewOptions && (
          <div className="flex bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-l-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-r-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Player Grid Card Component
interface PlayerCardProps {
  player: any;
  isSelected: boolean;
  onSelect: () => void;
  enableComparison: boolean;
  showQuickActions: boolean;
}

const PlayerGridCard: React.FC<PlayerCardProps> = ({
  player,
  isSelected,
  onSelect,
  enableComparison,
  showQuickActions
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {player.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{player.name}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium">
                  {player.position}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{player.team}</span>
              </div>
            </div>
          </div>
          
          {showQuickActions && (
            <div className="flex items-center gap-2">
              {enableComparison && (
                <button
                  onClick={onSelect}
                  className={`p-2 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
                >
                  {isSelected ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
              <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{player.fantasyPoints}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Fantasy Points</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{player.projectedPoints}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Projected</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Tier {player.tier}</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">ADP {player.adp}</span>
          </div>
          {player.ownership && (
            <div className="text-gray-600 dark:text-gray-400">
              {player.ownership}% owned
            </div>
          )}
        </div>

        {/* Status */}
        {player.isInjured && (
          <div className="mt-3 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
            {player.injuryStatus}
          </div>
        )}
      </div>
    </div>
  );
};

// Player List Item Component
const PlayerListItem: React.FC<PlayerCardProps> = ({
  player,
  isSelected,
  onSelect,
  enableComparison,
  showQuickActions
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {player.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{player.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium">
                  {player.position}
                </span>
                <span>{player.team}</span>
                <span>Tier {player.tier}</span>
                <span>ADP {player.adp}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{player.fantasyPoints}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Fantasy Points</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{player.projectedPoints}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Projected</div>
            </div>

            {player.ownership && (
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">{player.ownership}%</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Owned</div>
              </div>
            )}

            {showQuickActions && (
              <div className="flex items-center gap-2">
                {enableComparison && (
                  <button
                    onClick={onSelect}
                    className={`p-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
                  >
                    {isSelected ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                )}
                <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {player.isInjured && (
          <div className="mt-3 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
            {player.injuryStatus}
          </div>
        )}
      </div>
    </div>
  );
};

// Loading Skeleton
const SearchResultsSkeleton: React.FC<{ viewMode: 'grid' | 'list' }> = ({ viewMode }) => {
  const skeletonItems = Array(8).fill(0);

  return (
    <div className={`${
      viewMode === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
        : 'space-y-4'
    }`}>
      {skeletonItems.map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        >
          {viewMode === 'grid' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
              </div>
              <div className="flex gap-6">
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// No Results Component
const NoResults: React.FC<{ query: string }> = ({ query }) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We couldn&apos;t find any players matching &quot;<strong>{query}</strong>&quot;.
      </p>
      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
        <p>Try adjusting your search:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Check for typos or spelling errors</li>
          <li>Use different or more general keywords</li>
          <li>Remove filters to broaden your search</li>
          <li>Search by position (QB, RB, WR, TE) or team</li>
        </ul>
      </div>
    </div>
  );
};

// Search Prompt Component
const SearchPrompt: React.FC<{ analytics: any }> = ({ analytics }) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Find Your Fantasy Players
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Search by player name, position, team, or use our advanced filters to find exactly what you&apos;re looking for.
      </p>

      {analytics.popularQueries.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Popular Searches
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {analytics.popularQueries.slice(0, 6).map((query: string) => (
              <span
                key={query}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium"
              >
                {query}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto text-left">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3">
            <Filter className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <h5 className="font-medium text-gray-900 dark:text-white mb-1">Advanced Filters</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Filter by position, team, injury status, and more
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3">
            <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h5 className="font-medium text-gray-900 dark:text-white mb-1">Save Searches</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Save your favorite search combinations for quick access
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3">
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h5 className="font-medium text-gray-900 dark:text-white mb-1">Compare Players</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select multiple players to compare their stats and projections
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;