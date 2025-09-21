'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity,
  Star,
  Plus,
  Minus,
  MoreHorizontal,
  Timer,
  Target,
  Award
} from 'lucide-react';
import { MobileCard, TouchFriendlyButton } from './MobileOptimizedComponents';

// Mobile Player Card with touch-friendly interactions
interface MobilePlayerCardProps {
  player: {
    id: string;
    name: string;
    team: string;
    position: string;
    avatar?: string;
    projectedPoints?: number;
    actualPoints?: number;
    status: 'active' | 'injured' | 'bye' | 'questionable';
    trend: 'up' | 'down' | 'stable';
    isWatched?: boolean;
  };
  onPlayerAction?: (_playerId: string, _action: 'add' | 'drop' | 'watch' | 'trade') => void;
  showActions?: boolean;
  compact?: boolean;
}

export function MobilePlayerCard({ 
  player, 
  onPlayerAction, 
  showActions = true,
  compact = false 
}: MobilePlayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    injured: 'bg-red-100 text-red-800 border-red-200',
    bye: 'bg-gray-100 text-gray-800 border-gray-200',
    questionable: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-500" />,
    down: <TrendingDown className="w-4 h-4 text-red-500" />,
    stable: <div className="w-4 h-4 bg-gray-400 rounded-full" />
  };

  return (
    <MobileCard className={`relative overflow-hidden ${compact ? 'p-3' : 'p-4'}`}>
      {/* Main Player Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Avatar */}
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
                <span className="text-white font-bold text-lg">
                  {player.name.charAt(0)}
                </span>
              </div>
            )}
            {/* Status indicator */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              player.status === 'active' ? 'bg-green-400' :
              player.status === 'injured' ? 'bg-red-400' :
              player.status === 'questionable' ? 'bg-yellow-400' : 'bg-gray-400'
            }`} />
          </div>

          {/* Player Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 truncate text-base">
                {player.name}
              </h3>
              {player.isWatched && (
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-600">{player.team}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-medium">
                {player.position}
              </span>
              <div className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[player.status]}`}>
                {player.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Points & Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Points Display */}
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <span className="text-lg font-bold text-gray-900">
                {player.actualPoints || player.projectedPoints || 0}
              </span>
              {trendIcons[player.trend]}
            </div>
            <div className="text-xs text-gray-500">
              {player.actualPoints ? 'pts' : 'proj'}
            </div>
          </div>

          {/* Expand Button */}
          {!compact && (
            <TouchFriendlyButton
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <MoreHorizontal className="w-4 h-4" />
            </TouchFriendlyButton>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-200">
              {/* Player Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {player.projectedPoints || 12.5}
                  </div>
                  <div className="text-xs text-gray-500">Projected</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">85%</div>
                  <div className="text-xs text-gray-500">Start Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">7</div>
                  <div className="text-xs text-gray-500">Targets</div>
                </div>
              </div>

              {/* Action Buttons */}
              {showActions && (
                <div className="flex space-x-2">
                  <TouchFriendlyButton
                    onClick={() => onPlayerAction?.(player.id, 'add')}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </TouchFriendlyButton>
                  <TouchFriendlyButton
                    onClick={() => onPlayerAction?.(player.id, 'watch')}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Watch
                  </TouchFriendlyButton>
                  <TouchFriendlyButton
                    onClick={() => onPlayerAction?.(player.id, 'trade')}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    <Activity className="w-4 h-4 mr-1" />
                    Trade
                  </TouchFriendlyButton>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileCard>
  );
}

// Mobile Live Score Component
interface MobileLiveScoreProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: string;
  timeRemaining: string;
  isRedZone?: boolean;
  possession?: 'home' | 'away';
}

export function MobileLiveScore({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  quarter,
  timeRemaining,
  isRedZone = false,
  possession
}: MobileLiveScoreProps) {
  return (
    <MobileCard className={`p-4 ${isRedZone ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
      <div className="flex items-center justify-between">
        {/* Away Team */}
        <div className={`flex items-center space-x-3 ${possession === 'away' ? 'opacity-100' : 'opacity-70'}`}>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold">{awayTeam}</span>
          </div>
          <span className="font-medium">{awayTeam}</span>
          <span className="text-2xl font-bold">{awayScore}</span>
        </div>

        {/* Game Status */}
        <div className="text-center px-4">
          <div className="text-sm font-medium text-gray-600">{quarter}</div>
          <div className="text-xs text-gray-500">{timeRemaining}</div>
          {isRedZone && (
            <div className="text-xs text-red-600 font-medium mt-1">RED ZONE</div>
          )}
        </div>

        {/* Home Team */}
        <div className={`flex items-center space-x-3 ${possession === 'home' ? 'opacity-100' : 'opacity-70'}`}>
          <span className="text-2xl font-bold">{homeScore}</span>
          <span className="font-medium">{homeTeam}</span>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold">{homeTeam}</span>
          </div>
        </div>
      </div>

      {/* Possession Indicator */}
      {possession && (
        <div className="mt-2 flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${possession === 'away' ? 'mr-auto' : 'ml-auto'} bg-yellow-400`} />
        </div>
      )}
    </MobileCard>
  );
}

// Mobile Fantasy Alert Component
interface MobileFantasyAlertProps {
  type: 'injury' | 'news' | 'target' | 'achievement';
  title: string;
  description: string;
  playerName?: string;
  timestamp: string;
  onDismiss?: () => void;
}

export function MobileFantasyAlert({
  type,
  title,
  description,
  playerName,
  timestamp,
  onDismiss
}: MobileFantasyAlertProps) {
  const typeConfig = {
    injury: {
      icon: AlertTriangle,
      color: 'bg-red-100 border-red-200 text-red-800',
      iconColor: 'text-red-600'
    },
    news: {
      icon: Activity,
      color: 'bg-blue-100 border-blue-200 text-blue-800',
      iconColor: 'text-blue-600'
    },
    target: {
      icon: Target,
      color: 'bg-yellow-100 border-yellow-200 text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    achievement: {
      icon: Award,
      color: 'bg-green-100 border-green-200 text-green-800',
      iconColor: 'text-green-600'
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-4 rounded-xl border ${config.color}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 p-2 rounded-lg bg-white/50 ${config.iconColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{title}</h4>
            <span className="text-xs opacity-70">{timestamp}</span>
          </div>
          
          <p className="text-sm opacity-80 mt-1">{description}</p>
          
          {playerName && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-white/30 rounded-full font-medium">
                {playerName}
              </span>
            </div>
          )}
        </div>

        {onDismiss && (
          <TouchFriendlyButton
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="p-1"
          >
            <Minus className="w-4 h-4" />
          </TouchFriendlyButton>
        )}
      </div>
    </motion.div>
  );
}

// Mobile Quick Actions Panel
export function MobileQuickActions({
  onAction
}: {
  onAction: (_actionId: string) => void;
}) {
  const quickActions = [
    { id: 'lineup', label: 'Set Lineup', icon: Timer, color: 'bg-blue-500' },
    { id: 'waivers', label: 'Waivers', icon: Plus, color: 'bg-green-500' },
    { id: 'trades', label: 'Trades', icon: Activity, color: 'bg-purple-500' },
    { id: 'research', label: 'Research', icon: Target, color: 'bg-orange-500' }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {quickActions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.id)}
          className="flex flex-col items-center space-y-2 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
        >
          <div className={`p-3 rounded-xl ${action.color}`}>
            <action.icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}