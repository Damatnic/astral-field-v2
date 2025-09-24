'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ArrowUpDown,
  Star,
  Activity,
  Zap
} from 'lucide-react';

// Types
interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  projectedPoints: number;
  actualPoints?: number;
  status: 'active' | 'questionable' | 'doubtful' | 'out' | 'bye';
  isLocked?: boolean;
  gameTime?: string;
  opponent?: string;
  trend?: 'up' | 'down' | 'neutral';
  isStarter?: boolean;
}

interface LineupSlot {
  position: string;
  displayName: string;
  player?: Player;
  isRequired: boolean;
  isFlexible?: boolean; // Can accept multiple position types
  acceptedPositions?: string[];
}

// Mock lineup data
const mockLineup: LineupSlot[] = [
  {
    position: 'QB',
    displayName: 'Quarterback',
    isRequired: true,
    player: {
      id: '1',
      name: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      projectedPoints: 24.5,
      actualPoints: 28.2,
      status: 'active',
      opponent: '@MIA',
      gameTime: 'Sun 1:00 PM',
      trend: 'up',
      isStarter: true
    }
  },
  {
    position: 'RB1',
    displayName: 'Running Back',
    isRequired: true,
    player: {
      id: '2',
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      projectedPoints: 22.8,
      actualPoints: 19.6,
      status: 'questionable',
      opponent: 'vs SEA',
      gameTime: 'Sun 4:25 PM',
      trend: 'down',
      isStarter: true
    }
  },
  {
    position: 'RB2',
    displayName: 'Running Back',
    isRequired: true,
    player: {
      id: '3',
      name: 'Derrick Henry',
      position: 'RB',
      team: 'BAL',
      projectedPoints: 18.4,
      status: 'active',
      opponent: '@NYG',
      gameTime: 'Sun 1:00 PM',
      trend: 'up',
      isStarter: true
    }
  },
  {
    position: 'WR1',
    displayName: 'Wide Receiver',
    isRequired: true,
    player: {
      id: '4',
      name: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      projectedPoints: 21.2,
      status: 'active',
      opponent: 'vs BUF',
      gameTime: 'Sun 1:00 PM',
      trend: 'up',
      isStarter: true
    }
  },
  {
    position: 'WR2',
    displayName: 'Wide Receiver',
    isRequired: true,
    player: {
      id: '5',
      name: 'Stefon Diggs',
      position: 'WR',
      team: 'HOU',
      projectedPoints: 19.8,
      status: 'active',
      opponent: 'vs TEN',
      gameTime: 'Sun 1:00 PM',
      trend: 'neutral',
      isStarter: true
    }
  },
  {
    position: 'TE',
    displayName: 'Tight End',
    isRequired: true,
    player: {
      id: '6',
      name: 'Travis Kelce',
      position: 'TE',
      team: 'KC',
      projectedPoints: 16.5,
      status: 'active',
      opponent: '@CLE',
      gameTime: 'Sun 1:00 PM',
      trend: 'up',
      isStarter: true
    }
  },
  {
    position: 'FLEX',
    displayName: 'Flex (RB/WR/TE)',
    isRequired: true,
    isFlexible: true,
    acceptedPositions: ['RB', 'WR', 'TE'],
    player: {
      id: '7',
      name: 'Amon-Ra St. Brown',
      position: 'WR',
      team: 'DET',
      projectedPoints: 17.3,
      status: 'active',
      opponent: 'vs CHI',
      gameTime: 'Sun 1:00 PM',
      trend: 'up',
      isStarter: true
    }
  },
  {
    position: 'K',
    displayName: 'Kicker',
    isRequired: true,
    player: {
      id: '8',
      name: 'Harrison Butker',
      position: 'K',
      team: 'KC',
      projectedPoints: 8.2,
      status: 'active',
      opponent: '@CLE',
      gameTime: 'Sun 1:00 PM',
      isStarter: true
    }
  },
  {
    position: 'DEF',
    displayName: 'Defense',
    isRequired: true,
    player: {
      id: '9',
      name: 'San Francisco',
      position: 'DEF',
      team: 'SF',
      projectedPoints: 11.4,
      status: 'active',
      opponent: 'vs SEA',
      gameTime: 'Sun 4:25 PM',
      trend: 'up',
      isStarter: true
    }
  }
];

const benchPlayers: Player[] = [
  {
    id: '10',
    name: 'Lamar Jackson',
    position: 'QB',
    team: 'BAL',
    projectedPoints: 23.1,
    status: 'active',
    opponent: '@NYG',
    gameTime: 'Sun 1:00 PM',
    trend: 'up'
  },
  {
    id: '11',
    name: 'Jaylen Waddle',
    position: 'WR',
    team: 'MIA',
    projectedPoints: 15.8,
    status: 'questionable',
    opponent: 'vs BUF',
    gameTime: 'Sun 1:00 PM',
    trend: 'down'
  },
  {
    id: '12',
    name: 'Austin Ekeler',
    position: 'RB',
    team: 'WAS',
    projectedPoints: 14.2,
    status: 'active',
    opponent: 'vs PHI',
    gameTime: 'Sun 1:00 PM',
    trend: 'neutral'
  }
];

