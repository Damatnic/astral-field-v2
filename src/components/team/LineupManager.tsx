'use client';


import { handleComponentError } from '@/lib/error-handling';
import React, { useState, useEffect, useCallback } from 'react';
import { safeToFixed } from '@/utils/numberUtils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lock,
  Zap,
  Trophy,
  User,
  Users,
  CheckCircle,
  XCircle,
  Save,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, LineupSlotSkeleton } from '@/components/ui/Skeleton';

interface Player {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
  team: string;
  opponent?: string;
  gameTime?: string;
  projectedPoints: number;
  actualPoints?: number;
  status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';
  trend: 'up' | 'down' | 'neutral';
  isLocked: boolean;
  imageUrl?: string;
  stats?: {
    season: {
      points: number;
      gamesPlayed: number;
      avgPoints: number;
    };
    recent: {
      points: number[];
      trend: number;
    };
  };
}

interface RosterPlayer {
  id: string;
  playerId: string;
  position: string;
  player: Player;
  week?: number;
  isLocked: boolean;
  projectedPoints?: number;
}

interface LineupSlot {
  id: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DEF';
  player?: RosterPlayer;
  isRequired: boolean;
  eligiblePositions: string[];
}

interface LineupManagerProps {
  teamId: string;
  week?: number;
  isOwner?: boolean;
}

const positionColors = {
  QB: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  RB: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
  WR: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  TE: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  K: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  DEF: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  FLEX: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
};

