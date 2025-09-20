'use client';

import { useState } from 'react';
import { TeamRosterProps, RosterSlot, Position } from '@/types/fantasy';
import { safeToFixed } from '@/utils/numberUtils';

export default function RosterView({ team, isOwner, currentWeek }: TeamRosterProps) {
  const [sortBy, setSortBy] = useState<'position' | 'name' | 'points'>('position');
  const [filterSlot, setFilterSlot] = useState<RosterSlot | 'all'>('all');

  const sortedRoster = [...(team.roster || [])].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.player.name.localeCompare(b.player.name);
      case 'points':
        return (b.player.averagePoints || 0) - (a.player.averagePoints || 0);
      case 'position':
      default:
        const positionOrder = [Position.QB, Position.RB, Position.WR, Position.TE, Position.K, Position.DST];
        const aIndex = positionOrder.indexOf(a.player.position);
        const bIndex = positionOrder.indexOf(b.player.position);
        return aIndex - bIndex;
    }
  });

  const filteredRoster = filterSlot === 'all' 
    ? sortedRoster 
    : sortedRoster.filter(rp => rp.rosterSlot === filterSlot);

  const groupedBySlot = filteredRoster.reduce((groups, rosterPlayer) => {
    const slot = rosterPlayer.rosterSlot;
    if (!groups[slot]) {
      groups[slot] = [];
    }
    groups[slot].push(rosterPlayer);
    return groups;
  }, {} as Record<RosterSlot, typeof filteredRoster>);

  const getSlotDisplayName = (slot: RosterSlot) => {
    switch (slot) {
      case RosterSlot.FLEX:
        return 'FLEX (RB/WR/TE)';
      case RosterSlot.SUPER_FLEX:
        return 'SUPER FLEX (QB/RB/WR/TE)';
      case RosterSlot.WR_RB_FLEX:
        return 'W/R FLEX';
      case RosterSlot.IR:
        return 'Injured Reserve';
      case RosterSlot.TAXI:
        return 'Taxi Squad';
      case RosterSlot.IDP_FLEX:
        return 'IDP FLEX';
      default:
        return slot;
    }
  };

  const getPositionColor = (position: Position) => {
    switch (position) {
      case Position.QB:
        return 'bg-purple-100 text-purple-800';
      case Position.RB:
        return 'bg-green-100 text-green-800';
      case Position.WR:
        return 'bg-blue-100 text-blue-800';
      case Position.TE:
        return 'bg-yellow-100 text-yellow-800';
      case Position.K:
        return 'bg-orange-100 text-orange-800';
      case Position.DST:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'QUESTIONABLE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DOUBTFUL':
        return 'bg-orange-100 text-orange-800';
      case 'OUT':
      case 'INJURED_RESERVE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const slotOrder: RosterSlot[] = [
    RosterSlot.QB,
    RosterSlot.RB,
    RosterSlot.WR,
    RosterSlot.TE,
    RosterSlot.FLEX,
    RosterSlot.SUPER_FLEX,
    RosterSlot.K,
    RosterSlot.DST,
    RosterSlot.BENCH,
    RosterSlot.IR,
    RosterSlot.TAXI
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="position">Position</option>
                <option value="name">Name</option>
                <option value="points">Avg Points</option>
              </select>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter by:</label>
              <select
                value={filterSlot}
                onChange={(e) => setFilterSlot(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Positions</option>
                {slotOrder.map((slot) => (
                  <option key={slot} value={slot}>
                    {getSlotDisplayName(slot)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {filteredRoster.length} players
          </div>
        </div>
      </div>

      {/* Roster Display */}
      {filterSlot === 'all' ? (
        // Grouped by slot
        <div className="space-y-6">
          {slotOrder.map((slot) => {
            const slotPlayers = groupedBySlot[slot];
            if (!slotPlayers || slotPlayers.length === 0) return null;

            return (
              <div key={slot} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    {getSlotDisplayName(slot)} ({slotPlayers.length})
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slotPlayers.map((rosterPlayer) => (
                      <RosterPlayerCard
                        key={rosterPlayer.id}
                        rosterPlayer={rosterPlayer}
                        isOwner={isOwner}
                        getPositionColor={getPositionColor}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Single filtered slot
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {getSlotDisplayName(filterSlot)} ({filteredRoster.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoster.map((rosterPlayer) => (
                <RosterPlayerCard
                  key={rosterPlayer.id}
                  rosterPlayer={rosterPlayer}
                  isOwner={isOwner}
                  getPositionColor={getPositionColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredRoster.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="h-24 w-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
            <p className="text-gray-600">
              {filterSlot === 'all' 
                ? "This team doesn't have any players on their roster yet."
                : `No players found in ${getSlotDisplayName(filterSlot)} position.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RosterPlayerCard({ 
  rosterPlayer, 
  isOwner, 
  getPositionColor, 
  getStatusColor 
}: {
  rosterPlayer: any;
  isOwner: boolean;
  getPositionColor: (position: Position) => string;
  getStatusColor: (status: string) => string;
}) {
  const { player } = rosterPlayer;

  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 truncate">
            {player.name}
          </h4>
          <p className="text-sm text-gray-600">
            {player.nflTeam} • {player.position}
            {player.byeWeek && ` • Bye: ${player.byeWeek}`}
          </p>
        </div>
        
        <div className="flex flex-col gap-1 ml-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
            {player.position}
          </span>
          {player.status !== 'ACTIVE' && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(player.status)}`}>
              {player.status === 'QUESTIONABLE' ? 'Q' : 
               player.status === 'DOUBTFUL' ? 'D' : 
               player.status === 'OUT' ? 'O' : 'IR'}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">Avg Points</p>
          <p className="text-lg font-semibold text-gray-900">
            {safeToFixed(player.averagePoints, 1, '0.0')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Projection</p>
          <p className="text-lg font-semibold text-gray-900">
            {safeToFixed(player.projectedPoints, 1, '0.0')}
          </p>
        </div>
      </div>

      {/* Latest News */}
      {player.lastNews && (
        <div className="mb-3">
          <div className="bg-white rounded-md p-2">
            <p className="text-xs text-gray-600 line-clamp-2">
              {player.lastNews.headline}
            </p>
          </div>
        </div>
      )}

      {/* Acquisition Info */}
      <div className="text-xs text-gray-500">
        Added {new Date(rosterPlayer.acquisitionDate).toLocaleDateString()}
        {rosterPlayer.isLocked && (
          <span className="ml-2 text-orange-600 font-medium">🔒 Locked</span>
        )}
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="mt-3 flex gap-2">
          <button className="flex-1 bg-blue-600 text-white text-center py-1.5 px-3 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
            Move
          </button>
          <button className="flex-1 bg-red-600 text-white text-center py-1.5 px-3 rounded text-xs font-medium hover:bg-red-700 transition-colors">
            Drop
          </button>
        </div>
      )}
    </div>
  );
}