export function MobileLineup() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBench, setShowBench] = useState(false);

  const getStatusColor = (status: Player['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'questionable': return 'bg-yellow-100 text-yellow-800';
      case 'doubtful': return 'bg-orange-100 text-orange-800';
      case 'out': return 'bg-red-100 text-red-800';
      case 'bye': return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Player['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'questionable': return <AlertTriangle className="h-3 w-3" />;
      case 'doubtful': return <AlertTriangle className="h-3 w-3" />;
      case 'out': return <XCircle className="h-3 w-3" />;
      case 'bye': return <Clock className="h-3 w-3" />;
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (!trend || trend === 'neutral') return null;
    
    return trend === 'up' ? (
      <TrendingUp className="h-3 w-3 text-green-500" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-500" />
    );
  };

  const totalProjectedPoints = mockLineup.reduce((sum, slot) => 
    sum + (slot.player?.projectedPoints || 0), 0
  );

  const totalActualPoints = mockLineup.reduce((sum, slot) => 
    sum + (slot.player?.actualPoints || 0), 0
  );

  const handleSlotPress = (slot: LineupSlot) => {
    setSelectedSlot(selectedSlot === slot.position ? null : slot.position);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Starting Lineup</h1>
              <p className="text-sm text-gray-500">Week 15 • Deadline in 2h 15m</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {totalProjectedPoints.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">Projected</div>
            </div>
          </div>
          
          {/* Score Summary */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{totalActualPoints.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Current</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{totalProjectedPoints.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Projected</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Live Updates</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Starting Lineup */}
        <section className="space-y-3">
          <AnimatePresence>
            {mockLineup.map((slot, index) => (
              <motion.div
                key={slot.position}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                  selectedSlot === slot.position 
                    ? 'border-blue-400 shadow-md' 
                    : 'border-gray-200'
                }`}
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSlotPress(slot)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    {/* Position & Player Info */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                        slot.player ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        {slot.position}
                      </div>
                      
                      {slot.player ? (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {slot.player.name}
                            </h3>
                            <span className="text-xs font-medium text-gray-500">
                              {slot.player.team}
                            </span>
                            {getTrendIcon(slot.player.trend)}
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(slot.player.status)}`}>
                              {getStatusIcon(slot.player.status)}
                              <span className="capitalize">{slot.player.status}</span>
                            </div>
                            
                            {slot.player.opponent && (
                              <span className="text-xs text-gray-500">
                                {slot.player.opponent}
                              </span>
                            )}
                            
                            {slot.player.gameTime && (
                              <span className="text-xs text-gray-500">
                                {slot.player.gameTime}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-500">
                            Select {slot.displayName}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {slot.isFlexible ? `Any ${slot.acceptedPositions?.join('/')}` : slot.position}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Points & Actions */}
                    <div className="text-right ml-4">
                      {slot.player && (
                        <>
                          <div className="text-lg font-bold text-gray-900">
                            {slot.player.actualPoints?.toFixed(1) || slot.player.projectedPoints.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {slot.player.actualPoints ? 'Actual' : 'Proj'}
                          </div>
                        </>
                      )}
                      <MoreHorizontal className="h-4 w-4 text-gray-400 mt-1" />
                    </div>
                  </div>
                </motion.button>

                {/* Expanded slot actions */}
                <AnimatePresence>
                  {selectedSlot === slot.position && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 px-4 py-3 bg-gray-50"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-3">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                            <span>Swap</span>
                          </motion.button>
                          
                          {slot.player && (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
                            >
                              <Star className="h-4 w-4" />
                              <span>Bench</span>
                            </motion.button>
                          )}
                        </div>
                        
                        {slot.player?.status !== 'active' && (
                          <div className="flex items-center space-x-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Check Status</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        {/* Bench Toggle */}
        <div className="mt-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowBench(!showBench)}
            className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bench Players</h3>
                <p className="text-sm text-gray-500">{benchPlayers.length} available</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showBench ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </motion.div>
          </motion.button>
        </div>

        {/* Bench Players */}
        <AnimatePresence>
          {showBench && (
            <motion.section
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3"
            >
              {benchPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {player.position}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{player.name}</h3>
                          <span className="text-xs text-gray-500">{player.team}</span>
                          {getTrendIcon(player.trend)}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(player.status)}`}>
                            {getStatusIcon(player.status)}
                            <span className="capitalize">{player.status}</span>
                          </div>
                          
                          {player.opponent && (
                            <span className="text-xs text-gray-500">
                              {player.opponent}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {player.projectedPoints.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Proj</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden">
          <div className="flex space-x-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Save Lineup</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl flex items-center justify-center"
            >
              <Zap className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileLineup;