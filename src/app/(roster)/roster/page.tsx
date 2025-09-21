/**
 * Roster Management - Complete drag & drop lineup management
 * Free platform with all features unlocked
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Users, Lock, Unlock, TrendingUp, TrendingDown, AlertTriangle,
  Info, Save, RotateCcw, Settings, ChevronRight, Star,
  Activity, Calendar, Trophy, Target, Shield, Zap,
  ArrowUp, ArrowDown, Minus, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays, isAfter, isBefore } from 'date-fns';

// Position slots configuration
const ROSTER_SLOTS = {
  QB: { min: 1, max: 1, flex: false },
  RB: { min: 2, max: 2, flex: false },
  WR: { min: 2, max: 2, flex: false },
  TE: { min: 1, max: 1, flex: false },
  FLEX: { min: 1, max: 1, flex: true, allows: ['RB', 'WR', 'TE'] },
  K: { min: 1, max: 1, flex: false },
  DST: { min: 1, max: 1, flex: false },
  BENCH: { min: 0, max: 7, flex: false },
  IR: { min: 0, max: 2, flex: false },
};

// Mock roster data
const mockRoster = {
  QB: [
    { id: '1', name: 'Patrick Mahomes', team: 'KC', opponent: 'vs DEN', projection: 24.5, status: 'healthy', locked: false, position: 'QB', byeWeek: 10 }
  ],
  RB: [
    { id: '2', name: 'Christian McCaffrey', team: 'SF', opponent: '@ SEA', projection: 19.8, status: 'healthy', locked: false, position: 'RB', byeWeek: 9 },
    { id: '3', name: 'Austin Ekeler', team: 'LAC', opponent: 'vs LV', projection: 16.2, status: 'questionable', locked: false, position: 'RB', byeWeek: 5 }
  ],
  WR: [
    { id: '4', name: 'Tyreek Hill', team: 'MIA', opponent: '@ BUF', projection: 18.3, status: 'healthy', locked: false, position: 'WR', byeWeek: 10 },
    { id: '5', name: 'Stefon Diggs', team: 'BUF', opponent: 'vs MIA', projection: 17.1, status: 'healthy', locked: false, position: 'WR', byeWeek: 13 }
  ],
  TE: [
    { id: '6', name: 'Travis Kelce', team: 'KC', opponent: 'vs DEN', projection: 14.2, status: 'healthy', locked: false, position: 'TE', byeWeek: 10 }
  ],
  FLEX: [
    { id: '7', name: 'Calvin Ridley', team: 'JAX', opponent: '@ TEN', projection: 13.5, status: 'healthy', locked: false, position: 'WR', byeWeek: 9 }
  ],
  K: [
    { id: '8', name: 'Justin Tucker', team: 'BAL', opponent: 'vs CLE', projection: 8.5, status: 'healthy', locked: false, position: 'K', byeWeek: 13 }
  ],
  DST: [
    { id: '9', name: 'San Francisco 49ers', team: 'SF', opponent: '@ SEA', projection: 9.2, status: 'healthy', locked: false, position: 'DST', byeWeek: 9 }
  ],
  BENCH: [
    { id: '10', name: 'Jaylen Waddle', team: 'MIA', opponent: '@ BUF', projection: 14.8, status: 'healthy', locked: false, position: 'WR', byeWeek: 10 },
    { id: '11', name: 'Rachaad White', team: 'TB', opponent: 'vs NO', projection: 12.3, status: 'healthy', locked: false, position: 'RB', byeWeek: 5 },
    { id: '12', name: 'George Kittle', team: 'SF', opponent: '@ SEA', projection: 11.5, status: 'questionable', locked: false, position: 'TE', byeWeek: 9 },
    { id: '13', name: 'Jahan Dotson', team: 'WAS', opponent: '@ DAL', projection: 8.9, status: 'healthy', locked: false, position: 'WR', byeWeek: 14 }
  ],
  IR: []
};

// Lineup requirements
const lineupRequirements = [
  { id: 'starters', label: 'Starting Lineup', check: (roster: any) => {
    const starters = Object.keys(ROSTER_SLOTS)
      .filter(pos => pos !== 'BENCH' && pos !== 'IR')
      .reduce((count, pos) => count + roster[pos].length, 0);
    return starters === 9;
  }},
  { id: 'valid', label: 'Valid Positions', check: (roster: any) => {
    return Object.entries(ROSTER_SLOTS).every(([pos, config]) => {
      const players = roster[pos] || [];
      return players.length >= config.min && players.length <= config.max;
    });
  }},
  { id: 'healthy', label: 'No Empty Slots', check: (roster: any) => {
    return !Object.keys(ROSTER_SLOTS)
      .filter(pos => pos !== 'BENCH' && pos !== 'IR')
      .some(pos => roster[pos].length === 0);
  }}
];

export default function RosterPage() {
  const [roster, setRoster] = useState(mockRoster);
  const [isDirty, setIsDirty] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState<'points' | 'floor' | 'ceiling'>('points');
  const [showProjections, setShowProjections] = useState(true);
  const queryClient = useQueryClient();

  // Calculate total projected points
  const totalProjection = useMemo(() => {
    return Object.keys(roster)
      .filter(pos => pos !== 'BENCH' && pos !== 'IR')
      .reduce((total, pos) => {
        return total + roster[pos].reduce((sum: number, player: any) => sum + player.projection, 0);
      }, 0);
  }, [roster]);

  // Check lineup validity
  const lineupStatus = useMemo(() => {
    return lineupRequirements.map(req => ({
      ...req,
      valid: req.check(roster)
    }));
  }, [roster]);

  const isLineupValid = lineupStatus.every(status => status.valid);

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Don't allow moving locked players
    const sourceList = roster[source.droppableId];
    const player = sourceList[source.index];
    if (player.locked) {
      toast.error('This player is locked');
      return;
    }

    // Check if move is valid
    if (destination.droppableId !== 'BENCH' && destination.droppableId !== source.droppableId) {
      const destSlot = ROSTER_SLOTS[destination.droppableId];
      
      // Check FLEX eligibility
      if (destination.droppableId === 'FLEX') {
        if (!destSlot.allows?.includes(player.position)) {
          toast.error(`${player.position} cannot be placed in FLEX`);
          return;
        }
      } else if (destination.droppableId !== player.position) {
        // For non-FLEX slots, position must match
        if (player.position !== 'DST' || destination.droppableId !== 'DST') {
          toast.error(`${player.name} cannot be placed in ${destination.droppableId} slot`);
          return;
        }
      }
    }

    // Perform the move
    const newRoster = { ...roster };
    const sourceItems = Array.from(newRoster[source.droppableId]);
    const destItems = source.droppableId === destination.droppableId 
      ? sourceItems 
      : Array.from(newRoster[destination.droppableId]);

    const [removed] = sourceItems.splice(source.index, 1);
    
    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, removed);
      newRoster[source.droppableId] = sourceItems;
    } else {
      destItems.splice(destination.index, 0, removed);
      newRoster[source.droppableId] = sourceItems;
      newRoster[destination.droppableId] = destItems;
    }

    setRoster(newRoster);
    setIsDirty(true);
  };

  // Optimize lineup
  const optimizeLineup = () => {
    const players = Object.values(roster).flat();
    const optimized: any = {
      QB: [], RB: [], WR: [], TE: [], FLEX: [], K: [], DST: [], BENCH: [], IR: []
    };

    // Sort by projection
    players.sort((a: any, b: any) => b.projection - a.projection);

    // Fill required positions first
    players.forEach((player: any) => {
      if (player.status === 'out' || player.status === 'ir') {
        if (optimized.IR.length < ROSTER_SLOTS.IR.max) {
          optimized.IR.push(player);
        } else {
          optimized.BENCH.push(player);
        }
        return;
      }

      const pos = player.position;
      const slot = ROSTER_SLOTS[pos];
      
      if (optimized[pos].length < slot.max) {
        optimized[pos].push(player);
      } else if (pos !== 'QB' && pos !== 'K' && pos !== 'DST' && optimized.FLEX.length < ROSTER_SLOTS.FLEX.max) {
        optimized.FLEX.push(player);
      } else {
        optimized.BENCH.push(player);
      }
    });

    setRoster(optimized);
    setIsDirty(true);
    toast.success('Lineup optimized for maximum points');
  };

  // Save lineup
  const saveLineup = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/roster', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster })
      });
      if (!response.ok) throw new Error('Failed to save lineup');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Lineup saved successfully');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
    onError: () => {
      toast.error('Failed to save lineup');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'questionable': return 'text-yellow-600 dark:text-yellow-400';
      case 'doubtful': return 'text-orange-600 dark:text-orange-400';
      case 'out': return 'text-red-600 dark:text-red-400';
      case 'ir': return 'text-red-800 dark:text-red-600';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'questionable': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'doubtful': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'out': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'ir': return <XCircle className="h-4 w-4 text-red-700" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Roster
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Week 3 • Deadline: Sunday 1:00 PM ET
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Lineup Status */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                {isLineupValid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Lineup Valid
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Lineup Incomplete
                    </span>
                  </>
                )}
              </div>
              
              {/* Save Button */}
              <button
                onClick={() => saveLineup.mutate()}
                disabled={!isDirty || !isLineupValid || saveLineup.isPending}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2",
                  isDirty && isLineupValid
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                )}
              >
                <Save className="h-4 w-4" />
                <span>{saveLineup.isPending ? 'Saving...' : 'Save Lineup'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lineup Editor */}
          <div className="lg:col-span-2 space-y-4">
            {/* Total Projection */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Projected Points</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalProjection.toFixed(1)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={optimizeLineup}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center space-x-1"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Optimize</span>
                  </button>
                  <button
                    onClick={() => setRoster(mockRoster)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium flex items-center space-x-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drag and Drop Roster */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-4">
                {/* Starting Lineup */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Starting Lineup
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST'].map(position => (
                      <Droppable key={position} droppableId={position}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "min-h-[60px] rounded-lg border-2 border-dashed transition",
                              snapshot.isDraggingOver
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-300 dark:border-gray-700"
                            )}
                          >
                            <div className="p-2">
                              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                {position} {position === 'FLEX' && '(RB/WR/TE)'}
                              </div>
                              {roster[position].map((player: any, index: number) => (
                                <Draggable 
                                  key={player.id} 
                                  draggableId={player.id} 
                                  index={index}
                                  isDragDisabled={player.locked}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "bg-white dark:bg-gray-800 rounded-lg border p-3 mb-2 transition-transform hover:scale-[1.02]",
                                        snapshot.isDragging
                                          ? "shadow-lg border-blue-500"
                                          : "border-gray-200 dark:border-gray-700"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          {player.locked && (
                                            <Lock className="h-4 w-4 text-gray-400" />
                                          )}
                                          <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                              {player.name}
                                            </p>
                                            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                              <span>{player.team}</span>
                                              <span>{player.opponent}</span>
                                              {getStatusIcon(player.status)}
                                            </div>
                                          </div>
                                        </div>
                                        {showProjections && (
                                          <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                              {player.projection}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              proj pts
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {roster[position].length === 0 && (
                                <div className="text-center py-3 text-sm text-gray-400">
                                  Drop player here
                                </div>
                              )}
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </div>

                {/* Bench */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Bench
                    </h2>
                  </div>
                  <Droppable droppableId="BENCH">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-4 min-h-[200px]",
                          snapshot.isDraggingOver && "bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        {roster.BENCH.map((player: any, index: number) => (
                          <Draggable key={player.id} draggableId={player.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "bg-white dark:bg-gray-800 rounded-lg border p-3 mb-2 transition-transform hover:scale-[1.02]",
                                  snapshot.isDragging
                                    ? "shadow-lg border-blue-500"
                                    : "border-gray-200 dark:border-gray-700"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                                      {player.position}
                                    </span>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {player.name}
                                      </p>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{player.team}</span>
                                        <span>{player.opponent}</span>
                                        {getStatusIcon(player.status)}
                                      </div>
                                    </div>
                                  </div>
                                  {showProjections && (
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {player.projection}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        proj pts
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {roster.BENCH.length === 0 && (
                          <div className="text-center py-8 text-sm text-gray-400">
                            Bench is empty
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* IR */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Injured Reserve (IR)
                    </h2>
                  </div>
                  <Droppable droppableId="IR">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-4 min-h-[100px]",
                          snapshot.isDraggingOver && "bg-red-50 dark:bg-red-900/20"
                        )}
                      >
                        {roster.IR.length === 0 ? (
                          <div className="text-center py-4 text-sm text-gray-400">
                            No injured players
                          </div>
                        ) : (
                          roster.IR.map((player: any, index: number) => (
                            <Draggable key={player.id} draggableId={player.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-3 mb-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {player.name}
                                      </p>
                                      <p className="text-xs text-red-600 dark:text-red-400">
                                        {player.status.toUpperCase()}
                                      </p>
                                    </div>
                                  </div>
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
            </DragDropContext>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Lineup Requirements */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Lineup Requirements
              </h3>
              <div className="space-y-2">
                {lineupStatus.map(status => (
                  <div key={status.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {status.label}
                    </span>
                    {status.valid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Roster Analysis
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Players</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Object.keys(roster).filter(pos => pos !== 'BENCH' && pos !== 'IR')
                      .reduce((sum, pos) => sum + roster[pos].length, 0)} / 9
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Bench Players</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {roster.BENCH.length} / 7
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Injured Players</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Object.values(roster).flat().filter((p: any) => 
                      p.status === 'questionable' || p.status === 'doubtful' || p.status === 'out'
                    ).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Bye Week Players</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Object.values(roster).flat().filter((p: any) => p.byeWeek === 3).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Pro Tips
                  </h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Drag players between positions</li>
                    <li>• Click "Optimize" for best lineup</li>
                    <li>• Check injury reports before lock</li>
                    <li>• Save changes before deadline</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}