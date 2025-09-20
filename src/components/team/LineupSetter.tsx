'use client';

import { useState } from 'react';
import { TeamRosterProps, RosterSlot, Position, LineupChange } from '@/types/fantasy';
import { safeToFixed } from '@/utils/numberUtils';

export default function LineupSetter({ team, isOwner, currentWeek, onLineupChange }: TeamRosterProps) {
  const [pendingChanges, setPendingChanges] = useState<LineupChange[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null);

  if (!isOwner) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">Only the team owner can set lineups.</p>
      </div>
    );
  }

  const lineup = team.roster?.filter(rp => 
    rp.rosterSlot !== RosterSlot.BENCH && 
    rp.rosterSlot !== RosterSlot.IR && 
    rp.rosterSlot !== RosterSlot.TAXI
  ) || [];

  const bench = team.roster?.filter(rp => 
    rp.rosterSlot === RosterSlot.BENCH
  ) || [];

  const ir = team.roster?.filter(rp => 
    rp.rosterSlot === RosterSlot.IR
  ) || [];

  const getSlotRequirements = () => {
    // This would come from league settings
    return {
      [RosterSlot.QB]: 1,
      [RosterSlot.RB]: 2,
      [RosterSlot.WR]: 2,
      [RosterSlot.TE]: 1,
      [RosterSlot.FLEX]: 1,
      [RosterSlot.K]: 1,
      [RosterSlot.DST]: 1,
    };
  };

  const slotRequirements = getSlotRequirements();

  const isEligibleForSlot = (player: any, slot: RosterSlot): boolean => {
    switch (slot) {
      case RosterSlot.QB:
        return player.player.position === Position.QB;
      case RosterSlot.RB:
        return player.player.position === Position.RB;
      case RosterSlot.WR:
        return player.player.position === Position.WR;
      case RosterSlot.TE:
        return player.player.position === Position.TE;
      case RosterSlot.FLEX:
        return [Position.RB, Position.WR, Position.TE].includes(player.player.position);
      case RosterSlot.SUPER_FLEX:
        return [Position.QB, Position.RB, Position.WR, Position.TE].includes(player.player.position);
      case RosterSlot.K:
        return player.player.position === Position.K;
      case RosterSlot.DST:
        return player.player.position === Position.DST;
      case RosterSlot.BENCH:
      case RosterSlot.IR:
      case RosterSlot.TAXI:
        return true;
      default:
        return false;
    }
  };

  const handleDragStart = (e: React.DragEvent, player: any) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSlot: RosterSlot) => {
    e.preventDefault();
    
    if (!draggedPlayer || !isEligibleForSlot(draggedPlayer, targetSlot)) {
      return;
    }

    const change: LineupChange = {
      playerId: draggedPlayer.player.id,
      fromSlot: draggedPlayer.rosterSlot,
      toSlot: targetSlot
    };

    setPendingChanges(prev => {
      const filtered = prev.filter(c => c.playerId !== change.playerId);
      return [...filtered, change];
    });

    setDraggedPlayer(null);
  };

  const applyChanges = async () => {
    if (pendingChanges.length === 0) return;

    const changes = pendingChanges.map(change => ({
      rosterPlayerId: team.roster?.find(rp => rp.player.id === change.playerId)?.id,
      toSlot: change.toSlot
    }));

    await onLineupChange?.(changes as any);
    setPendingChanges([]);
  };

  const resetChanges = () => {
    setPendingChanges([]);
  };

  const getSlotDisplayName = (slot: RosterSlot) => {
    switch (slot) {
      case RosterSlot.FLEX:
        return 'FLEX (RB/WR/TE)';
      case RosterSlot.SUPER_FLEX:
        return 'SUPER FLEX';
      default:
        return slot;
    }
  };

  const getProjectedLineupPoints = () => {
    const activeLineup = lineup.filter(rp => {
      const pendingChange = pendingChanges.find(c => c.playerId === rp.player.id);
      const currentSlot = pendingChange ? pendingChange.toSlot : rp.rosterSlot;
      return currentSlot !== RosterSlot.BENCH && currentSlot !== RosterSlot.IR;
    });

    return activeLineup.reduce((total, rp) => {
      return total + ((rp.player as any).projectedPoints || 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Set Lineup - Week {currentWeek}</h2>
            <p className="text-gray-600">Drag and drop players to set your starting lineup</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Projected Points</p>
            <p className="text-2xl font-bold text-blue-600">
              {safeToFixed(getProjectedLineupPoints(), 1, '0.0')}
            </p>
          </div>
        </div>

        {pendingChanges.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={applyChanges}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              Save Changes ({pendingChanges.length})
            </button>
            <button
              onClick={resetChanges}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Starting Lineup */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Starting Lineup</h3>
          
          {Object.entries(slotRequirements).map(([slot, count]) => (
            <div key={slot}>
              <h4 className="text-md font-medium text-gray-700 mb-2">
                {getSlotDisplayName(slot as RosterSlot)} ({count})
              </h4>
              
              <div className="grid gap-2">
                {Array.from({ length: count }).map((_, index) => {
                  const slotPlayer = lineup.find(rp => rp.rosterSlot === slot);
                  const pendingChange = pendingChanges.find(c => c.toSlot === slot);
                  const displayPlayer = pendingChange 
                    ? team.roster?.find(rp => rp.player.id === pendingChange.playerId)
                    : slotPlayer;

                  return (
                    <div
                      key={`${slot}-${index}`}
                      className={`min-h-[100px] border-2 border-dashed rounded-lg p-4 ${
                        draggedPlayer && isEligibleForSlot(draggedPlayer, slot as RosterSlot)
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, slot as RosterSlot)}
                    >
                      {displayPlayer ? (
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, displayPlayer)}
                          className="bg-white rounded-lg p-3 shadow-sm border cursor-move hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold text-gray-900">
                                {displayPlayer.player.name}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {displayPlayer.player.nflTeam} • {displayPlayer.player.position}
                              </p>
                              <p className="text-sm font-medium text-blue-600">
                                {safeToFixed((displayPlayer.player as any).projectedPoints, 1, '0.0')} pts
                              </p>
                            </div>
                            {pendingChange && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                                Changed
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <p className="text-sm">Empty {slot} slot</p>
                          <p className="text-xs">Drop a player here</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bench */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Bench</h3>
          
          <div
            className="min-h-[300px] border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, RosterSlot.BENCH)}
          >
            <div className="space-y-3">
              {bench.map((rosterPlayer) => {
                const pendingChange = pendingChanges.find(c => c.playerId === rosterPlayer.player.id);
                if (pendingChange && pendingChange.toSlot !== RosterSlot.BENCH) {
                  return null; // Player moved out of bench
                }

                return (
                  <div
                    key={rosterPlayer.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, rosterPlayer)}
                    className="bg-white rounded-lg p-3 shadow-sm border cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold text-gray-900">
                          {rosterPlayer.player.name}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {rosterPlayer.player.nflTeam} • {rosterPlayer.player.position}
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {safeToFixed((rosterPlayer.player as any).projectedPoints, 1, '0.0')} pts
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rosterPlayer.player.position === Position.QB ? 'bg-purple-100 text-purple-800' :
                        rosterPlayer.player.position === Position.RB ? 'bg-green-100 text-green-800' :
                        rosterPlayer.player.position === Position.WR ? 'bg-blue-100 text-blue-800' :
                        rosterPlayer.player.position === Position.TE ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rosterPlayer.player.position}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Players moved to bench via pending changes */}
              {pendingChanges
                .filter(change => change.toSlot === RosterSlot.BENCH)
                .map(change => {
                  const player = team.roster?.find(rp => rp.player.id === change.playerId);
                  if (!player) return null;

                  return (
                    <div
                      key={`pending-${player.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, player)}
                      className="bg-yellow-50 rounded-lg p-3 shadow-sm border border-yellow-200 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-900">
                            {player.player.name}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {player.player.nflTeam} • {player.player.position}
                          </p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                          Moving to bench
                        </span>
                      </div>
                    </div>
                  );
                })}

              {bench.length === 0 && pendingChanges.filter(c => c.toSlot === RosterSlot.BENCH).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">No bench players</p>
                </div>
              )}
            </div>
          </div>

          {/* Injured Reserve */}
          {ir.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Injured Reserve</h4>
              <div className="space-y-2">
                {ir.map((rosterPlayer) => (
                  <div
                    key={rosterPlayer.id}
                    className="bg-red-50 rounded-lg p-3 border border-red-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold text-gray-900">
                          {rosterPlayer.player.name}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {rosterPlayer.player.nflTeam} • {rosterPlayer.player.position}
                        </p>
                      </div>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        IR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}