export default function LineupManager({ teamId, week, isOwner = true }: LineupManagerProps) {
  // Helper function to get current NFL week
  const getCurrentWeek = (): number => {
    const seasonStart = new Date('2025-09-04');
    const now = new Date();
    const diff = now.getTime() - seasonStart.getTime();
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    return Math.max(1, Math.min(weeks + 1, 18));
  };
  const [lineup, setLineup] = useState<LineupSlot[]>([
    { id: '1', position: 'QB', isRequired: true, eligiblePositions: ['QB'] },
    { id: '2', position: 'RB', isRequired: true, eligiblePositions: ['RB'] },
    { id: '3', position: 'RB', isRequired: true, eligiblePositions: ['RB'] },
    { id: '4', position: 'WR', isRequired: true, eligiblePositions: ['WR'] },
    { id: '5', position: 'WR', isRequired: true, eligiblePositions: ['WR'] },
    { id: '6', position: 'TE', isRequired: true, eligiblePositions: ['TE'] },
    { id: '7', position: 'FLEX', isRequired: true, eligiblePositions: ['RB', 'WR', 'TE'] },
    { id: '8', position: 'K', isRequired: true, eligiblePositions: ['K'] },
    { id: '9', position: 'DEF', isRequired: true, eligiblePositions: ['DEF'] },
  ]);

  const [bench, setBench] = useState<RosterPlayer[]>([]);
  const [originalLineup, setOriginalLineup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [projectedTotal, setProjectedTotal] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [currentWeek] = useState(week || getCurrentWeek());
  
  const { success, error, info } = useToast();

  // Fetch lineup data from API
  const fetchLineup = useCallback(async () => {
    if (!teamId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/lineup?week=${currentWeek}`);
      const data = await response.json();
      
      if (data.success) {
        const { lineup: apiLineup, isLocked: locked } = data;
        
        // Convert API response to component format
        const newLineup = [...lineup];
        const newBench: RosterPlayer[] = [];
        
        // Reset lineup slots
        newLineup.forEach(slot => { slot.player = undefined; });
        
        // Populate lineup from API data
        Object.entries(apiLineup).forEach(([position, players]) => {
          const playerList = players as RosterPlayer[];
          
          if (position === 'BENCH') {
            newBench.push(...playerList);
          } else {
            playerList.forEach((rosterPlayer, index) => {
              const slotIndex = getSlotIndex(position, index);
              if (slotIndex !== -1 && newLineup[slotIndex]) {
                newLineup[slotIndex].player = rosterPlayer;
              }
            });
          }
        });
        
        setLineup(newLineup);
        setBench(newBench);
        setOriginalLineup(apiLineup);
        setIsLocked(locked);
        setHasChanges(false);
      } else {
        error('Failed to load lineup', data.error);
      }
    } catch (err) {
      handleComponentError(err as Error, 'LineupManager');
      error('Failed to load lineup', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, currentWeek, error]);
  
  useEffect(() => {
    fetchLineup();
  }, [fetchLineup]);

  // Calculate projected total
  useEffect(() => {
    const total = lineup.reduce((sum, slot) => {
      return sum + (slot.player?.projectedPoints || 0);
    }, 0);
    setProjectedTotal(total);
  }, [lineup]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || isLocked || !isOwner) return;

    const { source, destination } = result;

    // If dragging within the same list
    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'lineup') {
        const newLineup = Array.from(lineup);
        const [removed] = newLineup.splice(source.index, 1);
        newLineup.splice(destination.index, 0, removed);
        setLineup(newLineup);
        setHasChanges(true);
      } else {
        const newBench = Array.from(bench);
        const [removed] = newBench.splice(source.index, 1);
        newBench.splice(destination.index, 0, removed);
        setBench(newBench);
        setHasChanges(true);
      }
    } else {
      // Moving between lineup and bench
      if (source.droppableId === 'lineup' && destination.droppableId === 'bench') {
        const newLineup = Array.from(lineup);
        const newBench = Array.from(bench);
        const player = newLineup[source.index].player;
        if (player) {
          newLineup[source.index].player = undefined;
          newBench.splice(destination.index, 0, player);
          setLineup(newLineup);
          setBench(newBench);
          setHasChanges(true);
        }
      } else if (source.droppableId === 'bench' && destination.droppableId === 'lineup') {
        const newLineup = Array.from(lineup);
        const newBench = Array.from(bench);
        const player = newBench[source.index];
        const targetSlot = newLineup[destination.index];
        
        // Check if player is eligible for the slot
        if (targetSlot.eligiblePositions.includes(player.player.position)) {
          // Swap if slot already has a player
          if (targetSlot.player) {
            newBench.splice(source.index, 1, targetSlot.player);
          } else {
            newBench.splice(source.index, 1);
          }
          newLineup[destination.index].player = player;
          setLineup(newLineup);
          setBench(newBench);
          setHasChanges(true);
        } else {
          info('Invalid position', `${player.player.name} (${player.player.position}) cannot be placed in ${targetSlot.position} slot`);
        }
      }
    }
  };

  const saveLineup = async () => {
    if (!hasChanges || isSaving || !isOwner) return;
    
    setIsSaving(true);
    try {
      // Convert lineup to API format
      const lineupData: any = {
        QB: [],
        RB: [],
        WR: [],
        TE: [],
        FLEX: [],
        K: [],
        DEF: [],
        BENCH: bench
      };
      
      lineup.forEach(slot => {
        if (slot.player) {
          lineupData[slot.position].push(slot.player);
        }
      });
      
      const response = await fetch(`/api/teams/${teamId}/lineup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lineup: lineupData,
          week: currentWeek
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasChanges(false);
        setOriginalLineup(lineupData);
        success('Lineup saved', `Successfully updated Week ${currentWeek} lineup`);
      } else {
        error('Failed to save lineup', data.error);
      }
    } catch (err) {
      handleComponentError(err as Error, 'LineupManager');
      error('Failed to save lineup', 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };
  
  const resetLineup = () => {
    if (originalLineup) {
      // Reset to original state
      const newLineup = [...lineup];
      const newBench: RosterPlayer[] = [];
      
      // Reset lineup slots
      newLineup.forEach(slot => { slot.player = undefined; });
      
      // Populate from original data
      Object.entries(originalLineup).forEach(([position, players]) => {
        const playerList = players as RosterPlayer[];
        
        if (position === 'BENCH') {
          newBench.push(...playerList);
        } else {
          playerList.forEach((rosterPlayer, index) => {
            const slotIndex = getSlotIndex(position, index);
            if (slotIndex !== -1 && newLineup[slotIndex]) {
              newLineup[slotIndex].player = rosterPlayer;
            }
          });
        }
      });
      
      setLineup(newLineup);
      setBench(newBench);
      setHasChanges(false);
      info('Lineup reset', 'Changes have been discarded');
    }
  };
  
  const optimizeLineup = async () => {
    if (isOptimizing || !isOwner) return;
    
    setIsOptimizing(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/lineup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'auto_set_optimal',
          week: currentWeek
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchLineup(); // Refresh lineup
        success('Lineup optimized', 'Set to highest projected points');
      } else {
        error('Failed to optimize lineup', data.error);
      }
    } catch (err) {
      handleComponentError(err as Error, 'LineupManager');
      error('Failed to optimize lineup', 'Please try again');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getSlotIndex = (position: string, playerIndex: number): number => {
    switch (position) {
      case 'QB': return 0;
      case 'RB': return playerIndex === 0 ? 1 : 2;
      case 'WR': return playerIndex === 0 ? 3 : 4;
      case 'TE': return 5;
      case 'FLEX': return 6;
      case 'K': return 7;
      case 'DEF': return 8;
      default: return -1;
    }
  };
  
  const PlayerCard = ({ rosterPlayer, isDragging }: { rosterPlayer: RosterPlayer; isDragging: boolean }) => {
    const player = rosterPlayer.player;
    const statusColors = {
      healthy: 'text-green-600 dark:text-green-400',
      questionable: 'text-yellow-600 dark:text-yellow-400',
      doubtful: 'text-orange-600 dark:text-orange-400',
      out: 'text-red-600 dark:text-red-400',
      ir: 'text-gray-600 dark:text-gray-400'
    };

    const statusIcons = {
      healthy: CheckCircle,
      questionable: AlertCircle,
      doubtful: AlertCircle,
      out: XCircle,
      ir: XCircle
    };

    const StatusIcon = statusIcons[player.status];

    return (
      <motion.div
        className={`bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border transition-all ${
          isDragging 
            ? 'shadow-lg scale-105 rotate-1' 
            : 'hover:shadow-md'
        } ${(rosterPlayer.isLocked || isLocked) ? 'opacity-60' : ''} ${
          !isOwner ? 'cursor-default' : 'cursor-move'
        }`}
        style={{
          borderColor: (rosterPlayer.isLocked || isLocked) ? '#ef4444' : '#e5e7eb'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold border ${positionColors[player.position]}`}>
              {player.position}
            </span>
            <StatusIcon className={`h-3 w-3 sm:h-4 sm:w-4 ${statusColors[player.status]}`} />
            {(rosterPlayer.isLocked || isLocked) && <Lock className="h-3 w-3 text-red-500" />}
          </div>
          <div className="flex items-center gap-1">
            {player.trend === 'up' && <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />}
            {player.trend === 'down' && <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />}
          </div>
        </div>

        <div className="mb-2">
          <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-tight">
            {player.name}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {player.team}{player.opponent ? ` vs ${player.opponent}` : ''}
            {player.gameTime ? ` • ${player.gameTime}` : ''}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Projected</p>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              {safeToFixed(player.projectedPoints, 1, '0.0')}
            </p>
          </div>
          {player.stats && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Season Avg</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                {safeToFixed(player.stats.season.avgPoints, 1, '0.0')}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const LineupSlotComponent = ({ slot, index }: { slot: LineupSlot; index: number }) => (
    <Draggable 
      draggableId={slot.id} 
      index={index} 
      isDragDisabled={slot.player?.isLocked || isLocked || !isOwner}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`min-h-[120px] ${snapshot.isDragging ? 'z-50' : ''}`}
        >
          {slot.player ? (
            <PlayerCard rosterPlayer={slot.player} isDragging={snapshot.isDragging} />
          ) : (
            <div className={`h-full bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed rounded-lg p-4 flex items-center justify-center transition-colors ${
              isLocked ? 'border-red-300 bg-red-50/50' : 'border-gray-300 dark:border-gray-600'
            }`}>
              <div className="text-center">
                <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {slot.position} Slot
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {isLocked ? 'Locked' : isOwner ? 'Drag player here' : 'View only'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton height={32} width={200} className="mb-2" />
            <Skeleton height={16} width={300} />
          </div>
          <Skeleton height={40} width={150} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
              <Skeleton height={24} width={150} className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(9)].map((_, i) => (
                  <LineupSlotSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
              <Skeleton height={24} width={100} className="mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <LineupSlotSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Lineup Manager
            </h2>
            {isLocked && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <Lock className="h-3 w-3" />
                Locked
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isOwner 
              ? isLocked 
                ? 'Lineup is locked - games have started' 
                : 'Drag and drop players to set your optimal lineup'
              : 'Viewing lineup (read-only)'
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-left sm:text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Week {currentWeek} • Projected Total</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {safeToFixed(projectedTotal, 1, '0.0')}
            </p>
          </div>
          
          {isOwner && !isLocked && (
            <div className="flex flex-row gap-2">
              {hasChanges && (
                <>
                  <button
                    onClick={resetLineup}
                    className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                  <button
                    onClick={saveLineup}
                    disabled={isSaving}
                    className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
              
              <button
                onClick={optimizeLineup}
                disabled={isOptimizing}
                className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-all text-sm ${
                  isOptimizing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                {isOptimizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isOptimizing ? 'Optimizing...' : 'Optimize'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Starting Lineup */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Starting Lineup
              </h3>
              <Droppable droppableId="lineup" isDropDisabled={isLocked || !isOwner}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`grid grid-cols-1 gap-3 ${
                      window.innerWidth >= 768 ? 'md:grid-cols-2' : ''
                    } ${
                      snapshot.isDraggingOver && !isLocked
                        ? 'bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2' 
                        : ''
                    }`}
                  >
                    {lineup.map((slot, index) => (
                      <LineupSlotComponent key={slot.id} slot={slot} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          {/* Bench */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Bench
                <span className="text-sm text-gray-500 font-normal">({bench.length})</span>
              </h3>
              <Droppable droppableId="bench" isDropDisabled={isLocked || !isOwner}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] ${
                      snapshot.isDraggingOver && !isLocked
                        ? 'bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2' 
                        : ''
                    }`}
                  >
                    {bench.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No players on bench</p>
                      </div>
                    ) : (
                      bench.map((rosterPlayer, index) => (
                        <Draggable 
                          key={rosterPlayer.id} 
                          draggableId={rosterPlayer.id} 
                          index={index}
                          isDragDisabled={isLocked || !isOwner}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <PlayerCard rosterPlayer={rosterPlayer} isDragging={snapshot.isDragging} />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>
      </DragDropContext>
      
      {/* Mobile Save/Reset Bar */}
      {isOwner && !isLocked && hasChanges && (
        <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex gap-3">
            <button
              onClick={resetLineup}
              className="flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={saveLineup}
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}