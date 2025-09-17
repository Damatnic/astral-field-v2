'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Lock,
  Unlock,
  Star,
  Zap,
  Heart,
  Activity,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  Plus,
  Minus,
  User,
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Image from 'next/image';

interface Player {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
  team: string;
  opponent: string;
  gameTime: string;
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
      trend: number; // percentage change
    };
  };
}

interface LineupSlot {
  id: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DEF';
  player?: Player;
  isRequired: boolean;
  eligiblePositions: string[];
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

export default function LineupManager() {
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

  const [bench, setBench] = useState<Player[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [projectedTotal, setProjectedTotal] = useState(0);
  const [showPlayerDetails, setShowPlayerDetails] = useState<string | null>(null);

  // Mock data - replace with actual API data
  useEffect(() => {
    const mockPlayers: Player[] = [
      {
        id: 'p1',
        name: 'Patrick Mahomes',
        position: 'QB',
        team: 'KC',
        opponent: '@BUF',
        gameTime: 'Sun 1:00 PM',
        projectedPoints: 24.5,
        status: 'healthy',
        trend: 'up',
        isLocked: false,
        stats: {
          season: { points: 298.4, gamesPlayed: 12, avgPoints: 24.9 },
          recent: { points: [26.2, 23.1, 28.5, 22.0], trend: 5.2 }
        }
      },
      {
        id: 'p2',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        opponent: 'SEA',
        gameTime: 'Sun 4:25 PM',
        projectedPoints: 18.3,
        status: 'questionable',
        trend: 'down',
        isLocked: false,
        stats: {
          season: { points: 198.6, gamesPlayed: 11, avgPoints: 18.1 },
          recent: { points: [15.2, 12.8, 8.5, 19.3], trend: -8.3 }
        }
      },
      {
        id: 'p3',
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        opponent: '@NYJ',
        gameTime: 'Sun 1:00 PM',
        projectedPoints: 16.8,
        status: 'healthy',
        trend: 'up',
        isLocked: false,
        stats: {
          season: { points: 186.4, gamesPlayed: 12, avgPoints: 15.5 },
          recent: { points: [18.6, 22.1, 14.3, 19.8], trend: 12.4 }
        }
      },
      {
        id: 'p4',
        name: 'Travis Kelce',
        position: 'TE',
        team: 'KC',
        opponent: '@BUF',
        gameTime: 'Sun 1:00 PM',
        projectedPoints: 13.2,
        status: 'healthy',
        trend: 'neutral',
        isLocked: false,
        stats: {
          season: { points: 142.8, gamesPlayed: 12, avgPoints: 11.9 },
          recent: { points: [12.4, 11.2, 13.8, 10.9], trend: 1.2 }
        }
      },
      {
        id: 'p5',
        name: 'Austin Ekeler',
        position: 'RB',
        team: 'LAC',
        opponent: 'LV',
        gameTime: 'Sun 4:05 PM',
        projectedPoints: 14.2,
        status: 'healthy',
        trend: 'up',
        isLocked: false
      },
      {
        id: 'p6',
        name: 'CeeDee Lamb',
        position: 'WR',
        team: 'DAL',
        opponent: 'PHI',
        gameTime: 'Sun 4:25 PM',
        projectedPoints: 15.9,
        status: 'healthy',
        trend: 'neutral',
        isLocked: false
      },
      {
        id: 'p7',
        name: 'Harrison Butker',
        position: 'K',
        team: 'KC',
        opponent: '@BUF',
        gameTime: 'Sun 1:00 PM',
        projectedPoints: 8.5,
        status: 'healthy',
        trend: 'neutral',
        isLocked: false
      },
      {
        id: 'p8',
        name: 'San Francisco DST',
        position: 'DEF',
        team: 'SF',
        opponent: 'SEA',
        gameTime: 'Sun 4:25 PM',
        projectedPoints: 7.8,
        status: 'healthy',
        trend: 'up',
        isLocked: false
      }
    ];

    // Set initial lineup
    const initialLineup = [...lineup];
    initialLineup[0].player = mockPlayers[0]; // QB
    initialLineup[1].player = mockPlayers[1]; // RB1
    initialLineup[2].player = mockPlayers[4]; // RB2
    initialLineup[3].player = mockPlayers[2]; // WR1
    initialLineup[4].player = mockPlayers[5]; // WR2
    initialLineup[5].player = mockPlayers[3]; // TE
    initialLineup[7].player = mockPlayers[6]; // K
    initialLineup[8].player = mockPlayers[7]; // DEF

    setLineup(initialLineup);
    setBench([]);
  }, []);

  // Calculate projected total
  useEffect(() => {
    const total = lineup.reduce((sum, slot) => {
      return sum + (slot.player?.projectedPoints || 0);
    }, 0);
    setProjectedTotal(total);
  }, [lineup]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // If dragging within the same list
    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'lineup') {
        const newLineup = Array.from(lineup);
        const [removed] = newLineup.splice(source.index, 1);
        newLineup.splice(destination.index, 0, removed);
        setLineup(newLineup);
      } else {
        const newBench = Array.from(bench);
        const [removed] = newBench.splice(source.index, 1);
        newBench.splice(destination.index, 0, removed);
        setBench(newBench);
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
        }
      } else if (source.droppableId === 'bench' && destination.droppableId === 'lineup') {
        const newLineup = Array.from(lineup);
        const newBench = Array.from(bench);
        const player = newBench[source.index];
        const targetSlot = newLineup[destination.index];
        
        // Check if player is eligible for the slot
        if (targetSlot.eligiblePositions.includes(player.position)) {
          // Swap if slot already has a player
          if (targetSlot.player) {
            newBench.splice(source.index, 1, targetSlot.player);
          } else {
            newBench.splice(source.index, 1);
          }
          newLineup[destination.index].player = player;
          setLineup(newLineup);
          setBench(newBench);
        }
      }
    }
  };

  const optimizeLineup = () => {
    setIsOptimizing(true);
    // Simulate optimization
    setTimeout(() => {
      // Add optimization logic here
      setIsOptimizing(false);
    }, 1500);
  };

  const PlayerCard = ({ player, isDragging }: { player: Player; isDragging: boolean }) => {
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
        className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border transition-all ${
          isDragging 
            ? 'shadow-lg scale-105 rotate-1' 
            : 'hover:shadow-md'
        } ${player.isLocked ? 'opacity-60' : ''}`}
        style={{
          borderColor: player.isLocked ? '#ef4444' : '#e5e7eb'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${positionColors[player.position]}`}>
              {player.position}
            </span>
            <StatusIcon className={`h-4 w-4 ${statusColors[player.status]}`} />
            {player.isLocked && <Lock className="h-3 w-3 text-red-500" />}
          </div>
          <div className="flex items-center gap-1">
            {player.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
            {player.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
        </div>

        <div className="mb-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {player.name}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {player.team} vs {player.opponent} • {player.gameTime}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Projected</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {player.projectedPoints}
            </p>
          </div>
          {player.stats && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Season Avg</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {player.stats.season.avgPoints.toFixed(1)}
              </p>
            </div>
          )}
        </div>

        {player.stats && showPlayerDetails === player.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Last 4 games:</span>
                <span className="font-medium">
                  {player.stats.recent.points.join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Trend:</span>
                <span className={`font-medium ${
                  player.stats.recent.trend > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {player.stats.recent.trend > 0 ? '+' : ''}{player.stats.recent.trend.toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const LineupSlotComponent = ({ slot, index }: { slot: LineupSlot; index: number }) => (
    <Draggable draggableId={slot.id} index={index} isDragDisabled={slot.player?.isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`min-h-[120px] ${
            snapshot.isDragging ? 'z-50' : ''
          }`}
        >
          {slot.player ? (
            <PlayerCard player={slot.player} isDragging={snapshot.isDragging} />
          ) : (
            <div className="h-full bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex items-center justify-center">
              <div className="text-center">
                <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {slot.position} Slot
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Drag player here
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Lineup Manager
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Drag and drop players to set your optimal lineup
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Projected Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {projectedTotal.toFixed(1)}
            </p>
          </div>
          <button
            onClick={optimizeLineup}
            disabled={isOptimizing}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
              isOptimizing
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Optimize Lineup
              </>
            )}
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Starting Lineup */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Starting Lineup
              </h3>
              <Droppable droppableId="lineup">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${
                      snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2' : ''
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Bench
              </h3>
              <Droppable droppableId="bench">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] ${
                      snapshot.isDraggingOver ? 'bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2' : ''
                    }`}
                  >
                    {bench.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No players on bench</p>
                      </div>
                    ) : (
                      bench.map((player, index) => (
                        <Draggable key={player.id} draggableId={player.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <PlayerCard player={player} isDragging={snapshot.isDragging} />
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
    </div>
  );
}