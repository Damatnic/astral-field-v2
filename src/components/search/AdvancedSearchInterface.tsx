'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SlidersHorizontal, Bookmark, History, X, Star, TrendingUp } from 'lucide-react';
import { useSearch } from '@/utils/search';

interface AdvancedSearchInterfaceProps {
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  showSavedSearches?: boolean;
}

export const AdvancedSearchInterface: React.FC<AdvancedSearchInterfaceProps> = ({
  placeholder = "Search players, teams, positions...",
  className = "",
  showFilters = true,
  showSavedSearches = true
}) => {
  const {
    query,
    setQuery,
    filters,
    availableFilters,
    availableSorts,
    sort,
    setSort,
    setFilter,
    clearFilter,
    clearAllFilters,
    suggestions,
    getSuggestions,
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    analytics,
    isLoading,
    results
  } = useSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState(suggestions);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchCategory, setSaveSearchCategory] = useState('General');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggestions when query changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (query.length > 0) {
        const newSuggestions = await getSuggestions(query);
        setCurrentSuggestions(newSuggestions);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(loadSuggestions, 150);
    return () => clearTimeout(debounce);
  }, [query, getSuggestions]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowFilterPanel(false);
        setShowSavedPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: any) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSaveSearch = () => {
    if (saveSearchName.trim()) {
      saveCurrentSearch(saveSearchName, saveSearchCategory);
      setSaveSearchName('');
      setShowSaveDialog(false);
      setShowSavedPanel(false);
    }
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key];
    return value !== undefined && value !== null && value !== '' && 
           (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-12 pr-4 py-4 bg-transparent text-lg focus:outline-none"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-4">
            {showFilters && (
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showFilterPanel || activeFilterCount > 0
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {showSavedSearches && (
              <button
                onClick={() => setShowSavedPanel(!showSavedPanel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showSavedPanel
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Results Count */}
        {query && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isLoading ? 'Searching...' : `${results.length} results found`}
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && currentSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {/* Popular Queries Section */}
            {query.length < 2 && analytics.popularQueries.length > 0 && (
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Popular Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {analytics.popularQueries.slice(0, 4).map((popularQuery) => (
                    <button
                      key={popularQuery}
                      onClick={() => {
                        setQuery(popularQuery);
                        setShowSuggestions(false);
                      }}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {popularQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {query.length < 2 && analytics.recentSearches.length > 0 && (
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  <History className="w-4 h-4" />
                  Recent Searches
                </div>
                <div className="space-y-1">
                  {analytics.recentSearches.slice(0, 3).map((recentQuery, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(recentQuery);
                        setShowSuggestions(false);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors text-sm"
                    >
                      {recentQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Suggestions */}
            <div className="p-2">
              {currentSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    {suggestion.type === 'player' && <span className="text-sm font-medium">👤</span>}
                    {suggestion.type === 'team' && <span className="text-sm font-medium">🏈</span>}
                    {suggestion.type === 'position' && <span className="text-sm font-medium">📍</span>}
                    {suggestion.type === 'query' && <TrendingUp className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.text}
                    </div>
                    {suggestion.category && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {suggestion.category}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-40 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Filters
              </h3>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear All ({activeFilterCount})
                  </button>
                )}
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableFilters.map((filter) => (
                <FilterControl
                  key={filter.id}
                  filter={filter}
                  value={filters[filter.id]}
                  onChange={(value) => setFilter(filter.id, value)}
                  onClear={() => clearFilter(filter.id)}
                />
              ))}
            </div>

            {/* Sorting Options */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sort Results</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableSorts.map((sortOption) => (
                  <button
                    key={`${sortOption.field}-${sortOption.direction}`}
                    onClick={() => setSort(sortOption)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      sort?.field === sortOption.field && sort?.direction === sortOption.direction
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    {sortOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Save Search */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                <Star className="w-4 h-4" />
                Save Current Search
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Searches Panel */}
      <AnimatePresence>
        {showSavedPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-40 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                Saved Searches
              </h3>
              <button
                onClick={() => setShowSavedPanel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {savedSearches.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved searches yet</p>
                  <p className="text-sm">Save your favorite search combinations for quick access</p>
                </div>
              ) : (
                savedSearches.map((savedSearch) => (
                  <div
                    key={savedSearch.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <button
                      onClick={() => loadSavedSearch(savedSearch.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{savedSearch.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{savedSearch.category}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Last used: {savedSearch.lastUsed.toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSavedSearch(savedSearch.id)}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Search Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Search</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Name
                  </label>
                  <input
                    type="text"
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    placeholder="e.g., Top QB Rankings"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={saveSearchCategory}
                    onChange={(e) => setSaveSearchCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  >
                    <option value="General">General</option>
                    <option value="Rankings">Rankings</option>
                    <option value="Waiver Wire">Waiver Wire</option>
                    <option value="Trade Analysis">Trade Analysis</option>
                    <option value="Matchups">Matchups</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Filter Control Component
interface FilterControlProps {
  filter: any;
  value: any;
  onChange: (newValue: any) => void;
  onClear: () => void;
}

const FilterControl: React.FC<FilterControlProps> = ({ filter, value, onChange, onClear }) => {
  const hasValue = value !== undefined && value !== null && value !== '' && 
                   (Array.isArray(value) ? value.length > 0 : true);

  const renderControl = () => {
    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Search ${filter.label.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {filter.options?.map((option: any) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValue = value || [];
                    if (e.target.checked) {
                      onChange([...currentValue, option.value]);
                    } else {
                      onChange(currentValue.filter((v: any) => v !== option.value));
                    }
                  }}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'range':
        const [min = filter.min || 0, max = filter.max || 100] = value || [];
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => onChange([parseFloat(e.target.value) || 0, max])}
                  min={filter.min}
                  max={filter.max}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => onChange([min, parseFloat(e.target.value) || 100])}
                  min={filter.min}
                  max={filter.max}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${filter.id}-bool`}
                checked={value === true}
                onChange={() => onChange(true)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${filter.id}-bool`}
                checked={value === false}
                onChange={() => onChange(false)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {filter.label}
        </label>
        {hasValue && (
          <button
            onClick={onClear}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear
          </button>
        )}
      </div>
      {renderControl()}
    </div>
  );
};

export default AdvancedSearchInterface;