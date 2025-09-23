/**
 * Dynasty Roster Command - Elite lineup management with futuristic design
 * Complete drag & drop interface with premium Astral UI
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Users, Lock, Unlock, TrendingUp, TrendingDown, AlertTriangle,
  Info, Save, RotateCcw, Settings, ChevronRight, Star,
  Activity, Calendar, Trophy, Target, Shield, Zap,
  ArrowUp, ArrowDown, Minus, Clock, CheckCircle, XCircle,
  Crown, Sparkles, Eye, Flame, Bolt, Brain, Cpu
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays, isAfter, isBefore } from 'date-fns';

// Position slots configuration
const ROSTER_SLOTS = {
  QB: { min: 1, max: 1, flex: false, name: 'Quantum Back', icon: Crown },
  RB: { min: 2, max: 2, flex: false, name: 'Cosmic Runners', icon: Bolt },
  WR: { min: 2, max: 2, flex: false, name: 'Nebula Receivers', icon: Zap },
  TE: { min: 1, max: 1, flex: false, name: 'Stellar Ends', icon: Target },
  FLEX: { min: 1, max: 1, flex: true, allows: ['RB', 'WR', 'TE'], name: 'Flex Commander', icon: Sparkles },
  K: { min: 1, max: 1, flex: false, name: 'Galaxy Kicker', icon: Star },
  DST: { min: 1, max: 1, flex: false, name: 'Defense Matrix', icon: Shield },
  BENCH: { min: 0, max: 7, flex: false, name: 'Reserve Forces', icon: Users },
  IR: { min: 0, max: 2, flex: false, name: 'Medical Bay', icon: AlertTriangle },
};

// Enhanced mock roster data with cosmic themes
const mockRoster = {
  QB: [
    { id: '1', name: 'Patrick Mahomes', team: 'KC', opponent: 'vs DEN', projection: 24.5, status: 'healthy', locked: false, position: 'QB', byeWeek: 10, tier: 'elite', confidence: 95 }
  ],
  RB: [
    { id: '2', name: 'Christian McCaffrey', team: 'SF', opponent: '@ SEA', projection: 19.8, status: 'healthy', locked: false, position: 'RB', byeWeek: 9, tier: 'elite', confidence: 92 },
    { id: '3', name: 'Austin Ekeler', team: 'LAC', opponent: 'vs LV', projection: 16.2, status: 'questionable', locked: false, position: 'RB', byeWeek: 5, tier: 'high', confidence: 78 }
  ],
  WR: [
    { id: '4', name: 'Tyreek Hill', team: 'MIA', opponent: '@ BUF', projection: 18.3, status: 'healthy', locked: false, position: 'WR', byeWeek: 10, tier: 'elite', confidence: 89 },
    { id: '5', name: 'Stefon Diggs', team: 'BUF', opponent: 'vs MIA', projection: 17.1, status: 'healthy', locked: false, position: 'WR', byeWeek: 13, tier: 'elite', confidence: 87 }
  ],
  TE: [
    { id: '6', name: 'Travis Kelce', team: 'KC', opponent: 'vs DEN', projection: 14.2, status: 'healthy', locked: false, position: 'TE', byeWeek: 10, tier: 'elite', confidence: 91 }
  ],
  FLEX: [
    { id: '7', name: 'Calvin Ridley', team: 'JAX', opponent: '@ TEN', projection: 13.5, status: 'healthy', locked: false, position: 'WR', byeWeek: 9, tier: 'medium', confidence: 72 }
  ],
  K: [
    { id: '8', name: 'Justin Tucker', team: 'BAL', opponent: 'vs CLE', projection: 8.5, status: 'healthy', locked: false, position: 'K', byeWeek: 13, tier: 'high', confidence: 85 }
  ],
  DST: [
    { id: '9', name: 'San Francisco 49ers', team: 'SF', opponent: '@ SEA', projection: 9.2, status: 'healthy', locked: false, position: 'DST', byeWeek: 9, tier: 'high', confidence: 81 }
  ],
  BENCH: [
    { id: '10', name: 'Jaylen Waddle', team: 'MIA', opponent: '@ BUF', projection: 14.8, status: 'healthy', locked: false, position: 'WR', byeWeek: 10, tier: 'medium', confidence: 74 },
    { id: '11', name: 'Rachaad White', team: 'TB', opponent: 'vs NO', projection: 12.3, status: 'healthy', locked: false, position: 'RB', byeWeek: 5, tier: 'medium', confidence: 69 },
    { id: '12', name: 'George Kittle', team: 'SF', opponent: '@ SEA', projection: 11.5, status: 'questionable', locked: false, position: 'TE', byeWeek: 9, tier: 'high', confidence: 76 },
    { id: '13', name: 'Jahan Dotson', team: 'WAS', opponent: '@ DAL', projection: 8.9, status: 'healthy', locked: false, position: 'WR', byeWeek: 14, tier: 'low', confidence: 61 }
  ],
  IR: []
};

// Lineup requirements with cosmic theming
const lineupRequirements = [
  { id: 'starters', label: 'Battle Formation Complete', check: (roster: any) => {
    const starters = Object.keys(ROSTER_SLOTS)
      .filter(pos => pos !== 'BENCH' && pos !== 'IR')
      .reduce((count, pos) => count + roster[pos].length, 0);
    return starters === 9;
  }},
  { id: 'valid', label: 'Position Integrity', check: (roster: any) => {
    return Object.entries(ROSTER_SLOTS).every(([pos, config]) => {
      const players = roster[pos] || [];
      return players.length >= config.min && players.length <= config.max;
    });
  }},
  { id: 'healthy', label: 'No Vacant Commands', check: (roster: any) => {
    return !Object.keys(ROSTER_SLOTS)
      .filter(pos => pos !== 'BENCH' && pos !== 'IR')
      .some(pos => roster[pos].length === 0);
  }}
];

// Player tier colors
const getTierGradient = (tier: string) => {
  switch (tier) {
    case 'elite': return 'from-astral-gold-500 to-astral-supernova-600';
    case 'high': return 'from-astral-cosmic-500 to-astral-quantum-600';
    case 'medium': return 'from-astral-nebula-500 to-astral-cosmic-600';
    case 'low': return 'from-astral-quantum-500 to-astral-supernova-600';
    default: return 'from-astral-cosmic-500 to-astral-quantum-600';
  }
};

// Enhanced player card component
const PlayerCard = ({ player, isDragging, position }: any) => {
  const tierGradient = getTierGradient(player.tier);
  
  return (
    <motion.div
      layout
      className={cn(
        "astral-card-premium group relative overflow-hidden",
        isDragging && "scale-105 rotate-2 shadow-2xl z-50"
      )}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Tier indicator background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${tierGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
      
      {/* Confidence level indicator */}
      <div className="absolute top-2 right-2">
        <div className={`w-2 h-2 rounded-full ${
          player.confidence >= 90 ? 'bg-astral-gold-500' :
          player.confidence >= 75 ? 'bg-astral-cosmic-500' :
          player.confidence >= 60 ? 'bg-astral-nebula-500' :
          'bg-astral-supernova-500'
        } shadow-lg`} />
      </div>

      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {player.locked && (
              <Lock className="w-4 h-4 text-astral-gold-500" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-white font-orbitron text-sm mb-1">
                {player.name}
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-astral-cosmic-400 font-medium">{player.team}</span>
                <span className="text-astral-light-shadow">{player.opponent}</span>
                <div className={`w-2 h-2 rounded-full ${
                  player.status === 'healthy' ? 'bg-astral-status-healthy' :
                  player.status === 'questionable' ? 'bg-astral-status-questionable' :
                  player.status === 'doubtful' ? 'bg-astral-status-doubtful' :
                  'bg-astral-status-out'
                }`} />
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <motion.div 
              className="text-lg font-bold text-white font-orbitron"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {player.projection}
            </motion.div>
            <div className="text-xs text-astral-light-shadow">proj pts</div>
          </div>
        </div>

        {/* Player tier badge */}
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${tierGradient} bg-opacity-20 border border-current border-opacity-30`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${tierGradient}`} />
            <span className="text-xs font-medium text-white capitalize">{player.tier}</span>
          </div>
          
          <div className="text-xs text-astral-light-shadow">
            {player.confidence}% confidence
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Position slot component
const PositionSlot = ({ position, players, provided, snapshot }: any) => {
  const config = ROSTER_SLOTS[position];
  const Icon = config.icon;
  
  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-300 min-h-[120px]",
        snapshot.isDraggingOver
          ? "border-astral-cosmic-500 bg-astral-cosmic-500/10 shadow-lg"
          : "border-astral-cosmic-500/30 hover:border-astral-cosmic-500/50"
      )}
    >
      {/* Position header */}
      <div className="p-4 border-b border-astral-cosmic-500/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-astral-cosmic-600 flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white font-orbitron text-sm">{config.name}</h3>
            <p className="text-xs text-astral-light-shadow">
              {position} {position === 'FLEX' && '(RB/WR/TE)'}
            </p>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="p-4 space-y-3">
        {players.map((player: any, index: number) => (
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
              >
                <PlayerCard 
                  player={player} 
                  isDragging={snapshot.isDragging}
                  position={position}
                />
              </div>
            )}
          </Draggable>
        ))}
        
        {players.length === 0 && (
          <motion.div
            className="text-center py-6"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="text-astral-light-shadow text-sm font-medium">
              Deploy {config.name}
            </div>
          </motion.div>
        )}
      </div>
      
      {provided.placeholder}
    </div>
  );
};

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

  // Calculate confidence average
  const avgConfidence = useMemo(() => {
    const starters = Object.keys(roster)
      .filter(pos => pos !== 'BENCH' && pos !== 'IR')
      .flatMap(pos => roster[pos]);
    
    if (starters.length === 0) return 0;
    return starters.reduce((sum, player) => sum + player.confidence, 0) / starters.length;
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
      toast.error('Champion is locked for battle');
      return;
    }

    // Check if move is valid
    if (destination.droppableId !== 'BENCH' && destination.droppableId !== source.droppableId) {
      const destSlot = ROSTER_SLOTS[destination.droppableId];
      
      // Check FLEX eligibility
      if (destination.droppableId === 'FLEX') {
        if (!destSlot.allows?.includes(player.position)) {
          toast.error(`${player.position} cannot command FLEX position`);
          return;
        }
      } else if (destination.droppableId !== player.position) {
        // For non-FLEX slots, position must match
        if (player.position !== 'DST' || destination.droppableId !== 'DST') {
          toast.error(`${player.name} cannot assume ${destination.droppableId} command`);
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

  // Optimize lineup with cosmic AI
  const optimizeLineup = () => {
    const players = Object.values(roster).flat();
    const optimized: any = {
      QB: [], RB: [], WR: [], TE: [], FLEX: [], K: [], DST: [], BENCH: [], IR: []
    };

    // Sort by projection * confidence for smarter optimization
    players.sort((a: any, b: any) => (b.projection * b.confidence / 100) - (a.projection * a.confidence / 100));

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
    toast.success('Dynasty optimized by Quantum AI');
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
      toast.success('Dynasty formation locked and loaded');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
    onError: () => {
      toast.error('Command transmission failed');
    }
  });

  return (
    <div className="min-h-screen bg-astral-dark-void relative overflow-hidden">
      {/* Enhanced background */}
      <div className="futuristic-background">
        <div className="neural-network">
          {Array.from({ length: 25 }, (_, i) => (
            <motion.div
              key={i}
              className="neural-node"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="nav-astral border-b border-astral-cosmic-500/20 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <motion.h1 
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-astral-cosmic-400 via-astral-nebula-400 to-astral-quantum-400 font-orbitron mb-2"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
                }}
                transition={{ 
                  duration: 5, 
                  repeat: Infinity 
                }}
                style={{ backgroundSize: '200% 200%' }}
              >
                Roster Command
              </motion.h1>
              <p className="text-astral-light-shadow font-medium">
                Week 3 Dynasty Formation • Deadline: Sunday 1:00 PM ET
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Lineup Status */}
              <motion.div 
                className={`flex items-center gap-3 px-4 py-2 rounded-full border ${
                  isLineupValid 
                    ? 'bg-astral-status-healthy/20 border-astral-status-healthy/30' 
                    : 'bg-astral-status-questionable/20 border-astral-status-questionable/30'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {isLineupValid ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-astral-status-healthy" />
                    <span className="text-astral-status-healthy font-medium text-sm">
                      Formation Ready
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-astral-status-questionable" />
                    <span className="text-astral-status-questionable font-medium text-sm">
                      Formation Incomplete
                    </span>
                  </>
                )}
              </motion.div>
              
              {/* Save Button */}
              <motion.button
                onClick={() => saveLineup.mutate()}
                disabled={!isDirty || !isLineupValid || saveLineup.isPending}
                className={cn(
                  "btn-astral-primary flex items-center gap-2 px-6 py-3 font-medium transition-all",
                  (!isDirty || !isLineupValid) && "opacity-50 cursor-not-allowed"
                )}
                whileHover={isDirty && isLineupValid ? { scale: 1.05 } : {}}
                whileTap={isDirty && isLineupValid ? { scale: 0.95 } : {}}
              >
                <Save className="w-4 h-4" />
                <span>{saveLineup.isPending ? 'Transmitting...' : 'Lock Formation'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Lineup Editor */}
          <div className="lg:col-span-3 space-y-8">
            {/* Command Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="astral-card-premium p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-astral-gold-600 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-astral-light-shadow text-sm">Dynasty Power</p>
                    <p className="text-2xl font-bold text-white font-orbitron">{totalProjection.toFixed(1)}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="astral-card-premium p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-astral-cosmic-600 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-astral-light-shadow text-sm">AI Confidence</p>
                    <p className="text-2xl font-bold text-white font-orbitron">{avgConfidence.toFixed(0)}%</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="astral-card-premium p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <motion.button
                    onClick={optimizeLineup}
                    className="btn-astral-primary flex items-center gap-2 px-4 py-2 text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Quantum Optimize</span>
                  </motion.button>
                  <motion.button
                    onClick={() => setRoster(mockRoster)}
                    className="btn-astral-secondary flex items-center gap-2 px-4 py-2 text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* Drag and Drop Roster */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-8">
                {/* Starting Formation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="astral-card-premium"
                >
                  <div className="p-6 border-b border-astral-cosmic-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-astral-cosmic-600 flex items-center justify-center">
                        <Flame className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white font-orbitron">
                        Battle Formation
                      </h2>
                    </div>
                  </div>
                  <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST'].map(position => (
                      <Droppable key={position} droppableId={position}>
                        {(provided, snapshot) => (
                          <PositionSlot
                            position={position}
                            players={roster[position]}
                            provided={provided}
                            snapshot={snapshot}
                          />
                        )}
                      </Droppable>
                    ))}
                  </div>
                </motion.div>

                {/* Reserve Forces */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="astral-card-premium"
                >
                  <div className="p-6 border-b border-astral-cosmic-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-astral-nebula-600 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white font-orbitron">
                        Reserve Forces
                      </h2>
                    </div>
                  </div>
                  <Droppable droppableId="BENCH">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-6 min-h-[200px] grid md:grid-cols-2 lg:grid-cols-3 gap-4",
                          snapshot.isDraggingOver && "bg-astral-nebula-500/10"
                        )}
                      >
                        {roster.BENCH.map((player: any, index: number) => (
                          <Draggable key={player.id} draggableId={player.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <PlayerCard 
                                  player={player} 
                                  isDragging={snapshot.isDragging}
                                  position="BENCH"
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {roster.BENCH.length === 0 && (
                          <div className="col-span-full text-center py-8 text-astral-light-shadow">
                            No reserves deployed
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </motion.div>

                {/* Medical Bay */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="astral-card-premium"
                >
                  <div className="p-6 border-b border-astral-cosmic-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-astral-supernova-600 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white font-orbitron">
                        Medical Bay (IR)
                      </h2>
                    </div>
                  </div>
                  <Droppable droppableId="IR">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-6 min-h-[100px]",
                          snapshot.isDraggingOver && "bg-astral-supernova-500/10"
                        )}
                      >
                        {roster.IR.length === 0 ? (
                          <div className="text-center py-6 text-astral-light-shadow">
                            Medical bay operational - no casualties
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-4">
                            {roster.IR.map((player: any, index: number) => (
                              <Draggable key={player.id} draggableId={player.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <PlayerCard 
                                      player={player} 
                                      isDragging={false}
                                      position="IR"
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </motion.div>
              </div>
            </DragDropContext>
          </div>

          {/* Command Panel */}
          <div className="space-y-6">
            {/* Formation Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="astral-card-premium p-6"
            >
              <h3 className="text-lg font-bold text-white font-orbitron mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-astral-cosmic-500" />
                Formation Status
              </h3>
              <div className="space-y-3">
                {lineupStatus.map(status => (
                  <div key={status.id} className="flex items-center justify-between">
                    <span className="text-sm text-astral-light-shadow">
                      {status.label}
                    </span>
                    {status.valid ? (
                      <CheckCircle className="w-4 h-4 text-astral-status-healthy" />
                    ) : (
                      <XCircle className="w-4 h-4 text-astral-status-out" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Dynasty Analytics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="astral-card-premium p-6"
            >
              <h3 className="text-lg font-bold text-white font-orbitron mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-astral-nebula-500" />
                Dynasty Analytics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-astral-light-shadow">Active Champions</span>
                  <span className="text-sm font-medium text-white">
                    {Object.keys(roster).filter(pos => pos !== 'BENCH' && pos !== 'IR')
                      .reduce((sum, pos) => sum + roster[pos].length, 0)} / 9
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-astral-light-shadow">Reserve Forces</span>
                  <span className="text-sm font-medium text-white">
                    {roster.BENCH.length} / 7
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-astral-light-shadow">Medical Status</span>
                  <span className="text-sm font-medium text-white">
                    {Object.values(roster).flat().filter((p: any) => 
                      p.status === 'questionable' || p.status === 'doubtful' || p.status === 'out'
                    ).length} casualties
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-astral-light-shadow">Bye Week Impact</span>
                  <span className="text-sm font-medium text-white">
                    {Object.values(roster).flat().filter((p: any) => p.byeWeek === 3).length} affected
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Command Instructions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="astral-card-premium p-6 bg-astral-cosmic-500/10 border border-astral-cosmic-500/30"
            >
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-astral-cosmic-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-astral-cosmic-300 mb-2 font-orbitron">
                    Command Instructions
                  </h4>
                  <ul className="text-xs text-astral-light-shadow space-y-1">
                    <li>• Drag champions between positions</li>
                    <li>• Quantum optimize for maximum power</li>
                    <li>• Monitor medical status reports</li>
                    <li>• Lock formation before deadline</li>
                    <li>• Elite tier champions perform best</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}