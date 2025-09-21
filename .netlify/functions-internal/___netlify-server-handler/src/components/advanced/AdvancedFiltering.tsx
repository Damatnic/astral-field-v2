'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Search,
  ChevronDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Star,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';

// Enhanced Filter Types
export interface PlayerFilters {
  position: string[];
  team: string[];
  status: string[];
  availability: string[];
  projectedPoints: {
    min: number;
    max: number;
  };
  ownership: {
    min: number;
    max: number;
  };
  trend: string[];
  matchupDifficulty: string[];
}

export interface SortOption {
  key: string;
  label: string;
  direction: 'asc' | 'desc';
}

// ESPN/Yahoo-style Advanced Filtering and Sorting Component
export function AdvancedPlayerFiltering({
  onFiltersChange,
  onSortChange,
  totalResults = 0
}: {
  onFiltersChange: (_filters: PlayerFilters) => void;
  onSortChange: (_sort: SortOption) => void;
  totalResults?: number;
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<PlayerFilters>({
    position: [],
    team: [],
    status: [],
    availability: [],
    projectedPoints: { min: 0, max: 50 },
    ownership: { min: 0, max: 100 },
    trend: [],
    matchupDifficulty: []
  });
  
  const [currentSort, setCurrentSort] = useState<SortOption>({
    key: 'projectedPoints',
    label: 'Projected Points',
    direction: 'desc'
  });

  const sortOptions = useMemo(() => [
    { key: 'projectedPoints', label: 'Projected Points', direction: 'desc' as const },
    { key: 'actualPoints', label: 'Actual Points', direction: 'desc' as const },
    { key: 'name', label: 'Name', direction: 'asc' as const },
    { key: 'ownership', label: 'Ownership %', direction: 'desc' as const },
    { key: 'targetShare', label: 'Target Share', direction: 'desc' as const },
    { key: 'adp', label: 'Draft Position', direction: 'asc' as const },
    { key: 'trend', label: 'Trending', direction: 'desc' as const }
  ], []);

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const teams = ['BUF', 'KC', 'SF', 'PHI', 'CIN', 'DAL', 'MIA', 'BAL', 'MIN', 'LAC', 'NYJ', 'SEA'];
  const statusOptions = ['active', 'injured', 'questionable', 'bye', 'out'];
  const availabilityOptions = ['available', 'rostered', 'locked', 'waivers'];
  const trendOptions = ['up', 'down', 'stable'];
  const difficultyOptions = ['easy', 'medium', 'hard'];

  // Handle filter changes with callback
  const handleFilterChange = useCallback((filterType: keyof PlayerFilters, value: any) => {
    const newFilters = {
      ...activeFilters,
      [filterType]: value
    };
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  }, [activeFilters, onFiltersChange]);

  // Handle sort changes
  const handleSortChange = useCallback((sortKey: string) => {
    const sortOption = sortOptions.find(s => s.key === sortKey);
    if (sortOption) {
      const newSort = {
        ...sortOption,
        direction: currentSort.key === sortKey && currentSort.direction === 'desc' ? 'asc' as const : 'desc' as const
      };
      setCurrentSort(newSort);
      onSortChange(newSort);
    }
  }, [currentSort, onSortChange, sortOptions]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.position.length > 0) count++;
    if (activeFilters.team.length > 0) count++;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.availability.length > 0) count++;
    if (activeFilters.trend.length > 0) count++;
    if (activeFilters.matchupDifficulty.length > 0) count++;
    if (activeFilters.projectedPoints.min > 0 || activeFilters.projectedPoints.max < 50) count++;
    if (activeFilters.ownership.min > 0 || activeFilters.ownership.max < 100) count++;
    return count;
  }, [activeFilters]);

  // Clear all filters
  const clearAllFilters = () => {
    const emptyFilters: PlayerFilters = {
      position: [],
      team: [],
      status: [],
      availability: [],
      projectedPoints: { min: 0, max: 50 },
      ownership: { min: 0, max: 100 },
      trend: [],
      matchupDifficulty: []
    };
    setActiveFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative group">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{currentSort.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleSortChange(option.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between ${
                        currentSort.key === option.key ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {currentSort.key === option.key && (
                        currentSort.direction === 'desc' ? 
                        <TrendingDown className="w-4 h-4" /> : 
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Results Count */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">{totalResults.toLocaleString()}</span> players
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${
                isFiltersOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </div>
              )}
            </motion.button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Position Filter */}
                <FilterSection
                  title="Position"
                  icon={<Target className="w-4 h-4" />}
                  options={positions}
                  selected={activeFilters.position}
                  onChange={(value) => handleFilterChange('position', value)}
                  multiSelect
                />

                {/* Team Filter */}
                <FilterSection
                  title="Team"
                  icon={<Shield className="w-4 h-4" />}
                  options={teams}
                  selected={activeFilters.team}
                  onChange={(value) => handleFilterChange('team', value)}
                  multiSelect
                />

                {/* Status Filter */}
                <FilterSection
                  title="Status"
                  icon={<CheckCircle className="w-4 h-4" />}
                  options={statusOptions}
                  selected={activeFilters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  multiSelect
                />

                {/* Availability Filter */}
                <FilterSection
                  title="Availability"
                  icon={<Star className="w-4 h-4" />}
                  options={availabilityOptions}
                  selected={activeFilters.availability}
                  onChange={(value) => handleFilterChange('availability', value)}
                  multiSelect
                />

                {/* Trend Filter */}
                <FilterSection
                  title="Trend"
                  icon={<TrendingUp className="w-4 h-4" />}
                  options={trendOptions}
                  selected={activeFilters.trend}
                  onChange={(value) => handleFilterChange('trend', value)}
                  multiSelect
                />

                {/* Matchup Difficulty */}
                <FilterSection
                  title="Matchup"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  options={difficultyOptions}
                  selected={activeFilters.matchupDifficulty}
                  onChange={(value) => handleFilterChange('matchupDifficulty', value)}
                  multiSelect
                />

                {/* Projected Points Range */}
                <RangeFilter
                  title="Projected Points"
                  icon={<Zap className="w-4 h-4" />}
                  min={0}
                  max={50}
                  value={activeFilters.projectedPoints}
                  onChange={(value) => handleFilterChange('projectedPoints', value)}
                  step={0.5}
                  suffix="pts"
                />

                {/* Ownership Percentage Range */}
                <RangeFilter
                  title="Ownership %"
                  icon={<BarChart3 className="w-4 h-4" />}
                  min={0}
                  max={100}
                  value={activeFilters.ownership}
                  onChange={(value) => handleFilterChange('ownership', value)}
                  step={1}
                  suffix="%"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Filter Section Component
function FilterSection({
  title,
  icon,
  options,
  selected,
  onChange,
  multiSelect = false
}: {
  title: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (_value: string[]) => void;
  multiSelect?: boolean;
}) {
  const handleOptionToggle = (option: string) => {
    if (multiSelect) {
      const newSelected = selected.includes(option)
        ? selected.filter(item => item !== option)
        : [...selected, option];
      onChange(newSelected);
    } else {
      onChange(selected.includes(option) ? [] : [option]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        {icon}
        <span>{title}</span>
      </div>
      
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => handleOptionToggle(option)}
              className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 group-hover:text-gray-800 capitalize">
              {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Range Filter Component
function RangeFilter({
  title,
  icon,
  min,
  max,
  value,
  onChange,
  step = 1,
  suffix = ''
}: {
  title: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (_value: { min: number; max: number }) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        {icon}
        <span>{title}</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{value.min}{suffix}</span>
          <span>{value.max}{suffix}</span>
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value.min}
            onChange={(e) => onChange({ ...value, min: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value.max}
            onChange={(e) => onChange({ ...value, max: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
        
        <div className="flex space-x-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.min}
            onChange={(e) => onChange({ ...value, min: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.max}
            onChange={(e) => onChange({ ...value, max: parseFloat(e.target.value) || max })}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}