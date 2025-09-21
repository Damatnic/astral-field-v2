'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Users,
  Trophy,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Lock
} from 'lucide-react';

// Enhanced Player Interface for Drag & Drop
interface DragDropPlayer {
  id: string;
  name: string;
  team: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
  projectedPoints: number;
  actualPoints?: number;
  status: 'active' | 'injured' | 'bye' | 'questionable' | 'out';
  trend: 'up' | 'down' | 'stable';
  avatar?: string;
  isLocked?: boolean;
  matchupDifficulty: 'easy' | 'medium' | 'hard';
  ownership?: number;
  targetShare?: number;
  redZoneTargets?: number;
}

// Lineup Position Interface
interface LineupPosition {
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DEF' | 'BENCH';
  player?: DragDropPlayer;
  isRequired: boolean;
  maxPlayers?: number;
}

// Drag and Drop Context
interface DragContext {
  draggedPlayer: DragDropPlayer | null;
  draggedFromPosition: string | null;
  dragOverPosition: string | null;
  isDragging: boolean;
}

// Enhanced Drag and Drop Roster Manager Component
export function AdvancedRosterManager() {
  const [lineup, setLineup] = useState<Record<string, LineupPosition>>({
    'QB-0': { position: 'QB', isRequired: true },
    'RB-0': { position: 'RB', isRequired: true },
    'RB-1': { position: 'RB', isRequired: true },
    'WR-0': { position: 'WR', isRequired: true },
    'WR-1': { position: 'WR', isRequired: true },
    'TE-0': { position: 'TE', isRequired: true },
    'FLEX-0': { position: 'FLEX', isRequired: true },
    'K-0': { position: 'K', isRequired: true },
    'DEF-0': { position: 'DEF', isRequired: true },
    'BENCH-0': { position: 'BENCH', isRequired: false },
    'BENCH-1': { position: 'BENCH', isRequired: false },
    'BENCH-2': { position: 'BENCH', isRequired: false },
    'BENCH-3': { position: 'BENCH', isRequired: false },
    'BENCH-4': { position: 'BENCH', isRequired: false },
    'BENCH-5': { position: 'BENCH', isRequired: false }
  });

  const [dragContext, setDragContext] = useState<DragContext>({
    draggedPlayer: null,
    draggedFromPosition: null,
    dragOverPosition: null,
    isDragging: false
  });

  const [availablePlayers] = useState<DragDropPlayer[]>([
    {
      id: '1',
      name: 'Josh Allen',
      team: 'BUF',
      position: 'QB',
      projectedPoints: 24.5,
      actualPoints: 28.2,
      status: 'active',
      trend: 'up',
      matchupDifficulty: 'easy',
      ownership: 95.2,
      targetShare: 0,
      redZoneTargets: 0
    },
    {
      id: '2',
      name: 'Christian McCaffrey',
      team: 'SF',
      position: 'RB',
      projectedPoints: 22.8,
      status: 'active',
      trend: 'up',
      matchupDifficulty: 'medium',
      ownership: 98.1,
      targetShare: 18.5,
      redZoneTargets: 4
    },
    {
      id: '3',
      name: 'Davante Adams',
      team: 'LV',
      position: 'WR',
      projectedPoints: 18.2,
      status: 'questionable',
      trend: 'down',
      matchupDifficulty: 'hard',
      ownership: 87.3,
      targetShare: 26.8,
      redZoneTargets: 2
    }
  ]);

  // Enhanced player validation for position eligibility
  const isValidDrop = (player: DragDropPlayer, positionKey: string): boolean => {
    const position = lineup[positionKey];
    
    if (position.position === 'BENCH') return true;
    if (position.position === 'FLEX') {
      return ['RB', 'WR', 'TE'].includes(player.position);
    }
    return position.position === player.position;
  };

  // Advanced drag start handler with haptic feedback simulation
  const handleDragStart = (player: DragDropPlayer, fromPosition?: string) => {
    setDragContext({
      draggedPlayer: player,
      draggedFromPosition: fromPosition || null,
      dragOverPosition: null,
      isDragging: true
    });
  };

  // Enhanced drag over with visual feedback
  const handleDragOver = (positionKey: string) => {
    if (dragContext.draggedPlayer && isValidDrop(dragContext.draggedPlayer, positionKey)) {
      setDragContext(prev => ({ ...prev, dragOverPosition: positionKey }));
    }
  };

  // Sophisticated drop handler with lineup optimization
  const handleDrop = (targetPositionKey: string) => {
    if (!dragContext.draggedPlayer) return;

    const targetPosition = lineup[targetPositionKey];
    const draggedPlayer = dragContext.draggedPlayer;

    if (!isValidDrop(draggedPlayer, targetPositionKey)) {
      setDragContext({
        draggedPlayer: null,
        draggedFromPosition: null,
        dragOverPosition: null,
        isDragging: false
      });
      return;
    }

    setLineup(prev => {
      const newLineup = { ...prev };
      
      // Handle swapping or moving players
      if (dragContext.draggedFromPosition) {
        const fromPosition = newLineup[dragContext.draggedFromPosition];
        const toPosition = newLineup[targetPositionKey];
        
        // Swap players if target has a player, otherwise move
        if (toPosition.player) {
          fromPosition.player = toPosition.player;
        } else {
          delete fromPosition.player;
        }
        
        toPosition.player = draggedPlayer;
      } else {
        // Adding from available players
        newLineup[targetPositionKey].player = draggedPlayer;
      }
      
      return newLineup;
    });

    setDragContext({
      draggedPlayer: null,
      draggedFromPosition: null,
      dragOverPosition: null,
      isDragging: false
    });
  };

  // Auto-optimization feature
  const optimizeLineup = () => {
    // Advanced lineup optimization algorithm
    const positions = Object.entries(lineup).filter(([key]) => !key.startsWith('BENCH'));
    const benchPlayers = Object.values(lineup)
      .filter(pos => pos.position === 'BENCH' && pos.player)
      .map(pos => pos.player!);
    
    // Simple optimization: move highest projected points to starting positions
    positions.sort((a, b) => {
      const aPoints = a[1].player?.projectedPoints || 0;
      const bPoints = b[1].player?.projectedPoints || 0;
      return bPoints - aPoints;
    });

    // This would contain more sophisticated optimization logic in a real app
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lineup Manager</h1>
          <p className="text-gray-600">Drag and drop to set your optimal lineup</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={optimizeLineup}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>Auto-Optimize</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Starting Lineup */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Starting Lineup
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              {Object.entries(lineup)
                .filter(([key]) => !key.startsWith('BENCH'))
                .map(([positionKey, position]) => (
                  <LineupSlot
                    key={positionKey}
                    positionKey={positionKey}
                    position={position}
                    dragContext={dragContext}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Bench */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Bench
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              {Object.entries(lineup)
                .filter(([key]) => key.startsWith('BENCH'))
                .map(([positionKey, position]) => (
                  <LineupSlot
                    key={positionKey}
                    positionKey={positionKey}
                    position={position}
                    dragContext={dragContext}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isBench={true}
                  />
                ))}
            </div>
          </div>

          {/* Available Players */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Available Players
              </h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {availablePlayers.map(player => (
                <AvailablePlayerCard
                  key={player.id}
                  player={player}
                  dragContext={dragContext}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Lineup Slot Component with Advanced Drag & Drop
function LineupSlot({
  positionKey,
  position,
  dragContext,
  onDragStart,
  onDragOver,
  onDrop,
  isBench = false
}: {
  positionKey: string;
  position: LineupPosition;
  dragContext: DragContext;
  onDragStart: (_player: DragDropPlayer, _fromPosition: string) => void;
  onDragOver: (_positionKey: string) => void;
  onDrop: (_positionKey: string) => void;
  isBench?: boolean;
}) {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const positionColors = {
    QB: 'bg-purple-100 border-purple-300 text-purple-800',
    RB: 'bg-green-100 border-green-300 text-green-800',
    WR: 'bg-blue-100 border-blue-300 text-blue-800',
    TE: 'bg-orange-100 border-orange-300 text-orange-800',
    FLEX: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    K: 'bg-pink-100 border-pink-300 text-pink-800',
    DEF: 'bg-gray-100 border-gray-300 text-gray-800',
    BENCH: 'bg-gray-50 border-gray-200 text-gray-600'
  };

  const isValidDrop = dragContext.draggedPlayer && 
    (position.position === 'BENCH' || 
     position.position === dragContext.draggedPlayer.position ||
     (position.position === 'FLEX' && ['RB', 'WR', 'TE'].includes(dragContext.draggedPlayer.position)));

  const shouldHighlight = dragContext.isDragging && isValidDrop;

  return (
    <motion.div
      ref={slotRef}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200 min-h-[80px]
        ${position.player ? 'bg-white' : positionColors[position.position]}
        ${shouldHighlight ? 'border-blue-400 bg-blue-50 shadow-lg' : 'border-gray-200'}
        ${isDraggedOver ? 'scale-105 shadow-xl' : ''}
        ${!position.player && !isBench ? 'border-dashed' : ''}
      `}
      onDragOver={(e) => {
        e.preventDefault();
        if (shouldHighlight) {
          setIsDraggedOver(true);
          onDragOver(positionKey);
        }
      }}
      onDragLeave={() => setIsDraggedOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggedOver(false);
        if (shouldHighlight) {
          onDrop(positionKey);
        }
      }}
      animate={{
        scale: isDraggedOver ? 1.05 : 1,
        boxShadow: isDraggedOver ? '0 20px 40px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.05)'
      }}
    >
      {position.player ? (
        <PlayerInSlot
          player={position.player}
          positionKey={positionKey}
          onDragStart={onDragStart}
          isBench={isBench}
        />
      ) : (
        <EmptySlot position={position.position} />
      )}
      
      {/* Position Label */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold ${positionColors[position.position]}`}>
        {position.position}
      </div>
    </motion.div>
  );
}

// Player in Slot Component
function PlayerInSlot({
  player,
  positionKey,
  onDragStart,
  isBench
}: {
  player: DragDropPlayer;
  positionKey: string;
  onDragStart: (player: DragDropPlayer, fromPosition: string) => void;
  isBench: boolean;
}) {
  const statusIcons = {
    active: <CheckCircle className="w-4 h-4 text-green-500" />,
    injured: <XCircle className="w-4 h-4 text-red-500" />,
    questionable: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    bye: <Clock className="w-4 h-4 text-gray-500" />,
    out: <XCircle className="w-4 h-4 text-red-500" />
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-500" />,
    down: <TrendingDown className="w-4 h-4 text-red-500" />,
    stable: <div className="w-4 h-4 bg-gray-400 rounded-full" />
  };

  return (
    <motion.div
      draggable
      onDragStart={() => onDragStart(player, positionKey)}
      className="cursor-move active:cursor-grabbing"
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.1, zIndex: 1000 }}
    >
      <div className="flex items-center space-x-3">
        {/* Player Avatar */}
        <div className="relative flex-shrink-0">
          {player.avatar ? (
            <Image
              src={player.avatar}
              alt={player.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">
                {player.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute -bottom-1 -right-1">
            {statusIcons[player.status]}
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 truncate">{player.name}</h3>
            {player.isLocked && <Lock className="w-4 h-4 text-gray-500" />}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{player.team}</span>
            <span>•</span>
            <span>{player.position}</span>
            <span>•</span>
            <span className="font-medium">{player.projectedPoints} pts</span>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="flex items-center space-x-2">
          {trendIcons[player.trend]}
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {player.actualPoints || player.projectedPoints}
            </div>
            <div className="text-xs text-gray-500">
              {player.actualPoints ? 'actual' : 'proj'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Empty Slot Component
function EmptySlot({ position }: { position: string }) {
  return (
    <div className="flex items-center justify-center h-16 text-gray-500">
      <div className="text-center">
        <div className="text-2xl mb-1">+</div>
        <div className="text-xs font-medium">Add {position}</div>
      </div>
    </div>
  );
}

// Available Player Card Component
function AvailablePlayerCard({
  player,
  dragContext,
  onDragStart
}: {
  player: DragDropPlayer;
  dragContext: DragContext;
  onDragStart: (player: DragDropPlayer) => void;
}) {
  return (
    <motion.div
      draggable
      onDragStart={() => onDragStart(player)}
      className={`
        p-3 rounded-lg border border-gray-200 bg-white cursor-move 
        hover:shadow-md transition-all active:cursor-grabbing
        ${dragContext.draggedPlayer?.id === player.id ? 'opacity-50' : ''}
      `}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.1, zIndex: 1000 }}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {player.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{player.name}</div>
          <div className="text-sm text-gray-600">{player.team} • {player.position}</div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-gray-900">{player.projectedPoints}</div>
          <div className="text-xs text-gray-500">pts</div>
        </div>
      </div>
    </motion.div>
  );
}