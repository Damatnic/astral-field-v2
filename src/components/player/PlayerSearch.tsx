'use client';

import { useState } from 'react';
import { Position, PlayerStatus, PlayerSearchFilters } from '@/types/fantasy';

interface PlayerSearchProps {
  filters: PlayerSearchFilters;
  onFiltersChange: (filters: PlayerSearchFilters) => void;
  playerCount: number;
}

const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
  'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
  'TEN', 'WAS'
];

export default function PlayerSearch({ filters, onFiltersChange, playerCount }: PlayerSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof PlayerSearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const togglePosition = (position: Position) => {
    const currentPositions = filters.position || [];
    const newPositions = currentPositions.includes(position)
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position];
    
    updateFilter('position', newPositions);
  };

  const toggleTeam = (team: string) => {
    const currentTeams = filters.team || [];
    const newTeams = currentTeams.includes(team)
      ? currentTeams.filter(t => t !== team)
      : [...currentTeams, team];
    
    updateFilter('team', newTeams);
  };

  const toggleStatus = (status: PlayerStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    updateFilter('status', newStatuses);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      position: [],
      team: [],
      status: [PlayerStatus.ACTIVE, PlayerStatus.QUESTIONABLE, PlayerStatus.DOUBTFUL],
      availability: 'all',
      searchQuery: ''
    });
  };

  const hasActiveFilters = () => {
    return (
      (filters.position && filters.position.length > 0) ||
      (filters.team && filters.team.length > 0) ||
      (filters.status && filters.status.length !== 3) ||
      filters.availability !== 'all' ||
      (filters.searchQuery && filters.searchQuery.length > 0)
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search players by name..."
          />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Position Filters */}
        <div className="flex gap-2">
          {[Position.QB, Position.RB, Position.WR, Position.TE, Position.K, Position.DST].map((position) => (
            <button
              key={position}
              onClick={() => togglePosition(position)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.position?.includes(position)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {position}
            </button>
          ))}
        </div>

        {/* Availability Filter */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'available', label: 'Available' },
            { key: 'rostered', label: 'Rostered' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => updateFilter('availability', option.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filters.availability === option.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>
          
          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          {playerCount} players found
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          {/* NFL Teams */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">NFL Teams</h4>
            <div className="grid grid-cols-8 gap-2">
              {NFL_TEAMS.map((team) => (
                <button
                  key={team}
                  onClick={() => toggleTeam(team)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    filters.team?.includes(team)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>

          {/* Player Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Player Status</h4>
            <div className="flex flex-wrap gap-2">
              {[
                PlayerStatus.ACTIVE,
                PlayerStatus.QUESTIONABLE,
                PlayerStatus.DOUBTFUL,
                PlayerStatus.OUT,
                PlayerStatus.INJURED_RESERVE
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.status?.includes(status)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === PlayerStatus.ACTIVE && 'Healthy'}
                  {status === PlayerStatus.QUESTIONABLE && 'Questionable'}
                  {status === PlayerStatus.DOUBTFUL && 'Doubtful'}
                  {status === PlayerStatus.OUT && 'Out'}
                  {status === PlayerStatus.INJURED_RESERVE && 'IR'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.position?.map((position) => (
              <span
                key={position}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {position}
                <button
                  onClick={() => togglePosition(position)}
                  className="ml-1.5 h-3 w-3 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filters.team?.map((team) => (
              <span
                key={team}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {team}
                <button
                  onClick={() => toggleTeam(team)}
                  className="ml-1.5 h-3 w-3 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
            
            {filters.availability !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {filters.availability === 'available' ? 'Available Only' : 'Rostered Only'}
                <button
                  onClick={() => updateFilter('availability', 'all')}
                  className="ml-1.5 h-3 w-3 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}