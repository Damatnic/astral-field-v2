'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAccessibility, AccessibleButton, LiveRegion, ARIALabelGenerator } from '@/utils/accessibility';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  User,
  X
} from 'lucide-react';

// Enhanced Player interface with accessibility metadata
export interface AccessiblePlayer {
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
  ariaLabel?: string;
  description?: string;
}

// WCAG-compliant Player Management Component
export function AccessiblePlayerManagement() {
  const { settings, announceToScreenReader } = useAccessibility();
  const [players, setPlayers] = useState<AccessiblePlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<AccessiblePlayer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<keyof AccessiblePlayer>('projectedPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [focusedPlayerIndex, setFocusedPlayerIndex] = useState(-1);
  const [announcements, setAnnouncements] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const playerListRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockPlayers: AccessiblePlayer[] = [
      {
        id: '1',
        name: 'Josh Allen',
        team: 'BUF',
        position: 'QB',
        projectedPoints: 24.5,
        averagePoints: 22.8,
        trend: 'up',
        availability: 'owned',
        injuryStatus: 'healthy',
        ownership: 95,
        lastUpdated: new Date(),
        ariaLabel: 'Josh Allen, Buffalo Bills quarterback, owned, projected 24.5 points',
        description: 'Elite quarterback with consistent high scoring potential'
      },
      {
        id: '2',
        name: 'Cooper Kupp',
        team: 'LAR',
        position: 'WR',
        projectedPoints: 18.2,
        averagePoints: 16.5,
        trend: 'stable',
        availability: 'available',
        injuryStatus: 'questionable',
        ownership: 68,
        lastUpdated: new Date(),
        ariaLabel: 'Cooper Kupp, Los Angeles Rams wide receiver, available, questionable injury status, projected 18.2 points',
        description: 'Top-tier wide receiver with injury concerns'
      }
    ];
    
    setPlayers(mockPlayers);
    setFilteredPlayers(mockPlayers);
  }, []);

  // Accessible search handler with announcements
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    
    const filtered = players.filter(player =>
      player.name.toLowerCase().includes(value.toLowerCase()) ||
      player.team.toLowerCase().includes(value.toLowerCase()) ||
      player.position.toLowerCase().includes(value.toLowerCase())
    );
    
    setFilteredPlayers(filtered);
    setFocusedPlayerIndex(-1);
    
    // Announce search results to screen readers
    const resultCount = filtered.length;
    const announcement = value 
      ? `Search results: ${resultCount} players found for "${value}"`
      : `Showing all ${players.length} players`;
    
    setAnnouncements(announcement);
    announceToScreenReader(announcement);
  }, [players, announceToScreenReader]);

  // Accessible sort handler
  const handleSort = useCallback((field: keyof AccessiblePlayer) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    
    const sorted = [...filteredPlayers].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return newOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      const aStr = String(aValue);
      const bStr = String(bValue);
      return newOrder === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });
    
    setFilteredPlayers(sorted);
    
    // Announce sort change
    const announcement = ARIALabelGenerator.generateSortDescription(String(field), newOrder);
    setAnnouncements(announcement);
    announceToScreenReader(announcement);
  }, [sortBy, sortOrder, filteredPlayers, announceToScreenReader]);

  // Player selection with announcements
  const handlePlayerSelect = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const isSelected = selectedPlayers.includes(playerId);
    const newSelection = isSelected
      ? selectedPlayers.filter(id => id !== playerId)
      : [...selectedPlayers, playerId];
    
    setSelectedPlayers(newSelection);
    
    // Announce selection change
    const announcement = `${player.name} ${isSelected ? 'deselected' : 'selected'}. ${newSelection.length} players selected.`;
    setAnnouncements(announcement);
    announceToScreenReader(announcement);
  }, [players, selectedPlayers, announceToScreenReader]);

  // Keyboard navigation for player list
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedPlayerIndex(prev => 
          prev < filteredPlayers.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedPlayerIndex(prev => 
          prev > 0 ? prev - 1 : filteredPlayers.length - 1
        );
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedPlayerIndex >= 0) {
          handlePlayerSelect(filteredPlayers[focusedPlayerIndex].id);
        }
        break;
      
      case 'Escape':
        setFocusedPlayerIndex(-1);
        searchInputRef.current?.focus();
        break;
    }
  }, [filteredPlayers, focusedPlayerIndex, handlePlayerSelect]);

  // Focus management
  useEffect(() => {
    if (focusedPlayerIndex >= 0 && playerListRef.current) {
      const playerElements = playerListRef.current.querySelectorAll('[role="option"]');
      const targetElement = playerElements[focusedPlayerIndex] as HTMLElement;
      targetElement?.focus();
    }
  }, [focusedPlayerIndex]);

  return (
    <div 
      className="max-w-6xl mx-auto p-6"
      role="main"
      aria-labelledby="player-management-heading"
    >
      {/* Live Region for Announcements */}
      <LiveRegion priority="polite">
        {announcements}
      </LiveRegion>

      {/* Header */}
      <div className="mb-8">
        <h1 
          id="player-management-heading"
          className={`text-3xl font-bold text-gray-900 mb-4 ${
            settings.largeText ? 'text-4xl' : ''
          }`}
        >
          Player Management
        </h1>
        <p className="text-gray-600">
          Search, filter, and manage your fantasy football players. Use arrow keys to navigate, Enter to select.
        </p>
      </div>

      {/* Search and Controls */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          {/* Search Input */}
          <div className="relative mb-4">
            <label htmlFor="player-search" className="sr-only">
              Search players by name, team, or position
            </label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id="player-search"
              type="text"
              placeholder="Search players by name, team, or position..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                settings.largeText ? 'text-lg' : 'text-base'
              } ${
                settings.highContrast ? 'border-gray-900' : ''
              }`}
              aria-describedby="search-help"
            />
            <div id="search-help" className="sr-only">
              Type to search through {players.length} players. Results will be announced automatically.
            </div>
          </div>

          {/* Sort Controls */}
          <fieldset className="mb-4">
            <legend className="text-sm font-medium text-gray-700 mb-2">Sort Options</legend>
            <div 
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Sort players by different criteria"
            >
              {[
                { key: 'projectedPoints' as const, label: 'Projected Points' },
                { key: 'averagePoints' as const, label: 'Average Points' },
                { key: 'name' as const, label: 'Name' },
                { key: 'ownership' as const, label: 'Ownership' }
              ].map(({ key, label }) => (
                <AccessibleButton
                  key={key}
                  variant={sortBy === key ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleSort(key)}
                  aria-pressed={sortBy === key}
                  aria-describedby={`sort-${key}-desc`}
                >
                  <span>{label}</span>
                  {sortBy === key && (
                    <>
                      {sortOrder === 'desc' ? 
                        <SortDesc className="w-3 h-3 ml-1" aria-hidden="true" /> : 
                        <SortAsc className="w-3 h-3 ml-1" aria-hidden="true" />
                      }
                      <span className="sr-only">
                        , sorted {sortOrder === 'desc' ? 'descending' : 'ascending'}
                      </span>
                    </>
                  )}
                  <div id={`sort-${key}-desc`} className="sr-only">
                    Sort players by {label.toLowerCase()}
                  </div>
                </AccessibleButton>
              ))}
            </div>
          </fieldset>

          {/* Filter Toggle */}
          <AccessibleButton
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="player-filters"
          >
            <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </AccessibleButton>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            ref={filtersRef}
            id="player-filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 bg-gray-50 border-b border-gray-100"
            role="region"
            aria-label="Advanced filter options"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="position-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  id="position-filter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-describedby="position-filter-help"
                >
                  <option value="">All Positions</option>
                  <option value="QB">Quarterback (QB)</option>
                  <option value="RB">Running Back (RB)</option>
                  <option value="WR">Wide Receiver (WR)</option>
                  <option value="TE">Tight End (TE)</option>
                  <option value="K">Kicker (K)</option>
                  <option value="DEF">Defense (DEF)</option>
                </select>
                <div id="position-filter-help" className="sr-only">
                  Filter players by their position
                </div>
              </div>
              
              <div>
                <label htmlFor="availability-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Availability
                </label>
                <select
                  id="availability-filter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Players</option>
                  <option value="available">Available</option>
                  <option value="owned">Owned</option>
                  <option value="waiver">On Waivers</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="injury-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Health Status
                </label>
                <select
                  id="injury-filter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Players</option>
                  <option value="healthy">Healthy</option>
                  <option value="questionable">Questionable</option>
                  <option value="doubtful">Doubtful</option>
                  <option value="out">Out</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Player List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {ARIALabelGenerator.generateListDescription(filteredPlayers.length)}
            </h2>
            {selectedPlayers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedPlayers.length} selected
                </span>
                <AccessibleButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPlayers([]);
                    announceToScreenReader('All players deselected');
                  }}
                  aria-label="Clear all selections"
                >
                  <X className="w-4 h-4" />
                  Clear
                </AccessibleButton>
              </div>
            )}
          </div>

          <div
            ref={playerListRef}
            role="listbox"
            aria-label="Player list"
            aria-multiselectable="true"
            aria-activedescendant={focusedPlayerIndex >= 0 ? `player-${filteredPlayers[focusedPlayerIndex]?.id}` : undefined}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className="space-y-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2"
          >
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player, index) => (
                <AccessiblePlayerCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayers.includes(player.id)}
                  isFocused={index === focusedPlayerIndex}
                  onSelect={() => handlePlayerSelect(player.id)}
                />
              ))
            ) : (
              <div 
                className="text-center py-12"
                role="status"
                aria-live="polite"
              >
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No players found</h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? `No players match your search for "${searchTerm}". Try different keywords.`
                    : 'No players available. Check your filter settings.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Accessible Player Card Component
function AccessiblePlayerCard({
  player,
  isSelected,
  isFocused,
  onSelect
}: {
  player: AccessiblePlayer;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
}) {
  const { settings } = useAccessibility();

  const getStatusIcon = () => {
    switch (player.injuryStatus) {
      case 'questionable': return <AlertTriangle className="w-4 h-4 text-yellow-500" aria-label="Questionable" />;
      case 'doubtful': return <AlertTriangle className="w-4 h-4 text-orange-500" aria-label="Doubtful" />;
      case 'out': return <X className="w-4 h-4 text-red-500" aria-label="Out" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" aria-label="Healthy" />;
    }
  };

  const getTrendIcon = () => {
    switch (player.trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" aria-label="Trending up" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" aria-label="Trending down" />;
      default: return <Star className="w-4 h-4 text-gray-400" aria-label="Stable" />;
    }
  };

  return (
    <div
      id={`player-${player.id}`}
      role="option"
      aria-selected={isSelected}
      aria-label={player.ariaLabel}
      aria-describedby={`player-${player.id}-details`}
      tabIndex={isFocused ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : isFocused 
            ? 'border-blue-300 bg-blue-25' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      } ${
        settings.highContrast ? 'ring-2 ring-current' : ''
      } ${
        settings.focusIndicators ? 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className={`font-semibold text-gray-900 ${settings.largeText ? 'text-lg' : 'text-base'}`}>
              {player.name}
            </h3>
            <p className="text-sm text-gray-600">
              {player.team} • {player.position}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {getTrendIcon()}
          </div>
        </div>
        
        <div className="text-right">
          <div className={`font-bold text-blue-600 ${settings.largeText ? 'text-lg' : 'text-base'}`}>
            {player.projectedPoints.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">proj</div>
        </div>
      </div>
      
      <div 
        id={`player-${player.id}-details`}
        className="mt-2 text-sm text-gray-600"
      >
        <div className="flex justify-between">
          <span>Average: {player.averagePoints.toFixed(1)}</span>
          <span>Ownership: {player.ownership}%</span>
        </div>
        {player.description && (
          <p className="mt-1 text-xs">{player.description}</p>
        )}
      </div>

      {isSelected && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
            Selected
          </span>
        </div>
      )}
    </div>
  );
}